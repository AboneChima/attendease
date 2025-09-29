const axios = require('axios');

async function testFrontendAPICall() {
  console.log('=== Testing Frontend API Call ===\n');
  
  // Simulate the exact same call the frontend makes
  const API_BASE_URL = 'http://localhost:5000/api';
  const fullUrl = `${API_BASE_URL}/students/verify-face`;
  
  console.log('API_BASE_URL:', API_BASE_URL);
  console.log('Full URL:', fullUrl);
  console.log('');
  
  // Create mock face descriptor like frontend does
  const mockFaceDescriptor = new Array(128).fill(0).map(() => Math.random());
  
  console.log('Request payload:');
  console.log('- faceDescriptor length:', mockFaceDescriptor.length);
  console.log('- First 5 values:', mockFaceDescriptor.slice(0, 5));
  console.log('');
  
  try {
    console.log('Making POST request...');
    const response = await axios.post(fullUrl, {
      faceDescriptor: mockFaceDescriptor
    }, {
      headers: {
        'Content-Type': 'application/json'
      }
    });
    
    console.log('✅ Success!');
    console.log('Status:', response.status);
    console.log('Response:', response.data);
    
  } catch (error) {
    console.log('❌ Error occurred:');
    console.log('Status:', error.response?.status);
    console.log('Status Text:', error.response?.statusText);
    console.log('Error Message:', error.message);
    console.log('Response Data:', error.response?.data);
    console.log('');
    console.log('Full Error:', error);
  }
}

testFrontendAPICall();