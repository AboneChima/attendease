const axios = require('axios');

const BASE_URL = 'http://localhost:5000';
const today = new Date().toISOString().split('T')[0];

console.log('🔍 Testing frontend API endpoints...\n');
console.log(`📅 Today's date: ${today}\n`);

async function testEndpoints() {
    try {
        // Test /api/attendance/today endpoint
        console.log('📡 Testing /api/attendance/today endpoint...');
        try {
            const todayResponse = await axios.get(`${BASE_URL}/api/attendance/today`);
            console.log('✅ /api/attendance/today response:');
            console.log(`   Status: ${todayResponse.status}`);
            console.log(`   Data:`, JSON.stringify(todayResponse.data, null, 2));
        } catch (error) {
            console.log('❌ /api/attendance/today error:', error.response?.data || error.message);
        }

        console.log('\n' + '='.repeat(50) + '\n');

        // Test /api/attendance-management/daily/{date} endpoint
        console.log(`📡 Testing /api/attendance-management/daily/${today} endpoint...`);
        try {
            const dailyResponse = await axios.get(`${BASE_URL}/api/attendance-management/daily/${today}`);
            console.log('✅ /api/attendance-management/daily response:');
            console.log(`   Status: ${dailyResponse.status}`);
            console.log(`   Students count: ${dailyResponse.data.students?.length || 0}`);
            console.log(`   Summary:`, dailyResponse.data.summary);
            
            if (dailyResponse.data.students) {
                console.log('\n   📋 Students in response:');
                dailyResponse.data.students.forEach((student, index) => {
                    console.log(`   ${index + 1}. ${student.student_id} - ${student.name} (${student.status})`);
                });
            }
        } catch (error) {
            console.log('❌ /api/attendance-management/daily error:', error.response?.data || error.message);
        }

        console.log('\n' + '='.repeat(50) + '\n');

        // Test /api/students endpoint to see all active students
        console.log('📡 Testing /api/students endpoint...');
        try {
            const studentsResponse = await axios.get(`${BASE_URL}/api/students`);
            console.log('✅ /api/students response:');
            console.log(`   Status: ${studentsResponse.status}`);
            console.log(`   Active students count: ${studentsResponse.data?.length || 0}`);
            
            if (studentsResponse.data) {
                console.log('\n   👥 Active students:');
                studentsResponse.data.forEach((student, index) => {
                    console.log(`   ${index + 1}. ${student.student_id} - ${student.name} (${student.email})`);
                });
            }
        } catch (error) {
            console.log('❌ /api/students error:', error.response?.data || error.message);
        }

    } catch (error) {
        console.error('❌ General error:', error.message);
    }
}

testEndpoints();