"""
Test Suite for ServisPro - Forgot Password Feature and Category Removal
Tests:
1. Forgot password flow for providers (POST /api/auth/forgot-password)
2. Forgot password flow for customers (POST /api/auth/forgot-password)
3. Reset password endpoint (POST /api/auth/reset-password)
4. Verify removed categories don't appear in API responses
"""

import pytest
import requests
import os
import uuid

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', 'https://service-marketplace-49.preview.emergentagent.com')

# Test data
TEST_PROVIDER_PHONE = f"622{uuid.uuid4().hex[:7]}"
TEST_CUSTOMER_PHONE = f"623{uuid.uuid4().hex[:7]}"
TEST_PASSWORD = "test123456"

# Categories that should be REMOVED
REMOVED_CATEGORIES = ['Logisticien', 'Camionneur', 'Tracteur', 'Voiture']

# Categories that should REMAIN
VALID_CATEGORIES = [
    'Electromecanicien', 'Mecanicien', 'Plombier', 'Macon', 
    'Menuisier', 'AgentImmobilier', 'Soudeur', 'Autres'
]


class TestForgotPasswordAPI:
    """Test forgot password and reset password endpoints"""
    
    def test_forgot_password_provider_nonexistent_phone(self):
        """Test forgot password with non-existent provider phone"""
        response = requests.post(f"{BASE_URL}/api/auth/forgot-password", json={
            "phone_number": "999999999999",
            "user_type": "provider"
        })
        # Should return 404 for non-existent phone
        assert response.status_code == 404, f"Expected 404, got {response.status_code}: {response.text}"
        data = response.json()
        assert "detail" in data
        print(f"✓ Forgot password returns 404 for non-existent provider phone")
    
    def test_forgot_password_customer_nonexistent_phone(self):
        """Test forgot password with non-existent customer phone"""
        response = requests.post(f"{BASE_URL}/api/auth/forgot-password", json={
            "phone_number": "888888888888",
            "user_type": "customer"
        })
        # Should return 404 for non-existent phone
        assert response.status_code == 404, f"Expected 404, got {response.status_code}: {response.text}"
        data = response.json()
        assert "detail" in data
        print(f"✓ Forgot password returns 404 for non-existent customer phone")
    
    def test_reset_password_without_otp_request(self):
        """Test reset password without prior OTP request"""
        response = requests.post(f"{BASE_URL}/api/auth/reset-password", json={
            "phone_number": "777777777777",
            "user_type": "provider",
            "otp": "123456",
            "new_password": "newpassword123"
        })
        # Should return 400 for no pending reset request
        assert response.status_code == 400, f"Expected 400, got {response.status_code}: {response.text}"
        data = response.json()
        assert "detail" in data
        print(f"✓ Reset password returns 400 when no OTP request exists")
    
    def test_forgot_password_invalid_user_type(self):
        """Test forgot password with invalid user type"""
        response = requests.post(f"{BASE_URL}/api/auth/forgot-password", json={
            "phone_number": "666666666666",
            "user_type": "invalid_type"
        })
        # Should return 404 (no user found with this type)
        assert response.status_code == 404, f"Expected 404, got {response.status_code}: {response.text}"
        print(f"✓ Forgot password handles invalid user type correctly")


class TestForgotPasswordE2EFlow:
    """End-to-end test for forgot password flow"""
    
    @pytest.fixture(scope="class")
    def test_provider(self):
        """Create a test provider for forgot password testing"""
        phone = f"624{uuid.uuid4().hex[:7]}"
        response = requests.post(f"{BASE_URL}/api/auth/register", json={
            "first_name": "TEST_ForgotPwd",
            "last_name": "Provider",
            "phone_number": phone,
            "password": TEST_PASSWORD,
            "profession": "Plombier"
        })
        if response.status_code == 200:
            return {"phone": phone, "password": TEST_PASSWORD}
        elif response.status_code == 400 and "already registered" in response.text:
            # Phone already exists, try another
            phone = f"625{uuid.uuid4().hex[:7]}"
            response = requests.post(f"{BASE_URL}/api/auth/register", json={
                "first_name": "TEST_ForgotPwd",
                "last_name": "Provider",
                "phone_number": phone,
                "password": TEST_PASSWORD,
                "profession": "Plombier"
            })
            if response.status_code == 200:
                return {"phone": phone, "password": TEST_PASSWORD}
        pytest.skip(f"Could not create test provider: {response.text}")
    
    @pytest.fixture(scope="class")
    def test_customer(self):
        """Create a test customer for forgot password testing"""
        phone = f"626{uuid.uuid4().hex[:7]}"
        response = requests.post(f"{BASE_URL}/api/auth/customer/register", json={
            "first_name": "TEST_ForgotPwd",
            "last_name": "Customer",
            "phone_number": phone,
            "password": TEST_PASSWORD
        })
        if response.status_code == 200:
            return {"phone": phone, "password": TEST_PASSWORD}
        elif response.status_code == 400 and "already registered" in response.text:
            phone = f"627{uuid.uuid4().hex[:7]}"
            response = requests.post(f"{BASE_URL}/api/auth/customer/register", json={
                "first_name": "TEST_ForgotPwd",
                "last_name": "Customer",
                "phone_number": phone,
                "password": TEST_PASSWORD
            })
            if response.status_code == 200:
                return {"phone": phone, "password": TEST_PASSWORD}
        pytest.skip(f"Could not create test customer: {response.text}")
    
    def test_provider_forgot_password_flow(self, test_provider):
        """Test complete forgot password flow for provider"""
        phone = test_provider["phone"]
        
        # Step 1: Request OTP
        response = requests.post(f"{BASE_URL}/api/auth/forgot-password", json={
            "phone_number": phone,
            "user_type": "provider"
        })
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        data = response.json()
        
        # Verify response contains OTP for testing
        assert "otp_for_testing" in data, "Response should contain otp_for_testing field"
        assert "message" in data, "Response should contain message field"
        assert "expires_in_minutes" in data, "Response should contain expires_in_minutes field"
        
        otp = data["otp_for_testing"]
        assert len(otp) == 6, f"OTP should be 6 digits, got {len(otp)}"
        assert otp.isdigit(), "OTP should be numeric"
        
        print(f"✓ Provider forgot password: OTP received ({otp})")
        
        # Step 2: Reset password with OTP
        new_password = "newpassword123"
        response = requests.post(f"{BASE_URL}/api/auth/reset-password", json={
            "phone_number": phone,
            "user_type": "provider",
            "otp": otp,
            "new_password": new_password
        })
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        data = response.json()
        assert "message" in data
        print(f"✓ Provider password reset successful")
        
        # Step 3: Verify login with new password
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "phone_number": phone,
            "password": new_password,
            "user_type": "provider"
        })
        assert response.status_code == 200, f"Login with new password failed: {response.text}"
        print(f"✓ Provider can login with new password")
    
    def test_customer_forgot_password_flow(self, test_customer):
        """Test complete forgot password flow for customer"""
        phone = test_customer["phone"]
        
        # Step 1: Request OTP
        response = requests.post(f"{BASE_URL}/api/auth/forgot-password", json={
            "phone_number": phone,
            "user_type": "customer"
        })
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        data = response.json()
        
        # Verify response contains OTP for testing
        assert "otp_for_testing" in data, "Response should contain otp_for_testing field"
        otp = data["otp_for_testing"]
        print(f"✓ Customer forgot password: OTP received ({otp})")
        
        # Step 2: Reset password with OTP
        new_password = "customernewpwd123"
        response = requests.post(f"{BASE_URL}/api/auth/reset-password", json={
            "phone_number": phone,
            "user_type": "customer",
            "otp": otp,
            "new_password": new_password
        })
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        print(f"✓ Customer password reset successful")
        
        # Step 3: Verify login with new password
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "phone_number": phone,
            "password": new_password,
            "user_type": "customer"
        })
        assert response.status_code == 200, f"Login with new password failed: {response.text}"
        print(f"✓ Customer can login with new password")
    
    def test_reset_password_wrong_otp(self, test_provider):
        """Test reset password with wrong OTP"""
        phone = test_provider["phone"]
        
        # Request OTP first
        response = requests.post(f"{BASE_URL}/api/auth/forgot-password", json={
            "phone_number": phone,
            "user_type": "provider"
        })
        assert response.status_code == 200
        
        # Try reset with wrong OTP
        response = requests.post(f"{BASE_URL}/api/auth/reset-password", json={
            "phone_number": phone,
            "user_type": "provider",
            "otp": "000000",  # Wrong OTP
            "new_password": "newpassword123"
        })
        assert response.status_code == 400, f"Expected 400 for wrong OTP, got {response.status_code}"
        print(f"✓ Reset password correctly rejects wrong OTP")


class TestCategoryRemoval:
    """Test that removed categories don't appear in the system"""
    
    def test_provider_registration_with_removed_category(self):
        """Test that registration with removed category fails"""
        for category in REMOVED_CATEGORIES:
            phone = f"628{uuid.uuid4().hex[:7]}"
            response = requests.post(f"{BASE_URL}/api/auth/register", json={
                "first_name": "TEST_Category",
                "last_name": "Test",
                "phone_number": phone,
                "password": "test123456",
                "profession": category
            })
            # Should fail with 422 (validation error) for invalid profession
            assert response.status_code == 422, f"Expected 422 for removed category '{category}', got {response.status_code}: {response.text}"
            print(f"✓ Registration correctly rejects removed category: {category}")
    
    def test_provider_registration_with_valid_category(self):
        """Test that registration with valid category succeeds"""
        for category in VALID_CATEGORIES[:3]:  # Test first 3 valid categories
            phone = f"629{uuid.uuid4().hex[:7]}"
            response = requests.post(f"{BASE_URL}/api/auth/register", json={
                "first_name": "TEST_ValidCat",
                "last_name": "Test",
                "phone_number": phone,
                "password": "test123456",
                "profession": category
            })
            # Should succeed with 200
            assert response.status_code == 200, f"Expected 200 for valid category '{category}', got {response.status_code}: {response.text}"
            print(f"✓ Registration succeeds with valid category: {category}")
    
    def test_providers_list_no_removed_categories(self):
        """Test that providers list doesn't contain removed categories"""
        response = requests.get(f"{BASE_URL}/api/providers")
        assert response.status_code == 200, f"Expected 200, got {response.status_code}"
        
        providers = response.json()
        for provider in providers:
            profession = provider.get("profession", "")
            assert profession not in REMOVED_CATEGORIES, f"Found removed category '{profession}' in providers list"
        
        print(f"✓ Providers list contains no removed categories (checked {len(providers)} providers)")


class TestForgotPasswordEndpointValidation:
    """Test endpoint validation and error handling"""
    
    def test_forgot_password_missing_phone(self):
        """Test forgot password with missing phone number"""
        response = requests.post(f"{BASE_URL}/api/auth/forgot-password", json={
            "user_type": "provider"
        })
        assert response.status_code == 422, f"Expected 422, got {response.status_code}"
        print(f"✓ Forgot password validates required phone_number field")
    
    def test_forgot_password_missing_user_type(self):
        """Test forgot password with missing user type"""
        response = requests.post(f"{BASE_URL}/api/auth/forgot-password", json={
            "phone_number": "123456789"
        })
        assert response.status_code == 422, f"Expected 422, got {response.status_code}"
        print(f"✓ Forgot password validates required user_type field")
    
    def test_reset_password_missing_fields(self):
        """Test reset password with missing fields"""
        # Missing OTP
        response = requests.post(f"{BASE_URL}/api/auth/reset-password", json={
            "phone_number": "123456789",
            "user_type": "provider",
            "new_password": "newpassword"
        })
        assert response.status_code == 422, f"Expected 422, got {response.status_code}"
        
        # Missing new_password
        response = requests.post(f"{BASE_URL}/api/auth/reset-password", json={
            "phone_number": "123456789",
            "user_type": "provider",
            "otp": "123456"
        })
        assert response.status_code == 422, f"Expected 422, got {response.status_code}"
        
        print(f"✓ Reset password validates all required fields")


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
