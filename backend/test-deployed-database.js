const axios = require('axios');

const API_BASE_URL = 'https://attendease-backend-ovl6.onrender.com/api';

async function testDeployedDatabase() {
    console.log('🔍 Testing Deployed Backend Database Connection...\n');

    try {
        // Step 1: Test health endpoint
        console.log('1. Testing health endpoint...');
        const healthResponse = await axios.get(`${API_BASE_URL}/health`);
        console.log('✅ Health check:', healthResponse.data.message);

        // Step 2: Test students endpoint (should work without auth)
        console.log('\n2. Testing students endpoint...');
        const studentsResponse = await axios.get(`${API_BASE_URL}/students`);
        console.log(`✅ Students endpoint: Found ${studentsResponse.data.length} students`);
        
        if (studentsResponse.data.length > 0) {
            console.log(`   First student: ${studentsResponse.data[0].name} (${studentsResponse.data[0].student_id})`);
        }

        // Step 3: Test teacher login
        console.log('\n3. Testing teacher login...');
        let token = null;
        try {
            const loginResponse = await axios.post(`${API_BASE_URL}/teachers/login`, {
                email: 'admin@school.com',
                password: 'password'
            });
            token = loginResponse.data.token;
            console.log('✅ Teacher login successful');
        } catch (error) {
            console.log('❌ Teacher login failed:', error.response?.data?.message || error.message);
            console.log('   This might indicate database table issues');
        }

        if (token) {
            const headers = { 'Authorization': `Bearer ${token}` };

            // Step 4: Test dashboard endpoints with authentication
            console.log('\n4. Testing dashboard endpoints with authentication...');
            
            const today = new Date().toISOString().split('T')[0];
            
            try {
                const attendanceResponse = await axios.get(`${API_BASE_URL}/attendance-management/daily/${today}`, { headers });
                console.log('✅ Attendance management endpoint working');
                console.log(`   Found ${attendanceResponse.data.students?.length || 0} students for today`);
            } catch (error) {
                console.log('❌ Attendance management endpoint failed:', error.response?.data?.message || error.message);
            }

            try {
                const summaryResponse = await axios.get(`${API_BASE_URL}/attendance/summary`, { headers });
                console.log('✅ Summary endpoint working');
                console.log(`   Total attendance: ${summaryResponse.data.total_attendance}`);
                console.log(`   Total students: ${summaryResponse.data.total_registered_students}`);
            } catch (error) {
                console.log('❌ Summary endpoint failed:', error.response?.data?.message || error.message);
            }

            try {
                const enrollmentResponse = await axios.get(`${API_BASE_URL}/enrollment-status/students`, { headers });
                console.log('✅ Enrollment status endpoint working');
                console.log(`   Found ${enrollmentResponse.data.students?.length || 0} students in enrollment data`);
            } catch (error) {
                console.log('❌ Enrollment status endpoint failed:', error.response?.data?.message || error.message);
            }
        }

        // Step 5: Test student registration
        console.log('\n5. Testing student registration...');
        try {
            const newStudent = {
                student_id: `TEST${Date.now()}`,
                name: 'Test Student',
                email: `test${Date.now()}@example.com`,
                phone: '+1234567890'
            };
            
            const registerResponse = await axios.post(`${API_BASE_URL}/students/register`, newStudent);
            console.log('✅ Student registration working');
            console.log(`   Created student: ${registerResponse.data.student.name}`);
            
            // Clean up - delete the test student
            await axios.delete(`${API_BASE_URL}/students/${registerResponse.data.student.id}`);
            console.log('✅ Test student cleaned up');
        } catch (error) {
            console.log('❌ Student registration failed:', error.response?.data?.message || error.message);
            console.log('   This indicates database connection or table issues');
        }

        console.log('\n🎯 Test Summary:');
        console.log('   - If all tests pass: Database is working correctly');
        console.log('   - If login fails: Teacher table might not exist or be populated');
        console.log('   - If dashboard endpoints fail: Attendance tables might not exist');
        console.log('   - If student registration fails: Database connection issues');

    } catch (error) {
        console.error('❌ Test failed:', error.message);
        console.log('\n🔧 Possible issues:');
        console.log('   - Database not connected');
        console.log('   - Tables not created');
        console.log('   - Environment variables not set correctly');
    }
}

testDeployedDatabase();