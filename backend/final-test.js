const axios = require('axios');

const BASE_URL = 'https://attendease-backend-ovl6.onrender.com/api';

async function finalTest() {
  console.log('🎯 Final test with IF NOT EXISTS approach...');
  console.log('URL:', BASE_URL);
  console.log('');
  
  try {
    // Wait for deployment
    console.log('⏳ Waiting for deployment to complete...');
    await new Promise(resolve => setTimeout(resolve, 45000)); // 45 seconds
    
    // Test schema fix
    console.log('1. Running schema fix with IF NOT EXISTS...');
    try {
      const fixResponse = await axios.post(`${BASE_URL}/database/fix-schema`);
      console.log('✅ Schema fix response:', JSON.stringify(fixResponse.data, null, 2));
    } catch (error) {
      console.log('❌ Schema fix error:', error.response?.data || error.message);
    }
    
    // Check students structure
    console.log('\n2. Checking students structure after fix...');
    try {
      const studentsResponse = await axios.get(`${BASE_URL}/students`);
      if (studentsResponse.data.length > 0) {
        console.log('Students found:', studentsResponse.data.length);
        const firstStudent = studentsResponse.data[0];
        console.log('Student columns:', Object.keys(firstStudent));
        
        const hasQRCode = Object.keys(firstStudent).includes('qr_code');
        console.log('✅ QR code column exists:', hasQRCode);
        
        if (hasQRCode) {
          console.log('✅ SUCCESS! QR code column has been added!');
          
          // Check how many students have QR codes
          const studentsWithQR = studentsResponse.data.filter(s => s.qr_code);
          console.log('Students with QR codes:', studentsWithQR.length);
          
          if (studentsWithQR.length > 0) {
            console.log('Sample QR code:', studentsWithQR[0].qr_code);
          }
        } else {
          console.log('❌ QR code column still missing');
        }
      }
    } catch (error) {
      console.log('❌ Students check error:', error.response?.data || error.message);
    }
    
    // Test registration
    console.log('\n3. Testing student registration...');
    try {
      const testData = {
        student_id: `FINAL${Date.now()}`,
        name: 'Final Test Student',
        email: `final${Date.now()}@test.com`
      };
      
      console.log('Registering student:', testData);
      const registrationResponse = await axios.post(`${BASE_URL}/students/register`, testData);
      console.log('✅ Registration successful!');
      console.log('Response:', registrationResponse.data);
      
      // Verify the new student has QR code
      const studentsResponse = await axios.get(`${BASE_URL}/students`);
      const newStudent = studentsResponse.data.find(s => s.student_id === testData.student_id);
      
      if (newStudent) {
        console.log('✅ New student created:', {
          id: newStudent.id,
          student_id: newStudent.student_id,
          name: newStudent.name,
          has_qr_code: !!newStudent.qr_code,
          qr_code: newStudent.qr_code || 'No QR code'
        });
        
        if (newStudent.qr_code) {
          console.log('🎉 SUCCESS! Student registration with QR code is working!');
        }
      }
      
    } catch (error) {
      console.log('❌ Registration error:', error.response?.data || error.message);
    }
    
    console.log('\n🏁 Final test completed!');
    
  } catch (error) {
    console.error('❌ Connection error:', error.message);
  }
}

finalTest();