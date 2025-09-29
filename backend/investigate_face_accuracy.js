const sqlite3 = require('sqlite3').verbose();
const path = require('path');

const DB_PATH = path.join(__dirname, 'database', 'attendance.db');

async function investigateFaceAccuracy() {
    console.log('=== INVESTIGATING FACE RECOGNITION ACCURACY ===\n');
    
    const db = new sqlite3.Database(DB_PATH);
    
    try {
        // 1. Check all face enrollments
        console.log('1. FACE ENROLLMENTS:');
        const enrollments = await new Promise((resolve, reject) => {
            db.all(`
                SELECT student_id, face_confidence, photo_quality_score, 
                       model_name, enrollment_date, is_active
                FROM photo_face_enrollments 
                ORDER BY student_id
            `, (err, rows) => {
                if (err) reject(err);
                else resolve(rows);
            });
        });
        
        console.log(`Found ${enrollments.length} face enrollments:`);
        enrollments.forEach(enrollment => {
            console.log(`  ${enrollment.student_id}: confidence=${enrollment.face_confidence}, quality=${enrollment.photo_quality_score}, active=${enrollment.is_active}`);
        });
        
        // 2. Check recent attendance with details
        console.log('\n2. RECENT ATTENDANCE DETAILS:');
        const recentAttendance = await new Promise((resolve, reject) => {
            db.all(`
                SELECT da.student_id, s.name, da.status, 
                       da.check_in_time, da.date, da.student_name
                FROM daily_attendance da
                JOIN students s ON da.student_id = s.student_id
                WHERE da.date = date('now')
                ORDER BY da.check_in_time DESC
            `, (err, rows) => {
                if (err) reject(err);
                else resolve(rows);
            });
        });
        
        console.log(`Today's attendance (${recentAttendance.length} records):`);
        recentAttendance.forEach(record => {
            console.log(`  ${record.student_id} (${record.name || record.student_name}): ${record.status} at ${record.check_in_time || 'not checked in'}`);
        });
        
        // 3. Check STU04 specifically
        console.log('\n3. STU04 DETAILED ANALYSIS:');
        const stu04Details = await new Promise((resolve, reject) => {
            db.get(`
                SELECT * FROM students WHERE student_id = 'STU04'
            `, (err, row) => {
                if (err) reject(err);
                else resolve(row);
            });
        });
        
        if (stu04Details) {
            console.log(`STU04 Details: ${stu04Details.name}`);
            console.log(`Email: ${stu04Details.email}`);
            console.log(`Phone: ${stu04Details.phone}`);
        }
        
        // 4. Check STU04's face enrollment
        const stu04Enrollment = await new Promise((resolve, reject) => {
            db.get(`
                SELECT * FROM photo_face_enrollments WHERE student_id = 'STU04'
            `, (err, row) => {
                if (err) reject(err);
                else resolve(row);
            });
        });
        
        if (stu04Enrollment) {
            console.log(`STU04 Face Enrollment:`);
            console.log(`  Confidence: ${stu04Enrollment.face_confidence}`);
            console.log(`  Quality Score: ${stu04Enrollment.photo_quality_score}`);
            console.log(`  Model: ${stu04Enrollment.model_name}`);
            console.log(`  Active: ${stu04Enrollment.is_active}`);
            console.log(`  Enrolled: ${stu04Enrollment.enrollment_date}`);
        } else {
            console.log('STU04 has NO face enrollment!');
        }
        
        // 5. Check all students' face enrollment status
        console.log('\n4. ALL STUDENTS FACE ENROLLMENT STATUS:');
        const allStudents = await new Promise((resolve, reject) => {
            db.all(`
                SELECT s.student_id, s.name,
                       pfe.face_confidence, pfe.photo_quality_score, pfe.is_active
                FROM students s
                LEFT JOIN photo_face_enrollments pfe ON s.student_id = pfe.student_id
                ORDER BY s.student_id
            `, (err, rows) => {
                if (err) reject(err);
                else resolve(rows);
            });
        });
        
        console.log('Student enrollment status:');
        allStudents.forEach(student => {
            const enrolled = student.face_confidence ? 'YES' : 'NO';
            const confidence = student.face_confidence || 'N/A';
            const quality = student.photo_quality_score || 'N/A';
            console.log(`  ${student.student_id} (${student.name}): Enrolled=${enrolled}, Confidence=${confidence}, Quality=${quality}`);
        });
        
        // 6. Check current similarity threshold
        console.log('\n5. CURRENT SYSTEM CONFIGURATION:');
        console.log('From Python backend main.py:');
        console.log('  SIMILARITY_THRESHOLD = 0.85 (85% similarity required)');
        console.log('  CONFIDENCE_THRESHOLD = 0.8 (80% face detection confidence)');
        console.log('  DEFAULT_MODEL = "Facenet512"');
        console.log('  DETECTOR_BACKEND = "opencv"');
        
        // 7. Recommendations
        console.log('\n6. ANALYSIS & RECOMMENDATIONS:');
        
        if (!stu04Enrollment) {
            console.log('❌ CRITICAL: STU04 is NOT enrolled for face recognition!');
            console.log('   This means someone else was incorrectly matched as STU04.');
            console.log('   Possible causes:');
            console.log('   - Another student\'s face was matched with low confidence');
            console.log('   - System error in student ID assignment');
            console.log('   - Database inconsistency');
        } else if (stu04Enrollment.face_confidence < 0.8) {
            console.log('⚠️  WARNING: STU04\'s face enrollment has low confidence');
            console.log('   This could lead to false matches');
        }
        
        const lowQualityEnrollments = enrollments.filter(e => e.photo_quality_score < 0.7);
        if (lowQualityEnrollments.length > 0) {
            console.log(`⚠️  WARNING: ${lowQualityEnrollments.length} students have low quality face enrollments:`);
            lowQualityEnrollments.forEach(e => {
                console.log(`   ${e.student_id}: quality=${e.photo_quality_score}`);
            });
        }
        
        console.log('\n7. NEXT STEPS TO IMPROVE ACCURACY:');
        console.log('1. Verify STU04\'s actual face enrollment status');
        console.log('2. Check if the wrong person was actually present');
        console.log('3. Consider increasing SIMILARITY_THRESHOLD to 0.90+ for stricter matching');
        console.log('4. Re-enroll students with low quality scores');
        console.log('5. Add logging to track confidence scores in attendance records');
        
    } catch (error) {
        console.error('Error investigating face accuracy:', error);
    } finally {
        db.close();
    }
}

investigateFaceAccuracy().catch(console.error);