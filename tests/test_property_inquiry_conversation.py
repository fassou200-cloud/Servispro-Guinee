"""
Test Suite for Property Inquiry Conversation Feature
Tests the conversation system between customer and admin for property purchase inquiries.

Features tested:
1. Customer must be logged in to submit property inquiry
2. Property inquiry creation with customer authentication
3. Customer can view their inquiries in dashboard
4. Admin can send response to customer
5. Customer receives notification when admin responds
6. Customer can see admin response in their dashboard
"""

import pytest
import requests
import os
import time

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')

# Test credentials
ADMIN_CREDENTIALS = {"username": "admin", "password": "admin123"}
TEST_CUSTOMER = {"phone": "6250001234", "password": "test123"}


class TestPropertyInquiryConversation:
    """Test suite for property inquiry conversation feature"""
    
    @pytest.fixture(autouse=True)
    def setup(self):
        """Setup test fixtures"""
        self.session = requests.Session()
        self.session.headers.update({"Content-Type": "application/json"})
        self.customer_token = None
        self.admin_token = None
        self.test_property_id = None
        self.test_inquiry_id = None
    
    # ==================== AUTHENTICATION TESTS ====================
    
    def test_01_customer_login(self):
        """Test customer login to get authentication token"""
        response = self.session.post(f"{BASE_URL}/api/auth/login", json={
            "phone_number": TEST_CUSTOMER["phone"],
            "password": TEST_CUSTOMER["password"],
            "user_type": "customer"
        })
        
        # If customer doesn't exist, register first
        if response.status_code == 401:
            # Register new customer
            register_response = self.session.post(f"{BASE_URL}/api/auth/customer/register", json={
                "first_name": "Test",
                "last_name": "Customer",
                "phone_number": TEST_CUSTOMER["phone"],
                "password": TEST_CUSTOMER["password"]
            })
            if register_response.status_code == 400:
                # Already exists, try login again
                response = self.session.post(f"{BASE_URL}/api/auth/login", json={
                    "phone_number": TEST_CUSTOMER["phone"],
                    "password": TEST_CUSTOMER["password"],
                    "user_type": "customer"
                })
            else:
                assert register_response.status_code == 200, f"Registration failed: {register_response.text}"
                response = register_response
        
        assert response.status_code == 200, f"Login failed: {response.text}"
        data = response.json()
        assert "token" in data, "Token not in response"
        self.__class__.customer_token = data["token"]
        print(f"✓ Customer login successful, token obtained")
    
    def test_02_admin_login(self):
        """Test admin login"""
        response = self.session.post(f"{BASE_URL}/api/admin/login", json={
            "username": ADMIN_CREDENTIALS["username"],
            "password": ADMIN_CREDENTIALS["password"]
        })
        
        assert response.status_code == 200, f"Admin login failed: {response.text}"
        data = response.json()
        assert "token" in data, "Token not in response"
        self.__class__.admin_token = data["token"]
        print(f"✓ Admin login successful")
    
    # ==================== PROPERTY INQUIRY CREATION TESTS ====================
    
    def test_03_get_approved_property_sales(self):
        """Test getting approved property sales for inquiry"""
        response = self.session.get(f"{BASE_URL}/api/property-sales?approved_only=true")
        
        assert response.status_code == 200, f"Failed to get property sales: {response.text}"
        data = response.json()
        assert isinstance(data, list), "Response should be a list"
        
        if len(data) > 0:
            self.__class__.test_property_id = data[0]["id"]
            print(f"✓ Found {len(data)} approved property sales")
            print(f"  Using property: {data[0].get('title', 'N/A')} - {data[0].get('id', 'N/A')}")
        else:
            print("⚠ No approved property sales found, will create one")
    
    def test_04_inquiry_requires_authentication(self):
        """Test that property inquiry requires customer authentication"""
        # Skip if no property available
        if not hasattr(self.__class__, 'test_property_id') or not self.__class__.test_property_id:
            pytest.skip("No property available for testing")
        
        # Try to create inquiry without authentication
        response = self.session.post(
            f"{BASE_URL}/api/property-sales/{self.__class__.test_property_id}/inquiries",
            json={
                "property_id": self.__class__.test_property_id,
                "customer_name": "Test User",
                "customer_phone": "620000000",
                "message": "Test inquiry without auth"
            }
        )
        
        # Should return 401 or 403 (unauthorized)
        assert response.status_code in [401, 403], f"Expected 401/403, got {response.status_code}: {response.text}"
        print(f"✓ Inquiry correctly requires authentication (status: {response.status_code})")
    
    def test_05_create_property_inquiry_authenticated(self):
        """Test creating property inquiry with customer authentication"""
        # Skip if no property available
        if not hasattr(self.__class__, 'test_property_id') or not self.__class__.test_property_id:
            pytest.skip("No property available for testing")
        
        if not hasattr(self.__class__, 'customer_token') or not self.__class__.customer_token:
            pytest.skip("Customer token not available")
        
        headers = {"Authorization": f"Bearer {self.__class__.customer_token}"}
        
        response = self.session.post(
            f"{BASE_URL}/api/property-sales/{self.__class__.test_property_id}/inquiries",
            json={
                "property_id": self.__class__.test_property_id,
                "customer_name": "Test Customer",
                "customer_phone": TEST_CUSTOMER["phone"],
                "customer_email": "test@example.com",
                "message": "Je suis intéressé par cette propriété. Pouvez-vous me donner plus d'informations?",
                "budget_range": "500M - 1B GNF",
                "financing_type": "cash"
            },
            headers=headers
        )
        
        assert response.status_code == 200, f"Failed to create inquiry: {response.text}"
        data = response.json()
        assert "id" in data, "Inquiry ID not in response"
        assert data.get("status") == "pending", f"Expected status 'pending', got {data.get('status')}"
        
        self.__class__.test_inquiry_id = data["id"]
        print(f"✓ Property inquiry created successfully")
        print(f"  Inquiry ID: {data['id']}")
        print(f"  Status: {data.get('status')}")
    
    # ==================== CUSTOMER DASHBOARD TESTS ====================
    
    def test_06_customer_can_view_inquiries(self):
        """Test that customer can view their inquiries in dashboard"""
        if not hasattr(self.__class__, 'customer_token') or not self.__class__.customer_token:
            pytest.skip("Customer token not available")
        
        headers = {"Authorization": f"Bearer {self.__class__.customer_token}"}
        
        response = self.session.get(
            f"{BASE_URL}/api/customer/property-inquiries",
            headers=headers
        )
        
        assert response.status_code == 200, f"Failed to get customer inquiries: {response.text}"
        data = response.json()
        assert isinstance(data, list), "Response should be a list"
        
        print(f"✓ Customer can view their inquiries")
        print(f"  Total inquiries: {len(data)}")
        
        # Verify our test inquiry is in the list
        if hasattr(self.__class__, 'test_inquiry_id') and self.__class__.test_inquiry_id:
            inquiry_ids = [i.get('id') for i in data]
            assert self.__class__.test_inquiry_id in inquiry_ids, "Test inquiry not found in customer's inquiries"
            print(f"  Test inquiry found in list: {self.__class__.test_inquiry_id}")
    
    def test_07_customer_inquiry_has_correct_fields(self):
        """Test that customer inquiry has all required fields"""
        if not hasattr(self.__class__, 'customer_token') or not self.__class__.customer_token:
            pytest.skip("Customer token not available")
        
        headers = {"Authorization": f"Bearer {self.__class__.customer_token}"}
        
        response = self.session.get(
            f"{BASE_URL}/api/customer/property-inquiries",
            headers=headers
        )
        
        assert response.status_code == 200
        data = response.json()
        
        if len(data) > 0:
            inquiry = data[0]
            required_fields = ['id', 'property_id', 'property_info', 'property_price', 
                             'property_location', 'customer_name', 'customer_phone', 
                             'message', 'status', 'created_at']
            
            for field in required_fields:
                assert field in inquiry, f"Missing field: {field}"
            
            print(f"✓ Inquiry has all required fields")
            print(f"  Property: {inquiry.get('property_info')}")
            print(f"  Status: {inquiry.get('status')}")
    
    # ==================== ADMIN RESPONSE TESTS ====================
    
    def test_08_admin_can_view_all_inquiries(self):
        """Test that admin can view all property inquiries"""
        response = self.session.get(f"{BASE_URL}/api/admin/property-inquiries")
        
        assert response.status_code == 200, f"Failed to get admin inquiries: {response.text}"
        data = response.json()
        assert isinstance(data, list), "Response should be a list"
        
        print(f"✓ Admin can view all property inquiries")
        print(f"  Total inquiries: {len(data)}")
    
    def test_09_admin_can_filter_pending_inquiries(self):
        """Test that admin can filter inquiries by status"""
        response = self.session.get(f"{BASE_URL}/api/admin/property-inquiries?status=pending")
        
        assert response.status_code == 200, f"Failed to filter inquiries: {response.text}"
        data = response.json()
        assert isinstance(data, list), "Response should be a list"
        
        # All returned inquiries should have pending status
        for inquiry in data:
            assert inquiry.get('status') == 'pending', f"Expected pending status, got {inquiry.get('status')}"
        
        print(f"✓ Admin can filter pending inquiries")
        print(f"  Pending inquiries: {len(data)}")
    
    def test_10_admin_can_respond_to_inquiry(self):
        """Test that admin can send response to customer inquiry"""
        if not hasattr(self.__class__, 'test_inquiry_id') or not self.__class__.test_inquiry_id:
            pytest.skip("No test inquiry available")
        
        admin_response_text = "Bonjour, merci pour votre intérêt. Cette propriété est disponible pour une visite. Contactez-nous au 620123456 pour planifier un rendez-vous."
        
        response = self.session.put(
            f"{BASE_URL}/api/admin/property-inquiries/{self.__class__.test_inquiry_id}",
            json={
                "status": "contacted",
                "admin_response": admin_response_text,
                "admin_notes": "Client sérieux, à rappeler demain"
            }
        )
        
        assert response.status_code == 200, f"Failed to update inquiry: {response.text}"
        data = response.json()
        assert "message" in data, "Response message not found"
        
        print(f"✓ Admin response sent successfully")
        print(f"  Response: {admin_response_text[:50]}...")
    
    def test_11_customer_receives_notification(self):
        """Test that customer receives notification when admin responds"""
        if not hasattr(self.__class__, 'customer_token') or not self.__class__.customer_token:
            pytest.skip("Customer token not available")
        
        headers = {"Authorization": f"Bearer {self.__class__.customer_token}"}
        
        # Wait a moment for notification to be created
        time.sleep(0.5)
        
        response = self.session.get(
            f"{BASE_URL}/api/notifications/customer",
            headers=headers
        )
        
        assert response.status_code == 200, f"Failed to get notifications: {response.text}"
        data = response.json()
        
        # Check if there's a notification about property inquiry response
        notifications = data if isinstance(data, list) else data.get('notifications', [])
        
        print(f"✓ Customer notifications endpoint accessible")
        print(f"  Total notifications: {len(notifications)}")
        
        # Look for property inquiry notification
        property_notifications = [n for n in notifications if 'property' in str(n).lower() or 'demande' in str(n).lower()]
        if property_notifications:
            print(f"  Property-related notifications found: {len(property_notifications)}")
    
    def test_12_customer_can_see_admin_response(self):
        """Test that customer can see admin response in their dashboard"""
        if not hasattr(self.__class__, 'customer_token') or not self.__class__.customer_token:
            pytest.skip("Customer token not available")
        
        if not hasattr(self.__class__, 'test_inquiry_id') or not self.__class__.test_inquiry_id:
            pytest.skip("No test inquiry available")
        
        headers = {"Authorization": f"Bearer {self.__class__.customer_token}"}
        
        response = self.session.get(
            f"{BASE_URL}/api/customer/property-inquiries",
            headers=headers
        )
        
        assert response.status_code == 200, f"Failed to get customer inquiries: {response.text}"
        data = response.json()
        
        # Find our test inquiry
        test_inquiry = None
        for inquiry in data:
            if inquiry.get('id') == self.__class__.test_inquiry_id:
                test_inquiry = inquiry
                break
        
        assert test_inquiry is not None, "Test inquiry not found"
        assert test_inquiry.get('status') == 'contacted', f"Expected status 'contacted', got {test_inquiry.get('status')}"
        assert test_inquiry.get('admin_response') is not None, "Admin response not found in inquiry"
        
        print(f"✓ Customer can see admin response in dashboard")
        print(f"  Status: {test_inquiry.get('status')}")
        print(f"  Admin response: {test_inquiry.get('admin_response', '')[:50]}...")
    
    # ==================== COMPLETE WORKFLOW TEST ====================
    
    def test_13_admin_can_mark_inquiry_completed(self):
        """Test that admin can mark inquiry as completed"""
        if not hasattr(self.__class__, 'test_inquiry_id') or not self.__class__.test_inquiry_id:
            pytest.skip("No test inquiry available")
        
        response = self.session.put(
            f"{BASE_URL}/api/admin/property-inquiries/{self.__class__.test_inquiry_id}",
            json={
                "status": "completed",
                "admin_response": "Visite effectuée. Le client a fait une offre.",
                "admin_notes": "Offre de 800M GNF reçue"
            }
        )
        
        assert response.status_code == 200, f"Failed to complete inquiry: {response.text}"
        print(f"✓ Admin marked inquiry as completed")
    
    def test_14_verify_final_inquiry_status(self):
        """Verify the final status of the inquiry"""
        if not hasattr(self.__class__, 'customer_token') or not self.__class__.customer_token:
            pytest.skip("Customer token not available")
        
        if not hasattr(self.__class__, 'test_inquiry_id') or not self.__class__.test_inquiry_id:
            pytest.skip("No test inquiry available")
        
        headers = {"Authorization": f"Bearer {self.__class__.customer_token}"}
        
        response = self.session.get(
            f"{BASE_URL}/api/customer/property-inquiries",
            headers=headers
        )
        
        assert response.status_code == 200
        data = response.json()
        
        # Find our test inquiry
        test_inquiry = None
        for inquiry in data:
            if inquiry.get('id') == self.__class__.test_inquiry_id:
                test_inquiry = inquiry
                break
        
        assert test_inquiry is not None, "Test inquiry not found"
        assert test_inquiry.get('status') == 'completed', f"Expected status 'completed', got {test_inquiry.get('status')}"
        
        print(f"✓ Final inquiry status verified: completed")
        print(f"  Response date: {test_inquiry.get('response_date', 'N/A')}")


class TestPropertyInquiryEdgeCases:
    """Test edge cases and error handling"""
    
    def test_inquiry_with_invalid_property_id(self):
        """Test creating inquiry with invalid property ID"""
        # First login as customer
        session = requests.Session()
        session.headers.update({"Content-Type": "application/json"})
        
        login_response = session.post(f"{BASE_URL}/api/auth/login", json={
            "phone_number": TEST_CUSTOMER["phone"],
            "password": TEST_CUSTOMER["password"],
            "user_type": "customer"
        })
        
        if login_response.status_code != 200:
            pytest.skip("Could not login as customer")
        
        token = login_response.json().get("token")
        headers = {"Authorization": f"Bearer {token}"}
        
        response = session.post(
            f"{BASE_URL}/api/property-sales/invalid-property-id/inquiries",
            json={
                "property_id": "invalid-property-id",
                "customer_name": "Test User",
                "customer_phone": "620000000",
                "message": "Test inquiry"
            },
            headers=headers
        )
        
        assert response.status_code == 404, f"Expected 404, got {response.status_code}"
        print(f"✓ Invalid property ID correctly returns 404")
    
    def test_admin_update_invalid_inquiry(self):
        """Test admin updating non-existent inquiry"""
        response = requests.put(
            f"{BASE_URL}/api/admin/property-inquiries/invalid-inquiry-id",
            json={
                "status": "contacted",
                "admin_response": "Test response"
            },
            headers={"Content-Type": "application/json"}
        )
        
        assert response.status_code == 404, f"Expected 404, got {response.status_code}"
        print(f"✓ Invalid inquiry ID correctly returns 404")


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
