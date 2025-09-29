const sqlite3 = require('sqlite3').verbose();
const fs = require('fs');
const FormData = require('form-data');
const fetch = (...args) => import('node-fetch').then(({default: fetch}) => fetch(...args));

const dbPath = './database/attendance.db';

async function testEnrollmentSelfVerification() {
    console.log('🧪 Testing enrollment photo self-verification...\n');
    
    const db = new sqlite3.Database(dbPath);
    
    try {
        // Get active enrollment for STU01
        const enrollment = await new Promise((resolve, reject) => {
            db.get(
                `SELECT student_id, photo_path, face_confidence 
                 FROM photo_face_enrollments 
                 WHERE student_id = 'STU01' AND is_active = 1`,
                (err, row) => {
                    if (err) reject(err);
                    else resolve(row);
                }
            );
        });
        
        if (!enrollment) {
            console.log('❌ No active enrollment found for STU01');
            return;
        }
        
        console.log('📋 Enrollment Details:');
        console.log(`   Student ID: ${enrollment.student_id}`);
        console.log(`   Photo Path: ${enrollment.photo_path}`);
        console.log(`   Face Confidence: ${enrollment.face_confidence}\n`);
        
        // Check if photo file exists
        if (!fs.existsSync(enrollment.photo_path)) {
            console.log(`❌ Photo file not found: ${enrollment.photo_path}`);
            return;
        }
        
        console.log('✅ Photo file exists');
        console.log(`📁 File size: ${fs.statSync(enrollment.photo_path).size} bytes\n`);
        
        // Test verification using the enrollment photo itself
        console.log('🔍 Testing self-verification...');
        
        const formData = new FormData();
        formData.append('student_id', enrollment.student_id);
        formData.append('photo', fs.createReadStream(enrollment.photo_path));
        
        const response = await fetch('http://localhost:8000/api/face/verify', {
            method: 'POST',
            body: formData
        });
        
        const result = await response.json();
        
        console.log('📊 Self-verification result:');
        console.log(`   Status: ${response.status}`);
        console.log(`   Response:`, JSON.stringify(result, null, 2));
        
        if (result.verified) {
            console.log('✅ Self-verification PASSED - enrollment data is good');
        } else {
            console.log('❌ Self-verification FAILED - there may be an issue with:');
            console.log('   - The enrollment photo quality');
            console.log('   - The verification threshold (currently 0.6)');
            console.log('   - The face detection/embedding process');
            
            if (result.confidence !== undefined) {
                console.log(`   - Similarity score: ${result.confidence} (threshold: 0.6)`);
                
                if (result.confidence < 0.3) {
                    console.log('   ⚠️  Very low similarity suggests a fundamental issue');
                } else if (result.confidence < 0.6) {
                    console.log('   ⚠️  Similarity below threshold - may need adjustment');
                }
            }
        }
        
    } catch (error) {
        console.error('❌ Error during self-verification test:', error.message);
    } finally {
        db.close();
    }
}

testEnrollmentSelfVerification();