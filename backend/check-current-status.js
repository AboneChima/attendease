const { dbAdapter } = require('./config/database-adapter');

async function checkCurrentStatus() {
  try {
    console.log('=== Current System Status ===\n');
    
    const today = new Date().toISOString().split('T')[0];
    console.log(`Today's date: ${today}\n`);
    
    // Check today's attendance records
    const [attendance] = await dbAdapter.execute(
      'SELECT * FROM attendance WHERE date = ? ORDER BY time DESC',
      [today]
    );
    
    console.log('Today\'s attendance records:');
    attendance.forEach(record => {
      console.log(`- ${record.student_name} (${record.student_id}) at ${record.time}`);
    });
    console.log(`Total records today: ${attendance.length}\n`);
    
    // Check daily attendance status
    const [dailyAttendance] = await dbAdapter.execute(
      'SELECT * FROM daily_attendance WHERE date = ? ORDER BY updated_at DESC',
      [today]
    );
    
    console.log('Daily attendance status:');
    dailyAttendance.forEach(record => {
      console.log(`- ${record.student_name} (${record.student_id}): ${record.status} (check-in: ${record.check_in_time || 'N/A'})`);
    });
    console.log(`Total daily records: ${dailyAttendance.length}\n`);
    
    // Check all face encodings with enrollment dates
    const [faceEncodings] = await dbAdapter.execute(`
      SELECT 
        fe.student_id, 
        s.name,
        fe.sample_count,
        fe.enrollment_date,
        fe.updated_at
      FROM face_encodings fe
      JOIN students s ON fe.student_id = s.student_id
      ORDER BY fe.updated_at DESC
    `);
    
    console.log('Face enrollments:');
    faceEncodings.forEach(record => {
      console.log(`- ${record.name} (${record.student_id}): enrolled ${record.enrollment_date}, updated ${record.updated_at}`);
    });
    console.log(`Total face enrollments: ${faceEncodings.length}\n`);
    
  } catch (error) {
    console.error('Error:', error);
  } finally {
    process.exit(0);
  }
}

checkCurrentStatus();