const FormData = require('form-data');
const fs = require('fs');
const path = require('path');

const fetch = (...args) => import('node-fetch').then(({default: fetch}) => fetch(...args));

async function testVerificationWithLogs() {
  console.log('🧪 Testing verification API with detailed logging...');
  
  const photoPath = path.join(__dirname, 'uploads', '1759140121409-537225250.jpg');
  
  if (!fs.existsSync(photoPath)) {
    console.error('❌ Photo file not found:', photoPath);
    return;
  }
  
  console.log('✅ Photo file found, size:', fs.statSync(photoPath).size, 'bytes');
  
  const formData = new FormData();
  formData.append('photo', fs.createReadStream(photoPath));
  formData.append('student_id', 'TEST0493');
  
  console.log('📤 Sending verification request...');
  console.log('⏰ Request time:', new Date().toISOString());
  
  try {
    const response = await fetch('http://localhost:5000/api/students/verify-live', {
      method: 'POST',
      body: formData
    });
    
    console.log('📊 Response status:', response.status);
    console.log('⏰ Response time:', new Date().toISOString());
    
    const data = await response.json();
    console.log('📊 Full response data:');
    console.log(JSON.stringify(data, null, 2));
    
    console.log('\n🔍 Key fields analysis:');
    console.log('   - success:', data.success);
    console.log('   - verified:', data.verified);
    console.log('   - confidence (top-level):', data.confidence);
    console.log('   - attendanceMarked:', data.attendanceMarked);
    console.log('   - message:', data.message);
    
    if (data.verification) {
      console.log('\n🔍 Verification object:');
      console.log('   - verified:', data.verification.verified);
      console.log('   - confidence:', data.verification.confidence);
      console.log('   - threshold:', data.verification.threshold);
      console.log('   - model_name:', data.verification.model_name);
    }
    
  } catch (error) {
    console.error('❌ Request failed:', error.message);
  }
}

testVerificationWithLogs();