const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const cron = require('node-cron');

// Database path
const dbPath = path.join(__dirname, '../database/attendance.db');

// Initialize database connection
const db = new sqlite3.Database(dbPath, (err) => {
  if (err) {
    console.error('Error connecting to database:', err.message);
  } else {
    console.log('Connected to SQLite database for daily reset');
  }
});

// Function to finalize previous day's attendance and initialize new day
const performDailyReset = async () => {
  const today = new Date().toISOString().split('T')[0];
  const yesterday = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString().split('T')[0];
  
  console.log(`\n🌅 Starting daily attendance reset for ${today}`);
  console.log(`📊 Finalizing attendance for ${yesterday}`);
  
  try {
    // Start transaction
    await new Promise((resolve, reject) => {
      db.run('BEGIN TRANSACTION', (err) => {
        if (err) reject(err);
        else resolve();
      });
    });

    // 1. Calculate and save yesterday's attendance summary to history
    await new Promise((resolve, reject) => {
      const summaryQuery = `
        SELECT 
          COUNT(*) as total_students,
          COUNT(CASE WHEN status = 'present' THEN 1 END) as present_count,
          COUNT(CASE WHEN status = 'absent' OR status = 'not_yet_here' THEN 1 END) as absent_count,
          ROUND(
            (COUNT(CASE WHEN status = 'present' THEN 1 END) * 100.0 / COUNT(*)), 2
          ) as attendance_rate
        FROM daily_attendance 
        WHERE date = ?
      `;
      
      db.get(summaryQuery, [yesterday], (err, summary) => {
        if (err) {
          console.error('❌ Error calculating yesterday\'s summary:', err.message);
          reject(err);
        } else if (summary && summary.total_students > 0) {
          // Insert summary into attendance_history (PostgreSQL compatible)
          const checkHistoryQuery = `
            SELECT id FROM attendance_history WHERE date = ?
          `;
          
          db.get(checkHistoryQuery, [yesterday], function(err, existingRecord) {
            if (err) {
              console.error('❌ Error checking attendance history:', err.message);
              reject(err);
              return;
            }
            
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
          
            db.run(historyQuery, historyParams, function(err) {
              if (err) {
                console.error('❌ Error saving attendance history:', err.message);
                reject(err);
              } else {
                console.log(`✅ Saved attendance summary for ${yesterday} (${summary.present_count}/${summary.total_students} present, ${summary.attendance_rate}% rate)`);
                resolve();
              }
            });
          });
        } else {
          console.log(`ℹ️ No attendance data found for ${yesterday}`);
          resolve();
        }
      });
    });

    // 2. Clear yesterday's daily attendance
    await new Promise((resolve, reject) => {
      db.run('DELETE FROM daily_attendance WHERE date = ?', [yesterday], function(err) {
        if (err) {
          console.error('❌ Error clearing yesterday\'s daily attendance:', err.message);
          reject(err);
        } else {
          console.log(`🗑️ Cleared ${this.changes} daily attendance records for ${yesterday}`);
          resolve();
        }
      });
    });

    // 3. Initialize today's attendance for all students (PostgreSQL compatible)
    await new Promise((resolve, reject) => {
      const initQuery = `
        INSERT INTO daily_attendance (student_id, date, status)
        SELECT student_id, ? as date, 'not_yet_here' as status
        FROM students
        WHERE student_id NOT IN (
          SELECT student_id FROM daily_attendance WHERE date = ?
        )
      `;
      
      db.run(initQuery, [today, today], function(err) {
        if (err) {
          console.error('❌ Error initializing today\'s attendance:', err.message);
          reject(err);
        } else {
          console.log(`🆕 Initialized ${this.changes} new attendance records for ${today}`);
          resolve();
        }
      });
    });

    // 4. Create attendance session for today
    await new Promise((resolve, reject) => {
      // First get the total student count
      db.get('SELECT COUNT(*) as total FROM students', [], (err, result) => {
        if (err) {
          console.error('❌ Error getting student count:', err.message);
          reject(err);
        } else {
          // Check if session already exists (PostgreSQL compatible)
          const checkSessionQuery = `
            SELECT id FROM attendance_sessions WHERE session_date = ?
          `;
          
          db.get(checkSessionQuery, [today], function(err, existingSession) {
            if (err) {
              console.error('❌ Error checking attendance session:', err.message);
              reject(err);
              return;
            }
            
            if (!existingSession) {
              const sessionQuery = `
                INSERT INTO attendance_sessions (session_date, total_students)
                VALUES (?, ?)
              `;
              
              db.run(sessionQuery, [today, result.total], function(err) {
                if (err) {
                  console.error('❌ Error creating attendance session:', err.message);
                  reject(err);
                } else {
                  console.log(`📅 Created attendance session for ${today} (${result.total} students)`);
                  resolve();
                }
              });
            } else {
              console.log(`📅 Attendance session for ${today} already exists`);
              resolve();
            }
          });
          });
        }
      });
    });

    // Commit transaction
    await new Promise((resolve, reject) => {
      db.run('COMMIT', (err) => {
        if (err) reject(err);
        else resolve();
      });
    });

    // 5. Get summary statistics
    const stats = await new Promise((resolve, reject) => {
      const statsQuery = `
        SELECT 
          COUNT(*) as total_students,
          COUNT(CASE WHEN status = 'present' THEN 1 END) as present_count,
          COUNT(CASE WHEN status = 'absent' THEN 1 END) as absent_count,
          COUNT(CASE WHEN status = 'not_yet_here' THEN 1 END) as not_yet_here_count
        FROM daily_attendance 
        WHERE date = ?
      `;
      
      db.get(statsQuery, [today], (err, row) => {
        if (err) {
          reject(err);
        } else {
          resolve(row);
        }
      });
    });

    console.log('\n📊 Daily Reset Summary:');
    console.log(`   📚 Total Students: ${stats.total_students}`);
    console.log(`   ✅ Present: ${stats.present_count}`);
    console.log(`   ❌ Absent: ${stats.absent_count}`);
    console.log(`   ⏰ Not Yet Here: ${stats.not_yet_here_count}`);
    console.log(`\n🎉 Daily attendance reset completed successfully for ${today}!\n`);

  } catch (error) {
    // Rollback transaction on error
    await new Promise((resolve) => {
      db.run('ROLLBACK', () => resolve());
    });
    
    console.error('❌ Daily reset failed:', error.message);
    throw error;
  }
};

// Function to get attendance statistics
const getAttendanceStats = async (date) => {
  return new Promise((resolve, reject) => {
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
    
    db.get(query, [date], (err, row) => {
      if (err) {
        reject(err);
      } else {
        resolve(row || {
          total_students: 0,
          present_count: 0,
          absent_count: 0,
          not_yet_here_count: 0,
          attendance_rate: 0
        });
      }
    });
  });
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