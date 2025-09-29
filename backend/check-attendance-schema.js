const sqlite3 = require('sqlite3').verbose();

const db = new sqlite3.Database('./database/attendance.db');

console.log('🔍 Checking table schemas...\n');

// Check attendance_history table
db.all('PRAGMA table_info(attendance_history)', (err, rows) => {
    if (err) {
        console.error('❌ Error checking attendance_history:', err.message);
    } else {
        console.log('📊 attendance_history table schema:');
        if (rows.length > 0) {
            rows.forEach(row => {
                console.log(`  ${row.cid}: ${row.name} (${row.type})`);
            });
        } else {
            console.log('  Table does not exist or has no columns');
        }
    }
    
    console.log('\n');
    
    // Check if table exists
    db.all("SELECT name FROM sqlite_master WHERE type='table' AND name LIKE '%attendance%'", (err, tables) => {
        if (err) {
            console.error('❌ Error checking tables:', err.message);
        } else {
            console.log('📋 Attendance-related tables:');
            tables.forEach(table => {
                console.log(`  - ${table.name}`);
            });
        }
        db.close();
    });
});