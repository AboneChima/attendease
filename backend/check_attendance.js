const sqlite3 = require('sqlite3').verbose();

const db = new sqlite3.Database('./database/attendance.db');

console.log('=== Checking Attendance Data ===\n');

// Check today's attendance
console.log('1. Today\'s Attendance:');
db.all(`SELECT student_id, student_name, status, check_in_time, updated_at 
        FROM daily_attendance 
        WHERE date = date('now', 'localtime') 
        ORDER BY updated_at DESC`, (err, rows) => {
    if (err) {
        console.error('Error fetching today\'s attendance:', err);
    } else {
        if (rows.length === 0) {
            console.log('No attendance records found for today');
        } else {
            rows.forEach(row => {
                console.log(`- ${row.student_name} (${row.student_id}): ${row.status} ${row.check_in_time ? 'at ' + row.check_in_time : ''}`);
            });
        }
    }
    
    // Check recent attendance history
    console.log('\n2. Recent Attendance History:');
    db.all(`SELECT student_id, student_name, status, check_in_time, date, updated_at 
            FROM daily_attendance 
            ORDER BY updated_at DESC 
            LIMIT 10`, (err2, rows2) => {
        if (err2) {
            console.error('Error fetching attendance history:', err2);
        } else {
            rows2.forEach(row => {
                console.log(`- ${row.date}: ${row.student_name} (${row.student_id}) - ${row.status} ${row.check_in_time ? 'at ' + row.check_in_time : ''}`);
            });
        }
        
        // Check attendance sessions
        console.log('\n3. Recent Attendance Sessions:');
        db.all(`SELECT * FROM attendance_sessions ORDER BY created_at DESC LIMIT 3`, (err3, sessions) => {
            if (err3) {
                console.error('Error fetching sessions:', err3);
            } else {
                sessions.forEach(session => {
                    console.log(`- Session ${session.date}: ${session.total_students} students, ${session.present_count} present, ${session.absent_count} absent`);
                });
            }
            
            db.close();
        });
    });
});