const { dbAdapter } = require('./config/database-adapter');

async function checkEnrollmentStatus() {
  try {
    console.log('🔍 Checking enrollment system structure...\n');
    
    // Check students table structure
    console.log('📋 Students table structure:');
    const [studentsColumns] = await dbAdapter.execute('PRAGMA table_info(students)');
    studentsColumns.forEach(col => {
      console.log(`  - ${col.name}: ${col.type} ${col.notnull ? '(NOT NULL)' : ''} ${col.dflt_value ? `DEFAULT ${col.dflt_value}` : ''}`);
    });
    
    // Check if STU06 exists
    console.log('\n🔍 Checking STU06 enrollment status...');
    const [stu06] = await dbAdapter.execute('SELECT * FROM students WHERE student_id = ?', ['STU06']);
    
    if (stu06.length === 0) {
      console.log('❌ STU06 not found in students table');
      return;
    }
    
    const student = stu06[0];
    console.log(`✅ STU06 found: ${student.name} (${student.email})`);
    
    // Check PIN enrollment (if PIN field exists)
    const hasPinField = studentsColumns.some(col => col.name === 'pin');
    if (hasPinField) {
      const pinStatus = student.pin ? '✅ Enrolled' : '❌ Not enrolled';
      console.log(`📱 PIN: ${pinStatus}`);
    } else {
      console.log('📱 PIN: Field not found in students table');
    }
    
    // Check face enrollment
    console.log('\n🔍 Checking face enrollment tables...');
    
    // Check photo_face_enrollments
    const [photoFace] = await dbAdapter.execute('SELECT * FROM photo_face_enrollments WHERE student_id = ?', ['STU06']);
    console.log(`👤 Photo Face Enrollment: ${photoFace.length > 0 ? '✅ Enrolled' : '❌ Not enrolled'}`);
    
    // Check enhanced_face_enrollments (if exists)
    try {
      const [enhancedFace] = await dbAdapter.execute('SELECT * FROM enhanced_face_enrollments WHERE student_id = ?', ['STU06']);
      console.log(`👤 Enhanced Face Enrollment: ${enhancedFace.length > 0 ? '✅ Enrolled' : '❌ Not enrolled'}`);
    } catch (error) {
      console.log('👤 Enhanced Face Enrollment: Table not found');
    }
    
    // Check face_samples (if exists)
    try {
      const [faceSamples] = await dbAdapter.execute('SELECT * FROM face_samples WHERE student_id = ?', ['STU06']);
      console.log(`👤 Face Samples: ${faceSamples.length > 0 ? `✅ ${faceSamples.length} samples enrolled` : '❌ Not enrolled'}`);
    } catch (error) {
      console.log('👤 Face Samples: Table not found');
    }
    
    // Check fingerprint enrollment
    console.log('\n🔍 Checking fingerprint enrollment tables...');
    
    // Check fingerprint_enrollments
    try {
      const [fingerprintEnroll] = await dbAdapter.execute('SELECT * FROM fingerprint_enrollments WHERE student_id = ?', ['STU06']);
      console.log(`👆 Fingerprint Enrollment: ${fingerprintEnroll.length > 0 ? '✅ Enrolled' : '❌ Not enrolled'}`);
    } catch (error) {
      console.log('👆 Fingerprint Enrollment: Table not found');
    }
    
    // Check fingerprint_encodings
    try {
      const [fingerprintEncode] = await dbAdapter.execute('SELECT * FROM fingerprint_encodings WHERE student_id = ?', ['STU06']);
      console.log(`👆 Fingerprint Encodings: ${fingerprintEncode.length > 0 ? '✅ Enrolled' : '❌ Not enrolled'}`);
    } catch (error) {
      console.log('👆 Fingerprint Encodings: Table not found');
    }
    
    // Get all enrolled students summary
    console.log('\n📊 All Students Enrollment Summary:');
    const [allStudents] = await dbAdapter.execute('SELECT student_id, name FROM students ORDER BY student_id');
    
    for (const student of allStudents) {
      console.log(`\n👤 ${student.student_id} - ${student.name}:`);
      
      // Check PIN
      if (hasPinField) {
        const [studentWithPin] = await dbAdapter.execute('SELECT pin FROM students WHERE student_id = ?', [student.student_id]);
        const pinStatus = studentWithPin[0]?.pin ? '✅' : '❌';
        console.log(`  📱 PIN: ${pinStatus}`);
      }
      
      // Check face enrollments
      const [photoFaceCheck] = await dbAdapter.execute('SELECT id FROM photo_face_enrollments WHERE student_id = ?', [student.student_id]);
      console.log(`  👤 Face: ${photoFaceCheck.length > 0 ? '✅' : '❌'}`);
      
      // Check fingerprint enrollments
      try {
        const [fingerprintCheck] = await dbAdapter.execute('SELECT id FROM fingerprint_enrollments WHERE student_id = ?', [student.student_id]);
        console.log(`  👆 Fingerprint: ${fingerprintCheck.length > 0 ? '✅' : '❌'}`);
      } catch (error) {
        console.log(`  👆 Fingerprint: ❌ (table not found)`);
      }
    }
    
  } catch (error) {
    console.error('❌ Error checking enrollment status:', error.message);
  }
  
  process.exit(0);
}

checkEnrollmentStatus();