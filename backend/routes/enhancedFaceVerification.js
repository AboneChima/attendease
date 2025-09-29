/**
 * Enhanced Face Verification Routes
 * Supports verification against multiple face samples with adaptive thresholds
 */

const express = require('express');
const { body, validationResult } = require('express-validator');
const { getDatabase } = require('../config/sqlite-database');
const EnhancedFaceQuality = require('../utils/enhancedFaceQuality');

const router = express.Router();
const faceQuality = new EnhancedFaceQuality();

/**
 * Normalize face descriptor for consistent comparison
 */
function normalizeFaceDescriptor(descriptor) {
  if (!Array.isArray(descriptor) || descriptor.length !== 128) {
    throw new Error('Invalid face descriptor format');
  }
  
  const magnitude = Math.sqrt(descriptor.reduce((sum, val) => sum + val * val, 0));
  
  if (magnitude === 0) {
    throw new Error('Invalid face descriptor - zero magnitude');
  }
  
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
 * Calculate similarity score (0-1, where 1 is identical)
 */
function calculateSimilarity(distance) {
  // Convert distance to similarity score
  // Typical face recognition distances range from 0 to 2
  return Math.max(0, 1 - (distance / 2));
}

/**
 * Adaptive threshold based on sample quality and conditions
 */
function getAdaptiveThreshold(sampleQuality, baseThreshold = 0.6) {
  // Adjust threshold based on sample quality
  // Higher quality samples can use stricter thresholds
  const qualityFactor = sampleQuality || 0.7;
  
  if (qualityFactor > 0.9) {
    return baseThreshold * 0.9; // Stricter for high quality
  } else if (qualityFactor > 0.8) {
    return baseThreshold;
  } else if (qualityFactor > 0.7) {
    return baseThreshold * 1.1; // More lenient for medium quality
  } else {
    return baseThreshold * 1.2; // More lenient for lower quality
  }
}

/**
 * Verify face against all stored samples for a student
 */
router.post('/verify-face', [
  body('studentId').notEmpty().withMessage('Student ID is required'),
  body('faceDescriptor').isArray().withMessage('Face descriptor must be an array'),
  body('qualityMetrics').optional().isObject().withMessage('Quality metrics must be an object')
], async (req, res) => {
  try {
    console.log('🔍 [VERIFICATION] Starting face verification...');
    
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { studentId, faceDescriptor, qualityMetrics } = req.body;
    
    // Validate face descriptor
    if (!Array.isArray(faceDescriptor) || faceDescriptor.length !== 128) {
      return res.status(400).json({ error: 'Face descriptor must be 128-dimensional array' });
    }

    const invalidValues = faceDescriptor.filter(val => typeof val !== 'number' || isNaN(val));
    if (invalidValues.length > 0) {
      return res.status(400).json({ error: 'Face descriptor must contain only numeric values' });
    }

    console.log(`📊 [VERIFICATION] Verifying student: ${studentId}`);

    const db = await getDatabase();

    // Verify student exists
    const students = await db.all(
      'SELECT student_id, name FROM students WHERE student_id = ?',
      [studentId]
    );

    if (students.length === 0) {
      return res.status(404).json({ error: 'Student not found' });
    }

    // Perform quality assessment if metrics provided
    let qualityAssessment = null;
    if (qualityMetrics) {
      qualityAssessment = faceQuality.assessFaceQuality(qualityMetrics, 'FRONT');
      console.log(`📊 [VERIFICATION] Live face quality: ${Math.round(qualityAssessment.overallScore * 100)}%`);
    }

    // Get all face samples for the student
    const samples = await db.all(`
      SELECT fs.sample_id, fs.face_descriptor, fs.capture_angle, fs.quality_score, fs.created_at
      FROM face_samples fs
      JOIN face_enrollment_sessions fes ON fs.session_id = fes.session_id
      WHERE fs.student_id = ? AND fes.status = 'completed'
      ORDER BY fs.quality_score DESC
    `, [studentId]);

    if (samples.length === 0) {
      // Check legacy face_encodings table for backward compatibility
      const legacyEncodings = await db.all(
        'SELECT face_descriptor FROM face_encodings WHERE student_id = ?',
        [studentId]
      );

      if (legacyEncodings.length === 0) {
        return res.status(404).json({ 
          error: 'No face enrollment found',
          message: 'Student has not completed face enrollment'
        });
      }

      // Handle legacy verification
      console.log('🔄 [VERIFICATION] Using legacy face encoding...');
      const legacyDescriptor = JSON.parse(legacyEncodings[0].face_descriptor);
      const normalizedInput = normalizeFaceDescriptor(faceDescriptor);
      const distance = calculateDistance(normalizedInput, legacyDescriptor);
      const similarity = calculateSimilarity(distance);
      const threshold = 0.6; // Default threshold for legacy
      const isMatch = distance < threshold;

      return res.status(200).json({
        success: true,
        verified: isMatch,
        studentId,
        studentName: students[0].name,
        confidence: Math.round(similarity * 100),
        distance: distance,
        threshold: threshold,
        method: 'legacy',
        message: isMatch ? 'Face verification successful' : 'Face verification failed'
      });
    }

    console.log(`📊 [VERIFICATION] Found ${samples.length} face samples for comparison`);

    // Normalize input face descriptor
    const normalizedInput = normalizeFaceDescriptor(faceDescriptor);

    // Compare against all samples
    const comparisons = [];
    let bestMatch = null;
    let bestDistance = Infinity;

    for (const sample of samples) {
      try {
        const sampleDescriptor = JSON.parse(sample.face_descriptor);
        const distance = calculateDistance(normalizedInput, sampleDescriptor);
        const similarity = calculateSimilarity(distance);
        const threshold = getAdaptiveThreshold(sample.quality_score);

        const comparison = {
          sampleId: sample.sample_id,
          captureAngle: sample.capture_angle,
          distance: distance,
          similarity: similarity,
          threshold: threshold,
          isMatch: distance < threshold,
          sampleQuality: sample.quality_score,
          capturedAt: sample.created_at
        };

        comparisons.push(comparison);

        // Track best match
        if (distance < bestDistance) {
          bestDistance = distance;
          bestMatch = comparison;
        }

        console.log(`📏 [VERIFICATION] ${sample.capture_angle}: distance=${distance.toFixed(4)}, similarity=${Math.round(similarity * 100)}%, threshold=${threshold.toFixed(3)}, match=${comparison.isMatch}`);

      } catch (parseError) {
        console.error(`❌ [VERIFICATION] Error parsing sample ${sample.sample_id}:`, parseError);
        continue;
      }
    }

    if (comparisons.length === 0) {
      return res.status(500).json({ error: 'Failed to process face samples' });
    }

    // Determine overall verification result
    const matchingComparisons = comparisons.filter(c => c.isMatch);
    const isVerified = matchingComparisons.length > 0;
    
    // Calculate confidence based on best match
    const confidence = bestMatch ? Math.round(bestMatch.similarity * 100) : 0;
    
    // Enhanced verification logic: require at least one strong match
    const strongMatches = comparisons.filter(c => c.similarity > 0.8);
    const hasStrongMatch = strongMatches.length > 0;

    // Final verification decision
    const finalVerified = isVerified && (confidence > 70 || hasStrongMatch);

    // Log verification attempt
    await db.run(`
      INSERT INTO verification_attempts 
      (student_id, verification_result, confidence_score, verification_time)
      VALUES (?, ?, ?, ?)
    `, [
      studentId, 
      finalVerified ? 'SUCCESS' : 'FAILED',
      confidence, 
      Date.now()
    ]);

    console.log(`${finalVerified ? '✅' : '❌'} [VERIFICATION] Student ${studentId}: ${finalVerified ? 'VERIFIED' : 'FAILED'} (confidence: ${confidence}%)`);

    res.status(200).json({
      success: true,
      verified: finalVerified,
      studentId,
      studentName: students[0].name,
      confidence: confidence,
      bestMatch: {
        distance: bestDistance,
        similarity: bestMatch ? Math.round(bestMatch.similarity * 100) : 0,
        captureAngle: bestMatch ? bestMatch.captureAngle : null,
        threshold: bestMatch ? bestMatch.threshold : null
      },
      verification: {
        totalSamples: comparisons.length,
        matchingSamples: matchingComparisons.length,
        strongMatches: strongMatches.length,
        averageDistance: comparisons.reduce((sum, c) => sum + c.distance, 0) / comparisons.length,
        method: 'multi-sample'
      },
      qualityAssessment: qualityAssessment ? {
        score: Math.round(qualityAssessment.overallScore * 100),
        isValid: qualityAssessment.isValid,
        feedback: faceQuality.getQualityFeedback(qualityAssessment)
      } : null,
      message: finalVerified ? 'Face verification successful' : 'Face verification failed'
    });

  } catch (error) {
    console.error('❌ [VERIFICATION] Error during face verification:', error);
    res.status(500).json({ error: 'Face verification failed' });
  }
});

/**
 * Get verification history for a student
 */
router.get('/history/:studentId', async (req, res) => {
  try {
    const { studentId } = req.params;
    const limit = parseInt(req.query.limit) || 10;
    
    const db = await getDatabase();
    
    // Get verification history
    const history = await db.all(`
      SELECT verification_time, success, confidence_score, best_distance, samples_compared, quality_score
      FROM verification_attempts 
      WHERE student_id = ? 
      ORDER BY verification_time DESC 
      LIMIT ?
    `, [studentId, limit]);

    // Get student info
    const students = await db.all(
      'SELECT name FROM students WHERE student_id = ?',
      [studentId]
    );

    if (students.length === 0) {
      return res.status(404).json({ error: 'Student not found' });
    }

    // Calculate statistics
    const totalAttempts = history.length;
    const successfulAttempts = history.filter(h => h.success).length;
    const successRate = totalAttempts > 0 ? (successfulAttempts / totalAttempts) * 100 : 0;
    const averageConfidence = totalAttempts > 0 
      ? history.reduce((sum, h) => sum + (h.confidence_score || 0), 0) / totalAttempts 
      : 0;

    res.status(200).json({
      success: true,
      studentId,
      studentName: students[0].name,
      statistics: {
        totalAttempts,
        successfulAttempts,
        successRate: Math.round(successRate),
        averageConfidence: Math.round(averageConfidence)
      },
      history: history.map(h => ({
        timestamp: h.verification_time,
        success: h.success,
        confidence: h.confidence_score,
        distance: h.best_distance,
        samplesCompared: h.samples_compared,
        qualityScore: h.quality_score ? Math.round(h.quality_score * 100) : null
      }))
    });

  } catch (error) {
    console.error('❌ [VERIFICATION] Error getting verification history:', error);
    res.status(500).json({ error: 'Failed to get verification history' });
  }
});

/**
 * Get verification statistics for all students
 */
router.get('/statistics', async (req, res) => {
  try {
    const db = await getDatabase();
    
    const stats = await db.all(`
      SELECT 
        COUNT(DISTINCT student_id) as total_students,
        COUNT(*) as total_attempts,
        SUM(CASE WHEN success = 1 THEN 1 ELSE 0 END) as successful_attempts,
        AVG(confidence_score) as average_confidence,
        AVG(best_distance) as average_distance
      FROM verification_attempts
      WHERE verification_time >= datetime('now', '-30 days')
    `);

    const recentActivity = await db.all(`
      SELECT date(verification_time) as date, 
             COUNT(*) as attempts,
             SUM(CASE WHEN success = 1 THEN 1 ELSE 0 END) as successes
      FROM verification_attempts
      WHERE verification_time >= datetime('now', '-7 days')
      GROUP BY date(verification_time)
      ORDER BY date DESC
    `);

    const statistics = stats[0] || {};
    const successRate = statistics.total_attempts > 0 
      ? (statistics.successful_attempts / statistics.total_attempts) * 100 
      : 0;

    res.status(200).json({
      success: true,
      period: 'Last 30 days',
      overview: {
        totalStudents: statistics.total_students || 0,
        totalAttempts: statistics.total_attempts || 0,
        successfulAttempts: statistics.successful_attempts || 0,
        successRate: Math.round(successRate),
        averageConfidence: Math.round(statistics.average_confidence || 0),
        averageDistance: statistics.average_distance || 0
      },
      recentActivity: recentActivity.map(day => ({
        date: day.date,
        attempts: day.attempts,
        successes: day.successes,
        successRate: Math.round((day.successes / day.attempts) * 100)
      }))
    });

  } catch (error) {
    console.error('❌ [VERIFICATION] Error getting verification statistics:', error);
    res.status(500).json({ error: 'Failed to get verification statistics' });
  }
});

module.exports = router;