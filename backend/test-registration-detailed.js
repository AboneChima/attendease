const axios = require('axios');

const BASE_URL = 'https://attendease-backend-ovl6.onrender.com/api';

async function testRegistrationDetailed() {
  console.log('🔍 Testing registration with detailed error analysis...');
  console.log('URL:', BASE_URL);
  console.log('');
  
  try {
    // Test with completely unique data
    const timestamp = Date.now();
    const registrationData = {
      student_id: `UNIQUE${timestamp}`,
      name: `Unique Test Student ${timestamp}`,
      email: `unique${timestamp}@test.com`,
      course: 'Computer Science',
      year: '2024'
    };
    
    console.log('Testing with unique data:', registrationData);
    
    try {
      const response = await axios.post(`${BASE_URL}/students/register`, registrationData, {
        headers: {
          'Content-Type': 'application/json'
        }
      });
      
      console.log('✅ Registration successful!');
      console.log('Status:', response.status);
      console.log('Response:', response.data);
      
    } catch (error) {
      console.log('❌ Registration failed');
      console.log('Status:', error.response?.status);
      console.log('Error data:', error.response?.data);
      console.log('Error message:', error.message);
      
      if (error.response?.status === 500) {
        console.log('\n🔍 Server error detected. Let\'s check server logs...');
        
        // Test if the student was actually created despite the error
        console.log('\n🔍 Checking if student was created despite error...');
        try {
          const studentsResponse = await axios.get(`${BASE_URL}/students`);
          const createdStudent = studentsResponse.data.find(s => s.student_id === registrationData.student_id);
          
          if (createdStudent) {
            console.log('✅ Student was actually created successfully!');
            console.log('Created student:', createdStudent);
            console.log('🔍 This suggests the error occurs after student creation (likely QR code or daily attendance)');
          } else {
            console.log('❌ Student was not created');
          }
        } catch (listError) {
          console.log('❌ Failed to check students list:', listError.message);
        }
      }
    }
    
    // Test validation errors
    console.log('\n2. Testing validation...');
    try {
      const invalidResponse = await axios.post(`${BASE_URL}/students/register`, {
        student_id: '',
        name: '',
        email: 'invalid-email'
      });
    } catch (validationError) {
      console.log('✅ Validation working correctly');
      console.log('Validation response:', validationError.response?.data);
    }
    
  } catch (error) {
    console.error('❌ Failed to connect to deployed backend:', error.message);
  }
}

testRegistrationDetailed();