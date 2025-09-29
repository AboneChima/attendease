const axios = require('axios');
const FormData = require('form-data');
const fs = require('fs');
const path = require('path');

async function testVerifyLiveEndpoint() {
  try {
    console.log('Testing /verify-live endpoint...');
    
    // Check if we have any test photos in uploads
    const uploadsDir = path.join(__dirname, 'uploads', 'photos');
    if (fs.existsSync(uploadsDir)) {
      const files = fs.readdirSync(uploadsDir);
      console.log('Available photos in uploads:', files);
      
      // Find a STU01 photo
      const stu01Photo = files.find(file => file.includes('STU01'));
      if (stu01Photo) {
        console.log('Using photo:', stu01Photo);
        
        const photoPath = path.join(uploadsDir, stu01Photo);
        const formData = new FormData();
        formData.append('photo', fs.createReadStream(photoPath));
        formData.append('student_id', 'STU01');
        
        console.log('Making request to /verify-live...');
        const response = await axios.post('http://localhost:5000/api/students/verify-live', formData, {
          headers: {
            ...formData.getHeaders()
          }
        });
        
        console.log('Response status:', response.status);
        console.log('Response data:', JSON.stringify(response.data, null, 2));
      } else {
        console.log('No STU01 photos found in uploads directory');
      }
    } else {
      console.log('Uploads directory does not exist');
    }
    
    // Also test with a simple test - create a small test image
    console.log('\nTesting with a minimal test image...');
    
    // Create a simple 1x1 pixel JPEG for testing
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
      0x03, 0x01, 0x00, 0x02, 0x11, 0x03, 0x11, 0x00, 0x3F, 0x00, 0xB2, 0xC0,
      0x07, 0xFF, 0xD9
    ]);
    
    const formData2 = new FormData();
    formData2.append('photo', testImageBuffer, 'test.jpg');
    formData2.append('student_id', 'STU01');
    
    const response2 = await axios.post('http://localhost:5000/api/students/verify-live', formData2, {
      headers: {
        ...formData2.getHeaders()
      }
    });
    
    console.log('Test image response status:', response2.status);
    console.log('Test image response data:', JSON.stringify(response2.data, null, 2));
    
  } catch (error) {
    console.error('Error testing verify-live endpoint:', error.message);
    if (error.response) {
      console.error('Response status:', error.response.status);
      console.error('Response data:', error.response.data);
    }
  }
}

testVerifyLiveEndpoint();