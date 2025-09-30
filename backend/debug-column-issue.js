const axios = require('axios');

const BASE_URL = 'https://attendease-backend-ovl6.onrender.com/api';

async function debugColumnIssue() {
  console.log('🔍 Debugging column detection issue...');
  console.log('URL:', BASE_URL);
  console.log('');
  
  try {
    // Test 1: Check what the schema fix endpoint actually detects
    console.log('1. Testing schema fix endpoint detection...');
    try {
      const fixResponse = await axios.post(`${BASE_URL}/database/fix-schema`);
      console.log('Schema fix response:', fixResponse.data);
    } catch (error) {
      console.log('Schema fix error:', error.response?.data || error.message);
    }
    
    // Test 2: Check students table directly
    console.log('\n2. Checking students table structure...');
    try {
      const studentsResponse = await axios.get(`${BASE_URL}/students`);
      if (studentsResponse.data.length > 0) {
        console.log('Students found:', studentsResponse.data.length);
        console.log('First student keys:', Object.keys(studentsResponse.data[0]));
        console.log('First student:', studentsResponse.data[0]);
        
        // Check if any student has qr_code
        const studentsWithQR = studentsResponse.data.filter(s => s.qr_code);
        console.log('Students with QR codes:', studentsWithQR.length);
        
        if (studentsWithQR.length > 0) {
          console.log('Sample QR code:', studentsWithQR[0].qr_code);
        }
      }
    } catch (error) {
      console.log('Students query error:', error.response?.data || error.message);
    }
    
    // Test 3: Try to force the column addition
    console.log('\n3. Attempting to force column addition...');
    try {
      // Create a custom endpoint test
      const testData = {
        student_id: `DEBUG${Date.now()}`,
        name: 'Debug Test Student',
        email: `debug${Date.now()}@test.com`,
        force_qr: true
      };
      
      const registrationResponse = await axios.post(`${BASE_URL}/students/register`, testData);
      console.log('Registration with force:', registrationResponse.data);
    } catch (error) {
      console.log('Forced registration error:', error.response?.data || error.message);
    }
    
    // Test 4: Check database diagnostic
    console.log('\n4. Checking database diagnostic...');
    try {
      const diagnosticResponse = await axios.get(`${BASE_URL}/diagnostic`);
      console.log('Diagnostic info:', diagnosticResponse.data);
    } catch (error) {
      console.log('Diagnostic error:', error.message);
    }
    
    // Test 5: Check if there's a table schema endpoint
    console.log('\n5. Checking for table schema information...');
    try {
      // Try different potential endpoints
      const endpoints = [
        '/database/schema',
        '/database/tables',
        '/database/structure'
      ];
      
      for (const endpoint of endpoints) {
        try {
          const response = await axios.get(`${BASE_URL}${endpoint}`);
          console.log(`✅ ${endpoint}:`, response.data);
        } catch (error) {
          console.log(`❌ ${endpoint}: Not found`);
        }
      }
    } catch (error) {
      console.log('Schema check error:', error.message);
    }
    
  } catch (error) {
    console.error('❌ Failed to connect to deployed backend:', error.message);
  }
}

debugColumnIssue();