const sqlite3 = require('sqlite3').verbose();
const path = require('path');

const DB_PATH = path.join(__dirname, 'database', 'attendance.db');

async function initializeTEST0493Attendance() {
    console.log('🔧 Initializing Daily Attendance for TEST0493...\n');
    
    const db = new sqlite3.Database(DB_PATH);
    
    try {
        // Get student info
        const student = await new Promise((resolve, reject) => {
            db.get('SELECT * FROM students WHERE student_id = ?', ['TEST0493'], (err, row) => {
                if (err) reject(err);
                else resolve(row);
            });
        });
        
        if (!student) {
            console.log('❌ Student TEST0493 not found!');
            return;
        }
        
        console.log('✅ Student found:', student.name);
        
        // Check if daily attendance already exists
        const today = new Date().toISOString().split('T')[0];
        const existingRecord = await new Promise((resolve, reject) => {
            db.get('SELECT * FROM daily_attendance WHERE student_id = ? AND date = ?', ['TEST0493', today], (err, row) => {
                if (err) reject(err);
                else resolve(row);
            });
        });
        
        if (existingRecord) {
            console.log('ℹ️ Daily attendance record already exists:');
            console.log('   Status:', existingRecord.status);
            console.log('   Check-in time:', existingRecord.check_in_time);
        } else {
            // Create daily attendance record
            console.log('📝 Creating daily attendance record...');
            
            await new Promise((resolve, reject) => {
                db.run(`
                    INSERT INTO daily_attendance (
                        student_id, 
                        student_name, 
                        date, 
                        status, 
                        check_in_time, 
                        created_at, 
                        updated_at
                    ) VALUES (?, ?, ?, ?, ?, ?, ?)
                `, [
                    'TEST0493',
                    student.name,
                    today,
                    'not_yet_here',
                    null,
                    new Date().toISOString(),
                    new Date().toISOString()
                ], function(err) {
                    if (err) reject(err);
                    else resolve(this.lastID);
                });
            });
            
            console.log('✅ Daily attendance record created successfully!');
            console.log('   Student ID: TEST0493');
            console.log('   Name:', student.name);
            console.log('   Date:', today);
            console.log('   Status: not_yet_here');
            console.log('   Ready for attendance marking via face verification! 🎉');
        }
        
        // Verify the record was created
        console.log('\n🔍 Verifying daily attendance record:');
        const verifyRecord = await new Promise((resolve, reject) => {
            db.get('SELECT * FROM daily_attendance WHERE student_id = ? AND date = ?', ['TEST0493', today], (err, row) => {
                if (err) reject(err);
                else resolve(row);
            });
        });
        
        if (verifyRecord) {
            console.log('✅ Verification successful:');
            console.log('   ID:', verifyRecord.id);
            console.log('   Student:', verifyRecord.student_name);
            console.log('   Status:', verifyRecord.status);
            console.log('   Date:', verifyRecord.date);
        }
        
    } catch (error) {
        console.error('❌ Error:', error);
    } finally {
        db.close();
    }
}

initializeTEST0493Attendance();