const sqlite3 = require('sqlite3').verbose();

const db = new sqlite3.Database('./database/attendance.db');

console.log('🔍 Checking teachers in database...\n');

db.all('SELECT * FROM teachers', (err, rows) => {
    if (err) {
        console.error('❌ Error:', err.message);
    } else {
        console.log(`📊 Teachers in database: ${rows.length}\n`);
        if (rows.length > 0) {
            rows.forEach((row, i) => {
                console.log(`${i+1}. ${row.teacher_id} - ${row.name} (${row.email})`);
            });
        } else {
            console.log('No teachers found in database');
        }
    }
    db.close();
});