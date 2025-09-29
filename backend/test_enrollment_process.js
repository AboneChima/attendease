const axios = require('axios');
const FormData = require('form-data');
const fs = require('fs');
const path = require('path');

const BACKEND_URL = 'http://localhost:5000';
const PYTHON_BACKEND_URL = 'http://localhost:8000';

async function testEnrollmentProcess() {
    console.log('🧪 Testing Actual Enrollment Process\n');
    
    try {
        // First, let's create a simple test image (1x1 pixel PNG)
        const testImageBase64 = 'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChAHGArEkAAAAAElFTkSuQmCC';
        const testImageBuffer = Buffer.from(testImageBase64, 'base64');
        const testImagePath = path.join(__dirname, 'test_image.png');
        
        fs.writeFileSync(testImagePath, testImageBuffer);
        console.log('✅ Created test image for enrollment testing');
        
        // Test 1: Single photo enrollment
        console.log('\n1️⃣ Testing Single Photo Enrollment...');
        
        try {
            const formData = new FormData();
            formData.append('student_id', 'TEST_STUDENT');
            formData.append('photo', fs.createReadStream(testImagePath), {
                filename: 'test_photo.png',
                contentType: 'image/png'
            });
            
            const singleEnrollResponse = await axios.post(`${BACKEND_URL}/api/students/enroll-photo`, formData, {
                headers: {
                    ...formData.getHeaders(),
                },
                timeout: 30000,
                validateStatus: () => true // Accept any status code
            });
            
            console.log(`📊 Single enrollment response: ${singleEnrollResponse.status}`);
            console.log('📋 Response data:', JSON.stringify(singleEnrollResponse.data, null, 2));
            
        } catch (error) {
            console.log('❌ Single enrollment failed:', error.message);
        }
        
        // Test 2: Multi-photo enrollment
        console.log('\n2️⃣ Testing Multi-Photo Enrollment...');
        
        try {
            const multiFormData = new FormData();
            multiFormData.append('student_id', 'TEST_MULTI_STUDENT');
            multiFormData.append('model_name', 'Facenet512');
            
            // Add three photos (same test image for simplicity)
            multiFormData.append('front_photo', fs.createReadStream(testImagePath), {
                filename: 'front_photo.png',
                contentType: 'image/png'
            });
            multiFormData.append('left_profile_photo', fs.createReadStream(testImagePath), {
                filename: 'left_photo.png',
                contentType: 'image/png'
            });
            multiFormData.append('right_profile_photo', fs.createReadStream(testImagePath), {
                filename: 'right_photo.png',
                contentType: 'image/png'
            });
            
            const multiEnrollResponse = await axios.post(`${BACKEND_URL}/api/students/enroll-multi-photo`, multiFormData, {
                headers: {
                    ...multiFormData.getHeaders(),
                },
                timeout: 60000,
                validateStatus: () => true // Accept any status code
            });
            
            console.log(`📊 Multi-photo enrollment response: ${multiEnrollResponse.status}`);
            console.log('📋 Response data:', JSON.stringify(multiEnrollResponse.data, null, 2));
            
        } catch (error) {
            console.log('❌ Multi-photo enrollment failed:', error.message);
        }
        
        // Test 3: Test with existing student
        console.log('\n3️⃣ Testing Enrollment with Existing Student (STU02)...');
        
        try {
            const existingStudentFormData = new FormData();
            existingStudentFormData.append('student_id', 'STU02');
            existingStudentFormData.append('model_name', 'Facenet512');
            
            existingStudentFormData.append('front_photo', fs.createReadStream(testImagePath), {
                filename: 'front_photo.png',
                contentType: 'image/png'
            });
            existingStudentFormData.append('left_profile_photo', fs.createReadStream(testImagePath), {
                filename: 'left_photo.png',
                contentType: 'image/png'
            });
            existingStudentFormData.append('right_profile_photo', fs.createReadStream(testImagePath), {
                filename: 'right_photo.png',
                contentType: 'image/png'
            });
            
            const existingStudentResponse = await axios.post(`${BACKEND_URL}/api/students/enroll-multi-photo`, existingStudentFormData, {
                headers: {
                    ...existingStudentFormData.getHeaders(),
                },
                timeout: 60000,
                validateStatus: () => true
            });
            
            console.log(`📊 Existing student enrollment response: ${existingStudentResponse.status}`);
            console.log('📋 Response data:', JSON.stringify(existingStudentResponse.data, null, 2));
            
        } catch (error) {
            console.log('❌ Existing student enrollment failed:', error.message);
        }
        
        // Test 4: Check Python backend directly
        console.log('\n4️⃣ Testing Python Backend Direct Enrollment...');
        
        try {
            const pythonFormData = new FormData();
            pythonFormData.append('student_id', 'PYTHON_TEST');
            pythonFormData.append('model_name', 'Facenet512');
            pythonFormData.append('front_photo', fs.createReadStream(testImagePath), {
                filename: 'front_photo.png',
                contentType: 'image/png'
            });
            pythonFormData.append('left_profile_photo', fs.createReadStream(testImagePath), {
                filename: 'left_photo.png',
                contentType: 'image/png'
            });
            pythonFormData.append('right_profile_photo', fs.createReadStream(testImagePath), {
                filename: 'right_photo.png',
                contentType: 'image/png'
            });
            
            const pythonResponse = await axios.post(`${PYTHON_BACKEND_URL}/api/face/enroll-multi`, pythonFormData, {
                headers: {
                    ...pythonFormData.getHeaders(),
                },
                timeout: 60000,
                validateStatus: () => true
            });
            
            console.log(`📊 Python backend direct response: ${pythonResponse.status}`);
            console.log('📋 Response data:', JSON.stringify(pythonResponse.data, null, 2));
            
        } catch (error) {
            console.log('❌ Python backend direct enrollment failed:', error.message);
        }
        
        // Clean up test image
        try {
            fs.unlinkSync(testImagePath);
            console.log('\n🧹 Cleaned up test image');
        } catch (e) {
            console.log('\n⚠️ Could not clean up test image');
        }
        
        console.log('\n🎯 Enrollment Process Test Complete!');
        
    } catch (error) {
        console.error('❌ Test failed:', error.message);
    }
}

// Run the test
testEnrollmentProcess();