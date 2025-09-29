const axios = require('axios');

const BASE_URL = 'http://localhost:5000';
const today = new Date().toISOString().split('T')[0];

console.log('🔍 Testing Dashboard Endpoints');
console.log('==============================\n');
console.log(`📅 Today's date: ${today}\n`);

async function testDashboardEndpoints() {
    let token = null;
    
    try {
        // First, try to login to get a token
        console.log('🔐 Attempting to login...');
        try {
            const loginResponse = await axios.post(`${BASE_URL}/api/teachers/login`, {
                email: 'admin@school.com',
                password: 'password'
            });
            token = loginResponse.data.token;
            console.log('✅ Login successful, token obtained\n');
        } catch (error) {
            console.log('❌ Login failed:', error.response?.data || error.message);
            console.log('   Continuing without authentication...\n');
        }

        const headers = token ? { 'Authorization': `Bearer ${token}` } : {};

        // Test /api/attendance/today endpoint (what dashboard uses)
        console.log('📡 Testing /api/attendance/today endpoint (used by dashboard)...');
        try {
            const todayResponse = await axios.get(`${BASE_URL}/api/attendance/today`, { headers });
            console.log('✅ /api/attendance/today response:');
            console.log(`   Status: ${todayResponse.status}`);
            console.log(`   Count: ${todayResponse.data.count}`);
            console.log(`   Records:`, todayResponse.data.attendance.length > 0 ? 
                todayResponse.data.attendance.map(r => `${r.student_id}: ${r.student_name} at ${r.time}`).join(', ') : 
                'No records found');
        } catch (error) {
            console.log('❌ /api/attendance/today error:', error.response?.data || error.message);
        }

        console.log('\n' + '='.repeat(50) + '\n');

        // Test /api/attendance-management/daily/{date} endpoint (actual attendance status)
        console.log(`📡 Testing /api/attendance-management/daily/${today} endpoint (actual status)...`);
        try {
            const dailyResponse = await axios.get(`${BASE_URL}/api/attendance-management/daily/${today}`, { headers });
            console.log('✅ /api/attendance-management/daily response:');
            console.log(`   Status: ${dailyResponse.status}`);
            console.log(`   Students count: ${dailyResponse.data.students?.length || 0}`);
            console.log(`   Summary:`, dailyResponse.data.summary);
            
            if (dailyResponse.data.students) {
                const presentStudents = dailyResponse.data.students.filter(s => s.status === 'present');
                console.log(`\n   📋 Present students (${presentStudents.length}):`);
                presentStudents.forEach((student, index) => {
                    console.log(`   ${index + 1}. ${student.student_id}: ${student.student_name} - ${student.status} (${student.check_in_time || 'No time'})`);
                });
                
                const notYetHere = dailyResponse.data.students.filter(s => s.status === 'not_yet_here');
                console.log(`\n   ⏳ Not yet here (${notYetHere.length}):`);
                notYetHere.slice(0, 5).forEach((student, index) => {
                    console.log(`   ${index + 1}. ${student.student_id}: ${student.student_name} - ${student.status}`);
                });
                if (notYetHere.length > 5) {
                    console.log(`   ... and ${notYetHere.length - 5} more`);
                }
            }
        } catch (error) {
            console.log('❌ /api/attendance-management/daily error:', error.response?.data || error.message);
        }

        console.log('\n' + '='.repeat(50) + '\n');

        // Test /api/attendance/summary endpoint (used by dashboard)
        console.log('📡 Testing /api/attendance/summary endpoint (used by dashboard)...');
        try {
            const summaryResponse = await axios.get(`${BASE_URL}/api/attendance/summary`, { headers });
            console.log('✅ /api/attendance/summary response:');
            console.log(`   Status: ${summaryResponse.status}`);
            console.log(`   Total attendance: ${summaryResponse.data.total_attendance}`);
            console.log(`   Total registered students: ${summaryResponse.data.total_registered_students}`);
            console.log(`   Daily attendance count: ${summaryResponse.data.daily_attendance?.length || 0}`);
        } catch (error) {
            console.log('❌ /api/attendance/summary error:', error.response?.data || error.message);
        }

    } catch (error) {
        console.error('❌ General error:', error.message);
    }
}

testDashboardEndpoints();