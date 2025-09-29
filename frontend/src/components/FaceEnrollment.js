import React, { useState, useRef, useEffect, useCallback } from 'react';
import * as faceapi from 'face-api.js';
import API_BASE_URL from '../config/api';
import { enrollmentDebugger } from '../debug/enrollmentDebugger';

const FaceEnrollment = ({ studentId, onFaceEnrolled, onError }) => {
  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const streamRef = useRef(null);
  const faceDetectionRef = useRef(null);
  
  const [cameraReady, setCameraReady] = useState(false);
  const [currentStep, setCurrentStep] = useState('initializing'); // initializing, ready, capturing, success, duplicate
  const [isCapturing, setIsCapturing] = useState(false);
  const [captureProgress, setCaptureProgress] = useState(0);
  const [error, setError] = useState('');
  const [captureComplete, setCaptureComplete] = useState(false);
  const [faceDetected, setFaceDetected] = useState(false);
  const [facePosition, setFacePosition] = useState({ x: 0, y: 0, width: 0, height: 0 });
  const [scannerPosition, setScannerPosition] = useState(0);
  const [isDuplicateFace, setIsDuplicateFace] = useState(false);
  const [duplicateMessage, setDuplicateMessage] = useState('');
  const [modelsLoaded, setModelsLoaded] = useState(false);



  // Load face-api.js models
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
      
      console.log('✅ All models loaded successfully from CDN');
      
      // Final verification
      const tinyLoaded = faceapi.nets.tinyFaceDetector.isLoaded;
      const landmarkLoaded = faceapi.nets.faceLandmark68Net.isLoaded;
      const recognitionLoaded = faceapi.nets.faceRecognitionNet.isLoaded;
      
      console.log('🔍 Final model verification:');
      console.log('  - tinyFaceDetector:', tinyLoaded ? '✅ Loaded' : '❌ Not loaded');
      console.log('  - faceLandmark68Net:', landmarkLoaded ? '✅ Loaded' : '❌ Not loaded');
      console.log('  - faceRecognitionNet:', recognitionLoaded ? '✅ Loaded' : '❌ Not loaded');
      
      if (tinyLoaded && landmarkLoaded && recognitionLoaded) {
        console.log('🎉 All face-api.js models are ready!');
        setModelsLoaded(true);
      } else {
        throw new Error('Some models failed to load from CDN');
      }
    } catch (error) {
      console.error('❌ Failed to load face-api.js models:', error);
      setError('Failed to load face recognition models. Please refresh the page.');
    }
  }, []);

  // Cleanup function
  const cleanup = useCallback(() => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
      streamRef.current = null;
    }
    if (faceDetectionRef.current) {
      clearInterval(faceDetectionRef.current);
      faceDetectionRef.current = null;
    }
    setCameraReady(false);
    setFaceDetected(false);
  }, []);

  // Real face detection using face-api.js
  const detectFace = useCallback(async () => {
    const video = videoRef.current;
    
    if (!video || !cameraReady || !modelsLoaded) return;
    
    // Enhanced video validation to prevent createCanvasFromMedia errors
    if (video.readyState < HTMLMediaElement.HAVE_CURRENT_DATA || 
        video.videoWidth === 0 || 
        video.videoHeight === 0 || 
        video.paused || 
        video.ended ||
        video.seeking ||
        !video.srcObject) {
      console.warn('⚠️ Video not ready for face detection, skipping frame');
      return;
    }
    
    try {
      const detections = await faceapi
        .detectAllFaces(video, new faceapi.TinyFaceDetectorOptions({ 
          inputSize: 416, 
          scoreThreshold: 0.3 
        }))
        .withFaceLandmarks()
        .withFaceDescriptors();
      
      if (detections.length > 0) {
        const detection = detections[0];
        const box = detection.detection.box;
        
        // Convert to video coordinates
        const videoRect = video.getBoundingClientRect();
        const scaleX = video.videoWidth / videoRect.width;
        const scaleY = video.videoHeight / videoRect.height;
        
        setFaceDetected(true);
        setFacePosition({
          x: box.x,
          y: box.y,
          width: box.width,
          height: box.height
        });
      } else {
        setFaceDetected(false);
      }
    } catch (error) {
      console.error('Face detection error:', error);
      
      // Handle specific createCanvasFromMedia errors
      if (error.message.includes('createCanvasFromMedia') || 
          error.message.includes('media has not finished loading')) {
        console.warn('⚠️ Video not ready for face-api.js, will retry on next frame');
      }
      
      setFaceDetected(false);
    }
  }, [cameraReady, modelsLoaded]);

  // Initialize camera
  const initializeCamera = useCallback(async () => {
    try {
      setError('');
      setCurrentStep('initializing');
      setCaptureComplete(false);
      setIsDuplicateFace(false);
      
      // Stop existing stream
      if (streamRef.current) {
        streamRef.current.getTracks().forEach(track => track.stop());
      }
      
      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          width: { ideal: 640 },
          height: { ideal: 480 },
          facingMode: 'user'
        }
      });
      
      streamRef.current = stream;
      
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        
        // Add timeout for video loading
        const videoLoadTimeout = setTimeout(() => {
          console.warn('⚠️ Video loading timeout, proceeding anyway');
          setCameraReady(true);
          setCurrentStep('ready');
          
          // Start face detection
          faceDetectionRef.current = setInterval(detectFace, 200);
        }, 5000); // 5 second timeout
        
        videoRef.current.onloadedmetadata = () => {
          clearTimeout(videoLoadTimeout);
          setCameraReady(true);
          setCurrentStep('ready');
          
          // Start face detection
          faceDetectionRef.current = setInterval(detectFace, 200); // Slower interval for real detection
        };
      }
      }
    } catch (err) {
      console.error('Camera initialization error:', err);
      setError('Unable to access camera. Please check permissions and try again.');
    }
  }, [detectFace]);

  // Capture image and send to Node.js backend
  const captureImage = useCallback(() => {
    const video = videoRef.current;
    const canvas = canvasRef.current;
    
    if (!video || !canvas) return null;
    
    const ctx = canvas.getContext('2d');
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    
    ctx.drawImage(video, 0, 0);
    return canvas.toDataURL('image/jpeg', 0.9);
  }, []);

  // Send enrollment request to Node.js backend with real face descriptor
  const enrollFace = useCallback(async (imageData) => {
    try {
      enrollmentDebugger.log('ENROLLMENT_START', { 
        studentId, 
        imageDataLength: imageData.length,
        apiBaseUrl: API_BASE_URL 
      });
      
      console.log('🔍 Starting face enrollment process...');
      console.log('📸 Image data URL length:', imageData.length);
      console.log('👤 Student ID:', studentId);
      
      // Get face descriptor using face-api.js
      const video = videoRef.current;
      if (!video || !modelsLoaded) {
        throw new Error('Camera or face detection models not ready');
      }

      // Validate video readiness
      console.log('📊 Video readiness check:');
      console.log('  - readyState:', video.readyState, '(need >= 2)');
      console.log('  - videoWidth:', video.videoWidth);
      console.log('  - videoHeight:', video.videoHeight);
      console.log('  - currentTime:', video.currentTime);
      console.log('  - paused:', video.paused);
      console.log('  - ended:', video.ended);
      console.log('  - srcObject:', !!video.srcObject);

      if (video.readyState < 2) {
        console.error('❌ Video not ready for face detection. ReadyState:', video.readyState);
        throw new Error('Video stream not ready. Please wait for camera to initialize.');
      }

      if (video.videoWidth === 0 || video.videoHeight === 0) {
        console.error('❌ Video dimensions invalid:', video.videoWidth, 'x', video.videoHeight);
        throw new Error('Video dimensions not available. Please ensure camera is working.');
      }

      if (!video.srcObject) {
        console.error('❌ Video source object missing');
        throw new Error('Video stream not connected. Please restart camera.');
      }

      if (video.seeking) {
        console.error('❌ Video is currently seeking');
        throw new Error('Video is seeking. Please wait for video to stabilize.');
      }

      console.log('✅ Video readiness validation passed');
      console.log('🔍 Detecting face and extracting features...');
      
      const detections = await faceapi
        .detectAllFaces(video, new faceapi.TinyFaceDetectorOptions({ 
          inputSize: 416, 
          scoreThreshold: 0.3 
        }))
        .withFaceLandmarks()
        .withFaceDescriptors();

      console.log('📊 Detection results:', detections.length, 'faces found');

      if (detections.length === 0) {
        console.error('❌ No face detected during enrollment');
        console.error('❌ Face-api.js media validation failed - no detections returned');
        throw new Error('No face detected during enrollment');
      }

      if (detections.length > 1) {
        console.error('❌ Multiple faces detected:', detections.length);
        throw new Error('Multiple faces detected. Please ensure only one person is in the frame');
      }

      const detection = detections[0];
      console.log('📊 Detection details:');
      console.log('  - Detection score:', detection.detection.score);
      console.log('  - Bounding box:', detection.detection.box);
      console.log('  - Landmarks detected:', !!detection.landmarks);
      console.log('  - Descriptor available:', !!detection.descriptor);
      
      if (!detection.descriptor) {
        console.error('❌ Face descriptor not generated by face-api.js');
        throw new Error('Face descriptor extraction failed');
      }

      const faceDescriptor = Array.from(detection.descriptor);
      console.log('✅ Face descriptor extracted successfully:');
      console.log('  - Length:', faceDescriptor.length);
      console.log('  - Type:', typeof faceDescriptor[0]);
      console.log('  - Min value:', Math.min(...faceDescriptor));
      console.log('  - Max value:', Math.max(...faceDescriptor));
      console.log('  - Average:', faceDescriptor.reduce((a, b) => a + b, 0) / faceDescriptor.length);
      console.log('  - First 5 values:', faceDescriptor.slice(0, 5));
      console.log('  - Last 5 values:', faceDescriptor.slice(-5));
      
      // Validate descriptor
      if (faceDescriptor.length !== 128) {
        console.error('❌ Invalid face descriptor length:', faceDescriptor.length, 'expected 128');
        throw new Error('Invalid face descriptor generated');
      }
      
      const invalidValues = faceDescriptor.filter(val => typeof val !== 'number' || isNaN(val));
      if (invalidValues.length > 0) {
        console.error('❌ Face descriptor contains invalid values:', invalidValues.length, 'non-numeric values');
        throw new Error('Invalid face descriptor values');
      }
      
      console.log('📤 Sending enrollment request to backend...');
      
      const requestData = {
        studentId: studentId,
        faceDescriptor: faceDescriptor,
        sampleCount: 1
      };
      
      enrollmentDebugger.log('HTTP_REQUEST_START', {
        url: `${API_BASE_URL}/students/enroll-face`,
        method: 'POST',
        studentId: studentId,
        descriptorLength: faceDescriptor.length,
        requestDataSize: JSON.stringify(requestData).length
      });
      
      const response = await fetch(`${API_BASE_URL}/students/enroll-face`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(requestData),
      });

      enrollmentDebugger.log('HTTP_RESPONSE_RECEIVED', {
        status: response.status,
        statusText: response.statusText,
        ok: response.ok,
        headers: Object.fromEntries(response.headers.entries())
      });

      console.log('📥 Backend response status:', response.status);
      const result = await response.json();
      console.log('📥 Backend response data:', result);
      
      enrollmentDebugger.log('HTTP_RESPONSE_PARSED', result);

      if (response.status === 409) {
        // Handle duplicate face
        console.log('⚠️ Duplicate face detected');
        setIsDuplicateFace(true);
        setDuplicateMessage(result.message || 'This face is already enrolled for another student.');
        setCurrentStep('duplicate');
        return { isDuplicate: true, message: result.message };
      }

      if (!response.ok) {
        console.error('❌ Backend error:', result);
        throw new Error(result.message || `HTTP error! status: ${response.status}`);
      }

      console.log('✅ Face enrollment successful!');
      return {
        success: true,
        message: result.message || 'Face enrolled successfully',
        studentId: result.studentId || studentId,
        isDuplicate: false
      };
    } catch (error) {
      enrollmentDebugger.error('ENROLLMENT_FAILED', {
        error: error.message,
        stack: error.stack,
        name: error.name,
        studentId: studentId
      });
      console.error('❌ Face enrollment error:', error);
      throw error;
    }
  }, [studentId, modelsLoaded]);

  // Scanner animation effect
  useEffect(() => {
    if (isCapturing) {
      const interval = setInterval(() => {
        setScannerPosition(prev => (prev + 2) % 100);
      }, 50);
      return () => clearInterval(interval);
    }
  }, [isCapturing]);

  // Handle face capture
  const handleCapture = useCallback(async () => {
    enrollmentDebugger.log('CAPTURE_START', { 
      isCapturing, 
      cameraReady, 
      studentId 
    });
    
    if (isCapturing || !cameraReady) {
      enrollmentDebugger.log('CAPTURE_BLOCKED', { 
        reason: isCapturing ? 'already capturing' : 'camera not ready',
        isCapturing, 
        cameraReady 
      });
      return;
    }
    
    setIsCapturing(true);
    setCurrentStep('capturing');
    setCaptureProgress(0);
    setScannerPosition(0);
    
    try {
      // Capture image
      const imageData = captureImage();
      if (!imageData) {
        throw new Error('Failed to capture image');
      }

      // Simulate progress with scanner animation
      setCaptureProgress(25);
      await new Promise(resolve => setTimeout(resolve, 500));

      setCaptureProgress(50);
      await new Promise(resolve => setTimeout(resolve, 500));

      // Send to Node.js backend
      setCaptureProgress(75);
      enrollmentDebugger.log('CALLING_ENROLL_FACE', { 
        imageDataLength: imageData.length,
        studentId 
      });
      
      const result = await enrollFace(imageData);
      
      enrollmentDebugger.log('ENROLL_FACE_RESULT', result);

      if (result.isDuplicate) {
        // Handle duplicate face
        enrollmentDebugger.log('DUPLICATE_FACE_DETECTED', result);
        setIsCapturing(false);
        return;
      }

      setCaptureProgress(100);
      await new Promise(resolve => setTimeout(resolve, 300));

      // Stop camera immediately
      cleanup();
      
      // Set success state
      setCaptureComplete(true);
      setCurrentStep('success');
      
      // Call parent callback
      if (onFaceEnrolled) {
        onFaceEnrolled({
          success: true,
          message: result.message,
          studentId: result.studentId || studentId,
          imageData: imageData
        });
      }
      
    } catch (err) {
      console.error('Capture error:', err);
      setError(err.message || 'Failed to enroll face. Please try again.');
      setIsCapturing(false);
      setCurrentStep('ready');
      setCaptureProgress(0);
      
      if (onError) {
        onError(err.message || 'Face enrollment failed');
      }
    }
  }, [isCapturing, cameraReady, captureImage, enrollFace, onFaceEnrolled, onError, cleanup]);

  // Auto-capture after 3 seconds when face is detected and camera is ready
  useEffect(() => {
    if (currentStep === 'ready' && !isCapturing && !captureComplete && faceDetected) {
      const timer = setTimeout(() => {
        handleCapture();
      }, 3000);
      
      return () => clearTimeout(timer);
    }
  }, [currentStep, isCapturing, captureComplete, faceDetected, handleCapture]);

  // Initialize camera on mount and load models
  useEffect(() => {
    loadModels();
  }, [loadModels]);

  useEffect(() => {
    if (!captureComplete && !isDuplicateFace && modelsLoaded) {
      initializeCamera();
    }
  }, [initializeCamera, captureComplete, isDuplicateFace, modelsLoaded]);

  // Cleanup on unmount
  useEffect(() => {
    return cleanup;
  }, [cleanup]);

  // Test connectivity function
  const testConnectivity = useCallback(async () => {
    console.log('🧪 Testing connectivity manually...');
    enrollmentDebugger.log('MANUAL_CONNECTIVITY_TEST', { studentId });
    
    try {
      const connectivityResult = await enrollmentDebugger.testConnectivity();
      const enrollmentResult = await enrollmentDebugger.testEnrollmentEndpoint();
      
      console.log('🧪 Connectivity test results:', {
        connectivity: connectivityResult,
        enrollment: enrollmentResult
      });
      
      alert(`Connectivity Test Results:\n- Backend Health: ${connectivityResult ? 'OK' : 'FAILED'}\n- Enrollment Endpoint: ${enrollmentResult ? 'OK' : 'FAILED'}`);
    } catch (error) {
      console.error('🧪 Connectivity test failed:', error);
      alert(`Connectivity Test Failed: ${error.message}`);
    }
  }, [studentId]);

  const getStatusMessage = () => {
    if (captureComplete) return 'Face enrolled successfully!';
    if (isDuplicateFace) return 'Face already enrolled!';
    if (!modelsLoaded) return 'Loading AI models...';
    if (currentStep === 'initializing') return 'Initializing camera...';
    if (currentStep === 'capturing') return 'Scanning your face...';
    if (currentStep === 'ready') {
      if (faceDetected) {
        return 'Face detected! Auto-capturing in 3 seconds...';
      }
      return 'Position your face in the center';
    }
    return 'Getting ready...';
  };

  const getProgressMessage = () => {
    if (captureProgress <= 25) return 'Capturing image...';
    if (captureProgress <= 50) return 'Processing image...';
    if (captureProgress <= 75) return 'Analyzing face...';
    return 'Saving enrollment...';
  };

  return (
    <div className="face-enrollment">
      <style jsx>{`
        .face-enrollment {
          max-width: 500px;
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
          margin-bottom: 32px;
        }

        .header-title {
          font-size: 28px;
          font-weight: 700;
          margin: 0 0 8px 0;
          background: linear-gradient(45deg, #fff, #e0e7ff);
          -webkit-background-clip: text;
          -webkit-text-fill-color: transparent;
          background-clip: text;
        }

        .header-subtitle {
          font-size: 16px;
          opacity: 0.9;
          margin: 0;
        }

        .security-badge {
          display: inline-flex;
          align-items: center;
          gap: 8px;
          background: rgba(255, 255, 255, 0.2);
          padding: 8px 16px;
          border-radius: 20px;
          font-size: 14px;
          font-weight: 600;
          margin-top: 16px;
          backdrop-filter: blur(10px);
        }

        .camera-container {
          position: relative;
          width: 100%;
          max-width: 400px;
          margin: 0 auto 24px auto;
          border-radius: 20px;
          overflow: hidden;
          background: #000;
          box-shadow: 0 10px 30px rgba(0, 0, 0, 0.3);
        }

        .video-wrapper {
          position: relative;
          width: 100%;
          height: 300px;
        }

        .camera-video {
          width: 100%;
          height: 100%;
          object-fit: cover;
          display: block;
        }

        .video-overlay {
          position: absolute;
          top: 0;
          left: 0;
          right: 0;
          bottom: 0;
          pointer-events: none;
        }

        .face-guide {
          position: absolute;
          top: 50%;
          left: 50%;
          transform: translate(-50%, -50%);
          width: 180px;
          height: 220px;
          border: 3px solid rgba(255, 255, 255, 0.5);
          border-radius: 50%;
          transition: all 0.3s ease;
        }

        .face-guide.ready {
          border-color: #4caf50;
          box-shadow: 0 0 20px rgba(76, 175, 80, 0.5);
          animation: pulse 2s ease-in-out infinite;
        }

        @keyframes pulse {
          0%, 100% { transform: translate(-50%, -50%) scale(1); }
          50% { transform: translate(-50%, -50%) scale(1.05); }
        }

        .corner-brackets {
          position: absolute;
          top: 50%;
          left: 50%;
          transform: translate(-50%, -50%);
          width: 200px;
          height: 240px;
          pointer-events: none;
        }

        .corner-bracket {
          position: absolute;
          width: 25px;
          height: 25px;
          border: 3px solid white;
          transition: all 0.3s ease;
        }

        .corner-bracket.top-left {
          top: 0;
          left: 0;
          border-right: none;
          border-bottom: none;
        }

        .corner-bracket.top-right {
          top: 0;
          right: 0;
          border-left: none;
          border-bottom: none;
        }

        .corner-bracket.bottom-left {
          bottom: 0;
          left: 0;
          border-right: none;
          border-top: none;
        }

        .corner-bracket.bottom-right {
          bottom: 0;
          right: 0;
          border-left: none;
          border-top: none;
        }

        .corner-bracket.active {
          border-color: #4caf50;
          box-shadow: 0 0 10px rgba(76, 175, 80, 0.5);
        }

        .status-indicator {
          position: absolute;
          top: 10px;
          left: 50%;
          transform: translateX(-50%);
          background: rgba(0, 0, 0, 0.8);
          color: white;
          padding: 8px 16px;
          border-radius: 20px;
          font-size: 14px;
          font-weight: 600;
          backdrop-filter: blur(10px);
          text-align: center;
          min-width: 200px;
          z-index: 10;
        }

        .status-indicator.ready {
          background: rgba(76, 175, 80, 0.9);
        }

        .status-indicator.capturing {
          background: rgba(255, 170, 0, 0.9);
        }

        .capture-progress {
          position: absolute;
          top: 0;
          left: 0;
          right: 0;
          bottom: 0;
          background: rgba(0, 0, 0, 0.8);
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          color: white;
        }

        .progress-circle {
          width: 80px;
          height: 80px;
          border: 4px solid rgba(255, 255, 255, 0.3);
          border-top: 4px solid #4caf50;
          border-radius: 50%;
          animation: spin 1s linear infinite;
          margin-bottom: 16px;
        }

        @keyframes spin {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }

        .progress-bar {
          width: 200px;
          height: 6px;
          background: rgba(255, 255, 255, 0.3);
          border-radius: 3px;
          overflow: hidden;
          margin: 16px 0;
        }

        .progress-fill {
          height: 100%;
          background: linear-gradient(90deg, #4caf50, #66bb6a);
          transition: width 0.3s ease;
          border-radius: 3px;
        }

        .success-message {
          text-align: center;
          padding: 32px 16px;
          background: rgba(76, 175, 80, 0.1);
          border-radius: 16px;
          border: 2px solid rgba(76, 175, 80, 0.3);
        }

        .success-icon {
          font-size: 64px;
          margin-bottom: 16px;
        }

        .success-title {
          font-size: 24px;
          font-weight: 700;
          margin-bottom: 8px;
          color: #4caf50;
        }

        .success-subtitle {
          font-size: 16px;
          opacity: 0.9;
          margin-bottom: 16px;
        }

        .success-note {
          font-size: 14px;
          opacity: 0.8;
          font-style: italic;
        }

        .error-message {
          background: rgba(244, 67, 54, 0.9);
          color: white;
          padding: 16px;
          border-radius: 12px;
          margin-bottom: 24px;
          text-align: center;
          font-weight: 500;
        }

        .retry-button {
          background: rgba(255, 255, 255, 0.2);
          color: white;
          border: 2px solid rgba(255, 255, 255, 0.3);
          padding: 12px 24px;
          border-radius: 12px;
          font-size: 16px;
          font-weight: 600;
          cursor: pointer;
          transition: all 0.3s ease;
          display: flex;
          align-items: center;
          gap: 8px;
          margin: 16px auto 0 auto;
        }

        .retry-button:hover {
          background: rgba(255, 255, 255, 0.3);
          transform: translateY(-2px);
        }

        .manual-capture-button {
          background: rgba(76, 175, 80, 0.9);
          color: white;
          border: none;
          padding: 12px 24px;
          border-radius: 12px;
          font-size: 16px;
          font-weight: 600;
          cursor: pointer;
          transition: all 0.3s ease;
          display: flex;
          align-items: center;
          gap: 8px;
          margin: 16px auto 0 auto;
        }

        .manual-capture-button:hover {
          background: rgba(76, 175, 80, 1);
          transform: translateY(-2px);
        }

        .manual-capture-button:disabled {
          opacity: 0.5;
          cursor: not-allowed;
          transform: none;
        }

        .face-tracker {
           position: absolute;
           border: 2px solid #4caf50;
           border-radius: 8px;
           box-shadow: 0 0 15px rgba(76, 175, 80, 0.6);
           transition: all 0.1s ease;
           pointer-events: none;
         }

         .scanner-line {
           position: absolute;
           left: 0;
           right: 0;
           height: 2px;
           background: linear-gradient(90deg, transparent, #00bfff, transparent);
           box-shadow: 0 0 10px #00bfff;
           animation: scannerMove 2s ease-in-out infinite;
         }

         @keyframes scannerMove {
           0%, 100% { top: 0%; opacity: 1; }
           50% { top: 100%; opacity: 0.8; }
         }

         .duplicate-message {
           text-align: center;
           padding: 32px 16px;
           background: rgba(255, 152, 0, 0.1);
           border-radius: 16px;
           border: 2px solid rgba(255, 152, 0, 0.3);
         }

         .duplicate-icon {
           font-size: 64px;
           margin-bottom: 16px;
         }

         .duplicate-title {
           font-size: 24px;
           font-weight: 700;
           margin-bottom: 8px;
           color: #ff9800;
         }

         .duplicate-subtitle {
           font-size: 16px;
           opacity: 0.9;
           margin-bottom: 16px;
         }

         .verification-prompt {
           background: rgba(33, 150, 243, 0.9);
           color: white;
           padding: 12px 24px;
           border-radius: 12px;
           font-size: 16px;
           font-weight: 600;
           cursor: pointer;
           transition: all 0.3s ease;
           display: flex;
           align-items: center;
           gap: 8px;
           margin: 16px auto 0 auto;
           text-decoration: none;
         }

         .verification-prompt:hover {
           background: rgba(33, 150, 243, 1);
           transform: translateY(-2px);
         }

         .hidden-canvas {
           display: none;
         }

         @media (max-width: 768px) {
           .face-enrollment {
             margin: 16px;
             padding: 20px;
           }

           .camera-container {
             max-width: 100%;
           }

           .video-wrapper {
             height: 250px;
           }
         }
       `}</style>

      <div className="enrollment-header">
        <h2 className="header-title">Face Enrollment</h2>
        <p className="header-subtitle">Professional biometric registration</p>
        <div className="security-badge">
          <span>🔒</span>
          <span>Python-Powered Recognition</span>
        </div>
      </div>

      {/* DEBUG SECTION - ALWAYS VISIBLE */}
      <div style={{
        background: 'rgba(255, 255, 255, 0.1)',
        border: '2px solid #ffd700',
        borderRadius: '10px',
        padding: '15px',
        marginBottom: '20px',
        textAlign: 'center'
      }}>
        <h3 style={{margin: '0 0 10px 0', color: '#ffd700'}}>🔍 DEBUG MODE ACTIVE</h3>
        <p style={{margin: '0 0 15px 0', fontSize: '14px'}}>
          Open browser console (F12) to see detailed logs
        </p>
        <button 
          onClick={testConnectivity}
          style={{
            background: '#ffd700',
            color: '#000',
            border: 'none',
            padding: '10px 20px',
            borderRadius: '5px',
            fontWeight: 'bold',
            cursor: 'pointer',
            marginRight: '10px'
          }}
        >
          🧪 Test Backend Connection
        </button>
        <button 
          onClick={() => {
            console.log('🔍 Manual debug trigger');
            enrollmentDebugger.log('MANUAL_DEBUG_TRIGGER', {
              studentId,
              cameraReady,
              modelsLoaded,
              currentStep,
              timestamp: new Date().toISOString()
            });
            enrollmentDebugger.checkFaceApiStatus();
          }}
          style={{
            background: '#28a745',
            color: '#fff',
            border: 'none',
            padding: '10px 20px',
            borderRadius: '5px',
            fontWeight: 'bold',
            cursor: 'pointer'
          }}
        >
          🤖 Check Face-API Status
        </button>
      </div>

      {error && (
        <div className="error-message">
          {error}
          <button className="retry-button" onClick={initializeCamera}>
            <span>🔄</span>
            <span>Try Again</span>
          </button>
          <button className="retry-button" onClick={testConnectivity} style={{marginLeft: '10px'}}>
            <span>🧪</span>
            <span>Test Connection</span>
          </button>
        </div>
      )}
      
      {/* Debug connectivity button - always visible during development */}
      <div style={{textAlign: 'center', marginBottom: '20px'}}>
        <button 
          className="retry-button" 
          onClick={testConnectivity}
          style={{
            background: 'rgba(255, 255, 255, 0.2)',
            border: '1px solid rgba(255, 255, 255, 0.3)',
            color: 'white',
            padding: '8px 16px',
            borderRadius: '8px',
            cursor: 'pointer',
            fontSize: '14px'
          }}
        >
          <span>🧪</span>
          <span>Debug: Test Backend Connection</span>
        </button>
      </div>

      {captureComplete ? (
         <div className="success-message">
           <div className="success-icon">✅</div>
           <h3 className="success-title">Face Enrolled Successfully!</h3>
           <p className="success-subtitle">Your face has been registered using advanced AI</p>
           <p className="success-note">Camera has been automatically shut down</p>
           <a href="/face-verification" className="verification-prompt">
             <span>🔍</span>
             <span>Try Face Verification</span>
           </a>
         </div>
       ) : isDuplicateFace ? (
         <div className="duplicate-message">
           <div className="duplicate-icon">⚠️</div>
           <h3 className="duplicate-title">Face Already Enrolled</h3>
           <p className="duplicate-subtitle">{duplicateMessage}</p>
           <p className="success-note">Camera has been automatically shut down</p>
           <a href="/face-verification" className="verification-prompt">
             <span>🔍</span>
             <span>Try Face Verification Instead</span>
           </a>
         </div>
       ) : (
        <div className="camera-container">
          <div className="video-wrapper">
            {cameraReady && (
              <video
                ref={videoRef}
                className="camera-video"
                autoPlay
                muted
                playsInline
              />
            )}
            
            <div className="video-overlay">
               <div className={`face-guide ${currentStep === 'ready' ? 'ready' : ''}`} />
               
               {/* Face tracking rectangle */}
               {faceDetected && (
                 <div 
                   className="face-tracker"
                   style={{
                     left: `${(facePosition.x / 640) * 100}%`,
                     top: `${(facePosition.y / 480) * 100}%`,
                     width: `${(facePosition.width / 640) * 100}%`,
                     height: `${(facePosition.height / 480) * 100}%`
                   }}
                 />
               )}
               
               {/* Scanner animation during capture */}
               {isCapturing && (
                 <div 
                   className="scanner-line"
                   style={{ top: `${scannerPosition}%` }}
                 />
               )}
               
               <div className="corner-brackets">
                 <div className={`corner-bracket top-left ${currentStep === 'ready' ? 'active' : ''}`} />
                 <div className={`corner-bracket top-right ${currentStep === 'ready' ? 'active' : ''}`} />
                 <div className={`corner-bracket bottom-left ${currentStep === 'ready' ? 'active' : ''}`} />
                 <div className={`corner-bracket bottom-right ${currentStep === 'ready' ? 'active' : ''}`} />
               </div>
               
               <div className={`status-indicator ${currentStep}`}>
                 {getStatusMessage()}
               </div>
              
              {isCapturing && (
                <div className="capture-progress">
                  <div className="progress-circle" />
                  <div className="progress-bar">
                    <div 
                      className="progress-fill"
                      style={{ width: `${captureProgress}%` }}
                    />
                  </div>
                  <p>{getProgressMessage()}</p>
                  <p>{captureProgress}%</p>
                </div>
              )}
            </div>
          </div>
          
          {currentStep === 'ready' && !isCapturing && (
            <button 
              className="manual-capture-button"
              onClick={handleCapture}
              disabled={isCapturing}
            >
              <span>📸</span>
              <span>Capture Now</span>
            </button>
          )}
        </div>
      )}

      <canvas ref={canvasRef} className="hidden-canvas" />
    </div>
  );
};

export default FaceEnrollment;


        .face-tracker {
          position: absolute;
          border: 2px solid #4caf50;
          border-radius: 8px;
          box-shadow: 0 0 15px rgba(76, 175, 80, 0.6);
          transition: all 0.1s ease;
          pointer-events: none;
        }

        .scanner-line {
          position: absolute;
          left: 0;
          right: 0;
          height: 2px;
          background: linear-gradient(90deg, transparent, #00bfff, transparent);
          box-shadow: 0 0 10px #00bfff;
          animation: scannerMove 2s ease-in-out infinite;
        }

        @keyframes scannerMove {
          0%, 100% { top: 0%; opacity: 1; }
          50% { top: 100%; opacity: 0.8; }
        }

        .duplicate-message {
          text-align: center;
          padding: 32px 16px;
          background: rgba(255, 152, 0, 0.1);
          border-radius: 16px;
          border: 2px solid rgba(255, 152, 0, 0.3);
        }

        .duplicate-icon {
          font-size: 64px;
          margin-bottom: 16px;
        }

        .duplicate-title {
          font-size: 24px;
          font-weight: 700;
          margin-bottom: 8px;
          color: #ff9800;
        }

        .duplicate-subtitle {
          font-size: 16px;
          opacity: 0.9;
          margin-bottom: 16px;
        }

        .verification-prompt {
          background: rgba(33, 150, 243, 0.9);
          color: white;
          padding: 12px 24px;
          border-radius: 12px;
          font-size: 16px;
          font-weight: 600;
          cursor: pointer;
          transition: all 0.3s ease;
          display: flex;
          align-items: center;
          gap: 8px;
          margin: 16px auto 0 auto;
          text-decoration: none;
        }

        .verification-prompt:hover {
          background: rgba(33, 150, 243, 1);
          transform: translateY(-2px);
        }