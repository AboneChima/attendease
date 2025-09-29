const sqlite3 = require('sqlite3').verbose();
const fs = require('fs');
const path = require('path');

const DB_PATH = path.join(__dirname, 'database', 'attendance.db');
const PYTHON_UPLOADS_DIR = path.join(__dirname, '..', 'python-backend', 'uploads', 'photos');

async function fixPhotoPaths() {
    console.log('🔧 [FIX-PATHS] Starting photo path correction...');
    
    const db = new sqlite3.Database(DB_PATH);
    
    try {
        // Get all active enrollments
        const enrollments = await new Promise((resolve, reject) => {
            db.all(
                `SELECT id, student_id, photo_path 
                 FROM photo_face_enrollments 
                 WHERE is_active = 1`,
                (err, rows) => {
                    if (err) reject(err);
                    else resolve(rows);
                }
            );
        });
        
        console.log(`📋 [FIX-PATHS] Found ${enrollments.length} active enrollments`);
        
        for (const enrollment of enrollments) {
            const currentPath = enrollment.photo_path;
            const filename = path.basename(currentPath);
            const correctPath = path.join(PYTHON_UPLOADS_DIR, filename);
            
            console.log(`\n🔍 [FIX-PATHS] Processing enrollment ID ${enrollment.id} (${enrollment.student_id}):`);
            console.log(`  Current path: ${currentPath}`);
            console.log(`  Correct path: ${correctPath}`);
            
            // Check if file exists at correct path
            const fileExists = fs.existsSync(correctPath);
            console.log(`  File exists at correct path: ${fileExists}`);
            
            if (fileExists && currentPath !== correctPath) {
                // Update the database with correct path
                await new Promise((resolve, reject) => {
                    db.run(
                        `UPDATE photo_face_enrollments 
                         SET photo_path = ? 
                         WHERE id = ?`,
                        [correctPath, enrollment.id],
                        function(err) {
                            if (err) reject(err);
                            else {
                                console.log(`  ✅ Updated path for enrollment ID ${enrollment.id}`);
                                resolve();
                            }
                        }
                    );
                });
            } else if (!fileExists) {
                console.log(`  ❌ Photo file not found at expected location`);
            } else {
                console.log(`  ✅ Path already correct`);
            }
        }
        
        // Verify the fixes
        console.log('\n🔍 [FIX-PATHS] Verification after fixes:');
        const updatedEnrollments = await new Promise((resolve, reject) => {
            db.all(
                `SELECT id, student_id, photo_path 
                 FROM photo_face_enrollments 
                 WHERE is_active = 1`,
                (err, rows) => {
                    if (err) reject(err);
                    else resolve(rows);
                }
            );
        });
        
        updatedEnrollments.forEach(enrollment => {
            const fileExists = fs.existsSync(enrollment.photo_path);
            console.log(`  ${enrollment.student_id} (ID: ${enrollment.id}): ${fileExists ? '✅' : '❌'} ${enrollment.photo_path}`);
        });
        
        console.log('\n✅ [FIX-PATHS] Photo path correction completed!');
        
    } catch (error) {
        console.error('❌ [FIX-PATHS] Error:', error);
    } finally {
        db.close();
    }
}

fixPhotoPaths().catch(console.error);