const axios = require('axios');

const API_BASE_URL = 'http://localhost:5000/api';

async function testEnrollmentAPI() {
  try {
    console.log('🧪 Testing Enrollment Status API...\n');
    
    // Test 1: Get all students enrollment status
    console.log('📊 Test 1: Get all students enrollment status');
    const allStudentsResponse = await axios.get(`${API_BASE_URL}/enrollment-status/students`);
    
    if (allStudentsResponse.data.success) {
      console.log('✅ All students enrollment status retrieved successfully');
      console.log(`📈 Summary:`, allStudentsResponse.data.summary);
      console.log(`🔧 Available methods:`, allStudentsResponse.data.available_methods);
      
      console.log('\n👥 Students enrollment details:');
      allStudentsResponse.data.students.forEach(student => {
        console.log(`\n👤 ${student.student_id} - ${student.name}:`);
        console.log(`  📱 Face: ${student.enrollment_methods.face ? '✅ Enrolled' : '❌ Not enrolled'}`);
        console.log(`  👆 Fingerprint: ${student.enrollment_methods.fingerprint ? '✅ Enrolled' : '❌ Not enrolled'}`);
        console.log(`  🔢 PIN: ${student.enrollment_methods.pin ? '✅ Enrolled' : '❌ Not enrolled'}`);
        
        if (student.enrollment_methods.face && student.enrollment_details.face) {
          console.log(`    Face details: Confidence: ${student.enrollment_details.face.confidence}, Quality: ${student.enrollment_details.face.quality_score}`);
        }
      });
    } else {
      console.log('❌ Failed to get all students enrollment status:', allStudentsResponse.data.error);
    }
    
    // Test 2: Get specific student (STU06) enrollment status
    console.log('\n\n🔍 Test 2: Get STU06 enrollment status');
    try {
      const stu06Response = await axios.get(`${API_BASE_URL}/enrollment-status/students/STU06`);
      
      if (stu06Response.data.success) {
        console.log('✅ STU06 enrollment status retrieved successfully');
        const student = stu06Response.data.student;
        console.log(`👤 ${student.student_id} - ${student.name}:`);
        console.log(`  📱 Face: ${student.enrollment_methods.face ? '✅ Enrolled' : '❌ Not enrolled'}`);
        console.log(`  👆 Fingerprint: ${student.enrollment_methods.fingerprint ? '✅ Enrolled' : '❌ Not enrolled'}`);
        console.log(`  🔢 PIN: ${student.enrollment_methods.pin ? '✅ Enrolled' : '❌ Not enrolled'}`);
        
        if (student.enrollment_details.face) {
          console.log(`  Face enrollment details:`, student.enrollment_details.face);
        }
      } else {
        console.log('❌ Failed to get STU06 enrollment status:', stu06Response.data.error);
      }
    } catch (error) {
      console.log('❌ Error getting STU06 enrollment status:', error.response?.data?.error || error.message);
    }
    
    // Test 3: Get non-existent student enrollment status
    console.log('\n\n🔍 Test 3: Get non-existent student (STU99) enrollment status');
    try {
      const nonExistentResponse = await axios.get(`${API_BASE_URL}/enrollment-status/students/STU99`);
      console.log('❌ Should have failed for non-existent student');
    } catch (error) {
      if (error.response?.status === 404) {
        console.log('✅ Correctly returned 404 for non-existent student');
        console.log(`   Error message: ${error.response.data.error}`);
      } else {
        console.log('❌ Unexpected error:', error.response?.data?.error || error.message);
      }
    }
    
    console.log('\n🎉 Enrollment API testing completed!');
    
  } catch (error) {
    console.error('❌ Test failed:', error.response?.data || error.message);
  }
}

testEnrollmentAPI();