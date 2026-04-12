"""
Backend API Tests for ServisPro Refactored Backend
Tests all major API endpoints after the server.py split into modular files
"""
import pytest
import requests
import os

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')

class TestPublicEndpoints:
    """Test public API endpoints that don't require authentication"""
    
    def test_get_providers(self):
        """GET /api/providers - returns list of providers"""
        response = requests.get(f"{BASE_URL}/api/providers")
        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, list)
        print(f"✓ GET /api/providers - returned {len(data)} providers")
    
    def test_get_rentals(self):
        """GET /api/rentals - returns rental listings"""
        response = requests.get(f"{BASE_URL}/api/rentals")
        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, list)
        print(f"✓ GET /api/rentals - returned {len(data)} rentals")
    
    def test_get_marketplace_products(self):
        """GET /api/marketplace/products - returns marketplace products"""
        response = requests.get(f"{BASE_URL}/api/marketplace/products")
        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, list)
        print(f"✓ GET /api/marketplace/products - returned {len(data)} products")
    
    def test_get_companies(self):
        """GET /api/companies - returns approved companies"""
        response = requests.get(f"{BASE_URL}/api/companies")
        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, list)
        print(f"✓ GET /api/companies - returned {len(data)} companies")
    
    def test_get_service_fees(self):
        """GET /api/service-fees - returns service fees"""
        response = requests.get(f"{BASE_URL}/api/service-fees")
        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, list)
        assert len(data) > 0
        # Verify structure
        first_fee = data[0]
        assert 'profession' in first_fee
        print(f"✓ GET /api/service-fees - returned {len(data)} fee configurations")


class TestAdminAuthentication:
    """Test admin login and authenticated endpoints"""
    
    @pytest.fixture
    def admin_token(self):
        """Get admin authentication token"""
        response = requests.post(
            f"{BASE_URL}/api/admin/login",
            json={
                "username": "servispro@servisprogn.com",
                "password": "Servisproguinea2026#"
            }
        )
        assert response.status_code == 200
        data = response.json()
        assert "token" in data
        assert "user" in data
        return data["token"]
    
    def test_admin_login_success(self):
        """POST /api/admin/login - successful login"""
        response = requests.post(
            f"{BASE_URL}/api/admin/login",
            json={
                "username": "servispro@servisprogn.com",
                "password": "Servisproguinea2026#"
            }
        )
        assert response.status_code == 200
        data = response.json()
        assert "token" in data
        assert "user" in data
        assert data["user"]["username"] == "servispro@servisprogn.com"
        assert data["user"]["role"] == "super-admin"
        print("✓ POST /api/admin/login - admin login successful")
    
    def test_admin_login_invalid_credentials(self):
        """POST /api/admin/login - invalid credentials returns 401"""
        response = requests.post(
            f"{BASE_URL}/api/admin/login",
            json={
                "username": "wrong@email.com",
                "password": "wrongpassword"
            }
        )
        assert response.status_code == 401
        print("✓ POST /api/admin/login - invalid credentials returns 401")
    
    def test_admin_stats(self, admin_token):
        """GET /api/admin/stats - returns dashboard statistics"""
        response = requests.get(
            f"{BASE_URL}/api/admin/stats",
            headers={"Authorization": f"Bearer {admin_token}"}
        )
        assert response.status_code == 200
        data = response.json()
        # Verify expected fields
        assert "total_providers" in data
        assert "total_customers" in data
        assert "total_rentals" in data
        assert "total_companies" in data
        assert "pending_providers" in data
        assert "approved_providers" in data
        print(f"✓ GET /api/admin/stats - providers: {data['total_providers']}, customers: {data['total_customers']}")
    
    def test_admin_settings(self, admin_token):
        """GET /api/admin/settings - returns platform settings"""
        response = requests.get(
            f"{BASE_URL}/api/admin/settings",
            headers={"Authorization": f"Bearer {admin_token}"}
        )
        assert response.status_code == 200
        data = response.json()
        # Verify expected fields
        assert "commission_prestation" in data
        assert "commission_location_courte" in data
        assert "devise" in data
        print(f"✓ GET /api/admin/settings - commission: {data['commission_prestation']}%")
    
    def test_admin_all_products(self, admin_token):
        """GET /api/admin/all-products - returns all marketplace products"""
        response = requests.get(
            f"{BASE_URL}/api/admin/all-products",
            headers={"Authorization": f"Bearer {admin_token}"}
        )
        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, list)
        print(f"✓ GET /api/admin/all-products - returned {len(data)} products")
    
    def test_admin_providers(self, admin_token):
        """GET /api/admin/providers - returns all providers for admin"""
        response = requests.get(
            f"{BASE_URL}/api/admin/providers",
            headers={"Authorization": f"Bearer {admin_token}"}
        )
        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, list)
        print(f"✓ GET /api/admin/providers - returned {len(data)} providers")
    
    def test_admin_companies(self, admin_token):
        """GET /api/admin/companies - returns all companies for admin"""
        response = requests.get(
            f"{BASE_URL}/api/admin/companies",
            headers={"Authorization": f"Bearer {admin_token}"}
        )
        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, list)
        print(f"✓ GET /api/admin/companies - returned {len(data)} companies")
    
    def test_admin_rentals(self, admin_token):
        """GET /api/admin/rentals - returns all rentals for admin"""
        response = requests.get(
            f"{BASE_URL}/api/admin/rentals",
            headers={"Authorization": f"Bearer {admin_token}"}
        )
        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, list)
        print(f"✓ GET /api/admin/rentals - returned {len(data)} rentals")
    
    def test_admin_customers(self, admin_token):
        """GET /api/admin/customers - returns all customers for admin"""
        response = requests.get(
            f"{BASE_URL}/api/admin/customers",
            headers={"Authorization": f"Bearer {admin_token}"}
        )
        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, list)
        print(f"✓ GET /api/admin/customers - returned {len(data)} customers")
    
    def test_admin_jobs(self, admin_token):
        """GET /api/admin/jobs - returns all jobs for admin"""
        response = requests.get(
            f"{BASE_URL}/api/admin/jobs",
            headers={"Authorization": f"Bearer {admin_token}"}
        )
        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, list)
        print(f"✓ GET /api/admin/jobs - returned {len(data)} jobs")
    
    def test_admin_service_fees(self, admin_token):
        """GET /api/admin/service-fees - returns service fees for admin"""
        response = requests.get(
            f"{BASE_URL}/api/admin/service-fees",
            headers={"Authorization": f"Bearer {admin_token}"}
        )
        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, list)
        print(f"✓ GET /api/admin/service-fees - returned {len(data)} fee configurations")
    
    def test_admin_feedbacks(self, admin_token):
        """GET /api/admin/feedbacks - returns all feedbacks"""
        response = requests.get(
            f"{BASE_URL}/api/admin/feedbacks",
            headers={"Authorization": f"Bearer {admin_token}"}
        )
        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, list)
        print(f"✓ GET /api/admin/feedbacks - returned {len(data)} feedbacks")


class TestMarketplaceEndpoints:
    """Test marketplace-related endpoints"""
    
    def test_get_marketplace_shops(self):
        """GET /api/marketplace/shops - returns active shops"""
        response = requests.get(f"{BASE_URL}/api/marketplace/shops")
        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, list)
        print(f"✓ GET /api/marketplace/shops - returned {len(data)} shops")
    
    def test_get_product_categories(self):
        """GET /api/product-categories - returns product categories"""
        response = requests.get(f"{BASE_URL}/api/product-categories")
        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, list)
        print(f"✓ GET /api/product-categories - returned {len(data)} categories")


class TestJobOffersEndpoints:
    """Test job offers endpoints"""
    
    def test_get_job_offers(self):
        """GET /api/job-offers - returns active job offers"""
        response = requests.get(f"{BASE_URL}/api/job-offers")
        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, list)
        print(f"✓ GET /api/job-offers - returned {len(data)} job offers")


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
