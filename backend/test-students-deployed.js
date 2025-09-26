const axios = require('axios');

const DEPLOYED_BASE_URL = 'https://attendease-backend-ovl6.onrender.com';

async function testDeployedStudents() {
  console.log('🔍 Testing deployed backend students...\n');
  
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
    
    // 2. Test if we can get students list
    console.log('2. Testing students endpoint...');
    try {
      const studentsResponse = await axios.get(`${DEPLOYED_BASE_URL}/api/students`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      console.log('✅ Students endpoint successful:');
      console.log('Total students:', studentsResponse.data.length);
      if (studentsResponse.data.length > 0) {
        console.log('First few students:', studentsResponse.data.slice(0, 3));
      } else {
        console.log('❌ No students found in the deployed database!');
        console.log('This explains why attendance initialization returns "undefined students"');
      }
    } catch (studentsError) {
      console.log('❌ Students endpoint failed:');
      console.log('Status:', studentsError.response?.status);
      console.log('Error:', studentsError.response?.data);
    }
    console.log('');
    
    // 3. Test if we can create a test student
    console.log('3. Testing student creation...');
    try {
      const createResponse = await axios.post(`${DEPLOYED_BASE_URL}/api/students/register`, {
        student_id: 'TEST001',
        name: 'Test Student',
        email: 'test@student.com',
        phone: '1234567890'
      });
      console.log('✅ Student creation successful:', createResponse.data);
    } catch (createError) {
      console.log('❌ Student creation failed:');
      console.log('Status:', createError.response?.status);
      console.log('Error:', createError.response?.data);
    }
    
  } catch (error) {
    console.error('❌ Test failed:', error.message);
  }
}

testDeployedStudents();