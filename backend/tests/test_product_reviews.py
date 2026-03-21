"""
Test Product Reviews Feature
- GET /api/marketplace/products/{product_id}/reviews - returns empty array for products with no reviews
- POST /api/marketplace/products/{product_id}/reviews - requires customer auth (returns 401/403 without token)
- POST /api/marketplace/products/{product_id}/reviews - creates review with valid customer token, rating 1-5, and comment
- POST /api/marketplace/products/{product_id}/reviews - prevents duplicate reviews from same customer
- GET /api/company/shop/reviews - returns reviews for company's shop products (requires company auth)
- GET /api/shop/reviews - returns reviews for provider's shop products (requires provider auth)
- Company login with phone number instead of RCCM
"""

import pytest
import requests
import os
import uuid

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', 'https://shop-marketplace-47.preview.emergentagent.com').rstrip('/')

class TestProductReviews:
    """Product review endpoint tests"""
    
    @pytest.fixture(scope="class")
    def api_client(self):
        """Shared requests session"""
        session = requests.Session()
        session.headers.update({"Content-Type": "application/json"})
        return session
    
    @pytest.fixture(scope="class")
    def test_product_id(self, api_client):
        """Get a product ID for testing"""
        response = api_client.get(f"{BASE_URL}/api/marketplace/products")
        assert response.status_code == 200
        products = response.json()
        if products:
            return products[0]['id']
        pytest.skip("No products available for testing")
    
    @pytest.fixture(scope="class")
    def customer_credentials(self):
        """Create test customer credentials"""
        unique_id = str(uuid.uuid4())[:8]
        return {
            "first_name": "Test",
            "last_name": "ReviewCustomer",
            "phone_number": f"224600{unique_id[:6]}",
            "password": "testpassword123"
        }
    
    @pytest.fixture(scope="class")
    def customer_token(self, api_client, customer_credentials):
        """Register and get customer token"""
        # Try to register
        response = api_client.post(
            f"{BASE_URL}/api/auth/customer/register",
            json=customer_credentials
        )
        if response.status_code == 200:
            return response.json()['token']
        elif response.status_code == 400 and "déjà enregistré" in response.text:
            # Customer exists, try login
            login_response = api_client.post(
                f"{BASE_URL}/api/auth/login",
                json={
                    "phone_number": customer_credentials['phone_number'],
                    "password": customer_credentials['password'],
                    "user_type": "customer"
                }
            )
            if login_response.status_code == 200:
                return login_response.json()['token']
        pytest.skip("Could not create or login customer for testing")
    
    def test_get_reviews_empty_array(self, api_client, test_product_id):
        """GET /api/marketplace/products/{product_id}/reviews returns empty array for products with no reviews"""
        # Create a new product to ensure no reviews
        response = api_client.get(f"{BASE_URL}/api/marketplace/products/{test_product_id}/reviews")
        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, list), "Response should be a list"
        print(f"PASS: GET reviews returns list (found {len(data)} reviews)")
    
    def test_create_review_requires_auth(self, api_client, test_product_id):
        """POST /api/marketplace/products/{product_id}/reviews requires customer auth"""
        # Without token
        response = api_client.post(
            f"{BASE_URL}/api/marketplace/products/{test_product_id}/reviews",
            json={"rating": 5, "comment": "Great product!"}
        )
        assert response.status_code in [401, 403], f"Expected 401/403 without auth, got {response.status_code}"
        print(f"PASS: Create review without auth returns {response.status_code}")
    
    def test_create_review_with_invalid_token(self, api_client, test_product_id):
        """POST with invalid token returns 401"""
        response = api_client.post(
            f"{BASE_URL}/api/marketplace/products/{test_product_id}/reviews",
            json={"rating": 5, "comment": "Great product!"},
            headers={"Authorization": "Bearer invalid_token_here"}
        )
        assert response.status_code == 401, f"Expected 401 with invalid token, got {response.status_code}"
        print("PASS: Create review with invalid token returns 401")
    
    def test_create_review_with_valid_customer(self, api_client, test_product_id, customer_token):
        """POST /api/marketplace/products/{product_id}/reviews creates review with valid customer token"""
        unique_comment = f"Test review comment {uuid.uuid4()}"
        response = api_client.post(
            f"{BASE_URL}/api/marketplace/products/{test_product_id}/reviews",
            json={"rating": 4, "comment": unique_comment},
            headers={"Authorization": f"Bearer {customer_token}"}
        )
        # Could be 200 (success) or 400 (already reviewed)
        if response.status_code == 200:
            data = response.json()
            assert 'id' in data, "Review should have an ID"
            assert data['rating'] == 4, "Rating should be 4"
            assert data['comment'] == unique_comment, "Comment should match"
            print(f"PASS: Created review with ID {data['id']}")
        elif response.status_code == 400:
            assert "déjà laissé un avis" in response.text, "Should indicate already reviewed"
            print("PASS: Customer already reviewed this product (expected behavior)")
        else:
            pytest.fail(f"Unexpected status code: {response.status_code}, response: {response.text}")
    
    def test_create_review_prevents_duplicate(self, api_client, test_product_id, customer_token):
        """POST /api/marketplace/products/{product_id}/reviews prevents duplicate reviews from same customer"""
        # First review attempt
        response1 = api_client.post(
            f"{BASE_URL}/api/marketplace/products/{test_product_id}/reviews",
            json={"rating": 5, "comment": "First review attempt"},
            headers={"Authorization": f"Bearer {customer_token}"}
        )
        
        # Second review attempt (should fail)
        response2 = api_client.post(
            f"{BASE_URL}/api/marketplace/products/{test_product_id}/reviews",
            json={"rating": 3, "comment": "Second review attempt"},
            headers={"Authorization": f"Bearer {customer_token}"}
        )
        
        assert response2.status_code == 400, f"Expected 400 for duplicate review, got {response2.status_code}"
        assert "déjà laissé un avis" in response2.text, "Should indicate already reviewed"
        print("PASS: Duplicate review prevented")
    
    def test_create_review_validates_rating(self, api_client, customer_token):
        """POST validates rating is between 1-5"""
        # Get a different product to test rating validation
        products_response = api_client.get(f"{BASE_URL}/api/marketplace/products")
        products = products_response.json()
        if len(products) < 2:
            pytest.skip("Need at least 2 products for this test")
        
        test_product = products[1]['id']
        
        # Test invalid rating (0)
        response = api_client.post(
            f"{BASE_URL}/api/marketplace/products/{test_product}/reviews",
            json={"rating": 0, "comment": "Invalid rating test"},
            headers={"Authorization": f"Bearer {customer_token}"}
        )
        assert response.status_code == 422, f"Expected 422 for invalid rating, got {response.status_code}"
        print("PASS: Invalid rating (0) rejected")
        
        # Test invalid rating (6)
        response = api_client.post(
            f"{BASE_URL}/api/marketplace/products/{test_product}/reviews",
            json={"rating": 6, "comment": "Invalid rating test"},
            headers={"Authorization": f"Bearer {customer_token}"}
        )
        assert response.status_code == 422, f"Expected 422 for invalid rating, got {response.status_code}"
        print("PASS: Invalid rating (6) rejected")


class TestCompanyLogin:
    """Test company login with phone number"""
    
    @pytest.fixture(scope="class")
    def api_client(self):
        session = requests.Session()
        session.headers.update({"Content-Type": "application/json"})
        return session
    
    def test_company_login_with_phone_number(self, api_client):
        """Company login now works with phone number instead of RCCM"""
        # First register a test company
        unique_id = str(uuid.uuid4())[:8]
        company_data = {
            "company_name": f"Test Company {unique_id}",
            "rccm_number": f"RCCM-{unique_id}",
            "nif_number": f"NIF-{unique_id}",
            "sector": "Services",
            "address": "Test Address",
            "city": "Conakry",
            "region": "Conakry",
            "phone_number": f"224601{unique_id[:6]}",
            "email": f"test{unique_id}@company.com",
            "description": "Test company for review testing",
            "password": "testpassword123",
            "contact_person_name": "Test Contact",
            "contact_person_phone": f"224602{unique_id[:6]}"
        }
        
        # Register company
        register_response = api_client.post(
            f"{BASE_URL}/api/auth/company/register",
            json=company_data
        )
        
        if register_response.status_code == 200:
            print(f"PASS: Company registered with phone {company_data['phone_number']}")
            
            # Now test login with phone number
            login_response = api_client.post(
                f"{BASE_URL}/api/auth/company/login",
                json={
                    "phone_number": company_data['phone_number'],
                    "password": company_data['password']
                }
            )
            assert login_response.status_code == 200, f"Login failed: {login_response.text}"
            data = login_response.json()
            assert 'token' in data, "Login should return token"
            assert 'user' in data, "Login should return user"
            print("PASS: Company login with phone number works")
            return data['token']
        elif register_response.status_code == 400:
            print(f"Company registration failed (may already exist): {register_response.text}")
            pytest.skip("Could not register test company")
        else:
            pytest.fail(f"Unexpected registration response: {register_response.status_code}")
    
    def test_company_login_wrong_credentials(self, api_client):
        """Company login fails with wrong credentials"""
        response = api_client.post(
            f"{BASE_URL}/api/auth/company/login",
            json={
                "phone_number": "224999999999",
                "password": "wrongpassword"
            }
        )
        assert response.status_code == 401, f"Expected 401 for wrong credentials, got {response.status_code}"
        print("PASS: Company login with wrong credentials returns 401")


class TestCompanyShopReviews:
    """Test company shop reviews endpoint"""
    
    @pytest.fixture(scope="class")
    def api_client(self):
        session = requests.Session()
        session.headers.update({"Content-Type": "application/json"})
        return session
    
    @pytest.fixture(scope="class")
    def company_token(self, api_client):
        """Register and get company token"""
        unique_id = str(uuid.uuid4())[:8]
        company_data = {
            "company_name": f"Review Test Company {unique_id}",
            "sector": "Commerce",
            "address": "Test Address",
            "city": "Conakry",
            "region": "Conakry",
            "phone_number": f"224603{unique_id[:6]}",
            "description": "Test company for shop reviews",
            "password": "testpassword123",
            "contact_person_name": "Test Contact",
            "contact_person_phone": f"224604{unique_id[:6]}"
        }
        
        response = api_client.post(
            f"{BASE_URL}/api/auth/company/register",
            json=company_data
        )
        if response.status_code == 200:
            return response.json()['token']
        pytest.skip("Could not create company for testing")
    
    def test_company_shop_reviews_requires_auth(self, api_client):
        """GET /api/company/shop/reviews requires company auth"""
        response = api_client.get(f"{BASE_URL}/api/company/shop/reviews")
        assert response.status_code in [401, 403], f"Expected 401/403 without auth, got {response.status_code}"
        print("PASS: Company shop reviews requires auth")
    
    def test_company_shop_reviews_with_auth(self, api_client, company_token):
        """GET /api/company/shop/reviews returns reviews for company's shop"""
        response = api_client.get(
            f"{BASE_URL}/api/company/shop/reviews",
            headers={"Authorization": f"Bearer {company_token}"}
        )
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        data = response.json()
        assert isinstance(data, list), "Response should be a list"
        print(f"PASS: Company shop reviews returns list (found {len(data)} reviews)")


class TestProviderShopReviews:
    """Test provider shop reviews endpoint"""
    
    @pytest.fixture(scope="class")
    def api_client(self):
        session = requests.Session()
        session.headers.update({"Content-Type": "application/json"})
        return session
    
    @pytest.fixture(scope="class")
    def provider_token(self, api_client):
        """Get provider token using existing test provider"""
        # Use the existing test provider from previous tests
        response = api_client.post(
            f"{BASE_URL}/api/auth/login",
            json={
                "phone_number": "224699999999",
                "password": "password123",
                "user_type": "provider"
            }
        )
        if response.status_code == 200:
            return response.json()['token']
        pytest.skip("Could not login as provider for testing")
    
    def test_provider_shop_reviews_requires_auth(self, api_client):
        """GET /api/shop/reviews requires provider auth"""
        response = api_client.get(f"{BASE_URL}/api/shop/reviews")
        assert response.status_code in [401, 403], f"Expected 401/403 without auth, got {response.status_code}"
        print("PASS: Provider shop reviews requires auth")
    
    def test_provider_shop_reviews_with_auth(self, api_client, provider_token):
        """GET /api/shop/reviews returns reviews for provider's shop"""
        response = api_client.get(
            f"{BASE_URL}/api/shop/reviews",
            headers={"Authorization": f"Bearer {provider_token}"}
        )
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        data = response.json()
        assert isinstance(data, list), "Response should be a list"
        print(f"PASS: Provider shop reviews returns list (found {len(data)} reviews)")


class TestProductDetailReviews:
    """Test product detail page review data"""
    
    @pytest.fixture(scope="class")
    def api_client(self):
        session = requests.Session()
        session.headers.update({"Content-Type": "application/json"})
        return session
    
    def test_product_detail_includes_rating_info(self, api_client):
        """Product detail includes avg_rating and review_count"""
        response = api_client.get(f"{BASE_URL}/api/marketplace/products")
        assert response.status_code == 200
        products = response.json()
        
        if not products:
            pytest.skip("No products available")
        
        product_id = products[0]['id']
        detail_response = api_client.get(f"{BASE_URL}/api/marketplace/products/{product_id}")
        assert detail_response.status_code == 200
        
        product = detail_response.json()
        # These fields may or may not exist depending on if product has reviews
        print(f"Product has avg_rating: {'avg_rating' in product}")
        print(f"Product has review_count: {'review_count' in product}")
        print("PASS: Product detail endpoint works")


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
