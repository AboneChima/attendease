const sqlite3 = require('sqlite3').verbose();
const fs = require('fs');
const path = require('path');
const axios = require('axios');

const DB_PATH = path.join(__dirname, 'database', 'attendance.db');
const PYTHON_BACKEND_URL = 'http://localhost:8001';

async function testVerificationThreshold() {
    console.log('🧪 [TEST-THRESHOLD] Testing verification system...');
    
    const db = new sqlite3.Database(DB_PATH);
    
    try {
        // Get all active enrollments
        const enrollments = await new Promise((resolve, reject) => {
            db.all(
                `SELECT id, student_id, face_confidence, photo_quality_score, photo_path 
                 FROM photo_face_enrollments 
                 WHERE is_active = 1 
                 ORDER BY student_id`,
                (err, rows) => {
                    if (err) reject(err);
                    else resolve(rows);
                }
            );
        });
        
        console.log('📋 [TEST-THRESHOLD] Current enrollments:');
        enrollments.forEach(enrollment => {
            console.log(`  ${enrollment.student_id}: Quality=${enrollment.photo_quality_score}, Confidence=${enrollment.face_confidence}`);
            console.log(`    Photo: ${path.basename(enrollment.photo_path)}`);
        });
        
        // Check if we can test with the enrollment photo itself
        console.log('\n🔬 [TEST-THRESHOLD] Testing self-verification (enrollment photo vs itself)...');
        
        for (const enrollment of enrollments) {
            if (!fs.existsSync(enrollment.photo_path)) {
                console.log(`❌ Photo not found for ${enrollment.student_id}: ${enrollment.photo_path}`);
                continue;
            }
            
            try {
                console.log(`\n🧪 Testing ${enrollment.student_id} with their own enrollment photo...`);
                
                // Read the enrollment photo
                const photoBuffer = fs.readFileSync(enrollment.photo_path);
                
                // Create form data
                const FormData = require('form-data');
                const formData = new FormData();
                formData.append('student_id', enrollment.student_id);
                formData.append('image', photoBuffer, {
                    filename: `test_${enrollment.student_id}.jpg`,
                    contentType: 'image/jpeg'
                });
                
                // Send verification request
                const response = await axios.post(`${PYTHON_BACKEND_URL}/api/face/verify`, formData, {
                    headers: {
                        ...formData.getHeaders(),
                    },
                    timeout: 30000
                });
                
                console.log(`  ✅ Response: ${response.status}`);
                console.log(`  📊 Result: ${JSON.stringify(response.data, null, 2)}`);
                
                if (response.data.verified) {
                    console.log(`  🎉 ${enrollment.student_id}: VERIFIED (confidence: ${response.data.confidence})`);
                } else {
                    console.log(`  ❌ ${enrollment.student_id}: NOT VERIFIED (confidence: ${response.data.confidence})`);
                    console.log(`  🔍 This suggests the threshold might be too strict or there's an issue with the enrollment`);
                }
                
            } catch (error) {
                console.log(`  ❌ Error testing ${enrollment.student_id}: ${error.message}`);
            }
        }
        
        console.log('\n💡 [TEST-THRESHOLD] Analysis:');
        console.log('  - If enrollment photos fail self-verification, the threshold is too strict');
        console.log('  - If enrollment photos pass self-verification, the live camera quality is the issue');
        console.log('  - Current threshold appears to be 0.6 based on previous logs');
        
    } catch (error) {
        console.error('❌ [TEST-THRESHOLD] Error:', error);
    } finally {
        db.close();
    }
}

testVerificationThreshold().catch(console.error);