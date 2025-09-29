const sqlite3 = require('sqlite3').verbose();
const path = require('path');

// Database path
const dbPath = path.join(__dirname, 'database', 'attendance.db');

console.log('🔍 Investigating Chidubem Innocent\'s Attendance Case');
console.log('=' .repeat(60));

const db = new sqlite3.Database(dbPath, (err) => {
    if (err) {
        console.error('❌ Error opening database:', err.message);
        return;
    }
    console.log('✅ Connected to SQLite database');
    investigateChidubem();
});

function investigateChidubem() {
    console.log('\n📋 Step 1: Searching for Chidubem Innocent in students table...');
    
    // Search for Chidubem in students table
    db.all(`
        SELECT * FROM students 
        WHERE name LIKE '%chidubem%' OR name LIKE '%innocent%' 
        OR student_id LIKE '%chidubem%' OR student_id LIKE '%innocent%'
        ORDER BY name
    `, [], (err, students) => {
        if (err) {
            console.error('❌ Error querying students:', err.message);
            return;
        }
        
        if (students.length === 0) {
            console.log('⚠️  No students found matching "Chidubem" or "Innocent"');
            console.log('\n📋 Let me check all students to see the exact names...');
            
            // Show all students if no match found
            db.all('SELECT * FROM students ORDER BY name', [], (err, allStudents) => {
                if (err) {
                    console.error('❌ Error querying all students:', err.message);
                    return;
                }
                
                console.log('\n👥 All Students in Database:');
                allStudents.forEach((student, index) => {
                    console.log(`${index + 1}. ID: ${student.student_id}, Name: ${student.name}`);
                });
                
                db.close();
            });
            return;
        }
        
        console.log(`\n✅ Found ${students.length} matching student(s):`);
        students.forEach((student, index) => {
            console.log(`\n${index + 1}. Student Details:`);
            console.log(`   - Student ID: ${student.student_id}`);
            console.log(`   - Name: ${student.name}`);
            console.log(`   - Email: ${student.email || 'N/A'}`);
            console.log(`   - Phone: ${student.phone || 'N/A'}`);
            console.log(`   - Created: ${student.created_at || 'N/A'}`);
        });
        
        // For each found student, check their attendance and face enrollment
        let processedCount = 0;
        students.forEach((student) => {
            checkStudentAttendance(student, () => {
                processedCount++;
                if (processedCount === students.length) {
                    db.close();
                }
            });
        });
    });
}

function checkStudentAttendance(student, callback) {
    console.log(`\n📅 Step 2: Checking attendance records for ${student.name} (${student.student_id})...`);
    
    // Check recent attendance records
    db.all(`
        SELECT da.*, 
               datetime(da.created_at, 'localtime') as created_time,
               datetime(da.updated_at, 'localtime') as updated_time
        FROM daily_attendance da
        WHERE da.student_id = ?
        ORDER BY da.created_at DESC
        LIMIT 10
    `, [student.student_id], (err, attendance) => {
        if (err) {
            console.error('❌ Error querying attendance:', err.message);
            callback();
            return;
        }
        
        if (attendance.length === 0) {
            console.log(`   ⚠️  No attendance records found for ${student.name}`);
        } else {
            console.log(`   ✅ Found ${attendance.length} recent attendance record(s):`);
            attendance.forEach((record, index) => {
                console.log(`   ${index + 1}. Date: ${record.date}, Status: ${record.status}`);
                console.log(`      Check-in Time: ${record.check_in_time || 'N/A'}`);
                console.log(`      Created: ${record.created_time}`);
                console.log(`      Updated: ${record.updated_time}`);
            });
        }
        
        // Check face enrollment
        checkFaceEnrollment(student, callback);
    });
}

function checkFaceEnrollment(student, callback) {
    console.log(`\n👤 Step 3: Checking face enrollment for ${student.name} (${student.student_id})...`);
    
    db.all(`
        SELECT pfe.*, 
               datetime(pfe.created_at, 'localtime') as enrollment_time
        FROM photo_face_enrollments pfe
        WHERE pfe.student_id = ?
        ORDER BY pfe.created_at DESC
    `, [student.student_id], (err, enrollments) => {
        if (err) {
            console.error('❌ Error querying face enrollments:', err.message);
            callback();
            return;
        }
        
        if (enrollments.length === 0) {
            console.log(`   ⚠️  No face enrollment found for ${student.name}`);
            console.log(`   💡 This means ${student.name} cannot be verified through face recognition!`);
        } else {
            console.log(`   ✅ Found ${enrollments.length} face enrollment(s):`);
            enrollments.forEach((enrollment, index) => {
                console.log(`   ${index + 1}. Enrollment ID: ${enrollment.id}`);
                console.log(`      - Active: ${enrollment.is_active ? 'Yes' : 'No'}`);
                console.log(`      - Quality Score: ${enrollment.quality_score || 'N/A'}`);
                console.log(`      - Confidence Score: ${enrollment.confidence_score || 'N/A'}`);
                console.log(`      - Enrolled: ${enrollment.enrollment_time}`);
                console.log(`      - Photo Path: ${enrollment.photo_path || 'N/A'}`);
            });
        }
        
        // Check if there are any recent face verification attempts
        checkRecentVerifications(student, callback);
    });
}

function checkRecentVerifications(student, callback) {
    console.log(`\n🔍 Step 4: Checking recent verification attempts for ${student.name}...`);
    
    // Check if there are any verification attempts in verification_attempts table
    db.all(`
        SELECT va.*, 
               datetime(va.created_at, 'localtime') as verification_time
        FROM verification_attempts va
        WHERE va.student_id = ?
        ORDER BY va.created_at DESC
        LIMIT 5
    `, [student.student_id], (err, verifications) => {
        if (err) {
            console.error('❌ Error querying verification attempts:', err.message);
            // Continue anyway
        } else if (verifications.length === 0) {
            console.log(`   ⚠️  No verification attempts found for ${student.name}`);
        } else {
            console.log(`   ✅ Found ${verifications.length} recent verification attempt(s):`);
            verifications.forEach((verification, index) => {
                console.log(`   ${index + 1}. Time: ${verification.verification_time}`);
                console.log(`      - Method: ${verification.verification_method || 'N/A'}`);
                console.log(`      - Success: ${verification.success ? 'Yes' : 'No'}`);
                console.log(`      - Confidence: ${verification.confidence_score || 'N/A'}`);
                if (verification.error_message) {
                    console.log(`      - Error: ${verification.error_message}`);
                }
            });
        }
        
        console.log(`\n📊 Summary for ${student.name} (${student.student_id}):`);
        console.log('=' .repeat(50));
        
        // Provide analysis and recommendations
        analyzeStudentCase(student, callback);
    });
}

function analyzeStudentCase(student, callback) {
    // Get current status
    db.get(`
        SELECT COUNT(*) as enrollment_count 
        FROM photo_face_enrollments 
        WHERE student_id = ? AND is_active = 1
    `, [student.student_id], (err, enrollmentCount) => {
        if (err) {
            console.error('❌ Error checking enrollment count:', err.message);
            callback();
            return;
        }
        
        db.get(`
            SELECT COUNT(*) as attendance_count 
            FROM daily_attendance 
            WHERE student_id = ? AND date = date('now', 'localtime')
        `, [student.student_id], (err, todayAttendance) => {
            if (err) {
                console.error('❌ Error checking today\'s attendance:', err.message);
                callback();
                return;
            }
            
            console.log(`\n🎯 Analysis for ${student.name}:`);
            console.log(`   - Face Enrollment Status: ${enrollmentCount.enrollment_count > 0 ? '✅ Enrolled' : '❌ Not Enrolled'}`);
            console.log(`   - Today's Attendance: ${todayAttendance.attendance_count > 0 ? '✅ Marked Present' : '❌ Not Marked'}`);
            
            if (enrollmentCount.enrollment_count === 0) {
                console.log(`\n💡 ISSUE IDENTIFIED:`);
                console.log(`   ${student.name} is NOT enrolled for face recognition!`);
                console.log(`   If they were marked present, it was NOT through face verification.`);
                console.log(`\n🔧 Possible Explanations:`);
                console.log(`   1. Manual attendance marking by teacher`);
                console.log(`   2. Different verification method used`);
                console.log(`   3. System error or data inconsistency`);
                console.log(`\n📋 Recommendations:`);
                console.log(`   1. Check if teacher manually marked attendance`);
                console.log(`   2. Enroll ${student.name} for face recognition if needed`);
                console.log(`   3. Review attendance marking procedures`);
            } else if (todayAttendance.attendance_count > 0) {
                console.log(`\n✅ NORMAL CASE:`);
                console.log(`   ${student.name} is enrolled and was marked present today.`);
                console.log(`   This appears to be legitimate attendance marking.`);
            }
            
            callback();
        });
    });
}

// Handle database errors
db.on('error', (err) => {
    console.error('❌ Database error:', err.message);
});