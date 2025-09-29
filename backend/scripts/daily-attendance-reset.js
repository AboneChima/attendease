const cron = require('node-cron');

// Use database adapter for cross-database compatibility
let dbAdapter;
const initializeDbAdapter = async () => {
  if (!dbAdapter) {
    const { dbAdapter: adapter } = require('../config/database-adapter');
    await adapter.initialize();
    dbAdapter = adapter;
  }
  return dbAdapter;
};

// Function to finalize previous day's attendance and initialize new day
const performDailyReset = async () => {
  const today = new Date().toISOString().split('T')[0];
  const yesterday = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString().split('T')[0];
  
  console.log(`\n🌅 Starting daily attendance reset for ${today}`);
  console.log(`📊 Finalizing attendance for ${yesterday}`);
  
  try {
    // Initialize database adapter
    const db = await initializeDbAdapter();

    // 1. Calculate and save yesterday's attendance summary to history
    const summaryQuery = `
      SELECT 
        COUNT(*) as total_students,
        SUM(CASE WHEN status = 'present' THEN 1 ELSE 0 END) as present_count,
        SUM(CASE WHEN status = 'absent' THEN 1 ELSE 0 END) as absent_count,
        SUM(CASE WHEN status = 'late' THEN 1 ELSE 0 END) as late_count
      FROM daily_attendance 
      WHERE date = ?
    `;
    
    const summary = await db.get(summaryQuery, [yesterday]);
    
    // Calculate attendance rate
    if (summary && summary.total_students > 0) {
      summary.attendance_rate = Math.round((summary.present_count / summary.total_students) * 100 * 100) / 100;
    }
    
    if (summary && summary.total_students > 0) {
      // Check if history record already exists
      const checkHistoryQuery = `
        SELECT id FROM attendance_history WHERE date = ?
      `;
      
      const existingRecord = await db.get(checkHistoryQuery, [yesterday]);
      
      let historyQuery;
      let historyParams;
      
      if (existingRecord) {
        // Update existing record
        historyQuery = `
          UPDATE attendance_history 
          SET total_students = ?, present_count = ?, absent_count = ?, attendance_rate = ?
          WHERE date = ?
        `;
        historyParams = [
          summary.total_students,
          summary.present_count,
          summary.absent_count,
          summary.attendance_rate,
          yesterday
        ];
      } else {
        // Insert new record
        historyQuery = `
          INSERT INTO attendance_history (
            date, total_students, present_count, absent_count, attendance_rate
          ) VALUES (?, ?, ?, ?, ?)
        `;
        historyParams = [
          yesterday,
          summary.total_students,
          summary.present_count,
          summary.absent_count,
          summary.attendance_rate
        ];
      }
    
      await db.execute(historyQuery, historyParams);
      console.log(`✅ Saved attendance summary for ${yesterday} (${summary.present_count}/${summary.total_students} present, ${summary.attendance_rate}% rate)`);
    } else {
      console.log(`ℹ️ No attendance data found for ${yesterday}`);
    }

    // 2. Clear yesterday's daily attendance
    const deleteResult = await db.execute('DELETE FROM daily_attendance WHERE date = ?', [yesterday]);
    console.log(`🗑️ Cleared ${deleteResult[0].affectedRows || 0} daily attendance records for ${yesterday}`);

    // 3. Initialize today's attendance for all students
    const initQuery = `
      INSERT INTO daily_attendance (student_id, date, status)
      SELECT student_id, ? as date, 'not_yet_here' as status
      FROM students
      WHERE student_id NOT IN (
        SELECT student_id FROM daily_attendance WHERE date = ?
      )
    `;
    
    const initResult = await db.execute(initQuery, [today, today]);
    console.log(`🆕 Initialized ${initResult[0].affectedRows || 0} new attendance records for ${today}`);

    // 4. Create attendance session for today
    // First get the total student count
    const studentCountResult = await db.get('SELECT COUNT(*) as total FROM students');
    const totalStudents = studentCountResult.total;
    
    // Check if session already exists
    const checkSessionQuery = `
      SELECT id FROM attendance_sessions WHERE session_date = ?
    `;
    
    const existingSession = await db.get(checkSessionQuery, [today]);
    
    if (!existingSession) {
      const sessionQuery = `
        INSERT INTO attendance_sessions (session_date, total_students)
        VALUES (?, ?)
      `;
      
      await db.execute(sessionQuery, [today, totalStudents]);
      console.log(`📅 Created attendance session for ${today} (${totalStudents} students)`);
    } else {
      console.log(`📅 Attendance session for ${today} already exists`);
    }

    // Transaction handling removed - database adapter handles this automatically

    // 5. Get summary statistics
    const statsQuery = `
      SELECT 
        COUNT(*) as total_students,
        COUNT(CASE WHEN status = 'present' THEN 1 END) as present_count,
        COUNT(CASE WHEN status = 'absent' THEN 1 END) as absent_count,
        COUNT(CASE WHEN status = 'not_yet_here' THEN 1 END) as not_yet_here_count
      FROM daily_attendance 
      WHERE date = ?
    `;
    
    const stats = await db.get(statsQuery, [today]);

    console.log('\n📊 Daily Reset Summary:');
    console.log(`   📚 Total Students: ${stats.total_students}`);
    console.log(`   ✅ Present: ${stats.present_count}`);
    console.log(`   ❌ Absent: ${stats.absent_count}`);
    console.log(`   ⏰ Not Yet Here: ${stats.not_yet_here_count}`);
    console.log(`\n🎉 Daily attendance reset completed successfully for ${today}!\n`);

  } catch (error) {
    console.error('❌ Daily reset failed:', error.message);
    throw error;
  }
};

// Function to get attendance statistics
const getAttendanceStats = async (date) => {
  const db = await initializeDbAdapter();
  
  const query = `
    SELECT 
      COUNT(*) as total_students,
      COUNT(CASE WHEN status = 'present' THEN 1 END) as present_count,
      COUNT(CASE WHEN status = 'absent' THEN 1 END) as absent_count,
      COUNT(CASE WHEN status = 'not_yet_here' THEN 1 END) as not_yet_here_count,
      ROUND(
        (COUNT(CASE WHEN status = 'present' THEN 1 END) * 100.0 / COUNT(*)), 2
      ) as attendance_rate
    FROM daily_attendance 
    WHERE date = ?
  `;
  
  const result = await db.get(query, [date]);
  return result || {
    total_students: 0,
    present_count: 0,
    absent_count: 0,
    not_yet_here_count: 0,
    attendance_rate: 0
  };
};

// Schedule daily reset at midnight (00:01 AM)
const scheduleDailyReset = () => {
  console.log('🕐 Scheduling daily attendance reset at 00:01 AM...');
  
  // Run at 00:01 AM every day
  cron.schedule('1 0 * * *', async () => {
    console.log('\n⏰ Triggered daily attendance reset...');
    try {
      await performDailyReset();
    } catch (error) {
      console.error('❌ Scheduled daily reset failed:', error.message);
    }
  }, {
    scheduled: true,
    timezone: 'America/New_York' // Adjust timezone as needed
  });
  
  console.log('✅ Daily reset scheduler initialized successfully!');
};

// Manual reset function for testing
const manualReset = async () => {
  console.log('🔧 Performing manual attendance reset...');
  try {
    await performDailyReset();
    console.log('✅ Manual reset completed successfully!');
  } catch (error) {
    console.error('❌ Manual reset failed:', error.message);
    process.exit(1);
  }
};

// Export functions for use in other modules
module.exports = {
  performDailyReset,
  getAttendanceStats,
  scheduleDailyReset,
  manualReset
};

// If this script is run directly, perform manual reset
if (require.main === module) {
  const args = process.argv.slice(2);
  
  if (args.includes('--schedule')) {
    // Start the scheduler
    scheduleDailyReset();
    console.log('📅 Daily reset scheduler is running. Press Ctrl+C to stop.');
    
    // Keep the process alive
    process.on('SIGINT', () => {
      console.log('\n👋 Stopping daily reset scheduler...');
      db.close((err) => {
        if (err) {
          console.error('Error closing database:', err.message);
        } else {
          console.log('Database connection closed.');
        }
        process.exit(0);
      });
    });
    
  } else if (args.includes('--stats')) {
    // Show today's stats
    const today = new Date().toISOString().split('T')[0];
    getAttendanceStats(today)
      .then(stats => {
        console.log('\n📊 Today\'s Attendance Statistics:');
        console.log(`   📚 Total Students: ${stats.total_students}`);
        console.log(`   ✅ Present: ${stats.present_count}`);
        console.log(`   ❌ Absent: ${stats.absent_count}`);
        console.log(`   ⏰ Not Yet Here: ${stats.not_yet_here_count}`);
        console.log(`   📈 Attendance Rate: ${stats.attendance_rate}%\n`);
        process.exit(0);
      })
      .catch(error => {
        console.error('❌ Error getting stats:', error.message);
        process.exit(1);
      });
      
  } else {
    // Perform manual reset
    manualReset()
      .then(() => {
        process.exit(0);
      })
      .catch(() => {
        process.exit(1);
      });
  }
}