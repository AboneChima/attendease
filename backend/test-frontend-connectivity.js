const axios = require('axios');

async function testFrontendConnectivity() {
    console.log('🔍 Testing frontend-to-backend connectivity...');
    
    try {
        // Test the exact URL that frontend uses
        const frontendUrl = 'http://localhost:5000/api/students/enroll-face';
        console.log(`📡 Testing URL: ${frontendUrl}`);
        
        // Create a test request similar to what frontend sends
        const testData = {
            studentId: 'STU1',
            faceDescriptor: Array(128).fill(0).map(() => Math.random()),
            sampleCount: 1
        };
        
        console.log('📤 Sending test enrollment request...');
        const response = await axios.post(frontendUrl, testData, {
            headers: {
                'Content-Type': 'application/json'
            }
        });
        
        console.log('✅ Response received:');
        console.log('   Status:', response.status);
        console.log('   Data:', response.data);
        
    } catch (error) {
        console.log('❌ Error occurred:');
        if (error.response) {
            console.log('   Status:', error.response.status);
            console.log('   Data:', error.response.data);
        } else if (error.request) {
            console.log('   No response received');
            console.log('   Request:', error.request);
        } else {
            console.log('   Error:', error.message);
        }
    }
}

testFrontendConnectivity();