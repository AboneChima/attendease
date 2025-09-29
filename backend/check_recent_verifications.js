const sqlite3 = require('sqlite3').verbose();
const path = require('path');

// Database path
const dbPath = path.join(__dirname, 'database', 'attendance.db');

console.log('🔍 Checking Recent Face Verification Attempts');
console.log('=============================================');

const db = new sqlite3.Database(dbPath, (err) => {
    if (err) {
        console.error('❌ Error connecting to database:', err.message);
        return;
    }
    console.log('✅ Connected to SQLite database');
});

function checkRecentVerifications() {
    console.log('\n📋 Recent Face Verification Attempts (Last 10):');
    console.log('------------------------------------------------');
    
    db.all(`
        SELECT 
            va.*,
            s.name as student_name
        FROM verification_attempts va
        LEFT JOIN students s ON va.student_id = s.student_id
        ORDER BY va.created_at DESC
        LIMIT 10
    `, [], (err, rows) => {
        if (err) {
            console.error('❌ Error querying verification attempts:', err.message);
            checkTodaysAttendanceChanges();
            return;
        }
        
        console.log(`Found ${rows.length} recent verification attempts:`);
        rows.forEach((row, index) => {
            console.log(`\n🔍 Attempt #${index + 1}:`);
            console.log(`   📅 Time: ${row.created_at}`);
            console.log(`   👤 Student: ${row.student_id} (${row.student_name || 'Unknown'})`);
            console.log(`   ✅ Success: ${row.success}`);
            console.log(`   🎯 Method: ${row.verification_method}`);
            console.log(`   📊 Confidence: ${row.confidence_score}`);
            if (row.error_message) {
                console.log(`   ❌ Error: ${row.error_message}`);
            }
        });
        
        checkTodaysAttendanceChanges();
    });
}

function checkTodaysAttendanceChanges() {
    console.log('\n📋 Today\'s Attendance Status:');
    console.log('------------------------------');
    
    const today = new Date().toISOString().split('T')[0]; // YYYY-MM-DD format
    
    db.all(`
        SELECT 
            a.student_id,
            s.name,
            a.status,
            a.check_in_time,
            a.created_at,
            a.updated_at
        FROM attendance a
        JOIN students s ON a.student_id = s.student_id
        WHERE DATE(a.created_at) = ?
        ORDER BY a.updated_at DESC
    `, [today], (err, rows) => {
        if (err) {
            console.error('❌ Error querying today\'s attendance:', err.message);
            return;
        }
        
        console.log(`Found ${rows.length} attendance records for today (${today}):`);
        rows.forEach(row => {
            console.log(`\n📝 ${row.student_id}: ${row.name}`);
            console.log(`   📊 Status: ${row.status}`);
            console.log(`   ⏰ Check-in: ${row.check_in_time || 'Not checked in'}`);
            console.log(`   📅 Created: ${row.created_at}`);
            console.log(`   🔄 Updated: ${row.updated_at}`);
        });
        
        checkFaceEnrollmentDetails();
    });
}

function checkFaceEnrollmentDetails() {
    console.log('\n📋 Face Enrollment Details:');
    console.log('----------------------------');
    
    db.all(`
        SELECT 
            pfe.student_id,
            s.name,
            pfe.photo_path,
            pfe.is_active,
            pfe.created_at
        FROM photo_face_enrollments pfe
        JOIN students s ON pfe.student_id = s.student_id
        WHERE pfe.is_active = 1
        ORDER BY pfe.created_at DESC
    `, [], (err, rows) => {
        if (err) {
            console.error('❌ Error querying face enrollments:', err.message);
            return;
        }
        
        console.log(`Found ${rows.length} active face enrollments:`);
        rows.forEach(row => {
            console.log(`\n🎭 ${row.student_id}: ${row.name}`);
            console.log(`   📸 Photo: ${row.photo_path}`);
            console.log(`   📅 Enrolled: ${row.created_at}`);
        });
        
        provideDiagnosis();
    });
}

function provideDiagnosis() {
    console.log('\n🚨 DIAGNOSIS:');
    console.log('=============');
    console.log('');
    console.log('🔍 ISSUE CONFIRMED:');
    console.log('   User reports: "I verified my face today but Chidubem was marked present instead of me"');
    console.log('');
    console.log('📊 CURRENT STATUS:');
    console.log('   - STU06 (CHIMA JOSEPH ABONE): not_yet_here');
    console.log('   - STU04 (CHIDUBEM INNOCENT): present (marked at 07:53:29)');
    console.log('');
    console.log('🎭 FACE ENROLLMENTS:');
    console.log('   - STU06: uploads/photos\\STU06_left_profile_20250929_074352_4e04e274.jpg');
    console.log('   - STU04: uploads/photos\\STU04_20250928_203459_f8c8ae3a.jpg');
    console.log('');
    console.log('🚨 POSSIBLE CAUSES:');
    console.log('   1. Face photos were enrolled incorrectly (wrong photo for wrong student)');
    console.log('   2. Face recognition is matching the wrong person due to similarity');
    console.log('   3. Database corruption or incorrect student-face mapping');
    console.log('');
    console.log('🛠️ IMMEDIATE ACTIONS NEEDED:');
    console.log('   1. Check the actual face photos to verify they belong to the correct students');
    console.log('   2. Re-enroll faces with proper verification');
    console.log('   3. Test face recognition with known photos');
    console.log('   4. Fix the attendance record for today');
    
    db.close((err) => {
        if (err) {
            console.error('❌ Error closing database:', err.message);
        } else {
            console.log('\n✅ Database connection closed');
        }
    });
}

// Start the investigation
checkRecentVerifications();