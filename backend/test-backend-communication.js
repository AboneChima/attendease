const axios = require('axios');
const FormData = require('form-data');
const fs = require('fs');
const path = require('path');

console.log('🔍 Testing Backend Communication');
console.log('================================\n');

async function testBackendCommunication() {
    try {
        // Test 1: Check if Python backend is accessible
        console.log('1. Testing Python backend health...');
        try {
            const healthResponse = await axios.get('http://localhost:8000/health', { timeout: 5000 });
            console.log('✅ Python backend is accessible');
            console.log('   Response:', healthResponse.data);
        } catch (error) {
            console.log('❌ Python backend health check failed:', error.message);
            if (error.code === 'ECONNREFUSED') {
                console.log('   Python backend appears to be down or not listening on port 8000');
                return;
            }
        }

        console.log('\n2. Testing Python backend API endpoints...');
        
        // Test 2: Check available endpoints
        try {
            const endpointsResponse = await axios.get('http://localhost:8000/', { timeout: 5000 });
            console.log('✅ Python backend root endpoint accessible');
        } catch (error) {
            console.log('❌ Python backend root endpoint failed:', error.message);
        }

        // Test 3: Check enrollment endpoint
        console.log('\n3. Testing enrollment endpoint...');
        try {
            const enrollmentResponse = await axios.get('http://localhost:8000/api/face/enrollments/STU01', { timeout: 10000 });
            console.log('✅ Enrollment endpoint accessible');
            console.log('   Enrollments found:', enrollmentResponse.data.enrollments?.length || 0);
        } catch (error) {
            console.log('❌ Enrollment endpoint failed:', error.response?.status, error.response?.data || error.message);
        }

        // Test 4: Test verification endpoint with a dummy request
        console.log('\n4. Testing verification endpoint format...');
        try {
            // Create a small test image file
            const testImagePath = path.join(__dirname, 'test-image.jpg');
            
            // Create a minimal JPEG header (this won't be a valid image but will test the endpoint)
            const minimalJpeg = Buffer.from([
                0xFF, 0xD8, 0xFF, 0xE0, 0x00, 0x10, 0x4A, 0x46, 0x49, 0x46, 0x00, 0x01,
                0x01, 0x01, 0x00, 0x48, 0x00, 0x48, 0x00, 0x00, 0xFF, 0xD9
            ]);
            
            fs.writeFileSync(testImagePath, minimalJpeg);
            
            const formData = new FormData();
            formData.append('student_id', 'STU01');
            formData.append('photo', fs.createReadStream(testImagePath), {
                filename: 'test.jpg',
                contentType: 'image/jpeg'
            });
            formData.append('model_name', 'Facenet512');
            
            const verifyResponse = await axios.post('http://localhost:8000/api/face/verify', formData, {
                headers: {
                    ...formData.getHeaders(),
                },
                timeout: 30000
            });
            
            console.log('✅ Verification endpoint accessible');
            console.log('   Response:', verifyResponse.data);
            
            // Clean up test file
            fs.unlinkSync(testImagePath);
            
        } catch (error) {
            console.log('❌ Verification endpoint failed:', error.response?.status, error.response?.data || error.message);
            
            // Clean up test file if it exists
            const testImagePath = path.join(__dirname, 'test-image.jpg');
            if (fs.existsSync(testImagePath)) {
                fs.unlinkSync(testImagePath);
            }
        }

        console.log('\n5. Summary:');
        console.log('   - If all tests pass, the issue might be with the image data being sent');
        console.log('   - If verification endpoint fails, there might be an issue with the Python backend setup');
        console.log('   - Check the Python backend logs for more detailed error information');

    } catch (error) {
        console.error('❌ Test failed:', error.message);
    }
}

testBackendCommunication();