const { dbAdapter } = require('./config/database-adapter');

async function checkTables() {
  try {
    console.log('🔍 Checking available database tables...');
    
    const [tables] = await dbAdapter.execute(`
      SELECT name FROM sqlite_master WHERE type='table'
      ORDER BY name
    `);
    
    console.log('📋 Available tables:');
    tables.forEach(table => {
      console.log(`  - ${table.name}`);
    });
    
    // Check photo_face_enrollments specifically
    console.log('\n🔍 Checking photo_face_enrollments table...');
    const [photoFaceData] = await dbAdapter.execute(`
      SELECT student_id, enrollment_date, is_active 
      FROM photo_face_enrollments 
      WHERE is_active = 1
      ORDER BY student_id
    `);
    
    console.log('📸 Photo Face Enrollments:');
    photoFaceData.forEach(enrollment => {
      console.log(`  - ${enrollment.student_id}: ${enrollment.enrollment_date} (active: ${enrollment.is_active})`);
    });
    
  } catch (error) {
    console.error('❌ Error:', error.message);
  }
  
  process.exit(0);
}

checkTables();