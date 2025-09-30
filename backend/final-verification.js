const axios = require('axios');

const BASE_URL = 'https://attendease-backend-ovl6.onrender.com/api';

async function finalVerification() {
  console.log('🔍 Final verification after database initialization...');
  console.log('URL:', BASE_URL);
  console.log('');
  
  try {
    // Check database status
    console.log('1. Checking database status...');
    const dbResponse = await axios.get(`${BASE_URL}/database/status`);
    console.log('✅ Database status:', dbResponse.data);
    
    // Check students table structure
    console.log('\n2. Checking students table structure...');
    try {
      const studentsResponse = await axios.get(`${BASE_URL}/students`);
      if (studentsResponse.data.length > 0) {
        console.log('✅ Students table accessible');
        console.log('Sample student structure:', Object.keys(studentsResponse.data[0]));
        console.log('Sample student:', studentsResponse.data[0]);
        
        // Check if qr_code column exists
        const hasQrCode = studentsResponse.data[0].hasOwnProperty('qr_code');
        console.log('QR code column exists:', hasQrCode);
      } else {
        console.log('No students found in table');
      }
    } catch (error) {
      console.log('❌ Failed to access students:', error.response?.status, error.response?.data || error.message);
    }
    
    // Test registration with detailed error handling
    console.log('\n3. Testing student registration...');
    const testData = {
      student_id: `FINAL${Date.now()}`,
      name: 'Final Test Student',
      email: `final${Date.now()}@test.com`
    };
    
    try {
      const registrationResponse = await axios.post(`${BASE_URL}/students/register`, testData);
      console.log('✅ Registration successful!');
      console.log('Response:', registrationResponse.data);
    } catch (error) {
      console.log('❌ Registration failed');
      console.log('Status:', error.response?.status);
      console.log('Error:', error.response?.data || error.message);
      
      // Check if student was created despite error
      try {
        console.log('\n4. Checking if student was created despite error...');
        const studentsCheck = await axios.get(`${BASE_URL}/students`);
        const createdStudent = studentsCheck.data.find(s => s.student_id === testData.student_id);
        if (createdStudent) {
          console.log('✅ Student was created:', createdStudent);
          console.log('Has QR code:', createdStudent.hasOwnProperty('qr_code'));
          if (createdStudent.qr_code) {
            console.log('QR code value:', createdStudent.qr_code.substring(0, 50) + '...');
          }
        } else {
          console.log('❌ Student was not created');
        }
      } catch (checkError) {
        console.log('Failed to check student creation');
      }
    }
    
    // Test health endpoint
    console.log('\n5. Testing health endpoint...');
    try {
      const healthResponse = await axios.get(`${BASE_URL}/health`);
      console.log('✅ Health check:', healthResponse.data);
    } catch (error) {
      console.log('❌ Health check failed:', error.message);
    }
    
  } catch (error) {
    console.error('❌ Failed to connect to deployed backend:', error.message);
  }
}

finalVerification();