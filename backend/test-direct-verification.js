const axios = require('axios');
const FormData = require('form-data');
const fs = require('fs');
const path = require('path');

async function testDirectVerification() {
  console.log('🧪 Testing direct verification endpoint...');
  
  try {
    // Use an existing photo from uploads
    const photoPath = path.join(__dirname, 'uploads', '1759140121409-537225250.jpg');
    
    if (!fs.existsSync(photoPath)) {
      console.error('❌ Photo file not found:', photoPath);
      return;
    }
    
    console.log('✅ Photo file found, size:', fs.statSync(photoPath).size, 'bytes');
    
    // Create form data
    const formData = new FormData();
    formData.append('student_id', 'TEST0493');
    formData.append('photo', fs.createReadStream(photoPath));
    
    console.log('📤 Sending verification request to /api/students/verify-live...');
    console.log('⏰ Request time:', new Date().toISOString());
    
    // Make the request
    const response = await axios.post('http://localhost:5000/api/students/verify-live', formData, {
      headers: {
        ...formData.getHeaders(),
      },
      timeout: 30000, // 30 second timeout
    });
    
    console.log('📊 Response status:', response.status);
    console.log('⏰ Response time:', new Date().toISOString());
    console.log('📊 Full response data:');
    console.log(JSON.stringify(response.data, null, 2));
    
    // Analyze key fields
    console.log('\n🔍 Key fields analysis:');
    console.log('   - success:', response.data.success);
    console.log('   - verified:', response.data.verified);
    console.log('   - confidence (top-level):', response.data.confidence);
    console.log('   - attendanceMarked:', response.data.attendanceMarked);
    console.log('   - message:', response.data.message);
    
    if (response.data.verification) {
      console.log('\n🔍 Verification object:');
      console.log('   - verified:', response.data.verification.verified);
      console.log('   - confidence:', response.data.verification.confidence);
      console.log('   - threshold:', response.data.verification.threshold);
      console.log('   - model_name:', response.data.verification.model_name);
    }
    
  } catch (error) {
    console.error('❌ Error during verification:', error.message);
    if (error.response) {
      console.error('📊 Error response status:', error.response.status);
      console.error('📊 Error response data:', error.response.data);
    }
  }
}

testDirectVerification();