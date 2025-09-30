const axios = require('axios');

const BASE_URL = 'https://attendease-backend-ovl6.onrender.com/api';

async function testDatabaseSchema() {
  console.log('🔍 Testing database schema and structure...');
  console.log('URL:', BASE_URL);
  console.log('');
  
  try {
    // Get database status
    console.log('1. Checking database status...');
    const dbResponse = await axios.get(`${BASE_URL}/database/status`);
    console.log('✅ Database status:', dbResponse.data);
    
    // Check students table structure
    console.log('\n2. Checking students table...');
    try {
      const studentsResponse = await axios.get(`${BASE_URL}/students`);
      if (studentsResponse.data.length > 0) {
        console.log('✅ Students table accessible');
        console.log('Sample student structure:', Object.keys(studentsResponse.data[0]));
        console.log('Sample student:', studentsResponse.data[0]);
        
        // Check if qr_code column exists
        const hasQrCode = studentsResponse.data[0].hasOwnProperty('qr_code');
        console.log('QR code column exists:', hasQrCode);
      }
    } catch (error) {
      console.log('❌ Failed to access students:', error.response?.data || error.message);
    }
    
    // Check daily_attendance table
    console.log('\n3. Checking daily_attendance table...');
    try {
      // Try to get today's attendance
      const today = new Date().toISOString().split('T')[0];
      const attendanceResponse = await axios.get(`${BASE_URL}/attendance-management/daily-status?date=${today}`);
      console.log('✅ Daily attendance accessible');
      console.log('Today\'s attendance count:', attendanceResponse.data.length);
    } catch (error) {
      console.log('❌ Failed to access daily attendance:', error.response?.data || error.message);
    }
    
    // Test QR code generation specifically
    console.log('\n4. Testing QR code generation...');
    const testData = {
      student_id: 'QRTEST123',
      name: 'QR Test Student',
      email: 'qrtest@test.com'
    };
    
    try {
      const qrResponse = await axios.post(`${BASE_URL}/students/register`, testData);
      console.log('✅ QR code generation successful');
      console.log('Response:', qrResponse.data);
    } catch (error) {
      console.log('❌ QR code generation failed');
      console.log('Error:', error.response?.data || error.message);
      
      // Check if student was created
      try {
        const studentsCheck = await axios.get(`${BASE_URL}/students`);
        const createdStudent = studentsCheck.data.find(s => s.student_id === testData.student_id);
        if (createdStudent) {
          console.log('✅ Student created despite QR error:', createdStudent);
        }
      } catch (checkError) {
        console.log('Failed to check student creation');
      }
    }
    
  } catch (error) {
    console.error('❌ Failed to connect to deployed backend:', error.message);
  }
}

testDatabaseSchema();