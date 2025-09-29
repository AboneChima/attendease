const axios = require('axios');
const FormData = require('form-data');
const fs = require('fs');
const path = require('path');

async function testVerificationResponse() {
  console.log('🧪 Testing verification response handling...');
  
  try {
    // Create a simple test image buffer (minimal JPEG)
    const testImageBuffer = Buffer.from([
      0xFF, 0xD8, 0xFF, 0xE0, 0x00, 0x10, 0x4A, 0x46, 0x49, 0x46, 0x00, 0x01,
      0x01, 0x01, 0x00, 0x48, 0x00, 0x48, 0x00, 0x00, 0xFF, 0xDB, 0x00, 0x43,
      0x00, 0x08, 0x06, 0x06, 0x07, 0x06, 0x05, 0x08, 0x07, 0x07, 0x07, 0x09,
      0x09, 0x08, 0x0A, 0x0C, 0x14, 0x0D, 0x0C, 0x0B, 0x0B, 0x0C, 0x19, 0x12,
      0x13, 0x0F, 0x14, 0x1D, 0x1A, 0x1F, 0x1E, 0x1D, 0x1A, 0x1C, 0x1C, 0x20,
      0x24, 0x2E, 0x27, 0x20, 0x22, 0x2C, 0x23, 0x1C, 0x1C, 0x28, 0x37, 0x29,
      0x2C, 0x30, 0x31, 0x34, 0x34, 0x34, 0x1F, 0x27, 0x39, 0x3D, 0x38, 0x32,
      0x3C, 0x2E, 0x33, 0x34, 0x32, 0xFF, 0xC0, 0x00, 0x11, 0x08, 0x00, 0x01,
      0x00, 0x01, 0x01, 0x01, 0x11, 0x00, 0x02, 0x11, 0x01, 0x03, 0x11, 0x01,
      0xFF, 0xC4, 0x00, 0x14, 0x00, 0x01, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00,
      0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x08, 0xFF, 0xC4,
      0x00, 0x14, 0x10, 0x01, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00,
      0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0xFF, 0xDA, 0x00, 0x0C,
      0x03, 0x01, 0x00, 0x02, 0x11, 0x03, 0x11, 0x00, 0x3F, 0x00, 0x80, 0xFF, 0xD9
    ]);
    
    const tempImagePath = path.join(__dirname, 'temp_test_verification.jpg');
    fs.writeFileSync(tempImagePath, testImageBuffer);
    
    console.log(`📸 Created test image: ${testImageBuffer.length} bytes`);
    
    // Test: Call through Node.js backend with timeout monitoring
    console.log('\n🔍 Testing Node.js backend with timeout monitoring...');
    
    const startTime = Date.now();
    let timeoutId;
    
    const timeoutPromise = new Promise((_, reject) => {
      timeoutId = setTimeout(() => {
        reject(new Error('Request timed out after 30 seconds'));
      }, 30000);
    });
    
    try {
      const nodeFormData = new FormData();
      nodeFormData.append('student_id', 'STU01');
      nodeFormData.append('photo', fs.createReadStream(tempImagePath), {
        filename: 'test_verification.jpg',
        contentType: 'image/jpeg'
      });
      
      const requestPromise = axios.post('http://localhost:5000/api/students/verify-live', nodeFormData, {
        headers: {
          ...nodeFormData.getHeaders(),
        },
        timeout: 25000
      });
      
      const nodeResponse = await Promise.race([requestPromise, timeoutPromise]);
      clearTimeout(timeoutId);
      
      const duration = Date.now() - startTime;
      console.log(`✅ Node.js backend response (${duration}ms):`);
      console.log('   Status:', nodeResponse.status);
      console.log('   Data:', JSON.stringify(nodeResponse.data, null, 2));
      
    } catch (nodeError) {
      clearTimeout(timeoutId);
      const duration = Date.now() - startTime;
      
      console.log(`❌ Node.js backend error (${duration}ms):`);
      console.log('   Status:', nodeError.response?.status);
      console.log('   Message:', nodeError.message);
      console.log('   Code:', nodeError.code);
      
      if (nodeError.response?.data) {
        console.log('   Data:', JSON.stringify(nodeError.response.data, null, 2));
      }
      
      if (nodeError.message.includes('timeout') || nodeError.code === 'ECONNABORTED') {
        console.log('🕐 Request timed out - this suggests the Node.js backend is hanging');
      }
    }
    
    // Cleanup
    try {
      fs.unlinkSync(tempImagePath);
      console.log('\n🧹 Cleaned up test image');
    } catch (cleanupError) {
      console.warn('⚠️ Failed to cleanup test image:', cleanupError.message);
    }
    
  } catch (error) {
    console.error('❌ Test failed:', error.message);
  }
}

testVerificationResponse();