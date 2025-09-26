const { dbAdapter } = require('./config/database-adapter');

async function testStudents() {
  try {
    console.log('Checking existing students...');
    
    // Get all students
    const [students] = await dbAdapter.execute('SELECT student_id, name FROM students');
    
    if (students.length === 0) {
      console.log('❌ No students found in database');
      console.log('Creating a test student...');
      
      // Create a test student
      await dbAdapter.execute(
        'INSERT INTO students (student_id, name, email, qr_code) VALUES (?, ?, ?, ?)',
        ['TEST001', 'Test Student', 'test@example.com', 'test-qr-code']
      );
      
      console.log('✅ Test student created: TEST001');
    } else {
      console.log('✅ Found students:');
      students.forEach(student => {
        console.log(`  - ${student.student_id}: ${student.name}`);
      });
    }
    
    // Now test face enrollment with existing student
    const testStudentId = students.length > 0 ? students[0].student_id : 'TEST001';
    console.log(`\nTesting face enrollment for student: ${testStudentId}`);
    
    const http = require('http');
    const testData = {
      studentId: testStudentId,
      faceDescriptor: new Array(128).fill(0).map(() => Math.random()),
      sampleCount: 5
    };
    
    const postData = JSON.stringify(testData);
    const options = {
      hostname: 'localhost',
      port: 5000,
      path: '/api/students/enroll-face',
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(postData)
      }
    };
    
    const response = await new Promise((resolve, reject) => {
      const req = http.request(options, (res) => {
        let data = '';
        res.on('data', (chunk) => {
          data += chunk;
        });
        res.on('end', () => {
          resolve({ status: res.statusCode, data: JSON.parse(data) });
        });
      });
      
      req.on('error', (error) => {
        reject(error);
      });
      
      req.write(postData);
      req.end();
    });
    
    if (response.status === 201) {
      console.log('✅ Face enrollment successful!');
      console.log('Response:', response.data);
      
      // Verify in database
      const [faceRecords] = await dbAdapter.execute(
        'SELECT student_id, sample_count, LENGTH(face_descriptor) as descriptor_length FROM face_encodings WHERE student_id = ?',
        [testStudentId]
      );
      
      if (faceRecords.length > 0) {
        console.log('✅ Face data verified in database:');
        console.log('  Student ID:', faceRecords[0].student_id);
        console.log('  Sample Count:', faceRecords[0].sample_count);
        console.log('  Descriptor Length:', faceRecords[0].descriptor_length, 'characters');
      }
    } else {
      console.log('❌ Face enrollment failed:');
      console.log('Status:', response.status);
      console.log('Response:', response.data);
    }
    
  } catch (error) {
    console.error('Error:', error);
  }
}

testStudents();