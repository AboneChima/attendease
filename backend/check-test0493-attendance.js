const sqlite3 = require('sqlite3').verbose();
const path = require('path');

const DB_PATH = path.join(__dirname, 'database', 'attendance.db');

async function checkTEST0493Attendance() {
    console.log('🔍 Checking TEST0493 Attendance Records...\n');
    
    const db = new sqlite3.Database(DB_PATH);
    
    try {
        // Check if student exists
        console.log('1. Checking if TEST0493 exists in students table:');
        const student = await new Promise((resolve, reject) => {
            db.get('SELECT * FROM students WHERE student_id = ?', ['TEST0493'], (err, row) => {
                if (err) reject(err);
                else resolve(row);
            });
        });
        
        if (student) {
            console.log('✅ Student found:', student.name);
        } else {
            console.log('❌ Student TEST0493 not found!');
            return;
        }
        
        // Check daily attendance record
        console.log('\n2. Checking daily attendance record:');
        const today = new Date().toISOString().split('T')[0];
        console.log('   Today:', today);
        
        const dailyAttendance = await new Promise((resolve, reject) => {
            db.get('SELECT * FROM daily_attendance WHERE student_id = ? AND date = ?', ['TEST0493', today], (err, row) => {
                if (err) reject(err);
                else resolve(row);
            });
        });
        
        if (dailyAttendance) {
            console.log('✅ Daily attendance record found:');
            console.log('   Status:', dailyAttendance.status);
            console.log('   Check-in time:', dailyAttendance.check_in_time);
            console.log('   Created:', dailyAttendance.created_at);
        } else {
            console.log('❌ No daily attendance record found for TEST0493 today!');
            console.log('   This is why attendance marking failed.');
            console.log('   The system requires a daily attendance record with status "not_yet_here"');
        }
        
        // Check attendance history
        console.log('\n3. Checking attendance history:');
        const attendanceHistory = await new Promise((resolve, reject) => {
            db.all('SELECT * FROM attendance WHERE student_id = ? ORDER BY timestamp DESC', ['TEST0493'], (err, rows) => {
                if (err) reject(err);
                else resolve(rows);
            });
        });
        
        if (attendanceHistory.length > 0) {
            console.log(`✅ Found ${attendanceHistory.length} attendance history records:`);
            attendanceHistory.forEach((record, index) => {
                console.log(`   ${index + 1}. Date: ${record.date}, Time: ${record.time}, Method: ${record.verification_method}, Confidence: ${record.confidence_score}`);
            });
        } else {
            console.log('❌ No attendance history records found');
        }
        
        // Check all daily attendance records for today
        console.log('\n4. Checking all daily attendance records for today:');
        const allTodayAttendance = await new Promise((resolve, reject) => {
            db.all('SELECT * FROM daily_attendance WHERE date = ?', [today], (err, rows) => {
                if (err) reject(err);
                else resolve(rows);
            });
        });
        
        console.log(`Found ${allTodayAttendance.length} daily attendance records for today:`);
        allTodayAttendance.forEach(record => {
            console.log(`   ${record.student_id}: ${record.status} (${record.student_name})`);
        });
        
    } catch (error) {
        console.error('❌ Error:', error);
    } finally {
        db.close();
    }
}

checkTEST0493Attendance();