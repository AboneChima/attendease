const axios = require('axios');

const BASE_URL = 'https://attendease-backend-ovl6.onrender.com/api';

async function sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

async function detailedRegistrationTest() {
    console.log('🔍 Detailed registration and QR code test...');
    console.log('URL:', BASE_URL);
    
    try {
        console.log('\n⏳ Waiting for deployment to complete...');
        await sleep(5000);
        
        // 1. Check current students with QR codes
        console.log('\n1. Checking existing students with QR codes...');
        try {
            const studentsResponse = await axios.get(`${BASE_URL}/students`);
            console.log('✅ Students endpoint response status:', studentsResponse.status);
            
            if (Array.isArray(studentsResponse.data)) {
                console.log('📊 Total students found:', studentsResponse.data.length);
                
                if (studentsResponse.data.length > 0) {
                    const firstStudent = studentsResponse.data[0];
                    console.log('📋 First student fields:', Object.keys(firstStudent));
                    console.log('🔍 Has QR code field:', 'qr_code' in firstStudent);
                    
                    if ('qr_code' in firstStudent) {
                        console.log('✅ QR code field exists!');
                        console.log('🔍 QR code type:', typeof firstStudent.qr_code);
                        console.log('🔍 QR code length:', firstStudent.qr_code ? firstStudent.qr_code.length : 'null');
                        console.log('🔍 QR code preview:', firstStudent.qr_code ? firstStudent.qr_code.substring(0, 50) + '...' : 'null');
                    } else {
                        console.log('❌ QR code field is missing!');
                    }
                } else {
                    console.log('⚠️ No students found in response');
                }
            } else {
                console.log('⚠️ Unexpected response format:', typeof studentsResponse.data);
                console.log('📋 Response data:', studentsResponse.data);
            }
            
        } catch (studentsError) {
            console.log('❌ Students endpoint failed:', studentsError.response?.status, studentsError.response?.data || studentsError.message);
        }
        
        // 2. Test registration with detailed error capture
        console.log('\n2. Testing detailed student registration...');
        const uniqueId = `DETAILED_${Date.now()}`;
        const uniqueEmail = `detailed_${Date.now()}@test.com`;
        
        const registrationData = {
            student_id: uniqueId,
            name: 'Detailed Test Student',
            email: uniqueEmail,
            phone: '+1234567890'
        };
        
        console.log('📝 Registration data:', registrationData);
        
        try {
            const registrationResponse = await axios.post(`${BASE_URL}/students/register`, registrationData);
            console.log('✅ Registration successful!');
            console.log('📊 Response status:', registrationResponse.status);
            console.log('📋 Response data:', registrationResponse.data);
            
            // Verify the student was created with QR code
            try {
                console.log('\n3. Verifying newly created student...');
                const newStudentResponse = await axios.get(`${BASE_URL}/students/${uniqueId}`);
                console.log('✅ New student retrieved:', {
                    status: newStudentResponse.status,
                    hasQRCode: 'qr_code' in (newStudentResponse.data || {}),
                    qrCodeLength: newStudentResponse.data?.qr_code?.length || 'no qr_code'
                });
                
                if (newStudentResponse.data?.qr_code) {
                    console.log('🎉 QR code successfully generated and stored!');
                    console.log('🔍 QR code preview:', newStudentResponse.data.qr_code.substring(0, 50) + '...');
                }
                
            } catch (retrieveError) {
                console.log('⚠️ Could not retrieve new student:', retrieveError.response?.status, retrieveError.response?.data || retrieveError.message);
            }
            
            // Clean up
            try {
                await axios.delete(`${BASE_URL}/students/${uniqueId}`);
                console.log('🧹 Test student cleaned up');
            } catch (cleanupError) {
                console.log('⚠️ Could not clean up test student:', cleanupError.message);
            }
            
        } catch (registrationError) {
            console.log('❌ Registration failed!');
            console.log('📊 Error status:', registrationError.response?.status);
            console.log('📋 Error data:', registrationError.response?.data);
            console.log('🔍 Error message:', registrationError.message);
            
            // Try to get more details about the error
            if (registrationError.response?.data) {
                console.log('📋 Full error response:', JSON.stringify(registrationError.response.data, null, 2));
            }
            
            // Check if it's a database column issue
            if (registrationError.response?.data?.error && 
                registrationError.response.data.error.includes('column')) {
                console.log('🚨 This appears to be a database column issue!');
            }
        }
        
        console.log('\n🎉 Detailed registration test completed!');
        
    } catch (error) {
        console.error('❌ Test failed:', error.message);
        if (error.response) {
            console.error('Response data:', error.response.data);
        }
    }
}

detailedRegistrationTest();