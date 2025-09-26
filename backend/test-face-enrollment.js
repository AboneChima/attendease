const http = require('http');

// Test face enrollment API
async function testFaceEnrollment() {
  try {
    console.log('Testing face enrollment API...');
    
    const testData = {
      studentId: 'TEST001',
      faceDescriptor: new Array(128).fill(0).map(() => Math.random()), // Mock face descriptor
      sampleCount: 5
    };
    
    console.log('Sending test enrollment data:', {
      studentId: testData.studentId,
      descriptorLength: testData.faceDescriptor.length,
      sampleCount: testData.sampleCount
    });
    
    // Make HTTP POST request
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
    
    console.log('✅ Enrollment successful!');
    console.log('Response:', response.data);
    
    // Verify data was stored
    const { dbAdapter } = require('./config/database-adapter');
    const [records] = await dbAdapter.execute(
      'SELECT student_id, sample_count, LENGTH(face_descriptor) as descriptor_length FROM face_encodings WHERE student_id = ?',
      [testData.studentId]
    );
    
    if (records.length > 0) {
      console.log('✅ Data verified in database:');
      console.log('  Student ID:', records[0].student_id);
      console.log('  Sample Count:', records[0].sample_count);
      console.log('  Descriptor Length:', records[0].descriptor_length, 'characters');
    } else {
      console.log('❌ No data found in database');
    }
    
  } catch (error) {
    console.error('❌ Enrollment failed:');
    console.error('Error:', error.message);
    if (error.response) {
      console.error('Response status:', error.response.status);
      console.error('Response data:', error.response.data);
    }
  }
}

testFaceEnrollment();