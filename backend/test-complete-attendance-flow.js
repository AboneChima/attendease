const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const fs = require('fs');
const FormData = require('form-data');
const fetch = (...args) => import('node-fetch').then(({default: fetch}) => fetch(...args));

const DB_PATH = path.join(__dirname, 'database', 'attendance.db');

async function testCompleteAttendanceFlow() {
    console.log('🧪 Testing Complete Attendance Flow for TEST0493...\n');
    
    const db = new sqlite3.Database(DB_PATH);
    
    try {
        // Step 1: Check initial state
        console.log('1. Checking initial attendance state:');
        const today = new Date().toISOString().split('T')[0];
        
        const initialState = await new Promise((resolve, reject) => {
            db.get('SELECT * FROM daily_attendance WHERE student_id = ? AND date = ?', ['TEST0493', today], (err, row) => {
                if (err) reject(err);
                else resolve(row);
            });
        });
        
        if (initialState) {
            console.log('✅ Initial state found:');
            console.log('   Status:', initialState.status);
            console.log('   Check-in time:', initialState.check_in_time);
        } else {
            console.log('❌ No initial attendance record found!');
            return;
        }
        
        // Step 2: Get enrollment photo for verification
        console.log('\n2. Getting enrollment photo for verification:');
        const enrollment = await new Promise((resolve, reject) => {
            db.get('SELECT * FROM photo_face_enrollments WHERE student_id = ?', ['TEST0493'], (err, row) => {
                if (err) reject(err);
                else resolve(row);
            });
        });
        
        if (!enrollment) {
            console.log('❌ No enrollment found for TEST0493! Please enroll first.');
            return;
        }
        
        console.log('✅ Enrollment found:');
        console.log('   Photo path:', enrollment.photo_path);
        console.log('   Face confidence:', enrollment.face_confidence);
        
        // Check if photo file exists (photos are in python-backend/uploads)
        const photoPath = path.join(__dirname, '..', 'python-backend', enrollment.photo_path);
        if (!fs.existsSync(photoPath)) {
            console.log('❌ Photo file not found:', photoPath);
            return;
        }
        
        console.log('✅ Photo file exists, size:', fs.statSync(photoPath).size, 'bytes');
        
        // Step 3: Test verification API
        console.log('\n3. Testing live verification API:');
        
        const formData = new FormData();
        formData.append('photo', fs.createReadStream(photoPath));
        formData.append('student_id', 'TEST0493');
        
        const verifyResponse = await fetch('http://localhost:5000/api/students/verify-live', {
            method: 'POST',
            body: formData
        });
        
        const verifyResult = await verifyResponse.json();
        
        console.log('📊 Verification Response:');
        console.log('   Status:', verifyResponse.status);
        console.log('   Success:', verifyResult.success);
        console.log('   Verified:', verifyResult.verified);
        console.log('   Confidence:', verifyResult.confidence);
        console.log('   Attendance Marked:', verifyResult.attendanceMarked);
        console.log('   Message:', verifyResult.message);
        
        // Step 4: Check attendance state after verification
        console.log('\n4. Checking attendance state after verification:');
        
        const finalState = await new Promise((resolve, reject) => {
            db.get('SELECT * FROM daily_attendance WHERE student_id = ? AND date = ?', ['TEST0493', today], (err, row) => {
                if (err) reject(err);
                else resolve(row);
            });
        });
        
        if (finalState) {
            console.log('✅ Final state:');
            console.log('   Status:', finalState.status);
            console.log('   Check-in time:', finalState.check_in_time);
            console.log('   Updated at:', finalState.updated_at);
            
            // Check if status changed
            if (initialState.status !== finalState.status) {
                console.log('🎉 SUCCESS: Status changed from', initialState.status, 'to', finalState.status);
            } else {
                console.log('⚠️ Status unchanged:', finalState.status);
            }
        }
        
        // Step 5: Check attendance history
        console.log('\n5. Checking attendance history:');
        
        const attendanceHistory = await new Promise((resolve, reject) => {
            db.all('SELECT * FROM attendance WHERE student_id = ? AND date = ? ORDER BY timestamp DESC', ['TEST0493', today], (err, rows) => {
                if (err) reject(err);
                else resolve(rows);
            });
        });
        
        if (attendanceHistory.length > 0) {
            console.log(`✅ Found ${attendanceHistory.length} attendance history record(s):`);
            attendanceHistory.forEach((record, index) => {
                console.log(`   ${index + 1}. Time: ${record.time}, Method: ${record.verification_method}, Confidence: ${record.confidence_score}`);
            });
        } else {
            console.log('❌ No attendance history records found');
        }
        
        // Step 6: Summary
        console.log('\n📋 SUMMARY:');
        if (verifyResult.success && verifyResult.verified && verifyResult.attendanceMarked) {
            console.log('🎉 COMPLETE SUCCESS!');
            console.log('   ✅ Verification successful');
            console.log('   ✅ Attendance marked');
            console.log('   ✅ Dashboard should now show TEST0493 as present');
        } else {
            console.log('❌ Issues detected:');
            if (!verifyResult.success) console.log('   - API call failed');
            if (!verifyResult.verified) console.log('   - Face verification failed');
            if (!verifyResult.attendanceMarked) console.log('   - Attendance not marked');
        }
        
    } catch (error) {
        console.error('❌ Error during test:', error);
    } finally {
        db.close();
    }
}

testCompleteAttendanceFlow();