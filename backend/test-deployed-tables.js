const axios = require('axios');

const DEPLOYED_BASE_URL = 'https://attendease-backend-ovl6.onrender.com';

async function testDeployedTables() {
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
    
    // 2. Test basic endpoints to see what tables exist
    console.log('2. Testing basic endpoints to check table existence...');
    
    // Test students table
    try {
      const studentsResponse = await axios.get(`${DEPLOYED_BASE_URL}/api/students`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      console.log('✅ Students table exists - returned', studentsResponse.data.length, 'students');
    } catch (error) {
      console.log('❌ Students table issue:', error.response?.data?.error || error.message);
    }
    
    // Test teachers table (we know this works since login succeeded)
    console.log('✅ Teachers table exists (login successful)');
    
    // Test attendance table by trying to get today's attendance
    try {
      const today = new Date().toISOString().split('T')[0];
      const attendanceResponse = await axios.get(`${DEPLOYED_BASE_URL}/api/attendance/today`);
      console.log('✅ Attendance table exists');
    } catch (error) {
      console.log('❌ Attendance table issue:', error.response?.data?.error || error.message);
    }
    
    // Test attendance management tables
    try {
      const today = new Date().toISOString().split('T')[0];
      const dailyResponse = await axios.get(`${DEPLOYED_BASE_URL}/api/attendance-management/daily/${today}`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      console.log('✅ Attendance management tables exist');
    } catch (error) {
      console.log('❌ Attendance management tables issue:', error.response?.data?.error || error.message);
    }
    
    console.log('\n3. Testing student registration with detailed error logging...');
    
    // Try to register a student and see the exact error
    try {
      const createResponse = await axios.post(`${DEPLOYED_BASE_URL}/api/students/register`, {
        student_id: 'DEBUG001',
        name: 'Debug Student',
        email: 'debug@test.com',
        phone: '1234567890'
      });
      console.log('✅ Student registration successful:', createResponse.data);
    } catch (createError) {
      console.log('❌ Student registration failed:');
      console.log('Status:', createError.response?.status);
      console.log('Error:', createError.response?.data);
      console.log('Full error:', createError.message);
      
      // Check if it's a database connection issue
      if (createError.response?.data?.error === 'Failed to register student') {
        console.log('\n🔍 This suggests a database operation failed during student registration');
        console.log('Possible causes:');
        console.log('- Missing students table');
        console.log('- Missing daily_attendance table'); 
        console.log('- Database connection issues');
        console.log('- Missing QR code generation dependencies');
      }
    }
    
  } catch (error) {
    console.error('❌ Test failed:', error.message);
  }
}

testDeployedTables();