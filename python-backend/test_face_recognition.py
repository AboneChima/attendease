#!/usr/bin/env python3
"""
Test script for face recognition enrollment and verification
Run this after starting the FastAPI server to test the fixes
"""

import requests
import base64
import json
from PIL import Image
import io
import numpy as np

# Server URL
BASE_URL = "http://localhost:8001"

def image_to_base64(image_path):
    """Convert image file to base64 string"""
    try:
        with open(image_path, "rb") as image_file:
            encoded_string = base64.b64encode(image_file.read()).decode('utf-8')
            return f"data:image/jpeg;base64,{encoded_string}"
    except FileNotFoundError:
        print(f"Image file not found: {image_path}")
        return None

def test_enrollment(student_id, image_path):
    """Test face enrollment"""
    print(f"\n=== Testing Enrollment for {student_id} ===")
    
    # Convert image to base64
    image_data = image_to_base64(image_path)
    if not image_data:
        return False
    
    # Prepare data
    data = {
        "student_id": student_id,
        "image_data": image_data
    }
    
    try:
        response = requests.post(f"{BASE_URL}/api/face/enroll", data=data)
        print(f"Status Code: {response.status_code}")
        print(f"Response: {response.json()}")
        return response.status_code == 200
    except Exception as e:
        print(f"Error during enrollment: {e}")
        return False

def test_verification(image_path):
    """Test face verification"""
    print(f"\n=== Testing Verification ===")
    
    # Convert image to base64
    image_data = image_to_base64(image_path)
    if not image_data:
        return False
    
    # Prepare data
    data = {
        "image_data": image_data
    }
    
    try:
        response = requests.post(f"{BASE_URL}/api/face/verify", data=data)
        print(f"Status Code: {response.status_code}")
        print(f"Response: {response.json()}")
        return response.status_code == 200
    except Exception as e:
        print(f"Error during verification: {e}")
        return False

def test_get_enrolled_faces():
    """Test getting enrolled faces"""
    print(f"\n=== Testing Get Enrolled Faces ===")
    
    try:
        response = requests.get(f"{BASE_URL}/api/face/enrolled")
        print(f"Status Code: {response.status_code}")
        print(f"Response: {response.json()}")
        return response.status_code == 200
    except Exception as e:
        print(f"Error getting enrolled faces: {e}")
        return False

def main():
    """Main test function"""
    print("Face Recognition Test Script")
    print("=" * 50)
    
    # Test server health
    try:
        response = requests.get(f"{BASE_URL}/")
        print(f"Server Health Check: {response.json()}")
    except Exception as e:
        print(f"Server not running or not accessible: {e}")
        print("Please start the FastAPI server first with: python main.py")
        return
    
    # Instructions for manual testing
    print("\nTo test the face recognition system:")
    print("1. Place test images in the python-backend directory")
    print("2. Update the image paths below")
    print("3. Run this script")
    print("\nExample usage:")
    print("test_enrollment('student123', 'test_image1.jpg')")
    print("test_verification('test_image1.jpg')  # Should match student123")
    print("test_verification('test_image2.jpg')  # Should not match if different person")
    
    # Get current enrolled faces
    test_get_enrolled_faces()
    
    # Uncomment and modify these lines to test with your images:
    # test_enrollment("student123", "path/to/your/test_image.jpg")
    # test_verification("path/to/your/test_image.jpg")

if __name__ == "__main__":
    main()