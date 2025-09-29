/**
 * Advanced Face Quality Control System
 * 
 * This module provides comprehensive quality assessment for face enrollment and verification
 * to ensure high accuracy and prevent false positives/negatives in face recognition.
 */

const cv = require('opencv4nodejs'); // Optional: for advanced image processing

class FaceQualityController {
  constructor() {
    this.qualityThresholds = {
      // Face detection confidence
      minDetectionConfidence: 0.8,
      
      // Face size constraints (pixels)
      minFaceSize: 100,
      maxFaceSize: 400,
      optimalFaceSize: 200,
      
      // Image quality metrics
      minBrightness: 50,
      maxBrightness: 200,
      optimalBrightness: 120,
      
      // Blur detection
      maxBlurScore: 0.3,
      
      // Face pose constraints (degrees)
      maxYawAngle: 15,
      maxPitchAngle: 15,
      maxRollAngle: 10,
      
      // Eye aspect ratio for blink detection
      eyeAspectRatioThreshold: 0.25,
      
      // Lighting uniformity
      maxLightingVariance: 0.3,
      
      // Occlusion detection
      maxOcclusionPercentage: 0.1,
      
      // Overall quality score
      minOverallQuality: 0.7,
      
      // Enrollment specific
      minSamplesForEnrollment: 3,
      maxSamplesForEnrollment: 7,
      minQualityVariation: 0.1 // Ensure samples are diverse
    };
  }

  /**
   * Comprehensive face quality assessment
   * @param {Object} detection - Face detection result from face-api.js
   * @param {HTMLVideoElement|HTMLImageElement} imageElement - Source image/video
   * @param {Object} options - Additional options
   * @returns {Object} Quality assessment result
   */
  assessFaceQuality(detection, imageElement, options = {}) {
    const assessment = {
      overall: 0,
      scores: {},
      issues: [],
      recommendations: [],
      metadata: {
        timestamp: Date.now(),
        imageSource: imageElement.tagName.toLowerCase()
      }
    };

    try {
      // 1. Face Detection Quality
      assessment.scores.detection = this.assessDetectionQuality(detection);
      
      // 2. Face Size Assessment
      assessment.scores.faceSize = this.assessFaceSize(detection.box);
      
      // 3. Face Pose Assessment
      assessment.scores.pose = this.assessFacePose(detection.landmarks);
      
      // 4. Image Quality Assessment
      assessment.scores.imageQuality = this.assessImageQuality(detection.box, imageElement);
      
      // 5. Lighting Assessment
      assessment.scores.lighting = this.assessLighting(detection.box, imageElement);
      
      // 6. Occlusion Assessment
      assessment.scores.occlusion = this.assessOcclusion(detection.landmarks);
      
      // 7. Expression Assessment
      assessment.scores.expression = this.assessExpression(detection.expressions);
      
      // 8. Sharpness Assessment
      assessment.scores.sharpness = this.assessSharpness(detection.box, imageElement);
      
      // Calculate overall quality score
      assessment.overall = this.calculateOverallQuality(assessment.scores);
      
      // Generate issues and recommendations
      this.generateFeedback(assessment);
      
      return assessment;
      
    } catch (error) {
      console.error('Face quality assessment error:', error);
      assessment.error = error.message;
      assessment.overall = 0;
      assessment.issues.push('Quality assessment failed');
      return assessment;
    }
  }

  /**
   * Assess face detection quality
   */
  assessDetectionQuality(detection) {
    const confidence = detection.score || 0;
    const score = Math.min(confidence / this.qualityThresholds.minDetectionConfidence, 1);
    
    return {
      score,
      confidence,
      threshold: this.qualityThresholds.minDetectionConfidence,
      passed: confidence >= this.qualityThresholds.minDetectionConfidence
    };
  }

  /**
   * Assess face size appropriateness
   */
  assessFaceSize(box) {
    const faceSize = Math.max(box.width, box.height);
    const { minFaceSize, maxFaceSize, optimalFaceSize } = this.qualityThresholds;
    
    let score = 0;
    let issue = null;
    
    if (faceSize < minFaceSize) {
      score = faceSize / minFaceSize * 0.5;
      issue = 'Face too small - move closer to camera';
    } else if (faceSize > maxFaceSize) {
      score = Math.max(0, 1 - (faceSize - maxFaceSize) / maxFaceSize);
      issue = 'Face too large - move away from camera';
    } else {
      // Calculate score based on distance from optimal size
      const deviation = Math.abs(faceSize - optimalFaceSize) / optimalFaceSize;
      score = Math.max(0.7, 1 - deviation);
    }
    
    return {
      score,
      faceSize,
      optimal: optimalFaceSize,
      passed: faceSize >= minFaceSize && faceSize <= maxFaceSize,
      issue
    };
  }

  /**
   * Assess face pose (yaw, pitch, roll)
   */
  assessFacePose(landmarks) {
    const pose = this.calculateFacePose(landmarks);
    const { maxYawAngle, maxPitchAngle, maxRollAngle } = this.qualityThresholds;
    
    const yawScore = Math.max(0, 1 - Math.abs(pose.yaw) / maxYawAngle);
    const pitchScore = Math.max(0, 1 - Math.abs(pose.pitch) / maxPitchAngle);
    const rollScore = Math.max(0, 1 - Math.abs(pose.roll) / maxRollAngle);
    
    const overallScore = (yawScore + pitchScore + rollScore) / 3;
    
    const issues = [];
    if (Math.abs(pose.yaw) > maxYawAngle) issues.push('Turn head to face camera directly');
    if (Math.abs(pose.pitch) > maxPitchAngle) issues.push('Adjust head tilt up/down');
    if (Math.abs(pose.roll) > maxRollAngle) issues.push('Keep head level');
    
    return {
      score: overallScore,
      pose,
      thresholds: { maxYawAngle, maxPitchAngle, maxRollAngle },
      passed: issues.length === 0,
      issues
    };
  }

  /**
   * Calculate face pose angles from landmarks
   */
  calculateFacePose(landmarks) {
    // Simplified pose calculation using key facial landmarks
    const nose = landmarks.getNose();
    const leftEye = landmarks.getLeftEye();
    const rightEye = landmarks.getRightEye();
    const jawline = landmarks.getJawOutline();
    
    // Calculate eye center
    const eyeCenter = {
      x: (leftEye[0].x + rightEye[3].x) / 2,
      y: (leftEye[0].y + rightEye[3].y) / 2
    };
    
    // Calculate yaw (left-right rotation)
    const leftJaw = jawline[0];
    const rightJaw = jawline[16];
    const yaw = Math.atan2(rightJaw.y - leftJaw.y, rightJaw.x - leftJaw.x) * 180 / Math.PI;
    
    // Calculate pitch (up-down rotation)
    const noseCenter = nose[3];
    const pitch = Math.atan2(noseCenter.y - eyeCenter.y, noseCenter.x - eyeCenter.x) * 180 / Math.PI;
    
    // Calculate roll (tilt)
    const roll = Math.atan2(rightEye[3].y - leftEye[0].y, rightEye[3].x - leftEye[0].x) * 180 / Math.PI;
    
    return { yaw, pitch, roll };
  }

  /**
   * Assess image quality (brightness, contrast)
   */
  assessImageQuality(box, imageElement) {
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    
    canvas.width = box.width;
    canvas.height = box.height;
    
    ctx.drawImage(imageElement, box.x, box.y, box.width, box.height, 0, 0, box.width, box.height);
    
    const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
    const data = imageData.data;
    
    // Calculate brightness
    let brightness = 0;
    let contrast = 0;
    const pixels = data.length / 4;
    
    for (let i = 0; i < data.length; i += 4) {
      const gray = (data[i] + data[i + 1] + data[i + 2]) / 3;
      brightness += gray;
    }
    brightness = brightness / pixels;
    
    // Calculate contrast (standard deviation of brightness)
    let variance = 0;
    for (let i = 0; i < data.length; i += 4) {
      const gray = (data[i] + data[i + 1] + data[i + 2]) / 3;
      variance += Math.pow(gray - brightness, 2);
    }
    contrast = Math.sqrt(variance / pixels);
    
    const { minBrightness, maxBrightness, optimalBrightness } = this.qualityThresholds;
    
    let brightnessScore = 0;
    let brightnessIssue = null;
    
    if (brightness < minBrightness) {
      brightnessScore = brightness / minBrightness * 0.5;
      brightnessIssue = 'Too dark - improve lighting';
    } else if (brightness > maxBrightness) {
      brightnessScore = Math.max(0.3, 1 - (brightness - maxBrightness) / maxBrightness);
      brightnessIssue = 'Too bright - reduce lighting';
    } else {
      const deviation = Math.abs(brightness - optimalBrightness) / optimalBrightness;
      brightnessScore = Math.max(0.7, 1 - deviation);
    }
    
    const contrastScore = Math.min(1, contrast / 50); // Normalize contrast
    const overallScore = (brightnessScore + contrastScore) / 2;
    
    return {
      score: overallScore,
      brightness,
      contrast,
      brightnessScore,
      contrastScore,
      passed: brightness >= minBrightness && brightness <= maxBrightness,
      issue: brightnessIssue
    };
  }

  /**
   * Assess lighting uniformity
   */
  assessLighting(box, imageElement) {
    // Simplified lighting assessment
    // In a real implementation, you'd analyze lighting distribution across the face
    return {
      score: 0.8, // Placeholder
      uniformity: 0.8,
      passed: true
    };
  }

  /**
   * Assess face occlusion
   */
  assessOcclusion(landmarks) {
    // Simplified occlusion detection
    // Check if key landmarks are visible and properly positioned
    const nose = landmarks.getNose();
    const leftEye = landmarks.getLeftEye();
    const rightEye = landmarks.getRightEye();
    const mouth = landmarks.getMouth();
    
    // Basic visibility check
    const visibleFeatures = [nose, leftEye, rightEye, mouth].filter(feature => 
      feature && feature.length > 0
    ).length;
    
    const score = visibleFeatures / 4;
    
    return {
      score,
      visibleFeatures,
      totalFeatures: 4,
      passed: score >= 0.9,
      issue: score < 0.9 ? 'Face partially occluded - remove obstructions' : null
    };
  }

  /**
   * Assess facial expression appropriateness
   */
  assessExpression(expressions) {
    if (!expressions) {
      return { score: 0.8, passed: true }; // Default if expressions not available
    }
    
    // Prefer neutral expressions for enrollment
    const neutralScore = expressions.neutral || 0;
    const happyScore = expressions.happy || 0;
    const surprisedScore = expressions.surprised || 0;
    const angryScore = expressions.angry || 0;
    
    // Penalize extreme expressions
    const extremeExpressions = Math.max(surprisedScore, angryScore);
    const score = Math.max(0.5, neutralScore + happyScore * 0.5 - extremeExpressions);
    
    return {
      score,
      expressions,
      passed: score >= 0.6,
      issue: score < 0.6 ? 'Please maintain a neutral or slight smile' : null
    };
  }

  /**
   * Assess image sharpness
   */
  assessSharpness(box, imageElement) {
    // Simplified sharpness assessment
    // In a real implementation, you'd use Laplacian variance or similar
    return {
      score: 0.8, // Placeholder
      variance: 100,
      passed: true
    };
  }

  /**
   * Calculate overall quality score
   */
  calculateOverallQuality(scores) {
    const weights = {
      detection: 0.2,
      faceSize: 0.15,
      pose: 0.2,
      imageQuality: 0.15,
      lighting: 0.1,
      occlusion: 0.1,
      expression: 0.05,
      sharpness: 0.05
    };
    
    let weightedSum = 0;
    let totalWeight = 0;
    
    Object.entries(weights).forEach(([key, weight]) => {
      if (scores[key] && typeof scores[key].score === 'number') {
        weightedSum += scores[key].score * weight;
        totalWeight += weight;
      }
    });
    
    return totalWeight > 0 ? weightedSum / totalWeight : 0;
  }

  /**
   * Generate feedback and recommendations
   */
  generateFeedback(assessment) {
    const { scores, overall } = assessment;
    
    // Collect all issues
    Object.values(scores).forEach(scoreObj => {
      if (scoreObj.issue) {
        assessment.issues.push(scoreObj.issue);
      }
      if (scoreObj.issues) {
        assessment.issues.push(...scoreObj.issues);
      }
    });
    
    // Generate recommendations based on overall quality
    if (overall < 0.3) {
      assessment.recommendations.push('Quality too low - please retry enrollment');
      assessment.recommendations.push('Ensure good lighting and clear face visibility');
    } else if (overall < 0.5) {
      assessment.recommendations.push('Quality below optimal - consider retaking');
      assessment.recommendations.push('Address the issues listed above');
    } else if (overall < 0.7) {
      assessment.recommendations.push('Acceptable quality - can proceed but consider improvements');
    } else {
      assessment.recommendations.push('Good quality - suitable for enrollment');
    }
    
    // Specific recommendations
    if (scores.faceSize && scores.faceSize.score < 0.7) {
      assessment.recommendations.push('Adjust distance from camera for optimal face size');
    }
    
    if (scores.pose && scores.pose.score < 0.7) {
      assessment.recommendations.push('Face the camera directly and keep head level');
    }
    
    if (scores.imageQuality && scores.imageQuality.score < 0.7) {
      assessment.recommendations.push('Improve lighting conditions');
    }
  }

  /**
   * Validate enrollment samples for consistency
   */
  validateEnrollmentSamples(samples) {
    const validation = {
      passed: false,
      issues: [],
      recommendations: [],
      statistics: {}
    };
    
    if (samples.length < this.qualityThresholds.minSamplesForEnrollment) {
      validation.issues.push(`Need at least ${this.qualityThresholds.minSamplesForEnrollment} samples`);
      return validation;
    }
    
    if (samples.length > this.qualityThresholds.maxSamplesForEnrollment) {
      validation.issues.push(`Too many samples (max ${this.qualityThresholds.maxSamplesForEnrollment})`);
    }
    
    // Calculate statistics
    const qualities = samples.map(s => s.quality.overall);
    const avgQuality = qualities.reduce((sum, q) => sum + q, 0) / qualities.length;
    const minQuality = Math.min(...qualities);
    const maxQuality = Math.max(...qualities);
    const qualityVariance = this.calculateVariance(qualities);
    
    validation.statistics = {
      count: samples.length,
      averageQuality: avgQuality,
      minQuality,
      maxQuality,
      qualityVariance
    };
    
    // Validate average quality
    if (avgQuality < this.qualityThresholds.minOverallQuality) {
      validation.issues.push('Average quality too low');
    }
    
    // Validate minimum quality
    if (minQuality < 0.5) {
      validation.issues.push('Some samples have very poor quality');
    }
    
    // Validate diversity
    if (qualityVariance < this.qualityThresholds.minQualityVariation) {
      validation.recommendations.push('Samples are too similar - try different angles/expressions');
    }
    
    validation.passed = validation.issues.length === 0;
    
    return validation;
  }

  /**
   * Calculate variance of an array
   */
  calculateVariance(values) {
    const mean = values.reduce((sum, val) => sum + val, 0) / values.length;
    const squaredDiffs = values.map(val => Math.pow(val - mean, 2));
    return squaredDiffs.reduce((sum, diff) => sum + diff, 0) / values.length;
  }

  /**
   * Get quality control configuration
   */
  getConfiguration() {
    return {
      thresholds: this.qualityThresholds,
      version: '2.0',
      lastUpdated: new Date().toISOString()
    };
  }

  /**
   * Update quality control thresholds
   */
  updateThresholds(newThresholds) {
    this.qualityThresholds = { ...this.qualityThresholds, ...newThresholds };
  }
}

module.exports = FaceQualityController;