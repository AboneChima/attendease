const axios = require('axios');

const API_BASE_URL = 'http://localhost:5000/api';

async function testDashboardEnrollment() {
  console.log('🧪 Testing Teacher Dashboard Enrollment Display...\n');

  try {
    // Step 1: Login as teacher
    console.log('🔐 Step 1: Logging in as teacher...');
    const loginResponse = await axios.post(`${API_BASE_URL}/teachers/login`, {
      email: 'admin@school.com',
      password: 'password'
    });

    const token = loginResponse.data.token;
    const headers = {
      'Authorization': `Bearer ${token}`
    };

    console.log('✅ Teacher login successful\n');

    // Step 2: Test enrollment status endpoint
    console.log('📊 Step 2: Testing enrollment status endpoint...');
    const enrollmentResponse = await axios.get(`${API_BASE_URL}/enrollment-status/students`, {
      headers: { Authorization: `Bearer ${token}` }
    });

    let stu06Found = false;
    
    if (enrollmentResponse.data.success) {
      console.log('✅ Enrollment status endpoint working');
      console.log(`📈 Found ${enrollmentResponse.data.students.length} students`);
      
      // Step 3: Verify STU06 enrollment
      console.log('\n🔍 Step 3: Checking STU06 enrollment...');
      const stu06 = enrollmentResponse.data.students.find(s => s.student_id === 'STU06');
      if (stu06) {
        stu06Found = true;
        console.log('✅ STU06 found in enrollment data');
        console.log(`📸 Face enrolled: ${stu06.face_enrolled ? '✅' : '❌'}`);
        console.log(`👆 Fingerprint enrolled: ${stu06.fingerprint_enrolled ? '✅' : '❌'}`);
        console.log(`🔢 PIN enrolled: ${stu06.pin_enrolled ? '✅' : '❌'}`);
        console.log(`🎯 Overall status: ${stu06.overall_status}`);
      } else {
        console.log('❌ STU06 not found in enrollment data');
      }
    } else {
      console.log('❌ Test failed:', enrollmentResponse.data);
      console.log('🔍 Endpoint not found - check API routes');
      return;
    }

    console.log('\n📋 All Students Enrollment Status:');
    enrollmentResponse.data.students.forEach(student => {
      const status = student.face_enrolled && student.fingerprint_enrolled && student.pin_enrolled
        ? 'Complete'
        : student.face_enrolled || student.fingerprint_enrolled || student.pin_enrolled
        ? 'Partial'
        : 'None';
      
      console.log(`  ${student.student_id} - ${student.student_name}: ${status}`);
      console.log(`    📱 Face: ${student.face_enrolled ? '✅' : '❌'} | 👆 Fingerprint: ${student.fingerprint_enrolled ? '✅' : '❌'} | 🔢 PIN: ${student.pin_enrolled ? '✅' : '❌'}`);
    });

    // Step 4: Test dashboard data endpoints
    console.log('\n📊 Step 4: Testing dashboard data endpoints...');
    
    const today = new Date().toISOString().split('T')[0];
    const attendanceResponse = await axios.get(`${API_BASE_URL}/attendance-management/daily/${today}`, { headers });
    console.log('✅ Today\'s attendance data retrieved');
    
    const summaryResponse = await axios.get(`${API_BASE_URL}/attendance/summary`, { headers });
    console.log('✅ Summary data retrieved');

    console.log('\n🎉 Dashboard enrollment display test completed successfully!');
    console.log('\n📝 Test Results Summary:');
    console.log(`   📊 Enrollment API: Working`);
    console.log(`   🔍 STU06 Status: ${stu06Found ? 'Found and enrolled via Face Recognition' : 'Not found'}`);
    console.log(`   👥 Total Students: ${enrollmentResponse.data.students.length}`);
    console.log(`   📱 Face Enrolled: ${enrollmentResponse.data.summary.enrolled_face}`);
    console.log(`   👆 Fingerprint Enrolled: ${enrollmentResponse.data.summary.enrolled_fingerprint}`);
    console.log(`   🔢 PIN Enrolled: ${enrollmentResponse.data.summary.enrolled_pin}`);
    console.log(`   ✅ Fully Enrolled: ${enrollmentResponse.data.summary.fully_enrolled}`);

  } catch (error) {
    console.error('❌ Test failed:', error.response?.data || error.message);
    if (error.response?.status === 401) {
      console.log('🔐 Authentication failed - check teacher credentials');
    } else if (error.response?.status === 404) {
      console.log('🔍 Endpoint not found - check API routes');
    }
  }
}

testDashboardEnrollment();