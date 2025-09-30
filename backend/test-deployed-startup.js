const axios = require('axios');

const BASE_URL = 'https://attendease-backend-ovl6.onrender.com/api';

async function testDeployedStartup() {
  console.log('🔍 Testing deployed backend startup and configuration...');
  console.log('URL:', BASE_URL);
  console.log('');
  
  try {
    // Test health endpoint
    console.log('1. Testing health endpoint...');
    const healthResponse = await axios.get(`${BASE_URL}/health`);
    console.log('✅ Health check response:', healthResponse.data);
    
    // Check if this is the minimal server or main server
    if (healthResponse.data.message === 'Minimal server is running') {
      console.log('❌ PROBLEM: Minimal server is running instead of main server!');
    } else {
      console.log('✅ Main server is running correctly');
    }
    
    console.log('\n2. Testing diagnostic endpoint...');
    try {
      const diagnosticResponse = await axios.get(`${BASE_URL}/diagnostic`);
      console.log('✅ Diagnostic response:', diagnosticResponse.data);
    } catch (error) {
      console.log('❌ Diagnostic endpoint not available (confirms minimal server)');
      console.log('Error:', error.response?.status, error.response?.data);
    }
    
    console.log('\n3. Testing students endpoint...');
    try {
      const studentsResponse = await axios.get(`${BASE_URL}/students`);
      console.log('✅ Students endpoint available');
    } catch (error) {
      console.log('❌ Students endpoint not available (confirms minimal server)');
      console.log('Error:', error.response?.status, error.response?.data);
    }
    
    console.log('\n4. Testing database endpoint...');
    try {
      const dbResponse = await axios.get(`${BASE_URL}/database/status`);
      console.log('✅ Database endpoint response:', dbResponse.data);
    } catch (error) {
      console.log('❌ Database endpoint not available (confirms minimal server)');
      console.log('Error:', error.response?.status, error.response?.data);
    }
    
  } catch (error) {
    console.error('❌ Failed to connect to deployed backend:', error.message);
  }
}

testDeployedStartup();