"""
Test suite for Real Estate Listing Fees Feature
Tests:
- GET /api/agent-listing-info/{provider_id} endpoint
- GET /api/admin/settings for fee configuration
- Verification of free listings count and fees
"""

import pytest
import requests
import os

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', 'https://shop-marketplace-47.preview.emergentagent.com').rstrip('/')

# Test credentials for real estate agent
REAL_ESTATE_AGENT = {
    "phone_number": "224699999999",
    "password": "password123",
    "user_type": "provider"
}

ADMIN_CREDENTIALS = {
    "email": "servispro@servisprogn.com",
    "password": "Servisproguinea2026#"
}


class TestAdminSettings:
    """Tests for admin settings endpoint containing fee configuration"""
    
    def test_get_admin_settings_returns_fee_fields(self):
        """Verify admin settings contains all required fee fields"""
        response = requests.get(f"{BASE_URL}/api/admin/settings")
        assert response.status_code == 200, f"Expected 200, got {response.status_code}"
        
        data = response.json()
        # Verify required fields exist
        assert 'frais_annonce_location' in data, "Missing frais_annonce_location field"
        assert 'frais_annonce_vente' in data, "Missing frais_annonce_vente field"
        assert 'annonces_gratuites' in data, "Missing annonces_gratuites field"
        assert 'devise' in data, "Missing devise field"
        
        # Verify data types
        assert isinstance(data['frais_annonce_location'], (int, float)), "frais_annonce_location should be numeric"
        assert isinstance(data['frais_annonce_vente'], (int, float)), "frais_annonce_vente should be numeric"
        assert isinstance(data['annonces_gratuites'], int), "annonces_gratuites should be integer"
        assert isinstance(data['devise'], str), "devise should be string"
        
        print(f"✓ Admin settings: location={data['frais_annonce_location']}, vente={data['frais_annonce_vente']}, gratuit={data['annonces_gratuites']}")


class TestAgentListingInfo:
    """Tests for agent listing info endpoint"""
    
    @pytest.fixture
    def agent_auth(self):
        """Login as real estate agent and get token + user info"""
        response = requests.post(
            f"{BASE_URL}/api/auth/login",
            json=REAL_ESTATE_AGENT
        )
        if response.status_code != 200:
            pytest.skip(f"Real estate agent login failed: {response.text}")
        
        data = response.json()
        return {
            "token": data["token"],
            "user": data["user"],
            "provider_id": data["user"]["id"]
        }
    
    def test_agent_listing_info_returns_correct_structure(self, agent_auth):
        """Verify agent-listing-info endpoint returns all required fields"""
        provider_id = agent_auth["provider_id"]
        
        response = requests.get(f"{BASE_URL}/api/agent-listing-info/{provider_id}")
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        data = response.json()
        
        # Verify all required fields exist
        required_fields = [
            'total_listings',
            'rentals_count',
            'sales_count',
            'free_listings_limit',
            'free_listings_remaining',
            'is_next_free',
            'frais_annonce_location',
            'frais_annonce_vente',
            'devise'
        ]
        
        for field in required_fields:
            assert field in data, f"Missing required field: {field}"
        
        print(f"✓ All required fields present: {list(data.keys())}")
    
    def test_agent_listing_info_correct_data_types(self, agent_auth):
        """Verify correct data types for all fields"""
        provider_id = agent_auth["provider_id"]
        
        response = requests.get(f"{BASE_URL}/api/agent-listing-info/{provider_id}")
        assert response.status_code == 200
        
        data = response.json()
        
        # Verify data types
        assert isinstance(data['total_listings'], int), "total_listings should be int"
        assert isinstance(data['rentals_count'], int), "rentals_count should be int"
        assert isinstance(data['sales_count'], int), "sales_count should be int"
        assert isinstance(data['free_listings_limit'], int), "free_listings_limit should be int"
        assert isinstance(data['free_listings_remaining'], int), "free_listings_remaining should be int"
        assert isinstance(data['is_next_free'], bool), "is_next_free should be bool"
        assert isinstance(data['frais_annonce_location'], (int, float)), "frais_annonce_location should be numeric"
        assert isinstance(data['frais_annonce_vente'], (int, float)), "frais_annonce_vente should be numeric"
        assert isinstance(data['devise'], str), "devise should be string"
        
        print(f"✓ All data types correct")
    
    def test_agent_listing_info_free_listings_calculation(self, agent_auth):
        """Verify free listings calculation is correct"""
        provider_id = agent_auth["provider_id"]
        
        response = requests.get(f"{BASE_URL}/api/agent-listing-info/{provider_id}")
        assert response.status_code == 200
        
        data = response.json()
        
        # Verify calculation: free_remaining = limit - total
        expected_remaining = max(0, data['free_listings_limit'] - data['total_listings'])
        assert data['free_listings_remaining'] == expected_remaining, \
            f"free_listings_remaining calculation wrong: expected {expected_remaining}, got {data['free_listings_remaining']}"
        
        # Verify is_next_free logic
        expected_is_free = data['total_listings'] < data['free_listings_limit']
        assert data['is_next_free'] == expected_is_free, \
            f"is_next_free should be {expected_is_free}, got {data['is_next_free']}"
        
        # Verify total = rentals + sales
        assert data['total_listings'] == data['rentals_count'] + data['sales_count'], \
            f"total_listings should equal rentals_count + sales_count"
        
        print(f"✓ Free listings calculation correct: {data['free_listings_remaining']} of {data['free_listings_limit']} remaining")
    
    def test_agent_listing_info_matches_admin_settings(self, agent_auth):
        """Verify fees in agent-listing-info match admin settings"""
        provider_id = agent_auth["provider_id"]
        
        # Get admin settings
        settings_response = requests.get(f"{BASE_URL}/api/admin/settings")
        assert settings_response.status_code == 200
        settings = settings_response.json()
        
        # Get agent listing info
        agent_response = requests.get(f"{BASE_URL}/api/agent-listing-info/{provider_id}")
        assert agent_response.status_code == 200
        agent_data = agent_response.json()
        
        # Compare fees
        assert agent_data['frais_annonce_location'] == settings['frais_annonce_location'], \
            f"frais_annonce_location mismatch: {agent_data['frais_annonce_location']} vs {settings['frais_annonce_location']}"
        
        assert agent_data['frais_annonce_vente'] == settings['frais_annonce_vente'], \
            f"frais_annonce_vente mismatch: {agent_data['frais_annonce_vente']} vs {settings['frais_annonce_vente']}"
        
        assert agent_data['free_listings_limit'] == settings['annonces_gratuites'], \
            f"free_listings_limit mismatch: {agent_data['free_listings_limit']} vs {settings['annonces_gratuites']}"
        
        assert agent_data['devise'] == settings['devise'], \
            f"devise mismatch: {agent_data['devise']} vs {settings['devise']}"
        
        print(f"✓ Fees match admin settings: location={agent_data['frais_annonce_location']}, vente={agent_data['frais_annonce_vente']}")
    
    def test_agent_listing_info_nonexistent_provider(self):
        """Test endpoint behavior with non-existent provider ID"""
        fake_id = "00000000-0000-0000-0000-000000000000"
        
        response = requests.get(f"{BASE_URL}/api/agent-listing-info/{fake_id}")
        assert response.status_code == 200, f"Expected 200 for non-existent provider, got {response.status_code}"
        
        data = response.json()
        # Should return 0 listings and all free slots available
        assert data['total_listings'] == 0, "Non-existent provider should have 0 listings"
        assert data['rentals_count'] == 0, "Non-existent provider should have 0 rentals"
        assert data['sales_count'] == 0, "Non-existent provider should have 0 sales"
        assert data['is_next_free'] == True, "Non-existent provider should have free listings available"
        
        print(f"✓ Non-existent provider returns expected defaults")


class TestRealEstateAgentAuth:
    """Tests for real estate agent authentication"""
    
    def test_real_estate_agent_login(self):
        """Verify real estate agent can login successfully"""
        response = requests.post(
            f"{BASE_URL}/api/auth/login",
            json=REAL_ESTATE_AGENT
        )
        assert response.status_code == 200, f"Login failed: {response.text}"
        
        data = response.json()
        assert 'token' in data, "Missing token in login response"
        assert 'user' in data, "Missing user in login response"
        
        user = data['user']
        assert user['phone_number'] == REAL_ESTATE_AGENT['phone_number'], "Phone number mismatch"
        
        # Check if user is a real estate agent (profession contains immobilier)
        profession = user.get('profession', '').lower()
        assert 'immobilier' in profession, f"User should be a real estate agent, got profession: {user.get('profession')}"
        
        print(f"✓ Real estate agent login successful: {user['first_name']} {user['last_name']} ({user['profession']})")
    
    def test_real_estate_agent_profile(self):
        """Verify real estate agent profile endpoint works"""
        # Login first
        login_response = requests.post(
            f"{BASE_URL}/api/auth/login",
            json=REAL_ESTATE_AGENT
        )
        assert login_response.status_code == 200
        token = login_response.json()['token']
        
        # Get profile
        profile_response = requests.get(
            f"{BASE_URL}/api/profile/me",
            headers={"Authorization": f"Bearer {token}"}
        )
        assert profile_response.status_code == 200, f"Profile fetch failed: {profile_response.text}"
        
        profile = profile_response.json()
        assert 'id' in profile, "Missing id in profile"
        assert 'profession' in profile, "Missing profession in profile"
        
        print(f"✓ Profile endpoint works for real estate agent")


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
