const axios = require('axios');

const BASE_URL = 'https://attendease-backend-ovl6.onrender.com/api';

async function finalSchemaFix() {
  console.log('🔧 Final schema fix test...');
  console.log('URL:', BASE_URL);
  console.log('');
  
  try {
    // Wait for deployment
    console.log('⏳ Waiting for deployment to complete...');
    await new Promise(resolve => setTimeout(resolve, 45000)); // 45 seconds
    
    // Test 1: Run the corrected schema fix
    console.log('1. Running corrected schema fix...');
    try {
      const fixResponse = await axios.post(`${BASE_URL}/database/fix-schema`);
      console.log('✅ Schema fix response:', fixResponse.data);
    } catch (error) {
      console.log('❌ Schema fix error:', error.response?.data || error.message);
    }
    
    // Test 2: Verify the fix worked
    console.log('\n2. Verifying schema fix...');
    try {
      const studentsResponse = await axios.get(`${BASE_URL}/students`);
      if (studentsResponse.data.length > 0) {
        console.log('Students found:', studentsResponse.data.length);
        console.log('First student keys:', Object.keys(studentsResponse.data[0]));
        
        // Check if qr_code column exists
        const hasQRCode = Object.keys(studentsResponse.data[0]).includes('qr_code');
        console.log('✅ QR code column exists:', hasQRCode);
        
        if (hasQRCode) {
          const studentsWithQR = studentsResponse.data.filter(s => s.qr_code);
          console.log('Students with QR codes:', studentsWithQR.length);
          
          if (studentsWithQR.length > 0) {
            console.log('Sample QR code:', studentsWithQR[0].qr_code);
          }
        }
      }
    } catch (error) {
      console.log('❌ Students verification error:', error.response?.data || error.message);
    }
    
    // Test 3: Test student registration
    console.log('\n3. Testing student registration...');
    try {
      const testData = {
        student_id: `FINAL${Date.now()}`,
        name: 'Final Test Student',
        email: `final${Date.now()}@test.com`
      };
      
      const registrationResponse = await axios.post(`${BASE_URL}/students/register`, testData);
      console.log('✅ Registration successful:', registrationResponse.data);
      
      // Verify the new student has QR code
      const studentsResponse = await axios.get(`${BASE_URL}/students`);
      const newStudent = studentsResponse.data.find(s => s.student_id === testData.student_id);
      if (newStudent) {
        console.log('New student created:', {
          id: newStudent.id,
          student_id: newStudent.student_id,
          name: newStudent.name,
          has_qr_code: !!newStudent.qr_code,
          qr_code: newStudent.qr_code
        });
      }
      
    } catch (error) {
      console.log('❌ Registration error:', error.response?.data || error.message);
    }
    
    // Test 4: Final database status
    console.log('\n4. Final database status...');
    try {
      const statusResponse = await axios.get(`${BASE_URL}/database/status`);
      console.log('Database status:', statusResponse.data);
    } catch (error) {
      console.log('❌ Status error:', error.response?.data || error.message);
    }
    
    console.log('\n🎉 Schema fix test completed!');
    
  } catch (error) {
    console.error('❌ Failed to connect to deployed backend:', error.message);
  }
}

finalSchemaFix();