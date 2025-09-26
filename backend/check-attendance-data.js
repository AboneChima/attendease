const sqlite3 = require('sqlite3').verbose();
const path = require('path');

const dbPath = path.join(__dirname, 'database', 'attendance.db');

console.log('Checking current attendance data...\n');

const db = new sqlite3.Database(dbPath, (err) => {
    if (err) {
        console.error('Error opening database:', err.message);
        return;
    }
    console.log('Connected to the SQLite database.\n');
});

// Check all students
db.all("SELECT * FROM students ORDER BY student_id", (err, students) => {
    if (err) {
        console.error('Error fetching students:', err);
        return;
    }
    
    console.log('=== CURRENT STUDENTS ===');
    console.log(`Total students: ${students.length}`);
    students.forEach(student => {
        console.log(`${student.student_id}: ${student.name}`);
    });
    console.log('\n');
    
    // Check daily attendance for today
    const today = new Date().toISOString().split('T')[0];
    console.log(`=== TODAY'S ATTENDANCE (${today}) ===`);
    
    db.all(`
        SELECT da.*, s.name, s.student_id as student_code
        FROM daily_attendance da
        LEFT JOIN students s ON da.student_id = s.student_id
        WHERE da.date = ?
        ORDER BY da.student_id
    `, [today], (err, dailyAttendance) => {
        if (err) {
            console.error('Error fetching daily attendance:', err);
            return;
        }
        
        console.log(`Total daily attendance records: ${dailyAttendance.length}`);
        dailyAttendance.forEach(record => {
            const studentInfo = record.name ? 
                `${record.student_code}: ${record.name}` : 
                `${record.student_id}: [DELETED STUDENT]`;
            console.log(`${studentInfo} - Status: ${record.status}`);
        });
        console.log('\n');
        
        // Check for orphaned daily attendance records
        console.log('=== ORPHANED DAILY ATTENDANCE RECORDS ===');
        db.all(`
            SELECT da.*
            FROM daily_attendance da
            LEFT JOIN students s ON da.student_id = s.student_id
            WHERE s.student_id IS NULL
            ORDER BY da.date DESC, da.student_id
        `, (err, orphanedDaily) => {
            if (err) {
                console.error('Error fetching orphaned daily attendance:', err);
                return;
            }
            
            console.log(`Total orphaned daily attendance records: ${orphanedDaily.length}`);
            orphanedDaily.forEach(record => {
                console.log(`Student ID: ${record.student_id}, Date: ${record.date}, Status: ${record.status}`);
            });
            console.log('\n');
            
            // Check regular attendance table too
            console.log('=== ORPHANED ATTENDANCE RECORDS ===');
            db.all(`
                SELECT a.*
                FROM attendance a
                LEFT JOIN students s ON a.student_id = s.student_id
                WHERE s.student_id IS NULL
                ORDER BY a.timestamp DESC
            `, (err, orphanedAttendance) => {
                if (err) {
                    console.error('Error fetching orphaned attendance:', err);
                    return;
                }
                
                console.log(`Total orphaned attendance records: ${orphanedAttendance.length}`);
                orphanedAttendance.forEach(record => {
                    console.log(`Student ID: ${record.student_id}, Timestamp: ${record.timestamp}, Status: ${record.status}`);
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
});