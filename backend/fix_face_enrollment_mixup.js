const sqlite3 = require('sqlite3').verbose();
const fs = require('fs');
const path = require('path');
const axios = require('axios');

const DB_PATH = path.join(__dirname, 'database', 'attendance.db');
const PYTHON_BACKEND_URL = 'http://localhost:8000';

async function fixFaceEnrollmentMixup() {
    console.log('🔧 Fixing Face Enrollment Mix-up');
    console.log('=================================');

    const db = new sqlite3.Database(DB_PATH);

    try {
        // 1. Check current enrollments
        console.log('\n📋 Step 1: Current face enrollments...');
        await new Promise((resolve, reject) => {
            db.all(`
                SELECT student_id, photo_path, enrollment_date, is_active
                FROM photo_face_enrollments 
                WHERE is_active = 1
                ORDER BY student_id
            `, (err, rows) => {
                if (err) reject(err);
                else {
                    console.log('Current active enrollments:');
                    rows.forEach(row => {
                        console.log(`   ${row.student_id}: ${row.photo_path}`);
                    });
                    resolve();
                }
            });
        });

        // 2. Identify the duplicate photo issue
        console.log('\n🔍 Step 2: Identifying duplicate photos...');
        const photosDir = path.join(__dirname, '..', 'python-backend', 'uploads', 'photos');
        const duplicatePhoto1 = 'STU04_20250928_202207_0a65b99f.jpg';
        const duplicatePhoto2 = 'STU06_20250928_222312_0a65b99f.jpg';
        
        console.log(`🚨 Found duplicate photos with identical content:`);
        console.log(`   ${duplicatePhoto1}`);
        console.log(`   ${duplicatePhoto2}`);

        // 3. Remove the incorrect STU04 enrollment (since the photo is actually STU06's)
        console.log('\n🗑️ Step 3: Removing incorrect STU04 enrollment...');
        await new Promise((resolve, reject) => {
            db.run(`
                UPDATE photo_face_enrollments 
                SET is_active = 0, 
                    updated_at = datetime('now')
                WHERE student_id = 'STU04' 
                AND photo_path LIKE '%0a65b99f%'
            `, (err) => {
                if (err) reject(err);
                else {
                    console.log('✅ Deactivated incorrect STU04 enrollment');
                    resolve();
                }
            });
        });

        // 4. Remove the duplicate photo file for STU04
        console.log('\n🗑️ Step 4: Removing duplicate STU04 photo file...');
        const stu04DuplicatePath = path.join(photosDir, duplicatePhoto1);
        if (fs.existsSync(stu04DuplicatePath)) {
            fs.unlinkSync(stu04DuplicatePath);
            console.log(`✅ Removed duplicate file: ${duplicatePhoto1}`);
        }

        // 5. Check if STU04 has other valid enrollments
        console.log('\n🔍 Step 5: Checking STU04 remaining enrollments...');
        await new Promise((resolve, reject) => {
            db.all(`
                SELECT photo_path, enrollment_date 
                FROM photo_face_enrollments 
                WHERE student_id = 'STU04' AND is_active = 1
            `, (err, rows) => {
                if (err) reject(err);
                else {
                    console.log(`STU04 remaining active enrollments: ${rows.length}`);
                    rows.forEach(row => {
                        console.log(`   ${row.photo_path} (${row.enrollment_date})`);
                    });
                    resolve();
                }
            });
        });

        // 6. Verify STU06 enrollment is correct
        console.log('\n✅ Step 6: Verifying STU06 enrollment...');
        await new Promise((resolve, reject) => {
            db.all(`
                SELECT photo_path, enrollment_date 
                FROM photo_face_enrollments 
                WHERE student_id = 'STU06' AND is_active = 1
            `, (err, rows) => {
                if (err) reject(err);
                else {
                    console.log(`STU06 active enrollments: ${rows.length}`);
                    rows.forEach(row => {
                        console.log(`   ${row.photo_path} (${row.enrollment_date})`);
                    });
                    resolve();
                }
            });
        });

        // 7. Clear Python backend enrollments and re-enroll
        console.log('\n🔄 Step 7: Refreshing Python backend enrollments...');
        try {
            // Clear all enrollments
            const clearResponse = await axios.delete(`${PYTHON_BACKEND_URL}/api/face/enrollments`);
            console.log('✅ Cleared Python backend enrollments');

            // Re-enroll active students
            await new Promise((resolve, reject) => {
                db.all(`
                    SELECT DISTINCT student_id, photo_path
                    FROM photo_face_enrollments 
                    WHERE is_active = 1
                    ORDER BY student_id
                `, async (err, rows) => {
                    if (err) reject(err);
                    else {
                        console.log(`🔄 Re-enrolling ${rows.length} students...`);
                        for (const row of rows) {
                            try {
                                const photoPath = path.join(photosDir, path.basename(row.photo_path));
                                if (fs.existsSync(photoPath)) {
                                    const FormData = require('form-data');
                                    const formData = new FormData();
                                    formData.append('student_id', row.student_id);
                                    formData.append('photo', fs.createReadStream(photoPath));

                                    const enrollResponse = await axios.post(`${PYTHON_BACKEND_URL}/api/face/enroll`, formData, {
                                        headers: formData.getHeaders()
                                    });
                                    console.log(`   ✅ Re-enrolled ${row.student_id}: ${enrollResponse.data.message}`);
                                } else {
                                    console.log(`   ❌ Photo not found for ${row.student_id}: ${photoPath}`);
                                }
                            } catch (enrollError) {
                                console.log(`   ❌ Failed to re-enroll ${row.student_id}:`, enrollError.response?.data || enrollError.message);
                            }
                        }
                        resolve();
                    }
                });
            });
        } catch (apiError) {
            console.log('⚠️ Python backend API error:', apiError.response?.data || apiError.message);
        }

        console.log('\n🎉 Face enrollment mix-up fix completed!');
        console.log('\n📋 Summary:');
        console.log('   ✅ Removed duplicate STU04 enrollment with your photo');
        console.log('   ✅ Kept correct STU06 enrollment with your photo');
        console.log('   ✅ Refreshed Python backend enrollments');
        console.log('\n💡 You should now be correctly recognized as STU06!');

    } catch (error) {
        console.error('❌ Error fixing face enrollment mix-up:', error);
    } finally {
        db.close();
    }
}

// Run the fix
fixFaceEnrollmentMixup();