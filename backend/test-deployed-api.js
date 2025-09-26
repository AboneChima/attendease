const axios = require('axios');

const BASE_URL = 'https://attendease-backend-ovl6.onrender.com/api';

async function testDeployedAPI() {
  try {
    console.log('🌐 Testing deployed backend on Render...');
    console.log('URL:', BASE_URL);
    console.log('');
    
    // Test health endpoint
    console.log('🔍 Testing health endpoint...');
    try {
      const healthResponse = await axios.get(`${BASE_URL}/health`);
      console.log('✅ Health check successful!');
      console.log('Response:', healthResponse.data);
    } catch (error) {
      console.error('❌ Health check failed:', error.message);
      return;
    }
    
    console.log('\n' + '='.repeat(50) + '\n');
    
    // Test teacher login to get token
    console.log('🔐 Testing teacher login...');
    let token = null;
    
    try {
      const loginResponse = await axios.post(`${BASE_URL}/teachers/login`, {
        email: 'test@teacher.com',
        password: 'password123'
      });
      
      console.log('✅ Login successful!');
      token = loginResponse.data.token;
      console.log('Token received:', token.substring(0, 50) + '...');
      
    } catch (error) {
      console.error('❌ Login failed:', error.response?.data || error.message);
      
      // Try to create a teacher account on the deployed backend
      console.log('\n🔧 Attempting to create test teacher account...');
      try {
        const createResponse = await axios.post(`${BASE_URL}/teachers/register`, {
          teacher_id: 'TEST001',
          name: 'Test Teacher',
          email: 'test@teacher.com',
          password: 'password123'
        });
        
        console.log('✅ Teacher account created!');
        
        // Try login again
        const retryLoginResponse = await axios.post(`${BASE_URL}/teachers/login`, {
          email: 'test@teacher.com',
          password: 'password123'
        });
        
        token = retryLoginResponse.data.token;
        console.log('✅ Login successful after account creation!');
        console.log('Token received:', token.substring(0, 50) + '...');
        
      } catch (createError) {
        console.error('❌ Failed to create teacher account:', createError.response?.data || createError.message);
        return;
      }
    }
    
    if (!token) {
      console.error('❌ No token available, cannot test protected endpoints');
      return;
    }
    
    console.log('\n' + '='.repeat(50) + '\n');
    
    // Test attendance-management endpoint
    console.log('📊 Testing attendance-management endpoint...');
    try {
      const attendanceResponse = await axios.get(
        `${BASE_URL}/attendance-management/daily/2025-09-26`,
        {
          headers: {
            'Authorization': `Bearer ${token}`
          }
        }
      );
      
      console.log('✅ Attendance management API working!');
      console.log('Status:', attendanceResponse.status);
      console.log('Students count:', attendanceResponse.data.students?.length || 0);
      console.log('Summary:', attendanceResponse.data.summary);
      
    } catch (error) {
      console.error('❌ Attendance management API failed:');
      console.error('Status:', error.response?.status);
      console.error('Data:', error.response?.data);
      console.error('Message:', error.message);
      
      // If it's a 500 error, this confirms the issue
      if (error.response?.status === 500) {
        console.log('\n🚨 CONFIRMED: 500 Internal Server Error on deployed backend');
        console.log('This matches the error reported in the frontend.');
      }
    }
    
  } catch (error) {
    console.error('❌ General error:', error.message);
  }
}

testDeployedAPI();