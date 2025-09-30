const axios = require('axios');

const BASE_URL = 'https://attendease-backend-ovl6.onrender.com/api';

async function sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

async function simpleColumnTest() {
    console.log('🔧 Simple column existence test...');
    console.log('URL:', BASE_URL);
    
    try {
        console.log('\n⏳ Waiting for deployment to complete...');
        await sleep(5000);
        
        // 1. Test health endpoint
        console.log('\n1. Testing health endpoint...');
        const healthResponse = await axios.get(`${BASE_URL}/health`);
        console.log('✅ Health check:', healthResponse.data);
        
        // 2. Check database status
        console.log('\n2. Checking database status...');
        const dbStatusResponse = await axios.get(`${BASE_URL}/database/status`);
        console.log('✅ Database status:', dbStatusResponse.data);
        
        // 3. Run schema fix (this should be safe now)
        console.log('\n3. Running schema fix...');
        const schemaResponse = await axios.post(`${BASE_URL}/database/fix-schema`);
        console.log('Schema fix result:', schemaResponse.data);
        
        if (schemaResponse.data.success) {
            console.log('✅ Schema fix completed successfully');
        } else {
            console.log('❌ Schema fix failed:', schemaResponse.data.error);
            return;
        }
        
        // 4. Test students endpoint (this will tell us if the column exists)
        console.log('\n4. Testing students endpoint...');
        try {
            const studentsResponse = await axios.get(`${BASE_URL}/students`);
            console.log('✅ Students endpoint working:', {
                success: studentsResponse.data.success,
                count: studentsResponse.data.students ? studentsResponse.data.students.length : 'unknown'
            });
        } catch (studentsError) {
            console.log('❌ Students endpoint failed:', studentsError.response?.data || studentsError.message);
        }
        
        // 5. Test enrollment status endpoint
        console.log('\n5. Testing enrollment status endpoint...');
        try {
            const enrollmentResponse = await axios.get(`${BASE_URL}/enrollment-status/students`);
            console.log('✅ Enrollment status endpoint working:', {
                success: enrollmentResponse.data.success,
                count: enrollmentResponse.data.students ? enrollmentResponse.data.students.length : 'unknown'
            });
        } catch (enrollmentError) {
            console.log('❌ Enrollment status endpoint failed:', enrollmentError.response?.data || enrollmentError.message);
        }
        
        // 6. Test a simple student registration (with unique data)
        console.log('\n6. Testing student registration...');
        const uniqueId = `TEST_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
        const uniqueEmail = `test_${Date.now()}_${Math.random().toString(36).substr(2, 9)}@example.com`;
        
        try {
            const registrationData = {
                student_id: uniqueId,
                name: 'Test Student',
                email: uniqueEmail
            };
            
            const registrationResponse = await axios.post(`${BASE_URL}/students/register`, registrationData);
            console.log('✅ Student registration working:', registrationResponse.data);
            
            // Clean up the test student
            if (registrationResponse.data.success) {
                try {
                    await axios.delete(`${BASE_URL}/students/${uniqueId}`);
                    console.log('🧹 Test student cleaned up');
                } catch (cleanupError) {
                    console.log('⚠️ Could not clean up test student:', cleanupError.message);
                }
            }
            
        } catch (registrationError) {
            console.log('❌ Student registration failed:', registrationError.response?.data || registrationError.message);
        }
        
        console.log('\n🎉 Simple column test completed!');
        
    } catch (error) {
        console.error('❌ Test failed:', error.message);
        if (error.response) {
            console.error('Response data:', error.response.data);
        }
    }
}

simpleColumnTest();