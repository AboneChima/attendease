const sqlite3 = require('sqlite3').verbose();
const path = require('path');

const DB_PATH = path.join(__dirname, 'database', 'attendance.db');

async function debugAttendanceMarking() {
    console.log('🔍 Debugging attendance marking logic for TEST0493...');
    
    const db = new sqlite3.Database(DB_PATH);
    
    return new Promise((resolve, reject) => {
        const student_id = 'TEST0493';
        const today = new Date().toISOString().split('T')[0];
        
        console.log('📅 Checking for date:', today);
        console.log('👤 Student ID:', student_id);
        
        // Check existing attendance record
        db.get(
            'SELECT * FROM daily_attendance WHERE student_id = ? AND date = ?',
            [student_id, today],
            (err, existingAttendance) => {
                if (err) {
                    console.error('❌ Database error:', err);
                    db.close();
                    reject(err);
                    return;
                }
                
                console.log('\n📋 Existing attendance record:');
                console.log(JSON.stringify(existingAttendance, null, 2));
                
                if (existingAttendance) {
                    console.log('\n🔍 Attendance record analysis:');
                    console.log('   - Status:', existingAttendance.status);
                    console.log('   - Status type:', typeof existingAttendance.status);
                    console.log('   - Is "not_yet_here"?', existingAttendance.status === 'not_yet_here');
                    console.log('   - Check-in time:', existingAttendance.check_in_time);
                    console.log('   - Created at:', existingAttendance.created_at);
                    console.log('   - Updated at:', existingAttendance.updated_at);
                    
                    // Test the exact condition from the code
                    const shouldMarkAttendance = existingAttendance && existingAttendance.status === 'not_yet_here';
                    console.log('\n✅ Should mark attendance?', shouldMarkAttendance);
                    
                    if (shouldMarkAttendance) {
                        console.log('\n🔄 Simulating attendance marking...');
                        const currentTime = new Date().toTimeString().split(' ')[0];
                        console.log('   - Current time:', currentTime);
                        console.log('   - Would update status to: present');
                        console.log('   - Would set check_in_time to:', currentTime);
                    } else {
                        console.log('\n❌ Attendance would NOT be marked because:');
                        if (!existingAttendance) {
                            console.log('   - No existing attendance record found');
                        } else if (existingAttendance.status !== 'not_yet_here') {
                            console.log('   - Status is not "not_yet_here", it is:', existingAttendance.status);
                        }
                    }
                } else {
                    console.log('\n❌ No existing attendance record found for today');
                }
                
                // Check attendance history
                db.all(
                    'SELECT * FROM attendance WHERE student_id = ? AND date = ?',
                    [student_id, today],
                    (err, attendanceHistory) => {
                        if (err) {
                            console.error('❌ Error checking attendance history:', err);
                        } else {
                            console.log('\n📚 Attendance history for today:');
                            if (attendanceHistory.length === 0) {
                                console.log('   - No attendance history records found');
                            } else {
                                attendanceHistory.forEach((record, index) => {
                                    console.log(`   Record ${index + 1}:`, JSON.stringify(record, null, 4));
                                });
                            }
                        }
                        
                        db.close();
                        resolve();
                    }
                );
            }
        );
    });
}

debugAttendanceMarking().catch(console.error);