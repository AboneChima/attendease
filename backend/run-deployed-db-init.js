const axios = require('axios');

const BASE_URL = 'https://attendease-backend-ovl6.onrender.com/api';

async function runDeployedDatabaseInit() {
  console.log('🚀 Running deployed database initialization...');
  console.log('URL:', BASE_URL);
  console.log('');
  
  try {
    // Try to run the database initialization endpoint (correct path)
    console.log('1. Attempting database initialization...');
    
    try {
      const initResponse = await axios.post(`${BASE_URL}/database/initialize`, {}, {
        timeout: 30000 // 30 second timeout
      });
      console.log('✅ Database initialization successful!');
      console.log('Response:', initResponse.data);
      
      // Test registration after initialization
      console.log('\n2. Testing registration after initialization...');
      const testData = {
        student_id: `INIT${Date.now()}`,
        name: 'Post-Init Test Student',
        email: `init${Date.now()}@test.com`
      };
      
      try {
        const registrationResponse = await axios.post(`${BASE_URL}/students/register`, testData);
        console.log('✅ Registration now working!');
        console.log('Response:', registrationResponse.data);
      } catch (regError) {
        console.log('❌ Registration still failing:', regError.response?.data || regError.message);
      }
      
    } catch (error) {
      console.log('❌ Database initialization failed:', error.response?.data || error.message);
      
      // Check if the endpoint exists
      if (error.response?.status === 404) {
        console.log('\n🔍 Database initialization endpoint not found. Checking available endpoints...');
        
        // Try to access the database status to see what's available
        try {
          const statusResponse = await axios.get(`${BASE_URL}/database/status`);
          console.log('Database status:', statusResponse.data);
        } catch (statusError) {
          console.log('Failed to get database status:', statusError.message);
        }
      }
    }
    
    // Final verification - check if qr_code column exists now
    console.log('\n3. Final verification - checking students table structure...');
    try {
      const studentsResponse = await axios.get(`${BASE_URL}/students`);
      if (studentsResponse.data.length > 0) {
        const sampleStudent = studentsResponse.data[0];
        const hasQrCode = sampleStudent.hasOwnProperty('qr_code');
        console.log('QR code column exists:', hasQrCode);
        console.log('Sample student structure:', Object.keys(sampleStudent));
        
        if (hasQrCode) {
          console.log('✅ Database schema is now correct!');
        } else {
          console.log('❌ QR code column still missing');
        }
      }
    } catch (error) {
      console.log('Failed to verify students table:', error.message);
    }
    
  } catch (error) {
    console.error('❌ Failed to connect to deployed backend:', error.message);
  }
}

runDeployedDatabaseInit();