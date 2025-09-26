import React, { useState, useRef, useEffect } from 'react';
import * as faceapi from 'face-api.js';
import axios from 'axios';

const EnhancedFaceEnrollment = ({ studentId, onFaceEnrolled, onError }) => {
  const videoRef = useRef();
  const canvasRef = useRef();
  const [isLoading, setIsLoading] = useState(true);
  const [currentStep, setCurrentStep] = useState('loading'); // loading, position, capture, processing, complete
  const [instruction, setInstruction] = useState('Loading face detection models...');
  const [capturedSamples, setCapturedSamples] = useState([]);
  const [progress, setProgress] = useState(0);
  const [faceDetected, setFaceDetected] = useState(false);
  const [facePosition, setFacePosition] = useState({ distance: 'unknown', centered: false });
  const [currentAction, setCurrentAction] = useState(null); // 'blink', 'smile', 'neutral', 'turn_left', 'turn_right'
  const [actionCompleted, setActionCompleted] = useState(false);
  const [countdown, setCountdown] = useState(0);
  const [captureStatus, setCaptureStatus] = useState(''); // 'ready', 'capturing', 'captured'

  const API_BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:5000/api';
  const REQUIRED_SAMPLES = 1;
  const FACE_ACTIONS = ['neutral'];

  useEffect(() => {
    loadModels();
    return () => {
      if (videoRef.current && videoRef.current.srcObject) {
        videoRef.current.srcObject.getTracks().forEach(track => track.stop());
      }
    };
  }, []);

  const loadModels = async () => {
    try {
      console.log('🤖 Starting face detection model loading...');
      setInstruction('Loading AI models...');
      const MODEL_URL = 'https://raw.githubusercontent.com/justadudewhohacks/face-api.js/master/weights';
      
      console.log('📥 Loading face detection models from:', MODEL_URL);
      await Promise.all([
        faceapi.nets.tinyFaceDetector.loadFromUri(MODEL_URL),
        faceapi.nets.faceLandmark68Net.loadFromUri(MODEL_URL),
        faceapi.nets.faceRecognitionNet.loadFromUri(MODEL_URL),
        faceapi.nets.faceExpressionNet.loadFromUri(MODEL_URL)
      ]);
      
      console.log('✅ All face detection models loaded successfully');
      await startCamera();
    } catch (error) {
      console.error('Error loading models:', error);
      onError('Failed to load face detection models');
    }
  };

  const startCamera = async () => {
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
        
        // Multiple event listeners to ensure transition happens
        const transitionToPosition = () => {
          console.log('📹 Video ready, transitioning to position step');
          console.log('✅ Camera is now ready for face detection');
          setIsLoading(false);
          setCurrentStep('position');
          setInstruction('Position your face in the center of the frame');
          startFaceDetection();
        };
        
        videoRef.current.onloadedmetadata = transitionToPosition;
        videoRef.current.oncanplay = transitionToPosition;
        
        // Force transition after 2 seconds regardless
        setTimeout(() => {
          console.log('Forcing transition to position step after timeout');
          setIsLoading(false);
          setCurrentStep('position');
          setInstruction('Position your face in the center of the frame');
          startFaceDetection();
        }, 2000);
      }
    } catch (error) {
      console.error('Camera error:', error);
      onError('Failed to access camera');
    }
  };

  const startFaceDetection = () => {
    const detectFace = async () => {
      if (videoRef.current && videoRef.current.readyState === 4) {
        const detections = await faceapi
          .detectAllFaces(videoRef.current, new faceapi.TinyFaceDetectorOptions({ inputSize: 416, scoreThreshold: 0.3 }))
          .withFaceLandmarks()
          .withFaceExpressions();

        // Clear previous drawings
        if (canvasRef.current) {
          const canvas = canvasRef.current;
          const ctx = canvas.getContext('2d');
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
      }
      
      if (currentStep !== 'complete') {
        requestAnimationFrame(detectFace);
      }
    };
    
    detectFace();
  };

  const analyzeFacePosition = (detection) => {
    const box = detection.detection.box;
    const videoWidth = videoRef.current.videoWidth;
    const videoHeight = videoRef.current.videoHeight;
    
    // Check if face is centered
    const centerX = box.x + box.width / 2;
    const centerY = box.y + box.height / 2;
    const videoCenterX = videoWidth / 2;
    const videoCenterY = videoHeight / 2;
    
    const horizontalOffset = Math.abs(centerX - videoCenterX);
    const verticalOffset = Math.abs(centerY - videoCenterY);
    
    const centered = horizontalOffset < videoWidth * 0.15 && verticalOffset < videoHeight * 0.15;
    
    // Estimate distance based on face size
    const faceArea = box.width * box.height;
    const optimalArea = videoWidth * videoHeight * 0.10; // Face should be ~10% of frame
    
    let distance = 'good';
    if (faceArea < optimalArea * 0.5) {
      distance = 'too_far';
    } else if (faceArea > optimalArea * 2.0) {
      distance = 'too_close';
    }
    
    console.log('Face analysis:', {
      faceArea,
      optimalArea,
      centered,
      distance,
      horizontalOffset,
      verticalOffset,
      videoWidth,
      videoHeight
    });
    
    setFacePosition({ distance, centered });
  };

  const handlePositioning = (detection) => {
    // Get fresh position data directly from analysis instead of state
    const box = detection.detection.box;
    const videoWidth = videoRef.current.videoWidth;
    const videoHeight = videoRef.current.videoHeight;
    
    const centerX = box.x + box.width / 2;
    const centerY = box.y + box.height / 2;
    const videoCenterX = videoWidth / 2;
    const videoCenterY = videoHeight / 2;
    
    const horizontalOffset = Math.abs(centerX - videoCenterX);
    const verticalOffset = Math.abs(centerY - videoCenterY);
    const centered = horizontalOffset < videoWidth * 0.15 && verticalOffset < videoHeight * 0.15;
    
    const faceArea = box.width * box.height;
    const optimalArea = videoWidth * videoHeight * 0.10;
    let distance = 'good';
    if (faceArea < optimalArea * 0.5) {
      distance = 'too_far';
    } else if (faceArea > optimalArea * 2.0) {
      distance = 'too_close';
    }
    
    console.log('Real-time positioning check:', { distance, centered, currentStep, faceArea, optimalArea });
    
    if (!centered) {
      setInstruction('Please center your face in the frame');
    } else if (distance === 'too_far') {
      setInstruction('Move closer to the camera');
    } else if (distance === 'too_close') {
      setInstruction('Move back from the camera');
    } else {
      console.log('Perfect positioning detected! Starting capture sequence...');
      setInstruction('Perfect! Hold still while we prepare...');
      setTimeout(() => {
        console.log('Transitioning to capture step');
        setCurrentStep('capture');
        startCaptureSequence();
      }, 1000);
    }
  };

  const startCaptureSequence = () => {
    console.log('🚀 Start Capture Sequence initiated!');
    console.log(`👤 Student ID: ${studentId}`);
    
    console.log('✅ Starting face enrollment process...');
    setCurrentAction(FACE_ACTIONS[0]);
    setActionCompleted(false);
    setCountdown(3);
    
    console.log('⏰ Starting 3-second countdown...');
    const countdownInterval = setInterval(() => {
      setCountdown(prev => {
        console.log(`⏰ Countdown: ${prev}`);
        if (prev <= 1) {
          clearInterval(countdownInterval);
          console.log('⏰ Countdown finished! Starting first action...');
          executeCurrentAction();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
  };

  const executeCurrentAction = () => {
    console.log(`🎬 Executing action ${capturedSamples.length + 1}/${REQUIRED_SAMPLES}`);
    const action = FACE_ACTIONS[capturedSamples.length];
    console.log(`📋 Current action: ${action}`);
    setCurrentAction(action);
    setCaptureStatus('ready');
    
    switch (action) {
      case 'neutral':
        setInstruction('Look straight at the camera with a neutral expression');
        break;
      case 'smile':
        setInstruction('Please smile naturally');
        break;
      case 'blink':
        setInstruction('Blink your eyes slowly');
        break;
      case 'turn_left':
        setInstruction('Turn your head slightly to the left');
        break;
      case 'turn_right':
        setInstruction('Turn your head slightly to the right');
        break;
    }
    
    console.log(`📋 Setting instruction: ${action}`);
    
    // Show "Get ready" message
    setTimeout(() => {
      console.log('⏱️ Showing get ready message');
      setInstruction('📸 Get ready... Capturing in 1 second!');
      setCaptureStatus('capturing');
    }, 1500);
    
    // Auto-capture after 2 seconds
    setTimeout(() => {
      console.log('📸 Attempting to capture frame now');
      captureCurrentFrame();
    }, 2000);
  };

  const handleCapture = async (detection) => {
    // This function is called continuously during capture phase
    // The actual capture is triggered by executeCurrentAction
  };

  const captureCurrentFrame = async () => {
    try {
      console.log('🔍 Starting face detection for capture...');
      const detections = await faceapi
        .detectAllFaces(videoRef.current, new faceapi.TinyFaceDetectorOptions({ inputSize: 416, scoreThreshold: 0.3 }))
        .withFaceLandmarks()
        .withFaceDescriptors();

      console.log(`👥 Detected ${detections.length} face(s)`);
      if (detections.length === 1) {
        console.log('✅ Single face detected, extracting descriptor...');
        const faceDescriptor = Array.from(detections[0].descriptor);
        console.log(`📊 Face descriptor length: ${faceDescriptor.length}`);
        const newSamples = [...capturedSamples, faceDescriptor];
        console.log(`💾 Updating samples: ${newSamples.length}/${REQUIRED_SAMPLES}`);
        setCapturedSamples(newSamples);
        
        // Set capture status and provide feedback
        setCaptureStatus('captured');
        console.log(`✅ Sample ${newSamples.length}/${REQUIRED_SAMPLES} captured successfully!`);
        console.log(`📊 Total samples collected: ${newSamples.length}`);
        console.log(`🎯 Progress: ${Math.round((newSamples.length / REQUIRED_SAMPLES) * 100)}%`);
        
        // Flash effect for capture feedback
        if (canvasRef.current) {
          const canvas = canvasRef.current;
          const ctx = canvas.getContext('2d');
          ctx.fillStyle = 'rgba(0, 255, 0, 0.3)';
          ctx.fillRect(0, 0, canvas.width, canvas.height);
          setTimeout(() => {
            ctx.clearRect(0, 0, canvas.width, canvas.height);
          }, 200);
        }
        
        // Audio feedback (optional - browser will handle permission)
        try {
          const audioContext = new (window.AudioContext || window.webkitAudioContext)();
          const oscillator = audioContext.createOscillator();
          const gainNode = audioContext.createGain();
          oscillator.connect(gainNode);
          gainNode.connect(audioContext.destination);
          oscillator.frequency.setValueAtTime(800, audioContext.currentTime);
          gainNode.gain.setValueAtTime(0.1, audioContext.currentTime);
          oscillator.start();
          oscillator.stop(audioContext.currentTime + 0.1);
        } catch (e) {
          // Audio not available, continue silently
        }
        
        const newProgress = (newSamples.length / REQUIRED_SAMPLES) * 100;
        setProgress(newProgress);
        
        if (newSamples.length < REQUIRED_SAMPLES) {
          console.log(`🔄 Need more samples: ${newSamples.length}/${REQUIRED_SAMPLES}`);
          setInstruction(`✅ Sample ${newSamples.length}/${REQUIRED_SAMPLES} captured! Preparing next pose...`);
          setTimeout(() => {
            console.log('🔄 Starting next capture sequence...');
            setCaptureStatus(''); // Reset status for next capture
            setCountdown(3);
            const countdownInterval = setInterval(() => {
              setCountdown(prev => {
                if (prev <= 1) {
                  clearInterval(countdownInterval);
                  console.log('⏰ Countdown finished, executing next action');
                  executeCurrentAction();
                  return 0;
                }
                return prev - 1;
              });
            }, 1000);
          }, 1000);
        } else {
          console.log('🏁 All samples collected! Starting enrollment completion...');
          completeFaceEnrollment(newSamples);
        }
      } else {
        console.log(`❌ Face detection failed: ${detections.length} faces detected`);
        setInstruction('Face not detected clearly. Please hold still and try again.');
        setTimeout(() => {
          console.log('🔄 Retrying current action after face detection failure');
          executeCurrentAction();
        }, 1000);
      }
    } catch (error) {
      console.error('❌ Capture error:', error);
      console.error('❌ Error details:', error.message);
      setInstruction('Error capturing face. Please try again.');
      setTimeout(() => {
        console.log('🔄 Retrying current action after capture error');
        executeCurrentAction();
      }, 1000);
    }
  };

  const completeFaceEnrollment = async (samples) => {
    try {
      setCurrentStep('processing');
      setInstruction('Processing your face data...');
      
      // Calculate average descriptor from all samples
      const avgDescriptor = new Array(samples[0].length).fill(0);
      samples.forEach(sample => {
        sample.forEach((value, index) => {
          avgDescriptor[index] += value;
        });
      });
      avgDescriptor.forEach((_, index) => {
        avgDescriptor[index] /= samples.length;
      });

      console.log('Sending face enrollment data:', {
        studentId,
        descriptorLength: avgDescriptor.length,
        sampleCount: samples.length,
        apiUrl: `${API_BASE_URL}/students/enroll-face`
      });

      // Send to backend
      const response = await axios.post(`${API_BASE_URL}/students/enroll-face`, {
        studentId,
        faceDescriptor: avgDescriptor,
        sampleCount: samples.length
      });

      console.log('✅ Enrollment response received:', response.data);
      console.log('✅ Face data successfully stored in database!');

      setCurrentStep('complete');
      setInstruction('🎉 Face enrollment completed successfully! Your face has been saved and is ready for verification.');
      
      // Show success notification
      setTimeout(() => {
        setInstruction('✅ Enrollment Complete! You can now use face verification for attendance.');
      }, 2000);
      
      if (onFaceEnrolled) {
        onFaceEnrolled({
          studentId,
          faceDescriptor: avgDescriptor,
          sampleCount: samples.length,
          success: true
        });
      }
    } catch (error) {
      console.error('❌ Enrollment error:', error);
      console.error('❌ Error details:', error.response?.data);
      console.error('❌ Network status:', error.response?.status);
      console.error('❌ API URL used:', `${API_BASE_URL}/students/enroll-face`);
      
      // Handle duplicate face error specifically
      if (error.response?.status === 409) {
        const errorData = error.response.data;
        console.error('⚠️ Duplicate face detected:', errorData);
        
        setCurrentStep('complete');
        setInstruction('❌ Face Already Registered');
        
        const duplicateMessage = errorData.message || 
          `This face is already registered for another student (${errorData.existingStudentId}). Each person can only enroll their face once in the system.`;
        
        onError(duplicateMessage);
        return;
      }
      
      const errorMessage = error.response?.data?.error || error.message;
      console.error('❌ Final error message:', errorMessage);
      
      onError(`Failed to enroll face: ${errorMessage}. Please try again.`);
    }
  };

  const getInstructionColor = () => {
    if (currentStep === 'complete') return 'var(--success-600)';
    if (currentStep === 'processing') return 'var(--warning-600)';
    if (faceDetected && facePosition.centered && facePosition.distance === 'good') return 'var(--success-600)';
    return 'var(--primary-600)';
  };

  return (
    <div className="max-w-2xl mx-auto p-6 theme-transition" style={{ backgroundColor: 'var(--bg-secondary)', borderRadius: '1rem' }}>
      <div className="text-center mb-6">
        <h2 className="text-2xl font-bold mb-2" style={{ color: 'var(--text-primary)' }}>
          Enhanced Face Enrollment
        </h2>
        <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>
          Follow the guided instructions for optimal face recognition
        </p>
      </div>

      {/* Progress Bar and Sample Indicators */}
      {currentStep === 'capture' && (
        <div className="mb-4">
          <div className="flex justify-between text-sm mb-2" style={{ color: 'var(--text-secondary)' }}>
            <span>Samples Captured</span>
            <span>{capturedSamples.length}/{REQUIRED_SAMPLES}</span>
          </div>
          <div className="w-full rounded-full h-2 mb-3" style={{ backgroundColor: 'var(--bg-tertiary)' }}>
            <div 
              className="h-2 rounded-full transition-all duration-300" 
              style={{ 
                backgroundColor: 'var(--success-500)', 
                width: `${progress}%` 
              }}
            />
          </div>
          {/* Sample Capture Indicators */}
          <div className="flex justify-center space-x-2 mb-4">
            {[...Array(REQUIRED_SAMPLES)].map((_, index) => (
              <div
                key={index}
                className={`w-4 h-4 rounded-full border-2 transition-all duration-300 ${
                  index < capturedSamples.length 
                    ? 'animate-pulse' 
                    : ''
                }`}
                style={{
                  backgroundColor: index < capturedSamples.length ? 'var(--success-500)' : 'transparent',
                  borderColor: index < capturedSamples.length ? 'var(--success-500)' : 'var(--border-primary)',
                  transform: index < capturedSamples.length ? 'scale(1.1)' : 'scale(1)'
                }}
              >
                {index < capturedSamples.length && (
                  <div className="w-full h-full flex items-center justify-center text-white text-xs font-bold">
                    ✓
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Camera Feed */}
      <div className="relative mb-4">
        <video
          ref={videoRef}
          autoPlay
          muted
          className="w-full rounded-lg"
          style={{ maxHeight: '400px', objectFit: 'cover' }}
        />
        <canvas
          ref={canvasRef}
          className="absolute top-0 left-0 w-full h-full"
          width={640}
          height={480}
          style={{ maxHeight: '400px' }}
        />
        
        {/* Countdown Overlay */}
        {countdown > 0 && (
          <div className="absolute inset-0 flex items-center justify-center bg-black bg-opacity-50 rounded-lg">
            <div className="text-6xl font-bold text-white animate-pulse">
              {countdown}
            </div>
          </div>
        )}
      </div>

      {/* Instructions */}
      <div className="text-center mb-4">
        <p 
          className="text-lg font-semibold mb-2 transition-colors duration-300"
          style={{ color: getInstructionColor() }}
        >
          {instruction}
        </p>
        
        {currentStep === 'capture' && currentAction && (
          <div className="space-y-2">
            <div className="flex items-center justify-center gap-2 text-sm" style={{ color: 'var(--text-secondary)' }}>
              <span>Current action:</span>
              <span className="font-semibold capitalize" style={{ color: 'var(--primary-600)' }}>
                {currentAction.replace('_', ' ')}
              </span>
            </div>
            {/* Capture Status Indicator */}
            {captureStatus && (
              <div className="flex items-center justify-center gap-2 text-sm">
                <div 
                  className={`w-3 h-3 rounded-full ${
                    captureStatus === 'ready' ? 'bg-yellow-500 animate-pulse' :
                    captureStatus === 'capturing' ? 'bg-red-500 animate-ping' :
                    captureStatus === 'captured' ? 'bg-green-500' : ''
                  }`}
                />
                <span style={{ 
                  color: captureStatus === 'ready' ? 'var(--warning-600)' :
                         captureStatus === 'capturing' ? 'var(--error-600)' :
                         captureStatus === 'captured' ? 'var(--success-600)' : 'var(--text-secondary)'
                }}>
                  {captureStatus === 'ready' ? 'Ready to capture' :
                   captureStatus === 'capturing' ? '📸 Capturing now!' :
                   captureStatus === 'captured' ? '✅ Captured!' : ''}
                </span>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Status Indicators */}
      {currentStep === 'position' && (
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div className="flex items-center gap-2">
              <div 
                className={`w-3 h-3 rounded-full ${
                  faceDetected ? 'bg-green-500' : 'bg-red-500'
                }`}
              />
              <span style={{ color: 'var(--text-secondary)' }}>
                Face {faceDetected ? 'Detected' : 'Not Detected'}
              </span>
            </div>
            <div className="flex items-center gap-2">
              <div 
                className={`w-3 h-3 rounded-full ${
                  facePosition.centered ? 'bg-green-500' : 'bg-yellow-500'
                }`}
              />
              <span style={{ color: 'var(--text-secondary)' }}>
                Position {facePosition.centered ? 'Good' : 'Adjust'}
              </span>
            </div>
          </div>
          
          {/* Manual Start Capture Button */}
          {faceDetected && facePosition.centered && facePosition.distance === 'good' && (
            <div className="text-center">
              <button
                onClick={() => {
                  console.log('🚀 Manual Start Capture button clicked!');
                  setCurrentStep('capture');
                  startCaptureSequence();
                }}
                className="px-6 py-3 rounded-lg font-semibold text-white transition-all duration-200 hover:scale-105 active:scale-95"
                style={{ 
                  backgroundColor: 'var(--success-500)',
                  boxShadow: '0 4px 12px rgba(34, 197, 94, 0.3)'
                }}
              >
                🎯 Start Face Capture
              </button>
              <p className="text-xs mt-2" style={{ color: 'var(--text-secondary)' }}>
                Perfect positioning detected! Click to begin capturing your face.
              </p>
            </div>
          )}
        </div>
      )}

      {/* Success Completion Indicator */}
      {currentStep === 'complete' && (
        <div className="text-center p-6 rounded-lg mb-4" style={{ backgroundColor: 'var(--success-100)', border: '2px solid var(--success-300)' }}>
          <div className="text-6xl mb-4">🎉</div>
          <h3 className="text-xl font-bold mb-2" style={{ color: 'var(--success-700)' }}>
            Enrollment Complete!
          </h3>
          <p className="text-sm" style={{ color: 'var(--success-600)' }}>
            Your face has been successfully captured and stored. You can now proceed to use face verification for attendance.
          </p>
        </div>
      )}

      {isLoading && (
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 mx-auto mb-2" style={{ borderColor: 'var(--primary-500)' }} />
          <p style={{ color: 'var(--text-secondary)' }}>Loading...</p>
        </div>
      )}
    </div>
  );
};

export default EnhancedFaceEnrollment;