const axios = require('axios');

const BASE_URL = 'https://attendease-backend-ovl6.onrender.com/api';

async function comprehensiveSchemaTest() {
    console.log('🔧 Comprehensive schema fix test...');
    console.log('URL:', BASE_URL);
    
    try {
        // Wait for deployment
        console.log('\n⏳ Waiting for deployment to complete...');
        await new Promise(resolve => setTimeout(resolve, 15000));
        
        // 1. Test health endpoint first
        console.log('\n1. Testing health endpoint...');
        try {
            const healthResponse = await axios.get(`${BASE_URL}/health`);
            console.log('✅ Health check:', healthResponse.data);
        } catch (healthError) {
            console.log('❌ Health check error:', healthError.response?.data || healthError.message);
            return; // Exit if health check fails
        }
        
        // 2. Check database status
        console.log('\n2. Checking database status...');
        try {
            const statusResponse = await axios.get(`${BASE_URL}/database/status`);
            console.log('✅ Database status:', {
                success: statusResponse.data.success,
                database_type: statusResponse.data.database_type,
                student_count: statusResponse.data.tables?.students?.count || 'unknown'
            });
        } catch (statusError) {
            console.log('❌ Database status error:', statusError.response?.data || statusError.message);
        }
        
        // 3. Run the robust schema fix
        console.log('\n3. Running robust schema fix...');
        try {
            const fixResponse = await axios.post(`${BASE_URL}/database/fix-schema`);
            console.log('✅ Schema fix response:', fixResponse.data);
            
            if (!fixResponse.data.success) {
                console.log('❌ Schema fix reported failure');
                return;
            }
        } catch (fixError) {
            console.log('❌ Schema fix error:', fixError.response?.data || fixError.message);
            return;
        }
        
        // 4. Test students endpoint
        console.log('\n4. Testing students endpoint...');
        try {
            const studentsResponse = await axios.get(`${BASE_URL}/students`);
            console.log('✅ Students endpoint response type:', typeof studentsResponse.data);
            console.log('✅ Students endpoint response length:', Array.isArray(studentsResponse.data) ? studentsResponse.data.length : 'Not an array');
            
            if (Array.isArray(studentsResponse.data) && studentsResponse.data.length > 0) {
                const sampleStudent = studentsResponse.data[0];
                console.log('✅ Sample student fields:', Object.keys(sampleStudent));
                console.log('✅ Sample student has qr_code:', 'qr_code' in sampleStudent);
            }
        } catch (studentsError) {
            console.log('❌ Students endpoint error:', studentsError.response?.data || studentsError.message);
        }
        
        // 5. Test student registration
        console.log('\n5. Testing student registration...');
        const testStudent = {
            student_id: `COMPREHENSIVE_${Date.now()}`,
            name: 'Comprehensive Test Student',
            email: `comprehensive_${Date.now()}@test.com`,
            phone: '1234567890'
        };
        
        try {
            const registerResponse = await axios.post(`${BASE_URL}/students/register`, testStudent);
            console.log('✅ Registration successful!');
            console.log('✅ Registration response:', {
                message: registerResponse.data.message,
                student_id: registerResponse.data.student?.student_id,
                has_qr_code: 'qr_code' in (registerResponse.data.student || {}),
                qr_code_length: registerResponse.data.student?.qr_code?.length || 0
            });
            
            // 6. Verify the registered student can be retrieved
            console.log('\n6. Verifying registered student...');
            try {
                const getStudentResponse = await axios.get(`${BASE_URL}/students/${testStudent.student_id}`);
                console.log('✅ Student retrieval successful!');
                console.log('✅ Retrieved student has qr_code:', 'qr_code' in getStudentResponse.data);
                console.log('✅ Retrieved student fields:', Object.keys(getStudentResponse.data));
            } catch (getError) {
                console.log('❌ Student retrieval error:', getError.response?.data || getError.message);
            }
            
        } catch (registerError) {
            console.log('❌ Registration error:', registerError.response?.data || registerError.message);
            console.log('❌ This indicates the qr_code column is still not functional');
        }
        
        // 7. Test enrollment status endpoint (if it exists)
        console.log('\n7. Testing enrollment status endpoint...');
        try {
            const enrollmentResponse = await axios.get(`${BASE_URL}/enrollment/students`);
            console.log('✅ Enrollment endpoint response:', {
                success: enrollmentResponse.data.success,
                student_count: enrollmentResponse.data.students?.length || 0
            });
        } catch (enrollmentError) {
            console.log('❌ Enrollment endpoint error:', enrollmentError.response?.data || enrollmentError.message);
        }
        
        console.log('\n🏁 Comprehensive schema test completed!');
        
        // Summary
        console.log('\n📊 TEST SUMMARY:');
        console.log('- Health endpoint: Working');
        console.log('- Database status: Check logs above');
        console.log('- Schema fix: Check logs above');
        console.log('- Student registration: Check logs above');
        console.log('- If registration worked, the qr_code column is functional!');
        
    } catch (error) {
        console.error('❌ Test failed:', error.message);
    }
}

comprehensiveSchemaTest();