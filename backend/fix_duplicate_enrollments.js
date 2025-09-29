const sqlite3 = require('sqlite3').verbose();
const path = require('path');

const DB_PATH = path.join(__dirname, 'database', 'attendance.db');

async function fixDuplicateEnrollments() {
    console.log('=== FIXING DUPLICATE FACE ENROLLMENTS ===\n');
    
    const db = new sqlite3.Database(DB_PATH);
    
    try {
        // 1. Identify all duplicate enrollments
        console.log('1. Identifying duplicate enrollments...');
        const duplicates = await new Promise((resolve, reject) => {
            db.all(`
                SELECT student_id, COUNT(*) as count, 
                       GROUP_CONCAT(id) as enrollment_ids,
                       GROUP_CONCAT(photo_quality_score) as quality_scores
                FROM photo_face_enrollments 
                GROUP BY student_id 
                HAVING COUNT(*) > 1
                ORDER BY student_id
            `, (err, rows) => {
                if (err) reject(err);
                else resolve(rows);
            });
        });
        
        console.log(`Found ${duplicates.length} students with duplicate enrollments:`);
        duplicates.forEach(dup => {
            console.log(`  ${dup.student_id}: ${dup.count} enrollments (IDs: ${dup.enrollment_ids})`);
            console.log(`    Quality scores: ${dup.quality_scores}`);
        });
        
        // 2. For each student with duplicates, keep only the best quality enrollment
        console.log('\\n2. Removing duplicate enrollments (keeping best quality)...');
        
        for (const duplicate of duplicates) {
            const studentId = duplicate.student_id;
            
            // Get all enrollments for this student with full details
            const enrollments = await new Promise((resolve, reject) => {
                db.all(`
                    SELECT id, student_id, photo_quality_score, face_confidence, enrollment_date
                    FROM photo_face_enrollments 
                    WHERE student_id = ?
                    ORDER BY photo_quality_score DESC, face_confidence DESC, enrollment_date DESC
                `, [studentId], (err, rows) => {
                    if (err) reject(err);
                    else resolve(rows);
                });
            });
            
            if (enrollments.length > 1) {
                const bestEnrollment = enrollments[0];
                const toDelete = enrollments.slice(1);
                
                console.log(`\\n  ${studentId}:`);
                console.log(`    ✅ Keeping: ID ${bestEnrollment.id} (quality: ${bestEnrollment.photo_quality_score})`);
                console.log(`    ❌ Removing: ${toDelete.map(e => `ID ${e.id} (quality: ${e.photo_quality_score})`).join(', ')}`);
                
                // Delete the inferior enrollments
                for (const enrollment of toDelete) {
                    await new Promise((resolve, reject) => {
                        db.run(`
                            DELETE FROM photo_face_enrollments WHERE id = ?
                        `, [enrollment.id], (err) => {
                            if (err) reject(err);
                            else resolve();
                        });
                    });
                }
            }
        }
        
        // 3. Verify the cleanup
        console.log('\\n3. Verifying cleanup...');
        const remainingEnrollments = await new Promise((resolve, reject) => {
            db.all(`
                SELECT student_id, COUNT(*) as count
                FROM photo_face_enrollments 
                GROUP BY student_id 
                ORDER BY student_id
            `, (err, rows) => {
                if (err) reject(err);
                else resolve(rows);
            });
        });
        
        console.log('Remaining enrollments after cleanup:');
        remainingEnrollments.forEach(enrollment => {
            const status = enrollment.count === 1 ? '✅' : '❌';
            console.log(`  ${status} ${enrollment.student_id}: ${enrollment.count} enrollment(s)`);
        });
        
        // 4. Check if any duplicates remain
        const remainingDuplicates = remainingEnrollments.filter(e => e.count > 1);
        if (remainingDuplicates.length === 0) {
            console.log('\\n✅ SUCCESS: All duplicate enrollments have been removed!');
        } else {
            console.log('\\n❌ WARNING: Some duplicates still remain:');
            remainingDuplicates.forEach(dup => {
                console.log(`  ${dup.student_id}: ${dup.count} enrollments`);
            });
        }
        
        // 5. Recommendations for next steps
        console.log('\\n4. NEXT STEPS TO IMPROVE ACCURACY:');
        console.log('1. ✅ Duplicate enrollments cleaned up');
        console.log('2. 🔧 Increase similarity threshold from 0.85 to 0.90+');
        console.log('3. 🔧 Add confidence score logging to attendance records');
        console.log('4. 🔧 Test the system again with the cleaned database');
        console.log('5. 🔧 Consider re-enrolling students if accuracy issues persist');
        
        console.log('\\n📋 SUMMARY:');
        console.log(`- Processed ${duplicates.length} students with duplicates`);
        console.log(`- Database now has clean, unique enrollments per student`);
        console.log('- This should significantly improve face matching accuracy');
        console.log('- STU04 attendance marking should now be more reliable');
        
    } catch (error) {
        console.error('Error fixing duplicate enrollments:', error);
    } finally {
        db.close();
    }
}

fixDuplicateEnrollments().catch(console.error);