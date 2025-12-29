#!/usr/bin/env python3

import requests
import sys
import json
import uuid
from datetime import datetime

class ServisProAPITester:
    def __init__(self, base_url="https://servicepro-guinea.preview.emergentagent.com"):
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

    def test_user_login(self, phone_number):
        """Test user login"""
        login_data = {
            "phone_number": phone_number,
            "password": "TestPass123!"
        }
        
        success, response = self.run_test(
            "User Login",
            "POST",
            "auth/login",
            200,
            data=login_data
        )
        
        if success and 'token' in response:
            self.token = response['token']
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

    def run_all_tests(self):
        """Run all API tests"""
        print("🚀 Starting ServisPro API Tests")
        print("=" * 50)
        
        # Test registration and login
        reg_success, test_phone = self.test_user_registration()
        if not reg_success:
            print("❌ Registration failed, stopping tests")
            return self.get_results()
        
        login_success = self.test_user_login(test_phone)
        if not login_success:
            print("❌ Login failed, stopping tests")
            return self.get_results()
        
        # Test profile operations
        self.test_get_profile()
        self.test_update_profile()
        
        # Test provider operations
        self.test_get_all_providers()
        self.test_get_provider_by_id()
        
        # Test job operations
        job_success, job_id = self.test_create_job_offer()
        self.test_get_my_jobs()
        if job_success:
            self.test_update_job_status(job_id)
        
        # Test error cases
        self.test_invalid_login()
        self.test_unauthorized_access()
        
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