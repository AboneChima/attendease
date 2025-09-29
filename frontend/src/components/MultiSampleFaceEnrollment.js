import React, { useState, useRef, useEffect, useCallback } from 'react';
import * as faceapi from 'face-api.js';

const MultiSampleFaceEnrollment = ({ studentId, onEnrollmentComplete, onError }) => {
  const videoRef = useRef();
  const canvasRef = useRef();
  const [isLoading, setIsLoading] = useState(true);
  const [currentStep, setCurrentStep] = useState('loading'); // loading, session, capture, processing, complete
  const [instruction, setInstruction] = useState('Loading face detection models...');
  const [sessionId, setSessionId] = useState(null);
  const [sessionData, setSessionData] = useState(null);
  const [currentAngle, setCurrentAngle] = useState(0); // 0: front, 1: left, 2: right
  const [capturedSamples, setCapturedSamples] = useState([]);
  const [faceDetected, setFaceDetected] = useState(false);
  const [qualityFeedback, setQualityFeedback] = useState({});
  const [isCapturing, setIsCapturing] = useState(false);
  const [detectionInterval, setDetectionInterval] = useState(null);

  const ANGLES = [
    { name: 'front', label: 'Front View', instruction: 'Look straight at the camera', icon: '👤' },
    { name: 'left', label: 'Left Turn', instruction: 'Turn your head slightly to the left', icon: '↖️' },
    { name: 'right', label: 'Right Turn', instruction: 'Turn your head slightly to the right', icon: '↗️' }
  ];

  // Load face-api models
  const loadModels = useCallback(async () => {
    try {
      console.log('🔄 Loading face detection models...');
      setInstruction('Loading AI models for face detection...');
      
      const MODEL_URL = '/models';
      await Promise.all([
        faceapi.nets.tinyFaceDetector.loadFromUri(MODEL_URL),
        faceapi.nets.faceLandmark68Net.loadFromUri(MODEL_URL),
        faceapi.nets.faceRecognitionNet.loadFromUri(MODEL_URL),
        faceapi.nets.faceExpressionNet.loadFromUri(MODEL_URL)
      ]);
      
      console.log('✅ Face detection models loaded successfully');
      setIsLoading(false);
      setCurrentStep('session');
      setInstruction('Starting enrollment session...');
    } catch (error) {
      console.error('❌ Error loading face detection models:', error);
      setInstruction('Failed to load face detection models');
      onError?.(error);
    }
  }, [onError]);

  // Start enrollment session
  const startEnrollmentSession = useCallback(async () => {
    try {
      console.log('🚀 Starting enrollment session for student:', studentId);
      
      const response = await fetch('/api/face/enrollment/start-enrollment', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ studentId }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to start enrollment session');
      }

      console.log('✅ Enrollment session started:', data);
      setSessionId(data.sessionId);
      setSessionData(data);
      setCurrentStep('capture');
      setCurrentAngle(0);
      setInstruction(`Position yourself for ${ANGLES[0].label}: ${ANGLES[0].instruction}`);
      
      // Start camera
      await startCamera();
    } catch (error) {
      console.error('❌ Error starting enrollment session:', error);
      setInstruction('Failed to start enrollment session');
      onError?.(error);
    }
  }, [studentId, onError]);

  // Start camera
  const startCamera = useCallback(async () => {
    try {
      console.log('📹 Starting camera...');
      
      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          width: { ideal: 640 },
          height: { ideal: 480 },
          facingMode: 'user'
        }
      });

      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        videoRef.current.onloadedmetadata = () => {
          videoRef.current.play();
          startFaceDetection();
        };
      }
    } catch (error) {
      console.error('❌ Error accessing camera:', error);
      setInstruction('Failed to access camera');
      onError?.(error);
    }
  }, []);

  // Start face detection
  const startFaceDetection = useCallback(() => {
    if (detectionInterval) {
      clearInterval(detectionInterval);
    }

    const interval = setInterval(async () => {
      if (videoRef.current && canvasRef.current && currentStep === 'capture') {
        try {
          const detection = await faceapi
            .detectSingleFace(videoRef.current, new faceapi.TinyFaceDetectorOptions())
            .withFaceLandmarks()
            .withFaceDescriptor();

          if (detection) {
            setFaceDetected(true);
            
            // Analyze face quality
            const quality = analyzeFaceQuality(detection);
            setQualityFeedback(quality);
            
            // Draw detection overlay
            drawDetectionOverlay(detection);
          } else {
            setFaceDetected(false);
            setQualityFeedback({});
            clearCanvas();
          }
        } catch (error) {
          console.error('Face detection error:', error);
        }
      }
    }, 100);

    setDetectionInterval(interval);
  }, [currentStep, detectionInterval]);

  // Analyze face quality
  const analyzeFaceQuality = useCallback((detection) => {
    const box = detection.detection.box;
    const landmarks = detection.landmarks;
    const videoWidth = videoRef.current.videoWidth;
    const videoHeight = videoRef.current.videoHeight;

    // Face size check
    const faceArea = box.width * box.height;
    const videoArea = videoWidth * videoHeight;
    const faceRatio = faceArea / videoArea;
    const sizeOk = faceRatio > 0.05 && faceRatio < 0.4;

    // Centering check
    const centerX = box.x + box.width / 2;
    const centerY = box.y + box.height / 2;
    const videoCenterX = videoWidth / 2;
    const videoCenterY = videoHeight / 2;
    const offsetX = Math.abs(centerX - videoCenterX) / videoWidth;
    const offsetY = Math.abs(centerY - videoCenterY) / videoHeight;
    const centered = offsetX < 0.2 && offsetY < 0.2;

    // Pose estimation (simplified)
    const leftEye = landmarks.getLeftEye();
    const rightEye = landmarks.getRightEye();
    const nose = landmarks.getNose();
    
    const eyeDistance = Math.abs(leftEye[0].x - rightEye[3].x);
    const expectedEyeDistance = box.width * 0.3;
    const poseOk = Math.abs(eyeDistance - expectedEyeDistance) / expectedEyeDistance < 0.3;

    // Overall quality score
    const qualityScore = (sizeOk ? 0.4 : 0) + (centered ? 0.3 : 0) + (poseOk ? 0.3 : 0);

    return {
      size: sizeOk,
      centered: centered,
      pose: poseOk,
      score: qualityScore,
      ready: qualityScore > 0.7
    };
  }, []);

  // Draw detection overlay
  const drawDetectionOverlay = useCallback((detection) => {
    const canvas = canvasRef.current;
    const video = videoRef.current;
    
    if (!canvas || !video) return;

    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    
    const ctx = canvas.getContext('2d');
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // Draw face box
    const box = detection.detection.box;
    ctx.strokeStyle = qualityFeedback.ready ? '#4CAF50' : '#FF9800';
    ctx.lineWidth = 3;
    ctx.strokeRect(box.x, box.y, box.width, box.height);

    // Draw landmarks
    const landmarks = detection.landmarks;
    ctx.fillStyle = qualityFeedback.ready ? '#4CAF50' : '#FF9800';
    landmarks.positions.forEach(point => {
      ctx.beginPath();
      ctx.arc(point.x, point.y, 2, 0, 2 * Math.PI);
      ctx.fill();
    });
  }, [qualityFeedback]);

  // Clear canvas
  const clearCanvas = useCallback(() => {
    const canvas = canvasRef.current;
    if (canvas) {
      const ctx = canvas.getContext('2d');
      ctx.clearRect(0, 0, canvas.width, canvas.height);
    }
  }, []);

  // Capture face sample
  const captureSample = useCallback(async () => {
    if (!faceDetected || !qualityFeedback.ready || isCapturing) {
      return;
    }

    try {
      setIsCapturing(true);
      setInstruction('Capturing sample...');

      const detection = await faceapi
        .detectSingleFace(videoRef.current, new faceapi.TinyFaceDetectorOptions())
        .withFaceLandmarks()
        .withFaceDescriptor();

      if (!detection) {
        throw new Error('No face detected during capture');
      }

      // Send sample to backend
      const response = await fetch('/api/face/enrollment/add-sample', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          sessionId,
          faceDescriptor: Array.from(detection.descriptor),
          angle: ANGLES[currentAngle].name,
          qualityMetrics: {
            confidence: detection.detection.score,
            size: qualityFeedback.score,
            lighting: 0.8, // Simplified for demo
            centering: qualityFeedback.centered ? 1.0 : 0.5,
            blur: 0.9 // Simplified for demo
          }
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to add sample');
      }

      console.log('✅ Sample captured:', data);
      
      // Update captured samples
      const newSample = {
        angle: ANGLES[currentAngle].name,
        quality: qualityFeedback.score,
        timestamp: new Date()
      };
      setCapturedSamples(prev => [...prev, newSample]);

      // Move to next angle or complete
      if (currentAngle < ANGLES.length - 1) {
        const nextAngle = currentAngle + 1;
        setCurrentAngle(nextAngle);
        setInstruction(`Great! Now position yourself for ${ANGLES[nextAngle].label}: ${ANGLES[nextAngle].instruction}`);
        setQualityFeedback({});
        setFaceDetected(false);
      } else {
        // All samples captured, complete enrollment
        await completeEnrollment();
      }
    } catch (error) {
      console.error('❌ Error capturing sample:', error);
      setInstruction('Failed to capture sample. Please try again.');
      onError?.(error);
    } finally {
      setIsCapturing(false);
    }
  }, [faceDetected, qualityFeedback, isCapturing, sessionId, currentAngle]);

  // Complete enrollment
  const completeEnrollment = useCallback(async () => {
    try {
      setCurrentStep('processing');
      setInstruction('Processing enrollment...');

      const response = await fetch('/api/face/enrollment/complete-enrollment', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ sessionId }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to complete enrollment');
      }

      console.log('✅ Enrollment completed:', data);
      setCurrentStep('complete');
      setInstruction('🎉 Face enrollment completed successfully!');
      
      // Stop camera
      if (videoRef.current && videoRef.current.srcObject) {
        const stream = videoRef.current.srcObject;
        stream.getTracks().forEach(track => track.stop());
        videoRef.current.srcObject = null;
      }

      // Clear detection interval
      if (detectionInterval) {
        clearInterval(detectionInterval);
      }

      onEnrollmentComplete?.(data);
    } catch (error) {
      console.error('❌ Error completing enrollment:', error);
      setInstruction('Failed to complete enrollment');
      onError?.(error);
    }
  }, [sessionId, detectionInterval, onEnrollmentComplete, onError]);

  // Initialize component
  useEffect(() => {
    loadModels();
    
    return () => {
      // Cleanup
      if (detectionInterval) {
        clearInterval(detectionInterval);
      }
      if (videoRef.current && videoRef.current.srcObject) {
        const stream = videoRef.current.srcObject;
        stream.getTracks().forEach(track => track.stop());
      }
    };
  }, [loadModels]);

  // Start session when models are loaded
  useEffect(() => {
    if (currentStep === 'session' && studentId) {
      startEnrollmentSession();
    }
  }, [currentStep, studentId, startEnrollmentSession]);

  return (
    <div className="multi-sample-enrollment">
      <style>{`
        .multi-sample-enrollment {
          max-width: 600px;
          margin: 0 auto;
          padding: 24px;
          background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
          border-radius: 20px;
          box-shadow: 0 20px 40px rgba(0, 0, 0, 0.1);
          color: white;
          font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
        }

        .enrollment-header {
          text-align: center;
          margin-bottom: 24px;
        }

        .enrollment-title {
          font-size: 28px;
          font-weight: 700;
          margin-bottom: 8px;
        }

        .enrollment-subtitle {
          font-size: 16px;
          opacity: 0.9;
        }

        .progress-section {
          margin-bottom: 24px;
        }

        .angle-progress {
          display: flex;
          justify-content: space-between;
          margin-bottom: 16px;
        }

        .angle-step {
          flex: 1;
          text-align: center;
          padding: 12px;
          margin: 0 4px;
          border-radius: 12px;
          background: rgba(255, 255, 255, 0.1);
          border: 2px solid rgba(255, 255, 255, 0.2);
          transition: all 0.3s ease;
        }

        .angle-step.active {
          background: rgba(76, 175, 80, 0.3);
          border-color: #4CAF50;
          transform: scale(1.05);
        }

        .angle-step.completed {
          background: rgba(76, 175, 80, 0.5);
          border-color: #4CAF50;
        }

        .angle-icon {
          font-size: 24px;
          margin-bottom: 8px;
        }

        .angle-label {
          font-size: 14px;
          font-weight: 600;
        }

        .video-container {
          position: relative;
          width: 100%;
          max-width: 480px;
          margin: 0 auto 24px auto;
          border-radius: 20px;
          overflow: hidden;
          background: #000;
          box-shadow: 0 10px 30px rgba(0, 0, 0, 0.3);
        }

        .video-feed {
          width: 100%;
          height: 360px;
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

        .quality-indicators {
          position: absolute;
          top: 16px;
          left: 16px;
          right: 16px;
          display: flex;
          gap: 8px;
          flex-wrap: wrap;
        }

        .quality-indicator {
          padding: 6px 12px;
          border-radius: 20px;
          font-size: 12px;
          font-weight: 600;
          background: rgba(0, 0, 0, 0.7);
          backdrop-filter: blur(10px);
        }

        .quality-indicator.good {
          background: rgba(76, 175, 80, 0.8);
        }

        .quality-indicator.poor {
          background: rgba(244, 67, 54, 0.8);
        }

        .instruction-panel {
          text-align: center;
          padding: 20px;
        }

        .instruction-text {
          font-size: 18px;
          font-weight: 600;
          margin-bottom: 16px;
          padding: 16px 20px;
          background: rgba(255, 255, 255, 0.1);
          border-radius: 12px;
          backdrop-filter: blur(10px);
          border: 1px solid rgba(255, 255, 255, 0.2);
        }

        .capture-button {
          background: linear-gradient(135deg, #4CAF50, #66BB6A);
          color: white;
          border: none;
          padding: 16px 32px;
          border-radius: 12px;
          font-size: 18px;
          font-weight: 600;
          cursor: pointer;
          transition: all 0.3s ease;
          display: flex;
          align-items: center;
          gap: 8px;
          margin: 0 auto;
          box-shadow: 0 4px 15px rgba(76, 175, 80, 0.3);
        }

        .capture-button:hover:not(:disabled) {
          transform: translateY(-2px);
          box-shadow: 0 6px 20px rgba(76, 175, 80, 0.4);
        }

        .capture-button:disabled {
          opacity: 0.5;
          cursor: not-allowed;
          transform: none;
        }

        .loading-indicator {
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 16px;
          margin: 40px 0;
        }

        .spinner {
          width: 48px;
          height: 48px;
          border: 4px solid rgba(255, 255, 255, 0.3);
          border-top: 4px solid #4CAF50;
          border-radius: 50%;
          animation: spin 1s linear infinite;
        }

        @keyframes spin {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }

        .success-message {
          text-align: center;
          padding: 40px 20px;
        }

        .success-icon {
          font-size: 64px;
          margin-bottom: 16px;
        }

        .success-title {
          font-size: 24px;
          font-weight: 700;
          margin-bottom: 8px;
          color: #4CAF50;
        }

        .success-subtitle {
          font-size: 16px;
          opacity: 0.9;
        }

        @media (max-width: 768px) {
          .multi-sample-enrollment {
            margin: 16px;
            padding: 20px;
          }

          .video-container {
            max-width: 100%;
          }

          .video-feed {
            height: 300px;
          }

          .angle-progress {
            flex-direction: column;
            gap: 8px;
          }

          .angle-step {
            margin: 0;
          }
        }
      `}</style>

      <div className="enrollment-header">
        <h2 className="enrollment-title">Multi-Sample Face Enrollment</h2>
        <p className="enrollment-subtitle">We'll capture your face from multiple angles for better recognition</p>
      </div>

      {currentStep !== 'loading' && currentStep !== 'complete' && (
        <div className="progress-section">
          <div className="angle-progress">
            {ANGLES.map((angle, index) => (
              <div 
                key={angle.name}
                className={`angle-step ${
                  index === currentAngle ? 'active' : 
                  index < currentAngle || capturedSamples.some(s => s.angle === angle.name) ? 'completed' : ''
                }`}
              >
                <div className="angle-icon">{angle.icon}</div>
                <div className="angle-label">{angle.label}</div>
              </div>
            ))}
          </div>
        </div>
      )}

      {isLoading && (
        <div className="loading-indicator">
          <div className="spinner"></div>
          <span>Loading AI models...</span>
        </div>
      )}

      {currentStep === 'capture' && (
        <>
          <div className="video-container">
            <video ref={videoRef} className="video-feed" autoPlay muted playsInline />
            <canvas ref={canvasRef} className="detection-overlay" />
            
            {Object.keys(qualityFeedback).length > 0 && (
              <div className="quality-indicators">
                <div className={`quality-indicator ${qualityFeedback.size ? 'good' : 'poor'}`}>
                  Size: {qualityFeedback.size ? '✓' : '✗'}
                </div>
                <div className={`quality-indicator ${qualityFeedback.centered ? 'good' : 'poor'}`}>
                  Centered: {qualityFeedback.centered ? '✓' : '✗'}
                </div>
                <div className={`quality-indicator ${qualityFeedback.pose ? 'good' : 'poor'}`}>
                  Pose: {qualityFeedback.pose ? '✓' : '✗'}
                </div>
              </div>
            )}
          </div>

          <div className="instruction-panel">
            <div className="instruction-text">{instruction}</div>
            
            {faceDetected && (
              <button
                className="capture-button"
                onClick={captureSample}
                disabled={!qualityFeedback.ready || isCapturing}
              >
                {isCapturing ? (
                  <>
                    <div className="spinner" style={{width: '20px', height: '20px'}}></div>
                    Capturing...
                  </>
                ) : (
                  <>
                    📸 Capture {ANGLES[currentAngle].label}
                  </>
                )}
              </button>
            )}
          </div>
        </>
      )}

      {currentStep === 'processing' && (
        <div className="loading-indicator">
          <div className="spinner"></div>
          <span>Processing your enrollment...</span>
        </div>
      )}

      {currentStep === 'complete' && (
        <div className="success-message">
          <div className="success-icon">🎉</div>
          <div className="success-title">Enrollment Complete!</div>
          <div className="success-subtitle">
            Your face has been successfully enrolled with {capturedSamples.length} samples
          </div>
        </div>
      )}
    </div>
  );
};

export default MultiSampleFaceEnrollment;