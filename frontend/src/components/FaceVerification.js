import React, { useState, useRef, useEffect, useCallback } from 'react';
import * as faceapi from 'face-api.js';
import axios from 'axios';
import API_BASE_URL from '../config/api';

const FaceVerification = ({ onVerificationSuccess, onError }) => {
  const [modelsLoaded, setModelsLoaded] = useState(false);
  const [countdown, setCountdown] = useState(0);
  const [isVerifying, setIsVerifying] = useState(false);
  const [verificationResult, setVerificationResult] = useState(null);
  const [cameraActive, setCameraActive] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  const videoRef = useRef();
  const canvasRef = useRef();
  const intervalRef = useRef();

  const loadModels = useCallback(async () => {
    try {
      setIsLoading(true);
      console.log('Loading face-api models...');
      await faceapi.nets.tinyFaceDetector.loadFromUri('https://cdn.jsdelivr.net/npm/@vladmandic/face-api@latest/model');
      await faceapi.nets.faceLandmark68Net.loadFromUri('https://cdn.jsdelivr.net/npm/@vladmandic/face-api@latest/model');
      await faceapi.nets.faceRecognitionNet.loadFromUri('https://cdn.jsdelivr.net/npm/@vladmandic/face-api@latest/model');
      
      console.log('Face-api models loaded successfully');
      setModelsLoaded(true);
      setIsLoading(false);
    } catch (error) {
      console.error('Error loading face-api models:', error);
      setIsLoading(false);
    }
  }, []);

  const startCamera = useCallback(async () => {
    try {
      console.log('Starting camera...');
      const stream = await navigator.mediaDevices.getUserMedia({ 
        video: { 
          width: 640, 
          height: 480,
          facingMode: 'user'
        } 
      });
      
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        setCameraActive(true);
        console.log('Camera started successfully');
      }
    } catch (error) {
      console.error('Error accessing camera:', error);
    }
  }, []);

  const stopCamera = useCallback(() => {
    if (videoRef.current && videoRef.current.srcObject) {
      const stream = videoRef.current.srcObject;
      const tracks = stream.getTracks();
      tracks.forEach(track => track.stop());
      videoRef.current.srcObject = null;
      setCameraActive(false);
      console.log('Camera stopped');
    }
  }, []);

  const performVerification = useCallback(async () => {
    if (!videoRef.current || !modelsLoaded) {
      console.log('Verification failed: video or models not ready', { videoReady: !!videoRef.current, modelsLoaded });
      return;
    }

    console.log('Starting face verification...');
    setIsVerifying(true);
    
    try {
      console.log('Detecting faces in verification...');
      const detections = await faceapi
        .detectAllFaces(videoRef.current, new faceapi.TinyFaceDetectorOptions({
          inputSize: 416,
          scoreThreshold: 0.3
        }))
        .withFaceLandmarks()
        .withFaceDescriptors();

      console.log('Face detection results:', { detectionCount: detections.length });

      if (detections.length === 0) {
        console.log('No face detected during verification');
        setVerificationResult({
          success: false,
          message: 'No face detected. Please ensure your face is clearly visible.'
        });
        setIsVerifying(false);
        return;
      }

      if (detections.length > 1) {
        setVerificationResult({
          success: false,
          message: 'Multiple faces detected. Please ensure only one person is in the frame.'
        });
        setIsVerifying(false);
        return;
      }

      const faceDescriptor = Array.from(detections[0].descriptor);

      // Send face descriptor to backend for verification
      const response = await axios.post(`${API_BASE_URL}/students/verify-face`, {
        faceDescriptor
      });

      if (response.data.valid) {
        setVerificationResult({
          success: true,
          student: response.data.student,
          confidence: response.data.confidence,
          message: `Welcome, ${response.data.student.name}!`
        });
        
        // Call success callback with student data
        onVerificationSuccess(response.data.student);
      } else {
        setVerificationResult({
          success: false,
          message: 'Face not recognized. Please try again or use QR code.'
        });
      }

      // Draw detection on canvas for visual feedback
      if (canvasRef.current) {
        const canvas = canvasRef.current;
        const displaySize = { width: videoRef.current.videoWidth, height: videoRef.current.videoHeight };
        faceapi.matchDimensions(canvas, displaySize);
        
        const resizedDetections = faceapi.resizeResults(detections, displaySize);
        const ctx = canvas.getContext('2d');
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        
        // Draw face detection box
        faceapi.draw.drawDetections(canvas, resizedDetections);
        
        // Draw confidence score
        if (response.data.valid) {
          ctx.fillStyle = '#10B981';
          ctx.font = '16px Arial';
          ctx.fillText(
            `Confidence: ${(response.data.confidence * 100).toFixed(1)}%`,
            10, 30
          );
        }
      }

    } catch (error) {
      console.error('Error during face verification:', error);
      setVerificationResult({
        success: false,
        message: error.response?.data?.error || 'Verification failed. Please try again.'
      });
    }
    
    setIsVerifying(false);
  }, [modelsLoaded, onVerificationSuccess]);

  useEffect(() => {
    loadModels();
    return () => {
      stopCamera();
      // Store the current interval value to avoid stale closure
      const currentInterval = intervalRef.current;
      if (currentInterval) {
        clearInterval(currentInterval);
        intervalRef.current = null;
      }
    };
  }, [loadModels, stopCamera]);

  const startVerification = useCallback(() => {
    setCountdown(3);
    setVerificationResult(null);
    
    const countdownInterval = setInterval(() => {
      setCountdown(prev => {
        if (prev <= 1) {
          clearInterval(countdownInterval);
          performVerification();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
  }, [performVerification]);

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
        <p style={{ color: 'var(--text-secondary)' }}>Loading face recognition models...</p>
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
            disabled={!modelsLoaded}
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