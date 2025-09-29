const http = require('http');

// Mock face descriptor data for testing
const mockFaceDescriptor = Array.from({length: 128}, () => Math.random() * 2 - 1);

// Mock quality metrics for different angles
const mockQualityMetrics = {
  FRONT: {
    confidence: 0.95,
    size: 120,
    pose: { yaw: 0, pitch: 0, roll: 0 },
    lighting: { brightness: 120, contrast: 50, evenness: 0.8 },
    eyes: { leftEye: { confidence: 0.9, openness: 0.95 }, rightEye: { confidence: 0.9, openness: 0.95 } },
    blur: { sharpness: 80, variance: 60 },
    centering: { offset: 0, direction: '', x: 0, y: 0 }
  },
  LEFT: {
    confidence: 0.92,
    size: 115,
    pose: { yaw: -30, pitch: 0, roll: 0 },
    lighting: { brightness: 115, contrast: 48, evenness: 0.8 },
    eyes: { leftEye: { confidence: 0.85, openness: 0.9 }, rightEye: { confidence: 0.8, openness: 0.85 } },
    blur: { sharpness: 75, variance: 55 },
    centering: { offset: 3, direction: 'left', x: -3, y: 0 }
  },
  RIGHT: {
    confidence: 0.93,
    size: 118,
    pose: { yaw: 30, pitch: 0, roll: 0 },
    lighting: { brightness: 118, contrast: 49, evenness: 0.8 },
    eyes: { leftEye: { confidence: 0.82, openness: 0.87 }, rightEye: { confidence: 0.88, openness: 0.92 } },
    blur: { sharpness: 78, variance: 58 },
    centering: { offset: 2, direction: 'right', x: 2, y: 0 }
  }
};

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

async function testFullEnrollment() {
  try {
    console.log('🚀 Testing FULL enrollment flow with all three angles...\n');

    // Step 1: Start enrollment session
    console.log('1. Starting enrollment session...');
    const sessionResponse = await makeRequest('/api/face/enrollment/start-enrollment', {
      studentId: 'STU03'
    });

    if (![200, 201].includes(sessionResponse.status) || !sessionResponse.data.success) {
      throw new Error(`Failed to start session: ${JSON.stringify(sessionResponse.data)}`);
    }

    const sessionId = sessionResponse.data.sessionId;
    console.log(`✅ Session started: ${sessionId}\n`);

    // Step 2: Add samples for all three angles
    const angles = ['FRONT', 'LEFT', 'RIGHT'];
    const addedSamples = [];

    for (const angle of angles) {
      console.log(`2.${angles.indexOf(angle) + 1} Adding ${angle} sample...`);
      
      const sampleResponse = await makeRequest('/api/face/enrollment/add-sample', {
        sessionId: sessionId,
        faceDescriptor: mockFaceDescriptor,
        captureAngle: angle,
        qualityMetrics: mockQualityMetrics[angle]
      });
      
      if (![200, 201].includes(sampleResponse.status) || !sampleResponse.data.success) {
        throw new Error(`Failed to add ${angle} sample: ${JSON.stringify(sampleResponse.data)}`);
      }

      addedSamples.push(angle);
      console.log(`✅ ${angle} sample added successfully`);
      console.log(`   Quality Score: ${sampleResponse.data.qualityScore}`);
      console.log(`   Assessment: ${sampleResponse.data.assessment.feedback.join(', ')}`);
      console.log(`   Progress: ${sampleResponse.data.sessionProgress.completed.length}/3 samples completed`);
      console.log(`   Remaining: [${sampleResponse.data.sessionProgress.remaining.join(', ')}]\n`);
    }

    // Step 3: Complete enrollment
    console.log('3. Completing enrollment...');
    const completeResponse = await makeRequest('/api/face/enrollment/complete-enrollment', {
      sessionId: sessionId
    });

    if (completeResponse.status !== 200 || !completeResponse.data.success) {
      throw new Error(`Failed to complete enrollment: ${JSON.stringify(completeResponse.data)}`);
    }

    console.log('✅ Enrollment completed successfully!');
    console.log(`   Student ID: ${completeResponse.data.studentId}`);
    console.log(`   Total Samples: ${completeResponse.data.totalSamples}`);
    console.log(`   Enrollment ID: ${completeResponse.data.enrollmentId}`);
    console.log(`   Status: ${completeResponse.data.status}`);

    console.log('\n🎉 FULL ENROLLMENT TEST PASSED! 🎉');
    console.log(`✅ Successfully enrolled student STU03 with ${addedSamples.length} face samples`);
    console.log(`✅ All angles captured: [${addedSamples.join(', ')}]`);

  } catch (error) {
    console.error('❌ Full enrollment test failed:', error.message);
    process.exit(1);
  }
}

testFullEnrollment();