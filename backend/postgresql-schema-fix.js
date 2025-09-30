const axios = require('axios');

const BASE_URL = 'https://attendease-backend-ovl6.onrender.com/api';

async function postgresqlSchemaFix() {
    console.log('🔧 PostgreSQL-specific schema fix test...');
    console.log('URL:', BASE_URL);
    
    try {
        // Wait for deployment
        console.log('\n⏳ Waiting for deployment to complete...');
        await new Promise(resolve => setTimeout(resolve, 10000));
        
        // 1. Check current database status
        console.log('\n1. Checking database status...');
        try {
            const statusResponse = await axios.get(`${BASE_URL}/database/status`);
            console.log('✅ Database status:', statusResponse.data);
        } catch (statusError) {
            console.log('❌ Database status error:', statusError.response?.data || statusError.message);
        }
        
        // 2. Run schema fix
        console.log('\n2. Running PostgreSQL schema fix...');
        try {
            const fixResponse = await axios.post(`${BASE_URL}/database/fix-schema`);
            console.log('✅ Schema fix response:', fixResponse.data);
        } catch (fixError) {
            console.log('❌ Schema fix error:', fixError.response?.data || fixError.message);
        }
        
        // 3. Test direct PostgreSQL column check
        console.log('\n3. Testing PostgreSQL column detection...');
        try {
            // Create a test endpoint call that checks columns using PostgreSQL syntax
            const testData = {
                query: 'SELECT column_name FROM information_schema.columns WHERE table_name = $1 ORDER BY ordinal_position',
                params: ['students']
            };
            
            // We'll use the students endpoint to check if qr_code is working
            const studentsResponse = await axios.get(`${BASE_URL}/students`);
            console.log('✅ Students endpoint response:', {
                success: studentsResponse.data.success,
                count: studentsResponse.data.students?.length || 0,
                sample: studentsResponse.data.students?.[0] || 'No students'
            });
            
            // Check if any student has qr_code field
            if (studentsResponse.data.students && studentsResponse.data.students.length > 0) {
                const sampleStudent = studentsResponse.data.students[0];
                const hasQrCode = 'qr_code' in sampleStudent;
                console.log('✅ Sample student has qr_code field:', hasQrCode);
                console.log('✅ Sample student fields:', Object.keys(sampleStudent));
            }
            
        } catch (testError) {
            console.log('❌ PostgreSQL test error:', testError.response?.data || testError.message);
        }
        
        // 4. Test student registration
        console.log('\n4. Testing student registration...');
        const testStudent = {
            student_id: `PGTEST_${Date.now()}`,
            name: 'PostgreSQL Test Student',
            email: `pgtest_${Date.now()}@test.com`
        };
        
        try {
            const registerResponse = await axios.post(`${BASE_URL}/students/register`, testStudent);
            console.log('✅ Registration successful:', registerResponse.data);
            
            // Check if the registered student has qr_code
            if (registerResponse.data.student) {
                const hasQrCode = 'qr_code' in registerResponse.data.student;
                console.log('✅ Registered student has qr_code:', hasQrCode);
                console.log('✅ Registered student qr_code value:', registerResponse.data.student.qr_code);
            }
            
        } catch (registerError) {
            console.log('❌ Registration error:', registerError.response?.data || registerError.message);
        }
        
        // 5. Test health endpoint
        console.log('\n5. Testing health endpoint...');
        try {
            const healthResponse = await axios.get(`${BASE_URL}/health`);
            console.log('✅ Health check:', healthResponse.data);
        } catch (healthError) {
            console.log('❌ Health check error:', healthError.response?.data || healthError.message);
        }
        
        console.log('\n🏁 PostgreSQL schema fix test completed!');
        
    } catch (error) {
        console.error('❌ Test failed:', error.message);
    }
}

postgresqlSchemaFix();