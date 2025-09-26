const sqlite3 = require('sqlite3').verbose();
const path = require('path');

const dbPath = path.join(__dirname, 'database', 'attendance.db');

console.log('Checking daily attendance initialization timing...\n');

const db = new sqlite3.Database(dbPath, (err) => {
    if (err) {
        console.error('Error opening database:', err.message);
        return;
    }
    console.log('Connected to the SQLite database.\n');
});

const today = new Date().toISOString().split('T')[0];

// Check attendance sessions
db.all("SELECT * FROM attendance_sessions ORDER BY session_date DESC LIMIT 5", (err, sessions) => {
    if (err) {
        console.error('Error fetching attendance sessions:', err);
        return;
    }
    
    console.log('=== RECENT ATTENDANCE SESSIONS ===');
    sessions.forEach(session => {
        console.log(`Date: ${session.session_date}, Reset Time: ${session.reset_time}, Total Students: ${session.total_students}`);
    });
    console.log('\n');
    
    // Check today's daily attendance creation times
    console.log(`=== TODAY'S DAILY ATTENDANCE CREATION TIMES (${today}) ===`);
    db.all(`
        SELECT student_id, student_name, created_at, updated_at
        FROM daily_attendance 
        WHERE date = ?
        ORDER BY created_at ASC
    `, [today], (err, dailyRecords) => {
        if (err) {
            console.error('Error fetching daily attendance records:', err);
            return;
        }
        
        console.log(`Total records: ${dailyRecords.length}`);
        dailyRecords.forEach(record => {
            console.log(`${record.student_id} (${record.student_name}) - Created: ${record.created_at}, Updated: ${record.updated_at}`);
        });
        console.log('\n');
        
        // Check if any students in daily_attendance don't exist in students table
        console.log('=== ORPHANED DAILY ATTENDANCE RECORDS ===');
        db.all(`
            SELECT da.student_id, da.student_name, da.created_at
            FROM daily_attendance da
            LEFT JOIN students s ON da.student_id = s.student_id
            WHERE da.date = ? AND s.student_id IS NULL
            ORDER BY da.created_at ASC
        `, [today], (err, orphaned) => {
            if (err) {
                console.error('Error fetching orphaned records:', err);
                return;
            }
            
            console.log(`Orphaned records for today: ${orphaned.length}`);
            orphaned.forEach(record => {
                console.log(`${record.student_id} (${record.student_name}) - Created: ${record.created_at} [STUDENT DELETED]`);
            });
            
            db.close((err) => {
                if (err) {
                    console.error('Error closing database:', err.message);
                } else {
                    console.log('\nDatabase connection closed.');
                }
            });
        });
    });
});