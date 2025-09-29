const axios = require('axios');
const { dbAdapter } = require('./config/database-adapter');

async function checkEnrollments() {
    console.log('🔍 Checking Current Enrollment Status');
    console.log('====================================');

    try {
        // 1. Check Python backend enrollments
        console.log('\n🐍 Python Backend Enrollments:');
        const pythonResponse = await axios.get('http://localhost:8000/api/face/enrollments');
        const enrollments = pythonResponse.data.enrollments;
        
        console.log(`Found ${enrollments.length} enrollments:`);
        enrollments.forEach((enrollment, index) => {
            console.log(`   ${index + 1}. ${enrollment.student_id} - Confidence: ${enrollment.face_confidence}, Quality: ${enrollment.photo_quality_score}, Date: ${enrollment.enrollment_date}`);
        });

        // 2. Check for duplicates
        console.log('\n🔍 Checking for duplicate enrollments:');
        const studentCounts = {};
        enrollments.forEach(enrollment => {
            studentCounts[enrollment.student_id] = (studentCounts[enrollment.student_id] || 0) + 1;
        });

        const duplicates = Object.entries(studentCounts).filter(([studentId, count]) => count > 1);
        if (duplicates.length > 0) {
            console.log('❌ Found duplicate enrollments:');
            duplicates.forEach(([studentId, count]) => {
                console.log(`   ${studentId}: ${count} enrollments`);
            });
        } else {
            console.log('✅ No duplicate enrollments found');
        }

        // 3. Check Node.js students table
        console.log('\n🟢 Node.js Students Table:');
        const students = await dbAdapter.all('SELECT student_id, name FROM students ORDER BY student_id');
        console.log(`Found ${students.length} students:`);
        students.forEach(student => {
            console.log(`   ${student.student_id}: ${student.name}`);
        });

        // 4. Check attendance status
        console.log('\n📅 Today\'s Attendance Status:');
        const today = new Date().toISOString().split('T')[0];
        const attendance = await dbAdapter.all(
            'SELECT student_id, status, check_in_time FROM daily_attendance WHERE date = ? ORDER BY student_id',
            [today]
        );
        
        console.log(`Found ${attendance.length} attendance records for ${today}:`);
        attendance.forEach(record => {
            console.log(`   ${record.student_id}: ${record.status} ${record.check_in_time ? `(${record.check_in_time})` : ''}`);
        });

        // 5. Cross-reference enrollments with students
        console.log('\n🔗 Cross-Reference Analysis:');
        const enrolledStudentIds = [...new Set(enrollments.map(e => e.student_id))];
        const registeredStudentIds = students.map(s => s.student_id);
        
        console.log('Students with face enrollments but not in students table:');
        const orphanedEnrollments = enrolledStudentIds.filter(id => !registeredStudentIds.includes(id));
        if (orphanedEnrollments.length > 0) {
            orphanedEnrollments.forEach(id => console.log(`   ❌ ${id}`));
        } else {
            console.log('   ✅ All enrolled students are properly registered');
        }

        console.log('Students registered but without face enrollments:');
        const unenrolledStudents = registeredStudentIds.filter(id => !enrolledStudentIds.includes(id));
        if (unenrolledStudents.length > 0) {
            unenrolledStudents.forEach(id => console.log(`   ⚠️ ${id}`));
        } else {
            console.log('   ✅ All registered students have face enrollments');
        }

    } catch (error) {
        console.error('❌ Error checking enrollments:', error.message);
    }
}

checkEnrollments();