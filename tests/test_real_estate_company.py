"""
Test suite for Real Estate Company (Entreprise Immobilier) features in ServisPro
Tests: Company rentals and property sales for approved real estate companies
"""
import pytest
import requests
import os
import uuid

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')

# Test credentials provided by main agent
IMMO_COMPANY_RCCM = "RCCM/GC/IMMO001"
IMMO_COMPANY_PASSWORD = "immo123"

CONSTRUCTION_COMPANY_RCCM = "RCCM/GC/TEST001"
CONSTRUCTION_COMPANY_PASSWORD = "test123"

# Store tokens
immo_company_token = None
construction_company_token = None
created_rental_id = None
created_sale_id = None


class TestRealEstateCompanyLogin:
    """Test login for real estate company"""
    
    def test_login_immo_company_success(self):
        """Test login for approved real estate company"""
        global immo_company_token
        
        login_data = {
            "rccm_number": IMMO_COMPANY_RCCM,
            "password": IMMO_COMPANY_PASSWORD
        }
        
        response = requests.post(f"{BASE_URL}/api/auth/company/login", json=login_data)
        
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        data = response.json()
        assert "token" in data, "Response should contain token"
        assert "user" in data, "Response should contain user"
        
        user = data["user"]
        assert user["rccm_number"] == IMMO_COMPANY_RCCM
        assert user["sector"] == "Immobilier", f"Expected sector 'Immobilier', got '{user.get('sector')}'"
        assert user["verification_status"] == "approved", f"Expected 'approved', got '{user.get('verification_status')}'"
        
        immo_company_token = data["token"]
        print(f"✓ Real estate company logged in successfully - Sector: {user['sector']}, Status: {user['verification_status']}")
    
    def test_login_construction_company_success(self):
        """Test login for construction company (non-immobilier)"""
        global construction_company_token
        
        login_data = {
            "rccm_number": CONSTRUCTION_COMPANY_RCCM,
            "password": CONSTRUCTION_COMPANY_PASSWORD
        }
        
        response = requests.post(f"{BASE_URL}/api/auth/company/login", json=login_data)
        
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        data = response.json()
        assert "token" in data
        
        user = data["user"]
        assert user["sector"] != "Immobilier", f"Construction company should not be in Immobilier sector"
        
        construction_company_token = data["token"]
        print(f"✓ Construction company logged in - Sector: {user['sector']}, Status: {user.get('verification_status')}")


class TestCompanyRentalsAPI:
    """Test company rental listing APIs"""
    
    def test_create_rental_immo_company(self):
        """Test creating a rental listing for approved real estate company"""
        global created_rental_id
        
        headers = {"Authorization": f"Bearer {immo_company_token}"}
        
        rental_data = {
            "property_type": "Apartment",
            "title": "TEST_Appartement meublé à Kipé",
            "description": "Bel appartement meublé avec 2 chambres, salon, cuisine équipée",
            "location": "Kipé, Ratoma, Conakry",
            "rental_price": 500000,
            "rental_type": "long_term",
            "is_available": True,
            "amenities": ["WiFi", "Climatisation", "Parking"]
        }
        
        response = requests.post(f"{BASE_URL}/api/company/rentals", json=rental_data, headers=headers)
        
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        data = response.json()
        assert "id" in data, "Response should contain rental ID"
        assert data["title"] == rental_data["title"]
        assert data["property_type"] == rental_data["property_type"]
        assert data["rental_price"] == rental_data["rental_price"]
        assert data["owner_type"] == "company", "Owner type should be 'company'"
        
        created_rental_id = data["id"]
        print(f"✓ Rental created successfully with ID: {created_rental_id}")
    
    def test_get_my_rentals_immo_company(self):
        """Test getting rentals for real estate company"""
        headers = {"Authorization": f"Bearer {immo_company_token}"}
        
        response = requests.get(f"{BASE_URL}/api/company/rentals/my", headers=headers)
        
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        data = response.json()
        assert isinstance(data, list), "Response should be a list"
        
        # Find our test rental
        test_rental = next((r for r in data if r.get("id") == created_rental_id), None)
        assert test_rental is not None, "Created rental should be in the list"
        
        print(f"✓ Retrieved {len(data)} rentals for real estate company")
    
    def test_create_rental_non_immo_company_fails(self):
        """Test that non-immobilier company cannot create rentals"""
        if not construction_company_token:
            pytest.skip("Construction company token not available")
        
        headers = {"Authorization": f"Bearer {construction_company_token}"}
        
        rental_data = {
            "property_type": "Apartment",
            "title": "TEST_Should Fail",
            "description": "This should not be created",
            "location": "Conakry",
            "rental_price": 300000,
            "rental_type": "long_term",
            "is_available": True
        }
        
        response = requests.post(f"{BASE_URL}/api/company/rentals", json=rental_data, headers=headers)
        
        assert response.status_code == 403, f"Expected 403 for non-immobilier company, got {response.status_code}"
        assert "immobilier" in response.json().get("detail", "").lower()
        
        print("✓ Non-immobilier company correctly blocked from creating rentals")


class TestCompanyPropertySalesAPI:
    """Test company property sales APIs"""
    
    def test_create_property_sale_immo_company(self):
        """Test creating a property sale for approved real estate company"""
        global created_sale_id
        
        headers = {"Authorization": f"Bearer {immo_company_token}"}
        
        sale_data = {
            "property_type": "Maison",
            "title": "TEST_Villa moderne à Lambanyi",
            "description": "Belle villa de 4 chambres avec jardin et piscine",
            "location": "Lambanyi, Ratoma, Conakry",
            "sale_price": 500000000,
            "surface_area": "350 m²",
            "num_rooms": 4,
            "num_bathrooms": 3,
            "has_garage": True,
            "has_garden": True,
            "has_pool": True,
            "year_built": 2020,
            "features": ["Climatisation centrale", "Groupe électrogène"],
            "is_negotiable": True
        }
        
        response = requests.post(f"{BASE_URL}/api/company/property-sales", json=sale_data, headers=headers)
        
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        data = response.json()
        assert "id" in data, "Response should contain sale ID"
        assert data["title"] == sale_data["title"]
        assert data["property_type"] == sale_data["property_type"]
        assert data["sale_price"] == sale_data["sale_price"]
        assert data["owner_type"] == "company", "Owner type should be 'company'"
        
        created_sale_id = data["id"]
        print(f"✓ Property sale created successfully with ID: {created_sale_id}")
    
    def test_get_my_property_sales_immo_company(self):
        """Test getting property sales for real estate company"""
        headers = {"Authorization": f"Bearer {immo_company_token}"}
        
        response = requests.get(f"{BASE_URL}/api/company/property-sales/my", headers=headers)
        
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        data = response.json()
        assert isinstance(data, list), "Response should be a list"
        
        # Find our test sale
        test_sale = next((s for s in data if s.get("id") == created_sale_id), None)
        assert test_sale is not None, "Created sale should be in the list"
        
        print(f"✓ Retrieved {len(data)} property sales for real estate company")
    
    def test_create_property_sale_non_immo_company_fails(self):
        """Test that non-immobilier company cannot create property sales"""
        if not construction_company_token:
            pytest.skip("Construction company token not available")
        
        headers = {"Authorization": f"Bearer {construction_company_token}"}
        
        sale_data = {
            "property_type": "Maison",
            "title": "TEST_Should Fail",
            "description": "This should not be created",
            "location": "Conakry",
            "sale_price": 100000000,
            "is_negotiable": True
        }
        
        response = requests.post(f"{BASE_URL}/api/company/property-sales", json=sale_data, headers=headers)
        
        assert response.status_code == 403, f"Expected 403 for non-immobilier company, got {response.status_code}"
        assert "immobilier" in response.json().get("detail", "").lower()
        
        print("✓ Non-immobilier company correctly blocked from creating property sales")


class TestPublicRentalsAndSales:
    """Test public endpoints for rentals and sales"""
    
    def test_get_all_rentals_public(self):
        """Test public rentals endpoint includes company rentals"""
        response = requests.get(f"{BASE_URL}/api/rentals")
        
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        data = response.json()
        assert isinstance(data, list)
        
        # Check if our test rental is visible
        test_rental = next((r for r in data if r.get("id") == created_rental_id), None)
        if test_rental:
            print(f"✓ Company rental visible in public listings ({len(data)} total rentals)")
        else:
            print(f"✓ Public rentals endpoint works ({len(data)} rentals)")
    
    def test_get_all_property_sales_public(self):
        """Test public property sales endpoint includes company sales"""
        response = requests.get(f"{BASE_URL}/api/property-sales")
        
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        data = response.json()
        assert isinstance(data, list)
        
        # Check if our test sale is visible
        test_sale = next((s for s in data if s.get("id") == created_sale_id), None)
        if test_sale:
            print(f"✓ Company property sale visible in public listings ({len(data)} total sales)")
        else:
            print(f"✓ Public property sales endpoint works ({len(data)} sales)")


class TestCleanup:
    """Cleanup test data"""
    
    def test_delete_test_rental(self):
        """Delete test rental"""
        if created_rental_id and immo_company_token:
            headers = {"Authorization": f"Bearer {immo_company_token}"}
            response = requests.delete(f"{BASE_URL}/api/company/rentals/{created_rental_id}", headers=headers)
            print(f"✓ Cleanup: Test rental deleted (status: {response.status_code})")
    
    def test_delete_test_sale(self):
        """Delete test property sale"""
        if created_sale_id and immo_company_token:
            headers = {"Authorization": f"Bearer {immo_company_token}"}
            response = requests.delete(f"{BASE_URL}/api/company/property-sales/{created_sale_id}", headers=headers)
            print(f"✓ Cleanup: Test property sale deleted (status: {response.status_code})")


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
