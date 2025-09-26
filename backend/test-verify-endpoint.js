const axios = require('axios');
const { dbAdapter } = require('./config/database-adapter');

async function testVerifyEndpoint() {
  try {
    console.log('=== Testing Face Verification Endpoint ===\n');
    
    // Get the newly enrolled face (Blessing Chidera - STU007)
    const [encodings] = await dbAdapter.execute(`
      SELECT 
        fe.student_id, 
        fe.face_descriptor,
        s.name
      FROM face_encodings fe
      JOIN students s ON fe.student_id = s.student_id
      WHERE fe.student_id = 'STU007'
    `);

    if (encodings.length === 0) {
      console.log('❌ No face encoding found for STU007');
      return;
    }

    const blessingFace = JSON.parse(encodings[0].face_descriptor);
    console.log(`✅ Found face encoding for ${encodings[0].name} (${encodings[0].student_id})`);
    console.log(`Face descriptor length: ${blessingFace.length}`);
    console.log(`First 5 values: [${blessingFace.slice(0, 5).map(v => v.toFixed(4)).join(', ')}...]`);
    console.log('');

    // Test the endpoint directly
    console.log('Testing /api/students/verify-face endpoint...');
    
    try {
      const response = await axios.post('http://localhost:5000/api/students/verify-face', {
        faceDescriptor: blessingFace
      }, {
        headers: {
          'Content-Type': 'application/json'
        }
      });

      console.log('✅ Endpoint response:');
      console.log('Status:', response.status);
      console.log('Data:', JSON.stringify(response.data, null, 2));
      
    } catch (error) {
      console.log('❌ Endpoint error:');
      console.log('Status:', error.response?.status || 'No status');
      console.log('Status Text:', error.response?.statusText || 'No status text');
      console.log('Data:', error.response?.data || 'No data');
      console.log('Message:', error.message);
      
      if (error.code) {
        console.log('Error Code:', error.code);
      }
    }

  } catch (error) {
    console.error('Script error:', error);
  } finally {
    process.exit(0);
  }
}

testVerifyEndpoint();