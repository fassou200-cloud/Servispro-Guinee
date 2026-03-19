"""
Test Suite for ServisPro Marketplace Endpoints
Tests cover: shops, products, categories, and messages
"""
import pytest
import requests
import os
import uuid
import time

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL')
if BASE_URL:
    BASE_URL = BASE_URL.rstrip('/')
else:
    raise ValueError("REACT_APP_BACKEND_URL not set")

API = f"{BASE_URL}/api"

# Test credentials
PROVIDER_PHONE = "224699999999"
PROVIDER_PASSWORD = "password123"
PROVIDER_2_PHONE = "224620333444"
PROVIDER_2_PASSWORD = "password123"

@pytest.fixture(scope="module")
def api_client():
    """Shared requests session"""
    session = requests.Session()
    session.headers.update({"Content-Type": "application/json"})
    return session

@pytest.fixture(scope="module")
def provider_token(api_client):
    """Get provider auth token"""
    response = api_client.post(f"{API}/auth/login", json={
        "phone_number": PROVIDER_PHONE,
        "password": PROVIDER_PASSWORD,
        "user_type": "provider"
    })
    if response.status_code == 200:
        return response.json().get("token")
    pytest.skip(f"Provider authentication failed: {response.status_code} - {response.text}")

@pytest.fixture(scope="module")
def provider_2_token(api_client):
    """Get second provider auth token"""
    response = api_client.post(f"{API}/auth/login", json={
        "phone_number": PROVIDER_2_PHONE,
        "password": PROVIDER_2_PASSWORD,
        "user_type": "provider"
    })
    if response.status_code == 200:
        return response.json().get("token")
    pytest.skip(f"Provider 2 authentication failed: {response.status_code} - {response.text}")


class TestProductCategories:
    """Test product categories endpoints"""
    
    def test_get_public_product_categories(self, api_client):
        """GET /api/product-categories - Returns public categories list"""
        response = api_client.get(f"{API}/product-categories")
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        data = response.json()
        assert isinstance(data, list), "Response should be a list"
        print(f"Found {len(data)} product categories")
        
        # If categories exist, verify structure
        if len(data) > 0:
            category = data[0]
            assert "id" in category, "Category should have 'id' field"
            assert "name" in category, "Category should have 'name' field"


class TestMarketplaceShops:
    """Test marketplace shops endpoints"""
    
    def test_get_marketplace_shops(self, api_client):
        """GET /api/marketplace/shops - Returns shops list"""
        response = api_client.get(f"{API}/marketplace/shops")
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        data = response.json()
        assert isinstance(data, list), "Response should be a list"
        print(f"Found {len(data)} shops in marketplace")
        
        # If shops exist, verify structure
        if len(data) > 0:
            shop = data[0]
            assert "id" in shop, "Shop should have 'id' field"
            assert "name" in shop, "Shop should have 'name' field"
            assert "sector" in shop, "Shop should have 'sector' field"
            assert "description" in shop, "Shop should have 'description' field"
            print(f"Sample shop: {shop.get('name')} - {shop.get('sector')}")
    
    def test_get_marketplace_shops_with_search(self, api_client):
        """GET /api/marketplace/shops?search=X - Search filter works"""
        response = api_client.get(f"{API}/marketplace/shops?search=test")
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        data = response.json()
        assert isinstance(data, list), "Response should be a list"
        print(f"Found {len(data)} shops matching 'test' search")
    
    def test_get_marketplace_shops_with_sector(self, api_client):
        """GET /api/marketplace/shops?sector=X - Sector filter works"""
        response = api_client.get(f"{API}/marketplace/shops?sector=Commerce général")
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        data = response.json()
        assert isinstance(data, list), "Response should be a list"
        print(f"Found {len(data)} shops in 'Commerce général' sector")


class TestMarketplaceProducts:
    """Test marketplace products endpoints"""
    
    def test_get_marketplace_products(self, api_client):
        """GET /api/marketplace/products - Returns products list"""
        response = api_client.get(f"{API}/marketplace/products")
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        data = response.json()
        assert isinstance(data, list), "Response should be a list"
        print(f"Found {len(data)} products in marketplace")
        
        # If products exist, verify structure
        if len(data) > 0:
            product = data[0]
            assert "id" in product, "Product should have 'id' field"
            assert "name" in product, "Product should have 'name' field"
            assert "price" in product, "Product should have 'price' field"
            assert "shop_id" in product, "Product should have 'shop_id' field"
            print(f"Sample product: {product.get('name')} - {product.get('price')} GNF")
    
    def test_get_marketplace_products_with_search(self, api_client):
        """GET /api/marketplace/products?search=X - Search filter works"""
        response = api_client.get(f"{API}/marketplace/products?search=test")
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        data = response.json()
        assert isinstance(data, list), "Response should be a list"
        print(f"Found {len(data)} products matching 'test' search")
    
    def test_get_marketplace_products_with_sort(self, api_client):
        """GET /api/marketplace/products?sort_by=price_asc - Sort works"""
        response = api_client.get(f"{API}/marketplace/products?sort_by=price_asc")
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        data = response.json()
        assert isinstance(data, list), "Response should be a list"
        
        # Verify sorting if multiple products exist
        if len(data) > 1:
            for i in range(len(data) - 1):
                assert data[i].get('price', 0) <= data[i+1].get('price', float('inf')), "Products should be sorted by price ascending"
        print(f"Products sorted by price ascending - {len(data)} products")


class TestShopCreationAndManagement:
    """Test shop creation and management for authenticated providers"""
    
    def test_get_my_shop_no_auth(self, api_client):
        """GET /api/shop/my-shop without auth - Should fail"""
        response = api_client.get(f"{API}/shop/my-shop")
        assert response.status_code == 403, f"Expected 403 without auth, got {response.status_code}"
    
    def test_get_my_shop_with_auth(self, api_client, provider_token):
        """GET /api/shop/my-shop - Returns shop or null"""
        headers = {"Authorization": f"Bearer {provider_token}"}
        response = api_client.get(f"{API}/shop/my-shop", headers=headers)
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        data = response.json()
        if data:
            assert "id" in data, "Shop should have 'id' field"
            assert "name" in data, "Shop should have 'name' field"
            print(f"Provider has shop: {data.get('name')}")
        else:
            print("Provider does not have a shop yet")
    
    def test_create_shop(self, api_client, provider_2_token):
        """POST /api/shop/create - Creates a shop for provider"""
        headers = {"Authorization": f"Bearer {provider_2_token}"}
        
        # First check if shop already exists
        check_response = api_client.get(f"{API}/shop/my-shop", headers=headers)
        if check_response.status_code == 200 and check_response.json():
            print("Shop already exists for this provider, skipping creation")
            pytest.skip("Shop already exists")
        
        shop_data = {
            "name": f"TEST_Boutique_{uuid.uuid4().hex[:8]}",
            "description": "Test shop for marketplace testing",
            "sector": "Commerce général",
            "contact_phone": "+224620333444",
            "contact_email": "test@example.com",
            "location": "Conakry, Kaloum"
        }
        
        response = api_client.post(f"{API}/shop/create", json=shop_data, headers=headers)
        
        if response.status_code == 400 and "déjà une boutique" in response.text.lower():
            print("Provider already has a shop")
            pytest.skip("Provider already has a shop")
        
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        data = response.json()
        assert data.get("name") == shop_data["name"], "Shop name should match"
        assert data.get("sector") == shop_data["sector"], "Shop sector should match"
        assert "id" in data, "Shop should have an ID"
        print(f"Created shop: {data.get('name')}")


class TestProductCreationAndManagement:
    """Test product creation and management"""
    
    def test_get_my_products_no_auth(self, api_client):
        """GET /api/shop/products without auth - Should fail"""
        response = api_client.get(f"{API}/shop/products")
        assert response.status_code == 403, f"Expected 403 without auth, got {response.status_code}"
    
    def test_get_my_products_with_auth(self, api_client, provider_token):
        """GET /api/shop/products - Returns provider's products"""
        headers = {"Authorization": f"Bearer {provider_token}"}
        response = api_client.get(f"{API}/shop/products", headers=headers)
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        data = response.json()
        assert isinstance(data, list), "Response should be a list"
        print(f"Provider has {len(data)} products")
    
    def test_create_product_no_shop(self, api_client, provider_2_token):
        """POST /api/shop/products - Check behavior"""
        headers = {"Authorization": f"Bearer {provider_2_token}"}
        
        # First check if shop exists
        check_response = api_client.get(f"{API}/shop/my-shop", headers=headers)
        
        product_data = {
            "name": f"TEST_Produit_{uuid.uuid4().hex[:8]}",
            "description": "Test product for marketplace testing",
            "price": 50000,
            "is_negotiable": True,
            "is_available": True
        }
        
        response = api_client.post(f"{API}/shop/products", json=product_data, headers=headers)
        
        if check_response.json() is None:
            # No shop exists, should fail
            assert response.status_code == 400, f"Expected 400 when no shop exists, got {response.status_code}"
            print("Product creation correctly failed - no shop exists")
        else:
            # Shop exists, should succeed
            assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
            data = response.json()
            assert data.get("name") == product_data["name"], "Product name should match"
            assert data.get("price") == product_data["price"], "Product price should match"
            print(f"Created product: {data.get('name')}")


class TestShopDetail:
    """Test shop detail endpoint"""
    
    def test_get_shop_detail_not_found(self, api_client):
        """GET /api/marketplace/shops/{id} - Returns 404 for non-existent shop"""
        response = api_client.get(f"{API}/marketplace/shops/non-existent-shop-id")
        assert response.status_code == 404, f"Expected 404, got {response.status_code}"
    
    def test_get_shop_detail_with_products(self, api_client):
        """GET /api/marketplace/shops/{id} - Returns shop with products"""
        # First get list of shops
        shops_response = api_client.get(f"{API}/marketplace/shops")
        assert shops_response.status_code == 200
        
        shops = shops_response.json()
        if len(shops) == 0:
            pytest.skip("No shops available to test detail")
        
        shop_id = shops[0]['id']
        response = api_client.get(f"{API}/marketplace/shops/{shop_id}")
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        data = response.json()
        assert "id" in data, "Shop should have 'id' field"
        assert "name" in data, "Shop should have 'name' field"
        assert "products" in data, "Shop detail should include 'products' field"
        assert isinstance(data['products'], list), "Products should be a list"
        print(f"Shop '{data.get('name')}' has {len(data.get('products', []))} products")


class TestProductDetail:
    """Test product detail endpoint"""
    
    def test_get_product_detail_not_found(self, api_client):
        """GET /api/marketplace/products/{id} - Returns 404 for non-existent product"""
        response = api_client.get(f"{API}/marketplace/products/non-existent-product-id")
        assert response.status_code == 404, f"Expected 404, got {response.status_code}"
    
    def test_get_product_detail_with_shop(self, api_client):
        """GET /api/marketplace/products/{id} - Returns product with shop info"""
        # First get list of products
        products_response = api_client.get(f"{API}/marketplace/products")
        assert products_response.status_code == 200
        
        products = products_response.json()
        if len(products) == 0:
            pytest.skip("No products available to test detail")
        
        product_id = products[0]['id']
        response = api_client.get(f"{API}/marketplace/products/{product_id}")
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        data = response.json()
        assert "id" in data, "Product should have 'id' field"
        assert "name" in data, "Product should have 'name' field"
        assert "price" in data, "Product should have 'price' field"
        assert "shop" in data, "Product detail should include 'shop' field"
        
        shop = data.get('shop')
        if shop:
            assert "id" in shop, "Shop should have 'id' field"
            assert "name" in shop, "Shop should have 'name' field"
            print(f"Product '{data.get('name')}' belongs to shop '{shop.get('name')}'")
        else:
            print(f"Product '{data.get('name')}' - shop info not available")


class TestProductMessage:
    """Test sending messages to shop about products"""
    
    def test_send_product_message_not_found(self, api_client):
        """POST /api/marketplace/products/{id}/message - Returns 404 for non-existent product"""
        message_data = {
            "message": "Test message",
            "sender_name": "Test User",
            "sender_phone": "+224600000000"
        }
        response = api_client.post(f"{API}/marketplace/products/non-existent-product-id/message", json=message_data)
        assert response.status_code == 404, f"Expected 404, got {response.status_code}"
    
    def test_send_product_message_success(self, api_client):
        """POST /api/marketplace/products/{id}/message - Sends message successfully"""
        # First get list of products
        products_response = api_client.get(f"{API}/marketplace/products")
        assert products_response.status_code == 200
        
        products = products_response.json()
        if len(products) == 0:
            pytest.skip("No products available to test message")
        
        product_id = products[0]['id']
        product_name = products[0]['name']
        
        message_data = {
            "message": f"TEST_Message: Je suis intéressé par '{product_name}'",
            "sender_name": "TEST_Client",
            "sender_phone": "+224600000000"
        }
        
        response = api_client.post(f"{API}/marketplace/products/{product_id}/message", json=message_data)
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        data = response.json()
        assert "id" in data, "Message should have 'id' field"
        assert data.get("message") == message_data["message"], "Message content should match"
        assert data.get("sender_name") == message_data["sender_name"], "Sender name should match"
        assert data.get("product_id") == product_id, "Product ID should match"
        print(f"Message sent successfully for product '{product_name}'")


class TestShopStats:
    """Test shop statistics endpoint"""
    
    def test_get_shop_stats_no_auth(self, api_client):
        """GET /api/shop/stats without auth - Should fail"""
        response = api_client.get(f"{API}/shop/stats")
        assert response.status_code == 403, f"Expected 403 without auth, got {response.status_code}"
    
    def test_get_shop_stats_with_auth(self, api_client, provider_token):
        """GET /api/shop/stats - Returns shop statistics"""
        headers = {"Authorization": f"Bearer {provider_token}"}
        response = api_client.get(f"{API}/shop/stats", headers=headers)
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        data = response.json()
        assert "total_products" in data, "Stats should have 'total_products'"
        assert "total_views" in data, "Stats should have 'total_views'"
        assert "total_messages" in data, "Stats should have 'total_messages'"
        assert "available_products" in data, "Stats should have 'available_products'"
        print(f"Shop stats: {data}")


class TestShopMessages:
    """Test shop messages endpoint"""
    
    def test_get_shop_messages_no_auth(self, api_client):
        """GET /api/shop/messages without auth - Should fail"""
        response = api_client.get(f"{API}/shop/messages")
        assert response.status_code == 403, f"Expected 403 without auth, got {response.status_code}"
    
    def test_get_shop_messages_with_auth(self, api_client, provider_token):
        """GET /api/shop/messages - Returns messages for shop owner"""
        headers = {"Authorization": f"Bearer {provider_token}"}
        response = api_client.get(f"{API}/shop/messages", headers=headers)
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        data = response.json()
        assert isinstance(data, list), "Response should be a list"
        print(f"Shop has {len(data)} messages")
        
        # Verify message structure if messages exist
        if len(data) > 0:
            message = data[0]
            assert "id" in message, "Message should have 'id'"
            assert "message" in message, "Message should have 'message'"
            assert "sender_name" in message, "Message should have 'sender_name'"
            assert "product_name" in message, "Message should have 'product_name'"


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
