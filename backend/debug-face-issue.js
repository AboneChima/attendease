const { dbAdapter } = require('./config/database-adapter');

async function debugFaceIssue() {
  try {
    console.log('=== Face Verification Debug ===\n');
    
    // Check if face_encodings table exists
    const [faceTableInfo] = await dbAdapter.execute('PRAGMA table_info(face_encodings)');
    console.log('Face encodings table structure:');
    faceTableInfo.forEach(col => {
      console.log(`- ${col.name} (${col.type})`);
    });
    console.log('');
    
    // 1. Check all students with face encodings
    const [students] = await dbAdapter.execute(
      `SELECT fe.student_id, fe.face_descriptor, fe.sample_count, s.name 
       FROM face_encodings fe 
       LEFT JOIN students s ON fe.student_id = s.student_id`
    );
    
    console.log('Students with face encodings:');
    students.forEach(s => {
      console.log(`- Student ID: ${s.student_id}, Name: ${s.name || 'Unknown'}, Sample Count: ${s.sample_count}`);
    });
    console.log(`Total students with face encodings: ${students.length}\n`);
    
    // 2. Check today's attendance for Ezeigbo David
    const today = new Date().toISOString().split('T')[0];
    const [attendance] = await dbAdapter.execute(
      'SELECT * FROM attendance WHERE student_id = ? AND date = ?',
      ['Student1647788', today]
    );
    
    console.log('Ezeigbo David attendance today:');
    console.log(attendance);
    
    // 3. Check daily attendance status
    const [dailyAttendance] = await dbAdapter.execute(
      'SELECT * FROM daily_attendance WHERE student_id = ? AND date = ?',
      ['Student1647788', today]
    );
    
    console.log('\nEzeigbo David daily attendance status:');
    console.log(dailyAttendance);
    
    // 4. Check if there are any other students with similar names
    const [similarStudents] = await dbAdapter.execute(
      'SELECT student_id, name FROM students WHERE name LIKE ? OR name LIKE ?',
      ['%David%', '%Ezeigbo%']
    );
    
    console.log('\nStudents with similar names:');
    similarStudents.forEach(s => {
      console.log(`- ${s.name} (${s.student_id})`);
    });
    
  } catch (error) {
    console.error('Error:', error);
  } finally {
    process.exit(0);
  }
}

debugFaceIssue();