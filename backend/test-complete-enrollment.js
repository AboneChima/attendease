const http = require('http');

// Generate a 128-dimensional face descriptor with realistic values
function generateFaceDescriptor() {
  return Array.from({ length: 128 }, () => (Math.random() - 0.5) * 2);
}

function makeRequest(path, data) {
  return new Promise((resolve, reject) => {
    const postData = JSON.stringify(data);
    
    const options = {
      hostname: 'localhost',
      port: 5000,
      path: path,
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
          const result = JSON.parse(responseData);
          resolve({ status: res.statusCode, data: result });
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

async function testCompleteEnrollment() {
  try {
    console.log('🚀 Testing complete enrollment flow...');
    
    // Step 1: Start enrollment session
    console.log('\n1. Starting enrollment session...');
    const sessionResponse = await makeRequest('/api/face/enrollment/start-enrollment', {
      studentId: 'STU02'
    });
    
    if (sessionResponse.status !== 201) {
      throw new Error(`Failed to start session: ${JSON.stringify(sessionResponse.data)}`);
    }
    
    const { sessionId } = sessionResponse.data;
    console.log(`✅ Session started: ${sessionId}`);
    
    // Step 2: Add samples for all required angles
    const angles = ['FRONT', 'LEFT', 'RIGHT'];
    
    for (const angle of angles) {
      console.log(`\n2. Adding ${angle} sample...`);
      
      const sampleResponse = await makeRequest('/api/face/enrollment/add-sample', {
        sessionId,
        faceDescriptor: generateFaceDescriptor(),
        captureAngle: angle,
        qualityMetrics: {
          confidence: 0.95,
          size: 0.8,
          lighting: 0.85,
          centering: 0.9,
          blur: 0.88
        }
      });
      
      if (sampleResponse.status !== 200 || !sampleResponse.data.success) {
        throw new Error(`Failed to add ${angle} sample: ${JSON.stringify(sampleResponse.data)}`);
      }

      console.log(`✅ ${angle} sample added successfully`);
      console.log(`   Quality Score: ${sampleResponse.data.qualityScore}`);
      console.log(`   Assessment: ${sampleResponse.data.assessment.feedback.join(', ')}`);
      console.log(`   Progress: ${sampleResponse.data.sessionProgress.completed.length}/3 samples completed`);
    }
    
    // Step 3: Complete enrollment
    console.log('\n3. Completing enrollment...');
    const completeResponse = await makeRequest('/api/face/enrollment/complete-enrollment', {
      sessionId
    });
    
    if (completeResponse.status !== 200) {
      throw new Error(`Failed to complete enrollment: ${JSON.stringify(completeResponse.data)}`);
    }
    
    console.log('✅ Enrollment completed successfully!');
    console.log(`   Final Result: ${JSON.stringify(completeResponse.data, null, 2)}`);
    
  } catch (error) {
    console.error('❌ Error:', error.message);
  }
}

testCompleteEnrollment();