const axios = require('axios');

const API_BASE_URL = 'http://localhost:5000/api';

async function testDashboardFix() {
    try {
        console.log('🔍 Testing Dashboard Fix...\n');

        // Step 1: Login to get token
        console.log('1. Logging in...');
        const loginResponse = await axios.post(`${API_BASE_URL}/teachers/login`, {
            email: 'admin@school.com',
            password: 'password'
        });
        
        const token = loginResponse.data.token;
        console.log('✅ Login successful\n');

        // Step 2: Test the new endpoint that dashboard should be using
        console.log('2. Testing attendance-management endpoint (what dashboard now uses)...');
        const today = new Date().toISOString().split('T')[0];
        const attendanceResponse = await axios.get(`${API_BASE_URL}/attendance-management/daily/${today}`, {
            headers: { Authorization: `Bearer ${token}` }
        });
        
        console.log('📊 Today\'s Attendance Data (from attendance-management):');
        console.log(`   Total students: ${attendanceResponse.data.students.length}`);
        
        const presentStudents = attendanceResponse.data.students.filter(s => s.status === 'present');
        const notYetHereStudents = attendanceResponse.data.students.filter(s => s.status === 'not_yet_here');
        const absentStudents = attendanceResponse.data.students.filter(s => s.status === 'absent');
        
        console.log(`   Present: ${presentStudents.length}`);
        console.log(`   Not Yet Here: ${notYetHereStudents.length}`);
        console.log(`   Absent: ${absentStudents.length}`);
        
        console.log('\n📋 Student Details:');
        attendanceResponse.data.students.forEach(student => {
            const timeStr = student.check_in_time ? new Date(student.check_in_time).toLocaleTimeString() : 'Not checked in';
            console.log(`   ${student.student_name} (${student.student_id}): ${student.status} - ${timeStr}`);
        });

        // Step 3: Test summary endpoint
        console.log('\n3. Testing summary endpoint...');
        const summaryResponse = await axios.get(`${API_BASE_URL}/attendance/summary`, {
            headers: { Authorization: `Bearer ${token}` }
        });
        
        console.log('📈 Summary Data:');
        console.log(`   Total Attendance: ${summaryResponse.data.total_attendance}`);
        console.log(`   Total Registered Students: ${summaryResponse.data.total_registered_students}`);
        console.log(`   Active Days: ${summaryResponse.data.daily_attendance?.length || 0}`);

        // Step 4: Compare with old endpoint
        console.log('\n4. Comparing with old endpoint (for reference)...');
        try {
            const oldResponse = await axios.get(`${API_BASE_URL}/attendance/today`, {
                headers: { Authorization: `Bearer ${token}` }
            });
            console.log(`📊 Old endpoint (/attendance/today): ${oldResponse.data.length} records`);
        } catch (error) {
            console.log('❌ Old endpoint failed:', error.response?.data?.message || error.message);
        }

        console.log('\n✅ Dashboard fix verification complete!');
        console.log('\n🎯 Expected Dashboard Behavior:');
        console.log('   - Should show all students with their current status');
        console.log('   - "Today\'s Attendance" count should show only present students');
        console.log('   - Table should display all students with status indicators');
        console.log('   - Real-time updates when students check in');

    } catch (error) {
        console.error('❌ Test failed:', error.response?.data || error.message);
    }
}

testDashboardFix();