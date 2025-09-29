const axios = require('axios');

async function testEnrollmentAPI() {
  try {
    console.log('🔐 Logging in...');
    const loginRes = await axios.post('http://localhost:5000/api/teachers/login', {
      email: 'admin@school.com',
      password: 'password'
    });
    
    const token = loginRes.data.token;
    console.log('✅ Login successful');
    
    console.log('📊 Fetching enrollment status...');
    const enrollmentRes = await axios.get('http://localhost:5000/api/enrollment-status/students', {
      headers: { Authorization: `Bearer ${token}` }
    });
    
    console.log('📋 Raw API Response:');
    console.log(JSON.stringify(enrollmentRes.data, null, 2));
    
    if (enrollmentRes.data.students && enrollmentRes.data.students.length > 0) {
      console.log('\n🔍 STU06 Details:');
      const stu06 = enrollmentRes.data.students.find(s => s.student_id === 'STU06');
      if (stu06) {
        console.log('Face enrolled:', stu06.face_enrolled);
        console.log('Fingerprint enrolled:', stu06.fingerprint_enrolled);
        console.log('PIN enrolled:', stu06.pin_enrolled);
        console.log('Overall status:', stu06.overall_status);
      }
    }
    
  } catch (error) {
    console.error('❌ Error:', error.response?.data || error.message);
  }
}

testEnrollmentAPI();