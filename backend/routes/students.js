const express = require('express');
const QRCode = require('qrcode');
const { body, validationResult } = require('express-validator');
const { dbAdapter } = require('../config/database-adapter');
const { initializeDailyAttendance } = require('../database/setup-attendance-management');
const { authenticateToken } = require('../middleware/auth');

const router = express.Router();

// Function to log student operations for audit trail
const logStudentOperation = async (auditData) => {
  try {
    const {
      studentId,
      studentName,
      operation, // 'delete', 'update', 'create'
      oldData = null,
      newData = null,
      modifiedBy,
      ipAddress,
      userAgent,
      reason = null
    } = auditData;

    await dbAdapter.execute(`
      INSERT INTO attendance_audit_log (
        student_id, student_name, date, old_status, new_status,
        modified_by, modification_reason, modification_type,
        ip_address, user_agent
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `, [
      studentId,
      studentName,
      new Date().toISOString().split('T')[0], // current date
      oldData ? JSON.stringify(oldData) : null,
      newData ? JSON.stringify(newData) : null,
      modifiedBy,
      reason,
      `student_${operation}`,
      ipAddress,
      userAgent
    ]);

    console.log(`Student audit log created: ${modifiedBy} performed ${operation} on student ${studentId}`);
  } catch (error) {
    console.error('Error logging student operation:', error);
    // Don't throw error to avoid breaking the main operation
  }
};

// Register a new student
router.post('/register', [
  body('student_id').notEmpty().withMessage('Student ID is required'),
  body('name').notEmpty().withMessage('Name is required'),
  body('email').isEmail().withMessage('Valid email is required')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { student_id, name, email, phone } = req.body;

    // Check if student already exists
    const [existingStudents] = await dbAdapter.execute(
      'SELECT student_id, email FROM students WHERE student_id = ? OR email = ?',
      [student_id, email]
    );

    if (existingStudents.length > 0) {
      return res.status(400).json({ error: 'Student ID or email already exists' });
    }

    // Generate QR code data
    const qrData = JSON.stringify({
      student_id,
      name,
      timestamp: Date.now()
    });

    // Generate QR code as base64 string
    const qrCode = await QRCode.toDataURL(qrData);

    // Insert student into database
    await dbAdapter.execute(
      'INSERT INTO students (student_id, name, email, phone, qr_code) VALUES (?, ?, ?, ?, ?)',
      [student_id, name, email, phone || null, qrCode]
    );

    // Add the new student to today's daily attendance
    const today = new Date().toISOString().split('T')[0];
    await dbAdapter.execute(
      'INSERT OR IGNORE INTO daily_attendance (student_id, student_name, date, status) VALUES (?, ?, ?, ?)',
      [student_id, name, today, 'not_yet_here']
    );

    res.status(201).json({
      message: 'Student registered successfully',
      student: {
        student_id,
        name,
        email,
        phone,
        qr_code: qrCode
      }
    });
  } catch (error) {
    console.error('Registration error:', error);
    res.status(500).json({ error: 'Failed to register student' });
  }
});

// Get all students
router.get('/', async (req, res) => {
  try {
    const [students] = await dbAdapter.execute(
      'SELECT id, student_id, name, email, phone, created_at FROM students ORDER BY name ASC'
    );
    
    res.json(students);
  } catch (error) {
    console.error('Get students error:', error);
    res.status(500).json({ error: 'Failed to fetch students' });
  }
});

// Get student by ID
router.get('/:student_id', async (req, res) => {
  try {
    const { student_id } = req.params;
    const [students] = await dbAdapter.execute(
      'SELECT * FROM students WHERE student_id = ?',
      [student_id]
    );

    if (students.length === 0) {
      return res.status(404).json({ error: 'Student not found' });
    }

    res.json(students[0]);
  } catch (error) {
    console.error('Get student error:', error);
    res.status(500).json({ error: 'Failed to fetch student' });
  }
});

// Verify QR code and get student info
router.post('/verify-qr', async (req, res) => {
  try {
    const { qr_data } = req.body;

    if (!qr_data) {
      return res.status(400).json({ error: 'QR data is required' });
    }

    // Parse QR data
    let parsedData;
    try {
      parsedData = JSON.parse(qr_data);
    } catch (parseError) {
      return res.status(400).json({ error: 'Invalid QR code format' });
    }

    const { student_id } = parsedData;

    // Verify student exists
    const [students] = await dbAdapter.execute(
      'SELECT student_id, name, email FROM students WHERE student_id = ?',
      [student_id]
    );

    if (students.length === 0) {
      return res.status(404).json({ error: 'Student not found' });
    }

    const student = students[0];
    res.json({
      valid: true,
      student: {
        student_id: student.student_id,
        name: student.name,
        email: student.email
      }
    });
  } catch (error) {
    console.error('QR verification error:', error);
    res.status(500).json({ error: 'Failed to verify QR code' });
  }
});

// Helper function to calculate Euclidean distance between two face descriptors
function calculateFaceDistance(descriptor1, descriptor2) {
  if (descriptor1.length !== descriptor2.length) {
    return Infinity;
  }
  
  let sum = 0;
  for (let i = 0; i < descriptor1.length; i++) {
    const diff = descriptor1[i] - descriptor2[i];
    sum += diff * diff;
  }
  return Math.sqrt(sum);
}

// Helper function to check if face is already enrolled for another student
async function checkFaceUniqueness(newDescriptor, currentStudentId) {
  try {
    // Get all existing face encodings except for the current student
    const [existingFaces] = await dbAdapter.execute(
      'SELECT student_id, face_descriptor FROM face_encodings WHERE student_id != ?',
      [currentStudentId]
    );
    
    const SIMILARITY_THRESHOLD = 0.8; // Faces with distance < 0.8 are considered the same person
    
    for (const face of existingFaces) {
      const existingDescriptor = JSON.parse(face.face_descriptor);
      const distance = calculateFaceDistance(newDescriptor, existingDescriptor);
      
      console.log(`Face comparison: ${currentStudentId} vs ${face.student_id}, distance: ${distance}`);
      
      if (distance < SIMILARITY_THRESHOLD) {
        return {
          isDuplicate: true,
          existingStudentId: face.student_id,
          similarity: (1 - distance).toFixed(3)
        };
      }
    }
    
    return { isDuplicate: false };
  } catch (error) {
    console.error('Error checking face uniqueness:', error);
    throw error;
  }
}

// Enroll face for a student
router.post('/enroll-face', [
  body('studentId').notEmpty().withMessage('Student ID is required'),
  body('faceDescriptor').isArray().withMessage('Face descriptor must be an array'),
  body('sampleCount').isInt({ min: 1 }).withMessage('Sample count must be a positive integer')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { studentId, faceDescriptor, sampleCount } = req.body;

    // Verify student exists
    const [students] = await dbAdapter.execute(
      'SELECT student_id FROM students WHERE student_id = ?',
      [studentId]
    );

    if (students.length === 0) {
      return res.status(404).json({ error: 'Student not found' });
    }

    // Check face uniqueness - prevent same face from being enrolled for different students
    console.log(`Checking face uniqueness for student: ${studentId}`);
    const uniquenessCheck = await checkFaceUniqueness(faceDescriptor, studentId);
    
    if (uniquenessCheck.isDuplicate) {
      console.log(`⚠️ Duplicate face detected! Face already enrolled for student: ${uniquenessCheck.existingStudentId}`);
      return res.status(409).json({ 
        error: 'Face already enrolled',
        message: `This face is already registered for another student (${uniquenessCheck.existingStudentId}). Each person can only enroll their face once in the system.`,
        existingStudentId: uniquenessCheck.existingStudentId,
        similarity: uniquenessCheck.similarity
      });
    }
    
    console.log(`✅ Face uniqueness verified for student: ${studentId}`);

    // Convert face descriptor to JSON string for storage
    const descriptorJson = JSON.stringify(faceDescriptor);

    // Check if face encoding already exists for this student
    const [existingEncodings] = await dbAdapter.execute(
      'SELECT id FROM face_encodings WHERE student_id = ?',
      [studentId]
    );

    if (existingEncodings.length > 0) {
      // Update existing face encoding
      await dbAdapter.execute(
        'UPDATE face_encodings SET face_descriptor = ?, sample_count = ?, updated_at = CURRENT_TIMESTAMP WHERE student_id = ?',
        [descriptorJson, sampleCount, studentId]
      );
      console.log(`✅ Updated face encoding for student: ${studentId}`);
    } else {
      // Insert new face encoding
      await dbAdapter.execute(
        'INSERT INTO face_encodings (student_id, face_descriptor, sample_count) VALUES (?, ?, ?)',
        [studentId, descriptorJson, sampleCount]
      );
      console.log(`✅ Inserted new face encoding for student: ${studentId}`);
    }

    res.status(201).json({
      message: 'Face enrolled successfully',
      studentId,
      sampleCount
    });
  } catch (error) {
    console.error('Face enrollment error:', error);
    res.status(500).json({ error: 'Failed to enroll face' });
  }
});

// Get face encoding for a student
router.get('/face-encoding/:student_id', async (req, res) => {
  try {
    const { student_id } = req.params;

    const [encodings] = await dbAdapter.execute(
      'SELECT face_descriptor, sample_count, enrollment_date FROM face_encodings WHERE student_id = ?',
      [student_id]
    );

    if (encodings.length === 0) {
      return res.status(404).json({ error: 'Face encoding not found for this student' });
    }

    const encoding = encodings[0];
    res.json({
      studentId: student_id,
      faceDescriptor: JSON.parse(encoding.face_descriptor),
      sampleCount: encoding.sample_count,
      enrollmentDate: encoding.enrollment_date
    });
  } catch (error) {
    console.error('Get face encoding error:', error);
    res.status(500).json({ error: 'Failed to fetch face encoding' });
  }
});

// Get all students with face enrollment status
router.get('/with-face-status', async (req, res) => {
  try {
    const [students] = await dbAdapter.execute(`
      SELECT 
        s.id, 
        s.student_id, 
        s.name, 
        s.email, 
        s.phone, 
        s.created_at,
        CASE WHEN f.student_id IS NOT NULL THEN true ELSE false END as has_face_enrolled,
        f.sample_count,
        f.enrollment_date
      FROM students s
      LEFT JOIN face_encodings f ON s.student_id = f.student_id
      ORDER BY s.name ASC
    `);
    
    res.json(students);
  } catch (error) {
    console.error('Get students with face status error:', error);
    res.status(500).json({ error: 'Failed to fetch students with face status' });
  }
});

// Verify face for attendance
router.post('/verify-face', [
  body('faceDescriptor').isArray().withMessage('Face descriptor must be an array')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { faceDescriptor } = req.body;

    // Get all enrolled face encodings
    const [encodings] = await dbAdapter.execute(`
      SELECT 
        fe.student_id, 
        fe.face_descriptor,
        s.name,
        s.email
      FROM face_encodings fe
      JOIN students s ON fe.student_id = s.student_id
    `);

    if (encodings.length === 0) {
      return res.status(404).json({ error: 'No enrolled faces found' });
    }

    // This is a simplified version - in a real implementation, you would
    // calculate the Euclidean distance between face descriptors
    // For now, we'll return the first match (this should be improved)
    const threshold = 0.6; // Face recognition threshold
    let bestMatch = null;
    let bestDistance = Infinity;

    for (const encoding of encodings) {
      const storedDescriptor = JSON.parse(encoding.face_descriptor);
      
      // Calculate Euclidean distance (simplified)
      let distance = 0;
      for (let i = 0; i < faceDescriptor.length; i++) {
        distance += Math.pow(faceDescriptor[i] - storedDescriptor[i], 2);
      }
      distance = Math.sqrt(distance);

      if (distance < bestDistance && distance < threshold) {
        bestDistance = distance;
        bestMatch = {
          student_id: encoding.student_id,
          name: encoding.name,
          email: encoding.email,
          confidence: 1 - distance // Convert distance to confidence score
        };
      }
    }

    if (bestMatch) {
      res.json({
        valid: true,
        student: bestMatch,
        confidence: bestMatch.confidence
      });
    } else {
      res.status(404).json({ 
        valid: false, 
        error: 'No matching face found' 
      });
    }
  } catch (error) {
    console.error('Face verification error:', error);
    res.status(500).json({ error: 'Failed to verify face' });
  }
});

// Enroll fingerprint for a student
router.post('/enroll-fingerprint', [
  body('studentId').notEmpty().withMessage('Student ID is required'),
  body('credentialId').notEmpty().withMessage('Credential ID is required'),
  body('enrolled').isBoolean().withMessage('Enrolled status is required')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { studentId, credentialId, enrolled, enrollmentDate } = req.body;

    // Verify student exists
    const [students] = await dbAdapter.execute(
      'SELECT student_id FROM students WHERE student_id = ?',
      [studentId]
    );

    if (students.length === 0) {
      return res.status(404).json({ error: 'Student not found' });
    }

    // Check if this credential ID is already enrolled by another student
    const [duplicateCredentials] = await dbAdapter.execute(
      'SELECT student_id FROM fingerprint_enrollments WHERE credential_id = ? AND student_id != ?',
      [credentialId, studentId]
    );

    if (duplicateCredentials.length > 0) {
      console.log(`⚠️ Duplicate fingerprint detected! Credential already enrolled for student: ${duplicateCredentials[0].student_id}`);
      return res.status(409).json({ 
        error: 'Fingerprint already enrolled',
        message: `This fingerprint is already registered for another student (${duplicateCredentials[0].student_id}). Each fingerprint can only be enrolled once in the system.`,
        existingStudentId: duplicateCredentials[0].student_id
      });
    }

    console.log(`✅ Fingerprint uniqueness verified for student: ${studentId}`);

    // Check if fingerprint enrollment already exists for this student
    const [existingEnrollments] = await dbAdapter.execute(
      'SELECT id FROM fingerprint_enrollments WHERE student_id = ?',
      [studentId]
    );

    if (existingEnrollments.length > 0) {
      // Update existing fingerprint enrollment
      await dbAdapter.execute(
        'UPDATE fingerprint_enrollments SET credential_id = ?, enrolled = ?, enrollment_date = ?, updated_at = CURRENT_TIMESTAMP WHERE student_id = ?',
        [credentialId, enrolled, enrollmentDate, studentId]
      );
      console.log(`✅ Updated fingerprint enrollment for student: ${studentId}`);
    } else {
      // Insert new fingerprint enrollment
      await dbAdapter.execute(
        'INSERT INTO fingerprint_enrollments (student_id, credential_id, enrolled, enrollment_date) VALUES (?, ?, ?, ?)',
        [studentId, credentialId, enrolled, enrollmentDate]
      );
      console.log(`✅ Inserted new fingerprint enrollment for student: ${studentId}`);
    }

    res.status(201).json({
      message: 'Fingerprint enrolled successfully',
      studentId,
      enrolled
    });
  } catch (error) {
    console.error('Fingerprint enrollment error:', error);
    res.status(500).json({ error: 'Failed to enroll fingerprint' });
  }
});

// Get fingerprint encoding for a student
router.get('/fingerprint-encoding/:student_id', async (req, res) => {
  try {
    const { student_id } = req.params;

    const [encodings] = await dbAdapter.execute(
      'SELECT credential_id, public_key, counter, enrollment_date FROM fingerprint_encodings WHERE student_id = ?',
      [student_id]
    );

    if (encodings.length === 0) {
      return res.status(404).json({ error: 'Fingerprint encoding not found for this student' });
    }

    const encoding = encodings[0];
    res.json({
      studentId: student_id,
      credentialId: encoding.credential_id,
      publicKey: encoding.public_key,
      counter: encoding.counter,
      enrollmentDate: encoding.enrollment_date
    });
  } catch (error) {
    console.error('Get fingerprint encoding error:', error);
    res.status(500).json({ error: 'Failed to fetch fingerprint encoding' });
  }
});

// Verify fingerprint for attendance
router.post('/verify-fingerprint', [
  body('credentialId').notEmpty().withMessage('Credential ID is required'),
  body('signature').notEmpty().withMessage('Signature is required'),
  body('authenticatorData').notEmpty().withMessage('Authenticator data is required'),
  body('clientDataJSON').notEmpty().withMessage('Client data JSON is required')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { credentialId, signature, authenticatorData, clientDataJSON } = req.body;

    // Find the student with this credential ID
    const [encodings] = await dbAdapter.execute(`
      SELECT 
        fe.student_id, 
        fe.credential_id,
        fe.public_key,
        fe.counter,
        s.name,
        s.email
      FROM fingerprint_encodings fe
      JOIN students s ON fe.student_id = s.student_id
      WHERE fe.credential_id = ?
    `, [credentialId]);

    if (encodings.length === 0) {
      return res.status(404).json({ 
        valid: false, 
        error: 'No matching fingerprint found' 
      });
    }

    const encoding = encodings[0];
    
    // In a real implementation, you would verify the signature using WebAuthn
    // For now, we'll assume the verification is successful if the credential ID matches
    // TODO: Implement proper WebAuthn signature verification
    
    // Update counter (important for replay attack prevention)
    await dbAdapter.execute(
      'UPDATE fingerprint_encodings SET counter = counter + 1 WHERE credential_id = ?',
      [credentialId]
    );

    res.json({
      valid: true,
      student: {
        student_id: encoding.student_id,
        name: encoding.name,
        email: encoding.email
      }
    });
  } catch (error) {
    console.error('Fingerprint verification error:', error);
    res.status(500).json({ error: 'Failed to verify fingerprint' });
  }
});

// Get biometric credentials for a student (for verification)
router.get('/:student_id/biometric-credentials', async (req, res) => {
  try {
    const { student_id } = req.params;

    const [credentials] = await dbAdapter.execute(`
      SELECT credential_id, enrollment_date
      FROM fingerprint_enrollments
      WHERE student_id = ? AND enrolled = true
    `, [student_id]);

    if (credentials.length === 0) {
      return res.status(404).json({ 
        error: 'No biometric credentials found for this student',
        credentials: []
      });
    }

    res.json({
      studentId: student_id,
      credentials: credentials.map(cred => ({
        credentialId: cred.credential_id,
        enrollmentDate: cred.enrollment_date
      }))
    });
  } catch (error) {
    console.error('Get biometric credentials error:', error);
    res.status(500).json({ error: 'Failed to fetch biometric credentials' });
  }
});

// Get all students with fingerprint enrollment status
router.get('/with-fingerprint-status', async (req, res) => {
  try {
    const [students] = await dbAdapter.execute(`
      SELECT 
        s.id, 
        s.student_id, 
        s.name, 
        s.email, 
        s.phone, 
        s.created_at,
        CASE WHEN fp.student_id IS NOT NULL THEN true ELSE false END as has_fingerprint_enrolled,
        fp.enrollment_date
      FROM students s
      LEFT JOIN fingerprint_encodings fp ON s.student_id = fp.student_id
      ORDER BY s.name ASC
    `);
    
    res.json(students);
  } catch (error) {
    console.error('Get students with fingerprint status error:', error);
    res.status(500).json({ error: 'Failed to fetch students with fingerprint status' });
  }
});

// Verify student PIN
router.post('/verify-pin', [
  body('student_id').notEmpty().withMessage('Student ID is required'),
  body('pin').notEmpty().withMessage('PIN is required')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { student_id, pin } = req.body;

    // Get student with PIN
    const [students] = await dbAdapter.execute(
      'SELECT student_id, name, pin FROM students WHERE student_id = ?',
      [student_id]
    );

    if (students.length === 0) {
      return res.status(404).json({ error: 'Student not found' });
    }

    const student = students[0];

    // Check if student has a PIN set
    if (!student.pin) {
      return res.status(400).json({ error: 'PIN not set for this student' });
    }

    // Verify PIN (simple string comparison - in production, use hashed PINs)
    if (student.pin !== pin) {
      return res.status(401).json({ error: 'Invalid PIN' });
    }

    res.json({
      success: true,
      message: 'PIN verified successfully',
      student: {
        student_id: student.student_id,
        name: student.name
      }
    });
  } catch (error) {
    console.error('PIN verification error:', error);
    res.status(500).json({ error: 'Failed to verify PIN' });
  }
});

// Delete a student
router.delete('/:student_id', authenticateToken, async (req, res) => {
  try {
    const { student_id } = req.params;
    const username = req.user?.username || req.user?.email || 'unknown';
    
    // Check if student exists
    const [existingStudents] = await dbAdapter.execute(
      'SELECT * FROM students WHERE student_id = ?',
      [student_id]
    );
    
    if (existingStudents.length === 0) {
      return res.status(404).json({ error: 'Student not found' });
    }
    
    const student = existingStudents[0];
    
    // Delete from all related tables (order matters due to foreign key constraints)
    await dbAdapter.execute('DELETE FROM attendance_audit_log WHERE student_id = ?', [student_id]);
    await dbAdapter.execute('DELETE FROM daily_attendance WHERE student_id = ?', [student_id]);
    await dbAdapter.execute('DELETE FROM attendance WHERE student_id = ?', [student_id]);
    await dbAdapter.execute('DELETE FROM face_encodings WHERE student_id = ?', [student_id]);
    await dbAdapter.execute('DELETE FROM fingerprint_enrollments WHERE student_id = ?', [student_id]);
    await dbAdapter.execute('DELETE FROM students WHERE student_id = ?', [student_id]);
    
    // Log the deletion for audit trail
    await logStudentOperation({
      studentId: student.student_id,
      studentName: student.name,
      operation: 'delete',
      oldData: {
        name: student.name,
        email: student.email,
        phone: student.phone
      },
      modifiedBy: username,
      ipAddress: req.ip || req.connection.remoteAddress,
      userAgent: req.get('User-Agent'),
      reason: 'Student record deletion'
    });
    
    res.json({
      success: true,
      message: 'Student deleted successfully',
      deleted_student: {
        student_id: student.student_id,
        name: student.name
      }
    });
  } catch (error) {
    console.error('Delete student error:', error);
    res.status(500).json({ error: 'Failed to delete student' });
  }
});

// Update a student
router.put('/:student_id', [
  authenticateToken,
  body('name').optional().notEmpty().withMessage('Name cannot be empty'),
  body('email').optional().isEmail().withMessage('Valid email is required'),
  body('phone').optional()
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }
    
    const { student_id } = req.params;
    const { name, email, phone } = req.body;
    const username = req.user?.username || req.user?.email || 'unknown';
    
    // Check if student exists
    const [existingStudents] = await dbAdapter.execute(
      'SELECT * FROM students WHERE student_id = ?',
      [student_id]
    );
    
    if (existingStudents.length === 0) {
      return res.status(404).json({ error: 'Student not found' });
    }
    
    const oldStudent = existingStudents[0];
    
    // Check if email is being changed and if it already exists
    if (email && email !== existingStudents[0].email) {
      const [emailCheck] = await dbAdapter.execute(
        'SELECT student_id FROM students WHERE email = ? AND student_id != ?',
        [email, student_id]
      );
      
      if (emailCheck.length > 0) {
        return res.status(400).json({ error: 'Email already exists for another student' });
      }
    }
    
    // Build update query dynamically
    const updates = [];
    const params = [];
    
    if (name !== undefined) {
      updates.push('name = ?');
      params.push(name);
    }
    
    if (email !== undefined) {
      updates.push('email = ?');
      params.push(email);
    }
    
    if (phone !== undefined) {
      updates.push('phone = ?');
      params.push(phone);
    }
    
    if (updates.length === 0) {
      return res.status(400).json({ error: 'No valid fields to update' });
    }
    
    updates.push('updated_at = CURRENT_TIMESTAMP');
    params.push(student_id);
    
    await dbAdapter.execute(
      `UPDATE students SET ${updates.join(', ')} WHERE student_id = ?`,
      params
    );
    
    // Get updated student data
    const [updatedStudent] = await dbAdapter.execute(
      'SELECT student_id, name, email, phone, created_at, updated_at FROM students WHERE student_id = ?',
      [student_id]
    );
    
    // Log the update for audit trail
    await logStudentOperation({
      studentId: student_id,
      studentName: oldStudent.name,
      operation: 'update',
      oldData: {
        name: oldStudent.name,
        email: oldStudent.email,
        phone: oldStudent.phone
      },
      newData: {
        name: updatedStudent[0].name,
        email: updatedStudent[0].email,
        phone: updatedStudent[0].phone
      },
      modifiedBy: username,
      ipAddress: req.ip || req.connection.remoteAddress,
      userAgent: req.get('User-Agent'),
      reason: 'Student record update'
    });
    
    res.json({
       success: true,
       message: 'Student updated successfully',
       student: updatedStudent[0]
     });
  } catch (error) {
    console.error('Update student error:', error);
    res.status(500).json({ error: 'Failed to update student' });
  }
});

module.exports = router;