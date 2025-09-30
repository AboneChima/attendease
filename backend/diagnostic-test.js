const axios = require('axios');

const BASE_URL = 'https://attendease-backend-ovl6.onrender.com/api';

async function diagnosticTest() {
  console.log('🔍 Diagnostic test with detailed logging...');
  console.log('URL:', BASE_URL);
  console.log('');
  
  try {
    // Wait for deployment
    console.log('⏳ Waiting for deployment to complete...');
    await new Promise(resolve => setTimeout(resolve, 45000)); // 45 seconds
    
    // Test schema fix with detailed logging
    console.log('1. Running schema fix with detailed logging...');
    try {
      const fixResponse = await axios.post(`${BASE_URL}/database/fix-schema`);
      console.log('Schema fix response:', JSON.stringify(fixResponse.data, null, 2));
    } catch (error) {
      console.log('Schema fix error:', error.response?.data || error.message);
    }
    
    // Check students immediately after
    console.log('\n2. Checking students immediately after schema fix...');
    try {
      const studentsResponse = await axios.get(`${BASE_URL}/students`);
      if (studentsResponse.data.length > 0) {
        console.log('Students found:', studentsResponse.data.length);
        console.log('First student structure:', JSON.stringify(studentsResponse.data[0], null, 2));
        
        const hasQRCode = Object.keys(studentsResponse.data[0]).includes('qr_code');
        console.log('QR code column exists:', hasQRCode);
      }
    } catch (error) {
      console.log('Students check error:', error.response?.data || error.message);
    }
    
    // Try registration
    console.log('\n3. Testing registration...');
    try {
      const testData = {
        student_id: `DIAG${Date.now()}`,
        name: 'Diagnostic Test Student',
        email: `diag${Date.now()}@test.com`
      };
      
      const registrationResponse = await axios.post(`${BASE_URL}/students/register`, testData);
      console.log('Registration successful:', registrationResponse.data);
    } catch (error) {
      console.log('Registration error:', error.response?.data || error.message);
    }
    
  } catch (error) {
    console.error('Connection error:', error.message);
  }
}

diagnosticTest();