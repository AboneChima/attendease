const { dbAdapter } = require('./config/database-adapter');

async function debugEnrollmentStatus() {
  try {
    console.log('🔍 Debugging enrollment status logic...');
    
    // Get all students
    const [students] = await dbAdapter.execute(`
      SELECT student_id, name, email, phone, created_at
      FROM students 
      ORDER BY student_id ASC
    `);
    
    console.log(`📋 Found ${students.length} students`);
    
    for (const student of students) {
      console.log(`\n👤 Processing ${student.student_id} (${student.name})...`);
      
      // Check face enrollment (photo_face_enrollments)
      try {
        const [faceEnrollment] = await dbAdapter.execute(`
          SELECT id, enrollment_date, face_confidence, photo_quality_score, is_active
          FROM photo_face_enrollments 
          WHERE student_id = ? AND is_active = 1
        `, [student.student_id]);
        
        console.log(`  📸 Face enrollment query result:`, faceEnrollment.length, 'records');
        if (faceEnrollment.length > 0) {
          console.log(`  ✅ Face enrolled: ${faceEnrollment[0].enrollment_date}`);
        } else {
          console.log(`  ❌ Face not enrolled`);
        }
      } catch (error) {
        console.log(`  ⚠️ Face enrollment check failed:`, error.message);
      }
    }
    
  } catch (error) {
    console.error('❌ Error:', error.message);
  }
  
  process.exit(0);
}

debugEnrollmentStatus();