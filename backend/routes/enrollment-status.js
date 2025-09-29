const express = require('express');
const router = express.Router();
const { dbAdapter } = require('../config/database-adapter');

/**
 * Get all students with their enrollment status for different authentication methods
 * Returns: Array of students with their enrollment status for face, fingerprint, and PIN
 */
router.get('/students', async (req, res) => {
  try {
    console.log('📊 Fetching enrollment status for all students...');
    
    // Get all students
    const [students] = await dbAdapter.execute(`
      SELECT student_id, name, email, phone, created_at
      FROM students 
      ORDER BY student_id ASC
    `);
    
    if (students.length === 0) {
      return res.json({
        success: true,
        students: [],
        message: 'No students found'
      });
    }
    
    // Check if PIN field exists in students table
    const [studentsColumns] = await dbAdapter.execute('PRAGMA table_info(students)');
    const hasPinField = studentsColumns.some(col => col.name === 'pin');
    
    // Prepare enrollment status for each student
    const studentsWithEnrollment = [];
    
    for (const student of students) {
      const enrollmentStatus = {
        student_id: student.student_id,
        name: student.name,
        email: student.email,
        phone: student.phone,
        created_at: student.created_at,
        face_enrolled: false,
        fingerprint_enrolled: false,
        pin_enrolled: false,
        enrollment_methods: {
          face: false,
          fingerprint: false,
          pin: false
        },
        enrollment_details: {
          face: null,
          fingerprint: null,
          pin: null
        }
      };
      
      // Check face enrollment (photo_face_enrollments)
      try {
        const [faceEnrollment] = await dbAdapter.execute(`
          SELECT id, enrollment_date, face_confidence, photo_quality_score, is_active
          FROM photo_face_enrollments 
          WHERE student_id = ? AND is_active = 1
        `, [student.student_id]);
        
        if (faceEnrollment.length > 0) {
          enrollmentStatus.enrollment_methods.face = true;
          enrollmentStatus.face_enrolled = true;
          enrollmentStatus.enrollment_details.face = {
            enrollment_date: faceEnrollment[0].enrollment_date,
            confidence: faceEnrollment[0].face_confidence,
            quality_score: faceEnrollment[0].photo_quality_score
          };
        }
      } catch (error) {
        console.log(`⚠️ Face enrollment check failed for ${student.student_id}:`, error.message);
      }
      
      // Check enhanced face enrollment (if table exists)
      try {
        const [enhancedFaceEnrollment] = await dbAdapter.execute(`
          SELECT student_id, enrollment_timestamp, security_level
          FROM enhanced_face_enrollments 
          WHERE student_id = ?
        `, [student.student_id]);
        
        if (enhancedFaceEnrollment.length > 0) {
          enrollmentStatus.enrollment_methods.face = true;
          enrollmentStatus.face_enrolled = true;
          enrollmentStatus.enrollment_details.face = {
            ...enrollmentStatus.enrollment_details.face,
            enhanced_enrollment: true,
            enrollment_timestamp: enhancedFaceEnrollment[0].enrollment_timestamp,
            security_level: enhancedFaceEnrollment[0].security_level
          };
        }
      } catch (error) {
        // Enhanced face enrollment table doesn't exist, skip
      }
      
      // Check face samples (if table exists)
      try {
        const [faceSamples] = await dbAdapter.execute(`
          SELECT COUNT(*) as sample_count, AVG(quality_score) as avg_quality
          FROM face_samples 
          WHERE student_id = ?
        `, [student.student_id]);
        
        if (faceSamples.length > 0 && faceSamples[0].sample_count > 0) {
          enrollmentStatus.enrollment_methods.face = true;
          enrollmentStatus.enrollment_details.face = {
            ...enrollmentStatus.enrollment_details.face,
            sample_count: faceSamples[0].sample_count,
            average_quality: faceSamples[0].avg_quality
          };
        }
      } catch (error) {
        // Face samples table doesn't exist, skip
      }
      
      // Check fingerprint enrollment (if tables exist)
      try {
        const [fingerprintEnrollment] = await dbAdapter.execute(`
          SELECT id, enrollment_date, enrolled
          FROM fingerprint_enrollments 
          WHERE student_id = ? AND enrolled = 1
        `, [student.student_id]);
        
        if (fingerprintEnrollment.length > 0) {
          enrollmentStatus.enrollment_methods.fingerprint = true;
          enrollmentStatus.fingerprint_enrolled = true;
          enrollmentStatus.enrollment_details.fingerprint = {
            enrollment_date: fingerprintEnrollment[0].enrollment_date
          };
        }
      } catch (error) {
        // Fingerprint enrollment table doesn't exist, skip
      }
      
      // Check fingerprint encodings (if table exists)
      try {
        const [fingerprintEncodings] = await dbAdapter.execute(`
          SELECT credential_id, enrollment_date, counter
          FROM fingerprint_encodings 
          WHERE student_id = ?
        `, [student.student_id]);
        
        if (fingerprintEncodings.length > 0) {
          enrollmentStatus.enrollment_methods.fingerprint = true;
          enrollmentStatus.fingerprint_enrolled = true;
          enrollmentStatus.enrollment_details.fingerprint = {
            ...enrollmentStatus.enrollment_details.fingerprint,
            credential_id: fingerprintEncodings[0].credential_id,
            enrollment_date: fingerprintEncodings[0].enrollment_date,
            counter: fingerprintEncodings[0].counter
          };
        }
      } catch (error) {
        // Fingerprint encodings table doesn't exist, skip
      }
      
      // Check PIN enrollment (if PIN field exists)
      if (hasPinField) {
        try {
          const [studentWithPin] = await dbAdapter.execute(`
            SELECT pin, updated_at
            FROM students 
            WHERE student_id = ? AND pin IS NOT NULL AND pin != ''
          `, [student.student_id]);
          
          if (studentWithPin.length > 0) {
            enrollmentStatus.enrollment_methods.pin = true;
            enrollmentStatus.pin_enrolled = true;
            enrollmentStatus.enrollment_details.pin = {
              enrollment_date: studentWithPin[0].updated_at
            };
          }
        } catch (error) {
          console.log(`⚠️ PIN check failed for ${student.student_id}:`, error.message);
        }
      }
      
      // Calculate overall status
      if (enrollmentStatus.face_enrolled && enrollmentStatus.fingerprint_enrolled && enrollmentStatus.pin_enrolled) {
        enrollmentStatus.overall_status = 'Fully Enrolled';
      } else if (enrollmentStatus.face_enrolled || enrollmentStatus.fingerprint_enrolled || enrollmentStatus.pin_enrolled) {
        enrollmentStatus.overall_status = 'Partially Enrolled';
      } else {
        enrollmentStatus.overall_status = 'Not Enrolled';
      }
      
      studentsWithEnrollment.push(enrollmentStatus);
    }
    
    // Calculate summary statistics
    const summary = {
      total_students: studentsWithEnrollment.length,
      enrolled_face: studentsWithEnrollment.filter(s => s.enrollment_methods.face).length,
      enrolled_fingerprint: studentsWithEnrollment.filter(s => s.enrollment_methods.fingerprint).length,
      enrolled_pin: studentsWithEnrollment.filter(s => s.enrollment_methods.pin).length,
      fully_enrolled: studentsWithEnrollment.filter(s => 
        s.enrollment_methods.face || s.enrollment_methods.fingerprint || s.enrollment_methods.pin
      ).length,
      not_enrolled: studentsWithEnrollment.filter(s => 
        !s.enrollment_methods.face && !s.enrollment_methods.fingerprint && !s.enrollment_methods.pin
      ).length
    };
    
    console.log(`✅ Retrieved enrollment status for ${studentsWithEnrollment.length} students`);
    console.log(`📊 Summary: Face: ${summary.enrolled_face}, Fingerprint: ${summary.enrolled_fingerprint}, PIN: ${summary.enrolled_pin}`);
    
    res.json({
      success: true,
      students: studentsWithEnrollment,
      summary: summary,
      available_methods: {
        face: true,
        fingerprint: false, // Based on current system analysis
        pin: hasPinField
      }
    });
    
  } catch (error) {
    console.error('❌ Error fetching enrollment status:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch enrollment status',
      message: error.message
    });
  }
});

/**
 * Get enrollment status for a specific student
 */
router.get('/students/:student_id', async (req, res) => {
  try {
    const { student_id } = req.params;
    console.log(`🔍 Fetching enrollment status for student: ${student_id}`);
    
    // Get student info
    const [students] = await dbAdapter.execute(`
      SELECT student_id, name, email, phone, created_at
      FROM students 
      WHERE student_id = ?
    `, [student_id]);
    
    if (students.length === 0) {
      return res.status(404).json({
        success: false,
        error: 'Student not found',
        student_id: student_id
      });
    }
    
    const student = students[0];
    
    // Use the same logic as the general endpoint but for single student
    // (Implementation would be similar to above, but for single student)
    // For brevity, calling the general endpoint and filtering
    const allStudentsResponse = await new Promise((resolve, reject) => {
      router.handle({ method: 'GET', url: '/students' }, {
        json: resolve,
        status: () => ({ json: reject })
      });
    });
    
    const studentEnrollment = allStudentsResponse.students.find(s => s.student_id === student_id);
    
    if (!studentEnrollment) {
      return res.status(404).json({
        success: false,
        error: 'Student enrollment data not found',
        student_id: student_id
      });
    }
    
    res.json({
      success: true,
      student: studentEnrollment,
      available_methods: allStudentsResponse.available_methods
    });
    
  } catch (error) {
    console.error(`❌ Error fetching enrollment status for ${req.params.student_id}:`, error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch student enrollment status',
      message: error.message
    });
  }
});

module.exports = router;