const sqlite3 = require('sqlite3').verbose();
const path = require('path');

// Database path
const dbPath = path.join(__dirname, 'database', 'attendance.db');

console.log('🧹 Cleaning orphaned attendance records...');
console.log('Database path:', dbPath);

const db = new sqlite3.Database(dbPath, (err) => {
    if (err) {
        console.error('❌ Error opening database:', err.message);
        return;
    }
    console.log('✅ Connected to SQLite database');
});

async function cleanOrphanedAttendance() {
    console.log('\n🔍 Step 1: Finding orphaned attendance records...');
    
    // Find attendance records for students that no longer exist
    const orphanedRecords = await new Promise((resolve, reject) => {
        db.all(`
            SELECT a.*, 'DELETED' as student_status
            FROM attendance a
            LEFT JOIN students s ON a.student_id = s.student_id
            WHERE s.student_id IS NULL
            ORDER BY a.date DESC, a.time DESC
        `, (err, rows) => {
            if (err) {
                reject(err);
            } else {
                resolve(rows);
            }
        });
    });
    
    if (orphanedRecords.length === 0) {
        console.log('✅ No orphaned attendance records found!');
        db.close();
        return;
    }
    
    console.log(`\n📋 Found ${orphanedRecords.length} orphaned attendance records:`);
    orphanedRecords.forEach((record, index) => {
        console.log(`   ${index + 1}. ${record.student_id}: ${record.student_name} - ${record.date} at ${record.time}`);
    });
    
    console.log('\n🗑️  Step 2: Removing orphaned attendance records...');
    
    // Get unique student IDs to delete
    const orphanedStudentIds = [...new Set(orphanedRecords.map(r => r.student_id))];
    
    console.log(`\n📝 Students to clean: ${orphanedStudentIds.join(', ')}`);
    
    // Delete orphaned records
    let totalDeleted = 0;
    for (const studentId of orphanedStudentIds) {
        const deletedCount = await new Promise((resolve, reject) => {
            db.run(
                'DELETE FROM attendance WHERE student_id = ?',
                [studentId],
                function(err) {
                    if (err) {
                        reject(err);
                    } else {
                        resolve(this.changes);
                    }
                }
            );
        });
        
        console.log(`   ✅ Deleted ${deletedCount} records for ${studentId}`);
        totalDeleted += deletedCount;
    }
    
    console.log(`\n🎉 Successfully deleted ${totalDeleted} orphaned attendance records!`);
    
    // Verify cleanup
    console.log('\n🔍 Step 3: Verifying cleanup...');
    const remainingOrphaned = await new Promise((resolve, reject) => {
        db.all(`
            SELECT COUNT(*) as count
            FROM attendance a
            LEFT JOIN students s ON a.student_id = s.student_id
            WHERE s.student_id IS NULL
        `, (err, rows) => {
            if (err) {
                reject(err);
            } else {
                resolve(rows[0].count);
            }
        });
    });
    
    if (remainingOrphaned === 0) {
        console.log('✅ Cleanup verified! No orphaned records remain.');
    } else {
        console.log(`⚠️  Warning: ${remainingOrphaned} orphaned records still exist.`);
    }
    
    // Show current attendance table status
    console.log('\n📊 Current attendance table status:');
    const currentRecords = await new Promise((resolve, reject) => {
        db.all(`
            SELECT 
                a.student_id,
                a.student_name,
                a.date,
                a.time,
                CASE WHEN s.student_id IS NOT NULL THEN 'ACTIVE' ELSE 'DELETED' END as status
            FROM attendance a
            LEFT JOIN students s ON a.student_id = s.student_id
            ORDER BY a.date DESC, a.time DESC
            LIMIT 10
        `, (err, rows) => {
            if (err) {
                reject(err);
            } else {
                resolve(rows);
            }
        });
    });
    
    console.log(`   📋 Recent attendance records (showing last 10):`);
    if (currentRecords.length === 0) {
        console.log('   ✅ No attendance records found');
    } else {
        currentRecords.forEach((record, index) => {
            const statusIcon = record.status === 'ACTIVE' ? '✅' : '❌';
            console.log(`   ${index + 1}. ${statusIcon} ${record.student_id}: ${record.student_name} - ${record.date} at ${record.time}`);
        });
    }
    
    console.log('\n✅ Cleanup complete! The frontend should now show only active students.');
    db.close();
}

cleanOrphanedAttendance().catch((error) => {
    console.error('❌ Error during cleanup:', error);
    db.close();
});