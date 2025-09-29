const http = require('http');

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

async function debugSessionResponse() {
  try {
    console.log('🔍 Debugging session response structure...\n');

    const response = await makeRequest('/api/face/enrollment/start-enrollment', {
      studentId: 'STU04'
    });

    console.log('📊 Response Status:', response.status);
    console.log('📋 Response Data:');
    console.log(JSON.stringify(response.data, null, 2));
    
    console.log('\n🔍 Checking specific fields:');
    console.log('- response.data.success:', response.data.success);
    console.log('- response.data.sessionId:', response.data.sessionId);
    console.log('- Type of success:', typeof response.data.success);
    console.log('- Boolean check (!response.data.success):', !response.data.success);
    console.log('- Status check (response.status !== 200):', response.status !== 200);
    
    const condition1 = response.status !== 200;
    const condition2 = !response.data.success;
    console.log('\n🧪 Test conditions:');
    console.log('- Condition 1 (status !== 200):', condition1);
    console.log('- Condition 2 (!success):', condition2);
    console.log('- Combined (condition1 || condition2):', condition1 || condition2);

  } catch (error) {
    console.error('❌ Debug failed:', error.message);
  }
}

debugSessionResponse();