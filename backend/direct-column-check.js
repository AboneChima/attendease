const axios = require('axios');

const BASE_URL = 'https://attendease-backend-ovl6.onrender.com/api';

async function sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

async function directColumnCheck() {
    console.log('🔍 Direct column existence check...');
    console.log('URL:', BASE_URL);
    
    try {
        console.log('\n⏳ Waiting for deployment to complete...');
        await sleep(8000); // Wait longer for deployment
        
        // 1. Test health endpoint
        console.log('\n1. Testing health endpoint...');
        const healthResponse = await axios.get(`${BASE_URL}/health`);
        console.log('✅ Health check:', healthResponse.data);
        
        // 2. Check database status
        console.log('\n2. Checking database status...');
        const dbStatusResponse = await axios.get(`${BASE_URL}/database/status`);
        console.log('✅ Database status:', dbStatusResponse.data);
        
        // 3. Try to select from students table with qr_code column
        console.log('\n3. Testing direct SELECT with qr_code column...');
        try {
            const studentsResponse = await axios.get(`${BASE_URL}/students`);
            console.log('✅ Students endpoint response:', {
                success: studentsResponse.data.success,
                hasStudents: !!studentsResponse.data.students,
                studentCount: studentsResponse.data.students ? studentsResponse.data.students.length : 0,
                firstStudentHasQR: studentsResponse.data.students && studentsResponse.data.students.length > 0 ? 
                    'qr_code' in studentsResponse.data.students[0] : 'no students'
            });
            
            // Check if any student has a qr_code field
            if (studentsResponse.data.students && studentsResponse.data.students.length > 0) {
                const firstStudent = studentsResponse.data.students[0];
                console.log('📋 First student fields:', Object.keys(firstStudent));
                
                if ('qr_code' in firstStudent) {
                    console.log('✅ QR code column exists and is accessible!');
                    console.log('🔍 QR code value type:', typeof firstStudent.qr_code);
                    console.log('🔍 QR code value length:', firstStudent.qr_code ? firstStudent.qr_code.length : 'null');
                } else {
                    console.log('❌ QR code column is missing from student data');
                }
            }
            
        } catch (studentsError) {
            console.log('❌ Students endpoint failed:', studentsError.response?.data || studentsError.message);
        }
        
        // 4. Test a very simple registration with minimal data
        console.log('\n4. Testing minimal student registration...');
        const uniqueId = `MINIMAL_${Date.now()}`;
        const uniqueEmail = `minimal_${Date.now()}@test.com`;
        
        try {
            const registrationData = {
                student_id: uniqueId,
                name: 'Minimal Test',
                email: uniqueEmail
            };
            
            console.log('📝 Attempting registration with:', registrationData);
            const registrationResponse = await axios.post(`${BASE_URL}/students/register`, registrationData);
            console.log('✅ Registration successful:', registrationResponse.data);
            
            // Try to retrieve the newly created student
            try {
                const newStudentResponse = await axios.get(`${BASE_URL}/students/${uniqueId}`);
                console.log('✅ New student retrieved:', {
                    success: newStudentResponse.data.success,
                    hasQRCode: 'qr_code' in (newStudentResponse.data.student || {}),
                    qrCodeLength: newStudentResponse.data.student?.qr_code?.length || 'no qr_code'
                });
            } catch (retrieveError) {
                console.log('⚠️ Could not retrieve new student:', retrieveError.response?.data || retrieveError.message);
            }
            
            // Clean up
            try {
                await axios.delete(`${BASE_URL}/students/${uniqueId}`);
                console.log('🧹 Test student cleaned up');
            } catch (cleanupError) {
                console.log('⚠️ Could not clean up test student:', cleanupError.message);
            }
            
        } catch (registrationError) {
            console.log('❌ Registration failed:', registrationError.response?.data || registrationError.message);
            
            // If registration failed, let's see the exact error
            if (registrationError.response?.data) {
                console.log('📋 Full error response:', JSON.stringify(registrationError.response.data, null, 2));
            }
        }
        
        console.log('\n🎉 Direct column check completed!');
        
    } catch (error) {
        console.error('❌ Test failed:', error.message);
        if (error.response) {
            console.error('Response data:', error.response.data);
        }
    }
}

directColumnCheck();