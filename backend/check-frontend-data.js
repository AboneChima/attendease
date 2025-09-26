const sqlite3 = require('sqlite3').verbose();
const path = require('path');

const dbPath = path.join(__dirname, 'attendance.db');
const db = new sqlite3.Database(dbPath);

console.log('🔍 CHECKING FRONTEND DATA ENDPOINTS');
console.log('=====================================\n');

const today = new Date().toISOString().split('T')[0];

// Check what /attendance/today returns (uses attendance table for historical records)
console.log('1. CHECKING /attendance/today ENDPOINT DATA');
console.log('-------------------------------------------');
db.all(`
  SELECT * FROM attendance WHERE date = ? ORDER BY time ASC
`, [today], (err, attendance) => {
  if (err) {
    console.error('❌ Error fetching today\'s attendance:', err.message);
    console.log('   Note: attendance table might not exist - this endpoint returns historical check-ins');
    attendance = []; // Set empty array to continue
  } else {
    console.log(`📅 Date: ${today}`);
    console.log(`📊 Count: ${attendance.length}`);
    console.log('📋 Attendance records:');
    
    if (attendance.length === 0) {
      console.log('   ✅ No attendance records found for today');
    } else {
      attendance.forEach((record, index) => {
        console.log(`   ${index + 1}. ${record.student_id}: ${record.student_name} at ${record.time}`);
      });
    }
  }
  
  console.log('\n');
  
  // Check what /attendance-management/daily/{date} returns
  console.log('2. CHECKING /attendance-management/daily/{date} ENDPOINT DATA');
  console.log('------------------------------------------------------------');
  
  db.all(`
    SELECT 
      da.student_id,
      da.student_name,
      da.status,
      da.check_in_time,
      da.updated_at,
      s.email,
      s.phone
    FROM daily_attendance da
    LEFT JOIN students s ON da.student_id = s.student_id
    WHERE da.date = ?
    ORDER BY da.student_name ASC
  `, [today], (err, dailyAttendance) => {
    if (err) {
      console.error('❌ Error fetching daily attendance:', err.message);
      return;
    }
    
    console.log(`📅 Date: ${today}`);
    console.log(`📊 Count: ${dailyAttendance.length}`);
    console.log('📋 Daily attendance records:');
    
    if (dailyAttendance.length === 0) {
      console.log('   ✅ No daily attendance records found for today');
    } else {
      dailyAttendance.forEach((record, index) => {
        const studentExists = record.email !== null || record.phone !== null;
        const status = studentExists ? '✅ ACTIVE' : '❌ DELETED';
        console.log(`   ${index + 1}. ${record.student_id}: ${record.student_name} (${record.status}) ${status}`);
        if (!studentExists) {
          console.log(`      ⚠️  WARNING: This student appears to be deleted but still in daily_attendance!`);
        }
      });
    }
    
    console.log('\n');
    
    // Check for orphaned daily_attendance records
    console.log('3. CHECKING FOR ORPHANED DAILY_ATTENDANCE RECORDS');
    console.log('--------------------------------------------------');
    
    db.all(`
      SELECT da.student_id, da.student_name, da.status, da.date
      FROM daily_attendance da
      LEFT JOIN students s ON da.student_id = s.student_id
      WHERE s.student_id IS NULL
      ORDER BY da.date DESC, da.student_name ASC
    `, (err, orphaned) => {
      if (err) {
        console.error('❌ Error checking orphaned records:', err.message);
        return;
      }
      
      console.log(`📊 Total orphaned daily_attendance records: ${orphaned.length}`);
      
      if (orphaned.length === 0) {
        console.log('   ✅ No orphaned daily_attendance records found');
      } else {
        console.log('📋 Orphaned records:');
        orphaned.forEach((record, index) => {
          console.log(`   ${index + 1}. ${record.student_id}: ${record.student_name} (${record.status}) - Date: ${record.date}`);
        });
        
        // Count orphaned records for today specifically
        const todayOrphaned = orphaned.filter(r => r.date === today);
        console.log(`\n⚠️  CRITICAL: ${todayOrphaned.length} orphaned records found for TODAY (${today})`);
        if (todayOrphaned.length > 0) {
          console.log('   These are the deleted students still appearing in today\'s attendance!');
          todayOrphaned.forEach((record, index) => {
            console.log(`   ${index + 1}. ${record.student_id}: ${record.student_name} (${record.status})`);
          });
        }
      }
      
      console.log('\n');
      
      // Summary
      console.log('4. SUMMARY');
      console.log('----------');
      console.log(`📅 Today's date: ${today}`);
      console.log(`📊 /attendance/today returns: ${attendance.length} records`);
      console.log(`📊 /attendance-management/daily returns: ${dailyAttendance.length} records`);
      console.log(`⚠️  Orphaned daily_attendance records for today: ${orphaned.filter(r => r.date === today).length}`);
      
      if (orphaned.filter(r => r.date === today).length > 0) {
        console.log('\n🔥 ISSUE IDENTIFIED:');
        console.log('   The frontend is receiving deleted students in the daily_attendance data!');
        console.log('   This explains why deleted students still appear in today\'s attendance.');
      } else {
        console.log('\n✅ NO ISSUE FOUND:');
        console.log('   No orphaned records found for today. The issue might be elsewhere.');
      }
      
      db.close();
    });
  });
});