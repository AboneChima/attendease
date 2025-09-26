const axios = require('axios');

const DEPLOYED_BASE_URL = 'https://attendease-backend-ovl6.onrender.com';

async function testDeployedBackend() {
  console.log('🔍 Testing deployed backend in detail...\n');
  
  try {
    // 1. Test health endpoint
    console.log('1. Testing health endpoint...');
    const healthResponse = await axios.get(`${DEPLOYED_BASE_URL}/api/health`);
    console.log(`✅ Health check: ${healthResponse.status} - ${healthResponse.data.message}\n`);
    
    // 2. Test attendance-management endpoint without auth (should get 401)
    console.log('2. Testing attendance-management endpoint without auth...');
    try {
      const noAuthResponse = await axios.get(`${DEPLOYED_BASE_URL}/api/attendance-management/daily/2025-01-26`);
      console.log(`❌ Unexpected success: ${noAuthResponse.status}`);
    } catch (error) {
      if (error.response && error.response.status === 401) {
        console.log('✅ Correctly returns 401 Unauthorized without token\n');
      } else if (error.response && error.response.status === 500) {
        console.log('❌ Returns 500 Internal Server Error - this is the problem!');
        console.log('Error details:', error.response.data);
        console.log('');
      } else {
        console.log(`❌ Unexpected error: ${error.response?.status || error.message}\n`);
      }
    }
    
    // 3. Test teacher registration endpoint
    console.log('3. Testing teacher registration...');
    try {
      const registerResponse = await axios.post(`${DEPLOYED_BASE_URL}/api/teachers/register`, {
        teacher_id: 'TEST002',
        name: 'Test Teacher 2',
        email: 'test2@teacher.com',
        password: 'password123'
      });
      console.log(`✅ Teacher registration: ${registerResponse.status}`);
    } catch (error) {
      if (error.response && error.response.status === 500) {
        console.log('❌ Teacher registration returns 500 - database issue!');
        console.log('Error details:', error.response.data);
      } else {
        console.log(`Registration error: ${error.response?.status || error.message} - ${error.response?.data?.error || error.message}`);
      }
    }
    console.log('');
    
    // 4. Test teacher login endpoint
    console.log('4. Testing teacher login...');
    try {
      const loginResponse = await axios.post(`${DEPLOYED_BASE_URL}/api/teachers/login`, {
        email: 'admin@school.com',
        password: 'password'
      });
      console.log(`✅ Teacher login: ${loginResponse.status}`);
      
      // If login successful, test with token
      if (loginResponse.data.token) {
        console.log('5. Testing attendance-management with valid token...');
        try {
          const authResponse = await axios.get(`${DEPLOYED_BASE_URL}/api/attendance-management/daily/2025-01-26`, {
            headers: {
              'Authorization': `Bearer ${loginResponse.data.token}`
            }
          });
          console.log(`✅ Attendance management with auth: ${authResponse.status}`);
          console.log('Response data:', JSON.stringify(authResponse.data, null, 2));
        } catch (authError) {
          if (authError.response && authError.response.status === 500) {
            console.log('❌ Attendance management returns 500 even with valid token!');
            console.log('Error details:', authError.response.data);
          } else {
            console.log(`Auth request error: ${authError.response?.status || authError.message}`);
          }
        }
      }
    } catch (error) {
      if (error.response && error.response.status === 500) {
        console.log('❌ Teacher login returns 500 - database issue!');
        console.log('Error details:', error.response.data);
      } else {
        console.log(`Login error: ${error.response?.status || error.message} - ${error.response?.data?.error || error.message}`);
      }
    }
    
  } catch (error) {
    console.error('❌ Test failed:', error.message);
  }
}

testDeployedBackend();