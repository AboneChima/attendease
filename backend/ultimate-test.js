const axios = require('axios');

const BASE_URL = 'https://attendease-backend-ovl6.onrender.com/api';

async function ultimateTest() {
  console.log('🚀 Ultimate schema fix and registration test...');
  console.log('URL:', BASE_URL);
  console.log('');
  
  try {
    // Wait for deployment
    console.log('⏳ Waiting for deployment to complete...');
    await new Promise(resolve => setTimeout(resolve, 50000)); // 50 seconds
    
    // Test 1: Run the direct schema fix
    console.log('1. Running direct schema fix...');
    try {
      const fixResponse = await axios.post(`${BASE_URL}/database/fix-schema`);
      console.log('✅ Schema fix response:', fixResponse.data);
    } catch (error) {
      console.log('❌ Schema fix error:', error.response?.data || error.message);
    }
    
    // Test 2: Verify students table structure
    console.log('\n2. Checking students table structure...');
    try {
      const studentsResponse = await axios.get(`${BASE_URL}/students`);
      if (studentsResponse.data.length > 0) {
        console.log('Students found:', studentsResponse.data.length);
        console.log('Student keys:', Object.keys(studentsResponse.data[0]));
        
        const hasQRCode = Object.keys(studentsResponse.data[0]).includes('qr_code');
        console.log('✅ QR code column exists:', hasQRCode);
        
        if (hasQRCode) {
          const studentsWithQR = studentsResponse.data.filter(s => s.qr_code);
          console.log('Students with QR codes:', studentsWithQR.length);
          
          if (studentsWithQR.length > 0) {
            console.log('Sample student with QR:', {
              id: studentsWithQR[0].id,
              student_id: studentsWithQR[0].student_id,
              qr_code: studentsWithQR[0].qr_code
            });
          }
        }
      }
    } catch (error) {
      console.log('❌ Students check error:', error.response?.data || error.message);
    }
    
    // Test 3: Test student registration
    console.log('\n3. Testing student registration...');
    try {
      const testData = {
        student_id: `ULTIMATE${Date.now()}`,
        name: 'Ultimate Test Student',
        email: `ultimate${Date.now()}@test.com`
      };
      
      console.log('Registering student:', testData);
      const registrationResponse = await axios.post(`${BASE_URL}/students/register`, testData);
      console.log('✅ Registration successful!');
      console.log('Response:', registrationResponse.data);
      
      // Verify the new student
      console.log('\n4. Verifying new student...');
      const studentsResponse = await axios.get(`${BASE_URL}/students`);
      const newStudent = studentsResponse.data.find(s => s.student_id === testData.student_id);
      
      if (newStudent) {
        console.log('✅ New student found:', {
          id: newStudent.id,
          student_id: newStudent.student_id,
          name: newStudent.name,
          email: newStudent.email,
          has_qr_code: !!newStudent.qr_code,
          qr_code: newStudent.qr_code || 'No QR code'
        });
      } else {
        console.log('❌ New student not found in database');
      }
      
    } catch (error) {
      console.log('❌ Registration failed:', error.response?.data || error.message);
      
      // Check if student was created despite error
      try {
        const studentsResponse = await axios.get(`${BASE_URL}/students`);
        const testStudents = studentsResponse.data.filter(s => s.name.includes('Ultimate Test'));
        if (testStudents.length > 0) {
          console.log('Student created despite error:', testStudents[testStudents.length - 1]);
        }
      } catch (checkError) {
        console.log('Could not check for created student:', checkError.message);
      }
    }
    
    // Test 4: Test all other endpoints
    console.log('\n5. Testing other endpoints...');
    
    // Test teachers endpoint
    try {
      const teachersResponse = await axios.get(`${BASE_URL}/teachers`);
      console.log('✅ Teachers endpoint working:', teachersResponse.data.length, 'teachers');
    } catch (error) {
      console.log('❌ Teachers endpoint error:', error.message);
    }
    
    // Test attendance endpoint
    try {
      const attendanceResponse = await axios.get(`${BASE_URL}/attendance`);
      console.log('✅ Attendance endpoint working');
    } catch (error) {
      console.log('❌ Attendance endpoint error:', error.message);
    }
    
    // Test health check
    try {
      const healthResponse = await axios.get(`${BASE_URL}/health`);
      console.log('✅ Health check:', healthResponse.data);
    } catch (error) {
      console.log('❌ Health check error:', error.message);
    }
    
    console.log('\n🎉 Ultimate test completed!');
    
  } catch (error) {
    console.error('❌ Failed to connect to deployed backend:', error.message);
  }
}

ultimateTest();