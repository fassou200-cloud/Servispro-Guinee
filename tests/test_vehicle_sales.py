"""
Test suite for Vehicle Sales Feature
Tests the complete flow: creation -> approval -> sold
Endpoints tested:
- POST /api/vehicle-sales - Create vehicle sale (provider)
- GET /api/vehicle-sales/my-sales - Get provider's sales
- GET /api/admin/vehicle-sales - Admin list all sales
- PUT /api/admin/vehicle-sales/{id}/approve - Admin approve
- PUT /api/admin/vehicle-sales/{id}/reject - Admin reject
- PUT /api/admin/vehicle-sales/{id}/sold - Admin mark sold
"""

import pytest
import requests
import os
import uuid

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', 'https://servispro-portal.preview.emergentagent.com').rstrip('/')

# Test data
TEST_VEHICLE_PROVIDER = {
    "first_name": "TestVehicle",
    "last_name": "Provider",
    "phone_number": f"622{uuid.uuid4().hex[:7]}",  # Unique phone
    "password": "test123",
    "profession": "Voiture"  # Vehicle provider
}

TEST_VEHICLE_SALE = {
    "vehicle_type": "Voiture",
    "brand": "Toyota",
    "model": "Hilux",
    "year": 2020,
    "mileage": 50000,
    "fuel_type": "Diesel",
    "transmission": "Manuelle",
    "price": 150000000,
    "description": "Test vehicle sale - excellent condition",
    "location": "Conakry, Kaloum",
    "condition": "used",
    "photos": []
}

class TestVehicleSalesBackend:
    """Backend API tests for Vehicle Sales feature"""
    
    provider_token = None
    provider_id = None
    sale_id = None
    
    @pytest.fixture(autouse=True)
    def setup(self):
        """Setup test fixtures"""
        self.session = requests.Session()
        self.session.headers.update({"Content-Type": "application/json"})
    
    def test_01_register_vehicle_provider(self):
        """Register a new vehicle provider (Voiture profession)"""
        response = self.session.post(
            f"{BASE_URL}/api/auth/register",
            json=TEST_VEHICLE_PROVIDER
        )
        
        # May fail if phone already exists, try login instead
        if response.status_code == 400:
            # Try login
            login_response = self.session.post(
                f"{BASE_URL}/api/auth/login",
                json={
                    "phone_number": TEST_VEHICLE_PROVIDER["phone_number"],
                    "password": TEST_VEHICLE_PROVIDER["password"],
                    "user_type": "provider"
                }
            )
            if login_response.status_code == 200:
                data = login_response.json()
                TestVehicleSalesBackend.provider_token = data.get("token")
                TestVehicleSalesBackend.provider_id = data.get("user", {}).get("id")
                print(f"✓ Logged in existing provider: {TestVehicleSalesBackend.provider_id}")
                return
        
        assert response.status_code == 200, f"Registration failed: {response.text}"
        data = response.json()
        
        assert "token" in data
        assert "user" in data
        assert data["user"]["profession"] == "Voiture"
        
        TestVehicleSalesBackend.provider_token = data["token"]
        TestVehicleSalesBackend.provider_id = data["user"]["id"]
        print(f"✓ Registered vehicle provider: {TestVehicleSalesBackend.provider_id}")
    
    def test_02_create_vehicle_sale(self):
        """Create a new vehicle sale listing"""
        assert TestVehicleSalesBackend.provider_token, "Provider token required"
        
        response = self.session.post(
            f"{BASE_URL}/api/vehicle-sales",
            json=TEST_VEHICLE_SALE,
            headers={"Authorization": f"Bearer {TestVehicleSalesBackend.provider_token}"}
        )
        
        assert response.status_code == 200, f"Create sale failed: {response.text}"
        data = response.json()
        
        assert "id" in data
        assert data.get("status") == "pending"
        
        TestVehicleSalesBackend.sale_id = data["id"]
        print(f"✓ Created vehicle sale: {TestVehicleSalesBackend.sale_id}")
    
    def test_03_get_my_sales(self):
        """Get provider's own vehicle sales"""
        assert TestVehicleSalesBackend.provider_token, "Provider token required"
        
        response = self.session.get(
            f"{BASE_URL}/api/vehicle-sales/my-sales",
            headers={"Authorization": f"Bearer {TestVehicleSalesBackend.provider_token}"}
        )
        
        assert response.status_code == 200, f"Get my sales failed: {response.text}"
        data = response.json()
        
        assert isinstance(data, list)
        # Should have at least the sale we just created
        assert len(data) >= 1
        
        # Find our sale
        our_sale = next((s for s in data if s.get("id") == TestVehicleSalesBackend.sale_id), None)
        assert our_sale is not None, "Created sale not found in my-sales"
        assert our_sale.get("status") == "pending"
        assert our_sale.get("brand") == TEST_VEHICLE_SALE["brand"]
        
        print(f"✓ Found {len(data)} sales in my-sales, including our pending sale")
    
    def test_04_admin_get_all_sales(self):
        """Admin: Get all vehicle sales"""
        response = self.session.get(f"{BASE_URL}/api/admin/vehicle-sales")
        
        assert response.status_code == 200, f"Admin get sales failed: {response.text}"
        data = response.json()
        
        assert isinstance(data, list)
        
        # Find our pending sale
        our_sale = next((s for s in data if s.get("id") == TestVehicleSalesBackend.sale_id), None)
        assert our_sale is not None, "Created sale not found in admin list"
        assert our_sale.get("status") == "pending"
        
        print(f"✓ Admin sees {len(data)} total vehicle sales")
    
    def test_05_admin_approve_sale(self):
        """Admin: Approve a vehicle sale"""
        assert TestVehicleSalesBackend.sale_id, "Sale ID required"
        
        response = self.session.put(
            f"{BASE_URL}/api/admin/vehicle-sales/{TestVehicleSalesBackend.sale_id}/approve"
        )
        
        assert response.status_code == 200, f"Approve failed: {response.text}"
        data = response.json()
        
        assert "message" in data
        print(f"✓ Sale approved: {data.get('message')}")
    
    def test_06_verify_sale_approved(self):
        """Verify sale status is now approved"""
        response = self.session.get(
            f"{BASE_URL}/api/vehicle-sales/{TestVehicleSalesBackend.sale_id}"
        )
        
        assert response.status_code == 200, f"Get sale failed: {response.text}"
        data = response.json()
        
        assert data.get("status") == "approved"
        print(f"✓ Sale status verified as 'approved'")
    
    def test_07_approved_sale_in_public_list(self):
        """Verify approved sale appears in public list"""
        response = self.session.get(f"{BASE_URL}/api/vehicle-sales")
        
        assert response.status_code == 200, f"Get public sales failed: {response.text}"
        data = response.json()
        
        assert isinstance(data, list)
        
        # All sales should be approved
        for sale in data:
            assert sale.get("status") == "approved", f"Non-approved sale in public list: {sale.get('id')}"
        
        # Our sale should be in the list
        our_sale = next((s for s in data if s.get("id") == TestVehicleSalesBackend.sale_id), None)
        assert our_sale is not None, "Approved sale not in public list"
        
        print(f"✓ Public list shows {len(data)} approved sales, including ours")
    
    def test_08_admin_mark_sold(self):
        """Admin: Mark vehicle as sold"""
        assert TestVehicleSalesBackend.sale_id, "Sale ID required"
        
        response = self.session.put(
            f"{BASE_URL}/api/admin/vehicle-sales/{TestVehicleSalesBackend.sale_id}/sold"
        )
        
        assert response.status_code == 200, f"Mark sold failed: {response.text}"
        data = response.json()
        
        assert "message" in data
        print(f"✓ Sale marked as sold: {data.get('message')}")
    
    def test_09_verify_sale_sold(self):
        """Verify sale status is now sold"""
        response = self.session.get(
            f"{BASE_URL}/api/vehicle-sales/{TestVehicleSalesBackend.sale_id}"
        )
        
        assert response.status_code == 200, f"Get sale failed: {response.text}"
        data = response.json()
        
        assert data.get("status") == "sold"
        assert "sold_at" in data
        print(f"✓ Sale status verified as 'sold'")
    
    def test_10_sold_not_in_public_list(self):
        """Verify sold sale no longer in public list (only approved shown)"""
        response = self.session.get(f"{BASE_URL}/api/vehicle-sales")
        
        assert response.status_code == 200, f"Get public sales failed: {response.text}"
        data = response.json()
        
        # Our sold sale should NOT be in the public list
        our_sale = next((s for s in data if s.get("id") == TestVehicleSalesBackend.sale_id), None)
        assert our_sale is None, "Sold sale should not appear in public list"
        
        print(f"✓ Sold sale correctly hidden from public list")


class TestVehicleSalesReject:
    """Test rejection flow"""
    
    provider_token = None
    sale_id = None
    
    @pytest.fixture(autouse=True)
    def setup(self):
        """Setup test fixtures"""
        self.session = requests.Session()
        self.session.headers.update({"Content-Type": "application/json"})
    
    def test_01_create_sale_for_rejection(self):
        """Create a sale to test rejection"""
        # Register/login provider
        test_provider = {
            "first_name": "RejectTest",
            "last_name": "Provider",
            "phone_number": f"623{uuid.uuid4().hex[:7]}",
            "password": "test123",
            "profession": "Camionneur"
        }
        
        response = self.session.post(
            f"{BASE_URL}/api/auth/register",
            json=test_provider
        )
        
        if response.status_code == 400:
            response = self.session.post(
                f"{BASE_URL}/api/auth/login",
                json={
                    "phone_number": test_provider["phone_number"],
                    "password": test_provider["password"],
                    "user_type": "provider"
                }
            )
        
        assert response.status_code == 200
        data = response.json()
        TestVehicleSalesReject.provider_token = data["token"]
        
        # Create sale
        sale_data = {
            "vehicle_type": "Camion",
            "brand": "Mercedes",
            "model": "Actros",
            "year": 2018,
            "mileage": 200000,
            "fuel_type": "Diesel",
            "transmission": "Manuelle",
            "price": 500000000,
            "description": "Test camion for rejection",
            "location": "Conakry",
            "condition": "used",
            "photos": []
        }
        
        response = self.session.post(
            f"{BASE_URL}/api/vehicle-sales",
            json=sale_data,
            headers={"Authorization": f"Bearer {TestVehicleSalesReject.provider_token}"}
        )
        
        assert response.status_code == 200
        TestVehicleSalesReject.sale_id = response.json()["id"]
        print(f"✓ Created sale for rejection test: {TestVehicleSalesReject.sale_id}")
    
    def test_02_admin_reject_sale(self):
        """Admin: Reject a vehicle sale"""
        assert TestVehicleSalesReject.sale_id, "Sale ID required"
        
        response = self.session.put(
            f"{BASE_URL}/api/admin/vehicle-sales/{TestVehicleSalesReject.sale_id}/reject"
        )
        
        assert response.status_code == 200, f"Reject failed: {response.text}"
        print(f"✓ Sale rejected successfully")
    
    def test_03_verify_sale_rejected(self):
        """Verify sale status is rejected"""
        response = self.session.get(
            f"{BASE_URL}/api/vehicle-sales/{TestVehicleSalesReject.sale_id}"
        )
        
        assert response.status_code == 200
        data = response.json()
        
        assert data.get("status") == "rejected"
        print(f"✓ Sale status verified as 'rejected'")
    
    def test_04_rejected_not_in_public_list(self):
        """Verify rejected sale not in public list"""
        response = self.session.get(f"{BASE_URL}/api/vehicle-sales")
        
        assert response.status_code == 200
        data = response.json()
        
        our_sale = next((s for s in data if s.get("id") == TestVehicleSalesReject.sale_id), None)
        assert our_sale is None, "Rejected sale should not appear in public list"
        
        print(f"✓ Rejected sale correctly hidden from public list")


class TestExistingSale:
    """Test with the existing sale ID provided"""
    
    @pytest.fixture(autouse=True)
    def setup(self):
        """Setup test fixtures"""
        self.session = requests.Session()
        self.session.headers.update({"Content-Type": "application/json"})
        self.existing_sale_id = "8162bed3-c007-4259-94bc-977770361186"
    
    def test_01_get_existing_sale(self):
        """Get the existing sale by ID"""
        response = self.session.get(
            f"{BASE_URL}/api/vehicle-sales/{self.existing_sale_id}"
        )
        
        if response.status_code == 404:
            pytest.skip("Existing sale not found - may have been deleted")
        
        assert response.status_code == 200, f"Get sale failed: {response.text}"
        data = response.json()
        
        print(f"✓ Existing sale found:")
        print(f"  - Brand: {data.get('brand')}")
        print(f"  - Model: {data.get('model')}")
        print(f"  - Status: {data.get('status')}")
        print(f"  - Price: {data.get('price'):,.0f} GNF")
    
    def test_02_existing_sale_in_admin_list(self):
        """Verify existing sale appears in admin list"""
        response = self.session.get(f"{BASE_URL}/api/admin/vehicle-sales")
        
        assert response.status_code == 200
        data = response.json()
        
        our_sale = next((s for s in data if s.get("id") == self.existing_sale_id), None)
        
        if our_sale:
            print(f"✓ Existing sale found in admin list with status: {our_sale.get('status')}")
        else:
            print("⚠ Existing sale not found in admin list")


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
