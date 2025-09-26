const sqlite3 = require('sqlite3').verbose();
const path = require('path');

// Database path
const dbPath = path.join(__dirname, 'database', 'attendance.db');

console.log('🔍 Checking for orphaned attendance records...\n');

const db = new sqlite3.Database(dbPath, (err) => {
    if (err) {
        console.error('❌ Error opening database:', err.message);
        return;
    }
    console.log('✅ Connected to SQLite database');
});

// Get today's date in YYYY-MM-DD format
const today = new Date().toISOString().split('T')[0];
console.log(`📅 Checking attendance for: ${today}\n`);

// First, check all daily_attendance records for today
db.all(`
    SELECT da.*, s.student_id as active_student_id, s.name as active_student_name, s.email as active_student_email
    FROM daily_attendance da
    LEFT JOIN students s ON da.student_id = s.student_id
    WHERE da.date = ?
    ORDER BY da.student_id
`, [today], (err, rows) => {
    if (err) {
        console.error('❌ Error querying daily_attendance:', err.message);
        db.close();
        return;
    }

    console.log(`📊 Found ${rows.length} daily attendance records for today:\n`);
    
    const orphanedRecords = [];
    const activeRecords = [];

    rows.forEach(row => {
        if (!row.active_student_id) {
            // This is an orphaned record - student doesn't exist in students table
            orphanedRecords.push(row);
            console.log(`🚨 ORPHANED: ${row.student_id} - Status: ${row.status} (Student not found in students table)`);
        } else {
            // This is an active record
            activeRecords.push(row);
            console.log(`✅ ACTIVE: ${row.student_id} (${row.active_student_name}) - Status: ${row.status}`);
        }
    });

    console.log(`\n📈 Summary:`);
    console.log(`   ✅ Active records: ${activeRecords.length}`);
    console.log(`   🚨 Orphaned records: ${orphanedRecords.length}`);

    if (orphanedRecords.length > 0) {
        console.log(`\n🗑️ Orphaned records that need cleanup:`);
        orphanedRecords.forEach(record => {
            console.log(`   - ${record.student_id} (Status: ${record.status}, Check-in: ${record.check_in_time || 'None'})`);
        });

        // Ask if we should clean them up
        console.log(`\n💡 These orphaned records should be removed from daily_attendance.`);
        console.log(`   Run the cleanup script to remove them.`);
    } else {
        console.log(`\n🎉 No orphaned records found! All attendance records belong to active students.`);
    }

    // Also check if there are any students not in today's attendance
    db.all(`
        SELECT s.student_id, s.name, s.email
        FROM students s
        LEFT JOIN daily_attendance da ON s.student_id = da.student_id AND da.date = ?
        WHERE da.student_id IS NULL
    `, [today], (err, missingRows) => {
        if (err) {
            console.error('❌ Error checking missing students:', err.message);
        } else if (missingRows.length > 0) {
            console.log(`\n⚠️ Students missing from today's attendance:`);
            missingRows.forEach(student => {
                console.log(`   - ${student.student_id} (${student.name})`);
            });
            console.log(`   These students should be added to daily_attendance.`);
        } else {
            console.log(`\n✅ All active students are present in today's attendance.`);
        }

        db.close();
    });
});