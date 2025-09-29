// Test script for add-sample API
const https = require('https');
const http = require('http');

// Generate a 128-dimensional face descriptor (random values for testing)
const faceDescriptor = Array.from({length: 128}, () => Math.random() * 2 - 1);

const testData = {
  sessionId: "3890edc0-3fc3-4f72-8f7c-6b75639f0007",
  faceDescriptor: faceDescriptor,
  captureAngle: "FRONT",
  qualityMetrics: {
    confidence: 0.95,
    brightness: 0.8,
    sharpness: 0.9,
    faceSize: 150
  }
};

function testAddSample() {
  console.log('Testing add-sample API...');
  console.log('Face descriptor length:', faceDescriptor.length);
  
  const postData = JSON.stringify(testData);
  
  const options = {
    hostname: 'localhost',
    port: 5000,
    path: '/api/face/enrollment/add-sample',
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Content-Length': Buffer.byteLength(postData)
    }
  };
  
  const req = http.request(options, (res) => {
    let data = '';
    
    res.on('data', (chunk) => {
      data += chunk;
    });
    
    res.on('end', () => {
      try {
        const result = JSON.parse(data);
        if (res.statusCode === 200) {
          console.log('✅ Success:', result);
        } else {
          console.log('❌ Error:', result);
        }
      } catch (error) {
        console.log('❌ Parse error:', data);
      }
    });
  });
  
  req.on('error', (error) => {
    console.error('❌ Request failed:', error.message);
  });
  
  req.write(postData);
  req.end();
}

testAddSample();