const sqlite3 = require('sqlite3').verbose();

const db = new sqlite3.Database('./database/attendance.db');

console.log('🔍 Checking students in database...\n');

db.all('SELECT * FROM students', (err, rows) => {
    if (err) {
        console.error('❌ Error:', err.message);
    } else {
        console.log(`📊 Students in database: ${rows.length}\n`);
        if (rows.length > 0) {
            rows.forEach((row, i) => {
                console.log(`${i+1}. ${row.student_id} - ${row.name} (${row.email})`);
            });
        } else {
            console.log('No students found in database');
        }
    }
    db.close();
});