import React, { useState, useRef, useEffect, useCallback } from 'react';
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
  const [countdown, setCountdown] = useState(0);
  const [captureStatus, setCaptureStatus] = useState(''); // 'ready', 'capturing', 'captured'

  const API_BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:5000/api';
  const REQUIRED_SAMPLES = 1;
  const FACE_ACTIONS = ['neutral'];

  useEffect(() => {
    loadModels();
  }, [loadModels]);

  const loadModels = useCallback(async () => {
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
  }, [onError]);

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
    
    const isWellCentered = offsetX < 50 && offsetY < 50;
    
    // Estimate distance based on face size
    const faceArea = box.width * box.height;
    const videoArea = videoWidth * videoHeight;
    const faceRatio = faceArea / videoArea;
    
    const isGoodDistance = faceRatio > 0.05 && faceRatio < 0.25;
    
    setFacePosition({
      centered: isWellCentered,
      distance: isGoodDistance ? 'good' : (faceRatio < 0.05 ? 'far' : 'close'),
      quality: isWellCentered && isGoodDistance ? 'good' : 'poor'
    });
    
    return { isWellCentered, isGoodDistance };
  }, []);

  const handleCapture = useCallback(async (detection) => {
    console.log('🎯 handleCapture called');
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
      
      // Call onComplete with the enrollment data
      const enrollmentData = {
        faceDescriptor: avgDescriptor,
        samples: samples,
        timestamp: new Date().toISOString(),
        quality: 'high'
      };
      
      console.log('🎉 Face enrollment completed successfully!');
      setCurrentStep('complete');
      setInstruction('Face enrollment completed successfully!');
      
      // Call the completion callback
      if (onFaceEnrolled) {
        onFaceEnrolled(enrollmentData);
      }
      
    } catch (error) {
      console.error('❌ Face enrollment failed:', error);
      onError('Face enrollment failed: ' + error.message);
    }
  }, [onFaceEnrolled, onError]);

  const captureCurrentFrame = useCallback(async () => {
    try {
      console.log('🔍 Starting face detection for capture...');
      const detections = await faceapi
        .detectAllFaces(videoRef.current, new faceapi.TinyFaceDetectorOptions({ inputSize: 416, scoreThreshold: 0.3 }))
        .withFaceLandmarks()
        .withFaceDescriptors();

      console.log(`👥 Detected ${detections.length} face(s)`);
      if (detections.length === 1) {
        const detection = detections[0];
        const descriptor = detection.descriptor;
        
        console.log(`📊 Face descriptor length: ${descriptor.length}`);
        console.log(`🎯 Current action: ${currentAction}`);
        console.log(`📸 Captured samples so far: ${capturedSamples.length}/${REQUIRED_SAMPLES}`);
        
        // Add to captured samples
        const newSamples = [...capturedSamples, Array.from(descriptor)];
        setCapturedSamples(newSamples);
        
        console.log(`✅ Sample ${newSamples.length} captured successfully!`);
        
        if (newSamples.length >= REQUIRED_SAMPLES) {
          console.log('🎉 All samples collected! Starting enrollment process...');
          completeFaceEnrollment(newSamples);
        } else {
          console.log(`🔄 Need ${REQUIRED_SAMPLES - newSamples.length} more samples`);
          setTimeout(() => {
            console.log('🎬 Moving to next action');
            executeCurrentAction();
          }, 1000);
        }
      } else {
        console.log('❌ Face detection failed during capture');
        setInstruction('Face not detected clearly. Please position yourself properly and try again.');
        setTimeout(() => {
          console.log('🔄 Retrying current action after detection failure');
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
  }, [capturedSamples, executeCurrentAction, completeFaceEnrollment, currentAction]);

  const executeCurrentAction = useCallback(() => {
    console.log('🎬 executeCurrentAction called with:', currentAction);
    if (currentAction && currentAction.type === 'capture') {
      console.log('📸 Executing capture action');
      captureCurrentFrame();
    } else {
      console.log('⚠️ No valid action to execute:', currentAction);
    }
  }, [currentAction, captureCurrentFrame]);

  const startCaptureSequence = useCallback(() => {
    console.log('🎬 Starting capture sequence...');
    setCurrentStep('capture');
    setInstruction('Hold still while we capture your face...');
    
    const actions = [
      { type: 'capture', instruction: 'Look straight ahead' },
      { type: 'capture', instruction: 'Slight smile' },
      { type: 'capture', instruction: 'Look slightly left' },
      { type: 'capture', instruction: 'Look slightly right' },
      { type: 'capture', instruction: 'Final capture' }
    ];
    
    let currentIndex = 0;
    
    const processNextAction = () => {
      if (currentIndex < actions.length && capturedSamples.length < REQUIRED_SAMPLES) {
        const action = actions[currentIndex];
        console.log(`🎯 Setting action ${currentIndex + 1}:`, action);
        setCurrentAction(action);
        setInstruction(action.instruction);
        currentIndex++;
        
        setTimeout(() => {
          console.log('⏰ Timeout reached, executing current action');
          executeCurrentAction();
        }, 2000);
      }
    };
    
    processNextAction();
  }, [capturedSamples.length, executeCurrentAction]);

  const handlePositioning = useCallback((detection) => {
    const position = analyzeFacePosition(detection);
    
    if (position.isWellCentered && position.isGoodDistance) {
      console.log('✅ Face is well positioned, starting capture sequence');
      setInstruction('Perfect! Starting capture sequence...');
      setTimeout(() => {
        startCaptureSequence();
      }, 1000);
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
      console.error('Camera access error:', error);
      onError('Failed to access camera');
    }
  }, [onError, startFaceDetection]);

  const getInstructionColor = () => {
    if (currentStep === 'complete') return 'var(--success-600)';
    if (currentStep === 'processing') return 'var(--warning-600)';
    if (faceDetected && facePosition.quality === 'good') return 'var(--success-600)';
    if (faceDetected) return 'var(--warning-600)';
    return 'var(--error-600)';
  };

  // Effect to load models on component mount
  useEffect(() => {
    loadModels();
  }, [loadModels]);

  return (
    <div className="face-enrollment-container">
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
            <div className="progress-bar">
              <div 
                className="progress-fill"
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