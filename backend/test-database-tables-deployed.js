const axios = require('axios');

const DEPLOYED_BASE_URL = 'https://attendease-backend-ovl6.onrender.com';

async function testDeployedDatabaseTables() {
  console.log('🔍 Testing deployed backend database tables...\n');
  
  try {
    // 1. Login to get a token
    console.log('1. Logging in to get authentication token...');
    const loginResponse = await axios.post(`${DEPLOYED_BASE_URL}/api/teachers/login`, {
      email: 'admin@school.com',
      password: 'password'
    });
    
    if (!loginResponse.data.token) {
      console.log('❌ Failed to get authentication token');
      return;
    }
    
    const token = loginResponse.data.token;
    console.log('✅ Successfully obtained authentication token\n');
    
    // 2. Test if we can initialize daily attendance (this will create tables if they don't exist)
    console.log('2. Testing daily attendance initialization...');
    try {
      const initResponse = await axios.post(`${DEPLOYED_BASE_URL}/api/attendance-management/initialize/2025-01-26`, {}, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      console.log('✅ Daily attendance initialization successful:', initResponse.data);
    } catch (initError) {
      console.log('❌ Daily attendance initialization failed:');
      console.log('Status:', initError.response?.status);
      console.log('Error:', initError.response?.data);
      
      if (initError.response?.status === 500) {
        console.log('This suggests the attendance management tables may not exist on the deployed database.');
      }
    }
    console.log('');
    
    // 3. Test the daily attendance endpoint again
    console.log('3. Testing daily attendance endpoint after initialization...');
    try {
      const dailyResponse = await axios.get(`${DEPLOYED_BASE_URL}/api/attendance-management/daily/2025-01-26`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      console.log('✅ Daily attendance endpoint successful:', dailyResponse.data);
    } catch (dailyError) {
      console.log('❌ Daily attendance endpoint still failing:');
      console.log('Status:', dailyError.response?.status);
      console.log('Error:', dailyError.response?.data);
    }
    
  } catch (error) {
    console.error('❌ Test failed:', error.message);
  }
}

testDeployedDatabaseTables();