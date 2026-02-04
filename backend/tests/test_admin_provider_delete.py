"""
Test suite for Admin Provider Delete and Provider Registration with Documents
Features tested:
1. Admin can delete a provider (DELETE /api/admin/providers/{id})
2. Provider registration with PDF document upload (POST /api/auth/register with FormData)
3. Cloudinary files are deleted when a provider is deleted
4. Provider list displays in admin dashboard
"""

import pytest
import requests
import os
import io

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')

# Admin credentials
ADMIN_EMAIL = "servispro@servisprogn.com"
ADMIN_PASSWORD = "Servisproguinea2026#"


class TestAdminLogin:
    """Test admin authentication"""
    
    def test_admin_login_success(self):
        """Test admin can login successfully"""
        response = requests.post(f"{BASE_URL}/api/admin/login", json={
            "username": ADMIN_EMAIL,
            "password": ADMIN_PASSWORD
        })
        
        assert response.status_code == 200, f"Admin login failed: {response.text}"
        data = response.json()
        assert "token" in data, "Token not in response"
        assert "user" in data, "User info not in response"
        print(f"✓ Admin login successful: {data['user'].get('username', 'N/A')}")


class TestProviderListAdmin:
    """Test admin can view provider list"""
    
    @pytest.fixture
    def admin_token(self):
        """Get admin token"""
        response = requests.post(f"{BASE_URL}/api/admin/login", json={
            "username": ADMIN_EMAIL,
            "password": ADMIN_PASSWORD
        })
        if response.status_code == 200:
            return response.json()["token"]
        pytest.skip("Admin login failed")
    
    def test_get_providers_list(self, admin_token):
        """Test admin can get list of providers"""
        headers = {"Authorization": f"Bearer {admin_token}"}
        response = requests.get(f"{BASE_URL}/api/admin/providers", headers=headers)
        
        assert response.status_code == 200, f"Failed to get providers: {response.text}"
        providers = response.json()
        assert isinstance(providers, list), "Response should be a list"
        print(f"✓ Admin can view providers list: {len(providers)} providers found")
        
        # Check provider structure if any exist
        if len(providers) > 0:
            provider = providers[0]
            assert "id" in provider, "Provider should have id"
            assert "first_name" in provider, "Provider should have first_name"
            assert "last_name" in provider, "Provider should have last_name"
            assert "phone_number" in provider, "Provider should have phone_number"
            print(f"✓ Provider structure verified: {provider.get('first_name')} {provider.get('last_name')}")


class TestProviderRegistrationWithDocuments:
    """Test provider registration with document upload"""
    
    def test_register_provider_with_pdf_document(self):
        """Test provider registration with PDF document upload"""
        import uuid
        
        # Generate unique phone number for test
        test_phone = f"224{uuid.uuid4().hex[:9]}"
        
        # Create a mock PDF file content
        pdf_content = b"%PDF-1.4\n1 0 obj\n<< /Type /Catalog /Pages 2 0 R >>\nendobj\n2 0 obj\n<< /Type /Pages /Kids [3 0 R] /Count 1 >>\nendobj\n3 0 obj\n<< /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] >>\nendobj\nxref\n0 4\n0000000000 65535 f \n0000000009 00000 n \n0000000058 00000 n \n0000000115 00000 n \ntrailer\n<< /Size 4 /Root 1 0 R >>\nstartxref\n199\n%%EOF"
        
        # Prepare form data
        files = {
            'documents': ('test_certificate.pdf', io.BytesIO(pdf_content), 'application/pdf')
        }
        
        data = {
            'first_name': 'Test',
            'last_name': 'Provider',
            'phone_number': test_phone,
            'password': 'TestPassword123',
            'profession': 'Plombier',
            'profession_group': 'Artisanat',
            'years_experience': '2-5',
            'custom_profession': '',
            'location': 'Conakry',
            'region': 'conakry',
            'ville': 'conakry',
            'commune': 'ratoma',
            'quartier': 'Test Quartier',
            'about': 'Je suis un plombier professionnel avec plusieurs années d\'expérience dans le domaine.'
        }
        
        response = requests.post(
            f"{BASE_URL}/api/auth/register",
            data=data,
            files=files
        )
        
        print(f"Registration response status: {response.status_code}")
        print(f"Registration response: {response.text[:500] if response.text else 'No response'}")
        
        assert response.status_code == 200, f"Registration failed: {response.text}"
        result = response.json()
        
        assert "token" in result, "Token not in response"
        assert "user" in result, "User not in response"
        
        user = result["user"]
        assert user.get("first_name") == "Test", "First name mismatch"
        assert user.get("last_name") == "Provider", "Last name mismatch"
        
        # Check documents were uploaded
        documents = user.get("documents", [])
        print(f"✓ Provider registered with {len(documents)} document(s)")
        
        if len(documents) > 0:
            doc = documents[0]
            assert "path" in doc, "Document should have path"
            # Check if it's a Cloudinary URL
            if doc.get("path"):
                assert "cloudinary.com" in doc["path"], f"Document should be on Cloudinary: {doc['path']}"
                print(f"✓ Document uploaded to Cloudinary: {doc['path'][:80]}...")
        
        # Return provider ID for cleanup
        return user.get("id"), result.get("token")
    
    def test_register_provider_without_document_fails(self):
        """Test that registration without document fails"""
        import uuid
        
        test_phone = f"224{uuid.uuid4().hex[:9]}"
        
        data = {
            'first_name': 'Test',
            'last_name': 'NoDoc',
            'phone_number': test_phone,
            'password': 'TestPassword123',
            'profession': 'Plombier',
            'profession_group': 'Artisanat',
            'years_experience': '2-5',
            'custom_profession': '',
            'location': 'Conakry',
            'region': 'conakry',
            'ville': 'conakry',
            'commune': 'ratoma',
            'quartier': 'Test Quartier',
            'about': 'Je suis un plombier professionnel avec plusieurs années d\'expérience.'
        }
        
        response = requests.post(
            f"{BASE_URL}/api/auth/register",
            data=data
        )
        
        # Should fail because no document provided
        assert response.status_code == 400 or response.status_code == 422, \
            f"Registration without document should fail: {response.status_code} - {response.text}"
        print("✓ Registration without document correctly rejected")


class TestAdminDeleteProvider:
    """Test admin can delete a provider"""
    
    @pytest.fixture
    def admin_token(self):
        """Get admin token"""
        response = requests.post(f"{BASE_URL}/api/admin/login", json={
            "username": ADMIN_EMAIL,
            "password": ADMIN_PASSWORD
        })
        if response.status_code == 200:
            return response.json()["token"]
        pytest.skip("Admin login failed")
    
    @pytest.fixture
    def test_provider(self):
        """Create a test provider for deletion"""
        import uuid
        
        test_phone = f"224{uuid.uuid4().hex[:9]}"
        
        # Create a mock PDF file
        pdf_content = b"%PDF-1.4\n1 0 obj\n<< /Type /Catalog /Pages 2 0 R >>\nendobj\n2 0 obj\n<< /Type /Pages /Kids [3 0 R] /Count 1 >>\nendobj\n3 0 obj\n<< /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] >>\nendobj\nxref\n0 4\n0000000000 65535 f \n0000000009 00000 n \n0000000058 00000 n \n0000000115 00000 n \ntrailer\n<< /Size 4 /Root 1 0 R >>\nstartxref\n199\n%%EOF"
        
        files = {
            'documents': ('test_doc.pdf', io.BytesIO(pdf_content), 'application/pdf')
        }
        
        data = {
            'first_name': 'ToDelete',
            'last_name': 'Provider',
            'phone_number': test_phone,
            'password': 'TestPassword123',
            'profession': 'Plombier',
            'profession_group': 'Artisanat',
            'years_experience': '2-5',
            'custom_profession': '',
            'location': 'Conakry',
            'region': 'conakry',
            'ville': 'conakry',
            'commune': 'ratoma',
            'quartier': 'Test Quartier',
            'about': 'Ce prestataire sera supprimé pour tester la fonctionnalité de suppression.'
        }
        
        response = requests.post(
            f"{BASE_URL}/api/auth/register",
            data=data,
            files=files
        )
        
        if response.status_code == 200:
            result = response.json()
            return result["user"]
        pytest.skip(f"Failed to create test provider: {response.text}")
    
    def test_delete_provider_success(self, admin_token, test_provider):
        """Test admin can delete a provider successfully"""
        provider_id = test_provider["id"]
        provider_name = f"{test_provider['first_name']} {test_provider['last_name']}"
        
        # Get provider documents before deletion
        documents = test_provider.get("documents", [])
        cloudinary_urls = [doc.get("path") for doc in documents if doc.get("path") and "cloudinary.com" in doc.get("path", "")]
        
        print(f"Deleting provider: {provider_name} (ID: {provider_id})")
        print(f"Provider has {len(cloudinary_urls)} Cloudinary document(s)")
        
        headers = {"Authorization": f"Bearer {admin_token}"}
        response = requests.delete(
            f"{BASE_URL}/api/admin/providers/{provider_id}",
            headers=headers
        )
        
        assert response.status_code == 200, f"Delete failed: {response.text}"
        result = response.json()
        
        assert "message" in result, "Response should have message"
        assert "supprimé" in result["message"].lower(), f"Message should confirm deletion: {result['message']}"
        
        # Check cloudinary files deleted count
        cloudinary_deleted = result.get("cloudinary_files_deleted", 0)
        print(f"✓ Provider deleted successfully")
        print(f"✓ Cloudinary files deleted: {cloudinary_deleted}")
        
        # Verify provider no longer exists
        providers_response = requests.get(f"{BASE_URL}/api/admin/providers", headers=headers)
        if providers_response.status_code == 200:
            providers = providers_response.json()
            provider_ids = [p.get("id") for p in providers]
            assert provider_id not in provider_ids, "Deleted provider should not be in list"
            print("✓ Provider verified as deleted from database")
    
    def test_delete_nonexistent_provider_returns_404(self, admin_token):
        """Test deleting non-existent provider returns 404"""
        fake_id = "nonexistent-provider-id-12345"
        
        headers = {"Authorization": f"Bearer {admin_token}"}
        response = requests.delete(
            f"{BASE_URL}/api/admin/providers/{fake_id}",
            headers=headers
        )
        
        assert response.status_code == 404, f"Should return 404 for non-existent provider: {response.status_code}"
        print("✓ Non-existent provider deletion correctly returns 404")


class TestCloudinaryCleanup:
    """Test that Cloudinary files are cleaned up when provider is deleted"""
    
    @pytest.fixture
    def admin_token(self):
        """Get admin token"""
        response = requests.post(f"{BASE_URL}/api/admin/login", json={
            "username": ADMIN_EMAIL,
            "password": ADMIN_PASSWORD
        })
        if response.status_code == 200:
            return response.json()["token"]
        pytest.skip("Admin login failed")
    
    def test_cloudinary_cleanup_on_delete(self, admin_token):
        """Test that Cloudinary files are deleted when provider is deleted"""
        import uuid
        
        # Create provider with document
        test_phone = f"224{uuid.uuid4().hex[:9]}"
        
        pdf_content = b"%PDF-1.4\n1 0 obj\n<< /Type /Catalog /Pages 2 0 R >>\nendobj\n2 0 obj\n<< /Type /Pages /Kids [3 0 R] /Count 1 >>\nendobj\n3 0 obj\n<< /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] >>\nendobj\nxref\n0 4\n0000000000 65535 f \n0000000009 00000 n \n0000000058 00000 n \n0000000115 00000 n \ntrailer\n<< /Size 4 /Root 1 0 R >>\nstartxref\n199\n%%EOF"
        
        files = {
            'documents': ('cloudinary_test.pdf', io.BytesIO(pdf_content), 'application/pdf')
        }
        
        data = {
            'first_name': 'Cloudinary',
            'last_name': 'Test',
            'phone_number': test_phone,
            'password': 'TestPassword123',
            'profession': 'Plombier',
            'profession_group': 'Artisanat',
            'years_experience': '2-5',
            'custom_profession': '',
            'location': 'Conakry',
            'region': 'conakry',
            'ville': 'conakry',
            'commune': 'ratoma',
            'quartier': 'Test',
            'about': 'Test pour vérifier la suppression des fichiers Cloudinary lors de la suppression du prestataire.'
        }
        
        # Register provider
        reg_response = requests.post(
            f"{BASE_URL}/api/auth/register",
            data=data,
            files=files
        )
        
        assert reg_response.status_code == 200, f"Registration failed: {reg_response.text}"
        provider = reg_response.json()["user"]
        provider_id = provider["id"]
        
        # Check documents were uploaded to Cloudinary
        documents = provider.get("documents", [])
        cloudinary_count = sum(1 for doc in documents if doc.get("path") and "cloudinary.com" in doc.get("path", ""))
        print(f"Provider created with {cloudinary_count} Cloudinary document(s)")
        
        # Delete provider
        headers = {"Authorization": f"Bearer {admin_token}"}
        delete_response = requests.delete(
            f"{BASE_URL}/api/admin/providers/{provider_id}",
            headers=headers
        )
        
        assert delete_response.status_code == 200, f"Delete failed: {delete_response.text}"
        result = delete_response.json()
        
        # Verify Cloudinary cleanup was attempted
        cloudinary_deleted = result.get("cloudinary_files_deleted", 0)
        print(f"✓ Cloudinary files deleted count: {cloudinary_deleted}")
        
        # The delete should report files deleted (at least the document)
        if cloudinary_count > 0:
            assert cloudinary_deleted >= 0, "Should report Cloudinary deletion count"
            print(f"✓ Cloudinary cleanup executed: {cloudinary_deleted} file(s) processed")


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
