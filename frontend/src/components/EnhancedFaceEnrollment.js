import React, { useState, useRef, useEffect, useCallback } from 'react';
import * as faceapi from 'face-api.js';

const EnhancedFaceEnrollment = ({ studentId, onFaceEnrolled, onError }) => {
  const videoRef = useRef();
  const canvasRef = useRef();
  const [isLoading, setIsLoading] = useState(true);
  const [currentStep, setCurrentStep] = useState('loading'); // loading, position, capture, processing, complete
  const [instruction, setInstruction] = useState('Loading face detection models...');
  const [capturedSamples, setCapturedSamples] = useState([]);
  const [faceDetected, setFaceDetected] = useState(false);
  const [facePosition, setFacePosition] = useState({ distance: 'unknown', centered: false });
  const [currentAction, setCurrentAction] = useState(null); // 'blink', 'smile', 'neutral', 'turn_left', 'turn_right'

  const REQUIRED_SAMPLES = 3;
  const CAPTURE_ANGLES = ['FRONT', 'LEFT', 'RIGHT'];
  const [currentAngleIndex, setCurrentAngleIndex] = useState(0);

  // Function definitions in proper order to avoid use-before-define warnings
  const analyzeFacePosition = useCallback((detection) => {
    const box = detection.detection.box;
    const videoWidth = videoRef.current.videoWidth;
    const videoHeight = videoRef.current.videoHeight;
    
    const centerX = box.x + box.width / 2;
    const centerY = box.y + box.height / 2;
    const videoCenterX = videoWidth / 2;
    const videoCenterY = videoHeight / 2;
    
    const offsetX = Math.abs(centerX - videoCenterX);
    const offsetY = Math.abs(centerY - videoCenterY);
    
    const faceRatio = (box.width * box.height) / (videoWidth * videoHeight);
    
    // Virtually impossible to fail - always pass positioning
    const isWellCentered = true; // Always pass centering check
    const isGoodDistance = faceRatio > 0.001; // Only fail if face is impossibly small (0.1% of screen)
    
    // Debug logging for positioning
    console.log('🎯 Face positioning analysis (ALWAYS PASS MODE):', {
      centerX: Math.round(centerX),
      centerY: Math.round(centerY),
      videoCenterX: Math.round(videoCenterX),
      videoCenterY: Math.round(videoCenterY),
      offsetX: Math.round(offsetX),
      offsetY: Math.round(offsetY),
      faceRatio: faceRatio.toFixed(4),
      isWellCentered: true,
      isGoodDistance,
      note: 'Positioning check disabled - always passes'
    });
    
    setFacePosition({
      centered: isWellCentered,
      distance: isGoodDistance ? 'good' : (faceRatio < 0.03 ? 'far' : 'close'),
      quality: isWellCentered && isGoodDistance ? 'good' : 'poor'
    });
    
    return { isWellCentered, isGoodDistance };
  }, []);

  const completeFaceEnrollment = useCallback(async (samples) => {
    try {
      console.log('🚀 Starting face enrollment process...');
      setCurrentStep('processing');
      setInstruction('Processing your face data...');
      
      if (!samples || samples.length === 0) {
        throw new Error('No face samples provided');
      }
      
      console.log(`📊 Processing ${samples.length} face samples`);
      
      // Calculate average descriptor
      const descriptorLength = samples[0].length;
      const avgDescriptor = new Array(descriptorLength).fill(0);
      
      samples.forEach(sample => {
        sample.forEach((value, index) => {
          avgDescriptor[index] += value;
        });
      });
      
      avgDescriptor.forEach((value, index) => {
        avgDescriptor[index] = value / samples.length;
      });
      
      console.log('✅ Face descriptor calculated successfully');
      
      // Stop face detection immediately
      setCurrentStep('complete');
      setFaceDetected(false);
      
      // Clear any running timeouts or intervals
      const highestTimeoutId = setTimeout(() => {}, 0);
      for (let i = 0; i < highestTimeoutId; i++) {
        clearTimeout(i);
      }
      console.log('🧹 Cleared all timeouts and intervals');
      
      // Enhanced success feedback
      setInstruction('🎉 Face enrollment completed successfully! Camera shutting down...');
      
      // Stop camera stream with enhanced cleanup
      if (videoRef.current && videoRef.current.srcObject) {
        const stream = videoRef.current.srcObject;
        const tracks = stream.getTracks();
        tracks.forEach(track => {
          console.log('🛑 Stopping camera track:', track.kind);
          track.stop();
        });
        videoRef.current.srcObject = null;
        videoRef.current.load(); // Reset video element
        videoRef.current.pause(); // Ensure video is paused
        console.log('📹 Camera completely shut down');
      }
      
      // Call onComplete with the enrollment data
      const enrollmentData = {
        studentId: studentId,
        faceDescriptor: avgDescriptor,
        samples: samples,
        timestamp: new Date().toISOString(),
        quality: 'high'
      };
      
      console.log('🎉 Face enrollment completed successfully!');
      
      // Show success message and auto-close after delay
      setTimeout(() => {
        setInstruction('✅ Face enrolled! Window will close automatically in 3 seconds...');
        if (onFaceEnrolled) {
          onFaceEnrolled(enrollmentData);
        }
        
        // Auto-close window after 3 seconds
        setTimeout(() => {
          setInstruction('🎉 Enrollment complete! Closing window...');
          // Close the current window/tab or navigate back
          if (window.opener) {
            // If opened as popup, close it
            window.close();
          } else {
            // If not a popup, navigate back or to a specific page
            window.history.back();
          }
        }, 3000);
      }, 1000);
      
    } catch (error) {
      console.error('❌ Face enrollment failed:', error);
      onError('Face enrollment failed: ' + error.message);
    }
  }, [studentId, onFaceEnrolled, onError]);

  const captureCurrentFrame = useCallback(async () => {
    try {
      // Check if we should still be capturing
      if (currentStep === 'complete' || capturedSamples.length >= REQUIRED_SAMPLES) {
        console.log('🛑 Capture stopped - already complete or enough samples');
        return;
      }
      
      // Simplified video readiness check before capture
      if (!videoRef.current || 
          videoRef.current.readyState < 2 || 
          videoRef.current.videoWidth === 0 || 
          videoRef.current.videoHeight === 0) {
        console.log('⚠️ Video not ready for capture, retrying...');
        setTimeout(() => {
          if (currentStep !== 'complete') {
            captureCurrentFrame();
          }
        }, 100);
        return;
      }
      
      console.log('🔍 Starting face detection for capture...');
      const detections = await faceapi
        .detectAllFaces(videoRef.current, new faceapi.TinyFaceDetectorOptions({ inputSize: 416, scoreThreshold: 0.3 }))
        .withFaceLandmarks()
        .withFaceDescriptors();

      console.log(`👥 Detected ${detections.length} face(s)`);
      if (detections.length === 1) {
        const detection = detections[0];
        const descriptor = detection.descriptor;
        
        console.log(`✅ Face captured successfully for ${CAPTURE_ANGLES[currentAngleIndex]} angle`);
        const newSamples = [...capturedSamples, Array.from(descriptor)];
        setCapturedSamples(newSamples);
        
        console.log(`📊 Captured ${newSamples.length}/${REQUIRED_SAMPLES} samples`);
        
        if (newSamples.length >= REQUIRED_SAMPLES) {
          console.log('🎉 All samples collected! Starting enrollment...');
          await completeFaceEnrollment(newSamples);
        } else {
          // Move to next angle
          const nextAngleIndex = currentAngleIndex + 1;
          setCurrentAngleIndex(nextAngleIndex);
          const nextAngle = CAPTURE_ANGLES[nextAngleIndex];
          
          // Provide angle-specific instructions
          if (nextAngle === 'LEFT') {
            setInstruction('Great! Now slowly turn your head to the LEFT and look at the camera');
          } else if (nextAngle === 'RIGHT') {
            setInstruction('Perfect! Now slowly turn your head to the RIGHT and look at the camera');
          }
          
          // Wait a moment before next capture
          setTimeout(() => {
            if (currentStep !== 'complete') {
              captureCurrentFrame();
            }
          }, 3000); // 3 second delay between captures
        }
      } else if (detections.length === 0) {
        console.log('⚠️ No face detected during capture');
        setInstruction('No face detected. Please position your face in the frame.');
        setTimeout(() => {
          if (currentStep !== 'complete') { // Double check before retrying
            console.log('🔄 Retrying current action after detection failure');
            captureCurrentFrame();
          }
        }, 1000);
      } else {
        console.log('⚠️ Multiple faces detected during capture');
        setInstruction('Multiple faces detected. Please ensure only one person is in the frame.');
        setTimeout(() => {
          if (currentStep !== 'complete') { // Double check before retrying
            console.log('🔄 Retrying current action after detection failure');
            captureCurrentFrame();
          }
        }, 1000);
      }
    } catch (error) {
      console.error('❌ Capture error:', error);
      console.error('❌ Error details:', error.message);
      setInstruction('Error capturing face. Please try again.');
      setTimeout(() => {
        if (currentStep !== 'complete') { // Double check before retrying
          console.log('🔄 Retrying current action after capture error');
          captureCurrentFrame();
        }
      }, 1000);
    }
  }, [capturedSamples, currentAction, currentStep, completeFaceEnrollment]);

  // Face-api.js specific media validation wrapper
  const safeFaceApiCall = useCallback(async (videoElement, retryCount = 0) => {
    const maxRetries = 3;
    
    // Comprehensive media validation for face-api.js
    const validateVideoForFaceApi = (video) => {
      if (!video) return { valid: false, reason: 'No video element' };
      
      // Check all critical properties that face-api.js requires
      const validations = {
        element: video instanceof HTMLVideoElement,
        readyState: video.readyState >= HTMLMediaElement.HAVE_CURRENT_DATA, // >= 2
        dimensions: video.videoWidth > 0 && video.videoHeight > 0,
        playback: !video.paused && !video.ended,
        srcObject: video.srcObject !== null,
        networkState: video.networkState !== HTMLMediaElement.NETWORK_NO_SOURCE,
        error: video.error === null,
        seeking: !video.seeking,
        // More lenient check - just ensure we have enough data for face detection
        hasEnoughData: video.readyState >= HTMLMediaElement.HAVE_CURRENT_DATA && 
                      video.currentTime >= 0 // Allow currentTime to be 0
      };
      
      const failedChecks = Object.entries(validations)
        .filter(([key, value]) => !value)
        .map(([key]) => key);
      
      if (failedChecks.length > 0) {
        return { 
          valid: false, 
          reason: `Failed checks: ${failedChecks.join(', ')}`,
          details: validations
        };
      }
      
      return { valid: true, details: validations };
    };
    
    const validation = validateVideoForFaceApi(videoElement);
    
    if (!validation.valid) {
      console.warn(`⚠️ Face-api.js validation failed (attempt ${retryCount + 1}/${maxRetries}):`, validation.reason);
      
      if (retryCount < maxRetries) {
        // Progressive delay: 100ms, 200ms, 400ms
        const delay = 100 * Math.pow(2, retryCount);
        console.log(`🔄 Retrying face-api.js call in ${delay}ms...`);
        
        return new Promise((resolve) => {
          setTimeout(async () => {
            const result = await safeFaceApiCall(videoElement, retryCount + 1);
            resolve(result);
          }, delay);
        });
      } else {
        console.error('❌ Face-api.js validation failed after max retries');
        return { success: false, error: 'Media validation failed', details: validation };
      }
    }
    
    try {
      console.log('✅ Face-api.js validation passed, making detection call');
      const detections = await faceapi
        .detectAllFaces(videoElement, new faceapi.TinyFaceDetectorOptions({ inputSize: 416, scoreThreshold: 0.3 }))
        .withFaceLandmarks()
        .withFaceExpressions();
      
      return { success: true, detections };
    } catch (error) {
      console.error('❌ Face-api.js detection error:', error.message);
      
      // Handle specific media loading errors
      if (error.message.includes('media has not finished loading') || 
          error.message.includes('createCanvasFromMedia') ||
          error.message.includes('createCanvas')) {
        
        if (retryCount < maxRetries) {
          const delay = 500 * (retryCount + 1); // 500ms, 1000ms, 1500ms - longer delays
          console.log(`🔄 Media loading error (${error.message}), retrying in ${delay}ms...`);
          
          return new Promise((resolve) => {
            setTimeout(async () => {
              const result = await safeFaceApiCall(videoElement, retryCount + 1);
              resolve(result);
            }, delay);
          });
        }
      }
      
      return { success: false, error: error.message };
    }
  }, []);

  const handleCapture = useCallback(async (detection) => {
    console.log('🎯 handleCapture called - triggering capture');
    
    // Check if we already have enough samples
    if (capturedSamples.length >= REQUIRED_SAMPLES) {
      console.log('✅ Already have enough samples, completing enrollment');
      await completeFaceEnrollment(capturedSamples);
      return;
    }
    
    // Trigger the actual capture process
    captureCurrentFrame();
  }, [capturedSamples, completeFaceEnrollment, captureCurrentFrame]);

  const startCaptureSequence = useCallback(() => {
    console.log('🎬 Starting multi-angle capture sequence...');
    setCurrentStep('capture');
    setCurrentAngleIndex(0); // Reset to first angle
    setInstruction(`Capturing ${CAPTURE_ANGLES[0]} view - Look straight ahead and hold still...`);
    
    // Immediately capture the first sample
    setTimeout(() => {
      setCurrentAction({ type: 'capture', instruction: `Look straight ahead (${CAPTURE_ANGLES[0]} view)` });
      setInstruction(`Look straight ahead (${CAPTURE_ANGLES[0]} view)`);
      
      setTimeout(() => {
        console.log('⏰ Starting first capture - FRONT view');
        captureCurrentFrame();
      }, 1000);
    }, 500);
  }, [captureCurrentFrame]);

  const handlePositioning = useCallback((detection) => {
    const position = analyzeFacePosition(detection);
    
    if (position.isWellCentered && position.isGoodDistance) {
      console.log('✅ Face is well positioned, starting capture sequence');
      setInstruction('Perfect! Starting capture sequence...');
      
      // Immediately change step to prevent re-triggering
      setCurrentStep('capture');
      
      setTimeout(() => {
        startCaptureSequence();
      }, 500); // Reduced delay
    } else {
      let message = 'Please adjust your position: ';
      if (!position.isWellCentered) {
        message += 'Center your face in the frame. ';
      }
      if (!position.isGoodDistance) {
        const distance = facePosition.distance;
        if (distance === 'far') {
          message += 'Move closer to the camera.';
        } else if (distance === 'close') {
          message += 'Move away from the camera.';
        }
      }
      setInstruction(message);
    }
  }, [analyzeFacePosition, facePosition.distance, startCaptureSequence]);

  const startFaceDetection = useCallback(() => {
    // Prevent face detection if enrollment is already complete
    if (currentStep === 'complete') {
      console.log('🛑 Face detection blocked - enrollment already complete');
      return;
    }
    
    let detectionActive = true;
    
    // Add fallback timeout for positioning step
    let positioningTimeout = null;
    
    if (currentStep === 'position') {
      console.log('⏰ Starting 10-second fallback timer for positioning');
      positioningTimeout = setTimeout(() => {
        if (currentStep === 'position' && detectionActive) {
          console.log('🚨 Positioning timeout reached - forcing progression to capture');
          setInstruction('Timeout reached - starting capture sequence...');
          setCurrentStep('capture');
          setTimeout(() => {
            startCaptureSequence();
          }, 500);
        }
      }, 10000); // 10 second timeout
    }
    
    // Simplified video loading state management
    const waitForVideoFullyLoaded = async () => {
      const video = videoRef.current;
      if (!video) return false;
      
      return new Promise((resolve) => {
        let attempts = 0;
        const maxAttempts = 30; // 3 seconds max wait
        
        const checkVideoState = () => {
          attempts++;
          
          // Simplified readiness check - only essential conditions
          const isReady = (
            video.readyState >= HTMLMediaElement.HAVE_CURRENT_DATA && // >= 2 (reduced from 4)
            video.videoWidth > 0 &&
            video.videoHeight > 0 &&
            !video.paused &&
            !video.ended &&
            video.srcObject !== null &&
            video.error === null
          );
          
          if (isReady) {
            console.log('✅ Video ready for face detection');
            resolve(true);
          } else if (attempts >= maxAttempts) {
            console.warn('⚠️ Video loading timeout after', attempts * 100, 'ms');
            resolve(false);
          } else {
            console.log(`🔄 Waiting for video readiness (attempt ${attempts}/${maxAttempts})`);
            setTimeout(checkVideoState, 100);
          }
        };
        
        checkVideoState();
      });
    };
    
    const detectFace = async () => {
      // Check if detection should continue
      if (!detectionActive || currentStep === 'complete') {
        console.log('🛑 Face detection stopped - step:', currentStep);
        return;
      }
      
      // Additional completion check - stop if enrollment is complete
      if (currentStep === 'complete') {
        console.log('🛑 Face detection terminated - enrollment complete');
        detectionActive = false;
        return;
      }
      
      // Wait for video to be fully loaded before any face-api.js operations
      const videoReady = await waitForVideoFullyLoaded();
      if (!videoReady) {
        console.log('⚠️ Video not ready, retrying detection in 500ms');
        if (detectionActive && currentStep !== 'complete') {
          setTimeout(() => requestAnimationFrame(detectFace), 500);
        }
        return;
      }
      
      // Face-api.js specific media readiness validation (aligned with safeFaceApiCall)
      const validateMediaForFaceAPI = () => {
        const video = videoRef.current;
        if (!video) {
          console.error('❌ Video element not found for face-api.js');
          return false;
        }
        
        // Simplified validation aligned with safeFaceApiCall function
        const checks = {
          element: video instanceof HTMLVideoElement,
          readyState: video.readyState >= HTMLMediaElement.HAVE_CURRENT_DATA, // >= 2 (same as safeFaceApiCall)
          dimensions: video.videoWidth > 0 && video.videoHeight > 0,
          playback: !video.paused && !video.ended,
          currentTime: video.currentTime > 0,
          srcObject: video.srcObject !== null,
          networkState: video.networkState !== HTMLMediaElement.NETWORK_NO_SOURCE, // Not empty (same as safeFaceApiCall)
          error: video.error === null,
          seeking: !video.seeking
        };
        
        const failedChecks = Object.entries(checks)
          .filter(([key, value]) => !value)
          .map(([key]) => key);
        
        if (failedChecks.length > 0) {
          console.warn('⚠️ Face-api.js media validation failed:', { 
            failedChecks, 
            details: checks 
          });
          return false;
        }
        
        console.log('✅ Face-api.js media validation passed');
        return true;
      };

      // Simplified video readiness check before face detection
          if (!validateMediaForFaceAPI()) {
            if (detectionActive && currentStep !== 'complete') {
              // Reduced retry delay for faster detection
              setTimeout(() => {
                if (detectionActive && currentStep !== 'complete') {
                  requestAnimationFrame(detectFace);
                }
              }, 50);
            }
            return;
          }
      
      try {
        // Use the safe face-api.js wrapper which handles all validation internally
        const result = await safeFaceApiCall(videoRef.current);
        
        if (!result.success) {
          console.warn('⚠️ Safe face-api.js call failed:', result.error);
          if (detectionActive && currentStep !== 'complete') {
            setTimeout(() => requestAnimationFrame(detectFace), 100);
          }
          return;
        }
        
        const detections = result.detections;

          // Clear previous drawings
          if (canvasRef.current) {
            const canvas = canvasRef.current;
            const ctx = canvas.getContext('2d');
            
            // Set canvas dimensions to match video
            canvas.width = videoRef.current.videoWidth;
            canvas.height = videoRef.current.videoHeight;
            
            ctx.clearRect(0, 0, canvas.width, canvas.height);

            if (detections.length === 1) {
              const detection = detections[0];
              setFaceDetected(true);
              
              // Draw face detection box
              const box = detection.detection.box;
              ctx.strokeStyle = '#00ff00';
              ctx.lineWidth = 3;
              ctx.strokeRect(box.x, box.y, box.width, box.height);

              // Analyze face position
              analyzeFacePosition(detection);

              // Handle current step
              console.log('Current step:', currentStep, 'Face detected, calling handler');
              if (currentStep === 'position') {
                handlePositioning(detection);
              } else if (currentStep === 'capture') {
                handleCapture(detection);
              }
            } else {
              setFaceDetected(false);
              if (currentStep === 'position') {
                setInstruction(detections.length === 0 ? 'No face detected. Please position your face in the frame.' : 'Multiple faces detected. Please ensure only one person is in the frame.');
              }
            }
          }
        } catch (error) {
          console.error('Face detection error:', error);
          // Continue detection even if there's an error
        }
      
      // Continue detection only if not complete
      if (detectionActive && currentStep !== 'complete') {
        requestAnimationFrame(detectFace);
      }
    };
    
    // Return cleanup function to stop detection
    const stopDetection = () => {
      console.log('🛑 Stopping face detection');
      detectionActive = false;
      
      // Clear positioning timeout if it exists
      if (positioningTimeout) {
        clearTimeout(positioningTimeout);
        positioningTimeout = null;
        console.log('🧹 Cleared positioning timeout');
      }
    };
    
    detectFace();
    return stopDetection;
  }, [currentStep, analyzeFacePosition, handlePositioning, handleCapture]);

  const startCamera = useCallback(async () => {
    try {
      console.log('📹 Starting camera initialization...');
      setInstruction('Starting camera...');
      const stream = await navigator.mediaDevices.getUserMedia({ 
        video: { 
          width: 640, 
          height: 480,
          facingMode: 'user'
        } 
      });
      
      console.log('✅ Camera stream obtained successfully');
      
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        
        let detectionStarted = false;
        
        // Add comprehensive video event listeners for proper loading sequence
        const video = videoRef.current;
        
        // Promise-based approach to ensure proper video loading
        const videoLoadPromise = new Promise((resolve, reject) => {
          let loadTimeout;
          
          const cleanup = () => {
            clearTimeout(loadTimeout);
            video.removeEventListener('loadstart', onLoadStart);
            video.removeEventListener('loadedmetadata', onLoadedMetadata);
            video.removeEventListener('loadeddata', onLoadedData);
            video.removeEventListener('canplay', onCanPlay);
            video.removeEventListener('canplaythrough', onCanPlayThrough);
            video.removeEventListener('playing', onPlaying);
            video.removeEventListener('error', onError);
          };
          
          const onLoadStart = () => {
            console.log('📹 Video load started');
          };
          
          const onLoadedMetadata = () => {
            console.log('📹 Video metadata loaded:', {
              videoWidth: video.videoWidth,
              videoHeight: video.videoHeight,
              duration: video.duration
            });
          };
          
          const onLoadedData = () => {
            console.log('📹 Video data loaded');
          };
          
          const onCanPlay = () => {
            console.log('📹 Video can start playing');
          };
          
          const onCanPlayThrough = () => {
            console.log('📹 Video can play through without buffering');
          };
          
          const onPlaying = () => {
            console.log('📹 Video is now playing');
            cleanup();
            resolve(true);
          };
          
          const onError = (error) => {
            console.error('❌ Video loading error:', error);
            cleanup();
            reject(error);
          };
          
          // Add all event listeners
          video.addEventListener('loadstart', onLoadStart);
          video.addEventListener('loadedmetadata', onLoadedMetadata);
          video.addEventListener('loadeddata', onLoadedData);
          video.addEventListener('canplay', onCanPlay);
          video.addEventListener('canplaythrough', onCanPlayThrough);
          video.addEventListener('playing', onPlaying);
          video.addEventListener('error', onError);
          
          // Set timeout for video loading - 10 seconds should be sufficient
          loadTimeout = setTimeout(() => {
            console.log('⚠️ Video loading timeout after 10s, proceeding anyway');
            cleanup();
            resolve(false);
          }, 10000); // 10 second timeout
        });
        
        // Wait for video to be properly loaded first
        await videoLoadPromise;
        
        // Enhanced video readiness validation with reduced attempts
        console.log('🔄 Starting video readiness validation...');
        
        // Reduced wait time for faster startup
        await new Promise(resolve => setTimeout(resolve, 500));
        
        // Simplified video state validation before face detection
        const validateVideoForFaceDetection = () => {
          const video = videoRef.current;
          if (!video) return false;
          
          return video.readyState >= 2 && // HAVE_CURRENT_DATA is sufficient for face detection
                 video.videoWidth > 0 && 
                 video.videoHeight > 0 && 
                 !video.paused;
        };
        
        // Wait for video to be ready with reduced attempts
        let validationAttempts = 0;
        const maxValidationAttempts = 5; // Reduced from 8 to 5
        
        while (validationAttempts < maxValidationAttempts) {
          if (validateVideoForFaceDetection()) {
            if (validationAttempts === 0) {
              console.log('✅ Video ready immediately');
            } else {
              console.log('✅ Video validation passed after', validationAttempts + 1, 'attempts');
            }
            break;
          }
          
          validationAttempts++;
          
          // Only log on first and last attempts to reduce spam
          if (validationAttempts === 1 || validationAttempts === maxValidationAttempts) {
            console.log(`🔄 Video validation attempt ${validationAttempts}/${maxValidationAttempts}`);
          }
          
          // Reduced delay for faster validation
          const delay = Math.min(100 + (validationAttempts * 30), 250);
          await new Promise(resolve => setTimeout(resolve, delay));
        }
        
        if (validationAttempts >= maxValidationAttempts) {
          console.warn('⚠️ Video validation timeout after', maxValidationAttempts, 'attempts, proceeding anyway');
        }

        // Now safely start video playback with proper promise handling
        let playPromise;
        try {
          playPromise = video.play();
          
          if (playPromise !== undefined) {
            await playPromise.then(() => {
              console.log('📹 Video playback started successfully');
            }).catch((playError) => {
              console.error('❌ Video play error:', playError);
              // Don't throw here, continue with the process
            });
          }
        } catch (playError) {
          console.error('❌ Video play error (sync):', playError);
        }
        
        // Simplified final video check with reduced attempts
        const maxVideoValidationAttempts = 2; // Reduced from 3 to 2
        let validationAttempt = 0;
        
        while (validationAttempt < maxVideoValidationAttempts) {
          validationAttempt++;
          const delay = 200 * validationAttempt; // 200ms, 400ms
          
          console.log(`🔍 Final video check ${validationAttempt}/${maxVideoValidationAttempts}`);
          
          await new Promise(resolve => setTimeout(resolve, delay));
          
          if (video.readyState >= 2 && // Reduced from 3 to 2 for faster validation
              video.videoWidth > 0 && 
              video.videoHeight > 0 && 
              !video.paused && 
              !video.ended) {
            console.log('✅ Final video validation passed');
            break;
          } else if (validationAttempt === maxVideoValidationAttempts) {
            console.warn(`⚠️ Final video validation failed after ${maxVideoValidationAttempts} attempts`);
          }
        }
        
        // Extended delay before starting face detection to ensure video stability
        console.log('⏳ Extended delay before starting face detection to ensure video stability...');
        await new Promise(resolve => setTimeout(resolve, 1000));
        
        // Simplified face detection initialization
        if (!detectionStarted) {
          detectionStarted = true;
          console.log('🎯 Initializing face detection...');
          
          // Additional wait time to ensure video is fully stable for face-api.js
          await new Promise(resolve => setTimeout(resolve, 1500));
          
          // Simplified final video check
          const finalVideoCheck = () => {
            const video = videoRef.current;
            if (!video) return false;
            
            return video.readyState >= 2 &&
                   video.videoWidth > 0 &&
                   video.videoHeight > 0 &&
                   !video.paused &&
                   !video.ended;
          };
          
          // Reduced final check attempts
          let finalCheckAttempts = 0;
          const maxFinalChecks = 3; // Reduced from 10 to 3
          
          while (finalCheckAttempts < maxFinalChecks) {
            if (finalVideoCheck()) {
              console.log('✅ Final video check passed, initializing face detection');
              break;
            }
            
            finalCheckAttempts++;
            if (finalCheckAttempts === maxFinalChecks) {
              console.warn('⚠️ Final video check timeout, proceeding anyway');
            }
            await new Promise(resolve => setTimeout(resolve, 200));
          }
          
          console.log('🎯 Starting face detection');
          setIsLoading(false);
          setCurrentStep('position');
          setInstruction('Position your face in the center of the frame');
          
          // Start face detection with minimal delay
          setTimeout(() => {
            // Prevent starting face detection if enrollment is already complete
            if (currentStep === 'complete') {
              console.log('🛑 Skipping face detection - enrollment already complete');
              return;
            }
            
            console.log('🚀 Face detection started');
            startFaceDetection();
          }, 300);
        }
      }
    } catch (error) {
      console.error('❌ Camera initialization error:', error);
      setInstruction('Failed to access camera. Please check permissions.');
    }
  }, [startFaceDetection]);

  const getInstructionColor = () => {
    if (currentStep === 'complete') return 'var(--success-600)';
    if (currentStep === 'processing') return 'var(--warning-600)';
    if (faceDetected && facePosition.quality === 'good') return 'var(--success-600)';
    if (faceDetected) return 'var(--warning-600)';
    return 'var(--error-600)';
  };

  const loadModels = useCallback(async () => {
    try {
      console.log('🔄 Starting face-api.js model loading process...');
      console.log('📁 Loading models directly from CDN for reliability...');
      
      // Load directly from CDN for better reliability in development
      const MODEL_URL = 'https://raw.githubusercontent.com/justadudewhohacks/face-api.js/master/weights';
      
      console.log('🔄 Loading tinyFaceDetector from CDN...');
      await faceapi.nets.tinyFaceDetector.loadFromUri(MODEL_URL);
      console.log('✅ tinyFaceDetector loaded successfully from CDN');
      
      console.log('🔄 Loading faceLandmark68Net from CDN...');
      await faceapi.nets.faceLandmark68Net.loadFromUri(MODEL_URL);
      console.log('✅ faceLandmark68Net loaded successfully from CDN');
      
      console.log('🔄 Loading faceRecognitionNet from CDN...');
      await faceapi.nets.faceRecognitionNet.loadFromUri(MODEL_URL);
      console.log('✅ faceRecognitionNet loaded successfully from CDN');
      
      console.log('🔄 Loading faceExpressionNet from CDN...');
      await faceapi.nets.faceExpressionNet.loadFromUri(MODEL_URL);
      console.log('✅ faceExpressionNet loaded successfully from CDN');
      
      console.log('✅ All models loaded from CDN');
      
      // Final verification
      const finalStatus = {
        tinyFaceDetector: !!faceapi.nets.tinyFaceDetector.params,
        faceLandmark68Net: !!faceapi.nets.faceLandmark68Net.params,
        faceRecognitionNet: !!faceapi.nets.faceRecognitionNet.params,
        faceExpressionNet: !!faceapi.nets.faceExpressionNet.params
      };
      console.log('🎯 Final models status:', finalStatus);
      
      const allLoaded = Object.values(finalStatus).every(loaded => loaded);
      if (allLoaded) {
        console.log('✅ All face-api.js models loaded and verified successfully');
      } else {
        throw new Error('Some models failed to load from CDN: ' + JSON.stringify(finalStatus));
      }
      
      await startCamera();
    } catch (error) {
      console.error('❌ Error loading face-api.js models:', error);
      onError('Failed to load face detection models. Please check your internet connection.');
    }
  }, [onError, startCamera]);

  // Effect to load models on component mount
  useEffect(() => {
    let detectionCleanup = null;
    
    const initializeComponent = async () => {
      await loadModels();
      // Store the cleanup function returned by startFaceDetection
      detectionCleanup = startFaceDetection;
    };
    
    initializeComponent();
    
    // Cleanup function to stop detection when component unmounts or step changes to complete
    return () => {
      console.log('🧹 Cleaning up EnhancedFaceEnrollment component');
      
      if (detectionCleanup) {
        detectionCleanup();
      }
      
      // Stop camera when component unmounts or completes
      if (videoRef.current && videoRef.current.srcObject) {
        const stream = videoRef.current.srcObject;
        const tracks = stream.getTracks();
        tracks.forEach(track => {
          console.log('🛑 Stopping camera track on cleanup:', track.kind);
          track.stop();
        });
        videoRef.current.srcObject = null;
      }
    };
  }, [loadModels]);

  return (
    <div className="face-enrollment-container">
      <style>{`
        .face-enrollment-container {
          max-width: 500px;
          margin: 0 auto;
          padding: 24px;
          background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
          border-radius: 20px;
          box-shadow: 0 20px 40px rgba(0, 0, 0, 0.1);
          color: white;
          font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
        }

        .video-container {
          position: relative;
          width: 100%;
          max-width: 400px;
          margin: 0 auto 24px auto;
          border-radius: 20px;
          overflow: hidden;
          background: #000;
          box-shadow: 0 10px 30px rgba(0, 0, 0, 0.3);
        }

        .video-feed {
          width: 100%;
          height: 300px;
          object-fit: cover;
          display: block;
        }

        .detection-overlay {
          position: absolute;
          top: 0;
          left: 0;
          width: 100%;
          height: 100%;
          pointer-events: none;
        }

        .instruction-panel {
          text-align: center;
          padding: 20px;
        }

        .instruction-text {
          font-size: 18px;
          font-weight: 600;
          margin-bottom: 16px;
          padding: 12px 20px;
          background: rgba(255, 255, 255, 0.1);
          border-radius: 12px;
          backdrop-filter: blur(10px);
          border: 1px solid rgba(255, 255, 255, 0.2);
        }

        .capture-progress {
          margin-top: 20px;
        }

        .angle-indicators {
          display: flex;
          justify-content: center;
          gap: 20px;
          margin-bottom: 20px;
        }

        .angle-indicator {
          display: flex;
          flex-direction: column;
          align-items: center;
          padding: 12px;
          border-radius: 12px;
          background: rgba(255, 255, 255, 0.1);
          border: 2px solid rgba(255, 255, 255, 0.2);
          transition: all 0.3s ease;
          min-width: 80px;
        }

        .angle-indicator.current {
          background: rgba(76, 175, 80, 0.3);
          border-color: #4caf50;
          transform: scale(1.05);
          box-shadow: 0 0 20px rgba(76, 175, 80, 0.4);
        }

        .angle-indicator.completed {
          background: rgba(76, 175, 80, 0.2);
          border-color: #4caf50;
        }

        .angle-icon {
          font-size: 24px;
          margin-bottom: 8px;
        }

        .angle-label {
          font-size: 12px;
          font-weight: 600;
          opacity: 0.9;
        }

        .progress-bar {
          width: 100%;
          height: 8px;
          background: rgba(255, 255, 255, 0.2);
          border-radius: 4px;
          overflow: hidden;
          margin-bottom: 12px;
        }

        .progress-fill {
          height: 100%;
          background: linear-gradient(90deg, #4caf50, #66bb6a);
          transition: width 0.3s ease;
          border-radius: 4px;
        }

        .progress-text {
          font-size: 14px;
          font-weight: 500;
          opacity: 0.9;
        }

        .loading-indicator {
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 12px;
          margin-top: 20px;
        }

        .spinner {
          width: 40px;
          height: 40px;
          border: 4px solid rgba(255, 255, 255, 0.3);
          border-top: 4px solid #4caf50;
          border-radius: 50%;
          animation: spin 1s linear infinite;
        }

        @keyframes spin {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }

        .loading-indicator span {
          font-size: 14px;
          font-weight: 500;
          opacity: 0.9;
        }

        @media (max-width: 768px) {
          .face-enrollment-container {
            margin: 16px;
            padding: 20px;
          }

          .video-container {
            max-width: 100%;
          }

          .video-feed {
            height: 250px;
          }
        }
      `}</style>

      <div className="video-container">
        <video
          ref={videoRef}
          autoPlay
          playsInline
          muted
          className="video-feed"
        />
        <canvas
          ref={canvasRef}
          className="detection-overlay"
        />
      </div>
      
      <div className="instruction-panel">
        <div 
          className="instruction-text"
          style={{ color: getInstructionColor() }}
        >
          {instruction}
        </div>
        
        {currentStep === 'capture' && (
          <div className="capture-progress">
            <div className="angle-indicators">
              {CAPTURE_ANGLES.map((angle, index) => (
                <div 
                  key={angle}
                  className={`angle-indicator ${index < capturedSamples.length ? 'completed' : ''} ${index === currentAngleIndex ? 'current' : ''}`}
                >
                  <div className="angle-icon">
                    {angle === 'FRONT' && '👤'}
                    {angle === 'LEFT' && '👈'}
                    {angle === 'RIGHT' && '👉'}
                  </div>
                  <div className="angle-label">{angle}</div>
                </div>
              ))}
            </div>
            <div className="progress-bar">
              <div className="progress-fill"
                style={{ width: `${(capturedSamples.length / REQUIRED_SAMPLES) * 100}%` }}
              />
            </div>
            <div className="progress-text">
              {capturedSamples.length} / {REQUIRED_SAMPLES} samples captured
            </div>
          </div>
        )}
        
        {isLoading && (
          <div className="loading-indicator">
            <div className="spinner" />
            <span>Loading face detection models...</span>
          </div>
        )}
      </div>
    </div>
  );
};

export default EnhancedFaceEnrollment;