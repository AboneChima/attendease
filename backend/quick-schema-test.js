const axios = require('axios');

const BASE_URL = 'https://attendease-backend-ovl6.onrender.com/api';

async function quickSchemaTest() {
  console.log('🔧 Quick schema fix test...');
  console.log('URL:', BASE_URL);
  console.log('');
  
  try {
    // Test schema fix endpoint
    console.log('1. Testing schema fix endpoint...');
    try {
      const fixResponse = await axios.post(`${BASE_URL}/database/fix-schema`);
      console.log('✅ Schema fix successful:', fixResponse.data);
    } catch (error) {
      console.log('❌ Schema fix error:', error.response?.data || error.message);
    }
    
    // Wait a moment and check students
    console.log('\n2. Checking students after fix...');
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    try {
      const studentsResponse = await axios.get(`${BASE_URL}/students`);
      if (studentsResponse.data.length > 0) {
        console.log('Students found:', studentsResponse.data.length);
        console.log('Student keys:', Object.keys(studentsResponse.data[0]));
        
        const hasQRCode = Object.keys(studentsResponse.data[0]).includes('qr_code');
        console.log('QR code column exists:', hasQRCode);
        
        if (hasQRCode) {
          const studentsWithQR = studentsResponse.data.filter(s => s.qr_code);
          console.log('Students with QR codes:', studentsWithQR.length);
        }
      }
    } catch (error) {
      console.log('❌ Students check error:', error.response?.data || error.message);
    }
    
    // Test registration
    console.log('\n3. Testing registration...');
    try {
      const testData = {
        student_id: `QUICK${Date.now()}`,
        name: 'Quick Test Student',
        email: `quick${Date.now()}@test.com`
      };
      
      const registrationResponse = await axios.post(`${BASE_URL}/students/register`, testData);
      console.log('✅ Registration successful:', registrationResponse.data);
    } catch (error) {
      console.log('❌ Registration error:', error.response?.data || error.message);
    }
    
  } catch (error) {
    console.error('❌ Connection error:', error.message);
  }
}

quickSchemaTest();