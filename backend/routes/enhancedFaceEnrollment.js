/**
 * Enhanced Face Enrollment Routes
 * Supports multi-sample face enrollment with quality validation
 */

const express = require('express');
const { body, validationResult } = require('express-validator');
const { getDatabase } = require('../config/sqlite-database');
const EnhancedFaceQuality = require('../utils/enhancedFaceQuality');
const { v4: uuidv4 } = require('uuid');

const router = express.Router();
const faceQuality = new EnhancedFaceQuality();

/**
 * Normalize face descriptor for consistent storage
 */
function normalizeFaceDescriptor(descriptor) {
  if (!Array.isArray(descriptor) || descriptor.length !== 128) {
    throw new Error('Invalid face descriptor format');
  }
  
  // Calculate magnitude for normalization
  const magnitude = Math.sqrt(descriptor.reduce((sum, val) => sum + val * val, 0));
  
  if (magnitude === 0) {
    throw new Error('Invalid face descriptor - zero magnitude');
  }
  
  // Normalize to unit vector
  return descriptor.map(val => val / magnitude);
}

/**
 * Calculate Euclidean distance between two face descriptors
 */
function calculateDistance(desc1, desc2) {
  if (desc1.length !== desc2.length) {
    throw new Error('Face descriptors must have the same length');
  }
  
  let sum = 0;
  for (let i = 0; i < desc1.length; i++) {
    const diff = desc1[i] - desc2[i];
    sum += diff * diff;
  }
  
  return Math.sqrt(sum);
}

/**
 * Check if face is already enrolled for a different student
 */
async function checkFaceUniqueness(faceDescriptor, currentStudentId, threshold = 0.6) {
  try {
    console.log('🔍 [UNIQUENESS] Checking face uniqueness...');
    
    const db = await getDatabase();
    
    // Get all existing face samples (excluding current student)
    const existingSamples = await db.all(`
      SELECT fs.student_id, fs.face_descriptor, fs.capture_angle
      FROM face_samples fs
      WHERE fs.student_id != ?
    `, [currentStudentId]);
    
    console.log(`📊 [UNIQUENESS] Checking against ${existingSamples.length} existing samples`);
    
    for (const sample of existingSamples) {
      try {
        const existingDescriptor = JSON.parse(sample.face_descriptor);
        const distance = calculateDistance(faceDescriptor, existingDescriptor);
        
        console.log(`📏 [UNIQUENESS] Distance to ${sample.student_id} (${sample.capture_angle}): ${distance.toFixed(4)}`);
        
        if (distance < threshold) {
          console.log(`⚠️ [UNIQUENESS] Duplicate face detected! Distance: ${distance.toFixed(4)} < threshold: ${threshold}`);
          return {
            isDuplicate: true,
            existingStudentId: sample.student_id,
            similarity: 1 - distance,
            distance: distance
          };
        }
      } catch (parseError) {
        console.error('❌ [UNIQUENESS] Error parsing face descriptor:', parseError);
        continue;
      }
    }
    
    console.log('✅ [UNIQUENESS] Face is unique');
    return { isDuplicate: false };
  } catch (error) {
    console.error('❌ [UNIQUENESS] Error checking face uniqueness:', error);
    throw error;
  }
}

/**
 * Start a new enrollment session
 */
router.post('/start-enrollment', [
  body('studentId').notEmpty().withMessage('Student ID is required')
], async (req, res) => {
  try {
    console.log('🚀 [ENROLLMENT] Starting new enrollment session...');
    
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { studentId } = req.body;
    
    const db = await getDatabase();
    
    // Verify student exists
    const students = await db.all(
      'SELECT student_id, name FROM students WHERE student_id = ?',
      [studentId]
    );

    if (students.length === 0) {
      return res.status(404).json({ error: 'Student not found' });
    }

    // Check if student already has face enrollment
    const existingSessions = await db.all(
      'SELECT session_id FROM face_enrollment_sessions WHERE student_id = ? AND status = "completed"',
      [studentId]
    );

    if (existingSessions.length > 0) {
      return res.status(409).json({ 
        error: 'Student already enrolled',
        message: 'This student already has face enrollment. Use re-enrollment if needed.'
      });
    }

    // Create new enrollment session
    const sessionId = uuidv4();
    await db.run(`
      INSERT INTO face_enrollment_sessions 
      (session_id, student_id, status, started_at) 
      VALUES (?, ?, 'active', CURRENT_TIMESTAMP)
    `, [sessionId, studentId]);

    console.log(`✅ [ENROLLMENT] Created session ${sessionId} for student ${studentId}`);

    res.status(201).json({
      success: true,
      sessionId,
      studentId,
      studentName: students[0].name,
      requiredAngles: ['FRONT', 'LEFT', 'RIGHT'],
      message: 'Enrollment session started successfully'
    });

  } catch (error) {
    console.error('❌ [ENROLLMENT] Error starting enrollment session:', error);
    res.status(500).json({ error: 'Failed to start enrollment session' });
  }
});

/**
 * Add face sample to enrollment session
 */
router.post('/add-sample', [
  body('sessionId').notEmpty().withMessage('Session ID is required'),
  body('faceDescriptor').isArray().withMessage('Face descriptor must be an array'),
  body('captureAngle').isIn(['FRONT', 'LEFT', 'RIGHT']).withMessage('Invalid capture angle'),
  body('qualityMetrics').isObject().withMessage('Quality metrics required')
], async (req, res) => {
  try {
    console.log('📸 [ENROLLMENT] Adding face sample...');
    
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { sessionId, faceDescriptor, captureAngle, qualityMetrics } = req.body;
    
    const db = await getDatabase();
    
    // Validate face descriptor
    if (!Array.isArray(faceDescriptor) || faceDescriptor.length !== 128) {
      return res.status(400).json({ error: 'Face descriptor must be 128-dimensional array' });
    }

    const invalidValues = faceDescriptor.filter(val => typeof val !== 'number' || isNaN(val));
    if (invalidValues.length > 0) {
      return res.status(400).json({ error: 'Face descriptor must contain only numeric values' });
    }

    // Get enrollment session
    const sessions = await db.all(
      'SELECT student_id, status FROM face_enrollment_sessions WHERE session_id = ?',
      [sessionId]
    );

    if (sessions.length === 0) {
      return res.status(404).json({ error: 'Enrollment session not found' });
    }

    if (sessions[0].status !== 'active') {
      return res.status(400).json({ error: 'Enrollment session is not active' });
    }

    const studentId = sessions[0].student_id;

    // Perform quality assessment
    const qualityAssessment = faceQuality.assessFaceQuality(qualityMetrics, captureAngle);
    
    if (!qualityAssessment.isValid) {
      return res.status(400).json({
        error: 'Face quality insufficient',
        assessment: qualityAssessment,
        feedback: faceQuality.getQualityFeedback(qualityAssessment)
      });
    }

    // Normalize face descriptor
    const normalizedDescriptor = normalizeFaceDescriptor(faceDescriptor);
    
    // Check face uniqueness
    const uniquenessCheck = await checkFaceUniqueness(normalizedDescriptor, studentId);
    
    if (uniquenessCheck.isDuplicate) {
      return res.status(409).json({
        error: 'Face already enrolled',
        message: `This face is already registered for student ${uniquenessCheck.existingStudentId}`,
        existingStudentId: uniquenessCheck.existingStudentId
      });
    }

    // Check if sample for this angle already exists
    const existingSamples = await db.all(
      'SELECT id FROM face_samples WHERE session_id = ? AND capture_angle = ?',
      [sessionId, captureAngle]
    );

    const descriptorJson = JSON.stringify(normalizedDescriptor);

    if (existingSamples.length > 0) {
      // Update existing sample
      await db.run(`
        UPDATE face_samples 
        SET face_descriptor = ?, quality_score = ?, updated_at = CURRENT_TIMESTAMP
        WHERE session_id = ? AND capture_angle = ?
      `, [descriptorJson, qualityAssessment.overallScore, sessionId, captureAngle]);
      
      console.log(`🔄 [ENROLLMENT] Updated ${captureAngle} sample for session ${sessionId}`);
    } else {
      // Get the next sample index for this student
      const sampleCountResult = await db.get(
        'SELECT COUNT(*) as count FROM face_samples WHERE student_id = ?',
        [studentId]
      );
      const nextSampleIndex = (sampleCountResult.count || 0) + 1;
      
      // Insert new sample
      await db.run(`
        INSERT INTO face_samples 
        (session_id, student_id, sample_index, face_descriptor, capture_angle, quality_score, created_at) 
        VALUES (?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP)
      `, [sessionId, studentId, nextSampleIndex, descriptorJson, captureAngle, qualityAssessment.overallScore]);
      
      console.log(`➕ [ENROLLMENT] Added ${captureAngle} sample for session ${sessionId} (index: ${nextSampleIndex})`);
    }

    // Check session completion
    const completedSamples = await db.all(
      'SELECT capture_angle FROM face_samples WHERE session_id = ?',
      [sessionId]
    );

    const requiredAngles = ['FRONT', 'LEFT', 'RIGHT'];
    const completedAngles = completedSamples.map(s => s.capture_angle);
    const isComplete = requiredAngles.every(angle => completedAngles.includes(angle));

    res.status(201).json({
      success: true,
      sampleId: existingSamples.length > 0 ? existingSamples[0].id : null,
      captureAngle,
      qualityScore: Math.round(qualityAssessment.overallScore * 100),
      assessment: qualityAssessment,
      sessionProgress: {
        completed: completedAngles,
        remaining: requiredAngles.filter(angle => !completedAngles.includes(angle)),
        isComplete
      },
      message: `${captureAngle} face sample captured successfully`
    });

  } catch (error) {
    console.error('❌ [ENROLLMENT] Error adding face sample:', error);
    res.status(500).json({ error: 'Failed to add face sample' });
  }
});

/**
 * Complete enrollment session
 */
router.post('/complete-enrollment', [
  body('sessionId').notEmpty().withMessage('Session ID is required')
], async (req, res) => {
  try {
    console.log('🏁 [ENROLLMENT] Completing enrollment session...');
    
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { sessionId } = req.body;
    
    const db = await getDatabase();
    
    // Get enrollment session
    const sessions = await db.all(
      'SELECT student_id, status FROM face_enrollment_sessions WHERE session_id = ?',
      [sessionId]
    );

    if (sessions.length === 0) {
      return res.status(404).json({ error: 'Enrollment session not found' });
    }

    if (sessions[0].status !== 'active') {
      return res.status(400).json({ error: 'Enrollment session is not active' });
    }

    const studentId = sessions[0].student_id;

    // Verify all required samples are present
    const samples = await db.all(
      'SELECT capture_angle, quality_score FROM face_samples WHERE session_id = ?',
      [sessionId]
    );

    const requiredAngles = ['FRONT', 'LEFT', 'RIGHT'];
    const completedAngles = samples.map(s => s.capture_angle);
    const missingAngles = requiredAngles.filter(angle => !completedAngles.includes(angle));

    if (missingAngles.length > 0) {
      return res.status(400).json({
        error: 'Incomplete enrollment',
        message: `Missing face samples for angles: ${missingAngles.join(', ')}`,
        missingAngles
      });
    }

    // Calculate average quality score
    const averageQuality = samples.reduce((sum, s) => sum + s.quality_score, 0) / samples.length;

    // Update session status
    await db.run(`
      UPDATE face_enrollment_sessions 
      SET status = 'completed', completed_at = CURRENT_TIMESTAMP, 
          total_samples = ?, average_quality = ?
      WHERE session_id = ?
    `, [samples.length, averageQuality, sessionId]);

    // Remove any old face encodings for this student (legacy support)
    await db.run(
      'DELETE FROM face_encodings WHERE student_id = ?',
      [studentId]
    );

    // Remove any old face samples for this student to avoid conflicts
    await db.run(
      'DELETE FROM face_samples WHERE student_id = ? AND session_id != ?',
      [studentId, sessionId]
    );

    console.log(`✅ [ENROLLMENT] Completed enrollment for student ${studentId}`);

    res.status(200).json({
      success: true,
      sessionId,
      studentId,
      totalSamples: samples.length,
      averageQuality: Math.round(averageQuality * 100),
      completedAngles,
      message: 'Face enrollment completed successfully'
    });

  } catch (error) {
    console.error('❌ [ENROLLMENT] Error completing enrollment:', error);
    res.status(500).json({ error: 'Failed to complete enrollment' });
  }
});

/**
 * Get enrollment session status
 */
router.get('/session/:sessionId', async (req, res) => {
  try {
    const { sessionId } = req.params;
    
    const db = await getDatabase();
    
    // Get session details
    const sessions = await db.all(`
      SELECT fes.*, s.name as student_name
      FROM face_enrollment_sessions fes
      JOIN students s ON fes.student_id = s.student_id
      WHERE fes.session_id = ?
    `, [sessionId]);

    if (sessions.length === 0) {
      return res.status(404).json({ error: 'Enrollment session not found' });
    }

    const session = sessions[0];

    // Get samples for this session
    const samples = await db.all(
      'SELECT capture_angle, quality_score, created_at FROM face_samples WHERE session_id = ? ORDER BY created_at',
      [sessionId]
    );

    const requiredAngles = JSON.parse(session.required_angles);
    const completedAngles = samples.map(s => s.capture_angle);
    const remainingAngles = requiredAngles.filter(angle => !completedAngles.includes(angle));

    res.status(200).json({
      success: true,
      session: {
        sessionId: session.session_id,
        studentId: session.student_id,
        studentName: session.student_name,
        status: session.status,
        createdAt: session.created_at,
        completedAt: session.completed_at,
        totalSamples: session.total_samples,
        averageQuality: session.average_quality
      },
      progress: {
        requiredAngles,
        completedAngles,
        remainingAngles,
        isComplete: remainingAngles.length === 0,
        samples: samples.map(s => ({
          angle: s.capture_angle,
          qualityScore: Math.round(s.quality_score * 100),
          capturedAt: s.created_at
        }))
      }
    });

  } catch (error) {
    console.error('❌ [ENROLLMENT] Error getting session status:', error);
    res.status(500).json({ error: 'Failed to get session status' });
  }
});

/**
 * Cancel enrollment session
 */
router.delete('/session/:sessionId', async (req, res) => {
  try {
    const { sessionId } = req.params;
    
    const db = await getDatabase();
    
    // Delete samples first (foreign key constraint)
    await db.run('DELETE FROM face_samples WHERE session_id = ?', [sessionId]);
    
    // Delete session
    const result = await db.run(
      'DELETE FROM face_enrollment_sessions WHERE session_id = ?',
      [sessionId]
    );

    if (result.changes === 0) {
      return res.status(404).json({ error: 'Enrollment session not found' });
    }

    console.log(`🗑️ [ENROLLMENT] Cancelled session ${sessionId}`);

    res.status(200).json({
      success: true,
      message: 'Enrollment session cancelled successfully'
    });

  } catch (error) {
    console.error('❌ [ENROLLMENT] Error cancelling session:', error);
    res.status(500).json({ error: 'Failed to cancel enrollment session' });
  }
});

module.exports = router;