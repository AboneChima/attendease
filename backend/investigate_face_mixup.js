const sqlite3 = require('sqlite3').verbose();
const path = require('path');

// Database path
const dbPath = path.join(__dirname, 'database', 'attendance.db');

console.log('🔍 Investigating Face Recognition Mix-up');
console.log('=====================================');

const db = new sqlite3.Database(dbPath, (err) => {
    if (err) {
        console.error('❌ Error connecting to database:', err.message);
        return;
    }
    console.log('✅ Connected to SQLite database');
});

// Function to investigate the face recognition issue
function investigateFaceMixup() {
    console.log('\n📋 1. Checking all student enrollments and their face data:');
    console.log('--------------------------------------------------------');
    
    db.all(`
        SELECT 
            s.student_id,
            s.name,
            s.email,
            pfe.id as face_enrollment_id,
            pfe.photo_path,
            pfe.is_active,
            pfe.created_at as enrollment_date
        FROM Students s
        LEFT JOIN photo_face_enrollments pfe ON s.student_id = pfe.student_id
        ORDER BY s.student_id, pfe.created_at DESC
    `, [], (err, rows) => {
        if (err) {
            console.error('❌ Error querying students and face enrollments:', err.message);
            return;
        }
        
        console.log(`Found ${rows.length} student-face enrollment records:`);
        rows.forEach(row => {
            console.log(`\n👤 ${row.student_id}: ${row.name}`);
            console.log(`   📧 Email: ${row.email}`);
            if (row.face_enrollment_id) {
                console.log(`   🎭 Face ID: ${row.face_enrollment_id}`);
                console.log(`   📸 Photo: ${row.photo_path}`);
                console.log(`   ✅ Active: ${row.is_active}`);
                console.log(`   📅 Enrolled: ${row.enrollment_date}`);
            } else {
                console.log(`   ❌ No face enrollment found`);
            }
        });
        
        checkTodaysAttendance();
    });
}

function checkTodaysAttendance() {
    console.log('\n📋 2. Checking today\'s attendance records:');
    console.log('------------------------------------------');
    
    const today = new Date().toISOString().split('T')[0]; // YYYY-MM-DD format
    
    db.all(`
        SELECT 
            a.student_id,
            s.name,
            a.status,
            a.check_in_time,
            a.created_at,
            a.updated_at
        FROM Attendance a
        JOIN Students s ON a.student_id = s.student_id
        WHERE DATE(a.created_at) = ?
        ORDER BY a.created_at DESC
    `, [today], (err, rows) => {
        if (err) {
            console.error('❌ Error querying today\'s attendance:', err.message);
            return;
        }
        
        console.log(`Found ${rows.length} attendance records for today (${today}):`);
        rows.forEach(row => {
            console.log(`\n📝 ${row.student_id}: ${row.name}`);
            console.log(`   📊 Status: ${row.status}`);
            console.log(`   ⏰ Check-in: ${row.check_in_time}`);
            console.log(`   📅 Created: ${row.created_at}`);
            console.log(`   🔄 Updated: ${row.updated_at}`);
        });
        
        checkRecentVerifications();
    });
}

function checkRecentVerifications() {
    console.log('\n📋 3. Checking recent face verification attempts:');
    console.log('------------------------------------------------');
    
    // Check if verification_attempts table exists and get recent attempts
    db.all(`
        SELECT name FROM sqlite_master WHERE type='table' AND name='verification_attempts'
    `, [], (err, tables) => {
        if (err || tables.length === 0) {
            console.log('ℹ️ No verification_attempts table found');
            checkSTU06Specifically();
            return;
        }
        
        db.all(`
            SELECT 
                va.*,
                s.name as student_name
            FROM verification_attempts va
            LEFT JOIN Students s ON va.student_id = s.student_id
            ORDER BY va.created_at DESC
            LIMIT 10
        `, [], (err, rows) => {
            if (err) {
                console.error('❌ Error querying verification attempts:', err.message);
                checkSTU06Specifically();
                return;
            }
            
            console.log(`Found ${rows.length} recent verification attempts:`);
            rows.forEach(row => {
                console.log(`\n🔍 Attempt ID: ${row.id}`);
                console.log(`   👤 Student: ${row.student_id} (${row.student_name || 'Unknown'})`);
                console.log(`   ✅ Success: ${row.success}`);
                console.log(`   🎯 Method: ${row.verification_method}`);
                console.log(`   📊 Confidence: ${row.confidence_score}`);
                console.log(`   📅 Time: ${row.created_at}`);
                if (row.error_message) {
                    console.log(`   ❌ Error: ${row.error_message}`);
                }
            });
            
            checkSTU06Specifically();
        });
    });
}

function checkSTU06Specifically() {
    console.log('\n📋 4. Investigating STU06 specifically:');
    console.log('--------------------------------------');
    
    db.get(`
        SELECT 
            s.*,
            pfe.id as face_enrollment_id,
            pfe.photo_path,
            pfe.is_active,
            pfe.created_at as face_enrollment_date
        FROM Students s
        LEFT JOIN photo_face_enrollments pfe ON s.student_id = pfe.student_id AND pfe.is_active = 1
        WHERE s.student_id = 'STU06'
    `, [], (err, row) => {
        if (err) {
            console.error('❌ Error querying STU06:', err.message);
            return;
        }
        
        if (!row) {
            console.log('❌ STU06 not found in database');
        } else {
            console.log('📋 STU06 Details:');
            console.log(`   👤 Name: ${row.name}`);
            console.log(`   📧 Email: ${row.email}`);
            console.log(`   📅 Created: ${row.created_at}`);
            
            if (row.face_enrollment_id) {
                console.log(`   🎭 Face Enrollment ID: ${row.face_enrollment_id}`);
                console.log(`   📸 Photo Path: ${row.photo_path}`);
                console.log(`   📅 Face Enrolled: ${row.face_enrollment_date}`);
            } else {
                console.log('   ❌ No active face enrollment found for STU06');
            }
        }
        
        checkChidubemDetails();
    });
}

function checkChidubemDetails() {
    console.log('\n📋 5. Checking Chidubem\'s details (STU04):');
    console.log('-------------------------------------------');
    
    db.get(`
        SELECT 
            s.*,
            pfe.id as face_enrollment_id,
            pfe.photo_path,
            pfe.is_active,
            pfe.created_at as face_enrollment_date
        FROM Students s
        LEFT JOIN photo_face_enrollments pfe ON s.student_id = pfe.student_id AND pfe.is_active = 1
        WHERE s.student_id = 'STU04'
    `, [], (err, row) => {
        if (err) {
            console.error('❌ Error querying STU04 (Chidubem):', err.message);
            return;
        }
        
        if (!row) {
            console.log('❌ STU04 (Chidubem) not found in database');
        } else {
            console.log('📋 STU04 (Chidubem) Details:');
            console.log(`   👤 Name: ${row.name}`);
            console.log(`   📧 Email: ${row.email}`);
            console.log(`   📅 Created: ${row.created_at}`);
            
            if (row.face_enrollment_id) {
                console.log(`   🎭 Face Enrollment ID: ${row.face_enrollment_id}`);
                console.log(`   📸 Photo Path: ${row.photo_path}`);
                console.log(`   📅 Face Enrolled: ${row.face_enrollment_date}`);
            } else {
                console.log('   ❌ No active face enrollment found for STU04');
            }
        }
        
        provideSummaryAndRecommendations();
    });
}

function provideSummaryAndRecommendations() {
    console.log('\n🔍 SUMMARY AND ANALYSIS:');
    console.log('========================');
    console.log('');
    console.log('🚨 ISSUE IDENTIFIED:');
    console.log('   The user reports that their face verification is marking');
    console.log('   Chidubem (STU04) as present instead of themselves.');
    console.log('');
    console.log('🔍 POSSIBLE CAUSES:');
    console.log('   1. Face enrollment mix-up - wrong photo enrolled for wrong student');
    console.log('   2. Face recognition threshold too low causing false matches');
    console.log('   3. Database corruption or incorrect student-face mapping');
    console.log('   4. Multiple face enrollments causing confusion');
    console.log('');
    console.log('🛠️ RECOMMENDED ACTIONS:');
    console.log('   1. Check if STU06 has the correct face photo enrolled');
    console.log('   2. Verify face recognition confidence scores');
    console.log('   3. Re-enroll faces with proper verification');
    console.log('   4. Check for duplicate or incorrect face enrollments');
    console.log('');
    console.log('⚠️ IMMEDIATE ACTION NEEDED:');
    console.log('   This is a critical security issue that needs immediate fixing!');
    
    db.close((err) => {
        if (err) {
            console.error('❌ Error closing database:', err.message);
        } else {
            console.log('\n✅ Database connection closed');
        }
    });
}

// Start the investigation
investigateFaceMixup();