const sqlite3 = require('sqlite3').verbose();
const fs = require('fs');
const path = require('path');

const dbPath = './database/attendance.db';

async function completeStudentCleanup(studentId) {
    console.log(`🧹 Starting complete cleanup for student: ${studentId}\n`);
    
    const db = new sqlite3.Database(dbPath);
    
    try {
        // Get all photo paths before deletion
        const photoPaths = await new Promise((resolve, reject) => {
            db.all(
                `SELECT photo_path FROM photo_face_enrollments WHERE student_id = ?`,
                [studentId],
                (err, rows) => {
                    if (err) reject(err);
                    else resolve(rows.map(row => row.photo_path));
                }
            );
        });
        
        console.log(`📁 Found ${photoPaths.length} photo files to clean up`);
        
        // Delete from all tables
        const tables = [
            'photo_face_enrollments',
            'face_samples', 
            'daily_attendance',
            'students'
        ];
        
        for (const table of tables) {
            const result = await new Promise((resolve, reject) => {
                db.run(
                    `DELETE FROM ${table} WHERE student_id = ?`,
                    [studentId],
                    function(err) {
                        if (err) reject(err);
                        else resolve(this.changes);
                    }
                );
            });
            console.log(`✅ Deleted ${result} records from ${table}`);
        }
        
        // Clean up photo files
        let filesDeleted = 0;
        for (const photoPath of photoPaths) {
            if (fs.existsSync(photoPath)) {
                try {
                    fs.unlinkSync(photoPath);
                    filesDeleted++;
                    console.log(`🗑️  Deleted photo: ${path.basename(photoPath)}`);
                } catch (error) {
                    console.log(`⚠️  Could not delete ${photoPath}: ${error.message}`);
                }
            }
        }
        
        console.log(`\n✅ Cleanup complete for ${studentId}:`);
        console.log(`   - Removed from all database tables`);
        console.log(`   - Deleted ${filesDeleted} photo files`);
        
    } catch (error) {
        console.error('❌ Error during cleanup:', error.message);
    } finally {
        db.close();
    }
}

async function createFreshStudent() {
    console.log('\n🆕 Creating fresh test student...\n');
    
    const db = new sqlite3.Database(dbPath);
    
    try {
        // Create new student with unique ID
        const newStudentId = 'TEST' + Date.now().toString().slice(-4);
        const studentData = {
            student_id: newStudentId,
            first_name: 'Test',
            last_name: 'Student',
            email: `${newStudentId.toLowerCase()}@test.com`,
            phone: '1234567890',
            course: 'Computer Science',
            year_of_study: 2,
            enrollment_date: new Date().toISOString().split('T')[0]
        };
        
        await new Promise((resolve, reject) => {
            db.run(
                `INSERT INTO students (student_id, first_name, last_name, email, phone, course, year_of_study, enrollment_date)
                 VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
                [
                    studentData.student_id,
                    studentData.first_name,
                    studentData.last_name,
                    studentData.email,
                    studentData.phone,
                    studentData.course,
                    studentData.year_of_study,
                    studentData.enrollment_date
                ],
                function(err) {
                    if (err) reject(err);
                    else resolve(this.lastID);
                }
            );
        });
        
        console.log(`✅ Created new student: ${newStudentId}`);
        console.log(`📋 Student Details:`);
        console.log(`   ID: ${studentData.student_id}`);
        console.log(`   Name: ${studentData.first_name} ${studentData.last_name}`);
        console.log(`   Email: ${studentData.email}`);
        console.log(`   Course: ${studentData.course}`);
        
        console.log(`\n🎯 Next steps:`);
        console.log(`1. Go to the enrollment page in your browser`);
        console.log(`2. Use Student ID: ${newStudentId}`);
        console.log(`3. Complete the face enrollment process`);
        console.log(`4. Test verification with the new student`);
        
        return newStudentId;
        
    } catch (error) {
        console.error('❌ Error creating student:', error.message);
    } finally {
        db.close();
    }
}

// Run the cleanup and creation
async function main() {
    await completeStudentCleanup('STU01');
    await createFreshStudent();
}

main();