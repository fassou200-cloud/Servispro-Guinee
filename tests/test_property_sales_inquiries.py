"""
Test Property Sales and Property Inquiries Feature
- Property sales display on landing page (only approved ones)
- Admin can approve property sales via /api/admin/property-sales/{id}/approve
- Client can submit property inquiry via modal on landing page
- Property inquiry API endpoint POST /api/property-sales/{id}/inquiries
- Admin can view property inquiries in 'Demandes Immobilier' tab
- Admin can update property inquiry status (contacted, completed)
"""

import pytest
import requests
import os
import uuid

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', 'https://servispro-guinea-3.preview.emergentagent.com').rstrip('/')

class TestPropertySalesPublicAPI:
    """Test public property sales endpoints"""
    
    def test_get_approved_property_sales(self):
        """GET /api/property-sales - Should return only approved property sales"""
        response = requests.get(f"{BASE_URL}/api/property-sales?approved_only=true")
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        data = response.json()
        assert isinstance(data, list), "Response should be a list"
        
        # Verify all returned sales are approved
        for sale in data:
            assert sale.get('status') == 'approved', f"Sale {sale.get('id')} has status {sale.get('status')}, expected 'approved'"
        
        print(f"✓ GET /api/property-sales returned {len(data)} approved property sales")
        return data
    
    def test_get_property_sale_by_id(self):
        """GET /api/property-sales/{id} - Should return a specific property sale"""
        # First get list of sales
        sales = self.test_get_approved_property_sales()
        
        if len(sales) > 0:
            sale_id = sales[0]['id']
            response = requests.get(f"{BASE_URL}/api/property-sales/{sale_id}")
            assert response.status_code == 200, f"Expected 200, got {response.status_code}"
            
            data = response.json()
            assert data['id'] == sale_id
            assert 'title' in data
            assert 'sale_price' in data
            assert 'location' in data
            print(f"✓ GET /api/property-sales/{sale_id} returned property details")
        else:
            print("⚠ No approved property sales to test individual fetch")


class TestAdminPropertySalesManagement:
    """Test admin property sales management endpoints"""
    
    @pytest.fixture
    def admin_session(self):
        """Get admin session"""
        session = requests.Session()
        session.headers.update({"Content-Type": "application/json"})
        return session
    
    def test_admin_get_all_property_sales(self, admin_session):
        """GET /api/admin/property-sales - Admin should see all property sales"""
        response = admin_session.get(f"{BASE_URL}/api/admin/property-sales")
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        data = response.json()
        assert isinstance(data, list), "Response should be a list"
        print(f"✓ Admin GET /api/admin/property-sales returned {len(data)} property sales")
        return data
    
    def test_admin_get_pending_property_sales(self, admin_session):
        """GET /api/admin/property-sales/pending - Admin should see pending sales"""
        response = admin_session.get(f"{BASE_URL}/api/admin/property-sales/pending")
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        data = response.json()
        assert isinstance(data, list), "Response should be a list"
        
        # Verify all returned sales are pending
        for sale in data:
            assert sale.get('status') == 'pending', f"Sale {sale.get('id')} has status {sale.get('status')}, expected 'pending'"
        
        print(f"✓ Admin GET /api/admin/property-sales/pending returned {len(data)} pending sales")
        return data
    
    def test_admin_approve_property_sale(self, admin_session):
        """PUT /api/admin/property-sales/{id}/approve - Admin can approve a property sale"""
        # Get pending sales
        pending_sales = self.test_admin_get_pending_property_sales(admin_session)
        
        if len(pending_sales) > 0:
            sale_id = pending_sales[0]['id']
            response = admin_session.put(f"{BASE_URL}/api/admin/property-sales/{sale_id}/approve")
            assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
            
            data = response.json()
            assert 'message' in data
            assert data.get('sale_id') == sale_id
            print(f"✓ Admin approved property sale {sale_id}")
            
            # Verify the sale is now approved
            verify_response = admin_session.get(f"{BASE_URL}/api/property-sales/{sale_id}")
            if verify_response.status_code == 200:
                verify_data = verify_response.json()
                assert verify_data.get('status') == 'approved', "Sale should be approved after approval"
                print(f"✓ Verified sale {sale_id} status is now 'approved'")
        else:
            print("⚠ No pending property sales to test approval")
    
    def test_admin_reject_property_sale(self, admin_session):
        """PUT /api/admin/property-sales/{id}/reject - Admin can reject a property sale"""
        # Get all sales to find one to test
        all_sales = self.test_admin_get_all_property_sales(admin_session)
        
        # Find a pending sale or skip
        pending_sales = [s for s in all_sales if s.get('status') == 'pending']
        
        if len(pending_sales) > 0:
            sale_id = pending_sales[0]['id']
            response = admin_session.put(f"{BASE_URL}/api/admin/property-sales/{sale_id}/reject")
            assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
            
            data = response.json()
            assert 'message' in data
            print(f"✓ Admin rejected property sale {sale_id}")
        else:
            print("⚠ No pending property sales to test rejection")
    
    def test_admin_mark_property_sold(self, admin_session):
        """PUT /api/admin/property-sales/{id}/sold - Admin can mark property as sold"""
        # Get all sales to find an approved one
        all_sales = self.test_admin_get_all_property_sales(admin_session)
        
        # Find an approved sale
        approved_sales = [s for s in all_sales if s.get('status') == 'approved']
        
        if len(approved_sales) > 0:
            sale_id = approved_sales[0]['id']
            response = admin_session.put(f"{BASE_URL}/api/admin/property-sales/{sale_id}/sold")
            assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
            
            data = response.json()
            assert 'message' in data
            print(f"✓ Admin marked property sale {sale_id} as sold")
        else:
            print("⚠ No approved property sales to test marking as sold")


class TestPropertyInquiries:
    """Test property inquiry endpoints"""
    
    @pytest.fixture
    def api_client(self):
        """Get API client session"""
        session = requests.Session()
        session.headers.update({"Content-Type": "application/json"})
        return session
    
    def test_create_property_inquiry(self, api_client):
        """POST /api/property-sales/{id}/inquiries - Client can submit property inquiry"""
        # First get an approved property sale
        response = api_client.get(f"{BASE_URL}/api/property-sales?approved_only=true")
        assert response.status_code == 200
        
        sales = response.json()
        
        if len(sales) > 0:
            sale_id = sales[0]['id']
            
            # Create inquiry
            inquiry_data = {
                "property_id": sale_id,
                "customer_name": f"TEST_Client_{uuid.uuid4().hex[:6]}",
                "customer_phone": "6250001234",
                "customer_email": "test@example.com",
                "message": "Je suis intéressé par cette propriété. Pouvez-vous me contacter?",
                "budget_range": "500M - 1B GNF",
                "financing_type": "cash"
            }
            
            response = api_client.post(
                f"{BASE_URL}/api/property-sales/{sale_id}/inquiries",
                json=inquiry_data
            )
            assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
            
            data = response.json()
            assert 'id' in data, "Response should contain inquiry ID"
            assert 'message' in data, "Response should contain success message"
            assert data.get('status') == 'pending', "New inquiry should have pending status"
            
            print(f"✓ Created property inquiry {data['id']} for sale {sale_id}")
            return data['id']
        else:
            print("⚠ No approved property sales to test inquiry creation")
            return None
    
    def test_create_property_inquiry_minimal(self, api_client):
        """POST /api/property-sales/{id}/inquiries - Test with minimal required fields"""
        # First get an approved property sale
        response = api_client.get(f"{BASE_URL}/api/property-sales?approved_only=true")
        assert response.status_code == 200
        
        sales = response.json()
        
        if len(sales) > 0:
            sale_id = sales[0]['id']
            
            # Create inquiry with minimal fields
            inquiry_data = {
                "property_id": sale_id,
                "customer_name": f"TEST_MinimalClient_{uuid.uuid4().hex[:6]}",
                "customer_phone": "6250009999",
                "message": "Intéressé par cette propriété"
            }
            
            response = api_client.post(
                f"{BASE_URL}/api/property-sales/{sale_id}/inquiries",
                json=inquiry_data
            )
            assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
            
            data = response.json()
            assert 'id' in data
            print(f"✓ Created minimal property inquiry {data['id']}")
        else:
            print("⚠ No approved property sales to test minimal inquiry")
    
    def test_create_property_inquiry_invalid_sale(self, api_client):
        """POST /api/property-sales/{id}/inquiries - Should fail for non-existent sale"""
        fake_sale_id = "non-existent-sale-id-12345"
        
        inquiry_data = {
            "property_id": fake_sale_id,
            "customer_name": "Test Client",
            "customer_phone": "6250001234",
            "message": "Test message"
        }
        
        response = api_client.post(
            f"{BASE_URL}/api/property-sales/{fake_sale_id}/inquiries",
            json=inquiry_data
        )
        assert response.status_code == 404, f"Expected 404 for non-existent sale, got {response.status_code}"
        print("✓ Correctly returned 404 for non-existent property sale")


class TestAdminPropertyInquiries:
    """Test admin property inquiry management endpoints"""
    
    @pytest.fixture
    def admin_session(self):
        """Get admin session"""
        session = requests.Session()
        session.headers.update({"Content-Type": "application/json"})
        return session
    
    def test_admin_get_all_property_inquiries(self, admin_session):
        """GET /api/admin/property-inquiries - Admin should see all property inquiries"""
        response = admin_session.get(f"{BASE_URL}/api/admin/property-inquiries")
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        data = response.json()
        assert isinstance(data, list), "Response should be a list"
        
        # Verify inquiry structure
        if len(data) > 0:
            inquiry = data[0]
            assert 'id' in inquiry
            assert 'customer_name' in inquiry
            assert 'customer_phone' in inquiry
            assert 'property_info' in inquiry
            assert 'status' in inquiry
            print(f"✓ Admin GET /api/admin/property-inquiries returned {len(data)} inquiries with correct structure")
        else:
            print("✓ Admin GET /api/admin/property-inquiries returned empty list (no inquiries yet)")
        
        return data
    
    def test_admin_get_pending_property_inquiries(self, admin_session):
        """GET /api/admin/property-inquiries?status=pending - Admin should see pending inquiries"""
        response = admin_session.get(f"{BASE_URL}/api/admin/property-inquiries?status=pending")
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        data = response.json()
        assert isinstance(data, list), "Response should be a list"
        
        # Verify all returned inquiries are pending
        for inquiry in data:
            assert inquiry.get('status') == 'pending', f"Inquiry {inquiry.get('id')} has status {inquiry.get('status')}, expected 'pending'"
        
        print(f"✓ Admin GET /api/admin/property-inquiries?status=pending returned {len(data)} pending inquiries")
        return data
    
    def test_admin_update_inquiry_to_contacted(self, admin_session):
        """PUT /api/admin/property-inquiries/{id}?status=contacted - Admin can mark inquiry as contacted"""
        # Get pending inquiries
        pending = self.test_admin_get_pending_property_inquiries(admin_session)
        
        if len(pending) > 0:
            inquiry_id = pending[0]['id']
            
            response = admin_session.put(
                f"{BASE_URL}/api/admin/property-inquiries/{inquiry_id}?status=contacted&admin_notes=Client%20contacté%20par%20téléphone"
            )
            assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
            
            data = response.json()
            assert 'message' in data
            print(f"✓ Admin updated inquiry {inquiry_id} to 'contacted'")
            return inquiry_id
        else:
            print("⚠ No pending property inquiries to test status update")
            return None
    
    def test_admin_update_inquiry_to_completed(self, admin_session):
        """PUT /api/admin/property-inquiries/{id}?status=completed - Admin can mark inquiry as completed"""
        # Get all inquiries
        all_inquiries = self.test_admin_get_all_property_inquiries(admin_session)
        
        # Find a contacted or pending inquiry
        eligible = [i for i in all_inquiries if i.get('status') in ['pending', 'contacted']]
        
        if len(eligible) > 0:
            inquiry_id = eligible[0]['id']
            
            response = admin_session.put(
                f"{BASE_URL}/api/admin/property-inquiries/{inquiry_id}?status=completed&admin_notes=Vente%20conclue"
            )
            assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
            
            data = response.json()
            assert 'message' in data
            print(f"✓ Admin updated inquiry {inquiry_id} to 'completed'")
        else:
            print("⚠ No eligible property inquiries to test completion")


class TestEndToEndPropertyFlow:
    """Test complete property sales and inquiry flow"""
    
    def test_full_property_inquiry_flow(self):
        """Test complete flow: view approved sales -> submit inquiry -> admin manages inquiry"""
        session = requests.Session()
        session.headers.update({"Content-Type": "application/json"})
        
        # Step 1: Get approved property sales (what customer sees on landing page)
        print("\n--- Step 1: Customer views approved property sales ---")
        response = session.get(f"{BASE_URL}/api/property-sales?approved_only=true")
        assert response.status_code == 200
        sales = response.json()
        print(f"✓ Found {len(sales)} approved property sales")
        
        if len(sales) == 0:
            print("⚠ No approved property sales available for E2E test")
            return
        
        sale = sales[0]
        print(f"✓ Selected property: {sale.get('title')} - {sale.get('sale_price'):,} GNF")
        
        # Step 2: Customer submits inquiry
        print("\n--- Step 2: Customer submits property inquiry ---")
        inquiry_data = {
            "property_id": sale['id'],
            "customer_name": f"TEST_E2E_Client_{uuid.uuid4().hex[:6]}",
            "customer_phone": "6250005555",
            "customer_email": "e2e_test@example.com",
            "message": "Je suis très intéressé par cette propriété. Quand puis-je la visiter?",
            "budget_range": "Négociable",
            "financing_type": "credit"
        }
        
        response = session.post(
            f"{BASE_URL}/api/property-sales/{sale['id']}/inquiries",
            json=inquiry_data
        )
        assert response.status_code == 200, f"Failed to create inquiry: {response.text}"
        inquiry_result = response.json()
        inquiry_id = inquiry_result['id']
        print(f"✓ Created inquiry {inquiry_id}")
        
        # Step 3: Admin views all inquiries
        print("\n--- Step 3: Admin views property inquiries ---")
        response = session.get(f"{BASE_URL}/api/admin/property-inquiries")
        assert response.status_code == 200
        inquiries = response.json()
        print(f"✓ Admin sees {len(inquiries)} total inquiries")
        
        # Find our inquiry
        our_inquiry = next((i for i in inquiries if i['id'] == inquiry_id), None)
        assert our_inquiry is not None, "Our inquiry should be in the list"
        assert our_inquiry['status'] == 'pending', "New inquiry should be pending"
        print(f"✓ Found our inquiry with status: {our_inquiry['status']}")
        
        # Step 4: Admin marks inquiry as contacted
        print("\n--- Step 4: Admin marks inquiry as contacted ---")
        response = session.put(
            f"{BASE_URL}/api/admin/property-inquiries/{inquiry_id}?status=contacted&admin_notes=Appelé%20le%20client"
        )
        assert response.status_code == 200
        print("✓ Admin marked inquiry as contacted")
        
        # Step 5: Admin marks inquiry as completed
        print("\n--- Step 5: Admin marks inquiry as completed ---")
        response = session.put(
            f"{BASE_URL}/api/admin/property-inquiries/{inquiry_id}?status=completed&admin_notes=Visite%20effectuée"
        )
        assert response.status_code == 200
        print("✓ Admin marked inquiry as completed")
        
        # Verify final state
        response = session.get(f"{BASE_URL}/api/admin/property-inquiries")
        inquiries = response.json()
        final_inquiry = next((i for i in inquiries if i['id'] == inquiry_id), None)
        assert final_inquiry['status'] == 'completed', "Inquiry should be completed"
        print(f"✓ Final inquiry status: {final_inquiry['status']}")
        
        print("\n✓ E2E Property Inquiry Flow completed successfully!")


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
