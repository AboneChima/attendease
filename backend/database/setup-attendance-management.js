const { dbAdapter } = require('../config/database-adapter');

// SQLite version of the attendance management schema
const setupAttendanceManagement = async () => {
  try {
    console.log('Setting up attendance management tables...');
    
    // Daily attendance tracking table
    await dbAdapter.execute(`
      CREATE TABLE IF NOT EXISTS daily_attendance (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        student_id TEXT NOT NULL,
        student_name TEXT NOT NULL,
        date DATE NOT NULL,
        status TEXT DEFAULT 'not_yet_here' CHECK (status IN ('present', 'absent', 'not_yet_here')),
        check_in_time TIME NULL,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (student_id) REFERENCES students(student_id) ON DELETE CASCADE,
        UNIQUE(student_id, date)
      )
    `);
    console.log('✓ Created daily_attendance table');
    
    // Historical attendance records table
    await dbAdapter.execute(`
      CREATE TABLE IF NOT EXISTS attendance_history (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        date DATE NOT NULL UNIQUE,
        total_students INTEGER NOT NULL,
        present_count INTEGER NOT NULL,
        absent_count INTEGER NOT NULL,
        attendance_rate REAL NOT NULL,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )
    `);
    console.log('✓ Created attendance_history table');
    
    // Attendance sessions table
    await dbAdapter.execute(`
      CREATE TABLE IF NOT EXISTS attendance_sessions (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        session_date DATE NOT NULL UNIQUE,
        reset_time DATETIME DEFAULT CURRENT_TIMESTAMP,
        total_students INTEGER NOT NULL
      )
    `);
    console.log('✓ Created attendance_sessions table');
    
    // Create indexes for better performance
    await dbAdapter.execute('CREATE INDEX IF NOT EXISTS idx_daily_attendance_date ON daily_attendance(date)');
    await dbAdapter.execute('CREATE INDEX IF NOT EXISTS idx_daily_attendance_status ON daily_attendance(status)');
    await dbAdapter.execute('CREATE INDEX IF NOT EXISTS idx_daily_attendance_student_id ON daily_attendance(student_id)');
    await dbAdapter.execute('CREATE INDEX IF NOT EXISTS idx_attendance_history_date ON attendance_history(date)');
    await dbAdapter.execute('CREATE INDEX IF NOT EXISTS idx_attendance_sessions_date ON attendance_sessions(session_date)');
    console.log('✓ Created indexes');
    
    // Create trigger to automatically update daily_attendance when attendance is recorded
    await dbAdapter.execute(`
      CREATE TRIGGER IF NOT EXISTS update_daily_attendance_on_checkin
      AFTER INSERT ON attendance
      BEGIN
        -- Update daily_attendance status to 'present' when student checks in
        UPDATE daily_attendance 
        SET status = 'present', 
            check_in_time = NEW.time,
            updated_at = CURRENT_TIMESTAMP
        WHERE student_id = NEW.student_id AND date = NEW.date;
        
        -- If no record exists in daily_attendance, create one
        INSERT OR IGNORE INTO daily_attendance (student_id, student_name, date, status, check_in_time)
        VALUES (NEW.student_id, NEW.student_name, NEW.date, 'present', NEW.time);
      END
    `);
    console.log('✓ Created trigger for automatic attendance updates');
    
    console.log('\n🎉 Attendance management setup completed successfully!');
    
  } catch (error) {
    console.error('❌ Error setting up attendance management:', error);
    throw error;
  }
};

// Helper functions for attendance management
const initializeDailyAttendance = async (targetDate = null) => {
  try {
    const date = targetDate || new Date().toISOString().split('T')[0];
    console.log(`Initializing daily attendance for ${date}...`);
    
    // Get all students
    const [students] = await dbAdapter.execute('SELECT student_id, name FROM students ORDER BY student_id');
    
    if (students.length === 0) {
      console.log('No students found in the system');
      return;
    }
    
    // Insert or update attendance session record
    const [existingSession] = await dbAdapter.execute(
      'SELECT session_date FROM attendance_sessions WHERE session_date = ?',
      [date]
    );
    
    if (existingSession.length > 0) {
      await dbAdapter.execute(`
        UPDATE attendance_sessions 
        SET total_students = ?, reset_time = CURRENT_TIMESTAMP
        WHERE session_date = ?
      `, [students.length, date]);
    } else {
      await dbAdapter.execute(`
        INSERT INTO attendance_sessions (session_date, total_students, reset_time)
        VALUES (?, ?, CURRENT_TIMESTAMP)
      `, [date, students.length]);
    }
    
    // Initialize daily attendance for all students
    for (const student of students) {
      const [existingAttendance] = await dbAdapter.execute(
        'SELECT id FROM daily_attendance WHERE student_id = ? AND date = ?',
        [student.student_id, date]
      );
      
      if (existingAttendance.length === 0) {
        await dbAdapter.execute(`
          INSERT INTO daily_attendance (student_id, student_name, date, status)
          VALUES (?, ?, ?, 'not_yet_here')
        `, [student.student_id, student.name, date]);
      }
    }
    
    // Update students who already have attendance recorded today to 'present'
    await dbAdapter.execute(`
      UPDATE daily_attendance 
      SET status = 'present', 
          check_in_time = (
            SELECT time FROM attendance 
            WHERE attendance.student_id = daily_attendance.student_id 
            AND attendance.date = daily_attendance.date
          ),
          updated_at = CURRENT_TIMESTAMP
      WHERE date = ? 
      AND student_id IN (
        SELECT student_id FROM attendance WHERE date = ?
      )
    `, [date, date]);
    
    console.log(`✓ Initialized daily attendance for ${students.length} students on ${date}`);
    return students.length;
    
  } catch (error) {
    console.error('❌ Error initializing daily attendance:', error);
    throw error;
  }
};

const finalizeDailyAttendance = async (targetDate = null) => {
  try {
    const date = targetDate || new Date().toISOString().split('T')[0];
    console.log(`Finalizing daily attendance for ${date}...`);
    
    // Get attendance counts
    const [totalResult] = await dbAdapter.execute(
      'SELECT COUNT(*) as total FROM daily_attendance WHERE date = ?', [date]
    );
    const [presentResult] = await dbAdapter.execute(
      'SELECT COUNT(*) as present FROM daily_attendance WHERE date = ? AND status = "present"', [date]
    );
    
    const totalStudents = totalResult[0]?.total || 0;
    const presentCount = presentResult[0]?.present || 0;
    const absentCount = totalStudents - presentCount;
    const attendanceRate = totalStudents > 0 ? (presentCount / totalStudents) * 100 : 0;
    
    // Update 'not_yet_here' status to 'absent' for the day
    await dbAdapter.execute(`
      UPDATE daily_attendance 
      SET status = 'absent', updated_at = CURRENT_TIMESTAMP
      WHERE date = ? AND status = 'not_yet_here'
    `, [date]);
    
    // Create or update historical record
    const [existingHistory] = await dbAdapter.execute(
      'SELECT date FROM attendance_history WHERE date = ?',
      [date]
    );
    
    if (existingHistory.length > 0) {
      await dbAdapter.execute(`
        UPDATE attendance_history 
        SET total_students = ?, present_count = ?, absent_count = ?, attendance_rate = ?
        WHERE date = ?
      `, [totalStudents, presentCount, absentCount, attendanceRate, date]);
    } else {
      await dbAdapter.execute(`
        INSERT INTO attendance_history 
        (date, total_students, present_count, absent_count, attendance_rate)
        VALUES (?, ?, ?, ?, ?)
      `, [date, totalStudents, presentCount, absentCount, attendanceRate]);
    }
    
    console.log(`✓ Finalized attendance: ${presentCount}/${totalStudents} present (${attendanceRate.toFixed(1)}%)`);
    return { totalStudents, presentCount, absentCount, attendanceRate };
    
  } catch (error) {
    console.error('❌ Error finalizing daily attendance:', error);
    throw error;
  }
};

module.exports = {
  setupAttendanceManagement,
  initializeDailyAttendance,
  finalizeDailyAttendance
};

// Run setup if this file is executed directly
if (require.main === module) {
  setupAttendanceManagement()
    .then(() => {
      console.log('\n🚀 Running initial setup...');
      return initializeDailyAttendance();
    })
    .then(() => {
      console.log('\n✅ Setup completed successfully!');
      process.exit(0);
    })
    .catch((error) => {
      console.error('\n💥 Setup failed:', error);
      process.exit(1);
    });
}