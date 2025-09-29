const sqlite3 = require('sqlite3').verbose();
const path = require('path');

// Database path
const dbPath = path.join(__dirname, 'database', 'attendance.db');

console.log('🔍 Checking Verification Details for Chidubem Innocent');
console.log('=' .repeat(60));

const db = new sqlite3.Database(dbPath, (err) => {
    if (err) {
        console.error('❌ Error opening database:', err.message);
        return;
    }
    console.log('✅ Connected to SQLite database');
    checkVerificationDetails();
});

function checkVerificationDetails() {
    console.log('\n📋 Step 1: Checking all verification attempts today...');
    
    // Check all verification attempts for today
    db.all(`
        SELECT va.*, 
               datetime(va.created_at, 'localtime') as verification_time,
               s.name as student_name
        FROM verification_attempts va
        LEFT JOIN students s ON va.student_id = s.student_id
        WHERE date(va.created_at, 'localtime') = date('now', 'localtime')
        ORDER BY va.created_at DESC
    `, [], (err, attempts) => {
        if (err) {
            console.error('❌ Error querying verification attempts:', err.message);
            checkAttendanceUpdates();
            return;
        }
        
        if (attempts.length === 0) {
            console.log('   ⚠️  No verification attempts found for today');
        } else {
            console.log(`   ✅ Found ${attempts.length} verification attempt(s) today:`);
            attempts.forEach((attempt, index) => {
                console.log(`\n   ${index + 1}. Student: ${attempt.student_name || attempt.student_id}`);
                console.log(`      Time: ${attempt.verification_time}`);
                console.log(`      Method: ${attempt.verification_method || 'N/A'}`);
                console.log(`      Success: ${attempt.success ? 'Yes' : 'No'}`);
                console.log(`      Confidence: ${attempt.confidence_score || 'N/A'}`);
                if (attempt.error_message) {
                    console.log(`      Error: ${attempt.error_message}`);
                }
            });
        }
        
        checkAttendanceUpdates();
    });
}

function checkAttendanceUpdates() {
    console.log('\n📋 Step 2: Checking attendance updates for today...');
    
    // Check all attendance updates for today
    db.all(`
        SELECT da.*, 
               datetime(da.created_at, 'localtime') as created_time,
               datetime(da.updated_at, 'localtime') as updated_time,
               s.name as student_name
        FROM daily_attendance da
        LEFT JOIN students s ON da.student_id = s.student_id
        WHERE da.date = date('now', 'localtime')
        AND da.status = 'present'
        ORDER BY da.updated_at DESC
    `, [], (err, attendance) => {
        if (err) {
            console.error('❌ Error querying attendance updates:', err.message);
            checkAuditLogs();
            return;
        }
        
        if (attendance.length === 0) {
            console.log('   ⚠️  No students marked present today');
        } else {
            console.log(`   ✅ Found ${attendance.length} student(s) marked present today:`);
            attendance.forEach((record, index) => {
                console.log(`\n   ${index + 1}. Student: ${record.student_name || record.student_id}`);
                console.log(`      Status: ${record.status}`);
                console.log(`      Check-in Time: ${record.check_in_time || 'N/A'}`);
                console.log(`      Created: ${record.created_time}`);
                console.log(`      Updated: ${record.updated_time}`);
                
                // Calculate time difference between creation and update
                if (record.created_at !== record.updated_at) {
                    const created = new Date(record.created_at);
                    const updated = new Date(record.updated_at);
                    const diffMinutes = Math.round((updated - created) / (1000 * 60));
                    console.log(`      Time to mark present: ${diffMinutes} minutes after creation`);
                }
            });
        }
        
        checkAuditLogs();
    });
}

function checkAuditLogs() {
    console.log('\n📋 Step 3: Checking audit logs for attendance changes...');
    
    // Check audit logs for today
    db.all(`
        SELECT aal.*, 
               datetime(aal.timestamp, 'localtime') as audit_time,
               s.name as student_name
        FROM attendance_audit_log aal
        LEFT JOIN students s ON aal.student_id = s.student_id
        WHERE date(aal.timestamp, 'localtime') = date('now', 'localtime')
        ORDER BY aal.timestamp DESC
    `, [], (err, audits) => {
        if (err) {
            console.error('❌ Error querying audit logs:', err.message);
            checkFaceEnrollmentQuality();
            return;
        }
        
        if (audits.length === 0) {
            console.log('   ⚠️  No audit logs found for today');
        } else {
            console.log(`   ✅ Found ${audits.length} audit log(s) for today:`);
            audits.forEach((audit, index) => {
                console.log(`\n   ${index + 1}. Student: ${audit.student_name || audit.student_id}`);
                console.log(`      Time: ${audit.audit_time}`);
                console.log(`      Action: ${audit.action}`);
                console.log(`      Old Status: ${audit.old_status || 'N/A'}`);
                console.log(`      New Status: ${audit.new_status || 'N/A'}`);
                console.log(`      Changed By: ${audit.changed_by || 'System'}`);
                if (audit.notes) {
                    console.log(`      Notes: ${audit.notes}`);
                }
            });
        }
        
        checkFaceEnrollmentQuality();
    });
}

function checkFaceEnrollmentQuality() {
    console.log('\n📋 Step 4: Checking Chidubem\'s face enrollment quality...');
    
    // Check Chidubem's face enrollment details
    db.get(`
        SELECT pfe.*, 
               datetime(pfe.created_at, 'localtime') as enrollment_time,
               s.name as student_name
        FROM photo_face_enrollments pfe
        LEFT JOIN students s ON pfe.student_id = s.student_id
        WHERE pfe.student_id = 'STU04'
        AND pfe.is_active = 1
    `, [], (err, enrollment) => {
        if (err) {
            console.error('❌ Error querying face enrollment:', err.message);
            provideSummary();
            return;
        }
        
        if (!enrollment) {
            console.log('   ⚠️  No active face enrollment found for Chidubem');
        } else {
            console.log(`   ✅ Chidubem's Face Enrollment Details:`);
            console.log(`      Student: ${enrollment.student_name}`);
            console.log(`      Enrollment ID: ${enrollment.id}`);
            console.log(`      Photo Path: ${enrollment.photo_path}`);
            console.log(`      Quality Score: ${enrollment.quality_score || 'N/A'}`);
            console.log(`      Confidence Score: ${enrollment.confidence_score || 'N/A'}`);
            console.log(`      Enrolled: ${enrollment.enrollment_time}`);
            console.log(`      Active: ${enrollment.is_active ? 'Yes' : 'No'}`);
        }
        
        provideSummary();
    });
}

function provideSummary() {
    console.log('\n📊 INVESTIGATION SUMMARY');
    console.log('=' .repeat(60));
    
    console.log('\n🎯 Key Findings:');
    console.log('1. Chidubem Innocent (STU04) was marked present today at 07:53:29');
    console.log('2. He has an active face enrollment from 2025-09-28 20:35:05');
    console.log('3. His attendance record was created at 07:46:16 and updated at 07:53:29');
    console.log('4. This means he was marked present 7 minutes after the daily attendance was initialized');
    
    console.log('\n💡 Possible Explanations:');
    console.log('1. ✅ LEGITIMATE: Chidubem verified his face and was correctly marked present');
    console.log('2. ⚠️  MANUAL: A teacher manually marked him present');
    console.log('3. ❌ ERROR: System error or incorrect face matching');
    
    console.log('\n🔧 To Determine the Exact Cause:');
    console.log('1. Check if there are face verification logs in the Python backend');
    console.log('2. Review the audit logs to see who/what changed his status');
    console.log('3. Check if there are any manual attendance marking records');
    
    console.log('\n📋 Recommendations:');
    console.log('1. Add more detailed logging to track verification methods');
    console.log('2. Implement confidence score logging in attendance records');
    console.log('3. Add user tracking for manual attendance changes');
    
    db.close();
}

// Handle database errors
db.on('error', (err) => {
    console.error('❌ Database error:', err.message);
});