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

// Get table schema
db.all("PRAGMA table_info(photo_face_enrollments)", (err, rows) => {
    if (err) {
        console.error('❌ Error getting table schema:', err.message);
        return;
    }
    
    console.log('\n📋 Photo Face Enrollments Table Schema:');
    rows.forEach(row => {
        const nullable = row.notnull ? 'NOT NULL' : 'NULL';
        console.log(`   ${row.name} (${row.type}) - ${nullable}`);
    });
    
    // Get sample data
    db.all("SELECT * FROM photo_face_enrollments LIMIT 3", (err, rows) => {
        if (err) {
            console.error('❌ Error getting sample data:', err.message);
        } else {
            console.log('\n📊 Sample Face Enrollment Data:');
            rows.forEach(row => {
                console.log(JSON.stringify(row, null, 2));
            });
        }
        
        db.close();
    });
});