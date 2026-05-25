"""
Phase 3 — Two latest edge-cases validation:
1) POST /api/interim/timesheets/{ts_id}/reject → requires reason >=5 chars (400 else)
2) POST /api/interim/missions/{mission_id}/timesheet → reject any future date (400)
"""
import os
import uuid
from datetime import datetime, timedelta, timezone

import pytest
import requests

BASE_URL = os.environ.get("REACT_APP_BACKEND_URL", "").rstrip("/")
API = f"{BASE_URL}/api"

COMPANY_PHONE = "+224620200001"
COMPANY_PASS = "BoutiqueDemo2026!"
PROVIDER_PHONE = "+224620100001"  # Mamadou Diallo Electricien
PROVIDER_PASS = "TestProvider2026!"


# -------- Auth fixtures --------
@pytest.fixture(scope="module")
def company_token():
    r = requests.post(f"{API}/auth/company/login",
                      json={"phone_number": COMPANY_PHONE, "password": COMPANY_PASS})
    assert r.status_code == 200, f"Company login failed: {r.status_code} {r.text}"
    data = r.json()
    return data.get("access_token") or data.get("token")


@pytest.fixture(scope="module")
def provider_token():
    r = requests.post(f"{API}/auth/login",
                      json={"phone_number": PROVIDER_PHONE, "password": PROVIDER_PASS,
                            "user_type": "provider"})
    assert r.status_code == 200, f"Provider login failed: {r.status_code} {r.text}"
    data = r.json()
    return data.get("access_token") or data.get("token")


def h(tok):
    return {"Authorization": f"Bearer {tok}"}


# -------- Helper: build / reuse a closed mission with provider accepted ---
@pytest.fixture(scope="module")
def closed_mission_with_provider(company_token, provider_token):
    """Returns (mission_id, provider_id) for a 'closed' mission with provider accepted.
    Reuses an existing one if found, otherwise creates the full chain."""
    # 1. Look at company's missions
    r = requests.get(f"{API}/interim/missions/mine", headers=h(company_token))
    assert r.status_code == 200, r.text
    missions = r.json() or []

    today = datetime.now(timezone.utc).date()
    start = (today - timedelta(days=2)).isoformat()
    end = (today + timedelta(days=3)).isoformat()  # mission spans past + today + future

    # Find existing closed mission with PROVIDER (Mamadou) accepted
    # Need to get Mamadou's provider_id first
    rp = requests.get(f"{API}/auth/me", headers=h(provider_token))
    if rp.status_code != 200:
        rp = requests.get(f"{API}/providers/me", headers=h(provider_token))
    mamadou_id = rp.json().get("id") if rp.status_code == 200 else None

    for m in missions:
        if m.get("status") == "closed" and (m.get("accepted_count") or 0) > 0:
            ra = requests.get(f"{API}/interim/missions/{m['id']}/applications", headers=h(company_token))
            if ra.status_code == 200:
                for a in (ra.json() or []):
                    if a.get("status") == "accepted" and a.get("provider_id") == mamadou_id:
                        return m["id"], a["provider_id"], m
    # else create
    # Create mission
    payload = {
        "title": f"TEST_phase3_{uuid.uuid4().hex[:6]}",
        "description": "Test phase3 validations",
        "job_type": "Électricien",
        "location_region": "Conakry",
        "location_city": "Kaloum",
        "start_date": start,
        "end_date": end,
        "daily_rate": 100000,
        "rate_negotiable": False,
        "num_providers_needed": 1,
        "documents_required": [],
    }
    rc = requests.post(f"{API}/interim/missions", json=payload, headers=h(company_token))
    assert rc.status_code in (200, 201), rc.text
    m = rc.json()
    mission_id = m["id"]

    # Provider applies
    ra = requests.post(f"{API}/interim/missions/{mission_id}/apply",
                       json={"cover_message": "test"}, headers=h(provider_token))
    assert ra.status_code in (200, 201), ra.text
    app_id = ra.json()["id"]
    provider_id = ra.json()["provider_id"]

    # Company accepts
    rac = requests.post(f"{API}/interim/applications/{app_id}/accept",
                        json={}, headers=h(company_token))
    assert rac.status_code == 200, rac.text

    # Force mission to 'closed' status via direct DB manipulation
    # (No endpoint exists to switch open→closed without completion; use the close API if exists)
    # Try a close endpoint first
    rcl = requests.post(f"{API}/interim/missions/{mission_id}/close", json={}, headers=h(company_token))
    if rcl.status_code != 200:
        # Fall back: write to mongo directly
        import asyncio
        import sys
        sys.path.insert(0, "/app/backend")
        from database import db  # noqa

        async def _close():
            await db.interim_missions.update_one({"id": mission_id}, {"$set": {"status": "closed"}})
        asyncio.run(_close())
    return mission_id, provider_id, {"id": mission_id, "start_date": start, "end_date": end}


# ==================================================================
# TEST 1 — Future-date blocking on timesheet submission
# ==================================================================
class TestTimesheetFutureDate:

    def test_reject_future_date(self, provider_token, closed_mission_with_provider):
        mission_id, _, m = closed_mission_with_provider
        today = datetime.now(timezone.utc).date()
        future = (today + timedelta(days=1)).isoformat()
        payload = {"worked_days": [{"date": future, "hours": 8}], "notes": "future test"}
        r = requests.post(f"{API}/interim/missions/{mission_id}/timesheet",
                          json=payload, headers=h(provider_token))
        assert r.status_code == 400, f"Expected 400, got {r.status_code}: {r.text}"
        detail = r.json().get("detail", "").lower()
        assert "future" in detail, f"Detail should mention 'future': {detail}"

    def test_accept_today(self, provider_token, closed_mission_with_provider):
        mission_id, provider_id, m = closed_mission_with_provider
        today = datetime.now(timezone.utc).date().isoformat()
        payload = {"worked_days": [{"date": today, "hours": 8}], "notes": "today test"}
        r = requests.post(f"{API}/interim/missions/{mission_id}/timesheet",
                          json=payload, headers=h(provider_token))
        assert r.status_code == 200, f"Today should be accepted: {r.status_code} {r.text}"
        ts = r.json()
        assert ts.get("status") == "submitted"
        assert ts.get("total_hours") == 8.0

    def test_accept_past_date(self, provider_token, closed_mission_with_provider):
        mission_id, _, m = closed_mission_with_provider
        today = datetime.now(timezone.utc).date()
        past = (today - timedelta(days=1)).isoformat()
        sd = str(m.get("start_date"))[:10]
        if past < sd:
            pytest.skip("Past date earlier than mission start; skipping")
        payload = {"worked_days": [{"date": past, "hours": 6}], "notes": "past test"}
        r = requests.post(f"{API}/interim/missions/{mission_id}/timesheet",
                          json=payload, headers=h(provider_token))
        assert r.status_code == 200, f"Past date should be accepted: {r.status_code} {r.text}"
        assert r.json().get("status") == "submitted"


# ==================================================================
# TEST 2 — Reject endpoint requires reason >=5 chars
# ==================================================================
class TestRejectTimesheetReason:

    def _ensure_submitted_ts(self, company_token, provider_token, mission_id):
        """Make sure a submitted timesheet exists for this mission."""
        today = datetime.now(timezone.utc).date().isoformat()
        payload = {"worked_days": [{"date": today, "hours": 8}], "notes": "for reject test"}
        r = requests.post(f"{API}/interim/missions/{mission_id}/timesheet",
                          json=payload, headers=h(provider_token))
        assert r.status_code == 200, r.text
        ts = r.json()
        # If status not 'submitted' (might already be validated/rejected), reset via mongo
        if ts.get("status") != "submitted":
            import asyncio, sys
            sys.path.insert(0, "/app/backend")
            from database import db
            async def _reset():
                await db.interim_timesheets.update_one(
                    {"id": ts["id"]}, {"$set": {"status": "submitted", "rejection_reason": None}}
                )
            asyncio.run(_reset())
        return ts["id"]

    def test_reject_empty_reason_400(self, company_token, provider_token, closed_mission_with_provider):
        mission_id, _, _ = closed_mission_with_provider
        ts_id = self._ensure_submitted_ts(company_token, provider_token, mission_id)
        r = requests.post(f"{API}/interim/timesheets/{ts_id}/reject",
                          json={"reason": ""}, headers=h(company_token))
        assert r.status_code == 400, r.text
        assert "5 caractères" in r.json().get("detail", "") or "caract" in r.json().get("detail", "").lower()

    def test_reject_short_reason_400(self, company_token, provider_token, closed_mission_with_provider):
        mission_id, _, _ = closed_mission_with_provider
        ts_id = self._ensure_submitted_ts(company_token, provider_token, mission_id)
        r = requests.post(f"{API}/interim/timesheets/{ts_id}/reject",
                          json={"reason": "abc"}, headers=h(company_token))
        assert r.status_code == 400, r.text

    def test_reject_no_body_400(self, company_token, provider_token, closed_mission_with_provider):
        mission_id, _, _ = closed_mission_with_provider
        ts_id = self._ensure_submitted_ts(company_token, provider_token, mission_id)
        r = requests.post(f"{API}/interim/timesheets/{ts_id}/reject",
                          json={}, headers=h(company_token))
        assert r.status_code == 400, r.text

    def test_reject_valid_reason_200_and_persists(self, company_token, provider_token, closed_mission_with_provider):
        mission_id, _, _ = closed_mission_with_provider
        ts_id = self._ensure_submitted_ts(company_token, provider_token, mission_id)
        reason = "Heures non conformes au planning"
        r = requests.post(f"{API}/interim/timesheets/{ts_id}/reject",
                          json={"reason": reason}, headers=h(company_token))
        assert r.status_code == 200, r.text
        assert r.json().get("ok") is True
        # GET to verify persistence
        rl = requests.get(f"{API}/interim/timesheets/company", headers=h(company_token))
        assert rl.status_code == 200
        found = next((t for t in rl.json() if t["id"] == ts_id), None)
        assert found is not None
        assert found["status"] == "rejected"
        assert found["rejection_reason"] == reason

    def test_reject_already_rejected_400(self, company_token, provider_token, closed_mission_with_provider):
        """After rejection, re-rejecting should return 400 (status guard added in iteration 18 RCA)."""
        mission_id, _, _ = closed_mission_with_provider
        ts_id = self._ensure_submitted_ts(company_token, provider_token, mission_id)
        # First reject
        r1 = requests.post(f"{API}/interim/timesheets/{ts_id}/reject",
                           json={"reason": "Premier rejet test"}, headers=h(company_token))
        assert r1.status_code == 200
        # Second reject
        r2 = requests.post(f"{API}/interim/timesheets/{ts_id}/reject",
                           json={"reason": "Second rejet test"}, headers=h(company_token))
        assert r2.status_code == 400, r2.text
