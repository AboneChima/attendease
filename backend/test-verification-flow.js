const axios = require('axios');
const FormData = require('form-data');
const fs = require('fs');
const path = require('path');

async function testVerificationFlow() {
    console.log('🧪 Testing Complete Verification Flow');
    console.log('====================================');

    try {
        // 1. Check enrolled students
        console.log('\n📋 Step 1: Checking enrolled students...');
        const pythonResponse = await axios.get('http://localhost:8000/api/face/enrollments');
        console.log('Enrolled students:', pythonResponse.data.enrollments.map(e => e.student_id));

        if (pythonResponse.data.enrollments.length === 0) {
            console.log('❌ No enrolled students found. Please enroll a student first.');
            return;
        }

        const testStudentId = pythonResponse.data.enrollments[0].student_id;
        console.log(`✅ Using student ${testStudentId} for testing`);

        // 2. Create a test image (simple 1x1 pixel image)
        console.log('\n📸 Step 2: Creating test image...');
        const testImagePath = path.join(__dirname, 'test-verification-image.jpg');
        
        // Create a minimal JPEG header for a 1x1 pixel image
        const jpegData = Buffer.from([
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
            0x03, 0x01, 0x00, 0x02, 0x11, 0x03, 0x11, 0x00, 0x3F, 0x00, 0x00, 0xFF, 0xD9
        ]);
        
        fs.writeFileSync(testImagePath, jpegData);
        console.log(`✅ Test image created: ${jpegData.length} bytes`);

        // 3. Test direct Python backend verification
        console.log('\n🐍 Step 3: Testing Python backend directly...');
        const formData = new FormData();
        formData.append('student_id', testStudentId);
        formData.append('photo', fs.createReadStream(testImagePath), {
            filename: 'test.jpg',
            contentType: 'image/jpeg'
        });
        formData.append('model_name', 'Facenet512');

        try {
            const pythonVerifyResponse = await axios.post('http://localhost:8000/api/face/verify', formData, {
                headers: {
                    ...formData.getHeaders(),
                },
                timeout: 10000
            });
            
            console.log('✅ Python backend response:');
            console.log('   Status:', pythonVerifyResponse.status);
            console.log('   Data:', JSON.stringify(pythonVerifyResponse.data, null, 2));
            
        } catch (pythonError) {
            console.log('❌ Python backend error:');
            console.log('   Status:', pythonError.response?.status);
            console.log('   Message:', pythonError.response?.data || pythonError.message);
        }

        // 4. Test Node.js backend verification
        console.log('\n🟢 Step 4: Testing Node.js backend...');
        const nodeFormData = new FormData();
        nodeFormData.append('student_id', testStudentId);
        nodeFormData.append('photo', fs.createReadStream(testImagePath), {
            filename: 'test.jpg',
            contentType: 'image/jpeg'
        });

        try {
            const nodeVerifyResponse = await axios.post('http://localhost:5000/api/students/verify-live', nodeFormData, {
                headers: {
                    ...nodeFormData.getHeaders(),
                },
                timeout: 15000
            });
            
            console.log('✅ Node.js backend response:');
            console.log('   Status:', nodeVerifyResponse.status);
            console.log('   Data:', JSON.stringify(nodeVerifyResponse.data, null, 2));
            
        } catch (nodeError) {
            console.log('❌ Node.js backend error:');
            console.log('   Status:', nodeError.response?.status);
            console.log('   Message:', nodeError.response?.data || nodeError.message);
        }

        // 5. Clean up
        console.log('\n🧹 Step 5: Cleaning up...');
        if (fs.existsSync(testImagePath)) {
            fs.unlinkSync(testImagePath);
            console.log('✅ Test image cleaned up');
        }

    } catch (error) {
        console.error('❌ Test failed:', error.message);
    }
}

testVerificationFlow();