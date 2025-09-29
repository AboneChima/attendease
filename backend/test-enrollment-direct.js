const axios = require('axios');
const { dbAdapter } = require('./config/database-adapter');

async function testEnrollmentDirect() {
  try {
    console.log('=== Testing Face Enrollment Directly ===\n');
    
    // Get a student to test with
    const [students] = await dbAdapter.execute('SELECT student_id, name FROM students LIMIT 1');
    if (students.length === 0) {
      console.log('❌ No students found in database');
      return;
    }
    
    const testStudent = students[0];
    console.log(`Testing with student: ${testStudent.name} (${testStudent.student_id})`);
    
    // Create a mock face descriptor (128 random values)
    const mockFaceDescriptor = new Array(128).fill(0).map(() => Math.random());
    
    console.log('Mock face descriptor:');
    console.log(`  - Length: ${mockFaceDescriptor.length}`);
    console.log(`  - First 5 values: [${mockFaceDescriptor.slice(0, 5).map(v => v.toFixed(4)).join(', ')}]`);
    console.log('');
    
    // Test the enrollment endpoint
    console.log('Making enrollment request...');
    const response = await axios.post('http://localhost:5000/api/students/enroll-face', {
      studentId: testStudent.student_id,
      faceDescriptor: mockFaceDescriptor,
      sampleCount: 1
    }, {
      headers: {
        'Content-Type': 'application/json'
      }
    });
    
    console.log('✅ Enrollment response:');
    console.log('Status:', response.status);
    console.log('Data:', response.data);
    console.log('');
    
    // Check if data was saved to database
    console.log('Checking database for saved data...');
    const [savedData] = await dbAdapter.execute(
      'SELECT student_id, LENGTH(face_descriptor) as desc_length, sample_count, enrollment_date FROM face_encodings WHERE student_id = ?',
      [testStudent.student_id]
    );
    
    if (savedData.length > 0) {
      console.log('✅ Data found in database:');
      console.log(`  - Student ID: ${savedData[0].student_id}`);
      console.log(`  - Descriptor Length: ${savedData[0].desc_length} characters`);
      console.log(`  - Sample Count: ${savedData[0].sample_count}`);
      console.log(`  - Enrollment Date: ${savedData[0].enrollment_date}`);
      
      // Verify the actual descriptor
      const [fullData] = await dbAdapter.execute(
        'SELECT face_descriptor FROM face_encodings WHERE student_id = ?',
        [testStudent.student_id]
      );
      
      const savedDescriptor = JSON.parse(fullData[0].face_descriptor);
      console.log(`  - Saved descriptor length: ${savedDescriptor.length}`);
      console.log(`  - First 5 saved values: [${savedDescriptor.slice(0, 5).map(v => v.toFixed(4)).join(', ')}]`);
      
    } else {
      console.log('❌ No data found in database after enrollment');
    }
    
  } catch (error) {
    console.error('❌ Test failed:');
    console.error('Error:', error.message);
    if (error.response) {
      console.error('Response status:', error.response.status);
      console.error('Response data:', error.response.data);
    }
  }
}

testEnrollmentDirect();