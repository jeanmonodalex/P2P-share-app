#!/usr/bin/env python3
"""
Comprehensive Backend API Testing for ShareSwiss P2P App
Tests all endpoints including authentication, items, bookings, and messages
"""

import requests
import sys
import json
from datetime import datetime, timedelta
from typing import Dict, Any, Optional

class ShareSwissAPITester:
    def __init__(self, base_url="http://localhost:8001"):
        self.base_url = base_url
        self.token = None
        self.user_id = None
        self.tests_run = 0
        self.tests_passed = 0
        self.test_user_email = f"test_user_{datetime.now().strftime('%H%M%S')}@test.com"
        self.test_user_data = {
            "email": self.test_user_email,
            "password": "TestPass123!",
            "nom": "TestNom",
            "prenom": "TestPrenom",
            "telephone": "+41791234567",
            "canton": "Vaud"
        }

    def log_test(self, name: str, success: bool, details: str = ""):
        """Log test results"""
        self.tests_run += 1
        if success:
            self.tests_passed += 1
            print(f"✅ {name} - PASSED {details}")
        else:
            print(f"❌ {name} - FAILED {details}")

    def make_request(self, method: str, endpoint: str, data: Optional[Dict] = None, 
                    files: Optional[Dict] = None, expected_status: int = 200) -> tuple[bool, Dict]:
        """Make HTTP request and return success status and response data"""
        url = f"{self.base_url}{endpoint}"
        headers = {'Content-Type': 'application/json'}
        
        if self.token:
            headers['Authorization'] = f'Bearer {self.token}'
        
        try:
            if method == 'GET':
                response = requests.get(url, headers=headers)
            elif method == 'POST':
                if files:
                    # Remove Content-Type for multipart/form-data
                    headers.pop('Content-Type', None)
                    response = requests.post(url, data=data, files=files, headers=headers)
                else:
                    response = requests.post(url, json=data, headers=headers)
            elif method == 'PUT':
                response = requests.put(url, json=data, headers=headers)
            elif method == 'DELETE':
                response = requests.delete(url, headers=headers)
            else:
                return False, {"error": f"Unsupported method: {method}"}

            success = response.status_code == expected_status
            try:
                response_data = response.json()
            except:
                response_data = {"status_code": response.status_code, "text": response.text}
            
            return success, response_data

        except Exception as e:
            return False, {"error": str(e)}

    def test_health_check(self):
        """Test health endpoint"""
        success, response = self.make_request('GET', '/api/health')
        self.log_test("Health Check", success, f"Response: {response.get('message', '')}")
        return success

    def test_get_cantons(self):
        """Test cantons endpoint"""
        success, response = self.make_request('GET', '/api/cantons')
        cantons_valid = success and 'cantons' in response and len(response['cantons']) == 25
        self.log_test("Get Swiss Cantons", cantons_valid, 
                     f"Found {len(response.get('cantons', []))} cantons")
        return cantons_valid

    def test_user_registration(self):
        """Test user registration"""
        success, response = self.make_request('POST', '/api/auth/register', 
                                            self.test_user_data, expected_status=200)
        
        if success and 'access_token' in response:
            self.token = response['access_token']
            self.log_test("User Registration", True, "Token received")
            return True
        else:
            self.log_test("User Registration", False, f"Response: {response}")
            return False

    def test_user_login(self):
        """Test user login"""
        login_data = {
            "email": self.test_user_email,
            "password": self.test_user_data["password"]
        }
        success, response = self.make_request('POST', '/api/auth/login', login_data)
        
        if success and 'access_token' in response:
            self.token = response['access_token']
            if 'user' in response:
                self.user_id = response['user'].get('id')
            self.log_test("User Login", True, "Login successful")
            return True
        else:
            self.log_test("User Login", False, f"Response: {response}")
            return False

    def test_get_user_profile(self):
        """Test getting current user profile"""
        success, response = self.make_request('GET', '/api/auth/me')
        profile_valid = (success and 'email' in response and 
                        response['email'] == self.test_user_email)
        self.log_test("Get User Profile", profile_valid, 
                     f"Email: {response.get('email', 'N/A')}")
        return profile_valid

    def test_create_item(self):
        """Test creating an item"""
        # Test with form data (multipart) - backend expects Form data
        url = f"{self.base_url}/api/items"
        headers = {'Authorization': f'Bearer {self.token}'}
        
        item_data = {
            "titre": "Vélo électrique Trek Test",
            "description": "Vélo électrique en excellent état pour vos déplacements",
            "categorie": "Vélos",
            "prix_par_jour": "35.0",
            "canton": "Vaud",
            "ville": "Lausanne"
        }
        
        try:
            response = requests.post(url, data=item_data, headers=headers)
            success = response.status_code == 200
            
            if success:
                response_data = response.json()
                if 'id' in response_data:
                    self.test_item_id = response_data['id']
                    self.log_test("Create Item", True, f"Item ID: {response_data['id']}")
                    return response_data['id']
            
            self.log_test("Create Item", False, f"Status: {response.status_code}, Response: {response.text}")
            return None
            
        except Exception as e:
            self.log_test("Create Item", False, f"Error: {str(e)}")
            return None

    def test_search_items(self):
        """Test searching items"""
        # Test basic search
        success, response = self.make_request('GET', '/api/items')
        items_found = success and 'items' in response
        self.log_test("Search Items (All)", items_found, 
                     f"Found {len(response.get('items', []))} items")
        
        # Test search with query
        success2, response2 = self.make_request('GET', '/api/items?q=vélo')
        search_works = success2 and 'items' in response2
        self.log_test("Search Items (Query)", search_works, 
                     f"Found {len(response2.get('items', []))} items for 'vélo'")
        
        # Test canton filter
        success3, response3 = self.make_request('GET', '/api/items?canton=Vaud')
        canton_filter_works = success3 and 'items' in response3
        self.log_test("Search Items (Canton Filter)", canton_filter_works, 
                     f"Found {len(response3.get('items', []))} items in Vaud")
        
        return items_found and search_works and canton_filter_works

    def test_get_item_details(self, item_id: str):
        """Test getting item details"""
        if not item_id:
            self.log_test("Get Item Details", False, "No item ID provided")
            return False
            
        success, response = self.make_request('GET', f'/api/items/{item_id}')
        details_valid = success and 'titre' in response and 'prix_par_jour' in response
        self.log_test("Get Item Details", details_valid, 
                     f"Title: {response.get('titre', 'N/A')}")
        return details_valid

    def test_create_booking(self, item_id: str):
        """Test creating a booking"""
        if not item_id:
            self.log_test("Create Booking", False, "No item ID provided")
            return None
            
        booking_data = {
            "item_id": item_id,
            "date_debut": (datetime.now() + timedelta(days=1)).isoformat(),
            "date_fin": (datetime.now() + timedelta(days=3)).isoformat(),
            "message": "Je souhaiterais louer ce vélo pour le weekend"
        }
        
        success, response = self.make_request('POST', '/api/bookings', booking_data)
        
        if success and 'id' in response:
            self.log_test("Create Booking", True, f"Booking ID: {response['id']}")
            return response['id']
        else:
            self.log_test("Create Booking", False, f"Response: {response}")
            return None

    def test_get_my_bookings(self):
        """Test getting user's bookings"""
        success, response = self.make_request('GET', '/api/bookings/mes-reservations')
        bookings_valid = success and 'reservations' in response
        self.log_test("Get My Bookings", bookings_valid, 
                     f"Found {len(response.get('reservations', []))} bookings")
        return bookings_valid

    def test_send_message(self):
        """Test sending a message"""
        if not self.user_id:
            self.log_test("Send Message", False, "No user ID available")
            return False
            
        message_data = {
            "destinataire_id": self.user_id,  # Send to self for testing
            "contenu": "Message de test pour ShareSwiss"
        }
        
        success, response = self.make_request('POST', '/api/messages', message_data)
        message_sent = success and 'id' in response
        self.log_test("Send Message", message_sent, 
                     f"Message ID: {response.get('id', 'N/A')}")
        return message_sent

    def test_get_conversations(self):
        """Test getting conversations"""
        success, response = self.make_request('GET', '/api/messages/conversations')
        conversations_valid = success and 'messages' in response
        self.log_test("Get Conversations", conversations_valid, 
                     f"Found {len(response.get('messages', []))} messages")
        return conversations_valid

    def test_invalid_endpoints(self):
        """Test error handling for invalid requests"""
        # Test invalid item ID
        success, response = self.make_request('GET', '/api/items/invalid_id', expected_status=400)
        self.log_test("Invalid Item ID Handling", success, "400 error returned correctly")
        
        # Test unauthorized access (without token)
        old_token = self.token
        self.token = None
        success2, response2 = self.make_request('POST', '/api/items', {}, expected_status=403)
        self.token = old_token
        self.log_test("Unauthorized Access Handling", success2, "403 error returned correctly")
        
        return success and success2

    def run_all_tests(self):
        """Run all tests in sequence"""
        print("🚀 Starting ShareSwiss Backend API Tests")
        print("=" * 50)
        
        # Basic API tests
        self.test_health_check()
        self.test_get_cantons()
        
        # Authentication tests
        if not self.test_user_registration():
            print("❌ Registration failed, stopping tests")
            return False
            
        self.test_get_user_profile()
        
        # Test login with existing user
        self.test_user_login()
        
        # Item management tests
        item_id = self.test_create_item()
        self.test_search_items()
        self.test_get_item_details(item_id)
        
        # Booking tests (will fail as we can't book our own item)
        booking_id = self.test_create_booking(item_id)
        self.test_get_my_bookings()
        
        # Messaging tests
        self.test_send_message()
        self.test_get_conversations()
        
        # Error handling tests
        self.test_invalid_endpoints()
        
        # Print results
        print("\n" + "=" * 50)
        print(f"📊 Test Results: {self.tests_passed}/{self.tests_run} tests passed")
        print(f"Success Rate: {(self.tests_passed/self.tests_run)*100:.1f}%")
        
        if self.tests_passed == self.tests_run:
            print("🎉 All tests passed!")
            return True
        else:
            print(f"⚠️  {self.tests_run - self.tests_passed} tests failed")
            return False

def main():
    """Main test runner"""
    # Use the public endpoint from frontend .env
    base_url = "http://localhost:8001"  # Will be updated if needed
    
    tester = ShareSwissAPITester(base_url)
    success = tester.run_all_tests()
    
    return 0 if success else 1

if __name__ == "__main__":
    sys.exit(main())