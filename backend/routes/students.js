const express = require('express');
const QRCode = require('qrcode');
const { body, validationResult } = require('express-validator');
const { dbAdapter } = require('../config/database-adapter');
const { initializeDailyAttendance } = require('../database/setup-attendance-management');
const { authenticateToken } = require('../middleware/auth');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const axios = require('axios');

// Configure multer for file uploads
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, 'uploads/') // Make sure this directory exists
  },
  filename: function (req, file, cb) {
    cb(null, Date.now() + '-' + Math.round(Math.random() * 1E9) + path.extname(file.originalname))
  }
});

const upload = multer({ 
  storage: storage,
  limits: {
    fileSize: 10 * 1024 * 1024 // 10MB limit
  },
  fileFilter: function (req, file, cb) {
    // Check file type
    if (file.mimetype.startsWith('image/')) {
      cb(null, true);
    } else {
      cb(new Error('Only image files are allowed!'), false);
    }
  }
});

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
    
    // Check if daily attendance record already exists
    const [existingAttendance] = await dbAdapter.execute(
      'SELECT id FROM daily_attendance WHERE student_id = ? AND date = ?',
      [student_id, today]
    );
    
    // Only insert if record doesn't exist
    if (existingAttendance.length === 0) {
      await dbAdapter.execute(
        'INSERT INTO daily_attendance (student_id, student_name, date, status) VALUES (?, ?, ?, ?)',
        [student_id, name, today, 'not_yet_here']
      );
    }

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
      'SELECT id, student_id, name, email, phone, qr_code, created_at FROM students ORDER BY name ASC'
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

// Utility function to normalize face descriptor to consistent range
function normalizeFaceDescriptor(descriptor) {
  // Convert to array if needed
  const desc = Array.isArray(descriptor) ? descriptor : Array.from(descriptor);
  
  // Calculate min and max values
  const min = Math.min(...desc);
  const max = Math.max(...desc);
  const range = max - min;
  
  // Normalize to 0-1 range if not already normalized
  if (range > 2 || min < -0.5 || max > 1.5) {
    console.log(`🔧 Normalizing descriptor: min=${min.toFixed(3)}, max=${max.toFixed(3)}, range=${range.toFixed(3)}`);
    return desc.map(val => (val - min) / range);
  }
  
  // Already normalized or in expected range
  console.log(`✅ Descriptor already normalized: min=${min.toFixed(3)}, max=${max.toFixed(3)}, range=${range.toFixed(3)}`);
  return desc;
}

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
    
    const SIMILARITY_THRESHOLD = 0.6; // Faces with distance < 0.6 are considered the same person (more secure)
    
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
    console.log('🔍 [ENROLLMENT] Starting face enrollment process...');
    
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      console.error('❌ [ENROLLMENT] Validation errors:', errors.array());
      return res.status(400).json({ errors: errors.array() });
    }

    const { studentId, faceDescriptor, sampleCount } = req.body;
    
    console.log('📊 [ENROLLMENT] Request data:');
    console.log('  - Student ID:', studentId);
    console.log('  - Face descriptor type:', typeof faceDescriptor);
    console.log('  - Face descriptor length:', faceDescriptor ? faceDescriptor.length : 'null');
    console.log('  - Sample count:', sampleCount);
    
    // Validate face descriptor
    if (!Array.isArray(faceDescriptor)) {
      console.error('❌ [ENROLLMENT] Face descriptor is not an array:', typeof faceDescriptor);
      return res.status(400).json({ error: 'Face descriptor must be an array' });
    }
    
    if (faceDescriptor.length !== 128) {
      console.error('❌ [ENROLLMENT] Invalid face descriptor length:', faceDescriptor.length, 'expected 128');
      return res.status(400).json({ error: 'Face descriptor must be 128-dimensional' });
    }
    
    // Check if all values are numbers
    const invalidValues = faceDescriptor.filter(val => typeof val !== 'number' || isNaN(val));
    if (invalidValues.length > 0) {
      console.error('❌ [ENROLLMENT] Face descriptor contains invalid values:', invalidValues.length, 'non-numeric values');
      return res.status(400).json({ error: 'Face descriptor must contain only numeric values' });
    }
    
    console.log('✅ [ENROLLMENT] Face descriptor validation passed');
    console.log('📊 [ENROLLMENT] Face descriptor stats:');
    console.log('  - Min value:', Math.min(...faceDescriptor));
    console.log('  - Max value:', Math.max(...faceDescriptor));
    console.log('  - Average:', faceDescriptor.reduce((a, b) => a + b, 0) / faceDescriptor.length);
    console.log('  - First 5 values:', faceDescriptor.slice(0, 5));
    console.log('  - Last 5 values:', faceDescriptor.slice(-5));

    // Verify student exists
    console.log('🔍 [ENROLLMENT] Checking if student exists...');
    const [students] = await dbAdapter.execute(
      'SELECT student_id FROM students WHERE student_id = ?',
      [studentId]
    );

    if (students.length === 0) {
      console.error('❌ [ENROLLMENT] Student not found:', studentId);
      return res.status(404).json({ error: 'Student not found' });
    }
    
    console.log('✅ [ENROLLMENT] Student found');

    // Normalize face descriptor for consistent storage
    console.log('🔧 [ENROLLMENT] Normalizing face descriptor...');
    const normalizedDescriptor = normalizeFaceDescriptor(faceDescriptor);
    console.log('📊 [ENROLLMENT] Normalized descriptor stats:');
    console.log('  - Min value:', Math.min(...normalizedDescriptor));
    console.log('  - Max value:', Math.max(...normalizedDescriptor));
    console.log('  - First 5 normalized values:', normalizedDescriptor.slice(0, 5));

    // Check face uniqueness - prevent same face from being enrolled for different students
    console.log('🔍 [ENROLLMENT] Checking face uniqueness...');
    const uniquenessCheck = await checkFaceUniqueness(normalizedDescriptor, studentId);
    
    if (uniquenessCheck.isDuplicate) {
      console.log(`⚠️ [ENROLLMENT] Duplicate face detected! Face already enrolled for student: ${uniquenessCheck.existingStudentId}`);
      return res.status(409).json({ 
        error: 'Face already enrolled',
        message: `This face is already registered for another student (${uniquenessCheck.existingStudentId}). Each person can only enroll their face once in the system.`,
        existingStudentId: uniquenessCheck.existingStudentId,
        similarity: uniquenessCheck.similarity
      });
    }
    
    console.log(`✅ [ENROLLMENT] Face uniqueness verified for student: ${studentId}`);

    // Convert normalized face descriptor to JSON string for storage
    const descriptorJson = JSON.stringify(normalizedDescriptor);
    console.log('📊 [ENROLLMENT] Normalized face descriptor JSON length:', descriptorJson.length);

    // Check if face encoding already exists for this student
    console.log('🔍 [ENROLLMENT] Checking for existing face encoding...');
    const [existingEncodings] = await dbAdapter.execute(
      'SELECT id FROM face_encodings WHERE student_id = ?',
      [studentId]
    );

    if (existingEncodings.length > 0) {
      console.log('🔄 [ENROLLMENT] Updating existing face encoding...');
      // Update existing face encoding
      await dbAdapter.execute(
        'UPDATE face_encodings SET face_descriptor = ?, sample_count = ?, updated_at = CURRENT_TIMESTAMP WHERE student_id = ?',
        [descriptorJson, sampleCount, studentId]
      );
      console.log(`✅ [ENROLLMENT] Updated face encoding for student: ${studentId}`);
    } else {
      console.log('➕ [ENROLLMENT] Inserting new face encoding...');
      // Insert new face encoding
      await dbAdapter.execute(
        'INSERT INTO face_encodings (student_id, face_descriptor, sample_count) VALUES (?, ?, ?)',
        [studentId, descriptorJson, sampleCount]
      );
      console.log(`✅ [ENROLLMENT] Inserted new face encoding for student: ${studentId}`);
    }

    // Verify the saved data
    console.log('🔍 [ENROLLMENT] Verifying saved face encoding...');
    const [savedEncodings] = await dbAdapter.execute(
      'SELECT face_descriptor FROM face_encodings WHERE student_id = ?',
      [studentId]
    );
    
    if (savedEncodings.length > 0) {
      const savedDescriptor = JSON.parse(savedEncodings[0].face_descriptor);
      console.log('✅ [ENROLLMENT] Verification successful:');
      console.log('  - Saved descriptor length:', savedDescriptor.length);
      console.log('  - First 5 saved values:', savedDescriptor.slice(0, 5));
      console.log('  - Match with normalized:', JSON.stringify(savedDescriptor.slice(0, 5)) === JSON.stringify(normalizedDescriptor.slice(0, 5)));
    } else {
      console.error('❌ [ENROLLMENT] Failed to verify saved encoding');
    }

    console.log('🎉 [ENROLLMENT] Face enrollment completed successfully for student:', studentId);
    res.status(201).json({
      message: 'Face enrolled successfully',
      studentId,
      sampleCount
    });
  } catch (error) {
    console.error('❌ [ENROLLMENT] Face enrollment error:', error);
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
    console.log('🔍 [VERIFICATION] Starting face verification process...');
    
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      console.error('❌ [VERIFICATION] Validation errors:', errors.array());
      return res.status(400).json({ errors: errors.array() });
    }

    const { faceDescriptor } = req.body;
    
    console.log('📊 [VERIFICATION] Request data:');
    console.log('  - Face descriptor type:', typeof faceDescriptor);
    console.log('  - Face descriptor length:', faceDescriptor ? faceDescriptor.length : 'null');
    
    // Validate face descriptor
    if (!Array.isArray(faceDescriptor)) {
      console.error('❌ [VERIFICATION] Face descriptor is not an array:', typeof faceDescriptor);
      return res.status(400).json({ error: 'Face descriptor must be an array' });
    }
    
    if (faceDescriptor.length !== 128) {
      console.error('❌ [VERIFICATION] Invalid face descriptor length:', faceDescriptor.length, 'expected 128');
      return res.status(400).json({ error: 'Face descriptor must be 128-dimensional' });
    }
    
    console.log('✅ [VERIFICATION] Face descriptor validation passed');
    console.log('📊 [VERIFICATION] Face descriptor stats:');
    console.log('  - Min value:', Math.min(...faceDescriptor));
    console.log('  - Max value:', Math.max(...faceDescriptor));
    console.log('  - Average:', faceDescriptor.reduce((a, b) => a + b, 0) / faceDescriptor.length);
    console.log('  - First 5 values:', faceDescriptor.slice(0, 5));

    // Normalize face descriptor for consistent comparison
    console.log('🔧 [VERIFICATION] Normalizing face descriptor...');
    const normalizedFaceDescriptor = normalizeFaceDescriptor(faceDescriptor);
    console.log('📊 [VERIFICATION] Normalized descriptor stats:');
    console.log('  - Min value:', Math.min(...normalizedFaceDescriptor));
    console.log('  - Max value:', Math.max(...normalizedFaceDescriptor));
    console.log('  - First 5 normalized values:', normalizedFaceDescriptor.slice(0, 5));

    // Get all enrolled face encodings
    console.log('🔍 [VERIFICATION] Retrieving enrolled face encodings...');
    const [encodings] = await dbAdapter.execute(`
      SELECT 
        fe.student_id, 
        fe.face_descriptor,
        s.name,
        s.email
      FROM face_encodings fe
      JOIN students s ON fe.student_id = s.student_id
    `);

    console.log('📊 [VERIFICATION] Found', encodings.length, 'enrolled face encodings');

    if (encodings.length === 0) {
      console.log('⚠️ [VERIFICATION] No enrolled faces found');
      return res.json({ 
        valid: false, 
        error: 'No enrolled faces found',
        message: 'No students have enrolled their faces yet. Please enroll a face first.'
      });
    }

    // Face recognition threshold (lower = more strict)
    // Secure threshold for face-api.js normalized descriptors
    const threshold = 0.6;
    console.log('📊 [VERIFICATION] Using threshold:', threshold);
    
    let bestMatch = null;
    let bestDistance = Infinity;
    const allDistances = [];

    console.log('🔍 [VERIFICATION] Comparing with enrolled faces...');
    for (let i = 0; i < encodings.length; i++) {
      const encoding = encodings[i];
      console.log(`  - Checking student ${i + 1}/${encodings.length}: ${encoding.name} (${encoding.student_id})`);
      
      let storedDescriptor;
      try {
        storedDescriptor = JSON.parse(encoding.face_descriptor);
      } catch (parseError) {
        console.error(`❌ [VERIFICATION] Failed to parse stored descriptor for ${encoding.student_id}:`, parseError);
        continue;
      }
      
      console.log(`    - Stored descriptor length: ${storedDescriptor.length}`);
      console.log(`    - First 5 stored values: ${storedDescriptor.slice(0, 5)}`);
      
      if (storedDescriptor.length !== 128) {
        console.error(`❌ [VERIFICATION] Invalid stored descriptor length for ${encoding.student_id}: ${storedDescriptor.length}`);
        continue;
      }
      
      // Normalize stored descriptor for consistent comparison
      const normalizedStoredDescriptor = normalizeFaceDescriptor(storedDescriptor);
      console.log(`    - First 5 normalized stored values: ${normalizedStoredDescriptor.slice(0, 5)}`);
      
      // Calculate Euclidean distance using normalized descriptors
      let distance = 0;
      for (let j = 0; j < normalizedFaceDescriptor.length; j++) {
        distance += Math.pow(normalizedFaceDescriptor[j] - normalizedStoredDescriptor[j], 2);
      }
      distance = Math.sqrt(distance);
      
      console.log(`    - Calculated distance: ${distance.toFixed(4)}`);
      console.log(`    - Below threshold (${threshold}): ${distance < threshold}`);
      
      allDistances.push({
        student_id: encoding.student_id,
        name: encoding.name,
        distance: distance
      });

      if (distance < bestDistance) {
        bestDistance = distance;
        if (distance < threshold) {
          bestMatch = {
            student_id: encoding.student_id,
            name: encoding.name,
            email: encoding.email,
            confidence: Math.max(0, 1 - distance) // Convert distance to confidence score
          };
          console.log(`    - ✅ New best match: ${encoding.name} (distance: ${distance.toFixed(4)})`);
        } else {
          console.log(`    - ⚠️ Best distance but above threshold: ${distance.toFixed(4)} > ${threshold}`);
        }
      }
    }

    console.log('📊 [VERIFICATION] All distances:');
    allDistances.forEach(d => {
      console.log(`  - ${d.name} (${d.student_id}): ${d.distance.toFixed(4)}`);
    });
    
    console.log('📊 [VERIFICATION] Best distance:', bestDistance.toFixed(4));
    console.log('📊 [VERIFICATION] Threshold:', threshold);

    if (bestMatch) {
      console.log('✅ [VERIFICATION] Match found:', bestMatch.name, 'with confidence:', bestMatch.confidence.toFixed(4));
      res.json({
        valid: true,
        student: bestMatch,
        confidence: bestMatch.confidence
      });
    } else {
      console.log('❌ [VERIFICATION] No matching face found (best distance:', bestDistance.toFixed(4), '> threshold:', threshold, ')');
      res.json({ 
        valid: false, 
        error: 'No matching face found',
        debug: {
          bestDistance: bestDistance,
          threshold: threshold,
          totalEncodings: encodings.length
        }
      });
    }
  } catch (error) {
    console.error('❌ [VERIFICATION] Face verification error:', error);
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
    
    // Clean up face enrollment data from Python backend first
    try {
      const pythonBackendUrl = 'http://localhost:8000';
      
      await axios.delete(`${pythonBackendUrl}/api/face/enroll/${student_id}`);
      console.log(`✅ Deleted face enrollment from Python backend for student ${student_id}`);
    } catch (error) {
      if (error.response && error.response.status === 404) {
        console.log(`ℹ️ No face enrollment found in Python backend for student ${student_id}`);
      } else {
        console.error(`⚠️ Error deleting from Python backend:`, error.message);
        // Continue with cleanup even if Python backend call fails
      }
    }
    
    // Clean up uploaded files before deleting database records
    try {
      // Get photo paths from photo_face_enrollments table
      const [photoEnrollments] = await dbAdapter.execute(
        'SELECT photo_path FROM photo_face_enrollments WHERE student_id = ?',
        [student_id]
      );
      
      // Delete photo files
      for (const enrollment of photoEnrollments) {
        if (enrollment.photo_path && fs.existsSync(enrollment.photo_path)) {
          try {
            fs.unlinkSync(enrollment.photo_path);
            console.log(`✅ Deleted photo file: ${enrollment.photo_path}`);
          } catch (fileError) {
            console.error(`⚠️ Could not delete photo file ${enrollment.photo_path}:`, fileError.message);
          }
        }
      }
    } catch (error) {
      console.error('⚠️ Error during file cleanup:', error.message);
      // Continue with database cleanup even if file cleanup fails
    }
    
    // Delete from all related tables (order matters due to foreign key constraints)
    // Use safe deletion that handles missing tables gracefully
    const tablesToClean = [
      'verification_attempts',      // Verification attempt logs
      'attendance_audit_log',       // Audit trail logs
      // Note: attendance_history and attendance_sessions are summary tables without student_id, so we skip them
      'daily_attendance',           // Daily attendance tracking
      'attendance',                 // Main attendance records
      'face_samples',               // Enhanced face enrollment samples
      'face_enrollment_sessions',   // Enhanced face enrollment sessions
      'face_encodings',             // Legacy face encodings
      'enhanced_face_enrollments',  // Enhanced face enrollment data
      'fingerprint_enrollments',    // Fingerprint biometric data
      'photo_face_enrollments'      // Photo-based face enrollments
    ];
    
    for (const table of tablesToClean) {
      try {
        await dbAdapter.execute(`DELETE FROM ${table} WHERE student_id = ?`, [student_id]);
        console.log(`✅ Cleaned ${table} for student ${student_id}`);
      } catch (error) {
        if (error.code === 'SQLITE_ERROR' && error.message.includes('no such table')) {
          console.log(`⚠️ Table ${table} does not exist, skipping...`);
        } else {
          console.error(`❌ Error cleaning ${table}:`, error);
          throw error; // Re-throw non-table-missing errors
        }
      }
    }
    
    // Delete the main student record last
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

// Enhanced face enrollment with liveness detection and quality control
router.post('/enroll-enhanced-face', [
  body('studentId').notEmpty().withMessage('Student ID is required'),
  body('primaryDescriptor').isArray().withMessage('Primary descriptor must be an array'),
  body('alternativeDescriptors').isArray().withMessage('Alternative descriptors must be an array'),
  body('qualityMetrics').isObject().withMessage('Quality metrics must be an object'),
  body('livenessResults').isArray().withMessage('Liveness results must be an array')
], async (req, res) => {
  try {
    console.log('🔍 [ENHANCED-ENROLLMENT] Starting enhanced face enrollment process...');
    
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      console.error('❌ [ENHANCED-ENROLLMENT] Validation errors:', errors.array());
      return res.status(400).json({ 
        error: 'Validation failed', 
        details: errors.array() 
      });
    }

    const { 
      studentId, 
      primaryDescriptor, 
      alternativeDescriptors, 
      qualityMetrics, 
      livenessResults,
      referenceImages,
      enrollmentTimestamp 
    } = req.body;

    // Validate student exists
    const student = await dbAdapter.get('SELECT * FROM students WHERE student_id = ?', [studentId]);
    if (!student) {
      console.error('❌ [ENHANCED-ENROLLMENT] Student not found:', studentId);
      return res.status(404).json({ error: 'Student not found' });
    }

    // Validate liveness detection passed
    const livenessPassRate = livenessResults.filter(r => r.success).length / livenessResults.length;
    if (livenessPassRate < 0.8) {
      console.error('❌ [ENHANCED-ENROLLMENT] Liveness detection failed:', livenessPassRate);
      return res.status(400).json({ 
        error: 'Liveness detection failed',
        message: 'Insufficient liveness verification. Please retry enrollment.'
      });
    }

    // Validate quality metrics
    if (qualityMetrics.averageQuality < 0.7) {
      console.error('❌ [ENHANCED-ENROLLMENT] Quality too low:', qualityMetrics.averageQuality);
      return res.status(400).json({ 
        error: 'Quality too low',
        message: 'Face quality is insufficient for reliable recognition. Please retry with better lighting and positioning.'
      });
    }

    // Validate descriptors
    if (!Array.isArray(primaryDescriptor) || primaryDescriptor.length !== 128) {
      console.error('❌ [ENHANCED-ENROLLMENT] Invalid primary descriptor');
      return res.status(400).json({ error: 'Invalid primary face descriptor' });
    }

    for (let i = 0; i < alternativeDescriptors.length; i++) {
      if (!Array.isArray(alternativeDescriptors[i]) || alternativeDescriptors[i].length !== 128) {
        console.error('❌ [ENHANCED-ENROLLMENT] Invalid alternative descriptor:', i);
        return res.status(400).json({ error: `Invalid alternative descriptor ${i}` });
      }
    }

    console.log('✅ [ENHANCED-ENROLLMENT] All validations passed');

    // Normalize descriptors
    const normalizedPrimary = normalizeDescriptor(primaryDescriptor);
    const normalizedAlternatives = alternativeDescriptors.map(desc => normalizeDescriptor(desc));

    // Check face uniqueness against all descriptors
    console.log('🔍 [ENHANCED-ENROLLMENT] Checking face uniqueness...');
    const allDescriptors = [normalizedPrimary, ...normalizedAlternatives];
    
    for (const descriptor of allDescriptors) {
      const uniquenessCheck = await checkFaceUniqueness(descriptor, studentId);
      if (!uniquenessCheck.isUnique) {
        console.log(`⚠️ [ENHANCED-ENROLLMENT] Duplicate face detected! Face already enrolled for student: ${uniquenessCheck.existingStudentId}`);
        return res.status(409).json({
          error: 'Face already enrolled',
          message: `This face is already registered for another student (${uniquenessCheck.existingStudentId}). Each person can only enroll their face once in the system.`,
          existingStudentId: uniquenessCheck.existingStudentId
        });
      }
    }

    console.log(`✅ [ENHANCED-ENROLLMENT] Face uniqueness verified for student: ${studentId}`);

    // Prepare enhanced enrollment data
    const enhancedEnrollmentData = {
      primaryDescriptor: JSON.stringify(normalizedPrimary),
      alternativeDescriptors: JSON.stringify(normalizedAlternatives),
      qualityMetrics: JSON.stringify(qualityMetrics),
      livenessResults: JSON.stringify(livenessResults),
      referenceImages: referenceImages ? JSON.stringify(referenceImages) : null,
      enrollmentTimestamp: enrollmentTimestamp || Date.now(),
      enrollmentVersion: '2.0', // Enhanced version
      securityLevel: 'high'
    };

    // Check if enhanced enrollment already exists
    const existingEnhanced = await dbAdapter.get(
      'SELECT * FROM enhanced_face_enrollments WHERE student_id = ?',
      [studentId]
    );

    if (existingEnhanced) {
      console.log('🔄 [ENHANCED-ENROLLMENT] Updating existing enhanced enrollment...');
      await dbAdapter.execute(`
        UPDATE enhanced_face_enrollments 
        SET primary_descriptor = ?, alternative_descriptors = ?, quality_metrics = ?, 
            liveness_results = ?, reference_images = ?, enrollment_timestamp = ?,
            enrollment_version = ?, security_level = ?, updated_at = CURRENT_TIMESTAMP
        WHERE student_id = ?
      `, [
        enhancedEnrollmentData.primaryDescriptor,
        enhancedEnrollmentData.alternativeDescriptors,
        enhancedEnrollmentData.qualityMetrics,
        enhancedEnrollmentData.livenessResults,
        enhancedEnrollmentData.referenceImages,
        enhancedEnrollmentData.enrollmentTimestamp,
        enhancedEnrollmentData.enrollmentVersion,
        enhancedEnrollmentData.securityLevel,
        studentId
      ]);
      console.log(`✅ [ENHANCED-ENROLLMENT] Updated enhanced enrollment for student: ${studentId}`);
    } else {
      console.log('➕ [ENHANCED-ENROLLMENT] Creating new enhanced enrollment...');
      await dbAdapter.execute(`
        INSERT INTO enhanced_face_enrollments (
          student_id, primary_descriptor, alternative_descriptors, quality_metrics,
          liveness_results, reference_images, enrollment_timestamp, enrollment_version,
          security_level, created_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP)
      `, [
        studentId,
        enhancedEnrollmentData.primaryDescriptor,
        enhancedEnrollmentData.alternativeDescriptors,
        enhancedEnrollmentData.qualityMetrics,
        enhancedEnrollmentData.livenessResults,
        enhancedEnrollmentData.referenceImages,
        enhancedEnrollmentData.enrollmentTimestamp,
        enhancedEnrollmentData.enrollmentVersion,
        enhancedEnrollmentData.securityLevel
      ]);
      console.log(`✅ [ENHANCED-ENROLLMENT] Created enhanced enrollment for student: ${studentId}`);
    }

    // Also update the legacy face_encodings table for backward compatibility
    const legacyDescriptorJson = JSON.stringify(normalizedPrimary);
    const existingLegacy = await dbAdapter.get(
      'SELECT * FROM face_encodings WHERE student_id = ?',
      [studentId]
    );

    if (existingLegacy) {
      await dbAdapter.execute(
        'UPDATE face_encodings SET face_descriptor = ?, sample_count = ?, enrollment_date = CURRENT_TIMESTAMP WHERE student_id = ?',
        [legacyDescriptorJson, alternativeDescriptors.length + 1, studentId]
      );
    } else {
      await dbAdapter.execute(
        'INSERT INTO face_encodings (student_id, face_descriptor, sample_count, enrollment_date) VALUES (?, ?, ?, CURRENT_TIMESTAMP)',
        [studentId, legacyDescriptorJson, alternativeDescriptors.length + 1]
      );
    }

    console.log('🎉 [ENHANCED-ENROLLMENT] Enhanced face enrollment completed successfully for student:', studentId);
    
    res.json({
      success: true,
      message: 'Enhanced face enrollment completed successfully',
      enrollmentData: {
        studentId,
        qualityScore: qualityMetrics.averageQuality,
        livenessPassRate,
        samplesCount: alternativeDescriptors.length + 1,
        securityLevel: 'high',
        enrollmentVersion: '2.0'
      }
    });

  } catch (error) {
    console.error('❌ [ENHANCED-ENROLLMENT] Enhanced face enrollment error:', error);
    res.status(500).json({ error: 'Failed to complete enhanced face enrollment' });
  }
});

// Enhanced face verification with multiple descriptor matching
router.post('/verify-enhanced-face', [
  body('faceDescriptor').isArray().withMessage('Face descriptor must be an array')
], async (req, res) => {
  try {
    console.log('🔍 [ENHANCED-VERIFICATION] Starting enhanced face verification...');
    
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ 
        error: 'Validation failed', 
        details: errors.array() 
      });
    }

    const { faceDescriptor } = req.body;

    if (!Array.isArray(faceDescriptor) || faceDescriptor.length !== 128) {
      return res.status(400).json({ error: 'Invalid face descriptor format' });
    }

    const normalizedDescriptor = normalizeDescriptor(faceDescriptor);

    // Get all enhanced enrollments
    const enhancedEnrollments = await dbAdapter.all(`
      SELECT e.*, s.name, s.email 
      FROM enhanced_face_enrollments e
      JOIN students s ON e.student_id = s.student_id
      WHERE e.security_level = 'high'
    `);

    if (enhancedEnrollments.length === 0) {
      return res.status(404).json({
        valid: false,
        error: 'No enhanced enrollments found',
        message: 'No students have completed enhanced face enrollment yet.'
      });
    }

    console.log('📊 [ENHANCED-VERIFICATION] Found', enhancedEnrollments.length, 'enhanced enrollments');

    let bestMatch = null;
    let bestDistance = Infinity;
    const ENHANCED_THRESHOLD = 4.2; // Stricter threshold for enhanced verification

    // Compare against all enrolled faces
    for (const enrollment of enhancedEnrollments) {
      try {
        // Parse descriptors
        const primaryDescriptor = JSON.parse(enrollment.primary_descriptor);
        const alternativeDescriptors = JSON.parse(enrollment.alternative_descriptors);
        
        // Check against primary descriptor
        const primaryDistance = calculateEuclideanDistance(normalizedDescriptor, primaryDescriptor);
        
        if (primaryDistance < bestDistance) {
          bestDistance = primaryDistance;
          bestMatch = {
            student_id: enrollment.student_id,
            name: enrollment.name,
            email: enrollment.email,
            matchType: 'primary',
            distance: primaryDistance,
            qualityMetrics: JSON.parse(enrollment.quality_metrics)
          };
        }

        // Check against alternative descriptors
        alternativeDescriptors.forEach((altDescriptor, index) => {
          const altDistance = calculateEuclideanDistance(normalizedDescriptor, altDescriptor);
          
          if (altDistance < bestDistance) {
            bestDistance = altDistance;
            bestMatch = {
              student_id: enrollment.student_id,
              name: enrollment.name,
              email: enrollment.email,
              matchType: `alternative_${index}`,
              distance: altDistance,
              qualityMetrics: JSON.parse(enrollment.quality_metrics)
            };
          }
        });

      } catch (parseError) {
        console.error('❌ [ENHANCED-VERIFICATION] Error parsing descriptors for student:', enrollment.student_id, parseError);
        continue;
      }
    }

    console.log('🎯 [ENHANCED-VERIFICATION] Best match distance:', bestDistance, 'threshold:', ENHANCED_THRESHOLD);

    if (bestMatch && bestDistance <= ENHANCED_THRESHOLD) {
      console.log('✅ [ENHANCED-VERIFICATION] Enhanced verification successful for student:', bestMatch.student_id);
      
      // Calculate confidence score (inverse of distance, normalized)
      const confidence = Math.max(0, Math.min(1, 1 - (bestDistance / 6)));
      
      res.json({
        valid: true,
        student: {
          student_id: bestMatch.student_id,
          name: bestMatch.name,
          email: bestMatch.email
        },
        confidence: Math.round(confidence * 100) / 100,
        matchDetails: {
          distance: Math.round(bestDistance * 10000) / 10000,
          matchType: bestMatch.matchType,
          threshold: ENHANCED_THRESHOLD,
          securityLevel: 'high'
        }
      });
    } else {
      console.log('❌ [ENHANCED-VERIFICATION] No valid match found. Best distance:', bestDistance);
      res.json({
        valid: false,
        message: 'No matching face found',
        details: {
          bestDistance: bestDistance !== Infinity ? Math.round(bestDistance * 10000) / 10000 : null,
          threshold: ENHANCED_THRESHOLD,
          securityLevel: 'high'
        }
      });
    }

  } catch (error) {
    console.error('❌ [ENHANCED-VERIFICATION] Enhanced verification error:', error);
    res.status(500).json({ error: 'Enhanced face verification failed' });
  }
});

// Photo-based face enrollment using DeepFace Python service
router.post('/enroll-photo', upload.single('photo'), async (req, res) => {
  try {
    console.log('🔍 [PHOTO-ENROLLMENT] Starting photo-based face enrollment...');
    
    const { student_id, model_name = 'Facenet512' } = req.body;
    
    if (!student_id) {
      return res.status(400).json({ error: 'Student ID is required' });
    }
    
    if (!req.file) {
      return res.status(400).json({ error: 'Photo file is required' });
    }
    
    console.log('📊 [PHOTO-ENROLLMENT] Request data:');
    console.log('  - Student ID:', student_id);
    console.log('  - Model:', model_name);
    console.log('  - File size:', req.file.size);
    console.log('  - File type:', req.file.mimetype);
    
    // Check if student exists
    const [students] = await dbAdapter.execute(
      'SELECT student_id, name FROM students WHERE student_id = ?',
      [student_id]
    );
    
    if (students.length === 0) {
      return res.status(404).json({ error: 'Student not found' });
    }
    
    try {
      // Forward request to DeepFace Python service
      const FormData = require('form-data');
      const axios = require('axios');
      const fs = require('fs');
      
      const formData = new FormData();
      formData.append('student_id', student_id);
      formData.append('model_name', model_name);
      formData.append('photo', fs.createReadStream(req.file.path), {
        filename: req.file.originalname,
        contentType: req.file.mimetype
      });
      
      console.log('📤 [PHOTO-ENROLLMENT] Forwarding to DeepFace service...');
      
      const deepfaceResponse = await axios.post('http://localhost:8000/api/face/enroll', formData, {
        headers: {
          ...formData.getHeaders(),
        },
        timeout: 30000 // 30 second timeout
      });
      
      console.log('✅ [PHOTO-ENROLLMENT] DeepFace enrollment successful');
      console.log('📊 [PHOTO-ENROLLMENT] Response:', deepfaceResponse.data);
      
      // Clean up uploaded file
      try {
        fs.unlinkSync(req.file.path);
      } catch (cleanupError) {
        console.warn('⚠️ [PHOTO-ENROLLMENT] Failed to cleanup temp file:', cleanupError.message);
      }
      
      res.json({
        success: true,
        message: 'Photo enrollment completed successfully',
        student: {
          student_id: student_id,
          name: students[0].name
        },
        enrollment: deepfaceResponse.data
      });
      
    } catch (deepfaceError) {
      console.error('❌ [PHOTO-ENROLLMENT] DeepFace service error:', deepfaceError.message);
      
      // Clean up uploaded file on error
      try {
        fs.unlinkSync(req.file.path);
      } catch (cleanupError) {
        console.warn('⚠️ [PHOTO-ENROLLMENT] Failed to cleanup temp file:', cleanupError.message);
      }
      
      if (deepfaceError.response) {
        // DeepFace service returned an error response
        return res.status(deepfaceError.response.status).json({
          error: 'Photo enrollment failed',
          details: deepfaceError.response.data
        });
      } else if (deepfaceError.code === 'ECONNREFUSED') {
        return res.status(503).json({
          error: 'DeepFace service unavailable',
          message: 'Please ensure the Python backend is running on port 8000'
        });
      } else {
        return res.status(500).json({
          error: 'Photo enrollment failed',
          message: deepfaceError.message
        });
      }
    }
    
  } catch (error) {
    console.error('❌ [PHOTO-ENROLLMENT] Enrollment error:', error);
    
    // Clean up uploaded file on error
    if (req.file) {
      try {
        fs.unlinkSync(req.file.path);
      } catch (cleanupError) {
        console.warn('⚠️ [PHOTO-ENROLLMENT] Failed to cleanup temp file:', cleanupError.message);
      }
    }
    
    res.status(500).json({ error: 'Photo enrollment failed' });
  }
});

// Photo-based face verification using DeepFace Python service
router.post('/verify-photo', upload.single('photo'), async (req, res) => {
  try {
    console.log('🔍 [PHOTO-VERIFICATION] Starting photo-based face verification...');
    
    const { model_name = 'Facenet512' } = req.body;
    
    if (!req.file) {
      return res.status(400).json({ error: 'Photo file is required' });
    }
    
    console.log('📊 [PHOTO-VERIFICATION] Request data:');
    console.log('  - Model:', model_name);
    console.log('  - File size:', req.file.size);
    console.log('  - File type:', req.file.mimetype);
    
    try {
      // Forward request to DeepFace Python service
      const FormData = require('form-data');
      const axios = require('axios');
      const fs = require('fs');
      
      const formData = new FormData();
      formData.append('model_name', model_name);
      formData.append('photo', fs.createReadStream(req.file.path), {
        filename: req.file.originalname,
        contentType: req.file.mimetype
      });
      
      console.log('📤 [PHOTO-VERIFICATION] Forwarding to DeepFace service...');
      
      const deepfaceResponse = await axios.post('http://localhost:8000/api/face/verify', formData, {
        headers: {
          ...formData.getHeaders(),
        },
        timeout: 30000 // 30 second timeout
      });
      
      console.log('✅ [PHOTO-VERIFICATION] DeepFace verification successful');
      console.log('📊 [PHOTO-VERIFICATION] Response:', deepfaceResponse.data);
      
      // Clean up uploaded file
      try {
        fs.unlinkSync(req.file.path);
      } catch (cleanupError) {
        console.warn('⚠️ [PHOTO-VERIFICATION] Failed to cleanup temp file:', cleanupError.message);
      }
      
      res.json({
        success: true,
        verification: deepfaceResponse.data
      });
      
    } catch (deepfaceError) {
      console.error('❌ [PHOTO-VERIFICATION] DeepFace service error:', deepfaceError.message);
      
      // Clean up uploaded file on error
      try {
        fs.unlinkSync(req.file.path);
      } catch (cleanupError) {
        console.warn('⚠️ [PHOTO-VERIFICATION] Failed to cleanup temp file:', cleanupError.message);
      }
      
      if (deepfaceError.response) {
        // DeepFace service returned an error response
        return res.status(deepfaceError.response.status).json({
          error: 'Photo verification failed',
          details: deepfaceError.response.data
        });
      } else if (deepfaceError.code === 'ECONNREFUSED') {
        return res.status(503).json({
          error: 'DeepFace service unavailable',
          message: 'Please ensure the Python backend is running on port 8000'
        });
      } else {
        return res.status(500).json({
          error: 'Photo verification failed',
          message: deepfaceError.message
        });
      }
    }
    
  } catch (error) {
    console.error('❌ [PHOTO-VERIFICATION] Verification error:', error);
    
    // Clean up uploaded file on error
    if (req.file) {
      try {
        fs.unlinkSync(req.file.path);
      } catch (cleanupError) {
        console.warn('⚠️ [PHOTO-VERIFICATION] Failed to cleanup temp file:', cleanupError.message);
      }
    }
    
    res.status(500).json({ error: 'Photo verification failed' });
  }
});

// Live camera verification with attendance marking
router.post('/verify-live', upload.single('photo'), async (req, res) => {
  const axios = require('axios');
  try {
    console.log('🎥 [LIVE-VERIFICATION] Starting live camera verification...');
    
    const { student_id } = req.body;
    
    if (!student_id) {
      return res.status(400).json({ error: 'Student ID is required' });
    }
    
    if (!req.file) {
      return res.status(400).json({ error: 'Photo file is required' });
    }
    
    console.log('📊 [LIVE-VERIFICATION] Request data:');
    console.log('  - Student ID:', student_id);
    console.log('  - File size:', req.file.size);
    console.log('  - File type:', req.file.mimetype);
    
    // Check if student exists and has enrolled photos
    const student = await dbAdapter.get('SELECT * FROM students WHERE student_id = ?', [student_id]);
    
    if (!student) {
      // Clean up uploaded file
      try {
        fs.unlinkSync(req.file.path);
      } catch (cleanupError) {
        console.warn('⚠️ [LIVE-VERIFICATION] Failed to cleanup temp file:', cleanupError.message);
      }
      
      return res.status(404).json({
        success: false,
        verified: false,
        error: 'Student not found',
        message: 'No student found with this ID. Please check your student ID.'
      });
    }
    
    // Check if student has enrolled face data
    const enrollments = await dbAdapter.all('SELECT * FROM photo_face_enrollments WHERE student_id = ?', [student_id]);
    
    if (enrollments.length === 0) {
      // Clean up uploaded file
      try {
        fs.unlinkSync(req.file.path);
      } catch (cleanupError) {
        console.warn('⚠️ [LIVE-VERIFICATION] Failed to cleanup temp file:', cleanupError.message);
      }
      
      return res.status(400).json({
        success: false,
        verified: false,
        error: 'No enrollment found',
        message: 'No face enrollment found for this student. Please enroll your photo first.'
      });
    }
    
    console.log(`📋 [LIVE-VERIFICATION] Found ${enrollments.length} enrollment(s) for student ${student_id}`);
    
    try {
      // Forward request to DeepFace Python service for verification
      const FormData = require('form-data');
      const formData = new FormData();
      
      formData.append('student_id', student_id);
      formData.append('photo', fs.createReadStream(req.file.path), {
        filename: req.file.originalname,
        contentType: req.file.mimetype
      });
      formData.append('model_name', 'Facenet512');
      
      const deepfaceResponse = await axios.post('http://localhost:8000/api/face/verify', formData, {
        headers: {
          ...formData.getHeaders(),
        },
        timeout: 30000
      });
      
      console.log('✅ [LIVE-VERIFICATION] Received response from Python backend');
      console.log('📊 [LIVE-VERIFICATION] Response status:', deepfaceResponse.status);
      console.log('📊 [LIVE-VERIFICATION] Response data:', JSON.stringify(deepfaceResponse.data, null, 2));
      
      // Clean up uploaded file
      try {
        fs.unlinkSync(req.file.path);
      } catch (cleanupError) {
        console.warn('Failed to cleanup temp file:', cleanupError.message);
      }
      
      const verificationResult = deepfaceResponse.data;
      let attendanceMarked = false;
      
      console.log('🔍 [LIVE-VERIFICATION] Checking verification result...');
      console.log('   - Verified:', verificationResult.verified);
      console.log('   - Confidence:', verificationResult.confidence);
      console.log('   - Threshold check (>= 0.6):', verificationResult.confidence >= 0.6);
      
      // If verification is successful, mark attendance
      if (verificationResult.verified && verificationResult.confidence >= 0.6) {
        console.log('✅ [LIVE-VERIFICATION] Verification successful! Proceeding to mark attendance...');
        try {
          // Check if attendance already marked today in daily_attendance
          const today = new Date().toISOString().split('T')[0];
          console.log('📅 [LIVE-VERIFICATION] Checking attendance for date:', today);
          
          const existingAttendance = await dbAdapter.get(
            'SELECT * FROM daily_attendance WHERE student_id = ? AND date = ?',
            [student_id, today]
          );
          
          console.log('📋 [LIVE-VERIFICATION] Existing attendance record:', existingAttendance);
          
          if (existingAttendance && existingAttendance.status === 'not_yet_here') {
            console.log('🔄 [LIVE-VERIFICATION] Updating attendance status to present...');
            
            // Update daily attendance status to present
            const currentTime = new Date().toTimeString().split(' ')[0]; // HH:MM:SS format
            await dbAdapter.execute(
              'UPDATE daily_attendance SET status = ?, check_in_time = ?, updated_at = ? WHERE student_id = ? AND date = ?',
              ['present', currentTime, new Date().toISOString(), student_id, today]
            );
            
            console.log('✅ [LIVE-VERIFICATION] Daily attendance updated successfully');
            
            // Also insert into attendance history table
            await dbAdapter.execute(
              'INSERT INTO attendance (student_id, student_name, date, time, verification_method, confidence_score, timestamp) VALUES (?, ?, ?, ?, ?, ?, ?)',
              [student_id, student.name, today, currentTime, 'live_camera', verificationResult.confidence, new Date().toISOString()]
            );
            
            console.log('✅ [LIVE-VERIFICATION] Attendance history record inserted successfully');
            
            attendanceMarked = true;
          } else if (existingAttendance) {
            console.log('ℹ️ [LIVE-VERIFICATION] Attendance already marked with status:', existingAttendance.status);
          } else {
            console.log('❌ [LIVE-VERIFICATION] No existing attendance record found for today');
          }
        } catch (attendanceError) {
          console.error('Failed to mark attendance:', attendanceError);
          // Continue with verification response even if attendance marking fails
        }
      }
      
      console.log('🎯 [LIVE-VERIFICATION] Sending response to client...');
      console.log('   - Success:', true);
      console.log('   - Verified:', verificationResult.verified);
      console.log('   - Attendance Marked:', attendanceMarked);
      
      res.json({
        success: true,
        verified: verificationResult.verified,
        confidence: verificationResult.confidence,
        student: {
          student_id: student.student_id,
          name: student.name,
          email: student.email
        },
        attendanceMarked: attendanceMarked,
        message: verificationResult.verified 
          ? (attendanceMarked 
              ? 'Identity verified successfully! Attendance marked.' 
              : 'Identity verified successfully! Attendance was already marked today.')
          : 'Identity verification failed. Please try again.',
        verification: verificationResult
      });
      
      console.log('✅ [LIVE-VERIFICATION] Request completed successfully for student:', student_id);
      
    } catch (deepfaceError) {
      console.error('❌ [LIVE-VERIFICATION] DeepFace service error:', deepfaceError.message);
      
      // Clean up uploaded file on error
      try {
        fs.unlinkSync(req.file.path);
      } catch (cleanupError) {
        console.warn('⚠️ [LIVE-VERIFICATION] Failed to cleanup temp file:', cleanupError.message);
      }
      
      if (deepfaceError.response) {
        // DeepFace service returned an error response
        return res.status(deepfaceError.response.status).json({
          success: false,
          verified: false,
          error: 'Verification failed',
          message: 'Face verification service error. Please try again.',
          details: deepfaceError.response.data
        });
      } else if (deepfaceError.code === 'ECONNREFUSED') {
        return res.status(503).json({
          success: false,
          verified: false,
          error: 'Service unavailable',
          message: 'Face verification service is currently unavailable. Please try again later.'
        });
      } else {
        return res.status(500).json({
          success: false,
          verified: false,
          error: 'Verification failed',
          message: 'An error occurred during verification. Please try again.'
        });
      }
    }
    
  } catch (error) {
    console.error('❌ [LIVE-VERIFICATION] Verification error:', error);
    
    // Clean up uploaded file on error
    if (req.file) {
      try {
        fs.unlinkSync(req.file.path);
      } catch (cleanupError) {
        console.warn('⚠️ [LIVE-VERIFICATION] Failed to cleanup temp file:', cleanupError.message);
      }
    }
    
    res.status(500).json({
      success: false,
      verified: false,
      error: 'Verification failed',
      message: 'An unexpected error occurred. Please try again.'
    });
  }
});

// Multi-photo enrollment endpoint
router.post('/enroll-multi-photo', upload.fields([
  { name: 'front_photo', maxCount: 1 },
  { name: 'left_profile_photo', maxCount: 1 },
  { name: 'right_profile_photo', maxCount: 1 }
]), async (req, res) => {
  console.log('\n🔄 [MULTI-PHOTO-ENROLLMENT] Processing multi-angle photo enrollment...');
  
  try {
    const { student_id, model_name = 'Facenet512' } = req.body;
    
    // Validate required fields
    if (!student_id) {
      return res.status(400).json({ error: 'Student ID is required' });
    }
    
    // Check if all three photos are provided
    if (!req.files || !req.files.front_photo || !req.files.left_profile_photo || !req.files.right_profile_photo) {
      return res.status(400).json({ 
        error: 'All three photos are required (front_photo, left_profile_photo, right_profile_photo)' 
      });
    }
    
    const frontPhoto = req.files.front_photo[0];
    const leftPhoto = req.files.left_profile_photo[0];
    const rightPhoto = req.files.right_profile_photo[0];
    
    console.log('📋 [MULTI-PHOTO-ENROLLMENT] Request details:');
    console.log('  - Student ID:', student_id);
    console.log('  - Model:', model_name);
    console.log('  - Front photo:', frontPhoto.originalname, frontPhoto.size, 'bytes');
    console.log('  - Left photo:', leftPhoto.originalname, leftPhoto.size, 'bytes');
    console.log('  - Right photo:', rightPhoto.originalname, rightPhoto.size, 'bytes');
    
    // Check if student exists
    const [students] = await dbAdapter.execute(
      'SELECT student_id, name FROM students WHERE student_id = ?',
      [student_id]
    );
    
    if (students.length === 0) {
      return res.status(404).json({ error: 'Student not found' });
    }
    
    try {
      // Forward request to DeepFace Python service
      const FormData = require('form-data');
      const axios = require('axios');
      const fs = require('fs');
      
      const formData = new FormData();
      formData.append('student_id', student_id);
      formData.append('model_name', model_name);
      
      // Append all three photos
      formData.append('front_photo', fs.createReadStream(frontPhoto.path), {
        filename: frontPhoto.originalname,
        contentType: frontPhoto.mimetype
      });
      formData.append('left_profile_photo', fs.createReadStream(leftPhoto.path), {
        filename: leftPhoto.originalname,
        contentType: leftPhoto.mimetype
      });
      formData.append('right_profile_photo', fs.createReadStream(rightPhoto.path), {
        filename: rightPhoto.originalname,
        contentType: rightPhoto.mimetype
      });
      
      console.log('📤 [MULTI-PHOTO-ENROLLMENT] Forwarding to DeepFace service...');
      
      const deepfaceResponse = await axios.post('http://localhost:8000/api/face/enroll-multi', formData, {
        headers: {
          ...formData.getHeaders(),
        },
        timeout: 60000 // 60 second timeout for processing 3 photos
      });
      
      console.log('✅ [MULTI-PHOTO-ENROLLMENT] DeepFace enrollment successful');
      console.log('📊 [MULTI-PHOTO-ENROLLMENT] Response:', deepfaceResponse.data);
      
      // Clean up uploaded files
      const filesToCleanup = [frontPhoto.path, leftPhoto.path, rightPhoto.path];
      filesToCleanup.forEach(filePath => {
        try {
          fs.unlinkSync(filePath);
        } catch (cleanupError) {
          console.warn('⚠️ [MULTI-PHOTO-ENROLLMENT] Failed to cleanup temp file:', cleanupError.message);
        }
      });
      
      res.json({
        success: true,
        message: 'Multi-angle photo enrollment completed successfully',
        student: {
          student_id: student_id,
          name: students[0].name
        },
        enrollment: deepfaceResponse.data
      });
      
    } catch (deepfaceError) {
      console.error('❌ [MULTI-PHOTO-ENROLLMENT] DeepFace service error:', deepfaceError.message);
      
      // Clean up uploaded files on error
      const filesToCleanup = [frontPhoto.path, leftPhoto.path, rightPhoto.path];
      filesToCleanup.forEach(filePath => {
        try {
          fs.unlinkSync(filePath);
        } catch (cleanupError) {
          console.warn('⚠️ [MULTI-PHOTO-ENROLLMENT] Failed to cleanup temp file:', cleanupError.message);
        }
      });
      
      if (deepfaceError.response) {
        // DeepFace service returned an error response
        return res.status(deepfaceError.response.status).json({
          success: false,
          error: 'Multi-photo enrollment failed',
          message: 'Face enrollment service error. Please try again.',
          details: deepfaceError.response.data
        });
      } else if (deepfaceError.code === 'ECONNREFUSED') {
        return res.status(503).json({
          success: false,
          error: 'Service unavailable',
          message: 'Face enrollment service is currently unavailable. Please try again later.'
        });
      } else {
        return res.status(500).json({
          success: false,
          error: 'Multi-photo enrollment failed',
          message: 'An error occurred during enrollment. Please try again.'
        });
      }
    }
    
  } catch (error) {
    console.error('❌ [MULTI-PHOTO-ENROLLMENT] Enrollment error:', error);
    
    // Clean up uploaded files on error
    if (req.files) {
      const filesToCleanup = [];
      if (req.files.front_photo) filesToCleanup.push(req.files.front_photo[0].path);
      if (req.files.left_profile_photo) filesToCleanup.push(req.files.left_profile_photo[0].path);
      if (req.files.right_profile_photo) filesToCleanup.push(req.files.right_profile_photo[0].path);
      
      filesToCleanup.forEach(filePath => {
        try {
          fs.unlinkSync(filePath);
        } catch (cleanupError) {
          console.warn('⚠️ [MULTI-PHOTO-ENROLLMENT] Failed to cleanup temp file:', cleanupError.message);
        }
      });
    }
    
    res.status(500).json({
      success: false,
      error: 'Multi-photo enrollment failed',
      message: 'An unexpected error occurred. Please try again.'
    });
  }
});

module.exports = router;