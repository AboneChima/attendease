const { dbAdapter } = require('./config/database-adapter');

async function checkFaceEncodings() {
  try {
    console.log('Checking face_encodings table...');
    
    const [encodings] = await dbAdapter.execute('SELECT COUNT(*) as total FROM face_encodings');
    console.log('Total records in face_encodings:', encodings[0].total);
    
    if (encodings[0].total > 0) {
      const [records] = await dbAdapter.execute('SELECT student_id, created_at FROM face_encodings ORDER BY created_at DESC LIMIT 5');
      console.log('Recent face_encodings records:');
      records.forEach(record => {
        console.log(`  - Student ID: ${record.student_id}, Created: ${record.created_at}`);
      });
    }
    
    console.log('\nChecking photo_face_enrollments table...');
    const [photoEnrollments] = await dbAdapter.execute('SELECT COUNT(*) as total FROM photo_face_enrollments');
    console.log('Total records in photo_face_enrollments:', photoEnrollments[0].total);
    
    if (photoEnrollments[0].total > 0) {
      const [photoRecords] = await dbAdapter.execute('SELECT student_id, photo_angle, created_at FROM photo_face_enrollments ORDER BY created_at DESC LIMIT 5');
      console.log('Recent photo_face_enrollments records:');
      photoRecords.forEach(record => {
        console.log(`  - Student ID: ${record.student_id}, Angle: ${record.photo_angle}, Created: ${record.created_at}`);
      });
    }
    
    process.exit(0);
  } catch (error) {
    console.error('Error checking face encodings:', error);
    process.exit(1);
  }
}

checkFaceEncodings();