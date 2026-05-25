"""
Interim Phase 2 backend tests — Availability / Timesheets / Invoice / Ratings.

Uses seeded servispro_dev data:
- Company: +224620200001 / BoutiqueDemo2026!  (Boutique Demo Conakry)
- Provider 1: +224620100001 / TestProvider2026! (Mamadou Diallo, Électricien)
- Provider 2: +224620100002 / TestProvider2026! (Fatoumata Camara, accepted on completed Plombier mission)
- Provider 3: +224620100003 / TestProvider2026! (Ibrahima Sow)
"""
import os
import uuid
import time
from datetime import datetime, timezone
from pathlib import Path

import pytest
import requests
from dotenv import load_dotenv
from pymongo import MongoClient

load_dotenv(Path(__file__).resolve().parents[2] / "frontend" / ".env")
load_dotenv(Path(__file__).resolve().parents[1] / ".env", override=False)

BASE_URL = os.environ.get("REACT_APP_BACKEND_URL").rstrip("/")
API = f"{BASE_URL}/api"

COMPANY_PHONE = "+224620200001"
COMPANY_PASSWORD = "BoutiqueDemo2026!"
P1_PHONE = "+224620100001"           # Mamadou
P2_PHONE = "+224620100002"           # Fatoumata (accepted on completed Plombier)
P3_PHONE = "+224620100003"           # Ibrahima
PROVIDER_PASSWORD = "TestProvider2026!"


def _load_env(key):
    p = Path(__file__).resolve().parents[1] / ".env"
    if p.exists():
        for ln in p.read_text().splitlines():
            if ln.startswith(f"{key}="):
                return ln.split("=", 1)[1].strip().strip('"').strip("'")
    return None


MONGO_URL = os.environ.get("MONGO_URL") or _load_env("MONGO_URL")
DB_NAME = os.environ.get("DB_NAME") or _load_env("DB_NAME")


# ----------------------------------------------------------------------
# Fixtures
# ----------------------------------------------------------------------

def auth(token):
    return {"Authorization": f"Bearer {token}"}


def _login_provider(phone):
    r = requests.post(f"{API}/auth/login", json={
        "phone_number": phone, "password": PROVIDER_PASSWORD, "user_type": "provider",
    })
    assert r.status_code == 200, f"Provider {phone} login failed: {r.status_code} {r.text}"
    return r.json()


@pytest.fixture(scope="module")
def company():
    r = requests.post(f"{API}/auth/company/login", json={
        "phone_number": COMPANY_PHONE, "password": COMPANY_PASSWORD,
    })
    assert r.status_code == 200, f"Company login failed: {r.status_code} {r.text}"
    body = r.json()
    return {"token": body["token"], "id": body.get("company", {}).get("id") or body.get("user", {}).get("id")}


@pytest.fixture(scope="module")
def p1():
    body = _login_provider(P1_PHONE)
    return {"token": body["token"], "id": body.get("user", {}).get("id") or body.get("provider", {}).get("id")}


@pytest.fixture(scope="module")
def p2():
    body = _login_provider(P2_PHONE)
    return {"token": body["token"], "id": body.get("user", {}).get("id") or body.get("provider", {}).get("id")}


@pytest.fixture(scope="module")
def p3():
    body = _login_provider(P3_PHONE)
    return {"token": body["token"], "id": body.get("user", {}).get("id") or body.get("provider", {}).get("id")}


@pytest.fixture(scope="module")
def mongo_db():
    client = MongoClient(MONGO_URL)
    yield client[DB_NAME]
    client.close()


@pytest.fixture(scope="module")
def completed_mission(mongo_db, p2, company):
    """Return the seeded completed Plombier mission where Fatoumata is accepted."""
    m = mongo_db.interim_missions.find_one({
        "company_id": company["id"], "status": "completed",
    }, {"_id": 0})
    assert m, "Seeded completed mission not found"
    # Confirm Fatoumata application
    app = mongo_db.mission_applications.find_one({
        "mission_id": m["id"], "provider_id": p2["id"], "status": "accepted",
    })
    assert app, "Fatoumata accepted-app on the completed mission not found"
    return m


# ----------------------------------------------------------------------
# AVAILABILITY
# ----------------------------------------------------------------------

class TestAvailability:
    DATES = ["2026-07-10", "2026-07-11", "2026-07-12"]

    def test_get_mine_empty_initially(self, p1, mongo_db):
        # Wipe any previous record
        mongo_db.provider_availability.delete_one({"provider_id": p1["id"]})
        r = requests.get(f"{API}/interim/availability/mine", headers=auth(p1["token"]))
        assert r.status_code == 200, r.text
        body = r.json()
        assert "manual_unavailable_dates" in body
        assert "mission_busy_dates" in body
        assert body["manual_unavailable_dates"] == []

    def test_put_availability(self, p1):
        r = requests.put(f"{API}/interim/availability",
                         headers=auth(p1["token"]),
                         json={"unavailable_dates": self.DATES + ["2026-07-10"]})
        assert r.status_code == 200, r.text
        out = r.json()
        assert out["ok"] is True
        assert sorted(out["unavailable_dates"]) == sorted(set(self.DATES))

    def test_put_availability_bad_payload(self, p1):
        r = requests.put(f"{API}/interim/availability",
                         headers=auth(p1["token"]),
                         json={"unavailable_dates": "not-a-list"})
        assert r.status_code == 400

    def test_get_mine_returns_saved_dates(self, p1):
        r = requests.get(f"{API}/interim/availability/mine", headers=auth(p1["token"]))
        assert r.status_code == 200
        assert sorted(r.json()["manual_unavailable_dates"]) == sorted(self.DATES)

    def test_company_can_view_provider_availability(self, company, p1):
        r = requests.get(f"{API}/interim/providers/{p1['id']}/availability",
                         headers=auth(company["token"]))
        assert r.status_code == 200, r.text
        out = r.json()
        assert out["provider_id"] == p1["id"]
        # all our manual dates must appear
        for d in self.DATES:
            assert d in out["all_unavailable_dates"]

    def test_mission_busy_dates_populated(self, mongo_db, p3, company):
        """Insert a closed mission with p3 accepted and verify busy dates appear."""
        mission_id = str(uuid.uuid4())
        app_id = str(uuid.uuid4())
        try:
            mongo_db.interim_missions.insert_one({
                "id": mission_id,
                "company_id": company["id"],
                "title": "TEST_busy_mission",
                "status": "closed",
                "start_date": "2026-08-01",
                "end_date": "2026-08-03",
                "daily_rate": 100000,
                "job_type": "Plombier",
                "location_city": "Conakry",
                "num_providers_needed": 1,
            })
            mongo_db.mission_applications.insert_one({
                "id": app_id,
                "mission_id": mission_id,
                "provider_id": p3["id"],
                "status": "accepted",
                "created_at": datetime.now(timezone.utc).isoformat(),
            })
            r = requests.get(f"{API}/interim/availability/mine", headers=auth(p3["token"]))
            assert r.status_code == 200, r.text
            busy = r.json()["mission_busy_dates"]
            assert "2026-08-01" in busy
            assert "2026-08-02" in busy
            assert "2026-08-03" in busy
        finally:
            mongo_db.interim_missions.delete_one({"id": mission_id})
            mongo_db.mission_applications.delete_one({"id": app_id})

    def test_public_availability_requires_company_auth(self, p1):
        r = requests.get(f"{API}/interim/providers/{p1['id']}/availability")
        assert r.status_code in (401, 403)


# ----------------------------------------------------------------------
# TIMESHEETS  (Fatoumata - p2 - on completed Plombier mission)
# ----------------------------------------------------------------------

class TestTimesheets:
    @pytest.fixture(autouse=True)
    def _clean_ts(self, mongo_db, p2, completed_mission):
        mongo_db.interim_timesheets.delete_many({
            "mission_id": completed_mission["id"], "provider_id": p2["id"],
        })
        yield
        mongo_db.interim_timesheets.delete_many({
            "mission_id": completed_mission["id"], "provider_id": p2["id"],
        })

    def test_submit_timesheet_requires_accepted(self, p1, completed_mission):
        r = requests.post(
            f"{API}/interim/missions/{completed_mission['id']}/timesheet",
            headers=auth(p1["token"]),
            json={"days_worked": 2, "worked_dates": ["2026-05-28", "2026-05-29"], "notes": "n/a"},
        )
        assert r.status_code == 400  # p1 has no accepted app on this mission

    def test_submit_timesheet_invalid_days(self, p2, completed_mission):
        r = requests.post(
            f"{API}/interim/missions/{completed_mission['id']}/timesheet",
            headers=auth(p2["token"]),
            json={"days_worked": 0},
        )
        assert r.status_code == 400

    def test_submit_timesheet_ok(self, p2, completed_mission):
        r = requests.post(
            f"{API}/interim/missions/{completed_mission['id']}/timesheet",
            headers=auth(p2["token"]),
            json={"days_worked": 5,
                  "worked_dates": ["2026-05-28", "2026-05-29", "2026-05-30", "2026-05-31", "2026-06-01"],
                  "notes": "Tout est ok"},
        )
        assert r.status_code == 200, r.text
        ts = r.json()
        assert ts["status"] == "submitted"
        assert ts["days_worked"] == 5
        assert ts["mission_id"] == completed_mission["id"]
        assert ts["provider_id"] == p2["id"]

    def test_resubmit_pending_updates_in_place(self, p2, completed_mission, mongo_db):
        r1 = requests.post(
            f"{API}/interim/missions/{completed_mission['id']}/timesheet",
            headers=auth(p2["token"]),
            json={"days_worked": 3, "notes": "1st"},
        )
        assert r1.status_code == 200, r1.text
        ts1 = r1.json()
        r2 = requests.post(
            f"{API}/interim/missions/{completed_mission['id']}/timesheet",
            headers=auth(p2["token"]),
            json={"days_worked": 4, "notes": "updated"},
        )
        assert r2.status_code == 200, r2.text
        ts2 = r2.json()
        assert ts2["id"] == ts1["id"]   # same row, in-place update
        assert ts2["days_worked"] == 4
        assert ts2["notes"] == "updated"
        assert ts2["status"] == "submitted"
        # Only one timesheet row exists
        count = mongo_db.interim_timesheets.count_documents({
            "mission_id": completed_mission["id"], "provider_id": p2["id"],
        })
        assert count == 1

    def test_provider_lists_own_timesheets(self, p2, completed_mission):
        requests.post(
            f"{API}/interim/missions/{completed_mission['id']}/timesheet",
            headers=auth(p2["token"]),
            json={"days_worked": 2},
        )
        r = requests.get(f"{API}/interim/timesheets/mine", headers=auth(p2["token"]))
        assert r.status_code == 200
        assert any(t["mission_id"] == completed_mission["id"] for t in r.json())

    def test_company_lists_received_timesheets(self, p2, completed_mission, company):
        requests.post(
            f"{API}/interim/missions/{completed_mission['id']}/timesheet",
            headers=auth(p2["token"]),
            json={"days_worked": 2},
        )
        r = requests.get(f"{API}/interim/timesheets/company", headers=auth(company["token"]))
        assert r.status_code == 200, r.text
        rows = r.json()
        # company-scoping → every returned row must be of this company
        assert all(t["company_id"] == company["id"] for t in rows)
        assert any(t["mission_id"] == completed_mission["id"] for t in rows)

    def test_company_validate_then_resubmit_rejected_400(self, p2, completed_mission, company):
        r = requests.post(
            f"{API}/interim/missions/{completed_mission['id']}/timesheet",
            headers=auth(p2["token"]),
            json={"days_worked": 3, "notes": "X"},
        )
        ts_id = r.json()["id"]
        rv = requests.post(f"{API}/interim/timesheets/{ts_id}/validate",
                           headers=auth(company["token"]))
        assert rv.status_code == 200, rv.text
        # provider tries to resubmit after validation
        rr = requests.post(
            f"{API}/interim/missions/{completed_mission['id']}/timesheet",
            headers=auth(p2["token"]),
            json={"days_worked": 99},
        )
        assert rr.status_code == 400

    def test_company_reject_with_reason(self, p2, completed_mission, company, mongo_db):
        r = requests.post(
            f"{API}/interim/missions/{completed_mission['id']}/timesheet",
            headers=auth(p2["token"]),
            json={"days_worked": 3},
        )
        ts_id = r.json()["id"]
        rr = requests.post(
            f"{API}/interim/timesheets/{ts_id}/reject",
            headers=auth(company["token"]),
            json={"reason": "Heures incoherentes"},
        )
        assert rr.status_code == 200
        doc = mongo_db.interim_timesheets.find_one({"id": ts_id})
        assert doc["status"] == "rejected"
        assert doc["rejection_reason"] == "Heures incoherentes"


# ----------------------------------------------------------------------
# INVOICE
# ----------------------------------------------------------------------

class TestInvoice:
    def test_invoice_with_provider_token(self, completed_mission, p2):
        r = requests.get(
            f"{API}/interim/missions/{completed_mission['id']}/invoice/{p2['id']}",
            params={"token": p2["id"]},
        )
        assert r.status_code == 200, r.text
        html = r.text
        assert "FACTURE" in html
        assert "Fatoumata" in html
        assert "Boutique Demo Conakry" in html
        assert "GNF" in html
        assert completed_mission["title"].split(" ")[0] in html

    def test_invoice_with_company_token(self, completed_mission, p2, company):
        r = requests.get(
            f"{API}/interim/missions/{completed_mission['id']}/invoice/{p2['id']}",
            params={"token": company["id"]},
        )
        assert r.status_code == 200
        assert "Boutique Demo Conakry" in r.text

    def test_invoice_rejects_invalid_token(self, completed_mission, p2):
        r = requests.get(
            f"{API}/interim/missions/{completed_mission['id']}/invoice/{p2['id']}",
            params={"token": "deadbeef-not-valid"},
        )
        assert r.status_code == 403

    def test_invoice_rejects_missing_token(self, completed_mission, p2):
        r = requests.get(
            f"{API}/interim/missions/{completed_mission['id']}/invoice/{p2['id']}"
        )
        assert r.status_code == 403


# ----------------------------------------------------------------------
# RATINGS  (bidirectional, mission must be completed)
# ----------------------------------------------------------------------

class TestRatings:
    @pytest.fixture(autouse=True)
    def _clean(self, mongo_db, completed_mission, p2):
        # Remove any pre-existing ratings on the seed mission so our assertions are deterministic
        mongo_db.interim_ratings.delete_many({"mission_id": completed_mission["id"]})
        yield
        # Leave ratings in place after the suite — they reflect a real end-state and don't break other tests

    def test_invalid_stars(self, company, completed_mission, p2):
        r = requests.post(
            f"{API}/interim/missions/{completed_mission['id']}/rate-provider",
            headers=auth(company["token"]),
            json={"provider_id": p2["id"], "stars": 9},
        )
        assert r.status_code == 400
        r2 = requests.post(
            f"{API}/interim/missions/{completed_mission['id']}/rate-provider",
            headers=auth(company["token"]),
            json={"provider_id": p2["id"], "stars": 0},
        )
        assert r2.status_code == 400

    def test_company_rates_provider(self, company, completed_mission, p2):
        r = requests.post(
            f"{API}/interim/missions/{completed_mission['id']}/rate-provider",
            headers=auth(company["token"]),
            json={"provider_id": p2["id"], "stars": 5, "comment": "Tres pro"},
        )
        assert r.status_code == 200, r.text
        assert r.json().get("created") is True

    def test_company_re_rate_updates_existing(self, company, completed_mission, p2, mongo_db):
        # 1st
        requests.post(
            f"{API}/interim/missions/{completed_mission['id']}/rate-provider",
            headers=auth(company["token"]),
            json={"provider_id": p2["id"], "stars": 4, "comment": "Bien"},
        )
        # 2nd (update)
        r2 = requests.post(
            f"{API}/interim/missions/{completed_mission['id']}/rate-provider",
            headers=auth(company["token"]),
            json={"provider_id": p2["id"], "stars": 5, "comment": "Excellent"},
        )
        assert r2.status_code == 200
        assert r2.json().get("updated") is True
        count = mongo_db.interim_ratings.count_documents({
            "mission_id": completed_mission["id"],
            "provider_id": p2["id"],
            "direction": "company_to_provider",
        })
        assert count == 1

    def test_provider_rates_company(self, p2, completed_mission):
        r = requests.post(
            f"{API}/interim/missions/{completed_mission['id']}/rate-company",
            headers=auth(p2["token"]),
            json={"stars": 4, "comment": "Bon client"},
        )
        assert r.status_code == 200, r.text
        assert r.json().get("created") is True

    def test_provider_rate_invalid_stars(self, p2, completed_mission):
        r = requests.post(
            f"{API}/interim/missions/{completed_mission['id']}/rate-company",
            headers=auth(p2["token"]),
            json={"stars": 6},
        )
        assert r.status_code == 400

    def test_non_accepted_provider_cannot_rate(self, p1, completed_mission):
        r = requests.post(
            f"{API}/interim/missions/{completed_mission['id']}/rate-company",
            headers=auth(p1["token"]),
            json={"stars": 5},
        )
        assert r.status_code == 403

    def test_summary_endpoints(self, company, completed_mission, p2):
        # Create both ratings
        requests.post(
            f"{API}/interim/missions/{completed_mission['id']}/rate-provider",
            headers=auth(company["token"]),
            json={"provider_id": p2["id"], "stars": 5, "comment": "5 stars"},
        )
        requests.post(
            f"{API}/interim/missions/{completed_mission['id']}/rate-company",
            headers=auth(p2["token"]),
            json={"stars": 4, "comment": "Good"},
        )
        rp = requests.get(f"{API}/interim/ratings/provider/{p2['id']}")
        assert rp.status_code == 200, rp.text
        body_p = rp.json()
        assert body_p["count"] >= 1
        assert body_p["average"] >= 1
        rc = requests.get(f"{API}/interim/ratings/company/{company['id']}")
        assert rc.status_code == 200
        body_c = rc.json()
        assert body_c["count"] >= 1
        assert body_c["average"] >= 1

    def test_rating_requires_completed_mission(self, company, p2, mongo_db):
        """rate-provider must fail if mission is not completed."""
        # Use the seeded OPEN mission "Agents de sécurité"
        m = mongo_db.interim_missions.find_one({"company_id": company["id"], "status": "open"}, {"_id": 0})
        if not m:
            pytest.skip("No open mission available")
        r = requests.post(
            f"{API}/interim/missions/{m['id']}/rate-provider",
            headers=auth(company["token"]),
            json={"provider_id": p2["id"], "stars": 4},
        )
        assert r.status_code == 400

    def test_end_to_end_bidirectional(self, company, p2, completed_mission, mongo_db):
        """e2e — both directions stored, both summaries reflect."""
        mongo_db.interim_ratings.delete_many({"mission_id": completed_mission["id"]})
        rp = requests.post(
            f"{API}/interim/missions/{completed_mission['id']}/rate-provider",
            headers=auth(company["token"]),
            json={"provider_id": p2["id"], "stars": 5, "comment": "Top"},
        )
        assert rp.status_code == 200
        rc = requests.post(
            f"{API}/interim/missions/{completed_mission['id']}/rate-company",
            headers=auth(p2["token"]),
            json={"stars": 3, "comment": "Moyen"},
        )
        assert rc.status_code == 200
        sp = requests.get(f"{API}/interim/ratings/provider/{p2['id']}").json()
        sc = requests.get(f"{API}/interim/ratings/company/{company['id']}").json()
        assert sp["count"] >= 1 and sp["average"] >= 1
        assert sc["count"] >= 1 and sc["average"] >= 1
        # both directions present in DB
        assert mongo_db.interim_ratings.count_documents({
            "mission_id": completed_mission["id"],
            "direction": "company_to_provider",
        }) == 1
        assert mongo_db.interim_ratings.count_documents({
            "mission_id": completed_mission["id"],
            "direction": "provider_to_company",
        }) == 1
