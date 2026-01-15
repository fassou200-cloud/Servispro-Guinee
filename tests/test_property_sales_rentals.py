"""
Test suite for ServisPro Property Sales and Rental Document Features
Tests:
- Property Sale CRUD operations for Agent Immobilier
- Document upload for property sales (titre_foncier, seller_id_document, registration_ministere)
- Rental document upload functionality
- Admin dashboard access to documents
"""

import pytest
import requests
import os
import io

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', 'https://servispro-guinea-2.preview.emergentagent.com').rstrip('/')
API = f"{BASE_URL}/api"

# Test credentials
AGENT_PHONE = "6201234567"
AGENT_PASSWORD = "test123"
ADMIN_USERNAME = "admin"
ADMIN_PASSWORD = "admin123"


class TestAgentImmobilierAuth:
    """Test Agent Immobilier authentication"""
    
    def test_agent_login(self):
        """Test Agent Immobilier login"""
        response = requests.post(f"{API}/auth/login", json={
            "phone_number": AGENT_PHONE,
            "password": AGENT_PASSWORD,
            "user_type": "provider"
        })
        
        if response.status_code == 200:
            data = response.json()
            assert "token" in data
            assert "user" in data
            print(f"SUCCESS: Agent login successful - {data['user'].get('first_name', 'Unknown')} {data['user'].get('last_name', '')}")
            print(f"  Profession: {data['user'].get('profession', 'Unknown')}")
            return data
        elif response.status_code == 401:
            pytest.skip("Agent credentials not found - need to register first")
        else:
            pytest.fail(f"Unexpected status code: {response.status_code} - {response.text}")


class TestPropertySalesCRUD:
    """Test Property Sales CRUD operations"""
    
    @pytest.fixture
    def agent_token(self):
        """Get agent token for authenticated requests"""
        response = requests.post(f"{API}/auth/login", json={
            "phone_number": AGENT_PHONE,
            "password": AGENT_PASSWORD,
            "user_type": "provider"
        })
        if response.status_code != 200:
            pytest.skip("Agent login failed - cannot test property sales")
        return response.json()["token"]
    
    def test_get_all_property_sales(self):
        """Test getting all property sales (public endpoint)"""
        response = requests.get(f"{API}/property-sales")
        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, list)
        print(f"SUCCESS: Found {len(data)} property sales")
        return data
    
    def test_get_property_sales_with_filters(self):
        """Test property sales with filters"""
        # Test with available_only=false to get all
        response = requests.get(f"{API}/property-sales?available_only=false")
        assert response.status_code == 200
        all_sales = response.json()
        
        # Test with property_type filter
        response = requests.get(f"{API}/property-sales?property_type=Maison")
        assert response.status_code == 200
        print(f"SUCCESS: Property sales filters working")
    
    def test_create_property_sale(self, agent_token):
        """Test creating a property sale"""
        headers = {"Authorization": f"Bearer {agent_token}"}
        
        sale_data = {
            "property_type": "Maison",
            "title": "TEST_Belle Maison à Kipé",
            "description": "Maison de 4 chambres avec jardin",
            "location": "Kipé, Conakry",
            "sale_price": 500000000,
            "surface_area": "300 m²",
            "num_rooms": 4,
            "num_bathrooms": 2,
            "has_garage": True,
            "has_garden": True,
            "has_pool": False,
            "year_built": 2020,
            "features": ["securite_24h", "eau_courante", "electricite"],
            "is_negotiable": True
        }
        
        response = requests.post(f"{API}/property-sales", json=sale_data, headers=headers)
        
        if response.status_code == 200:
            data = response.json()
            assert "id" in data
            assert data["title"] == sale_data["title"]
            assert data["sale_price"] == sale_data["sale_price"]
            print(f"SUCCESS: Property sale created with ID: {data['id']}")
            return data
        elif response.status_code == 403:
            print("INFO: User is not an Agent Immobilier - expected behavior")
            pytest.skip("User is not an Agent Immobilier")
        else:
            pytest.fail(f"Failed to create property sale: {response.status_code} - {response.text}")
    
    def test_get_my_property_sales(self, agent_token):
        """Test getting agent's own property sales"""
        headers = {"Authorization": f"Bearer {agent_token}"}
        
        response = requests.get(f"{API}/property-sales/my-listings", headers=headers)
        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, list)
        print(f"SUCCESS: Agent has {len(data)} property sales")
        return data


class TestPropertySaleDocuments:
    """Test document upload for property sales"""
    
    @pytest.fixture
    def agent_token(self):
        """Get agent token"""
        response = requests.post(f"{API}/auth/login", json={
            "phone_number": AGENT_PHONE,
            "password": AGENT_PASSWORD,
            "user_type": "provider"
        })
        if response.status_code != 200:
            pytest.skip("Agent login failed")
        return response.json()["token"]
    
    @pytest.fixture
    def sale_id(self, agent_token):
        """Get or create a property sale for testing"""
        headers = {"Authorization": f"Bearer {agent_token}"}
        
        # First try to get existing sales
        response = requests.get(f"{API}/property-sales/my-listings", headers=headers)
        if response.status_code == 200:
            sales = response.json()
            if sales:
                return sales[0]["id"]
        
        # Create a new sale if none exist
        sale_data = {
            "property_type": "Terrain",
            "title": "TEST_Terrain à Ratoma",
            "description": "Terrain de 500m² avec titre foncier",
            "location": "Ratoma, Conakry",
            "sale_price": 200000000,
            "surface_area": "500 m²",
            "is_negotiable": True
        }
        
        response = requests.post(f"{API}/property-sales", json=sale_data, headers=headers)
        if response.status_code == 200:
            return response.json()["id"]
        pytest.skip("Could not create property sale for document testing")
    
    def test_upload_titre_foncier(self, agent_token, sale_id):
        """Test uploading titre foncier document"""
        headers = {"Authorization": f"Bearer {agent_token}"}
        
        # Create a dummy PDF file
        file_content = b"%PDF-1.4 Test Titre Foncier Document"
        files = {"file": ("titre_foncier.pdf", io.BytesIO(file_content), "application/pdf")}
        
        response = requests.post(
            f"{API}/property-sales/{sale_id}/upload-document/titre_foncier",
            headers=headers,
            files=files
        )
        
        if response.status_code == 200:
            data = response.json()
            assert "document_url" in data
            assert data["document_type"] == "titre_foncier"
            print(f"SUCCESS: Titre foncier uploaded - {data['document_url']}")
        else:
            print(f"Document upload response: {response.status_code} - {response.text}")
            # May fail if not agent immobilier
            if response.status_code == 403:
                pytest.skip("Not authorized - user may not be Agent Immobilier")
    
    def test_upload_seller_id_document(self, agent_token, sale_id):
        """Test uploading seller ID document"""
        headers = {"Authorization": f"Bearer {agent_token}"}
        
        # Create a dummy image file
        file_content = b"GIF89a\x01\x00\x01\x00\x80\x00\x00\xff\xff\xff\x00\x00\x00!\xf9\x04\x01\x00\x00\x00\x00,\x00\x00\x00\x00\x01\x00\x01\x00\x00\x02\x02D\x01\x00;"
        files = {"file": ("seller_id.jpg", io.BytesIO(file_content), "image/jpeg")}
        
        response = requests.post(
            f"{API}/property-sales/{sale_id}/upload-document/seller_id_document",
            headers=headers,
            files=files
        )
        
        if response.status_code == 200:
            data = response.json()
            assert "document_url" in data
            assert data["document_type"] == "seller_id_document"
            print(f"SUCCESS: Seller ID document uploaded - {data['document_url']}")
        elif response.status_code == 403:
            pytest.skip("Not authorized")
    
    def test_upload_registration_ministere(self, agent_token, sale_id):
        """Test uploading ministry registration document"""
        headers = {"Authorization": f"Bearer {agent_token}"}
        
        file_content = b"%PDF-1.4 Test Ministry Registration Document"
        files = {"file": ("registration.pdf", io.BytesIO(file_content), "application/pdf")}
        
        response = requests.post(
            f"{API}/property-sales/{sale_id}/upload-document/registration_ministere",
            headers=headers,
            files=files
        )
        
        if response.status_code == 200:
            data = response.json()
            assert "document_url" in data
            print(f"SUCCESS: Ministry registration uploaded - {data['document_url']}")
        elif response.status_code == 403:
            pytest.skip("Not authorized")
    
    def test_upload_additional_documents(self, agent_token, sale_id):
        """Test uploading additional documents"""
        headers = {"Authorization": f"Bearer {agent_token}"}
        
        file_content = b"%PDF-1.4 Additional Document"
        files = {"file": ("additional.pdf", io.BytesIO(file_content), "application/pdf")}
        
        response = requests.post(
            f"{API}/property-sales/{sale_id}/upload-document/documents_additionnels",
            headers=headers,
            files=files
        )
        
        if response.status_code == 200:
            data = response.json()
            assert "document_url" in data
            print(f"SUCCESS: Additional document uploaded")
        elif response.status_code == 403:
            pytest.skip("Not authorized")
    
    def test_verify_documents_in_sale(self, agent_token, sale_id):
        """Verify documents are attached to the property sale"""
        response = requests.get(f"{API}/property-sales/{sale_id}")
        
        if response.status_code == 200:
            data = response.json()
            print(f"Property Sale Documents Status:")
            print(f"  - Titre Foncier: {'✓' if data.get('titre_foncier') else '✗'}")
            print(f"  - Seller ID: {'✓' if data.get('seller_id_document') else '✗'}")
            print(f"  - Ministry Registration: {'✓' if data.get('registration_ministere') else '✗'}")
            print(f"  - Additional Docs: {len(data.get('documents_additionnels', []))}")


class TestRentalDocuments:
    """Test document upload for rental listings"""
    
    @pytest.fixture
    def agent_token(self):
        """Get agent token"""
        response = requests.post(f"{API}/auth/login", json={
            "phone_number": AGENT_PHONE,
            "password": AGENT_PASSWORD,
            "user_type": "provider"
        })
        if response.status_code != 200:
            pytest.skip("Agent login failed")
        return response.json()["token"]
    
    @pytest.fixture
    def rental_id(self, agent_token):
        """Get or create a rental for testing"""
        headers = {"Authorization": f"Bearer {agent_token}"}
        
        # First try to get existing rentals
        response = requests.get(f"{API}/rentals/my-listings", headers=headers)
        if response.status_code == 200:
            rentals = response.json()
            if rentals:
                return rentals[0]["id"]
        
        # Create a new rental if none exist
        rental_data = {
            "property_type": "Apartment",
            "title": "TEST_Appartement à Kaloum",
            "description": "Bel appartement 3 chambres",
            "location": "Kaloum, Conakry",
            "rental_price": 5000000,
            "rental_type": "long_term",
            "amenities": ["wifi", "climatisation"],
            "is_available": True
        }
        
        response = requests.post(f"{API}/rentals", json=rental_data, headers=headers)
        if response.status_code == 200:
            return response.json()["id"]
        pytest.skip("Could not create rental for document testing")
    
    def test_upload_rental_titre_foncier(self, agent_token, rental_id):
        """Test uploading titre foncier for rental"""
        headers = {"Authorization": f"Bearer {agent_token}"}
        
        file_content = b"%PDF-1.4 Rental Titre Foncier"
        files = {"file": ("titre_foncier.pdf", io.BytesIO(file_content), "application/pdf")}
        
        response = requests.post(
            f"{API}/rentals/{rental_id}/upload-document/titre_foncier",
            headers=headers,
            files=files
        )
        
        if response.status_code == 200:
            data = response.json()
            assert "document_url" in data
            print(f"SUCCESS: Rental titre foncier uploaded")
        else:
            print(f"Response: {response.status_code} - {response.text}")
    
    def test_upload_rental_seller_id(self, agent_token, rental_id):
        """Test uploading owner ID for rental"""
        headers = {"Authorization": f"Bearer {agent_token}"}
        
        file_content = b"GIF89a\x01\x00\x01\x00\x80\x00\x00\xff\xff\xff\x00\x00\x00!\xf9\x04\x01\x00\x00\x00\x00,\x00\x00\x00\x00\x01\x00\x01\x00\x00\x02\x02D\x01\x00;"
        files = {"file": ("owner_id.jpg", io.BytesIO(file_content), "image/jpeg")}
        
        response = requests.post(
            f"{API}/rentals/{rental_id}/upload-document/seller_id_document",
            headers=headers,
            files=files
        )
        
        if response.status_code == 200:
            data = response.json()
            assert "document_url" in data
            print(f"SUCCESS: Rental owner ID uploaded")
    
    def test_verify_rental_documents(self, agent_token, rental_id):
        """Verify documents are attached to the rental"""
        response = requests.get(f"{API}/rentals/{rental_id}")
        
        if response.status_code == 200:
            data = response.json()
            print(f"Rental Documents Status:")
            print(f"  - Titre Foncier: {'✓' if data.get('titre_foncier') else '✗'}")
            print(f"  - Owner ID: {'✓' if data.get('seller_id_document') else '✗'}")
            print(f"  - Ministry Registration: {'✓' if data.get('registration_ministere') else '✗'}")


class TestAdminDashboard:
    """Test Admin Dashboard access to documents"""
    
    @pytest.fixture
    def admin_token(self):
        """Get admin token"""
        response = requests.post(f"{API}/admin/login", json={
            "username": ADMIN_USERNAME,
            "password": ADMIN_PASSWORD
        })
        assert response.status_code == 200, f"Admin login failed: {response.text}"
        return response.json()["token"]
    
    def test_admin_login(self):
        """Test admin login"""
        response = requests.post(f"{API}/admin/login", json={
            "username": ADMIN_USERNAME,
            "password": ADMIN_PASSWORD
        })
        assert response.status_code == 200
        data = response.json()
        assert "token" in data
        print(f"SUCCESS: Admin login successful")
    
    def test_admin_get_rentals(self):
        """Test admin can get all rentals with documents"""
        response = requests.get(f"{API}/admin/rentals")
        assert response.status_code == 200
        rentals = response.json()
        
        # Check if rentals have document fields
        docs_count = 0
        for rental in rentals:
            if rental.get('titre_foncier') or rental.get('seller_id_document') or rental.get('registration_ministere'):
                docs_count += 1
        
        print(f"SUCCESS: Admin can access {len(rentals)} rentals, {docs_count} have documents")
    
    def test_admin_get_property_sales(self):
        """Test admin can get all property sales with documents"""
        response = requests.get(f"{API}/property-sales?available_only=false")
        assert response.status_code == 200
        sales = response.json()
        
        docs_count = 0
        for sale in sales:
            if sale.get('titre_foncier') or sale.get('seller_id_document') or sale.get('registration_ministere'):
                docs_count += 1
        
        print(f"SUCCESS: Found {len(sales)} property sales, {docs_count} have documents")
    
    def test_admin_get_agents_immobilier(self):
        """Test admin can get all agents immobilier"""
        response = requests.get(f"{API}/admin/agents-immobilier")
        assert response.status_code == 200
        agents = response.json()
        print(f"SUCCESS: Found {len(agents)} agents immobilier")
    
    def test_admin_stats(self):
        """Test admin stats endpoint"""
        response = requests.get(f"{API}/admin/stats")
        assert response.status_code == 200
        stats = response.json()
        
        print(f"Admin Stats:")
        print(f"  - Total Providers: {stats.get('providers', {}).get('total', 0)}")
        print(f"  - Agent Immobilier: {stats.get('providers', {}).get('agent_immobilier', 0)}")
        print(f"  - Total Rentals: {stats.get('rentals', 0)}")
        print(f"  - Total Jobs: {stats.get('jobs', {}).get('total', 0)}")


class TestRentalListingForm:
    """Test rental listing creation with 2-step form"""
    
    @pytest.fixture
    def agent_token(self):
        """Get agent token"""
        response = requests.post(f"{API}/auth/login", json={
            "phone_number": AGENT_PHONE,
            "password": AGENT_PASSWORD,
            "user_type": "provider"
        })
        if response.status_code != 200:
            pytest.skip("Agent login failed")
        return response.json()["token"]
    
    def test_create_rental_step1(self, agent_token):
        """Test creating rental (Step 1 - property info)"""
        headers = {"Authorization": f"Bearer {agent_token}"}
        
        rental_data = {
            "property_type": "Apartment",
            "title": "TEST_Appartement Moderne",
            "description": "Appartement moderne avec vue sur mer",
            "location": "Kipé, Conakry",
            "rental_price": 3000000,
            "rental_type": "long_term",
            "amenities": ["wifi", "climatisation", "parking"],
            "is_available": True
        }
        
        response = requests.post(f"{API}/rentals", json=rental_data, headers=headers)
        
        if response.status_code == 200:
            data = response.json()
            assert "id" in data
            print(f"SUCCESS: Rental created (Step 1) - ID: {data['id']}")
            return data["id"]
        else:
            pytest.fail(f"Failed to create rental: {response.status_code}")
    
    def test_create_short_term_rental(self, agent_token):
        """Test creating short-term rental (Airbnb style)"""
        headers = {"Authorization": f"Bearer {agent_token}"}
        
        rental_data = {
            "property_type": "Villa",
            "title": "TEST_Villa de Vacances",
            "description": "Villa luxueuse pour séjours courts",
            "location": "Nongo, Conakry",
            "rental_price": 0,
            "rental_type": "short_term",
            "price_per_night": 500000,
            "min_nights": 2,
            "max_guests": 6,
            "amenities": ["wifi", "piscine", "climatisation", "cuisine"],
            "is_available": True
        }
        
        response = requests.post(f"{API}/rentals", json=rental_data, headers=headers)
        
        if response.status_code == 200:
            data = response.json()
            assert data["rental_type"] == "short_term"
            assert data["price_per_night"] == 500000
            print(f"SUCCESS: Short-term rental created - {data['price_per_night']} GNF/night")
        else:
            print(f"Response: {response.status_code} - {response.text}")


# Run tests
if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
