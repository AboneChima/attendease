const axios = require('axios');

const API_BASE_URL = 'http://localhost:5000/api';

async function testAttendanceMarking() {
    try {
        console.log('🔍 Testing Attendance Marking Process...\n');

        // Step 1: Login to get token
        console.log('1. Logging in...');
        const loginResponse = await axios.post(`${API_BASE_URL}/teachers/login`, {
            email: 'admin@school.com',
            password: 'password'
        });
        
        const token = loginResponse.data.token;
        console.log('✅ Login successful\n');

        // Step 2: Check current dashboard state
        console.log('2. Checking current dashboard state...');
        const today = new Date().toISOString().split('T')[0];
        const beforeResponse = await axios.get(`${API_BASE_URL}/attendance-management/daily/${today}`, {
            headers: { Authorization: `Bearer ${token}` }
        });
        
        const presentBefore = beforeResponse.data.students.filter(s => s.status === 'present').length;
        console.log(`📊 Before marking: ${presentBefore} students present out of ${beforeResponse.data.students.length}`);

        // Step 3: Mark attendance for a student
        console.log('\n3. Marking attendance for a student...');
        const studentToMark = beforeResponse.data.students.find(s => s.status === 'not_yet_here');
        
        if (!studentToMark) {
            console.log('⚠️ No students available to mark attendance (all already present)');
            return;
        }

        console.log(`📝 Marking attendance for: ${studentToMark.student_name} (${studentToMark.student_id})`);
        
        // Simulate the attendance marking process
        const markResponse = await axios.post(`${API_BASE_URL}/attendance/record`, {
            student_id: studentToMark.student_id
        }, {
            headers: { Authorization: `Bearer ${token}` }
        });
        
        console.log('✅ Attendance marked successfully');

        // Step 4: Check dashboard state after marking
        console.log('\n4. Checking dashboard state after marking...');
        const afterResponse = await axios.get(`${API_BASE_URL}/attendance-management/daily/${today}`, {
            headers: { Authorization: `Bearer ${token}` }
        });
        
        const presentAfter = afterResponse.data.students.filter(s => s.status === 'present').length;
        console.log(`📊 After marking: ${presentAfter} students present out of ${afterResponse.data.students.length}`);

        // Step 5: Verify the specific student's status changed
        const markedStudent = afterResponse.data.students.find(s => s.student_id === studentToMark.student_id);
        console.log(`\n📋 Student Status Update:`);
        console.log(`   ${markedStudent.student_name} (${markedStudent.student_id})`);
        console.log(`   Status: ${markedStudent.status}`);
        console.log(`   Check-in Time: ${markedStudent.check_in_time ? new Date(markedStudent.check_in_time).toLocaleTimeString() : 'Not checked in'}`);

        // Step 6: Verify dashboard metrics
        console.log('\n5. Verifying dashboard metrics...');
        const summaryResponse = await axios.get(`${API_BASE_URL}/attendance/summary`, {
            headers: { Authorization: `Bearer ${token}` }
        });
        
        console.log('📈 Updated Summary:');
        console.log(`   Total Attendance: ${summaryResponse.data.total_attendance}`);
        console.log(`   Total Registered Students: ${summaryResponse.data.total_registered_students}`);

        console.log('\n✅ Attendance marking test complete!');
        
        if (presentAfter > presentBefore) {
            console.log('🎉 SUCCESS: Attendance marking properly reflects on dashboard!');
        } else {
            console.log('❌ ISSUE: Attendance marking did not update dashboard correctly');
        }

    } catch (error) {
        console.error('❌ Test failed:', error.response?.data || error.message);
        if (error.response?.status === 400) {
            console.log('💡 This might be expected if the student already has attendance marked today');
        }
    }
}

testAttendanceMarking();