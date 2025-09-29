const axios = require('axios');
const FormData = require('form-data');
const fs = require('fs');
const path = require('path');

console.log('🎥 Testing Live Verification Process');
console.log('====================================\n');

async function testLiveVerification() {
    try {
        // Create a proper test image (a simple 1x1 pixel JPEG)
        const testImagePath = path.join(__dirname, 'test-verification.jpg');
        
        // Create a minimal but valid JPEG (1x1 pixel black image)
        const validJpeg = Buffer.from([
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
        
        fs.writeFileSync(testImagePath, validJpeg);
        console.log('✅ Created test image file');

        // Test 1: Direct call to Python backend (simulating what Node.js does)
        console.log('\n1. Testing direct call to Python backend...');
        try {
            const formData = new FormData();
            formData.append('student_id', 'STU01');
            formData.append('photo', fs.createReadStream(testImagePath), {
                filename: 'test.jpg',
                contentType: 'image/jpeg'
            });
            formData.append('model_name', 'Facenet512');
            
            const pythonResponse = await axios.post('http://localhost:8000/api/face/verify', formData, {
                headers: {
                    ...formData.getHeaders(),
                },
                timeout: 30000
            });
            
            console.log('✅ Python backend verification successful');
            console.log('   Response:', pythonResponse.data);
            
        } catch (error) {
            console.log('❌ Python backend verification failed:', error.response?.status, error.response?.data || error.message);
        }

        // Test 2: Call through Node.js backend (simulating what frontend does)
        console.log('\n2. Testing call through Node.js backend...');
        try {
            const nodeFormData = new FormData();
            nodeFormData.append('student_id', 'STU01');
            nodeFormData.append('photo', fs.createReadStream(testImagePath), {
                filename: 'test.jpg',
                contentType: 'image/jpeg'
            });
            
            const nodeResponse = await axios.post('http://localhost:5000/api/students/verify-live', nodeFormData, {
                headers: {
                    ...nodeFormData.getHeaders(),
                },
                timeout: 30000
            });
            
            console.log('✅ Node.js backend verification successful');
            console.log('   Response:', nodeResponse.data);
            
        } catch (error) {
            console.log('❌ Node.js backend verification failed:', error.response?.status, error.response?.data || error.message);
        }

        // Clean up
        if (fs.existsSync(testImagePath)) {
            fs.unlinkSync(testImagePath);
            console.log('\n✅ Cleaned up test files');
        }

    } catch (error) {
        console.error('❌ Test failed:', error.message);
    }
}

testLiveVerification();