#!/usr/bin/env python3

import requests
import sys
import json
import uuid
from datetime import datetime

class ServisProAPITester:
    def __init__(self, base_url="https://servispro-guinea.preview.emergentagent.com"):
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
            "profession": "Electrician"
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
            "profession": "Mechanic",
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