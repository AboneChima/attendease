const { dbAdapter } = require('./config/database-adapter');

async function investigateAttendanceAccuracy() {
  try {
    console.log('🔍 Investigating Attendance Accuracy Issue...\n');
    
    // Initialize database
    await dbAdapter.initialize();
    
    // 1. Check today's attendance records
    console.log('📅 Today\'s Attendance Records:');
    const today = new Date().toISOString().split('T')[0];
    const [todayAttendance] = await dbAdapter.execute(`
      SELECT 
        student_id, 
        status, 
        check_in_time, 
        confidence_score,
        verification_method,
        created_at
      FROM daily_attendance 
      WHERE DATE(created_at) = ? 
      ORDER BY created_at DESC
    `, [today]);
    
    if (todayAttendance.length > 0) {
      todayAttendance.forEach(record => {
        console.log(`  📝 ${record.student_id} - ${record.status} at ${record.check_in_time || 'N/A'}`);
        console.log(`     🎯 Confidence: ${record.confidence_score || 'N/A'} | Method: ${record.verification_method || 'N/A'}`);
        console.log(`     🕐 Recorded: ${record.created_at}\n`);
      });
    } else {
      console.log('  ❌ No attendance records found for today\n');
    }
    
    // 2. Check recent attendance history
    console.log('📊 Recent Attendance History (Last 10 records):');
    const [recentHistory] = await dbAdapter.execute(`
      SELECT 
        ah.student_id,
        s.name,
        ah.status,
        ah.check_in_time,
        ah.confidence_score,
        ah.verification_method,
        ah.created_at
      FROM attendance_history ah
      LEFT JOIN students s ON ah.student_id = s.student_id
      ORDER BY ah.created_at DESC
      LIMIT 10
    `);
    
    if (recentHistory.length > 0) {
      recentHistory.forEach(record => {
        console.log(`  📝 ${record.student_id} (${record.name || 'Unknown'}) - ${record.status}`);
        console.log(`     🕐 Time: ${record.check_in_time || 'N/A'} | Confidence: ${record.confidence_score || 'N/A'}`);
        console.log(`     🔧 Method: ${record.verification_method || 'N/A'} | Recorded: ${record.created_at}\n`);
      });
    } else {
      console.log('  ❌ No attendance history found\n');
    }
    
    // 3. Check STU04 specific details
    console.log('🔍 STU04 (CHIDUBEM INNOCENT) Details:');
    const [stu04Details] = await dbAdapter.execute(`
      SELECT * FROM students WHERE student_id = 'STU04'
    `);
    
    if (stu04Details.length > 0) {
      const student = stu04Details[0];
      console.log(`  👤 Name: ${student.name}`);
      console.log(`  📧 Email: ${student.email}`);
      console.log(`  📅 Created: ${student.created_at}\n`);
    }
    
    // 4. Check STU04 face enrollment quality
    console.log('📸 STU04 Face Enrollment Quality:');
    const [faceEnrollment] = await dbAdapter.execute(`
      SELECT 
        enrollment_date,
        confidence,
        quality_score,
        sample_count,
        average_quality
      FROM photo_face_enrollments 
      WHERE student_id = 'STU04' AND is_active = 1
    `);
    
    if (faceEnrollment.length > 0) {
      faceEnrollment.forEach(enrollment => {
        console.log(`  📊 Quality Score: ${enrollment.quality_score}`);
        console.log(`  🎯 Confidence: ${enrollment.confidence}`);
        console.log(`  📈 Sample Count: ${enrollment.sample_count || 'N/A'}`);
        console.log(`  📊 Average Quality: ${enrollment.average_quality || 'N/A'}`);
        console.log(`  📅 Enrolled: ${enrollment.enrollment_date}\n`);
      });
    } else {
      console.log('  ❌ No face enrollment found for STU04\n');
    }
    
    // 5. Check all students' face enrollment quality for comparison
    console.log('📊 All Students Face Enrollment Quality Comparison:');
    const [allEnrollments] = await dbAdapter.execute(`
      SELECT 
        pfe.student_id,
        s.name,
        pfe.quality_score,
        pfe.confidence,
        pfe.sample_count,
        pfe.average_quality
      FROM photo_face_enrollments pfe
      LEFT JOIN students s ON pfe.student_id = s.student_id
      WHERE pfe.is_active = 1
      ORDER BY pfe.quality_score DESC
    `);
    
    if (allEnrollments.length > 0) {
      allEnrollments.forEach(enrollment => {
        console.log(`  👤 ${enrollment.student_id} (${enrollment.name || 'Unknown'})`);
        console.log(`     📊 Quality: ${enrollment.quality_score} | Confidence: ${enrollment.confidence}`);
        console.log(`     📈 Samples: ${enrollment.sample_count || 'N/A'} | Avg Quality: ${enrollment.average_quality || 'N/A'}\n`);
      });
    }
    
    // 6. Check if there are any face verification logs
    console.log('🔍 Checking for face verification logs...');
    try {
      const [verificationLogs] = await dbAdapter.execute(`
        SELECT * FROM face_verification_logs 
        ORDER BY created_at DESC 
        LIMIT 5
      `);
      
      if (verificationLogs.length > 0) {
        console.log('📋 Recent Face Verification Logs:');
        verificationLogs.forEach(log => {
          console.log(`  🔍 ${log.student_id} - Confidence: ${log.confidence_score}`);
          console.log(`     🎯 Match: ${log.is_match ? 'YES' : 'NO'} | Time: ${log.created_at}\n`);
        });
      } else {
        console.log('  ❌ No face verification logs found\n');
      }
    } catch (error) {
      console.log('  ℹ️ Face verification logs table not found (this is normal)\n');
    }
    
    console.log('✅ Investigation completed!');
    
  } catch (error) {
    console.error('❌ Error during investigation:', error);
  } finally {
    await dbAdapter.close();
  }
}

investigateAttendanceAccuracy();