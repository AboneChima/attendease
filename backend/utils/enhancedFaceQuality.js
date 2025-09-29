/**
 * Enhanced Face Quality Control System
 * Provides comprehensive quality validation for face enrollment and verification
 */

class EnhancedFaceQuality {
    constructor() {
        this.qualityThresholds = {
            // Detection confidence
            minDetectionConfidence: 0.8,
            
            // Face size requirements (in pixels)
            minFaceSize: 80,
            maxFaceSize: 400,
            optimalFaceSize: 150,
            
            // Pose angle limits (in degrees)
            maxYaw: 25,      // Left-right rotation
            maxPitch: 20,    // Up-down rotation  
            maxRoll: 15,     // Tilt rotation
            
            // Image quality
            minBrightness: 50,
            maxBrightness: 200,
            optimalBrightness: 120,
            minContrast: 30,
            
            // Eye detection
            minEyeConfidence: 0.7,
            maxEyeClosedRatio: 0.3,
            
            // Blur detection
            maxBlurVariance: 100,
            minSharpness: 50,
            
            // Centering
            maxCenterOffset: 0.3, // 30% from center
            
            // Overall quality score
            minOverallQuality: 0.7
        };
        
        this.captureAngles = {
            FRONT: { yaw: 0, pitch: 0, tolerance: 10 },
            LEFT: { yaw: -20, pitch: 0, tolerance: 10 },
            RIGHT: { yaw: 20, pitch: 0, tolerance: 10 }
        };
    }

    /**
     * Comprehensive face quality assessment
     * @param {Object} faceData - Face detection data with landmarks and metrics
     * @param {string} targetAngle - Target capture angle (FRONT, LEFT, RIGHT)
     * @returns {Object} Quality assessment result
     */
    assessFaceQuality(faceData, targetAngle = 'FRONT') {
        const assessment = {
            isValid: false,
            overallScore: 0,
            issues: [],
            warnings: [],
            metrics: {},
            feedback: []
        };

        try {
            // 1. Detection confidence check
            const detectionResult = this.checkDetectionConfidence(faceData);
            assessment.metrics.detection = detectionResult;
            
            if (!detectionResult.passed) {
                assessment.issues.push('Face detection confidence too low');
                assessment.feedback.push('Please ensure your face is clearly visible');
            }

            // 2. Face size validation
            const sizeResult = this.checkFaceSize(faceData);
            assessment.metrics.size = sizeResult;
            
            if (!sizeResult.passed) {
                assessment.issues.push(`Face size ${sizeResult.status}`);
                assessment.feedback.push(sizeResult.feedback);
            }

            // 3. Pose angle validation
            const poseResult = this.checkPoseAngles(faceData, targetAngle);
            assessment.metrics.pose = poseResult;
            
            if (!poseResult.passed) {
                assessment.issues.push('Face pose not optimal');
                assessment.feedback.push(poseResult.feedback);
            }

            // 4. Lighting assessment
            const lightingResult = this.checkLighting(faceData);
            assessment.metrics.lighting = lightingResult;
            
            if (!lightingResult.passed) {
                assessment.issues.push('Lighting conditions poor');
                assessment.feedback.push(lightingResult.feedback);
            }

            // 5. Eye detection and openness
            const eyeResult = this.checkEyes(faceData);
            assessment.metrics.eyes = eyeResult;
            
            if (!eyeResult.passed) {
                assessment.issues.push('Eye detection failed');
                assessment.feedback.push('Please keep your eyes open and look at the camera');
            }

            // 6. Blur and sharpness
            const blurResult = this.checkBlur(faceData);
            assessment.metrics.blur = blurResult;
            
            if (!blurResult.passed) {
                assessment.issues.push('Image too blurry');
                assessment.feedback.push('Please hold still and ensure good focus');
            }

            // 7. Face centering
            const centeringResult = this.checkCentering(faceData);
            assessment.metrics.centering = centeringResult;
            
            if (!centeringResult.passed) {
                assessment.issues.push('Face not centered');
                assessment.feedback.push('Please center your face in the frame');
            }

            // Calculate overall quality score
            assessment.overallScore = this.calculateOverallScore(assessment.metrics);
            assessment.isValid = assessment.overallScore >= this.qualityThresholds.minOverallQuality;

            // Add overall feedback
            if (assessment.isValid) {
                assessment.feedback.unshift('✅ Face quality is excellent!');
            } else {
                assessment.feedback.unshift('❌ Please improve face quality before capture');
            }

        } catch (error) {
            assessment.issues.push('Quality assessment failed');
            assessment.feedback.push('Unable to assess face quality');
            console.error('Face quality assessment error:', error);
        }

        return assessment;
    }

    /**
     * Check face detection confidence
     */
    checkDetectionConfidence(faceData) {
        const confidence = faceData.confidence || 0;
        return {
            passed: confidence >= this.qualityThresholds.minDetectionConfidence,
            score: confidence,
            threshold: this.qualityThresholds.minDetectionConfidence,
            feedback: confidence < this.qualityThresholds.minDetectionConfidence 
                ? 'Face detection confidence too low' 
                : 'Face detected successfully'
        };
    }

    /**
     * Check face size requirements
     */
    checkFaceSize(faceData) {
        const faceSize = this.calculateFaceSize(faceData);
        const { minFaceSize, maxFaceSize, optimalFaceSize } = this.qualityThresholds;
        
        let status = 'optimal';
        let feedback = 'Face size is perfect';
        let passed = true;

        if (faceSize < minFaceSize) {
            status = 'too small';
            feedback = 'Please move closer to the camera';
            passed = false;
        } else if (faceSize > maxFaceSize) {
            status = 'too large';
            feedback = 'Please move further from the camera';
            passed = false;
        } else if (Math.abs(faceSize - optimalFaceSize) > 30) {
            if (faceSize < optimalFaceSize) {
                feedback = 'Move slightly closer for optimal quality';
            } else {
                feedback = 'Move slightly further for optimal quality';
            }
        }

        return {
            passed,
            size: faceSize,
            status,
            feedback,
            score: this.calculateSizeScore(faceSize)
        };
    }

    /**
     * Check pose angles for target capture angle
     */
    checkPoseAngles(faceData, targetAngle) {
        const angles = this.extractPoseAngles(faceData);
        const target = this.captureAngles[targetAngle] || this.captureAngles.FRONT;
        
        const yawDiff = Math.abs(angles.yaw - target.yaw);
        const pitchDiff = Math.abs(angles.pitch - target.pitch);
        const rollDiff = Math.abs(angles.roll);
        
        const yawOk = yawDiff <= target.tolerance;
        const pitchOk = pitchDiff <= this.qualityThresholds.maxPitch;
        const rollOk = rollDiff <= this.qualityThresholds.maxRoll;
        
        const passed = yawOk && pitchOk && rollOk;
        
        let feedback = 'Head pose is perfect';
        if (!passed) {
            const adjustments = [];
            if (!yawOk) {
                if (targetAngle === 'LEFT' && angles.yaw > target.yaw) {
                    adjustments.push('turn your head more to the left');
                } else if (targetAngle === 'RIGHT' && angles.yaw < target.yaw) {
                    adjustments.push('turn your head more to the right');
                } else if (targetAngle === 'FRONT') {
                    adjustments.push('face the camera directly');
                }
            }
            if (!pitchOk) {
                adjustments.push(angles.pitch > 0 ? 'look down slightly' : 'look up slightly');
            }
            if (!rollOk) {
                adjustments.push('straighten your head');
            }
            feedback = `Please ${adjustments.join(' and ')}`;
        }

        return {
            passed,
            angles,
            target: targetAngle,
            feedback,
            score: this.calculatePoseScore(angles, target)
        };
    }

    /**
     * Check lighting conditions
     */
    checkLighting(faceData) {
        const lighting = this.analyzeLighting(faceData);
        const { minBrightness, maxBrightness, optimalBrightness, minContrast } = this.qualityThresholds;
        
        const brightnessOk = lighting.brightness >= minBrightness && lighting.brightness <= maxBrightness;
        const contrastOk = lighting.contrast >= minContrast;
        const evenOk = lighting.evenness > 0.7;
        
        const passed = brightnessOk && contrastOk && evenOk;
        
        let feedback = 'Lighting is excellent';
        if (!passed) {
            if (lighting.brightness < minBrightness) {
                feedback = 'Lighting is too dim - please find better lighting';
            } else if (lighting.brightness > maxBrightness) {
                feedback = 'Lighting is too bright - avoid direct light sources';
            } else if (!contrastOk) {
                feedback = 'Image contrast is too low - improve lighting';
            } else if (!evenOk) {
                feedback = 'Lighting is uneven - avoid shadows on your face';
            }
        }

        return {
            passed,
            lighting,
            feedback,
            score: this.calculateLightingScore(lighting)
        };
    }

    /**
     * Check eye detection and openness
     */
    checkEyes(faceData) {
        const eyes = this.analyzeEyes(faceData);
        const { minEyeConfidence, maxEyeClosedRatio } = this.qualityThresholds;
        
        const leftEyeOk = eyes.leftEye.confidence >= minEyeConfidence && 
                         eyes.leftEye.openness > (1 - maxEyeClosedRatio);
        const rightEyeOk = eyes.rightEye.confidence >= minEyeConfidence && 
                          eyes.rightEye.openness > (1 - maxEyeClosedRatio);
        
        const passed = leftEyeOk && rightEyeOk;
        
        let feedback = 'Eyes are clearly visible and open';
        if (!passed) {
            if (!leftEyeOk || !rightEyeOk) {
                feedback = 'Please keep both eyes open and look at the camera';
            }
        }

        return {
            passed,
            eyes,
            feedback,
            score: this.calculateEyeScore(eyes)
        };
    }

    /**
     * Check image blur and sharpness
     */
    checkBlur(faceData) {
        const blur = this.analyzeBlur(faceData);
        const { maxBlurVariance, minSharpness } = this.qualityThresholds;
        
        const sharpnessOk = blur.sharpness >= minSharpness;
        const varianceOk = blur.variance <= maxBlurVariance;
        
        const passed = sharpnessOk && varianceOk;
        
        let feedback = 'Image is sharp and clear';
        if (!passed) {
            feedback = 'Image is blurry - please hold still and ensure good focus';
        }

        return {
            passed,
            blur,
            feedback,
            score: this.calculateBlurScore(blur)
        };
    }

    /**
     * Check face centering in frame
     */
    checkCentering(faceData) {
        const centering = this.analyzeCentering(faceData);
        const { maxCenterOffset } = this.qualityThresholds;
        
        const passed = centering.offset <= maxCenterOffset;
        
        let feedback = 'Face is well centered';
        if (!passed) {
            const direction = centering.direction;
            feedback = `Please move your face ${direction} to center it in the frame`;
        }

        return {
            passed,
            centering,
            feedback,
            score: this.calculateCenteringScore(centering)
        };
    }

    /**
     * Calculate overall quality score
     */
    calculateOverallScore(metrics) {
        const weights = {
            detection: 0.2,
            size: 0.15,
            pose: 0.2,
            lighting: 0.15,
            eyes: 0.1,
            blur: 0.1,
            centering: 0.1
        };

        let totalScore = 0;
        let totalWeight = 0;

        for (const [metric, weight] of Object.entries(weights)) {
            if (metrics[metric] && typeof metrics[metric].score === 'number') {
                totalScore += metrics[metric].score * weight;
                totalWeight += weight;
            }
        }

        return totalWeight > 0 ? totalScore / totalWeight : 0;
    }

    // Helper methods for analysis
    calculateFaceSize(faceData) {
        if (faceData.box) {
            return Math.min(faceData.box.width, faceData.box.height);
        }
        return 100; // Default fallback
    }

    extractPoseAngles(faceData) {
        // Extract pose angles from face landmarks or use defaults
        return {
            yaw: faceData.pose?.yaw || 0,
            pitch: faceData.pose?.pitch || 0,
            roll: faceData.pose?.roll || 0
        };
    }

    analyzeLighting(faceData) {
        // Analyze lighting from image data
        return {
            brightness: faceData.lighting?.brightness || 120,
            contrast: faceData.lighting?.contrast || 50,
            evenness: faceData.lighting?.evenness || 0.8
        };
    }

    analyzeEyes(faceData) {
        // Analyze eye detection and openness
        return {
            leftEye: {
                confidence: faceData.eyes?.left?.confidence || 0.8,
                openness: faceData.eyes?.left?.openness || 0.9
            },
            rightEye: {
                confidence: faceData.eyes?.right?.confidence || 0.8,
                openness: faceData.eyes?.right?.openness || 0.9
            }
        };
    }

    analyzeBlur(faceData) {
        // Analyze image blur and sharpness
        return {
            sharpness: faceData.quality?.sharpness || 70,
            variance: faceData.quality?.variance || 50
        };
    }

    analyzeCentering(faceData) {
        // Analyze face centering in frame
        const centerX = 0.5;
        const centerY = 0.5;
        
        if (faceData.box && faceData.imageSize) {
            const faceCenterX = (faceData.box.x + faceData.box.width / 2) / faceData.imageSize.width;
            const faceCenterY = (faceData.box.y + faceData.box.height / 2) / faceData.imageSize.height;
            
            const offsetX = Math.abs(faceCenterX - centerX);
            const offsetY = Math.abs(faceCenterY - centerY);
            const offset = Math.sqrt(offsetX * offsetX + offsetY * offsetY);
            
            let direction = '';
            if (offsetX > offsetY) {
                direction = faceCenterX < centerX ? 'right' : 'left';
            } else {
                direction = faceCenterY < centerY ? 'down' : 'up';
            }
            
            return { offset, direction, x: offsetX, y: offsetY };
        }
        
        return { offset: 0, direction: '', x: 0, y: 0 };
    }

    // Score calculation methods
    calculateSizeScore(size) {
        const optimal = this.qualityThresholds.optimalFaceSize;
        const diff = Math.abs(size - optimal);
        return Math.max(0, 1 - (diff / optimal));
    }

    calculatePoseScore(angles, target) {
        const yawDiff = Math.abs(angles.yaw - target.yaw);
        const pitchDiff = Math.abs(angles.pitch - target.pitch);
        const rollDiff = Math.abs(angles.roll);
        
        const yawScore = Math.max(0, 1 - (yawDiff / target.tolerance));
        const pitchScore = Math.max(0, 1 - (pitchDiff / this.qualityThresholds.maxPitch));
        const rollScore = Math.max(0, 1 - (rollDiff / this.qualityThresholds.maxRoll));
        
        return (yawScore + pitchScore + rollScore) / 3;
    }

    calculateLightingScore(lighting) {
        const brightnessScore = this.calculateBrightnessScore(lighting.brightness);
        const contrastScore = Math.min(1, lighting.contrast / this.qualityThresholds.minContrast);
        const evennessScore = lighting.evenness;
        
        return (brightnessScore + contrastScore + evennessScore) / 3;
    }

    calculateBrightnessScore(brightness) {
        const { minBrightness, maxBrightness, optimalBrightness } = this.qualityThresholds;
        
        if (brightness < minBrightness || brightness > maxBrightness) {
            return 0;
        }
        
        const diff = Math.abs(brightness - optimalBrightness);
        const range = (maxBrightness - minBrightness) / 2;
        return Math.max(0, 1 - (diff / range));
    }

    calculateEyeScore(eyes) {
        const leftScore = eyes.leftEye.confidence * eyes.leftEye.openness;
        const rightScore = eyes.rightEye.confidence * eyes.rightEye.openness;
        return (leftScore + rightScore) / 2;
    }

    calculateBlurScore(blur) {
        const sharpnessScore = Math.min(1, blur.sharpness / this.qualityThresholds.minSharpness);
        const varianceScore = Math.max(0, 1 - (blur.variance / this.qualityThresholds.maxBlurVariance));
        return (sharpnessScore + varianceScore) / 2;
    }

    calculateCenteringScore(centering) {
        return Math.max(0, 1 - (centering.offset / this.qualityThresholds.maxCenterOffset));
    }

    /**
     * Get quality feedback for UI display
     */
    getQualityFeedback(assessment) {
        const feedback = {
            status: assessment.isValid ? 'success' : 'warning',
            message: assessment.feedback[0] || 'Assessing face quality...',
            score: Math.round(assessment.overallScore * 100),
            details: assessment.feedback.slice(1),
            issues: assessment.issues
        };

        return feedback;
    }

    /**
     * Validate multiple face samples for enrollment
     */
    validateEnrollmentSamples(samples) {
        const results = {
            valid: true,
            samples: [],
            overallScore: 0,
            issues: []
        };

        let totalScore = 0;
        let validSamples = 0;

        for (const sample of samples) {
            const assessment = this.assessFaceQuality(sample.faceData, sample.angle);
            
            results.samples.push({
                angle: sample.angle,
                assessment,
                valid: assessment.isValid
            });

            if (assessment.isValid) {
                totalScore += assessment.overallScore;
                validSamples++;
            } else {
                results.issues.push(`${sample.angle} angle: ${assessment.issues.join(', ')}`);
            }
        }

        results.valid = validSamples >= 2; // Require at least 2 valid samples
        results.overallScore = validSamples > 0 ? totalScore / validSamples : 0;

        if (!results.valid) {
            results.issues.unshift('Need at least 2 high-quality face samples for enrollment');
        }

        return results;
    }
}

module.exports = EnhancedFaceQuality;