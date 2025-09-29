const axios = require('axios');

async function testDeployment() {
    const baseURL = 'https://attendease.onrender.com';
    
    console.log('🔍 Testing Deployed Backend Routes...\n');
    
    // Test different endpoints to see which ones work
    const endpoints = [
        '/api/health',
        '/api/students',
        '/api/teachers',
        '/api/database/status',
        '/api/database/init'
    ];
    
    for (const endpoint of endpoints) {
        try {
            console.log(`Testing ${endpoint}...`);
            const response = await axios.get(`${baseURL}${endpoint}`);
            console.log(`✅ ${endpoint}: ${response.status} - ${JSON.stringify(response.data).substring(0, 100)}...`);
        } catch (error) {
            if (error.response) {
                console.log(`❌ ${endpoint}: ${error.response.status} - ${error.response.statusText}`);
                if (error.response.data) {
                    console.log(`   Error data: ${JSON.stringify(error.response.data).substring(0, 200)}...`);
                }
            } else {
                console.log(`❌ ${endpoint}: Network error - ${error.message}`);
            }
        }
        console.log('');
    }
}

testDeployment().catch(console.error);