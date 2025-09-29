import React, { useState, useRef, useEffect } from 'react';
import './LiveCameraVerification.css';
import CameraDiagnostic from './CameraDiagnostic';

const LiveCameraVerification = () => {
  const [studentId, setStudentId] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);
  const [verificationResult, setVerificationResult] = useState(null);
  const [isCameraActive, setIsCameraActive] = useState(false);
  const [capturedImage, setCapturedImage] = useState(null);
  const [capturedBlob, setCapturedBlob] = useState(null);
  const [stream, setStream] = useState(null);
  
  const videoRef = useRef(null);
  const canvasRef = useRef(null);

  // Effect to handle video source assignment when stream and video element are ready
  useEffect(() => {
    if (stream && videoRef.current && isCameraActive) {
      console.log('📹 Setting video source via useEffect');
      videoRef.current.srcObject = stream;
    }
  }, [stream, isCameraActive]);

  // Cleanup effect for captured image URL to prevent memory leaks
  useEffect(() => {
    return () => {
      if (capturedImage && capturedImage.startsWith('blob:')) {
        URL.revokeObjectURL(capturedImage);
      }
    };
  }, [capturedImage]);

  // Start camera
  const startCamera = async () => {
    try {
      setIsLoading(true);
      setError('');
      console.log('🎬 Starting camera...');

      if (stream) {
        console.log('🛑 Stopping existing stream first');
        stream.getTracks().forEach(track => track.stop());
      }

      const mediaStream = await navigator.mediaDevices.getUserMedia({
        video: { 
          width: { ideal: 1280 },
          height: { ideal: 720 },
          facingMode: 'user'
        }
      });

      console.log('📹 Media stream obtained, activating camera...');
      setStream(mediaStream);
      setIsCameraActive(true);
      console.log('🎥 Camera is now active!');
      
    } catch (err) {
      console.error('❌ Camera error:', err);
      setError(`Camera access failed: ${err.message}`);
    } finally {
      setIsLoading(false);
    }
  };

  // Stop camera
  const stopCamera = () => {
    console.log('🛑 Stopping camera...');
    if (stream) {
      stream.getTracks().forEach(track => {
        track.stop();
      });
      setStream(null);
    }
    setIsCameraActive(false);
    setCapturedImage(null);
    setCapturedBlob(null);
    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }
    console.log('✅ Camera stopped');
  };

  // Capture photo from video stream
  const capturePhoto = () => {
    console.log('📸 Capturing photo...');
    
    try {
      const video = videoRef.current;
      const canvas = canvasRef.current;
      
      if (!video || !canvas) {
        setError('Camera not ready');
        return;
      }
      
      if (!isCameraActive) {
        setError('Please start the camera first');
        return;
      }
      
      // Ensure minimum resolution for face detection (at least 800x600)
      const minWidth = Math.max(video.videoWidth || 640, 800);
      const minHeight = Math.max(video.videoHeight || 480, 600);
      
      canvas.width = minWidth;
      canvas.height = minHeight;
      
      // Draw video frame to canvas, scaling if necessary
      const context = canvas.getContext('2d');
      context.drawImage(video, 0, 0, minWidth, minHeight);
      
      // Convert to blob and create URL
       canvas.toBlob((blob) => {
         if (blob) {
           const imageUrl = URL.createObjectURL(blob);
           setCapturedImage(imageUrl);
           setCapturedBlob(blob);
           console.log('✅ Photo captured!');
           setError('');
         } else {
           setError('Failed to capture photo');
         }
       }, 'image/jpeg', 0.95);
      
    } catch (err) {
      console.error('❌ Capture error:', err);
      setError('Failed to capture photo');
    }
  };

  // Verify captured image
  const verifyStudent = async () => {
    if (!studentId.trim()) {
      setError('Please enter a student ID');
      return;
    }

    if (!capturedImage || !capturedBlob) {
      setError('Please capture a photo first');
      return;
    }

    setIsLoading(true);
    setError(null);
    setVerificationResult(null);

    try {
      const formData = new FormData();
      formData.append('student_id', studentId.trim());
      formData.append('photo', capturedBlob, 'captured_photo.jpg');

      const response = await fetch('http://localhost:5000/api/students/verify-live', {
        method: 'POST',
        body: formData,
      });

      const result = await response.json();

      if (response.ok && result.success) {
        setVerificationResult({
          success: true,
          verified: result.verified,
          student: result.student,
          confidence: result.confidence,
          attendanceMarked: result.attendanceMarked,
          message: result.message
        });
        
        // Stop camera after successful verification
        if (result.verified) {
          setTimeout(() => {
            stopCamera();
          }, 3000); // Stop camera after 3 seconds to show result
        }
      } else {
        setError(result.error || 'Verification failed');
      }
    } catch (err) {
      console.error('Verification error:', err);
      setError('Network error. Please ensure the backend is running.');
    } finally {
      setIsLoading(false);
    }
  };

  // Reset verification
  const resetVerification = () => {
    setStudentId('');
    setError(null);
    setVerificationResult(null);
    setCapturedImage(null);
    setCapturedBlob(null);
    stopCamera();
  };

  // Force camera reset - helps with "device in use" errors
  const forceCameraReset = async () => {
    try {
      setError(null);
      
      // Stop any existing streams
      if (stream) {
        stream.getTracks().forEach(track => {
          track.stop();
        });
        setStream(null);
      }
      
      // Clear video element
      if (videoRef.current) {
        videoRef.current.srcObject = null;
      }
      
      setIsCameraActive(false);
      setCapturedImage(null);
      setCapturedBlob(null);
      
      // Wait longer for complete cleanup
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      // Try to enumerate devices to refresh camera state
      try {
        await navigator.mediaDevices.enumerateDevices();
      } catch (e) {
        console.log('Device enumeration failed:', e);
      }
      
      setError('Camera reset complete. Please try "Start Camera" again.');
      
    } catch (err) {
      console.error('Camera reset error:', err);
      setError('Camera reset failed. Please refresh the page and try again.');
    }
  };

  // Cleanup on component unmount
  useEffect(() => {
    return () => {
      // Ensure proper cleanup when component unmounts
      if (stream) {
        stream.getTracks().forEach(track => {
          track.stop();
        });
      }
      if (videoRef.current) {
        videoRef.current.srcObject = null;
      }
    };
  }, [stream]);

  return (
    <div className="live-camera-verification">
      <div className="verification-header">
        <h2>📹 Live Camera Verification</h2>
        <p>Enter your student ID and verify your identity using the camera</p>
      </div>

      <div className="verification-container">
        {/* Student ID Input */}
        <div className="student-id-section">
          <label htmlFor="studentId">Student ID:</label>
          <input
            type="text"
            id="studentId"
            value={studentId}
            onChange={(e) => setStudentId(e.target.value)}
            placeholder="Enter your student ID (e.g., STU001)"
            disabled={isLoading}
          />
        </div>

        {/* Camera Section */}
        <div className="camera-section">
          {isCameraActive && (
            <div className="video-container">
              <video
                ref={videoRef}
                autoPlay
                playsInline
                muted
                className="camera-video"
                style={{ 
                  width: '100%',
                  maxWidth: '640px',
                  height: 'auto',
                  borderRadius: '12px',
                  marginBottom: '20px',
                  border: '2px solid #007bff',
                  boxShadow: '0 4px 8px rgba(0,0,0,0.1)'
                }}
              />
            </div>
          )}
          <canvas
            ref={canvasRef}
            style={{ display: 'none' }}
          />

          {!isCameraActive ? (
            <div className="camera-placeholder">
              <div className="camera-icon">📷</div>
              <p>Camera not active</p>
              <button 
                onClick={startCamera}
                className="start-camera-btn"
                disabled={isLoading}
              >
                {isLoading ? '⏳ Starting Camera...' : '🎥 Start Camera'}
              </button>
            </div>
          ) : (
            <div className="camera-controls">
              <button 
                onClick={capturePhoto}
                className="capture-btn"
                disabled={isLoading || !stream}
              >
                📸 Capture Photo
              </button>
              <button 
                onClick={stopCamera}
                className="stop-camera-btn"
              >
                🛑 Stop Camera
              </button>
            </div>
          )}
        </div>

        {/* Captured Image Preview */}
        {capturedImage && (
          <div className="captured-image-section">
            <h4>📷 Captured Photo</h4>
            <img 
              src={capturedImage} 
              alt="Captured" 
              className="captured-image"
            />
            <button 
              onClick={verifyStudent}
              className="verify-btn"
              disabled={isLoading || !studentId.trim()}
            >
              {isLoading ? '🔄 Verifying...' : '✅ Verify Identity'}
            </button>
          </div>
        )}

        {/* Action Buttons */}
        <div className="action-buttons">
          {(capturedImage || verificationResult) && (
            <button 
              onClick={resetVerification}
              className="reset-btn"
              disabled={isLoading}
            >
              🔄 Start Over
            </button>
          )}
          
          {error && error.includes('Camera') && (
            <button 
              onClick={forceCameraReset}
              className="reset-camera-btn"
              disabled={isLoading}
            >
              🔧 Reset Camera
            </button>
          )}
        </div>

        {/* Results and Errors */}
        {error && (
          <div className="error-message">
            <h4>❌ Verification Failed</h4>
            <p>{error}</p>
            {error.includes('Camera') && (
              <div style={{ marginTop: '15px' }}>
                <CameraDiagnostic />
              </div>
            )}
          </div>
        )}

        {verificationResult && (
          <div className={`verification-result ${verificationResult.verified ? 'success' : 'failed'}`}>
            {verificationResult.verified ? (
              <div className="verification-success">
                <h4>✅ Identity Verified!</h4>
                <div className="student-info">
                  <p><strong>Student:</strong> {verificationResult.student?.name}</p>
                  <p><strong>ID:</strong> {verificationResult.student?.student_id}</p>
                  <p><strong>Confidence:</strong> {(verificationResult.confidence !== undefined && verificationResult.confidence !== null && !isNaN(verificationResult.confidence)) ? (verificationResult.confidence * 100).toFixed(1) : 'N/A'}%</p>
                  {verificationResult.attendanceMarked && (
                    <p className="attendance-marked">📝 Attendance marked successfully!</p>
                  )}
                </div>
                <p className="success-message">{verificationResult.message}</p>
              </div>
            ) : (
              <div className="verification-failed">
                <h4>❌ Identity Not Verified</h4>
                <p>{verificationResult.message || 'No matching face found for this student ID.'}</p>
                <p className="retry-hint">Please ensure you are enrolled and try again.</p>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Instructions */}
      <div className="verification-instructions">
        <h3>📋 How to Use</h3>
        <ol>
          <li>Enter your student ID in the field above</li>
          <li>Click "Start Camera" to activate your webcam</li>
          <li>Position your face clearly in the camera view</li>
          <li>Click "Capture Photo" when ready</li>
          <li>Click "Verify Identity" to check your identity</li>
          <li>If verified, your attendance will be automatically marked</li>
        </ol>
        
        <div className="tips">
          <h4>💡 Tips for Best Results</h4>
          <ul>
            <li>Ensure good lighting on your face</li>
            <li>Look directly at the camera</li>
            <li>Remove glasses, hats, or masks if possible</li>
            <li>Keep your face centered in the camera view</li>
            <li>Make sure you have enrolled your photo first</li>
          </ul>
        </div>

        <div className="troubleshooting">
          <h4>🔧 Camera Troubleshooting</h4>
          <ul>
            <li><strong>Camera in use error:</strong> Close other applications using the camera (Zoom, Teams, Skype, etc.)</li>
            <li><strong>Permission denied:</strong> Allow camera access in your browser settings</li>
            <li><strong>No camera found:</strong> Ensure your camera is connected and working</li>
            <li><strong>Camera not starting:</strong> Refresh the page and try again</li>
            <li><strong>Still having issues?</strong> Try using a different browser or restart your computer</li>
          </ul>
        </div>
      </div>
    </div>
  );
};

export default LiveCameraVerification;