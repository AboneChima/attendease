const axios = require('axios');

const BASE_URL = 'http://localhost:5000/api';

async function testLoginAndAPI() {
  try {
    console.log('🔐 Testing teacher login...');
    
    // Login to get JWT token
    const loginResponse = await axios.post(`${BASE_URL}/teachers/login`, {
      email: 'test@teacher.com',
      password: 'password123'
    });
    
    console.log('✅ Login successful!');
    const token = loginResponse.data.token;
    console.log('Token received:', token.substring(0, 50) + '...');
    
    console.log('\n📊 Testing attendance-management API...');
    
    // Test the attendance-management endpoint
    const attendanceResponse = await axios.get(
      `${BASE_URL}/attendance-management/daily/2025-09-26`,
      {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      }
    );
    
    console.log('✅ Attendance management API working!');
    console.log('Response data:', JSON.stringify(attendanceResponse.data, null, 2));
    
  } catch (error) {
    console.error('❌ Error:', error.message);
    if (error.response) {
      console.error('Status:', error.response.status);
      console.error('Data:', error.response.data);
    }
  }
}

testLoginAndAPI();