const axios = require('axios');

const BASE_URL = 'https://attendease-backend-ovl6.onrender.com/api';

async function fixDeployedDatabaseSchema() {
  console.log('🔧 Fixing deployed database schema...');
  console.log('URL:', BASE_URL);
  console.log('');
  
  try {
    // First, let's check if there's a database initialization endpoint
    console.log('1. Checking available database endpoints...');
    
    try {
      const initResponse = await axios.post(`${BASE_URL}/database/init`);
      console.log('✅ Database initialization successful!');
      console.log('Response:', initResponse.data);
    } catch (error) {
      console.log('❌ Database init endpoint failed:', error.response?.data || error.message);
      
      // Try alternative endpoint
      try {
        console.log('\n2. Trying alternative database setup...');
        const setupResponse = await axios.post(`${BASE_URL}/database/setup`);
        console.log('✅ Database setup successful!');
        console.log('Response:', setupResponse.data);
      } catch (setupError) {
        console.log('❌ Database setup failed:', setupError.response?.data || setupError.message);
        
        // Check if we can access any database management endpoints
        console.log('\n3. Checking database status after attempts...');
        try {
          const statusResponse = await axios.get(`${BASE_URL}/database/status`);
          console.log('Database status:', statusResponse.data);
        } catch (statusError) {
          console.log('Failed to get database status:', statusError.message);
        }
      }
    }
    
    // Test registration again after schema fix
    console.log('\n4. Testing registration after schema fix...');
    const testData = {
      student_id: `FIXED${Date.now()}`,
      name: 'Schema Fix Test Student',
      email: `fixed${Date.now()}@test.com`
    };
    
    try {
      const registrationResponse = await axios.post(`${BASE_URL}/students/register`, testData);
      console.log('✅ Registration now working!');
      console.log('Response:', registrationResponse.data);
    } catch (error) {
      console.log('❌ Registration still failing:', error.response?.data || error.message);
      
      // Check if student was created
      try {
        const studentsResponse = await axios.get(`${BASE_URL}/students`);
        const createdStudent = studentsResponse.data.find(s => s.student_id === testData.student_id);
        if (createdStudent) {
          console.log('Student created:', createdStudent);
          
          // Check if qr_code column now exists
          const hasQrCode = createdStudent.hasOwnProperty('qr_code');
          console.log('QR code column now exists:', hasQrCode);
        }
      } catch (checkError) {
        console.log('Failed to check student creation');
      }
    }
    
  } catch (error) {
    console.error('❌ Failed to connect to deployed backend:', error.message);
  }
}

fixDeployedDatabaseSchema();