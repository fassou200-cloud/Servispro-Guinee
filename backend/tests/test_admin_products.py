"""
Admin Product Management API Tests
Tests for admin endpoints to view, edit, and delete company products and photos
"""
import pytest
import requests
import os
import uuid

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')

# Admin credentials
ADMIN_USERNAME = "servispro@servisprogn.com"
ADMIN_PASSWORD = "Servisproguinea2026#"

# Test company with products
TEST_COMPANY_ID = "f10f8092-ed6a-4c60-aeb3-69b9af627cde"


@pytest.fixture(scope="module")
def admin_token():
    """Get admin authentication token"""
    response = requests.post(
        f"{BASE_URL}/api/admin/login",
        json={"username": ADMIN_USERNAME, "password": ADMIN_PASSWORD}
    )
    assert response.status_code == 200, f"Admin login failed: {response.text}"
    return response.json()["token"]


@pytest.fixture(scope="module")
def admin_headers(admin_token):
    """Headers with admin auth token"""
    return {
        "Authorization": f"Bearer {admin_token}",
        "Content-Type": "application/json"
    }


class TestAdminLogin:
    """Admin authentication tests"""
    
    def test_admin_login_success(self):
        """Test admin login with valid credentials"""
        response = requests.post(
            f"{BASE_URL}/api/admin/login",
            json={"username": ADMIN_USERNAME, "password": ADMIN_PASSWORD}
        )
        assert response.status_code == 200
        data = response.json()
        assert "token" in data
        assert "user" in data
        assert data["user"]["username"] == ADMIN_USERNAME
        assert data["user"]["role"] == "super-admin"
    
    def test_admin_login_invalid_credentials(self):
        """Test admin login with wrong credentials"""
        response = requests.post(
            f"{BASE_URL}/api/admin/login",
            json={"username": "wrong@email.com", "password": "wrongpassword"}
        )
        assert response.status_code == 401


class TestAdminGetCompanyProducts:
    """Tests for GET /api/admin/companies/{company_id}/products"""
    
    def test_get_company_products_success(self, admin_headers):
        """Test fetching products for a company with products"""
        response = requests.get(
            f"{BASE_URL}/api/admin/companies/{TEST_COMPANY_ID}/products",
            headers=admin_headers
        )
        assert response.status_code == 200
        products = response.json()
        assert isinstance(products, list)
        assert len(products) > 0, "Expected company to have products"
        
        # Verify product structure
        product = products[0]
        assert "id" in product
        assert "name" in product
        assert "description" in product
        assert "price" in product
        assert "photos" in product
        assert "is_available" in product
        assert "total_views" in product
    
    def test_get_company_products_with_photos(self, admin_headers):
        """Test that products include photo URLs"""
        response = requests.get(
            f"{BASE_URL}/api/admin/companies/{TEST_COMPANY_ID}/products",
            headers=admin_headers
        )
        assert response.status_code == 200
        products = response.json()
        
        # Find a product with photos
        products_with_photos = [p for p in products if p.get("photos") and len(p["photos"]) > 0]
        assert len(products_with_photos) > 0, "Expected at least one product with photos"
        
        # Verify photo URLs are valid Cloudinary URLs
        product = products_with_photos[0]
        for photo_url in product["photos"]:
            assert "cloudinary" in photo_url or photo_url.startswith("http")
    
    def test_get_company_products_nonexistent_company(self, admin_headers):
        """Test fetching products for a company that doesn't exist"""
        fake_company_id = str(uuid.uuid4())
        response = requests.get(
            f"{BASE_URL}/api/admin/companies/{fake_company_id}/products",
            headers=admin_headers
        )
        # Should return empty list, not error
        assert response.status_code == 200
        products = response.json()
        assert products == []
    
    def test_get_company_products_without_auth(self):
        """Test that endpoint requires authentication"""
        response = requests.get(
            f"{BASE_URL}/api/admin/companies/{TEST_COMPANY_ID}/products"
        )
        assert response.status_code in [401, 403]


class TestAdminUpdateProduct:
    """Tests for PUT /api/admin/products/{product_id}"""
    
    def test_update_product_name(self, admin_headers):
        """Test updating product name"""
        # First get a product
        response = requests.get(
            f"{BASE_URL}/api/admin/companies/{TEST_COMPANY_ID}/products",
            headers=admin_headers
        )
        products = response.json()
        assert len(products) > 0
        product = products[0]
        original_name = product["name"]
        
        # Update the product name
        new_name = f"TEST_Updated_{original_name}"
        response = requests.put(
            f"{BASE_URL}/api/admin/products/{product['id']}",
            headers=admin_headers,
            json={"name": new_name}
        )
        assert response.status_code == 200
        updated = response.json()
        assert updated["name"] == new_name
        
        # Restore original name
        response = requests.put(
            f"{BASE_URL}/api/admin/products/{product['id']}",
            headers=admin_headers,
            json={"name": original_name}
        )
        assert response.status_code == 200
    
    def test_update_product_price(self, admin_headers):
        """Test updating product price"""
        # Get a product
        response = requests.get(
            f"{BASE_URL}/api/admin/companies/{TEST_COMPANY_ID}/products",
            headers=admin_headers
        )
        products = response.json()
        product = products[0]
        original_price = product["price"]
        
        # Update price
        new_price = 999999
        response = requests.put(
            f"{BASE_URL}/api/admin/products/{product['id']}",
            headers=admin_headers,
            json={"price": new_price}
        )
        assert response.status_code == 200
        updated = response.json()
        assert updated["price"] == new_price
        
        # Restore original price
        response = requests.put(
            f"{BASE_URL}/api/admin/products/{product['id']}",
            headers=admin_headers,
            json={"price": original_price}
        )
        assert response.status_code == 200
    
    def test_update_product_availability(self, admin_headers):
        """Test updating product availability status"""
        # Get a product
        response = requests.get(
            f"{BASE_URL}/api/admin/companies/{TEST_COMPANY_ID}/products",
            headers=admin_headers
        )
        products = response.json()
        product = products[0]
        original_available = product.get("is_available", True)
        
        # Toggle availability
        response = requests.put(
            f"{BASE_URL}/api/admin/products/{product['id']}",
            headers=admin_headers,
            json={"is_available": not original_available}
        )
        assert response.status_code == 200
        updated = response.json()
        assert updated["is_available"] == (not original_available)
        
        # Restore original
        response = requests.put(
            f"{BASE_URL}/api/admin/products/{product['id']}",
            headers=admin_headers,
            json={"is_available": original_available}
        )
        assert response.status_code == 200
    
    def test_update_nonexistent_product(self, admin_headers):
        """Test updating a product that doesn't exist"""
        fake_product_id = str(uuid.uuid4())
        response = requests.put(
            f"{BASE_URL}/api/admin/products/{fake_product_id}",
            headers=admin_headers,
            json={"name": "Test Name"}
        )
        assert response.status_code == 404
    
    def test_update_product_without_auth(self):
        """Test that update requires authentication"""
        response = requests.put(
            f"{BASE_URL}/api/admin/products/some-id",
            json={"name": "Test"}
        )
        assert response.status_code in [401, 403]


class TestAdminDeleteProduct:
    """Tests for DELETE /api/admin/products/{product_id}"""
    
    def test_delete_nonexistent_product(self, admin_headers):
        """Test deleting a product that doesn't exist"""
        fake_product_id = str(uuid.uuid4())
        response = requests.delete(
            f"{BASE_URL}/api/admin/products/{fake_product_id}",
            headers=admin_headers
        )
        assert response.status_code == 404
    
    def test_delete_product_without_auth(self):
        """Test that delete requires authentication"""
        response = requests.delete(
            f"{BASE_URL}/api/admin/products/some-id"
        )
        assert response.status_code in [401, 403]


class TestAdminDeleteProductPhoto:
    """Tests for DELETE /api/admin/products/{product_id}/photos/{photo_index}"""
    
    def test_delete_photo_invalid_index(self, admin_headers):
        """Test deleting photo with invalid index"""
        # Get a product with photos
        response = requests.get(
            f"{BASE_URL}/api/admin/companies/{TEST_COMPANY_ID}/products",
            headers=admin_headers
        )
        products = response.json()
        products_with_photos = [p for p in products if p.get("photos") and len(p["photos"]) > 0]
        
        if products_with_photos:
            product = products_with_photos[0]
            # Try to delete photo at invalid index
            invalid_index = len(product["photos"]) + 10
            response = requests.delete(
                f"{BASE_URL}/api/admin/products/{product['id']}/photos/{invalid_index}",
                headers=admin_headers
            )
            assert response.status_code == 400
    
    def test_delete_photo_nonexistent_product(self, admin_headers):
        """Test deleting photo from nonexistent product"""
        fake_product_id = str(uuid.uuid4())
        response = requests.delete(
            f"{BASE_URL}/api/admin/products/{fake_product_id}/photos/0",
            headers=admin_headers
        )
        assert response.status_code == 404
    
    def test_delete_photo_without_auth(self):
        """Test that photo delete requires authentication"""
        response = requests.delete(
            f"{BASE_URL}/api/admin/products/some-id/photos/0"
        )
        assert response.status_code in [401, 403]


class TestAdminProductDataIntegrity:
    """Tests for data integrity and response structure"""
    
    def test_product_response_structure(self, admin_headers):
        """Verify product response has all required fields"""
        response = requests.get(
            f"{BASE_URL}/api/admin/companies/{TEST_COMPANY_ID}/products",
            headers=admin_headers
        )
        assert response.status_code == 200
        products = response.json()
        
        if len(products) > 0:
            product = products[0]
            required_fields = ["id", "name", "description", "price", "photos", "is_available"]
            for field in required_fields:
                assert field in product, f"Missing required field: {field}"
    
    def test_product_photos_are_array(self, admin_headers):
        """Verify photos field is always an array"""
        response = requests.get(
            f"{BASE_URL}/api/admin/companies/{TEST_COMPANY_ID}/products",
            headers=admin_headers
        )
        products = response.json()
        
        for product in products:
            assert isinstance(product.get("photos", []), list), f"Photos should be array for product {product['id']}"
    
    def test_update_returns_updated_product(self, admin_headers):
        """Verify update endpoint returns the updated product"""
        response = requests.get(
            f"{BASE_URL}/api/admin/companies/{TEST_COMPANY_ID}/products",
            headers=admin_headers
        )
        products = response.json()
        product = products[0]
        
        # Update with same data
        response = requests.put(
            f"{BASE_URL}/api/admin/products/{product['id']}",
            headers=admin_headers,
            json={"name": product["name"]}
        )
        assert response.status_code == 200
        updated = response.json()
        
        # Verify response is the full product object
        assert "id" in updated
        assert "name" in updated
        assert "photos" in updated
        assert updated["id"] == product["id"]


if __name__ == "__main__":
    pytest.main([__file__, "-v"])
