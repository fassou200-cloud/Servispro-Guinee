"""
Test suite for Rental Approval Feature
Tests the new approval workflow where:
1. New rentals are created with status 'pending'
2. Public /api/rentals only returns 'approved' rentals
3. Admin can approve rentals via PUT /api/admin/rentals/{id}/approve
4. Admin can reject rentals via PUT /api/admin/rentals/{id}/reject
"""

import pytest
import requests
import os
import uuid

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')

# Test credentials
TEST_PROVIDER = {
    "phone_number": "620000001",
    "password": "test123"
}

ADMIN_CREDENTIALS = {
    "username": "admin",
    "password": "admin123"
}


class TestRentalApprovalBackend:
    """Backend API tests for rental approval feature"""
    
    @pytest.fixture(autouse=True)
    def setup(self):
        """Setup test session"""
        self.session = requests.Session()
        self.session.headers.update({"Content-Type": "application/json"})
        self.provider_token = None
        self.created_rental_id = None
    
    def get_provider_token(self):
        """Login as provider and get token"""
        response = self.session.post(f"{BASE_URL}/api/auth/login", json={
            "phone_number": TEST_PROVIDER["phone_number"],
            "password": TEST_PROVIDER["password"],
            "user_type": "provider"
        })
        if response.status_code == 200:
            return response.json().get("token")
        return None
    
    def test_01_provider_login(self):
        """Test provider can login"""
        response = self.session.post(f"{BASE_URL}/api/auth/login", json={
            "phone_number": TEST_PROVIDER["phone_number"],
            "password": TEST_PROVIDER["password"],
            "user_type": "provider"
        })
        print(f"Provider login response: {response.status_code}")
        assert response.status_code == 200, f"Provider login failed: {response.text}"
        data = response.json()
        assert "token" in data
        assert "user" in data
        print(f"Provider logged in: {data['user'].get('first_name')} {data['user'].get('last_name')}")
    
    def test_02_create_rental_with_pending_status(self):
        """Test that new rentals are created with 'pending' approval_status"""
        token = self.get_provider_token()
        if not token:
            pytest.skip("Could not get provider token")
        
        unique_id = str(uuid.uuid4())[:8]
        rental_data = {
            "property_type": "Apartment",
            "title": f"TEST_Rental_Pending_{unique_id}",
            "description": "Test rental for approval workflow testing",
            "location": "Conakry, Kaloum",
            "rental_price": 500000,
            "rental_type": "long_term",
            "is_available": True,
            "amenities": ["wifi", "climatisation"]
        }
        
        response = self.session.post(
            f"{BASE_URL}/api/rentals",
            json=rental_data,
            headers={"Authorization": f"Bearer {token}"}
        )
        
        print(f"Create rental response: {response.status_code}")
        assert response.status_code == 200, f"Failed to create rental: {response.text}"
        
        data = response.json()
        assert "id" in data
        assert data.get("approval_status") == "pending", f"Expected 'pending' status, got: {data.get('approval_status')}"
        assert data.get("title") == rental_data["title"]
        
        print(f"Created rental with ID: {data['id']}, approval_status: {data['approval_status']}")
        
        # Store for cleanup
        self.__class__.created_rental_id = data["id"]
    
    def test_03_public_rentals_excludes_pending(self):
        """Test that public /api/rentals endpoint only returns approved rentals"""
        response = self.session.get(f"{BASE_URL}/api/rentals")
        
        print(f"Public rentals response: {response.status_code}")
        assert response.status_code == 200
        
        rentals = response.json()
        print(f"Found {len(rentals)} public rentals")
        
        # Check that all returned rentals are approved
        for rental in rentals:
            status = rental.get("approval_status", "pending")
            assert status == "approved", f"Found non-approved rental in public list: {rental.get('title')} with status {status}"
        
        # Verify our pending rental is NOT in the public list
        if hasattr(self.__class__, 'created_rental_id') and self.__class__.created_rental_id:
            rental_ids = [r.get("id") for r in rentals]
            assert self.__class__.created_rental_id not in rental_ids, "Pending rental should not appear in public list"
            print(f"Confirmed: Pending rental {self.__class__.created_rental_id} is NOT in public list")
    
    def test_04_provider_sees_own_pending_rentals(self):
        """Test that provider can see their own pending rentals via my-listings"""
        token = self.get_provider_token()
        if not token:
            pytest.skip("Could not get provider token")
        
        response = self.session.get(
            f"{BASE_URL}/api/rentals/my-listings",
            headers={"Authorization": f"Bearer {token}"}
        )
        
        print(f"My listings response: {response.status_code}")
        assert response.status_code == 200
        
        rentals = response.json()
        print(f"Provider has {len(rentals)} rentals")
        
        # Check if our pending rental is in the list
        if hasattr(self.__class__, 'created_rental_id') and self.__class__.created_rental_id:
            rental_ids = [r.get("id") for r in rentals]
            assert self.__class__.created_rental_id in rental_ids, "Provider should see their own pending rental"
            
            # Find and verify the rental
            our_rental = next((r for r in rentals if r.get("id") == self.__class__.created_rental_id), None)
            if our_rental:
                print(f"Found our rental: {our_rental.get('title')}, status: {our_rental.get('approval_status')}")
    
    def test_05_admin_gets_all_rentals(self):
        """Test admin can see all rentals including pending"""
        response = self.session.get(f"{BASE_URL}/api/admin/rentals")
        
        print(f"Admin rentals response: {response.status_code}")
        assert response.status_code == 200
        
        rentals = response.json()
        print(f"Admin sees {len(rentals)} total rentals")
        
        # Count by status
        status_counts = {}
        for rental in rentals:
            status = rental.get("approval_status", "pending")
            status_counts[status] = status_counts.get(status, 0) + 1
        
        print(f"Rental status breakdown: {status_counts}")
    
    def test_06_admin_gets_pending_rentals(self):
        """Test admin can get only pending rentals"""
        response = self.session.get(f"{BASE_URL}/api/admin/rentals/pending")
        
        print(f"Admin pending rentals response: {response.status_code}")
        assert response.status_code == 200
        
        rentals = response.json()
        print(f"Found {len(rentals)} pending rentals")
        
        # Verify all are pending
        for rental in rentals:
            status = rental.get("approval_status", "pending")
            assert status == "pending", f"Non-pending rental in pending list: {rental.get('title')}"
    
    def test_07_admin_approve_rental(self):
        """Test admin can approve a rental"""
        # First, get a pending rental to approve
        response = self.session.get(f"{BASE_URL}/api/admin/rentals/pending")
        assert response.status_code == 200
        
        pending_rentals = response.json()
        if not pending_rentals:
            pytest.skip("No pending rentals to approve")
        
        # Use our created rental if available, otherwise use first pending
        rental_to_approve = None
        if hasattr(self.__class__, 'created_rental_id') and self.__class__.created_rental_id:
            rental_to_approve = next(
                (r for r in pending_rentals if r.get("id") == self.__class__.created_rental_id), 
                None
            )
        
        if not rental_to_approve:
            rental_to_approve = pending_rentals[0]
        
        rental_id = rental_to_approve.get("id")
        print(f"Approving rental: {rental_to_approve.get('title')} (ID: {rental_id})")
        
        # Approve the rental
        approve_response = self.session.put(f"{BASE_URL}/api/admin/rentals/{rental_id}/approve")
        
        print(f"Approve response: {approve_response.status_code}")
        assert approve_response.status_code == 200, f"Failed to approve: {approve_response.text}"
        
        # Verify the rental is now approved
        verify_response = self.session.get(f"{BASE_URL}/api/rentals/{rental_id}")
        assert verify_response.status_code == 200
        
        rental_data = verify_response.json()
        assert rental_data.get("approval_status") == "approved", f"Rental not approved: {rental_data.get('approval_status')}"
        assert rental_data.get("approved_at") is not None, "approved_at should be set"
        
        print(f"Rental approved successfully. Status: {rental_data.get('approval_status')}, approved_at: {rental_data.get('approved_at')}")
        
        # Store for next test
        self.__class__.approved_rental_id = rental_id
    
    def test_08_approved_rental_in_public_list(self):
        """Test that approved rental now appears in public list"""
        if not hasattr(self.__class__, 'approved_rental_id'):
            pytest.skip("No approved rental from previous test")
        
        response = self.session.get(f"{BASE_URL}/api/rentals")
        assert response.status_code == 200
        
        rentals = response.json()
        rental_ids = [r.get("id") for r in rentals]
        
        assert self.__class__.approved_rental_id in rental_ids, "Approved rental should appear in public list"
        print(f"Confirmed: Approved rental {self.__class__.approved_rental_id} is now in public list")
    
    def test_09_admin_reject_rental(self):
        """Test admin can reject a rental"""
        # Create a new rental to reject
        token = self.get_provider_token()
        if not token:
            pytest.skip("Could not get provider token")
        
        unique_id = str(uuid.uuid4())[:8]
        rental_data = {
            "property_type": "House",
            "title": f"TEST_Rental_ToReject_{unique_id}",
            "description": "Test rental for rejection testing",
            "location": "Conakry, Ratoma",
            "rental_price": 750000,
            "rental_type": "long_term",
            "is_available": True
        }
        
        create_response = self.session.post(
            f"{BASE_URL}/api/rentals",
            json=rental_data,
            headers={"Authorization": f"Bearer {token}"}
        )
        
        assert create_response.status_code == 200
        rental_id = create_response.json().get("id")
        print(f"Created rental to reject: {rental_id}")
        
        # Reject the rental
        reject_response = self.session.put(
            f"{BASE_URL}/api/admin/rentals/{rental_id}/reject",
            params={"reason": "Documents incomplets"}
        )
        
        print(f"Reject response: {reject_response.status_code}")
        # Note: The endpoint might return 200 or None based on implementation
        assert reject_response.status_code in [200, 204], f"Failed to reject: {reject_response.text}"
        
        # Verify the rental is now rejected
        verify_response = self.session.get(f"{BASE_URL}/api/rentals/{rental_id}")
        assert verify_response.status_code == 200
        
        rental_data = verify_response.json()
        assert rental_data.get("approval_status") == "rejected", f"Rental not rejected: {rental_data.get('approval_status')}"
        
        print(f"Rental rejected successfully. Status: {rental_data.get('approval_status')}, reason: {rental_data.get('rejection_reason')}")
        
        # Store for cleanup
        self.__class__.rejected_rental_id = rental_id
    
    def test_10_rejected_rental_not_in_public_list(self):
        """Test that rejected rental does not appear in public list"""
        if not hasattr(self.__class__, 'rejected_rental_id'):
            pytest.skip("No rejected rental from previous test")
        
        response = self.session.get(f"{BASE_URL}/api/rentals")
        assert response.status_code == 200
        
        rentals = response.json()
        rental_ids = [r.get("id") for r in rentals]
        
        assert self.__class__.rejected_rental_id not in rental_ids, "Rejected rental should NOT appear in public list"
        print(f"Confirmed: Rejected rental {self.__class__.rejected_rental_id} is NOT in public list")
    
    def test_11_cleanup_test_rentals(self):
        """Cleanup test rentals"""
        # Get all admin rentals
        response = self.session.get(f"{BASE_URL}/api/admin/rentals")
        if response.status_code != 200:
            return
        
        rentals = response.json()
        deleted_count = 0
        
        for rental in rentals:
            title = rental.get("title", "")
            if title.startswith("TEST_"):
                rental_id = rental.get("id")
                delete_response = self.session.delete(f"{BASE_URL}/api/admin/rentals/{rental_id}")
                if delete_response.status_code == 200:
                    deleted_count += 1
                    print(f"Deleted test rental: {title}")
        
        print(f"Cleanup complete. Deleted {deleted_count} test rentals.")


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
