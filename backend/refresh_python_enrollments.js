const axios = require('axios');
const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const fs = require('fs');

const PYTHON_BACKEND_URL = 'http://localhost:8000';
const DB_PATH = path.join(__dirname, 'database', 'attendance.db');

async function refreshPythonEnrollments() {
    console.log('🔄 Refreshing Python Backend Enrollments');
    console.log('=====================================\n');

    try {
        // Step 1: Clear all enrollments in Python backend
        console.log('🗑️ Step 1: Clearing all Python backend enrollments...');
        try {
            const clearResponse = await axios.delete(`${PYTHON_BACKEND_URL}/api/face/enrollments/clear`);
            console.log('✅ Cleared all enrollments');
        } catch (error) {
            console.log('⚠️ Clear enrollments failed:', error.response?.data || error.message);
        }

        // Step 2: Get current active enrollments from database
        console.log('\n📋 Step 2: Getting active enrollments from database...');
        const db = new sqlite3.Database(DB_PATH);
        
        const enrollments = await new Promise((resolve, reject) => {
            db.all(`
                SELECT student_id, photo_path, enrollment_date, is_active
                FROM photo_face_enrollments 
                WHERE is_active = 1
                ORDER BY student_id, enrollment_date DESC
            `, (err, rows) => {
                if (err) reject(err);
                else resolve(rows);
            });
        });

        console.log(`Found ${enrollments.length} active enrollments:`);
        enrollments.forEach(enrollment => {
            console.log(`   ${enrollment.student_id}: ${enrollment.photo_path}`);
        });

        // Step 3: Re-enroll each student
        console.log('\n🔄 Step 3: Re-enrolling students in Python backend...');
        for (const enrollment of enrollments) {
            const photoPath = path.join(__dirname, enrollment.photo_path);
            
            if (!fs.existsSync(photoPath)) {
                console.log(`❌ Photo not found: ${photoPath}`);
                continue;
            }

            try {
                const formData = new FormData();
                const photoBuffer = fs.readFileSync(photoPath);
                const blob = new Blob([photoBuffer], { type: 'image/jpeg' });
                formData.append('photo', blob, path.basename(photoPath));
                formData.append('student_id', enrollment.student_id);

                const enrollResponse = await axios.post(`${PYTHON_BACKEND_URL}/api/face/enroll`, formData, {
                    headers: {
                        'Content-Type': 'multipart/form-data',
                    },
                    timeout: 30000
                });

                console.log(`✅ ${enrollment.student_id}: ${enrollResponse.data.message || 'Enrolled successfully'}`);
            } catch (error) {
                console.log(`❌ ${enrollment.student_id}: ${error.response?.data?.detail || error.message}`);
            }
        }

        // Step 4: Verify enrollments
        console.log('\n🔍 Step 4: Verifying Python backend enrollments...');
        try {
            const verifyResponse = await axios.get(`${PYTHON_BACKEND_URL}/api/face/enrollments`);
            console.log(`✅ Python backend now has ${verifyResponse.data.total_count} enrollments:`);
            verifyResponse.data.enrollments.forEach(enrollment => {
                console.log(`   ${enrollment.student_id}: confidence=${enrollment.face_confidence}, quality=${enrollment.photo_quality_score}`);
            });
        } catch (error) {
            console.log('❌ Failed to verify enrollments:', error.response?.data || error.message);
        }

        db.close();
        console.log('\n🎉 Python backend enrollment refresh completed!');

    } catch (error) {
        console.error('❌ Error refreshing enrollments:', error.message);
        process.exit(1);
    }
}

refreshPythonEnrollments();