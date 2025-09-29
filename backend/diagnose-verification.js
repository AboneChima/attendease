const sqlite3 = require('sqlite3').verbose();
const fs = require('fs');
const path = require('path');
const axios = require('axios');

const DB_PATH = path.join(__dirname, 'database', 'attendance.db');
const PYTHON_BACKEND_URL = 'http://localhost:8001';

async function diagnoseVerification() {
    console.log('🔍 [DIAGNOSIS] Starting verification diagnosis...');
    
    const db = new sqlite3.Database(DB_PATH);
    
    try {
        // Get STU01's enrollment details
        const enrollments = await new Promise((resolve, reject) => {
            db.all(
                `SELECT id, student_id, face_confidence, photo_quality_score, photo_path, created_at 
                 FROM photo_face_enrollments 
                 WHERE student_id = ? AND is_active = 1`,
                ['STU01'],
                (err, rows) => {
                    if (err) reject(err);
                    else resolve(rows);
                }
            );
        });
        
        console.log('📋 [DIAGNOSIS] STU01 Enrollment Details:');
        enrollments.forEach(enrollment => {
            console.log(`  - ID: ${enrollment.id}`);
            console.log(`  - Face Confidence: ${enrollment.face_confidence}`);
            console.log(`  - Photo Quality: ${enrollment.photo_quality_score}`);
            console.log(`  - Photo Path: ${enrollment.photo_path}`);
            console.log(`  - Created: ${enrollment.created_at}`);
            
            // Check if photo file exists
            const photoExists = fs.existsSync(enrollment.photo_path);
            console.log(`  - Photo File Exists: ${photoExists}`);
            
            if (photoExists) {
                const stats = fs.statSync(enrollment.photo_path);
                console.log(`  - Photo File Size: ${stats.size} bytes`);
            }
            console.log('');
        });
        
        // Check Python backend verification settings
        console.log('🔧 [DIAGNOSIS] Checking Python backend verification settings...');
        try {
            const response = await axios.get(`${PYTHON_BACKEND_URL}/api/face/enrollments`);
            console.log(`✅ Python backend is responding (${response.status})`);
            console.log(`📊 Total enrollments in Python backend: ${response.data.enrollments.length}`);
            
            const stu01Enrollments = response.data.enrollments.filter(e => e.student_id === 'STU01');
            console.log(`📋 STU01 enrollments in Python backend: ${stu01Enrollments.length}`);
            
            stu01Enrollments.forEach((enrollment, index) => {
                console.log(`  Enrollment ${index + 1}:`);
                console.log(`    - ID: ${enrollment.id}`);
                console.log(`    - Face Confidence: ${enrollment.face_confidence}`);
                console.log(`    - Photo Quality: ${enrollment.photo_quality_score}`);
            });
            
        } catch (error) {
            console.log(`❌ Error checking Python backend: ${error.message}`);
        }
        
        // Test verification with a simple API call
        console.log('🧪 [DIAGNOSIS] Testing verification threshold...');
        console.log('💡 Current verification appears to use 0.6 threshold');
        console.log('📊 Last verification similarity: 0.0291 (much lower than 0.6)');
        console.log('');
        console.log('🔍 [DIAGNOSIS] Possible issues:');
        console.log('  1. Different person trying to verify');
        console.log('  2. Poor lighting during verification');
        console.log('  3. Camera angle/quality issues');
        console.log('  4. Enrollment photo quality issues');
        console.log('  5. Face detection model sensitivity');
        console.log('');
        console.log('💡 [DIAGNOSIS] Recommendations:');
        console.log('  1. Ensure good lighting during verification');
        console.log('  2. Look directly at camera');
        console.log('  3. Keep face centered and at proper distance');
        console.log('  4. Consider re-enrolling if photo quality is poor');
        console.log('  5. Test with different students to isolate issue');
        
    } catch (error) {
        console.error('❌ [DIAGNOSIS] Error:', error);
    } finally {
        db.close();
    }
}

diagnoseVerification().catch(console.error);