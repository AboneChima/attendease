const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const fs = require('fs');

// Path to the shared database
const DB_PATH = path.join(__dirname, 'database', 'attendance.db');

async function cleanupDuplicatesDirectly() {
    console.log('🧹 Direct Database Cleanup of Duplicate Enrollments');
    console.log('==================================================');

    if (!fs.existsSync(DB_PATH)) {
        console.error(`❌ Database not found at: ${DB_PATH}`);
        return;
    }

    const db = new sqlite3.Database(DB_PATH);

    try {
        // 1. Get current enrollments
        console.log('\n📋 Current enrollments:');
        const enrollments = await new Promise((resolve, reject) => {
            db.all(`
                SELECT id, student_id, photo_quality_score, face_confidence, enrollment_date, photo_path
                FROM photo_face_enrollments 
                WHERE is_active = 1
                ORDER BY student_id, photo_quality_score DESC
            `, (err, rows) => {
                if (err) reject(err);
                else resolve(rows);
            });
        });

        console.log(`Found ${enrollments.length} active enrollments:`);
        enrollments.forEach((enrollment, index) => {
            console.log(`   ${index + 1}. ${enrollment.student_id} - Quality: ${enrollment.photo_quality_score}, ID: ${enrollment.id}, Date: ${enrollment.enrollment_date}`);
        });

        // 2. Group by student_id and identify duplicates
        const groupedEnrollments = {};
        enrollments.forEach(enrollment => {
            if (!groupedEnrollments[enrollment.student_id]) {
                groupedEnrollments[enrollment.student_id] = [];
            }
            groupedEnrollments[enrollment.student_id].push(enrollment);
        });

        // 3. Process duplicates
        for (const [studentId, studentEnrollments] of Object.entries(groupedEnrollments)) {
            if (studentEnrollments.length > 1) {
                console.log(`\n🔍 Processing ${studentEnrollments.length} enrollments for ${studentId}:`);
                
                // Sort by photo quality (highest first)
                studentEnrollments.sort((a, b) => b.photo_quality_score - a.photo_quality_score);
                
                const bestEnrollment = studentEnrollments[0];
                const duplicatesToRemove = studentEnrollments.slice(1);

                console.log(`   ✅ Keeping: ID ${bestEnrollment.id} (Quality: ${bestEnrollment.photo_quality_score})`);
                console.log(`   🗑️ Removing ${duplicatesToRemove.length} duplicate(s):`);

                for (const duplicate of duplicatesToRemove) {
                    console.log(`      - ID ${duplicate.id} (Quality: ${duplicate.photo_quality_score})`);
                    
                    // Delete the duplicate enrollment
                    await new Promise((resolve, reject) => {
                        db.run(`
                            DELETE FROM photo_face_enrollments 
                            WHERE id = ?
                        `, [duplicate.id], function(err) {
                            if (err) reject(err);
                            else {
                                console.log(`      ✅ Deleted enrollment ID ${duplicate.id}`);
                                resolve();
                            }
                        });
                    });

                    // Delete the photo file if it exists
                    if (duplicate.photo_path && fs.existsSync(duplicate.photo_path)) {
                        try {
                            fs.unlinkSync(duplicate.photo_path);
                            console.log(`      ✅ Deleted photo file: ${path.basename(duplicate.photo_path)}`);
                        } catch (fileError) {
                            console.log(`      ⚠️ Could not delete photo file: ${fileError.message}`);
                        }
                    }
                }
            } else {
                console.log(`✅ ${studentId}: Single enrollment (no duplicates)`);
            }
        }

        // 4. Verify cleanup
        console.log('\n🔍 Verifying cleanup...');
        const finalEnrollments = await new Promise((resolve, reject) => {
            db.all(`
                SELECT student_id, COUNT(*) as count, 
                       MAX(photo_quality_score) as best_quality
                FROM photo_face_enrollments 
                WHERE is_active = 1
                GROUP BY student_id 
                ORDER BY student_id
            `, (err, rows) => {
                if (err) reject(err);
                else resolve(rows);
            });
        });

        console.log('\n📊 Final enrollment status:');
        finalEnrollments.forEach(enrollment => {
            const status = enrollment.count === 1 ? '✅' : '❌';
            console.log(`   ${status} ${enrollment.student_id}: ${enrollment.count} enrollment(s) (Quality: ${enrollment.best_quality})`);
        });

        // Check for remaining duplicates
        const remainingDuplicates = finalEnrollments.filter(e => e.count > 1);
        if (remainingDuplicates.length === 0) {
            console.log('\n🎉 SUCCESS: All duplicate enrollments have been removed!');
            console.log('\n📋 Summary:');
            console.log('   ✅ Each student now has exactly one enrollment');
            console.log('   ✅ Kept the highest quality enrollment for each student');
            console.log('   ✅ Removed duplicate photo files');
            console.log('\n🚀 Ready for testing verification and attendance marking!');
        } else {
            console.log('\n⚠️ WARNING: Some duplicates still remain:');
            remainingDuplicates.forEach(dup => {
                console.log(`   ${dup.student_id}: ${dup.count} enrollments`);
            });
        }

    } catch (error) {
        console.error('❌ Error during cleanup:', error);
    } finally {
        db.close();
    }
}

cleanupDuplicatesDirectly();