import React, { useState, useRef, useEffect, useCallback } from 'react';
import axios from 'axios';
import API_BASE_URL from '../config/api';

const FaceVerification = ({ onVerificationSuccess, onError }) => {
  const [countdown, setCountdown] = useState(0);
  const [isVerifying, setIsVerifying] = useState(false);
  const [verificationResult, setVerificationResult] = useState(null);
  const [cameraActive, setCameraActive] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  const videoRef = useRef();
  const canvasRef = useRef();
  const intervalRef = useRef();
  const streamRef = useRef(null);

  // Using proper API configuration from config/api.js

  const startCamera = useCallback(async () => {
    try {
      console.log('Starting camera...');
      const stream = await navigator.mediaDevices.getUserMedia({ 
        video: { 
          width: { ideal: 1280, min: 800 }, 
          height: { ideal: 720, min: 600 },
          facingMode: 'user'
        } 
      });
      
      streamRef.current = stream;
      
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        setCameraActive(true);
        console.log('Camera started successfully');
      }
    } catch (error) {
      console.error('Error accessing camera:', error);
      if (onError) {
        onError('Unable to access camera. Please check permissions.');
      }
    }
  }, [onError]);

  const stopCamera = useCallback(() => {
    if (streamRef.current) {
      const tracks = streamRef.current.getTracks();
      tracks.forEach(track => track.stop());
      streamRef.current = null;
    }
    
    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }
    
    setCameraActive(false);
    console.log('Camera stopped');
  }, []);

  // Capture image from video
  const captureImage = useCallback(() => {
    const video = videoRef.current;
    const canvas = canvasRef.current;
    
    if (!video || !canvas) return null;
    
    const ctx = canvas.getContext('2d');
    
    // Ensure minimum resolution for face detection (at least 800x600)
    const minWidth = Math.max(video.videoWidth, 800);
    const minHeight = Math.max(video.videoHeight, 600);
    
    canvas.width = minWidth;
    canvas.height = minHeight;
    
    // Draw video frame to canvas, scaling if necessary
    ctx.drawImage(video, 0, 0, minWidth, minHeight);
    
    // Use higher quality JPEG compression (0.95 instead of 0.9)
    return canvas.toDataURL('image/jpeg', 0.95);
  }, []);

  const performVerification = useCallback(async () => {
    if (!videoRef.current || !cameraActive) {
      console.log('Verification failed: video or camera not ready');
      return;
    }

    console.log('Starting face verification...');
    console.log('API_BASE_URL being used:', API_BASE_URL);
    setIsVerifying(true);
    
    try {
      // Capture image
      const imageData = captureImage();
      if (!imageData) {
        throw new Error('Failed to capture image');
      }

      // Convert image data to blob for file upload
      const response = await fetch(imageData);
      const blob = await response.blob();
      
      // Log image quality information for debugging
      console.log('📸 [IMAGE-CAPTURE] Image details:');
      console.log('  - Blob size:', blob.size, 'bytes');
      console.log('  - Blob type:', blob.type);
      console.log('  - Canvas dimensions:', canvasRef.current?.width, 'x', canvasRef.current?.height);
      console.log('  - Video dimensions:', videoRef.current?.videoWidth, 'x', videoRef.current?.videoHeight);
      
      // Create FormData to send photo file
      const formData = new FormData();
      formData.append('photo', blob, 'verification.jpg');
      formData.append('student_id', 'STU01'); // For now, using STU01 as test student

      // Send to Node.js backend for verification using the correct endpoint
      const fullUrl = `${API_BASE_URL}/students/verify-live`;
      console.log('=== FACE VERIFICATION DEBUG ===');
      console.log('process.env.REACT_APP_API_URL:', process.env.REACT_APP_API_URL);
      console.log('API_BASE_URL:', API_BASE_URL);
      console.log('Full URL being used:', fullUrl);
      console.log('Making request to:', fullUrl);
      console.log('Request payload: FormData with photo and student_id');
      console.log('================================');
      
      const apiResponse = await axios.post(fullUrl, formData, {
        headers: {
          'Content-Type': 'multipart/form-data'
        }
      });

      const result = apiResponse.data;

      if (result.valid) {
        setVerificationResult({
          success: true,
          student: result.student,
          confidence: result.confidence,
          message: `Welcome, ${result.student.name}!`
        });
        
        // Call success callback with student data
        onVerificationSuccess(result.student);
      } else {
        setVerificationResult({
          success: false,
          message: result.error || 'Face not recognized. Please try again or use QR code.'
        });
      }

    } catch (err) {
      console.error('Verification error:', err);
      setVerificationResult({
        success: false,
        message: err.message || 'Verification failed. Please try again.'
      });
      
      if (onError) {
        onError(err.message || 'Face verification failed');
      }
    } finally {
      setIsVerifying(false);
    }
  }, [cameraActive, captureImage, onVerificationSuccess, onError]);

  useEffect(() => {
    // Cleanup on unmount
    return () => {
      stopCamera();
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, [stopCamera]);

  const startVerification = useCallback(() => {
    if (!cameraActive) return;
    
    setCountdown(3);
    intervalRef.current = setInterval(() => {
      setCountdown(prev => {
        if (prev <= 1) {
          clearInterval(intervalRef.current);
          performVerification();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
  }, [cameraActive, performVerification]);

  const resetVerification = useCallback(() => {
    setVerificationResult(null);
    setCountdown(0);
    if (canvasRef.current) {
      const ctx = canvasRef.current.getContext('2d');
      ctx.clearRect(0, 0, canvasRef.current.width, canvasRef.current.height);
    }
  }, []);

  if (isLoading) {
    return (
      <div className="card p-6 text-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 mx-auto mb-4" style={{
          borderColor: 'var(--primary-600)'
        }}></div>
        <p style={{ color: 'var(--text-secondary)' }}>Initializing face verification...</p>
      </div>
    );
  }

  return (
    <div className="card p-6">
      <div className="text-center mb-6">
        <h3 className="text-xl font-semibold mb-2" style={{ color: 'var(--text-primary)' }}>
          Face Verification
        </h3>
        <p style={{ color: 'var(--text-secondary)' }}>
          Look at the camera to mark your attendance
        </p>
      </div>

      <div className="relative mb-6">
        <video
          ref={videoRef}
          autoPlay
          muted
          className="w-full max-w-md mx-auto rounded-lg"
          style={{ display: cameraActive ? 'block' : 'none' }}
          onLoadedMetadata={() => {
            if (canvasRef.current && videoRef.current) {
              canvasRef.current.width = videoRef.current.videoWidth;
              canvasRef.current.height = videoRef.current.videoHeight;
            }
          }}
        />
        <canvas
          ref={canvasRef}
          className="absolute top-0 left-0 w-full max-w-md mx-auto rounded-lg"
          style={{ display: cameraActive ? 'block' : 'none' }}
        />
        
        {!cameraActive && (
          <div className="w-full max-w-md mx-auto h-64 rounded-lg flex items-center justify-center" style={{
            backgroundColor: 'var(--bg-secondary)',
            border: '2px dashed var(--border-primary)'
          }}>
            <div className="text-center">
              <span className="text-6xl mb-4 block">👤</span>
              <p style={{ color: 'var(--text-secondary)' }}>Camera not active</p>
            </div>
          </div>
        )}

        {countdown > 0 && (
          <div className="absolute inset-0 flex items-center justify-center bg-black bg-opacity-50 rounded-lg">
            <div className="text-center">
              <div className="text-6xl font-bold text-white mb-2">{countdown}</div>
              <p className="text-white">Get ready...</p>
            </div>
          </div>
        )}
      </div>

      {verificationResult && (
        <div className={`mb-6 p-4 rounded-lg ${
          verificationResult.success 
            ? 'bg-green-50 border border-green-200' 
            : 'bg-red-50 border border-red-200'
        }`}>
          <div className="flex items-center">
            <span className="text-2xl mr-3">
              {verificationResult.success ? '✅' : '❌'}
            </span>
            <div>
              <p className={`font-medium ${
                verificationResult.success ? 'text-green-800' : 'text-red-800'
              }`}>
                {verificationResult.message}
              </p>
              {verificationResult.success && verificationResult.confidence && (
                <p className="text-sm text-green-600 mt-1">
                  Confidence: {(verificationResult.confidence * 100).toFixed(1)}%
                </p>
              )}
            </div>
          </div>
        </div>
      )}

      <div className="flex flex-wrap gap-3 justify-center">
        {!cameraActive ? (
          <button
            onClick={startCamera}
            className="btn btn-primary"
          >
            Start Camera
          </button>
        ) : (
          <>
            <button
              onClick={startVerification}
              disabled={isVerifying || countdown > 0}
              className="btn btn-primary"
            >
              {isVerifying ? 'Verifying...' : countdown > 0 ? `Starting in ${countdown}...` : 'Verify Face'}
            </button>
            
            <button
              onClick={stopCamera}
              className="btn btn-secondary"
            >
              Stop Camera
            </button>
          </>
        )}

        {verificationResult && (
          <button
            onClick={resetVerification}
            className="btn btn-outline"
          >
            Try Again
          </button>
        )}
      </div>

      <div className="mt-6 p-3 rounded-lg" style={{
        backgroundColor: 'var(--info-50)',
        border: '1px solid var(--info-200)'
      }}>
        <p className="text-sm" style={{ color: 'var(--info-700)' }}>
          💡 <strong>Tips:</strong> Ensure good lighting, look directly at the camera, and keep your face clearly visible for best results.
        </p>
      </div>
    </div>
  );
};

export default FaceVerification;