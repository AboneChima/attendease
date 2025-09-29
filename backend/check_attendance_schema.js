const sqlite3 = require('sqlite3').verbose();
const path = require('path');

const dbPath = path.join(__dirname, 'database', 'attendance.db');

const db = new sqlite3.Database(dbPath, (err) => {
    if (err) {
        console.error('❌ Error connecting to database:', err.message);
        return;
    }
    console.log('✅ Connected to SQLite database');
});

// Check attendance table schema
db.all("PRAGMA table_info(attendance)", [], (err, rows) => {
    if (err) {
        console.error('❌ Error getting attendance table info:', err.message);
        return;
    }
    
    console.log('📋 Attendance Table Schema:');
    rows.forEach(row => {
        console.log(`   ${row.name} (${row.type}) - ${row.notnull ? 'NOT NULL' : 'NULL'}`);
    });
    
    // Get sample data
    db.all("SELECT * FROM attendance WHERE date = '2025-09-29' LIMIT 5", [], (err, rows) => {
        if (err) {
            console.error('❌ Error getting sample data:', err.message);
        } else {
            console.log('\n📊 Sample Attendance Data:');
            rows.forEach(row => {
                console.log(JSON.stringify(row, null, 2));
            });
        }
        
        db.close();
    });
});