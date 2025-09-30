const axios = require('axios');

const BASE_URL = 'https://attendease-backend-ovl6.onrender.com/api';

async function testDeployedRegistration() {
  console.log('🔍 Testing deployed student registration endpoint...');
  console.log('URL:', BASE_URL);
  console.log('');
  
  try {
    // Test registration endpoint with new student data
    console.log('1. Testing student registration...');
    const registrationData = {
      student_id: 'TEST999',
      name: 'Test Student Registration',
      email: 'test999@student.com',
      course: 'Computer Science',
      year: '2024'
    };
    
    console.log('Registration data:', registrationData);
    
    try {
      const registrationResponse = await axios.post(`${BASE_URL}/students/register`, registrationData);
      console.log('✅ Registration successful!');
      console.log('Response:', registrationResponse.data);
    } catch (error) {
      if (error.response?.status === 400 && error.response?.data?.error?.includes('already exists')) {
        console.log('ℹ️ Student already exists (expected for existing test data)');
        console.log('Response:', error.response.data);
        
        // Try with a unique timestamp-based ID
        const uniqueData = {
          ...registrationData,
          student_id: `TEST${Date.now()}`,
          email: `test${Date.now()}@student.com`
        };
        
        console.log('\n2. Testing with unique student data...');
        console.log('Unique data:', uniqueData);
        
        try {
          const uniqueResponse = await axios.post(`${BASE_URL}/students/register`, uniqueData);
          console.log('✅ Unique registration successful!');
          console.log('Response:', uniqueResponse.data);
        } catch (uniqueError) {
          console.log('❌ Unique registration failed:', uniqueError.response?.data || uniqueError.message);
        }
      } else {
        console.log('❌ Registration failed:', error.response?.data || error.message);
      }
    }
    
    console.log('\n3. Testing students list endpoint...');
    try {
      const studentsResponse = await axios.get(`${BASE_URL}/students`);
      console.log('✅ Students list retrieved successfully');
      console.log(`📊 Total students: ${studentsResponse.data.length}`);
      console.log('Recent students:', studentsResponse.data.slice(-3).map(s => ({ id: s.student_id, name: s.name })));
    } catch (error) {
      console.log('❌ Failed to get students list:', error.response?.data || error.message);
    }
    
  } catch (error) {
    console.error('❌ Failed to connect to deployed backend:', error.message);
  }
}

testDeployedRegistration();