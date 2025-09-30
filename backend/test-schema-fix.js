const axios = require('axios');

const BASE_URL = 'https://attendease-backend-ovl6.onrender.com/api';

async function testSchemaFix() {
  console.log('🔧 Testing schema fix endpoint...');
  console.log('URL:', BASE_URL);
  console.log('');
  
  try {
    // Wait a bit for deployment
    console.log('⏳ Waiting for deployment to complete...');
    await new Promise(resolve => setTimeout(resolve, 30000)); // Wait 30 seconds
    
    // Test the new schema fix endpoint
    console.log('1. Running schema fix...');
    try {
      const fixResponse = await axios.post(`${BASE_URL}/database/fix-schema`, {}, {
        timeout: 60000 // 60 second timeout
      });
      console.log('✅ Schema fix successful!');
      console.log('Response:', fixResponse.data);
    } catch (error) {
      console.log('❌ Schema fix failed:', error.response?.data || error.message);
      
      if (error.response?.status === 404) {
        console.log('🔍 Endpoint not found - deployment may not be complete yet');
        return;
      }
    }
    
    // Verify the fix worked
    console.log('\n2. Verifying schema fix...');
    try {
      const studentsResponse = await axios.get(`${BASE_URL}/students`);
      if (studentsResponse.data.length > 0) {
        const sampleStudent = studentsResponse.data[0];
        const hasQrCode = sampleStudent.hasOwnProperty('qr_code');
        console.log('✅ Students table accessible');
        console.log('Sample student structure:', Object.keys(sampleStudent));
        console.log('QR code column exists:', hasQrCode);
        
        if (hasQrCode && sampleStudent.qr_code) {
          console.log('QR code sample:', sampleStudent.qr_code.substring(0, 50) + '...');
        }
      }
    } catch (error) {
      console.log('❌ Failed to verify students table:', error.message);
    }
    
    // Test registration after schema fix
    console.log('\n3. Testing registration after schema fix...');
    const testData = {
      student_id: `FIXED${Date.now()}`,
      name: 'Schema Fixed Test Student',
      email: `fixed${Date.now()}@test.com`
    };
    
    try {
      const registrationResponse = await axios.post(`${BASE_URL}/students/register`, testData);
      console.log('✅ Registration now working perfectly!');
      console.log('Response:', registrationResponse.data);
      
      if (registrationResponse.data.qr_code) {
        console.log('QR code generated:', registrationResponse.data.qr_code.substring(0, 50) + '...');
      }
    } catch (error) {
      console.log('❌ Registration still failing:', error.response?.data || error.message);
      
      // Check if student was created
      try {
        const studentsCheck = await axios.get(`${BASE_URL}/students`);
        const createdStudent = studentsCheck.data.find(s => s.student_id === testData.student_id);
        if (createdStudent) {
          console.log('Student created:', createdStudent);
          console.log('Has QR code:', createdStudent.hasOwnProperty('qr_code'));
        }
      } catch (checkError) {
        console.log('Failed to check student creation');
      }
    }
    
    // Final database status check
    console.log('\n4. Final database status...');
    try {
      const statusResponse = await axios.get(`${BASE_URL}/database/status`);
      console.log('Database status:', statusResponse.data);
    } catch (error) {
      console.log('Failed to get database status:', error.message);
    }
    
  } catch (error) {
    console.error('❌ Failed to connect to deployed backend:', error.message);
  }
}

testSchemaFix();