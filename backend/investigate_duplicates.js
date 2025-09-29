const sqlite3 = require('sqlite3').verbose();
const path = require('path');

const dbPath = path.join(__dirname, 'database', 'attendance.db');
const db = new sqlite3.Database(dbPath);

console.log('🔍 Investigating duplicate enrollments...\n');

// Check all enrollments
db.all('SELECT * FROM photo_face_enrollments ORDER BY student_id, enrollment_date DESC', (err, rows) => {
    if (err) {
        console.log('❌ Database query failed:', err.message);
        db.close();
        return;
    }
    
    console.log('📊 All Face Enrollment Records:');
    console.log('='.repeat(80));
    
    const studentGroups = {};
    
    rows.forEach((row, index) => {
        if (!studentGroups[row.student_id]) {
            studentGroups[row.student_id] = [];
        }
        studentGroups[row.student_id].push(row);
        
        console.log(`${index + 1}. Student: ${row.student_id}, ID: ${row.id}, Confidence: ${row.face_confidence}, Quality: ${row.photo_quality_score}, Date: ${row.enrollment_date}, Active: ${row.is_active}`);
    });
    
    console.log('\n📋 Summary by Student:');
    console.log('='.repeat(50));
    
    Object.keys(studentGroups).forEach(studentId => {
        const enrollments = studentGroups[studentId];
        console.log(`\n👤 ${studentId}: ${enrollments.length} enrollment(s)`);
        
        if (enrollments.length > 1) {
            console.log('   ⚠️  DUPLICATE ENROLLMENTS DETECTED!');
            enrollments.forEach((enrollment, index) => {
                console.log(`   ${index + 1}. Date: ${enrollment.enrollment_date}, Quality: ${enrollment.photo_quality_score}, Active: ${enrollment.is_active}`);
            });
            
            // Check if they have the same timestamp (indicating a bug)
            const timestamps = enrollments.map(e => e.enrollment_date);
            const uniqueTimestamps = [...new Set(timestamps)];
            
            if (uniqueTimestamps.length < timestamps.length) {
                console.log('   🚨 CRITICAL: Some enrollments have identical timestamps!');
                console.log('   This suggests a bug in the enrollment process.');
            }
        }
    });
    
    console.log('\n🔧 Recommendations:');
    
    // Find students with multiple enrollments
    const duplicateStudents = Object.keys(studentGroups).filter(id => studentGroups[id].length > 1);
    
    if (duplicateStudents.length > 0) {
        console.log('1. Clean up duplicate enrollments for better accuracy');
        console.log('2. Implement enrollment deduplication logic');
        console.log('3. Consider keeping only the most recent enrollment per student');
        
        console.log('\n💡 SQL to clean up duplicates (keep most recent):');
        duplicateStudents.forEach(studentId => {
            console.log(`-- For ${studentId}:`);
            console.log(`DELETE FROM photo_face_enrollments WHERE student_id = '${studentId}' AND id NOT IN (SELECT id FROM photo_face_enrollments WHERE student_id = '${studentId}' ORDER BY enrollment_date DESC LIMIT 1);`);
        });
    } else {
        console.log('✅ No duplicate enrollments found');
    }
    
    db.close();
});