"""
Interim/Temp-staffing module end-to-end tests.

Covers:
- Admin settings (commission_percent + payment_methods)
- Company creates a mission
- Provider applies (suspension check)
- Company accepts → mission auto-closes when quota met
- Company completes mission → commission generated with correct math
- Provider is auto-suspended; cannot apply to a 2nd mission
- Provider submits payment proof
- Admin lists / validates / rejects commissions
- Provider unsuspended after validation; can reapply
"""
import os
import uuid
import time
import requests
import pytest
from dotenv import load_dotenv
from pathlib import Path

load_dotenv(Path(__file__).resolve().parents[2] / "frontend" / ".env")

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL').rstrip('/')
API = f"{BASE_URL}/api"

# Credentials (servispro_dev)
COMPANY_PHONE = "224620000001"
COMPANY_PASSWORD = "TestCompany2026!"
ADMIN_USERNAME = "servispro@servisprogn.com"
ADMIN_PASSWORD = "Servisproguinea2026#"


# ------------------------------------------------------------------
# Helpers / Fixtures
# ------------------------------------------------------------------

@pytest.fixture(scope="module")
def company_token():
    r = requests.post(f"{API}/auth/company/login", json={
        "phone_number": COMPANY_PHONE, "password": COMPANY_PASSWORD,
    })
    assert r.status_code == 200, f"Company login failed: {r.status_code} {r.text}"
    return r.json()["token"]


@pytest.fixture(scope="module")
def admin_token():
    r = requests.post(f"{API}/admin/login", json={
        "username": ADMIN_USERNAME, "password": ADMIN_PASSWORD,
    })
    assert r.status_code == 200, f"Admin login failed: {r.status_code} {r.text}"
    return r.json()["token"]


@pytest.fixture(scope="module")
def provider_creds():
    """Insert a fresh provider directly in MongoDB to bypass file-upload requirements
    of /auth/register (which expects an image and uses Cloudinary)."""
    import bcrypt as _bcrypt
    from pymongo import MongoClient
    mongo_url = os.environ.get("MONGO_URL") or _load_backend_env_var("MONGO_URL")
    db_name = os.environ.get("DB_NAME") or _load_backend_env_var("DB_NAME")
    client = MongoClient(mongo_url)
    coll = client[db_name].service_providers

    suffix = str(int(time.time()))[-7:]
    phone = "224611" + suffix
    password = "TestProvider2026!"
    pid = str(uuid.uuid4())
    hashed = _bcrypt.hashpw(password.encode(), _bcrypt.gensalt()).decode()
    coll.insert_one({
        "id": pid,
        "first_name": "InterimTest",
        "last_name": "Provider",
        "phone_number": phone,
        "password": hashed,
        "profession": "Electricien",
        "approved": True,
        "active": True,
        "interim_suspended": False,
        "city": "Conakry",
        "region": "Conakry",
    })

    # Login to get token
    r = requests.post(f"{API}/auth/login", json={
        "phone_number": phone, "password": password, "user_type": "provider",
    })
    assert r.status_code == 200, f"Provider login failed: {r.status_code} {r.text}"
    token = r.json()["token"]

    yield {"phone": phone, "password": password, "token": token, "id": pid}

    # Cleanup
    client[db_name].service_providers.delete_one({"id": pid})
    client[db_name].mission_applications.delete_many({"provider_id": pid})
    client[db_name].interim_commissions.delete_many({"provider_id": pid})
    client.close()


def _load_backend_env_var(key):
    """Fallback parser for /app/backend/.env if env var not in process env."""
    p = Path(__file__).resolve().parents[1] / ".env"
    if not p.exists():
        return None
    for line in p.read_text().splitlines():
        if line.startswith(f"{key}="):
            return line.split("=", 1)[1].strip().strip('"').strip("'")
    return None


@pytest.fixture(scope="module")
def provider_token(provider_creds):
    return provider_creds["token"]


def auth(token):
    return {"Authorization": f"Bearer {token}"}


# ------------------------------------------------------------------
# Admin settings
# ------------------------------------------------------------------

class TestAdminSettings:
    def test_get_settings_requires_admin(self):
        r = requests.get(f"{API}/admin/interim/settings")
        assert r.status_code == 401, f"Expected 401 without admin token, got {r.status_code}"

    def test_get_settings_ok(self, admin_token):
        r = requests.get(f"{API}/admin/interim/settings", headers=auth(admin_token))
        assert r.status_code == 200
        s = r.json()
        assert "commission_percent" in s
        assert "payment_methods" in s
        assert isinstance(s["payment_methods"], list)

    def test_reset_commission_to_10(self, admin_token):
        r = requests.put(
            f"{API}/admin/interim/settings",
            headers=auth(admin_token),
            json={"commission_percent": 10},
        )
        assert r.status_code == 200
        assert float(r.json()["commission_percent"]) == 10.0

    def test_payment_methods_crud(self, admin_token):
        methods = [
            {"type": "orange_money", "label": "Orange Money SP",
             "account_name": "ServisPro", "account_number": "624111222",
             "instructions": "Envoyer puis fournir reference"},
            {"type": "bank", "label": "BICIGUI",
             "account_name": "ServisPro SARL", "account_number": "GN013-XXXX",
             "instructions": "Virement bancaire"},
        ]
        r = requests.put(
            f"{API}/admin/interim/settings",
            headers=auth(admin_token),
            json={"payment_methods": methods},
        )
        assert r.status_code == 200
        out = r.json()["payment_methods"]
        assert len(out) == 2
        assert all("id" in m for m in out)
        assert {m["type"] for m in out} == {"orange_money", "bank"}

    def test_invalid_commission_percent(self, admin_token):
        r = requests.put(
            f"{API}/admin/interim/settings",
            headers=auth(admin_token),
            json={"commission_percent": 150},
        )
        assert r.status_code == 400


# ------------------------------------------------------------------
# End-to-end Mission Lifecycle  (10% commission)
# ------------------------------------------------------------------

# module-level state holders shared between tests
_state = {}


class TestMissionLifecycle10:
    def test_company_creates_mission(self, company_token):
        payload = {
            "title": "TEST_Mission_Electricien",
            "description": "Installation electrique sur chantier de 2 jours",
            "job_type": "Electricien",
            "location_city": "Conakry",
            "location_region": "Conakry",
            "daily_rate": 200000,
            "num_providers_needed": 1,
        }
        r = requests.post(f"{API}/interim/missions", json=payload, headers=auth(company_token))
        assert r.status_code == 200, r.text
        m = r.json()
        assert m["status"] == "open"
        assert m["daily_rate"] == 200000
        assert m["num_providers_needed"] == 1
        _state["mission_id"] = m["id"]

    def test_mine_endpoint_company(self, company_token):
        r = requests.get(f"{API}/interim/missions/mine", headers=auth(company_token))
        assert r.status_code == 200
        ids = [m["id"] for m in r.json()]
        assert _state["mission_id"] in ids

    def test_public_open_missions_visible_to_provider(self, provider_token):
        r = requests.get(f"{API}/interim/missions", headers=auth(provider_token))
        assert r.status_code == 200
        ids = [m["id"] for m in r.json()]
        assert _state["mission_id"] in ids

    def test_provider_applies(self, provider_token):
        r = requests.post(
            f"{API}/interim/missions/{_state['mission_id']}/apply",
            headers=auth(provider_token),
            json={"cover_message": "Disponible immediatement", "proposed_rate": 200000},
        )
        assert r.status_code == 200, r.text
        a = r.json()
        assert a["status"] == "pending"
        _state["application_id"] = a["id"]

    def test_duplicate_apply_rejected(self, provider_token):
        r = requests.post(
            f"{API}/interim/missions/{_state['mission_id']}/apply",
            headers=auth(provider_token), json={},
        )
        assert r.status_code == 400

    def test_applications_mine(self, provider_token):
        r = requests.get(f"{API}/interim/applications/mine", headers=auth(provider_token))
        assert r.status_code == 200
        assert any(a["id"] == _state["application_id"] for a in r.json())

    def test_company_lists_mission_apps(self, company_token):
        r = requests.get(
            f"{API}/interim/missions/{_state['mission_id']}/applications",
            headers=auth(company_token),
        )
        assert r.status_code == 200
        assert any(a["id"] == _state["application_id"] for a in r.json())

    def test_accept_application_auto_closes_mission(self, company_token):
        r = requests.post(
            f"{API}/interim/applications/{_state['application_id']}/accept",
            headers=auth(company_token),
        )
        assert r.status_code == 200
        # Verify mission status now closed
        r2 = requests.get(f"{API}/interim/missions/{_state['mission_id']}")
        assert r2.status_code == 200
        assert r2.json()["status"] == "closed"

    def test_complete_mission_generates_commission_10pct(self, company_token):
        r = requests.post(
            f"{API}/interim/missions/{_state['mission_id']}/complete",
            headers=auth(company_token),
            json={"days_worked": 2, "daily_rate": 200000},
        )
        assert r.status_code == 200, r.text
        out = r.json()
        assert out["commissions_created"] == 1
        c = out["commissions"][0]
        assert c["gross_amount"] == 400000
        assert c["commission_percent"] == 10.0
        assert c["commission_amount"] == 40000
        assert c["status"] == "pending"
        _state["commission_id"] = c["id"]

    def test_complete_again_fails(self, company_token):
        r = requests.post(
            f"{API}/interim/missions/{_state['mission_id']}/complete",
            headers=auth(company_token), json={},
        )
        assert r.status_code == 400

    def test_provider_commissions_mine(self, provider_token):
        r = requests.get(f"{API}/interim/commissions/mine", headers=auth(provider_token))
        assert r.status_code == 200
        assert any(c["id"] == _state["commission_id"] for c in r.json())

    def test_provider_now_suspended_cannot_apply(self, provider_token, company_token):
        # Create a second mission and try to apply
        r = requests.post(f"{API}/interim/missions", json={
            "title": "TEST_Second_Mission",
            "description": "Second mission to test suspension",
            "job_type": "Electricien",
            "location_city": "Conakry",
            "daily_rate": 150000,
            "num_providers_needed": 1,
        }, headers=auth(company_token))
        assert r.status_code == 200, r.text
        second_id = r.json()["id"]
        _state["second_mission_id"] = second_id

        ra = requests.post(
            f"{API}/interim/missions/{second_id}/apply",
            headers=auth(provider_token), json={},
        )
        assert ra.status_code == 403, f"Expected 403 suspended, got {ra.status_code} {ra.text}"

    def test_submit_payment_invalid_method(self, provider_token):
        r = requests.post(
            f"{API}/interim/commissions/{_state['commission_id']}/submit-payment",
            headers=auth(provider_token),
            json={"payment_method": "btc", "transfer_reference": "X"},
        )
        assert r.status_code == 400

    def test_submit_payment_missing_reference(self, provider_token):
        r = requests.post(
            f"{API}/interim/commissions/{_state['commission_id']}/submit-payment",
            headers=auth(provider_token),
            json={"payment_method": "orange_money", "transfer_reference": "  "},
        )
        assert r.status_code == 400

    def test_submit_payment_ok(self, provider_token):
        r = requests.post(
            f"{API}/interim/commissions/{_state['commission_id']}/submit-payment",
            headers=auth(provider_token),
            json={"payment_method": "orange_money", "transfer_reference": "REF-123",
                  "sender_phone": "224611000000", "note": "OK"},
        )
        assert r.status_code == 200, r.text
        assert r.json()["status"] == "submitted"

    def test_admin_lists_submitted(self, admin_token):
        r = requests.get(
            f"{API}/admin/interim/commissions?status=submitted",
            headers=auth(admin_token),
        )
        assert r.status_code == 200
        data = r.json()
        assert "counts" in data and "commissions" in data
        assert any(c["id"] == _state["commission_id"] for c in data["commissions"])
        assert data["counts"]["submitted"] >= 1

    def test_admin_validate_unsuspends_provider(self, admin_token):
        r = requests.post(
            f"{API}/admin/interim/commissions/{_state['commission_id']}/validate",
            headers=auth(admin_token),
        )
        assert r.status_code == 200, r.text
        body = r.json()
        assert body["status"] == "validated"
        assert body["provider_unsuspended"] is True

    def test_validate_already_validated_fails(self, admin_token):
        r = requests.post(
            f"{API}/admin/interim/commissions/{_state['commission_id']}/validate",
            headers=auth(admin_token),
        )
        assert r.status_code == 400

    def test_provider_can_reapply_after_unsuspend(self, provider_token):
        r = requests.post(
            f"{API}/interim/missions/{_state['second_mission_id']}/apply",
            headers=auth(provider_token),
            json={"cover_message": "Disponible"},
        )
        assert r.status_code == 200, f"Reapply failed: {r.status_code} {r.text}"


# ------------------------------------------------------------------
# Commission math @ 15% + admin reject flow
# ------------------------------------------------------------------

class TestCommission15PercentAndReject:
    def test_update_commission_to_15(self, admin_token):
        r = requests.put(
            f"{API}/admin/interim/settings",
            headers=auth(admin_token),
            json={"commission_percent": 15},
        )
        assert r.status_code == 200
        assert float(r.json()["commission_percent"]) == 15.0

    def test_full_flow_with_reject_and_resubmit(self, company_token, provider_token, admin_token):
        # 1. Company creates mission
        r = requests.post(f"{API}/interim/missions", json={
            "title": "TEST_Mission_15pct",
            "description": "Mission test 15% commission",
            "job_type": "Macon",
            "location_city": "Conakry",
            "daily_rate": 100000,
            "num_providers_needed": 1,
        }, headers=auth(company_token))
        assert r.status_code == 200, r.text
        mission_id = r.json()["id"]

        # 2. Provider applies
        ra = requests.post(
            f"{API}/interim/missions/{mission_id}/apply",
            headers=auth(provider_token),
            json={"cover_message": "OK"},
        )
        assert ra.status_code == 200, ra.text
        app_id = ra.json()["id"]

        # 3. Company accepts
        racc = requests.post(
            f"{API}/interim/applications/{app_id}/accept",
            headers=auth(company_token),
        )
        assert racc.status_code == 200

        # 4. Company completes with days=3 → gross=300000, 15%=45000
        rc = requests.post(
            f"{API}/interim/missions/{mission_id}/complete",
            headers=auth(company_token),
            json={"days_worked": 3},
        )
        assert rc.status_code == 200, rc.text
        c = rc.json()["commissions"][0]
        assert c["gross_amount"] == 300000
        assert c["commission_percent"] == 15.0
        assert c["commission_amount"] == 45000
        commission_id = c["id"]

        # 5. Provider submits payment
        rs = requests.post(
            f"{API}/interim/commissions/{commission_id}/submit-payment",
            headers=auth(provider_token),
            json={"payment_method": "mtn_money", "transfer_reference": "MTN-999"},
        )
        assert rs.status_code == 200

        # 6. Admin rejects → provider stays suspended
        rr = requests.post(
            f"{API}/admin/interim/commissions/{commission_id}/reject",
            headers=auth(admin_token),
            json={"reason": "Reference introuvable"},
        )
        assert rr.status_code == 200
        assert rr.json()["status"] == "rejected"

        # 7. Verify provider is still suspended : create a 2nd mission & try apply
        rm2 = requests.post(f"{API}/interim/missions", json={
            "title": "TEST_AfterReject_Mission",
            "description": "Should not be applicable",
            "job_type": "Macon",
            "location_city": "Conakry",
            "daily_rate": 90000,
            "num_providers_needed": 1,
        }, headers=auth(company_token))
        assert rm2.status_code == 200
        m2id = rm2.json()["id"]
        rapp = requests.post(
            f"{API}/interim/missions/{m2id}/apply",
            headers=auth(provider_token), json={},
        )
        assert rapp.status_code == 403, f"Provider should still be suspended after reject, got {rapp.status_code}"

        # 8. Provider re-submits payment (rejected → submitted)
        rs2 = requests.post(
            f"{API}/interim/commissions/{commission_id}/submit-payment",
            headers=auth(provider_token),
            json={"payment_method": "bank", "transfer_reference": "BANK-7777"},
        )
        assert rs2.status_code == 200, rs2.text
        assert rs2.json()["status"] == "submitted"

        # 9. Admin validates → unsuspend
        rv = requests.post(
            f"{API}/admin/interim/commissions/{commission_id}/validate",
            headers=auth(admin_token),
        )
        assert rv.status_code == 200
        assert rv.json()["status"] == "validated"
        assert rv.json()["provider_unsuspended"] is True

        # 10. Provider can apply now
        rapp2 = requests.post(
            f"{API}/interim/missions/{m2id}/apply",
            headers=auth(provider_token), json={},
        )
        assert rapp2.status_code == 200, rapp2.text


# ------------------------------------------------------------------
# Auth/access edge cases
# ------------------------------------------------------------------

class TestAccessControl:
    def test_create_mission_requires_company(self, provider_token):
        r = requests.post(f"{API}/interim/missions", json={
            "title": "T", "description": "D", "job_type": "X", "daily_rate": 1000,
        }, headers=auth(provider_token))
        # provider token is not a company → /api/company/find_one returns None
        assert r.status_code == 401, f"Expected 401, got {r.status_code}"

    def test_admin_settings_requires_admin(self, company_token):
        r = requests.put(
            f"{API}/admin/interim/settings",
            headers=auth(company_token),
            json={"commission_percent": 12},
        )
        assert r.status_code == 403
