const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const fs = require('fs');

console.log('🔍 CHECKING DATABASE LOCATIONS');
console.log('==============================\n');

// Check multiple possible database locations
const possiblePaths = [
  path.join(__dirname, 'attendance.db'),
  path.join(__dirname, 'database', 'attendance.db'),
  path.join(__dirname, '..', 'attendance.db'),
];

console.log('📂 Checking possible database locations:');
possiblePaths.forEach((dbPath, index) => {
  const exists = fs.existsSync(dbPath);
  console.log(`   ${index + 1}. ${dbPath} - ${exists ? '✅ EXISTS' : '❌ NOT FOUND'}`);
  
  if (exists) {
    const stats = fs.statSync(dbPath);
    console.log(`      Size: ${stats.size} bytes`);
    console.log(`      Modified: ${stats.mtime}`);
  }
});

console.log('\n');

// Find the database that actually has tables
let foundDatabase = null;

const checkDatabase = (dbPath, callback) => {
  if (!fs.existsSync(dbPath)) {
    callback(null, null);
    return;
  }
  
  const db = new sqlite3.Database(dbPath);
  
  db.all(`SELECT name FROM sqlite_master WHERE type='table' ORDER BY name`, (err, tables) => {
    if (err) {
      console.error(`❌ Error checking ${dbPath}:`, err.message);
      callback(err, null);
    } else {
      callback(null, { path: dbPath, tables: tables });
    }
    db.close();
  });
};

let checkedCount = 0;
const totalToCheck = possiblePaths.filter(p => fs.existsSync(p)).length;

if (totalToCheck === 0) {
  console.log('❌ No database files found!');
  process.exit(1);
}

possiblePaths.forEach(dbPath => {
  if (fs.existsSync(dbPath)) {
    checkDatabase(dbPath, (err, result) => {
      checkedCount++;
      
      if (result && result.tables.length > 0) {
        console.log(`✅ ACTIVE DATABASE FOUND: ${result.path}`);
        console.log(`📊 Tables (${result.tables.length}):`);
        result.tables.forEach((table, index) => {
          console.log(`   ${index + 1}. ${table.name}`);
        });
        foundDatabase = result;
        
        // Now check the daily_attendance table specifically
        if (result.tables.some(t => t.name === 'daily_attendance')) {
          console.log('\n🔍 CHECKING DAILY_ATTENDANCE TABLE:');
          console.log('===================================');
          
          const db = new sqlite3.Database(result.path);
          const today = new Date().toISOString().split('T')[0];
          
          db.all(`
            SELECT 
              da.student_id,
              da.student_name,
              da.status,
              da.check_in_time,
              s.email,
              s.phone
            FROM daily_attendance da
            LEFT JOIN students s ON da.student_id = s.student_id
            WHERE da.date = ?
            ORDER BY da.student_name ASC
          `, [today], (err, dailyAttendance) => {
            if (err) {
              console.error('❌ Error fetching daily attendance:', err.message);
            } else {
              console.log(`📅 Date: ${today}`);
              console.log(`📊 Count: ${dailyAttendance.length}`);
              
              if (dailyAttendance.length === 0) {
                console.log('   ✅ No daily attendance records found for today');
              } else {
                console.log('📋 Daily attendance records:');
                dailyAttendance.forEach((record, index) => {
                  const studentExists = record.email !== null || record.phone !== null;
                  const status = studentExists ? '✅ ACTIVE' : '❌ DELETED';
                  console.log(`   ${index + 1}. ${record.student_id}: ${record.student_name} (${record.status}) ${status}`);
                  if (!studentExists) {
                    console.log(`      ⚠️  WARNING: This student appears to be deleted but still in daily_attendance!`);
                  }
                });
                
                // Count orphaned records
                const orphanedCount = dailyAttendance.filter(r => r.email === null && r.phone === null).length;
                if (orphanedCount > 0) {
                  console.log(`\n🔥 ISSUE FOUND: ${orphanedCount} orphaned records in today's daily_attendance!`);
                  console.log('   These deleted students are still appearing in the frontend.');
                } else {
                  console.log('\n✅ No orphaned records found in today\'s daily_attendance');
                }
              }
            }
            db.close();
          });
        }
      } else if (result) {
        console.log(`📂 Empty database: ${result.path} (0 tables)`);
      }
      
      if (checkedCount === totalToCheck && !foundDatabase) {
        console.log('\n❌ No database with tables found!');
      }
    });
  }
});