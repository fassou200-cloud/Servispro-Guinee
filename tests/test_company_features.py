"""
Test suite for Company (Entreprise) features in ServisPro
Tests: Company registration, login, document upload, admin approval/rejection
"""
import pytest
import requests
import os
import uuid

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')

# Test data
TEST_COMPANY_RCCM = f"RCCM/GC/TEST{uuid.uuid4().hex[:6].upper()}"
TEST_COMPANY_PASSWORD = "test123"
TEST_COMPANY_DATA = {
    "company_name": "Test Entreprise SARL",
    "rccm_number": TEST_COMPANY_RCCM,
    "nif_number": "NIF-TEST123456",
    "sector": "Construction",
    "address": "Quartier Almamya, Rue KA-001",
    "city": "Conakry",
    "region": "Conakry",
    "phone_number": f"620{uuid.uuid4().hex[:7]}",  # 10+ digits
    "email": "test@entreprise.com",
    "website": "https://www.testentreprise.com",
    "description": "Entreprise de construction et BTP spécialisée dans les travaux publics",
    "password": TEST_COMPANY_PASSWORD,
    "contact_person_name": "Mamadou Diallo",
    "contact_person_phone": "6201234567"  # 10 digits
}

# Store created company data for cleanup
created_company_id = None
company_token = None


class TestCompanyRegistration:
    """Test company registration flow"""
    
    def test_register_company_success(self):
        """Test successful company registration"""
        global created_company_id, company_token
        
        response = requests.post(f"{BASE_URL}/api/auth/company/register", json=TEST_COMPANY_DATA)
        
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        data = response.json()
        assert "token" in data, "Response should contain token"
        assert "user" in data, "Response should contain user"
        
        user = data["user"]
        assert user["company_name"] == TEST_COMPANY_DATA["company_name"]
        assert user["rccm_number"] == TEST_COMPANY_DATA["rccm_number"]
        assert user["sector"] == TEST_COMPANY_DATA["sector"]
        assert user["verification_status"] == "pending", "New company should be pending"
        assert "id" in user
        
        created_company_id = user["id"]
        company_token = data["token"]
        
        print(f"✓ Company registered successfully with ID: {created_company_id}")
    
    def test_register_duplicate_rccm_fails(self):
        """Test that duplicate RCCM number registration fails"""
        response = requests.post(f"{BASE_URL}/api/auth/company/register", json=TEST_COMPANY_DATA)
        
        assert response.status_code == 400, f"Expected 400 for duplicate RCCM, got {response.status_code}"
        assert "RCCM" in response.json().get("detail", "").lower() or "enregistré" in response.json().get("detail", "").lower()
        
        print("✓ Duplicate RCCM registration correctly rejected")


class TestCompanyLogin:
    """Test company login flow"""
    
    def test_login_company_success(self):
        """Test successful company login with RCCM number"""
        global company_token
        
        login_data = {
            "rccm_number": TEST_COMPANY_DATA["rccm_number"],
            "password": TEST_COMPANY_PASSWORD
        }
        
        response = requests.post(f"{BASE_URL}/api/auth/company/login", json=login_data)
        
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        data = response.json()
        assert "token" in data
        assert "user" in data
        assert data["user"]["rccm_number"] == TEST_COMPANY_DATA["rccm_number"]
        
        company_token = data["token"]
        print("✓ Company login successful")
    
    def test_login_invalid_credentials(self):
        """Test login with invalid credentials"""
        login_data = {
            "rccm_number": "INVALID/RCCM/NUMBER",
            "password": "wrongpassword"
        }
        
        response = requests.post(f"{BASE_URL}/api/auth/company/login", json=login_data)
        
        assert response.status_code == 401, f"Expected 401, got {response.status_code}"
        print("✓ Invalid credentials correctly rejected")


class TestCompanyProfile:
    """Test company profile operations"""
    
    def test_get_company_profile(self):
        """Test getting company profile"""
        headers = {"Authorization": f"Bearer {company_token}"}
        
        response = requests.get(f"{BASE_URL}/api/company/profile/me", headers=headers)
        
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        data = response.json()
        assert data["company_name"] == TEST_COMPANY_DATA["company_name"]
        assert data["rccm_number"] == TEST_COMPANY_DATA["rccm_number"]
        assert data["verification_status"] == "pending"
        
        print("✓ Company profile retrieved successfully")
    
    def test_update_company_profile(self):
        """Test updating company profile"""
        headers = {"Authorization": f"Bearer {company_token}"}
        
        update_data = {
            "description": "Updated description for testing",
            "online_status": True
        }
        
        response = requests.put(f"{BASE_URL}/api/company/profile/me", json=update_data, headers=headers)
        
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        data = response.json()
        assert data["description"] == update_data["description"]
        assert data["online_status"] == True
        
        print("✓ Company profile updated successfully")


class TestCompanyDocuments:
    """Test company document upload"""
    
    def test_upload_licence_exploitation(self):
        """Test uploading licence d'exploitation document"""
        headers = {"Authorization": f"Bearer {company_token}"}
        
        # Create a test file
        files = {"file": ("licence.pdf", b"Test PDF content for licence", "application/pdf")}
        
        response = requests.post(
            f"{BASE_URL}/api/company/upload-document/licence_exploitation",
            headers=headers,
            files=files
        )
        
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        data = response.json()
        assert "document_url" in data
        assert data["document_type"] == "licence_exploitation"
        
        print("✓ Licence d'exploitation uploaded successfully")
    
    def test_upload_rccm_document(self):
        """Test uploading RCCM document"""
        headers = {"Authorization": f"Bearer {company_token}"}
        
        files = {"file": ("rccm.pdf", b"Test PDF content for RCCM", "application/pdf")}
        
        response = requests.post(
            f"{BASE_URL}/api/company/upload-document/rccm_document",
            headers=headers,
            files=files
        )
        
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        data = response.json()
        assert "document_url" in data
        assert data["document_type"] == "rccm_document"
        
        print("✓ RCCM document uploaded successfully")
    
    def test_upload_nif_document(self):
        """Test uploading NIF document"""
        headers = {"Authorization": f"Bearer {company_token}"}
        
        files = {"file": ("nif.pdf", b"Test PDF content for NIF", "application/pdf")}
        
        response = requests.post(
            f"{BASE_URL}/api/company/upload-document/nif_document",
            headers=headers,
            files=files
        )
        
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        data = response.json()
        assert "document_url" in data
        assert data["document_type"] == "nif_document"
        
        print("✓ NIF document uploaded successfully")
    
    def test_upload_attestation_fiscale(self):
        """Test uploading attestation fiscale document"""
        headers = {"Authorization": f"Bearer {company_token}"}
        
        files = {"file": ("attestation.pdf", b"Test PDF content for attestation", "application/pdf")}
        
        response = requests.post(
            f"{BASE_URL}/api/company/upload-document/attestation_fiscale",
            headers=headers,
            files=files
        )
        
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        data = response.json()
        assert "document_url" in data
        assert data["document_type"] == "attestation_fiscale"
        
        print("✓ Attestation fiscale uploaded successfully")
    
    def test_upload_company_logo(self):
        """Test uploading company logo"""
        headers = {"Authorization": f"Bearer {company_token}"}
        
        files = {"file": ("logo.png", b"PNG image content", "image/png")}
        
        response = requests.post(
            f"{BASE_URL}/api/company/upload-logo",
            headers=headers,
            files=files
        )
        
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        data = response.json()
        assert "logo" in data
        
        print("✓ Company logo uploaded successfully")
    
    def test_verify_documents_in_profile(self):
        """Verify all documents are attached to company profile"""
        headers = {"Authorization": f"Bearer {company_token}"}
        
        response = requests.get(f"{BASE_URL}/api/company/profile/me", headers=headers)
        
        assert response.status_code == 200
        
        data = response.json()
        assert data.get("licence_exploitation") is not None, "Licence should be uploaded"
        assert data.get("rccm_document") is not None, "RCCM document should be uploaded"
        assert data.get("nif_document") is not None, "NIF document should be uploaded"
        assert data.get("attestation_fiscale") is not None, "Attestation fiscale should be uploaded"
        assert data.get("logo") is not None, "Logo should be uploaded"
        
        print("✓ All documents verified in company profile")


class TestCompanyServicesRestriction:
    """Test that pending companies cannot publish services/job offers"""
    
    def test_pending_company_cannot_create_service(self):
        """Test that pending company cannot create services"""
        headers = {"Authorization": f"Bearer {company_token}"}
        
        service_data = {
            "title": "Test Service",
            "description": "Test description",
            "category": "Construction",
            "price_min": 100000,
            "price_max": 500000,
            "location": "Conakry",
            "is_available": True
        }
        
        response = requests.post(
            f"{BASE_URL}/api/company/services",
            json=service_data,
            headers=headers
        )
        
        assert response.status_code == 403, f"Expected 403 for pending company, got {response.status_code}"
        assert "approuvée" in response.json().get("detail", "").lower()
        
        print("✓ Pending company correctly blocked from creating services")
    
    def test_pending_company_cannot_create_job_offer(self):
        """Test that pending company cannot create job offers"""
        headers = {"Authorization": f"Bearer {company_token}"}
        
        job_data = {
            "title": "Test Job Offer",
            "description": "Test description",
            "requirements": "Test requirements",
            "location": "Conakry",
            "contract_type": "CDI",
            "salary_min": 1000000,
            "salary_max": 2000000,
            "is_active": True
        }
        
        response = requests.post(
            f"{BASE_URL}/api/company/job-offers",
            json=job_data,
            headers=headers
        )
        
        assert response.status_code == 403, f"Expected 403 for pending company, got {response.status_code}"
        assert "approuvée" in response.json().get("detail", "").lower()
        
        print("✓ Pending company correctly blocked from creating job offers")


class TestAdminCompanyManagement:
    """Test admin company management features"""
    
    def test_admin_get_all_companies(self):
        """Test admin can get all companies"""
        response = requests.get(f"{BASE_URL}/api/admin/companies")
        
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        data = response.json()
        assert isinstance(data, list)
        
        # Find our test company
        test_company = next((c for c in data if c["id"] == created_company_id), None)
        assert test_company is not None, "Test company should be in the list"
        assert test_company["verification_status"] == "pending"
        
        # Verify documents are visible to admin
        assert "licence_exploitation" in test_company
        assert "rccm_document" in test_company
        
        print(f"✓ Admin retrieved {len(data)} companies including test company")
    
    def test_admin_approve_company(self):
        """Test admin can approve a company"""
        response = requests.put(f"{BASE_URL}/api/admin/companies/{created_company_id}/approve")
        
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        # Verify company is now approved
        headers = {"Authorization": f"Bearer {company_token}"}
        profile_response = requests.get(f"{BASE_URL}/api/company/profile/me", headers=headers)
        
        assert profile_response.status_code == 200
        assert profile_response.json()["verification_status"] == "approved"
        
        print("✓ Admin approved company successfully")
    
    def test_approved_company_can_create_service(self):
        """Test that approved company can create services"""
        headers = {"Authorization": f"Bearer {company_token}"}
        
        service_data = {
            "title": "Service de Construction",
            "description": "Construction de bâtiments résidentiels et commerciaux",
            "category": "Construction",
            "price_min": 500000,
            "price_max": 5000000,
            "location": "Conakry",
            "is_available": True
        }
        
        response = requests.post(
            f"{BASE_URL}/api/company/services",
            json=service_data,
            headers=headers
        )
        
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        data = response.json()
        assert data["title"] == service_data["title"]
        assert data["company_name"] == TEST_COMPANY_DATA["company_name"]
        
        print("✓ Approved company can create services")
    
    def test_approved_company_can_create_job_offer(self):
        """Test that approved company can create job offers"""
        headers = {"Authorization": f"Bearer {company_token}"}
        
        job_data = {
            "title": "Ingénieur Civil",
            "description": "Recherche ingénieur civil expérimenté",
            "requirements": "Diplôme en génie civil, 5 ans d'expérience",
            "location": "Conakry",
            "contract_type": "CDI",
            "salary_min": 3000000,
            "salary_max": 5000000,
            "is_active": True
        }
        
        response = requests.post(
            f"{BASE_URL}/api/company/job-offers",
            json=job_data,
            headers=headers
        )
        
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        data = response.json()
        assert data["title"] == job_data["title"]
        assert data["company_name"] == TEST_COMPANY_DATA["company_name"]
        
        print("✓ Approved company can create job offers")
    
    def test_admin_reject_company(self):
        """Test admin can reject a company"""
        # First create another company to reject
        new_company_data = TEST_COMPANY_DATA.copy()
        new_company_data["rccm_number"] = f"RCCM/GC/REJ{uuid.uuid4().hex[:6].upper()}"
        new_company_data["phone_number"] = f"630{uuid.uuid4().hex[:7]}"  # 10+ digits
        
        reg_response = requests.post(f"{BASE_URL}/api/auth/company/register", json=new_company_data)
        assert reg_response.status_code == 200
        
        new_company_id = reg_response.json()["user"]["id"]
        
        # Reject the company
        response = requests.put(f"{BASE_URL}/api/admin/companies/{new_company_id}/reject")
        
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        # Verify company is rejected
        companies_response = requests.get(f"{BASE_URL}/api/admin/companies")
        rejected_company = next((c for c in companies_response.json() if c["id"] == new_company_id), None)
        
        assert rejected_company is not None
        assert rejected_company["verification_status"] == "rejected"
        
        # Cleanup - delete the rejected company
        requests.delete(f"{BASE_URL}/api/admin/companies/{new_company_id}")
        
        print("✓ Admin rejected company successfully")
    
    def test_admin_delete_company(self):
        """Test admin can delete a company"""
        # Create a company to delete
        delete_company_data = TEST_COMPANY_DATA.copy()
        delete_company_data["rccm_number"] = f"RCCM/GC/DEL{uuid.uuid4().hex[:6].upper()}"
        delete_company_data["phone_number"] = f"640{uuid.uuid4().hex[:7]}"  # 10+ digits
        
        reg_response = requests.post(f"{BASE_URL}/api/auth/company/register", json=delete_company_data)
        assert reg_response.status_code == 200
        
        delete_company_id = reg_response.json()["user"]["id"]
        
        # Delete the company
        response = requests.delete(f"{BASE_URL}/api/admin/companies/{delete_company_id}")
        
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        # Verify company is deleted
        companies_response = requests.get(f"{BASE_URL}/api/admin/companies")
        deleted_company = next((c for c in companies_response.json() if c["id"] == delete_company_id), None)
        
        assert deleted_company is None, "Deleted company should not be in the list"
        
        print("✓ Admin deleted company successfully")


class TestAdminStats:
    """Test admin stats include company data"""
    
    def test_admin_stats_include_companies(self):
        """Test admin stats endpoint includes company counts"""
        response = requests.get(f"{BASE_URL}/api/admin/stats")
        
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        data = response.json()
        assert "total_companies" in data, "Stats should include total_companies"
        assert "pending_companies" in data, "Stats should include pending_companies"
        assert "approved_companies" in data, "Stats should include approved_companies"
        
        print(f"✓ Admin stats: {data.get('total_companies')} companies, {data.get('pending_companies')} pending, {data.get('approved_companies')} approved")


class TestPublicCompanyEndpoints:
    """Test public company endpoints"""
    
    def test_get_approved_companies_public(self):
        """Test public endpoint only returns approved companies"""
        response = requests.get(f"{BASE_URL}/api/companies")
        
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        data = response.json()
        assert isinstance(data, list)
        
        # All returned companies should be approved
        for company in data:
            assert company["verification_status"] == "approved", "Public endpoint should only return approved companies"
        
        print(f"✓ Public endpoint returned {len(data)} approved companies")
    
    def test_get_company_by_id_public(self):
        """Test getting a specific approved company"""
        # Our test company should be approved now
        response = requests.get(f"{BASE_URL}/api/companies/{created_company_id}")
        
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        data = response.json()
        assert data["id"] == created_company_id
        assert data["verification_status"] == "approved"
        assert "password" not in data, "Password should not be exposed"
        
        print("✓ Public company detail endpoint works correctly")


class TestCleanup:
    """Cleanup test data"""
    
    def test_cleanup_test_company(self):
        """Delete test company after all tests"""
        if created_company_id:
            response = requests.delete(f"{BASE_URL}/api/admin/companies/{created_company_id}")
            # Don't fail if already deleted
            print(f"✓ Cleanup: Test company deleted (status: {response.status_code})")


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
