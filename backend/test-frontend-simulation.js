const axios = require('axios');

async function simulateFrontendEnrollment() {
    console.log('🔍 Simulating Frontend Enrollment Request');
    console.log('=' .repeat(50));
    
    try {
        // Simulate the exact request that the frontend should be making
        console.log('\n📡 Simulating Frontend Enrollment Request');
        console.log('-'.repeat(40));
        
        // Generate a realistic face descriptor (similar to face-api.js output)
        const faceDescriptor = Array.from({length: 128}, () => (Math.random() - 0.5) * 2);
        
        console.log('📤 Request details:');
        console.log(`   URL: http://localhost:5000/api/students/enroll-face`);
        console.log(`   Method: POST`);
        console.log(`   Student ID: STU1`);
        console.log(`   Descriptor length: ${faceDescriptor.length}`);
        console.log(`   Content-Type: application/json`);
        
        const requestData = {
            studentId: 'STU1',
            faceDescriptor: faceDescriptor,
            sampleCount: 1
        };
        
        console.log('\n📡 Sending request...');
        
        // Use fetch to simulate exactly what the frontend does
        const response = await fetch('http://localhost:5000/api/students/enroll-face', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(requestData),
        });
        
        console.log('📥 Response received:');
        console.log(`   Status: ${response.status}`);
        console.log(`   Status Text: ${response.statusText}`);
        console.log(`   OK: ${response.ok}`);
        
        const result = await response.json();
        console.log('📥 Response data:', result);
        
        if (response.ok) {
            console.log('✅ Frontend simulation successful!');
            console.log('🔍 This means the backend is working correctly.');
            console.log('🔍 The issue must be in the frontend JavaScript execution.');
        } else {
            console.log('❌ Frontend simulation failed');
            console.log('🔍 Backend is returning an error');
        }
        
    } catch (error) {
        console.error('❌ Simulation error:', error.message);
        console.log('🔍 This could indicate:');
        console.log('   1. Backend server not running');
        console.log('   2. Network connectivity issues');
        console.log('   3. CORS configuration problems');
    }
}

// Also test with Node.js fetch polyfill
async function testWithNodeFetch() {
    console.log('\n🔍 Testing with Node.js (axios)');
    console.log('-'.repeat(40));
    
    try {
        const faceDescriptor = Array.from({length: 128}, () => (Math.random() - 0.5) * 2);
        
        const response = await axios.post('http://localhost:5000/api/students/enroll-face', {
            studentId: 'STU1',
            faceDescriptor: faceDescriptor,
            sampleCount: 1
        }, {
            headers: { 'Content-Type': 'application/json' }
        });
        
        console.log('✅ Axios request successful:');
        console.log(`   Status: ${response.status}`);
        console.log(`   Data: ${JSON.stringify(response.data)}`);
        
    } catch (error) {
        if (error.response) {
            console.log('⚠️ Axios request failed:');
            console.log(`   Status: ${error.response.status}`);
            console.log(`   Data: ${JSON.stringify(error.response.data)}`);
        } else {
            console.log('❌ Axios error:', error.message);
        }
    }
}

async function runTests() {
    // Install fetch polyfill for Node.js
    global.fetch = require('node-fetch');
    
    await simulateFrontendEnrollment();
    await testWithNodeFetch();
    
    console.log('\n📋 SIMULATION SUMMARY');
    console.log('=' .repeat(50));
    console.log('If both tests pass, the issue is likely:');
    console.log('1. 🎥 Face detection failing in the browser');
    console.log('2. 🚫 JavaScript errors preventing request execution');
    console.log('3. 🌐 Browser-specific network issues');
    console.log('4. 📱 Camera/video stream problems');
    console.log('5. 🔒 Browser security restrictions');
}

runTests();