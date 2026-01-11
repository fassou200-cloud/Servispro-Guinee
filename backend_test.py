#!/usr/bin/env python3

import requests
import sys
import json
import uuid
from datetime import datetime

class ServisProAPITester:
    def __init__(self, base_url="https://provida-gn.preview.emergentagent.com"):
        self.base_url = base_url
        self.api_url = f"{base_url}/api"
        self.token = None
        self.user_id = None
        self.tests_run = 0
        self.tests_passed = 0
        self.test_results = []

    def log_test(self, name, success, details=""):
        """Log test result"""
        self.tests_run += 1
        if success:
            self.tests_passed += 1
            print(f"✅ {name}")
        else:
            print(f"❌ {name} - {details}")
        
        self.test_results.append({
            "test": name,
            "success": success,
            "details": details
        })

    def run_test(self, name, method, endpoint, expected_status, data=None, headers=None):
        """Run a single API test"""
        url = f"{self.api_url}/{endpoint}"
        test_headers = {'Content-Type': 'application/json'}
        
        if self.token:
            test_headers['Authorization'] = f'Bearer {self.token}'
        
        if headers:
            test_headers.update(headers)

        try:
            if method == 'GET':
                response = requests.get(url, headers=test_headers, timeout=10)
            elif method == 'POST':
                response = requests.post(url, json=data, headers=test_headers, timeout=10)
            elif method == 'PUT':
                response = requests.put(url, json=data, headers=test_headers, timeout=10)
            elif method == 'DELETE':
                response = requests.delete(url, headers=test_headers, timeout=10)

            success = response.status_code == expected_status
            details = f"Status: {response.status_code}"
            
            if not success:
                details += f" (Expected: {expected_status})"
                try:
                    error_data = response.json()
                    details += f" - {error_data.get('detail', 'Unknown error')}"
                except:
                    details += f" - {response.text[:100]}"

            self.log_test(name, success, details)
            
            if success:
                try:
                    return True, response.json()
                except:
                    return True, {}
            else:
                return False, {}

        except Exception as e:
            self.log_test(name, False, f"Exception: {str(e)}")
            return False, {}

    def test_provider_registration(self):
        """Test provider registration"""
        test_phone = f"224{str(uuid.uuid4())[:8]}"  # Guinea phone format
        registration_data = {
            "first_name": "Mamadou",
            "last_name": "Diallo", 
            "phone_number": test_phone,
            "password": "SecurePass123!",
            "profession": "Electromecanicien"
        }
        
        success, response = self.run_test(
            "Provider Registration",
            "POST",
            "auth/register",
            200,
            data=registration_data
        )
        
        if success and 'token' in response:
            self.token = response['token']
            self.user_id = response['user']['id']
            return True, test_phone
        return False, None

    def test_customer_registration(self):
        """Test customer registration"""
        test_phone = f"224{str(uuid.uuid4())[:8]}"  # Guinea phone format
        registration_data = {
            "first_name": "Fatoumata",
            "last_name": "Camara",
            "phone_number": test_phone,
            "password": "CustomerPass123!"
        }
        
        success, response = self.run_test(
            "Customer Registration",
            "POST",
            "auth/customer/register",
            200,
            data=registration_data
        )
        
        if success and 'token' in response:
            return True, test_phone
        return False, None

    def test_provider_login(self, phone_number):
        """Test provider login with user_type"""
        login_data = {
            "phone_number": phone_number,
            "password": "SecurePass123!",
            "user_type": "provider"
        }
        
        success, response = self.run_test(
            "Provider Login",
            "POST",
            "auth/login",
            200,
            data=login_data
        )
        
        if success and 'token' in response:
            self.token = response['token']
            return True
        return False

    def test_provider_login_specific(self):
        """Test provider login with specific credentials from review request"""
        login_data = {
            "phone_number": "224999888775",
            "password": "test123",
            "user_type": "provider"
        }
        
        success, response = self.run_test(
            "Provider Login (Specific Credentials)",
            "POST",
            "auth/login",
            200,
            data=login_data
        )
        
        if success and 'token' in response:
            self.token = response['token']
            self.user_id = response['user']['id']
            return True
        return False

    def test_customer_login(self, phone_number):
        """Test customer login"""
        login_data = {
            "phone_number": phone_number,
            "password": "CustomerPass123!",
            "user_type": "customer"
        }
        
        success, response = self.run_test(
            "Customer Login",
            "POST",
            "auth/login",
            200,
            data=login_data
        )
        
        if success and 'token' in response:
            return True
        return False

    def test_get_profile(self):
        """Test getting user profile"""
        success, response = self.run_test(
            "Get User Profile",
            "GET",
            "profile/me",
            200
        )
        return success

    def test_update_profile(self):
        """Test updating user profile"""
        update_data = {
            "first_name": "Updated",
            "last_name": "Name",
            "profession": "Mecanicien",
            "about_me": "I am an experienced mechanic",
            "online_status": True
        }
        
        success, response = self.run_test(
            "Update User Profile",
            "PUT",
            "profile/me",
            200,
            data=update_data
        )
        return success

    def test_get_all_providers(self):
        """Test getting all service providers"""
        success, response = self.run_test(
            "Get All Providers",
            "GET",
            "providers",
            200
        )
        return success

    def test_get_provider_by_id(self):
        """Test getting provider by ID"""
        if not self.user_id:
            self.log_test("Get Provider By ID", False, "No user ID available")
            return False
            
        success, response = self.run_test(
            "Get Provider By ID",
            "GET",
            f"providers/{self.user_id}",
            200
        )
        return success

    def test_create_job_offer(self):
        """Test creating a job offer"""
        if not self.user_id:
            self.log_test("Create Job Offer", False, "No user ID available")
            return False, None
            
        job_data = {
            "service_provider_id": self.user_id,
            "client_name": "Test Client",
            "service_type": "Electrical Repair",
            "description": "Fix broken outlet in kitchen",
            "location": "123 Main St, City",
            "scheduled_date": "2024-12-31T10:00:00Z"
        }
        
        success, response = self.run_test(
            "Create Job Offer",
            "POST",
            "jobs",
            200,
            data=job_data
        )
        
        if success and 'id' in response:
            return True, response['id']
        return False, None

    def test_get_my_jobs(self):
        """Test getting user's job offers"""
        success, response = self.run_test(
            "Get My Jobs",
            "GET",
            "jobs/my-jobs",
            200
        )
        return success

    def test_update_job_status(self, job_id):
        """Test updating job status"""
        if not job_id:
            self.log_test("Update Job Status", False, "No job ID available")
            return False
            
        update_data = {
            "status": "Accepted"
        }
        
        success, response = self.run_test(
            "Update Job Status",
            "PUT",
            f"jobs/{job_id}",
            200,
            data=update_data
        )
        return success

    def test_create_rental_listing(self):
        """Test creating a rental listing"""
        rental_data = {
            "property_type": "Apartment",
            "title": "Bel Appartement à Conakry",
            "description": "Appartement moderne avec 2 chambres dans le centre de Conakry",
            "location": "Kaloum, Conakry",
            "rental_price": 500000  # GNF per month
        }
        
        success, response = self.run_test(
            "Create Rental Listing",
            "POST",
            "rentals",
            200,
            data=rental_data
        )
        
        if success and 'id' in response:
            return True, response['id']
        return False, None

    def test_create_short_term_rental(self):
        """Test creating a short-term rental (Airbnb-style)"""
        rental_data = {
            "property_type": "Apartment",
            "title": "Studio Moderne Centre-Ville",
            "description": "Bel studio équipé pour séjours courts",
            "location": "Kaloum, Conakry",
            "rental_price": 500000,
            "rental_type": "short_term",
            "price_per_night": 150000,
            "min_nights": 2,
            "max_guests": 4,
            "amenities": ["wifi", "climatisation", "cuisine"],
            "is_available": True,
            "available_from": "2025-01-15",
            "available_to": "2025-03-15"
        }
        
        success, response = self.run_test(
            "Create Short Term Rental",
            "POST",
            "rentals",
            200,
            data=rental_data
        )
        
        if success and 'id' in response:
            # Verify all new fields are in response
            expected_fields = ['rental_type', 'price_per_night', 'min_nights', 'max_guests', 'amenities', 'is_available', 'available_from', 'available_to']
            missing_fields = [field for field in expected_fields if field not in response]
            if missing_fields:
                self.log_test("Create Short Term Rental", False, f"Missing fields in response: {missing_fields}")
                return False, None
            return True, response['id']
        return False, None

    def test_get_rentals_by_type(self):
        """Test filtering rentals by rental_type"""
        # Test short-term rentals filter
        success_short, response_short = self.run_test(
            "Get Short Term Rentals",
            "GET",
            "rentals?rental_type=short_term",
            200
        )
        
        if success_short and isinstance(response_short, list):
            # Verify all returned rentals are short_term
            for rental in response_short:
                if rental.get('rental_type') != 'short_term':
                    self.log_test("Get Short Term Rentals", False, f"Found non-short-term rental: {rental.get('rental_type')}")
                    return False
        
        # Test long-term rentals filter
        success_long, response_long = self.run_test(
            "Get Long Term Rentals",
            "GET",
            "rentals?rental_type=long_term",
            200
        )
        
        if success_long and isinstance(response_long, list):
            # Verify all returned rentals are long_term
            for rental in response_long:
                if rental.get('rental_type') != 'long_term':
                    self.log_test("Get Long Term Rentals", False, f"Found non-long-term rental: {rental.get('rental_type')}")
                    return False
        
        return success_short and success_long

    def test_get_rentals_by_availability(self):
        """Test filtering rentals by availability status"""
        # Test available rentals filter
        success_available, response_available = self.run_test(
            "Get Available Rentals",
            "GET",
            "rentals?is_available=true",
            200
        )
        
        if success_available and isinstance(response_available, list):
            # Verify all returned rentals are available
            for rental in response_available:
                if not rental.get('is_available'):
                    self.log_test("Get Available Rentals", False, f"Found unavailable rental")
                    return False
        
        # Test unavailable rentals filter
        success_unavailable, response_unavailable = self.run_test(
            "Get Unavailable Rentals",
            "GET",
            "rentals?is_available=false",
            200
        )
        
        if success_unavailable and isinstance(response_unavailable, list):
            # Verify all returned rentals are unavailable
            for rental in response_unavailable:
                if rental.get('is_available'):
                    self.log_test("Get Unavailable Rentals", False, f"Found available rental")
                    return False
        
        return success_available and success_unavailable

    def test_toggle_rental_availability(self, rental_id):
        """Test toggling rental availability"""
        if not rental_id:
            self.log_test("Toggle Rental Availability", False, "No rental ID available")
            return False
            
        # First toggle to false
        success_false, response_false = self.run_test(
            "Toggle Rental Availability to False",
            "PUT",
            f"rentals/{rental_id}/availability?is_available=false",
            200
        )
        
        if success_false and response_false.get('is_available') == False:
            # Then toggle back to true
            success_true, response_true = self.run_test(
                "Toggle Rental Availability to True",
                "PUT",
                f"rentals/{rental_id}/availability?is_available=true",
                200
            )
            
            if success_true and response_true.get('is_available') == True:
                return True
            else:
                self.log_test("Toggle Rental Availability", False, "Failed to toggle back to true")
                return False
        else:
            self.log_test("Toggle Rental Availability", False, "Failed to toggle to false")
            return False

    def test_update_rental_listing(self, rental_id):
        """Test updating a rental listing"""
        if not rental_id:
            self.log_test("Update Rental Listing", False, "No rental ID available")
            return False
            
        update_data = {
            "property_type": "Apartment",
            "title": "Studio Moderne Centre-Ville - UPDATED",
            "description": "Bel studio équipé pour séjours courts - UPDATED",
            "location": "Kaloum, Conakry",
            "rental_price": 500000,
            "rental_type": "short_term",
            "price_per_night": 175000,  # Updated price
            "min_nights": 2,
            "max_guests": 4,
            "amenities": ["wifi", "climatisation", "cuisine", "parking"],  # Added amenity
            "is_available": True,
            "available_from": "2025-01-15",
            "available_to": "2025-03-15"
        }
        
        success, response = self.run_test(
            "Update Rental Listing",
            "PUT",
            f"rentals/{rental_id}",
            200,
            data=update_data
        )
        
        if success:
            # Verify updated fields
            if response.get('price_per_night') == 175000 and 'parking' in response.get('amenities', []):
                return True
            else:
                self.log_test("Update Rental Listing", False, "Updated fields not reflected in response")
                return False
        return False

    def test_get_all_rentals(self):
        """Test getting all rental listings"""
        success, response = self.run_test(
            "Get All Rentals",
            "GET",
            "rentals",
            200
        )
        return success

    def test_submit_review(self):
        """Test submitting a review"""
        if not self.user_id:
            self.log_test("Submit Review", False, "No user ID available")
            return False
            
        # First create a job and accept it to allow review
        job_data = {
            "service_provider_id": self.user_id,
            "client_name": "Aminata Touré",
            "service_type": "Réparation Électrique",
            "description": "Réparer une prise électrique défectueuse",
            "location": "Matam, Conakry"
        }
        
        job_success, job_response = self.run_test(
            "Create Job for Review Test",
            "POST",
            "jobs",
            200,
            data=job_data
        )
        
        if job_success and 'id' in job_response:
            # Update job status to Accepted to allow review
            update_data = {"status": "Accepted"}
            self.run_test(
                "Accept Job for Review Test",
                "PUT",
                f"jobs/{job_response['id']}",
                200,
                data=update_data
            )
            
            # Now submit review
            review_data = {
                "service_provider_id": self.user_id,
                "reviewer_name": "Aminata Touré",
                "rating": 5,
                "comment": "Excellent travail! Très professionnel et ponctuel."
            }
            
            success, response = self.run_test(
                "Submit Review",
                "POST",
                "reviews",
                200,
                data=review_data
            )
            return success
        else:
            self.log_test("Submit Review", False, "Could not create prerequisite job")
            return False

    def test_invalid_login(self):
        """Test login with invalid credentials"""
        login_data = {
            "phone_number": "9999999999",
            "password": "wrongpassword"
        }
        
        success, response = self.run_test(
            "Invalid Login (Should Fail)",
            "POST",
            "auth/login",
            401,
            data=login_data
        )
        return success

    def test_unauthorized_access(self):
        """Test accessing protected endpoint without token"""
        # Temporarily remove token
        original_token = self.token
        self.token = None
        
        success, response = self.run_test(
            "Unauthorized Access (Should Fail)",
            "GET",
            "profile/me",
            401
        )
        
        # Restore token
        self.token = original_token
        return success

    # ==================== ADMIN DASHBOARD TESTS ====================
    
    def test_admin_login(self):
        """Test admin login with fixed credentials"""
        admin_data = {
            "username": "admin",
            "password": "admin123"
        }
        
        success, response = self.run_test(
            "Admin Login",
            "POST",
            "admin/login",
            200,
            data=admin_data
        )
        
        if success and 'token' in response:
            self.admin_token = response['token']
            return True
        return False

    def test_admin_get_all_providers(self):
        """Test admin getting all providers with verification status"""
        # Use admin token for this request
        original_token = self.token
        self.token = getattr(self, 'admin_token', None)
        
        success, response = self.run_test(
            "Admin Get All Providers",
            "GET",
            "admin/providers",
            200
        )
        
        # Restore original token
        self.token = original_token
        
        if success and isinstance(response, list):
            # Check if providers have verification_status field
            if response and 'verification_status' in response[0]:
                return True, response
        return success, response

    def test_admin_approve_provider(self, provider_id):
        """Test admin approving a provider"""
        if not provider_id:
            self.log_test("Admin Approve Provider", False, "No provider ID available")
            return False
            
        # Use admin token for this request
        original_token = self.token
        self.token = getattr(self, 'admin_token', None)
        
        success, response = self.run_test(
            "Admin Approve Provider",
            "PUT",
            f"admin/providers/{provider_id}/approve",
            200
        )
        
        # Restore original token
        self.token = original_token
        return success

    def test_admin_reject_provider(self, provider_id):
        """Test admin rejecting a provider"""
        if not provider_id:
            self.log_test("Admin Reject Provider", False, "No provider ID available")
            return False
            
        # Use admin token for this request
        original_token = self.token
        self.token = getattr(self, 'admin_token', None)
        
        success, response = self.run_test(
            "Admin Reject Provider",
            "PUT",
            f"admin/providers/{provider_id}/reject",
            200
        )
        
        # Restore original token
        self.token = original_token
        return success

    def test_admin_get_all_jobs(self):
        """Test admin getting all jobs with provider info"""
        # Use admin token for this request
        original_token = self.token
        self.token = getattr(self, 'admin_token', None)
        
        success, response = self.run_test(
            "Admin Get All Jobs",
            "GET",
            "admin/jobs",
            200
        )
        
        # Restore original token
        self.token = original_token
        return success, response

    def test_admin_get_stats(self):
        """Test admin getting dashboard statistics"""
        # Use admin token for this request
        original_token = self.token
        self.token = getattr(self, 'admin_token', None)
        
        success, response = self.run_test(
            "Admin Get Stats",
            "GET",
            "admin/stats",
            200
        )
        
        # Restore original token
        self.token = original_token
        
        if success and isinstance(response, dict):
            # Check if stats have expected structure
            expected_keys = ['providers', 'jobs', 'customers', 'rentals']
            if all(key in response for key in expected_keys):
                return True
        return success

    # ==================== ADMIN DELETE FUNCTIONALITY TESTS ====================
    
    def test_admin_get_all_customers(self):
        """Test admin getting all customers"""
        # Use admin token for this request
        original_token = self.token
        self.token = getattr(self, 'admin_token', None)
        
        success, response = self.run_test(
            "Admin Get All Customers",
            "GET",
            "admin/customers",
            200
        )
        
        # Restore original token
        self.token = original_token
        
        if success and isinstance(response, list):
            # Check if customers have expected fields and NOT password or _id
            if response:
                customer = response[0]
                expected_fields = ['id', 'first_name', 'last_name', 'phone_number', 'created_at']
                forbidden_fields = ['password', '_id']
                
                has_expected = all(field in customer for field in expected_fields)
                has_forbidden = any(field in customer for field in forbidden_fields)
                
                if has_expected and not has_forbidden:
                    return True, response
                else:
                    self.log_test("Admin Get All Customers", False, f"Missing expected fields or contains forbidden fields")
                    return False, response
        return success, response

    def test_admin_delete_provider(self, provider_id):
        """Test admin deleting a provider and associated data"""
        if not provider_id:
            self.log_test("Admin Delete Provider", False, "No provider ID available")
            return False
            
        # Use admin token for this request
        original_token = self.token
        self.token = getattr(self, 'admin_token', None)
        
        success, response = self.run_test(
            "Admin Delete Provider",
            "DELETE",
            f"admin/providers/{provider_id}",
            200
        )
        
        # Restore original token
        self.token = original_token
        return success

    def test_admin_delete_customer(self, customer_id):
        """Test admin deleting a customer"""
        if not customer_id:
            self.log_test("Admin Delete Customer", False, "No customer ID available")
            return False
            
        # Use admin token for this request
        original_token = self.token
        self.token = getattr(self, 'admin_token', None)
        
        success, response = self.run_test(
            "Admin Delete Customer",
            "DELETE",
            f"admin/customers/{customer_id}",
            200
        )
        
        # Restore original token
        self.token = original_token
        return success

    def test_admin_delete_nonexistent_provider(self):
        """Test admin deleting a non-existent provider (should return 404)"""
        fake_provider_id = str(uuid.uuid4())
        
        # Use admin token for this request
        original_token = self.token
        self.token = getattr(self, 'admin_token', None)
        
        success, response = self.run_test(
            "Admin Delete Non-existent Provider (Should Fail)",
            "DELETE",
            f"admin/providers/{fake_provider_id}",
            404
        )
        
        # Restore original token
        self.token = original_token
        return success

    def test_admin_delete_nonexistent_customer(self):
        """Test admin deleting a non-existent customer (should return 404)"""
        fake_customer_id = str(uuid.uuid4())
        
        # Use admin token for this request
        original_token = self.token
        self.token = getattr(self, 'admin_token', None)
        
        success, response = self.run_test(
            "Admin Delete Non-existent Customer (Should Fail)",
            "DELETE",
            f"admin/customers/{fake_customer_id}",
            404
        )
        
        # Restore original token
        self.token = original_token
        return success

    def test_verify_provider_deletion(self, provider_id):
        """Verify that a deleted provider is no longer in the providers list"""
        if not provider_id:
            self.log_test("Verify Provider Deletion", False, "No provider ID available")
            return False
            
        success, response = self.run_test(
            "Verify Provider Deletion",
            "GET",
            "providers",
            200
        )
        
        if success and isinstance(response, list):
            # Check if the deleted provider is NOT in the list
            provider_ids = [p.get('id') for p in response]
            if provider_id not in provider_ids:
                self.log_test("Verify Provider Deletion", True, "Provider successfully removed from list")
                return True
            else:
                self.log_test("Verify Provider Deletion", False, "Provider still exists in list")
                return False
        return False

    def test_verify_customer_deletion(self, customer_id):
        """Verify that a deleted customer is no longer in the customers list"""
        if not customer_id:
            self.log_test("Verify Customer Deletion", False, "No customer ID available")
            return False
            
        # Use admin token for this request
        original_token = self.token
        self.token = getattr(self, 'admin_token', None)
        
        success, response = self.run_test(
            "Verify Customer Deletion",
            "GET",
            "admin/customers",
            200
        )
        
        # Restore original token
        self.token = original_token
        
        if success and isinstance(response, list):
            # Check if the deleted customer is NOT in the list
            customer_ids = [c.get('id') for c in response]
            if customer_id not in customer_ids:
                self.log_test("Verify Customer Deletion", True, "Customer successfully removed from list")
                return True
            else:
                self.log_test("Verify Customer Deletion", False, "Customer still exists in list")
                return False
        return False

    # ==================== NEW ADMIN RENTAL & AGENT IMMOBILIER TESTS ====================
    
    def test_admin_get_updated_stats(self):
        """Test admin getting updated stats with rentals object and agent_immobilier count"""
        # Use admin token for this request
        original_token = self.token
        self.token = getattr(self, 'admin_token', None)
        
        success, response = self.run_test(
            "Admin Get Updated Stats",
            "GET",
            "admin/stats",
            200
        )
        
        # Restore original token
        self.token = original_token
        
        if success and isinstance(response, dict):
            # Check if stats have expected structure with rentals as object
            expected_keys = ['providers', 'jobs', 'customers', 'rentals']
            if all(key in response for key in expected_keys):
                # Check rentals structure
                rentals = response.get('rentals', {})
                if isinstance(rentals, dict):
                    expected_rental_keys = ['total', 'long_term', 'short_term', 'available']
                    if all(key in rentals for key in expected_rental_keys):
                        # Check providers has agent_immobilier count
                        providers = response.get('providers', {})
                        if isinstance(providers, dict) and 'agent_immobilier' in providers:
                            self.log_test("Admin Get Updated Stats", True, "Stats structure correct with rentals object and agent_immobilier count")
                            return True
                        else:
                            self.log_test("Admin Get Updated Stats", False, "Missing agent_immobilier count in providers")
                            return False
                    else:
                        self.log_test("Admin Get Updated Stats", False, f"Missing rental keys: {[k for k in expected_rental_keys if k not in rentals]}")
                        return False
                else:
                    self.log_test("Admin Get Updated Stats", False, "Rentals should be an object, not a number")
                    return False
            else:
                self.log_test("Admin Get Updated Stats", False, f"Missing keys: {[k for k in expected_keys if k not in response]}")
                return False
        return success

    def test_admin_get_all_rentals(self):
        """Test admin getting all rental listings"""
        # Use admin token for this request
        original_token = self.token
        self.token = getattr(self, 'admin_token', None)
        
        success, response = self.run_test(
            "Admin Get All Rentals",
            "GET",
            "admin/rentals",
            200
        )
        
        # Restore original token
        self.token = original_token
        
        if success and isinstance(response, list):
            # Check if rentals have expected fields
            if response:
                rental = response[0]
                expected_fields = ['id', 'title', 'rental_type', 'price_per_night', 'rental_price', 'is_available', 'provider_name']
                missing_fields = [field for field in expected_fields if field not in rental]
                if missing_fields:
                    self.log_test("Admin Get All Rentals", False, f"Missing fields in rental: {missing_fields}")
                    return False, response
                else:
                    self.log_test("Admin Get All Rentals", True, f"Found {len(response)} rentals with correct structure")
                    return True, response
        return success, response

    def test_admin_get_agents_immobilier(self):
        """Test admin getting all Agent Immobilier providers with rental_count"""
        # Use admin token for this request
        original_token = self.token
        self.token = getattr(self, 'admin_token', None)
        
        success, response = self.run_test(
            "Admin Get Agents Immobilier",
            "GET",
            "admin/agents-immobilier",
            200
        )
        
        # Restore original token
        self.token = original_token
        
        if success and isinstance(response, list):
            # Check if all returned providers are Agent Immobilier
            for agent in response:
                if agent.get('profession') != 'AgentImmobilier':
                    self.log_test("Admin Get Agents Immobilier", False, f"Found non-Agent Immobilier: {agent.get('profession')}")
                    return False, response
                
                # Check if rental_count is present
                if 'rental_count' not in agent:
                    self.log_test("Admin Get Agents Immobilier", False, "Missing rental_count property")
                    return False, response
            
            self.log_test("Admin Get Agents Immobilier", True, f"Found {len(response)} Agent Immobilier providers with rental_count")
            return True, response
        return success, response

    def test_admin_delete_rental(self):
        """Test admin deleting a rental listing"""
        # First create a test rental to delete
        test_rental_data = {
            "property_type": "Apartment",
            "title": "Test Rental for Admin Deletion",
            "description": "This rental will be deleted by admin",
            "location": "Test Location",
            "rental_price": 300000,
            "rental_type": "long_term",
            "is_available": True
        }
        
        # Create rental with provider token
        create_success, create_response = self.run_test(
            "Create Test Rental for Admin Deletion",
            "POST",
            "rentals",
            200,
            data=test_rental_data
        )
        
        if not create_success or 'id' not in create_response:
            self.log_test("Admin Delete Rental", False, "Could not create test rental")
            return False
        
        test_rental_id = create_response['id']
        
        # Now delete it using admin endpoint
        original_token = self.token
        self.token = getattr(self, 'admin_token', None)
        
        success, response = self.run_test(
            "Admin Delete Rental",
            "DELETE",
            f"admin/rentals/{test_rental_id}",
            200
        )
        
        # Restore original token
        self.token = original_token
        
        if success:
            # Verify rental was deleted by trying to get all rentals and checking it's not there
            verify_success, verify_response = self.run_test(
                "Verify Rental Deletion",
                "GET",
                "rentals",
                200
            )
            
            if verify_success and isinstance(verify_response, list):
                rental_ids = [r.get('id') for r in verify_response]
                if test_rental_id not in rental_ids:
                    self.log_test("Verify Rental Deletion", True, "Rental successfully removed from listings")
                    return True
                else:
                    self.log_test("Verify Rental Deletion", False, "Rental still exists in listings")
                    return False
        
        return success

    # ==================== MESSAGE FILTERING TESTS ====================
    
    def test_message_filtering_phone_number(self):
        """Test that phone numbers are filtered in chat messages"""
        rental_id = "0f4945d8-ebae-4e13-bc8c-dea3091e52e5"
        
        message_data = {
            "rental_id": rental_id,
            "message": "Appelez-moi au 620123456"
        }
        
        success, response = self.run_test(
            "Message Filtering - Phone Number",
            "POST",
            f"chat/rental/{rental_id}/message/customer",
            200,
            data=message_data
        )
        
        if success:
            # Check if phone number was filtered
            filtered_message = response.get('message', '')
            was_filtered = response.get('was_filtered', False)
            
            if '[📵 Numéro masqué - Politique de confidentialité]' in filtered_message and was_filtered:
                self.log_test("Message Filtering - Phone Number", True, "Phone number correctly filtered")
                return True
            else:
                self.log_test("Message Filtering - Phone Number", False, f"Phone filtering failed. Message: {filtered_message}, was_filtered: {was_filtered}")
                return False
        return False

    def test_message_filtering_email(self):
        """Test that emails are filtered in chat messages"""
        rental_id = "0f4945d8-ebae-4e13-bc8c-dea3091e52e5"
        
        message_data = {
            "rental_id": rental_id,
            "message": "Contactez-moi à test@example.com"
        }
        
        success, response = self.run_test(
            "Message Filtering - Email",
            "POST",
            f"chat/rental/{rental_id}/message/customer",
            200,
            data=message_data
        )
        
        if success:
            # Check if email was filtered
            filtered_message = response.get('message', '')
            was_filtered = response.get('was_filtered', False)
            
            if '[📧 Email masqué - Politique de confidentialité]' in filtered_message and was_filtered:
                self.log_test("Message Filtering - Email", True, "Email correctly filtered")
                return True
            else:
                self.log_test("Message Filtering - Email", False, f"Email filtering failed. Message: {filtered_message}, was_filtered: {was_filtered}")
                return False
        return False

    def test_message_filtering_normal_message(self):
        """Test that normal messages pass through unchanged"""
        rental_id = "0f4945d8-ebae-4e13-bc8c-dea3091e52e5"
        
        message_data = {
            "rental_id": rental_id,
            "message": "Bonjour, je suis intéressé par votre annonce"
        }
        
        success, response = self.run_test(
            "Message Filtering - Normal Message",
            "POST",
            f"chat/rental/{rental_id}/message/customer",
            200,
            data=message_data
        )
        
        if success:
            # Check if message was unchanged
            filtered_message = response.get('message', '')
            was_filtered = response.get('was_filtered', True)  # Should be False
            original_message = message_data['message']
            
            if filtered_message == original_message and not was_filtered:
                self.log_test("Message Filtering - Normal Message", True, "Normal message passed through unchanged")
                return True
            else:
                self.log_test("Message Filtering - Normal Message", False, f"Normal message filtering failed. Message: {filtered_message}, was_filtered: {was_filtered}")
                return False
        return False

    def test_message_filtering_mixed_content(self):
        """Test that messages with both phone and email are filtered"""
        rental_id = "0f4945d8-ebae-4e13-bc8c-dea3091e52e5"
        
        message_data = {
            "rental_id": rental_id,
            "message": "Mon tel: 224620000000, email: user@mail.com"
        }
        
        success, response = self.run_test(
            "Message Filtering - Mixed Content",
            "POST",
            f"chat/rental/{rental_id}/message/customer",
            200,
            data=message_data
        )
        
        if success:
            # Check if both phone and email were filtered
            filtered_message = response.get('message', '')
            was_filtered = response.get('was_filtered', False)
            
            phone_masked = '[📵 Numéro masqué - Politique de confidentialité]' in filtered_message
            email_masked = '[📧 Email masqué - Politique de confidentialité]' in filtered_message
            
            if phone_masked and email_masked and was_filtered:
                self.log_test("Message Filtering - Mixed Content", True, "Both phone and email correctly filtered")
                return True
            else:
                self.log_test("Message Filtering - Mixed Content", False, f"Mixed content filtering failed. Message: {filtered_message}, phone_masked: {phone_masked}, email_masked: {email_masked}, was_filtered: {was_filtered}")
                return False
        return False

    def test_new_vehicle_categories(self):
        """Test registration with new vehicle categories"""
        # Test Camionneur
        test_phone_camionneur = f"224{str(uuid.uuid4())[:8]}"
        camionneur_data = {
            "first_name": "Ibrahima",
            "last_name": "Sow",
            "phone_number": test_phone_camionneur,
            "password": "SecurePass123!",
            "profession": "Camionneur"
        }
        
        success_camionneur, response_camionneur = self.run_test(
            "New Vehicle Categories - Camionneur",
            "POST",
            "auth/register",
            200,
            data=camionneur_data
        )
        
        # Test Tracteur
        test_phone_tracteur = f"224{str(uuid.uuid4())[:8]}"
        tracteur_data = {
            "first_name": "Mamadou",
            "last_name": "Barry",
            "phone_number": test_phone_tracteur,
            "password": "SecurePass123!",
            "profession": "Tracteur"
        }
        
        success_tracteur, response_tracteur = self.run_test(
            "New Vehicle Categories - Tracteur",
            "POST",
            "auth/register",
            200,
            data=tracteur_data
        )
        
        # Test Voiture
        test_phone_voiture = f"224{str(uuid.uuid4())[:8]}"
        voiture_data = {
            "first_name": "Fatoumata",
            "last_name": "Diallo",
            "phone_number": test_phone_voiture,
            "password": "SecurePass123!",
            "profession": "Voiture"
        }
        
        success_voiture, response_voiture = self.run_test(
            "New Vehicle Categories - Voiture",
            "POST",
            "auth/register",
            200,
            data=voiture_data
        )
        
        # Verify all professions were accepted
        if success_camionneur and success_tracteur and success_voiture:
            # Check if the professions are correctly stored
            if (response_camionneur.get('user', {}).get('profession') == 'Camionneur' and
                response_tracteur.get('user', {}).get('profession') == 'Tracteur' and
                response_voiture.get('user', {}).get('profession') == 'Voiture'):
                return True
        
        return False

    def test_admin_access_original_messages(self):
        """Test admin endpoint for accessing original unfiltered messages"""
        rental_id = "0f4945d8-ebae-4e13-bc8c-dea3091e52e5"
        
        # First send a filtered message
        message_data = {
            "rental_id": rental_id,
            "message": "Appelez-moi au 620123456 ou écrivez à test@example.com"
        }
        
        # Send message (should be filtered)
        send_success, send_response = self.run_test(
            "Send Message for Admin Test",
            "POST",
            f"chat/rental/{rental_id}/message/customer",
            200,
            data=message_data
        )
        
        if not send_success:
            self.log_test("Admin Access Original Messages", False, "Could not send test message")
            return False
        
        # Now test admin endpoint to get original messages
        # Note: Admin endpoint doesn't require authentication in this implementation
        success, response = self.run_test(
            "Admin Access Original Messages",
            "GET",
            f"admin/chat/rental/{rental_id}/messages",
            200
        )
        
        if success and isinstance(response, list):
            # Look for a message with original_message field
            for message in response:
                if message.get('original_message'):
                    # Check if original message contains unfiltered content
                    original = message.get('original_message', '')
                    if '620123456' in original and 'test@example.com' in original:
                        self.log_test("Admin Access Original Messages", True, "Admin can access original unfiltered messages")
                        return True
            
            self.log_test("Admin Access Original Messages", False, "No original_message field found or content not preserved")
            return False
        
        return False

    # ==================== JOB COMPLETION FLOW TESTS ====================
    
    def test_provider_mark_job_complete(self, job_id):
        """Test provider marking job as complete"""
        if not job_id:
            self.log_test("Provider Mark Job Complete", False, "No job ID available")
            return False
            
        success, response = self.run_test(
            "Provider Mark Job Complete",
            "PUT",
            f"jobs/{job_id}/provider-complete",
            200
        )
        return success

    def test_customer_confirm_job_complete(self, job_id):
        """Test customer confirming job completion"""
        if not job_id:
            self.log_test("Customer Confirm Job Complete", False, "No job ID available")
            return False
            
        # Remove token for customer confirmation (public endpoint)
        original_token = self.token
        self.token = None
        
        success, response = self.run_test(
            "Customer Confirm Job Complete",
            "PUT",
            f"jobs/{job_id}/customer-confirm",
            200
        )
        
        # Restore token
        self.token = original_token
        return success

    def test_customer_get_jobs(self):
        """Test customer getting jobs awaiting confirmation"""
        # Remove token for customer endpoint (public endpoint)
        original_token = self.token
        self.token = None
        
        success, response = self.run_test(
            "Customer Get Jobs",
            "GET",
            "customer/jobs",
            200
        )
        
        # Restore token
        self.token = original_token
        return success, response

    def run_all_tests(self):
        """Run all API tests"""
        print("🚀 Starting ServisPro API Tests")
        print("=" * 50)
        
        # ==================== MESSAGE FILTERING & NEW CATEGORIES TESTS ====================
        print("\n📱 Testing Message Filtering & New Vehicle Categories...")
        
        # Test message filtering features
        self.test_message_filtering_phone_number()
        self.test_message_filtering_email()
        self.test_message_filtering_normal_message()
        self.test_message_filtering_mixed_content()
        
        # Test new vehicle categories
        self.test_new_vehicle_categories()
        
        # Test admin access to original messages
        self.test_admin_access_original_messages()
        
        # ==================== EXISTING TESTS ====================
        print("\n🔧 Running Existing API Tests...")
        
        # Test provider registration and login
        provider_reg_success, provider_phone = self.test_provider_registration()
        if not provider_reg_success:
            print("❌ Provider registration failed, stopping tests")
            return self.get_results()
        
        provider_login_success = self.test_provider_login(provider_phone)
        if not provider_login_success:
            print("❌ Provider login failed, stopping tests")
            return self.get_results()
        
        # Test customer registration and login
        customer_reg_success, customer_phone = self.test_customer_registration()
        if customer_reg_success:
            self.test_customer_login(customer_phone)
        
        # Test profile operations
        self.test_get_profile()
        self.test_update_profile()
        
        # Test provider operations
        self.test_get_all_providers()
        self.test_get_provider_by_id()
        
        # Test rental operations
        rental_success, rental_id = self.test_create_rental_listing()
        self.test_get_all_rentals()
        
        # ==================== SHORT-TERM RENTAL TESTS ====================
        print("\n🏠 Testing Short-Term Rental Features...")
        
        # Test specific provider login for short-term rental testing
        specific_login_success = self.test_provider_login_specific()
        if specific_login_success:
            # Test creating short-term rental
            short_rental_success, short_rental_id = self.test_create_short_term_rental()
            
            if short_rental_success:
                # Test availability toggle
                self.test_toggle_rental_availability(short_rental_id)
                
                # Test updating rental
                self.test_update_rental_listing(short_rental_id)
            
            # Test rental filtering
            self.test_get_rentals_by_type()
            self.test_get_rentals_by_availability()
        
        # Test job operations
        job_success, job_id = self.test_create_job_offer()
        self.test_get_my_jobs()
        if job_success:
            self.test_update_job_status(job_id)
        
        # Test review system
        self.test_submit_review()
        
        # Test error cases
        self.test_invalid_login()
        self.test_unauthorized_access()
        
        # ==================== ADMIN DASHBOARD TESTS ====================
        print("\n🔐 Testing Admin Dashboard...")
        
        # Test admin login
        admin_login_success = self.test_admin_login()
        if admin_login_success:
            # Test admin provider management
            providers_success, providers_data = self.test_admin_get_all_providers()
            if providers_success and providers_data:
                # Test approve/reject with first provider
                first_provider_id = providers_data[0].get('id') if providers_data else None
                if first_provider_id:
                    self.test_admin_approve_provider(first_provider_id)
                    # Test reject on same provider (to test both endpoints)
                    self.test_admin_reject_provider(first_provider_id)
            
            # Test admin job management
            self.test_admin_get_all_jobs()
            
            # Test admin statistics
            self.test_admin_get_stats()
            
            # ==================== ADMIN RENTAL & AGENT IMMOBILIER TESTS ====================
            print("\n🏠 Testing Admin Rental & Agent Immobilier Management...")
            
            # Test updated admin stats with rentals object and agent_immobilier count
            self.test_admin_get_updated_stats()
            
            # Test admin getting all rentals
            self.test_admin_get_all_rentals()
            
            # Test admin getting all agents immobilier with rental_count
            self.test_admin_get_agents_immobilier()
            
            # Test admin deleting a rental
            self.test_admin_delete_rental()
            
            # ==================== ADMIN DELETE FUNCTIONALITY TESTS ====================
            print("\n🗑️ Testing Admin Delete Functionality...")
            
            # Test getting all customers
            customers_success, customers_data = self.test_admin_get_all_customers()
            
            # Create a test provider for deletion testing
            test_provider_phone = f"224{str(uuid.uuid4())[:8]}"
            test_provider_data = {
                "first_name": "TestProvider",
                "last_name": "ForDeletion",
                "phone_number": test_provider_phone,
                "password": "TestPass123!",
                "profession": "Plombier"
            }
            
            test_provider_success, test_provider_response = self.run_test(
                "Create Test Provider for Deletion",
                "POST",
                "auth/register",
                200,
                data=test_provider_data
            )
            
            test_provider_id = None
            if test_provider_success and 'user' in test_provider_response:
                test_provider_id = test_provider_response['user']['id']
                
                # Test deleting the provider
                delete_provider_success = self.test_admin_delete_provider(test_provider_id)
                if delete_provider_success:
                    # Verify provider was deleted
                    self.test_verify_provider_deletion(test_provider_id)
            
            # Create a test customer for deletion testing
            test_customer_phone = f"224{str(uuid.uuid4())[:8]}"
            test_customer_data = {
                "first_name": "TestCustomer",
                "last_name": "ForDeletion",
                "phone_number": test_customer_phone,
                "password": "TestPass123!"
            }
            
            test_customer_success, test_customer_response = self.run_test(
                "Create Test Customer for Deletion",
                "POST",
                "auth/customer/register",
                200,
                data=test_customer_data
            )
            
            test_customer_id = None
            if test_customer_success and 'user' in test_customer_response:
                test_customer_id = test_customer_response['user']['id']
                
                # Test deleting the customer
                delete_customer_success = self.test_admin_delete_customer(test_customer_id)
                if delete_customer_success:
                    # Verify customer was deleted
                    self.test_verify_customer_deletion(test_customer_id)
            
            # Test error handling - delete non-existent entities
            self.test_admin_delete_nonexistent_provider()
            self.test_admin_delete_nonexistent_customer()
        
        # ==================== JOB COMPLETION FLOW TESTS ====================
        print("\n✅ Testing Job Completion Flow...")
        
        # Create a new job for completion flow testing
        completion_job_data = {
            "service_provider_id": self.user_id,
            "client_name": "Mariama Bah",
            "service_type": "Plomberie",
            "description": "Réparer une fuite d'eau dans la salle de bain",
            "location": "Dixinn, Conakry"
        }
        
        completion_job_success, completion_job_response = self.run_test(
            "Create Job for Completion Flow",
            "POST",
            "jobs",
            200,
            data=completion_job_data
        )
        
        if completion_job_success and 'id' in completion_job_response:
            completion_job_id = completion_job_response['id']
            
            # First accept the job
            accept_data = {"status": "Accepted"}
            accept_success, _ = self.run_test(
                "Accept Job for Completion Flow",
                "PUT",
                f"jobs/{completion_job_id}",
                200,
                data=accept_data
            )
            
            if accept_success:
                # Test provider marking job as complete
                provider_complete_success = self.test_provider_mark_job_complete(completion_job_id)
                
                if provider_complete_success:
                    # Test customer confirming job completion
                    self.test_customer_confirm_job_complete(completion_job_id)
        
        # Test customer getting jobs
        self.test_customer_get_jobs()
        
        return self.get_results()

    def get_results(self):
        """Get test results summary"""
        print("\n" + "=" * 50)
        print(f"📊 Tests completed: {self.tests_passed}/{self.tests_run}")
        print(f"Success rate: {(self.tests_passed/self.tests_run)*100:.1f}%")
        
        if self.tests_passed < self.tests_run:
            print("\n❌ Failed tests:")
            for result in self.test_results:
                if not result['success']:
                    print(f"  - {result['test']}: {result['details']}")
        
        return {
            "total_tests": self.tests_run,
            "passed_tests": self.tests_passed,
            "success_rate": (self.tests_passed/self.tests_run)*100 if self.tests_run > 0 else 0,
            "test_details": self.test_results
        }

def main():
    tester = ServisProAPITester()
    results = tester.run_all_tests()
    
    # Return appropriate exit code
    return 0 if results["success_rate"] >= 80 else 1

if __name__ == "__main__":
    sys.exit(main())