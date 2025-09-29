const http = require('http');

// Mock face descriptor for testing
const mockFaceDescriptor = Array.from({length: 128}, () => Math.random() * 2 - 1);

// Test verification with different scenarios
async function makeRequest(endpoint, data) {
  return new Promise((resolve, reject) => {
    const postData = JSON.stringify(data);
    
    const options = {
      hostname: 'localhost',
      port: 5000,
      path: endpoint,
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(postData)
      }
    };

    const req = http.request(options, (res) => {
      let responseData = '';
      
      res.on('data', (chunk) => {
        responseData += chunk;
      });
      
      res.on('end', () => {
        try {
          const parsedData = JSON.parse(responseData);
          resolve({
            status: res.statusCode,
            data: parsedData
          });
        } catch (error) {
          reject(new Error(`Failed to parse response: ${responseData}`));
        }
      });
    });

    req.on('error', (error) => {
      reject(error);
    });

    req.write(postData);
    req.end();
  });
}

async function testVerificationSystem() {
  try {
    console.log('🔍 Testing Enhanced Verification System...\n');

    // Test 1: Verify enrolled student using enhanced verification endpoint
    console.log('1. Testing verification against enrolled student STU03...');
    const verifyResponse = await makeRequest('/api/face/verification/verify-face', {
      studentId: 'STU03',
      faceDescriptor: mockFaceDescriptor
    });

    console.log(`   Status: ${verifyResponse.status}`);
    console.log(`   Response:`, JSON.stringify(verifyResponse.data, null, 2));

    if (verifyResponse.data.success) {
      console.log(`✅ Verification successful!`);
      console.log(`   Student: ${verifyResponse.data.studentId}`);
      console.log(`   Confidence: ${verifyResponse.data.confidence}`);
      console.log(`   Best Match: ${verifyResponse.data.bestMatch?.captureAngle} (distance: ${verifyResponse.data.bestMatch?.distance})`);
      console.log(`   Samples Compared: ${verifyResponse.data.samplesCompared}`);
    } else {
      console.log(`❌ Verification failed: ${verifyResponse.data.message}`);
    }

    // Test 2: Verify different face (should fail)
     console.log('\n2. Testing verification with different face descriptor...');
     const differentFace = Array(128).fill(0).map(() => Math.random() * 2 - 1);
     const verifyResponse2 = await makeRequest('/api/face/verification/verify-face', {
       studentId: 'STU03',
       faceDescriptor: differentFace
     });

    console.log(`   Status: ${verifyResponse2.status}`);
    if (verifyResponse2.data.success) {
      console.log(`✅ Verification successful (unexpected)`);
    } else {
      console.log(`❌ Verification failed as expected: ${verifyResponse2.data.message}`);
    }

    console.log('\n=== Verification Tests Complete ===');

  } catch (error) {
    console.error('❌ Verification test failed:', error.message);
    process.exit(1);
  }
}

testVerificationSystem();