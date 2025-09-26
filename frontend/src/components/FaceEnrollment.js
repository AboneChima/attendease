import React, { useState, useRef, useEffect, useCallback } from 'react';
import * as faceapi from 'face-api.js';

const FaceEnrollment = ({ studentId, onFaceEnrolled, onError }) => {
  const [isLoading, setIsLoading] = useState(true);
  const [isCapturing, setIsCapturing] = useState(false);
  const [capturedFaces, setCapturedFaces] = useState([]);
  const [modelsLoaded, setModelsLoaded] = useState(false);
  const [cameraActive, setCameraActive] = useState(false);
  
  const videoRef = useRef();
  const canvasRef = useRef();

  const loadModels = useCallback(async () => {
    try {
      setIsLoading(true);
      // Use CDN URLs for reliable model loading
      const MODEL_URL = 'https://raw.githubusercontent.com/justadudewhohacks/face-api.js/master/weights';
      
      await Promise.all([
        faceapi.nets.tinyFaceDetector.loadFromUri(MODEL_URL),
        faceapi.nets.faceLandmark68Net.loadFromUri(MODEL_URL),
        faceapi.nets.faceRecognitionNet.loadFromUri(MODEL_URL)
      ]);

      console.log('Models loaded successfully');
      setModelsLoaded(true);
      setIsLoading(false);
    } catch (error) {
      console.error('Error loading models:', error);
      setIsLoading(false);
      onError('Failed to load face detection models');
    }
  }, [onError]);

  const startCamera = useCallback(async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { width: 640, height: 480 }
      });
      
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        setCameraActive(true);
      }
    } catch (error) {
      console.error('Error accessing camera:', error);
      onError('Failed to access camera. Please ensure camera permissions are granted.');
    }
  }, [onError]);

  useEffect(() => {
    loadModels();
    return () => {
      stopCamera();
    };
  }, [loadModels]);

  const stopCamera = () => {
    if (videoRef.current && videoRef.current.srcObject) {
      const tracks = videoRef.current.srcObject.getTracks();
      tracks.forEach(track => track.stop());
      videoRef.current.srcObject = null;
      setCameraActive(false);
    }
  };

  const captureFace = async () => {
    if (!videoRef.current || !modelsLoaded) return;

    setIsCapturing(true);
    
    try {
      const detections = await faceapi
        .detectAllFaces(videoRef.current, new faceapi.TinyFaceDetectorOptions({
          inputSize: 416,
          scoreThreshold: 0.3
        }))
        .withFaceLandmarks()
        .withFaceDescriptors();

      if (detections.length === 0) {
        onError('No face detected. Please ensure your face is clearly visible.');
        setIsCapturing(false);
        return;
      }

      if (detections.length > 1) {
        onError('Multiple faces detected. Please ensure only one person is in the frame.');
        setIsCapturing(false);
        return;
      }

      const faceDescriptor = detections[0].descriptor;
      const newFace = {
        id: Date.now(),
        descriptor: Array.from(faceDescriptor),
        timestamp: new Date().toISOString()
      };

      setCapturedFaces(prev => [...prev, newFace]);
      
      // Draw detection on canvas for visual feedback
      if (canvasRef.current) {
        const canvas = canvasRef.current;
        const displaySize = { width: videoRef.current.videoWidth, height: videoRef.current.videoHeight };
        faceapi.matchDimensions(canvas, displaySize);
        
        const resizedDetections = faceapi.resizeResults(detections, displaySize);
        const ctx = canvas.getContext('2d');
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        faceapi.draw.drawDetections(canvas, resizedDetections);
        faceapi.draw.drawFaceLandmarks(canvas, resizedDetections);
      }

    } catch (error) {
      console.error('Error capturing face:', error);
      onError('Failed to capture face data');
    }
    
    setIsCapturing(false);
  };

  const completeFaceEnrollment = async () => {
    if (capturedFaces.length < 3) {
      onError('Please capture at least 3 face samples for better accuracy');
      return;
    }

    try {
      // Calculate average descriptor from all captured faces
      const descriptors = capturedFaces.map(face => new Float32Array(face.descriptor));
      const avgDescriptor = new Float32Array(128);
      
      for (let i = 0; i < 128; i++) {
        let sum = 0;
        descriptors.forEach(desc => sum += desc[i]);
        avgDescriptor[i] = sum / descriptors.length;
      }

      const faceData = {
        studentId,
        faceDescriptor: Array.from(avgDescriptor),
        sampleCount: capturedFaces.length,
        enrollmentDate: new Date().toISOString()
      };

      onFaceEnrolled(faceData);
      stopCamera();
    } catch (error) {
      console.error('Error completing face enrollment:', error);
      onError('Failed to complete face enrollment');
    }
  };

  const resetEnrollment = () => {
    setCapturedFaces([]);
    if (canvasRef.current) {
      const ctx = canvasRef.current.getContext('2d');
      ctx.clearRect(0, 0, canvasRef.current.width, canvasRef.current.height);
    }
  };

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
          Face Enrollment
        </h3>
        <p style={{ color: 'var(--text-secondary)' }}>
          Capture multiple face samples for accurate attendance verification
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
              <span className="text-6xl mb-4 block">📷</span>
              <p style={{ color: 'var(--text-secondary)' }}>Camera not active</p>
            </div>
          </div>
        )}
      </div>

      <div className="text-center mb-6">
        <p className="mb-2" style={{ color: 'var(--text-secondary)' }}>
          Captured samples: {capturedFaces.length}/5
        </p>
        <div className="flex justify-center space-x-2">
          {[...Array(5)].map((_, index) => (
            <div
              key={index}
              className="w-3 h-3 rounded-full"
              style={{
                backgroundColor: index < capturedFaces.length ? 'var(--success-500)' : 'var(--bg-tertiary)'
              }}
            />
          ))}
        </div>
      </div>

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
              onClick={captureFace}
              disabled={isCapturing || !modelsLoaded}
              className="btn btn-primary"
            >
              {isCapturing ? 'Capturing...' : 'Capture Face'}
            </button>
            
            <button
              onClick={stopCamera}
              className="btn btn-secondary"
            >
              Stop Camera
            </button>
          </>
        )}

        {capturedFaces.length > 0 && (
          <>
            <button
              onClick={resetEnrollment}
              className="btn btn-outline"
            >
              Reset
            </button>
            
            {capturedFaces.length >= 3 && (
              <button
                onClick={completeFaceEnrollment}
                className="btn btn-success"
              >
                Complete Enrollment
              </button>
            )}
          </>
        )}
      </div>

      {capturedFaces.length > 0 && capturedFaces.length < 3 && (
        <div className="mt-4 p-3 rounded-lg" style={{
          backgroundColor: 'var(--warning-50)',
          border: '1px solid var(--warning-200)'
        }}>
          <p className="text-sm" style={{ color: 'var(--warning-700)' }}>
            💡 Capture at least 3 samples from different angles for better accuracy
          </p>
        </div>
      )}
    </div>
  );
};

export default FaceEnrollment;