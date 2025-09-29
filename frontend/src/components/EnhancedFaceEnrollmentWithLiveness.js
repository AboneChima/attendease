import React, { useState, useRef, useEffect } from 'react';
import * as faceapi from 'face-api.js';
import LivenessDetection from './LivenessDetection';

const EnhancedFaceEnrollmentWithLiveness = ({ studentId, onEnrollmentComplete, onError }) => {
  const [enrollmentStage, setEnrollmentStage] = useState('liveness'); // 'liveness', 'capture', 'processing', 'complete'
  const [livenessResults, setLivenessResults] = useState(null);
  const [capturedSamples, setCapturedSamples] = useState([]);
  const [currentSample, setCurrentSample] = useState(0);
  const [isCapturing, setIsCapturing] = useState(false);
  const [qualityScores, setQualityScores] = useState([]);
  
  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const requiredSamples = 5; // Capture 5 different face samples
  
  const qualityThresholds = {
    minFaceSize: 100,
    maxFaceSize: 400,
    minConfidence: 0.8,
    maxBlur: 0.3,
    minBrightness: 50,
    maxBrightness: 200,
    frontFaceAngle: 15 // degrees
  };

  useEffect(() => {
    if (enrollmentStage === 'capture') {
      startFaceCapture();
    }
    
    return () => {
      if (videoRef.current && videoRef.current.srcObject) {
        videoRef.current.srcObject.getTracks().forEach(track => track.stop());
      }
    };
  }, [enrollmentStage]);

  const handleLivenessComplete = (passed, results) => {
    if (passed) {
      setLivenessResults(results);
      setEnrollmentStage('capture');
    } else {
      onError('Liveness detection failed. Please try again.');
    }
  };

  const startFaceCapture = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ 
        video: { 
          width: 640, 
          height: 480,
          facingMode: 'user'
        } 
      });
      
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        videoRef.current.onloadedmetadata = () => {
          setIsCapturing(true);
          captureNextSample();
        };
      }
    } catch (error) {
      onError('Camera access denied or not available');
    }
  };

  const captureNextSample = async () => {
    if (currentSample >= requiredSamples) {
      await processEnrollment();
      return;
    }

    // Wait for user to position themselves
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    const detection = await faceapi
      .detectSingleFace(videoRef.current, new faceapi.TinyFaceDetectorOptions())
      .withFaceLandmarks()
      .withFaceDescriptor();

    if (!detection) {
      onError(`No face detected for sample ${currentSample + 1}. Please ensure your face is visible.`);
      return;
    }

    const qualityScore = assessFaceQuality(detection, videoRef.current);
    
    if (qualityScore.overall < 0.7) {
      onError(`Poor quality face detected for sample ${currentSample + 1}. ${qualityScore.issues.join(', ')}`);
      return;
    }

    // Capture the sample
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    canvas.width = videoRef.current.videoWidth;
    canvas.height = videoRef.current.videoHeight;
    ctx.drawImage(videoRef.current, 0, 0);
    
    const imageData = canvas.toDataURL('image/jpeg', 0.9);
    
    setCapturedSamples(prev => [...prev, {
      descriptor: Array.from(detection.descriptor),
      image: imageData,
      quality: qualityScore,
      timestamp: Date.now(),
      landmarks: detection.landmarks
    }]);
    
    setQualityScores(prev => [...prev, qualityScore]);
    setCurrentSample(prev => prev + 1);
    
    // Continue to next sample
    setTimeout(captureNextSample, 1000);
  };

  const assessFaceQuality = (detection, videoElement) => {
    const { box, landmarks } = detection;
    const issues = [];
    let score = 1.0;

    // Face size check
    const faceSize = Math.max(box.width, box.height);
    if (faceSize < qualityThresholds.minFaceSize) {
      issues.push('Face too small - move closer');
      score -= 0.3;
    } else if (faceSize > qualityThresholds.maxFaceSize) {
      issues.push('Face too large - move back');
      score -= 0.2;
    }

    // Face angle check (simplified)
    const nose = landmarks.getNose();
    const leftEye = landmarks.getLeftEye();
    const rightEye = landmarks.getRightEye();
    
    const eyeCenter = {
      x: (leftEye[0].x + rightEye[3].x) / 2,
      y: (leftEye[0].y + rightEye[3].y) / 2
    };
    
    const noseCenter = nose[3];
    const faceAngle = Math.abs(Math.atan2(noseCenter.y - eyeCenter.y, noseCenter.x - eyeCenter.x) * 180 / Math.PI);
    
    if (faceAngle > qualityThresholds.frontFaceAngle) {
      issues.push('Please face the camera directly');
      score -= 0.2;
    }

    // Brightness check (simplified)
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    canvas.width = box.width;
    canvas.height = box.height;
    ctx.drawImage(videoElement, box.x, box.y, box.width, box.height, 0, 0, box.width, box.height);
    
    const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
    const data = imageData.data;
    let brightness = 0;
    
    for (let i = 0; i < data.length; i += 4) {
      brightness += (data[i] + data[i + 1] + data[i + 2]) / 3;
    }
    brightness = brightness / (data.length / 4);
    
    if (brightness < qualityThresholds.minBrightness) {
      issues.push('Too dark - improve lighting');
      score -= 0.2;
    } else if (brightness > qualityThresholds.maxBrightness) {
      issues.push('Too bright - reduce lighting');
      score -= 0.1;
    }

    return {
      overall: Math.max(0, score),
      brightness,
      faceSize,
      faceAngle,
      issues
    };
  };

  const processEnrollment = async () => {
    setEnrollmentStage('processing');
    
    try {
      // Calculate average descriptor from all samples
      const descriptors = capturedSamples.map(sample => sample.descriptor);
      const avgDescriptor = calculateAverageDescriptor(descriptors);
      
      // Select best quality samples for storage
      const sortedSamples = capturedSamples
        .sort((a, b) => b.quality.overall - a.quality.overall)
        .slice(0, 3); // Keep top 3 samples
      
      // Prepare enrollment data
      const enrollmentData = {
        studentId,
        primaryDescriptor: avgDescriptor,
        alternativeDescriptors: sortedSamples.map(s => s.descriptor),
        qualityMetrics: {
          averageQuality: qualityScores.reduce((sum, q) => sum + q.overall, 0) / qualityScores.length,
          samples: qualityScores.length,
          livenessResults
        },
        referenceImages: sortedSamples.map(s => s.image),
        enrollmentTimestamp: Date.now()
      };
      
      // Send to backend
      const response = await fetch('/api/students/enroll-enhanced-face', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(enrollmentData),
      });
      
      if (response.ok) {
        setEnrollmentStage('complete');
        onEnrollmentComplete(enrollmentData);
      } else {
        const error = await response.text();
        onError(`Enrollment failed: ${error}`);
      }
    } catch (error) {
      onError(`Enrollment processing failed: ${error.message}`);
    }
  };

  const calculateAverageDescriptor = (descriptors) => {
    const avgDescriptor = new Array(128).fill(0);
    
    descriptors.forEach(descriptor => {
      descriptor.forEach((value, index) => {
        avgDescriptor[index] += value;
      });
    });
    
    return avgDescriptor.map(value => value / descriptors.length);
  };

  const renderStage = () => {
    switch (enrollmentStage) {
      case 'liveness':
        return (
          <div>
            <h2>Step 1: Liveness Detection</h2>
            <p>Please complete the following challenges to verify you are a real person:</p>
            <LivenessDetection 
              onLivenessComplete={handleLivenessComplete}
              onError={onError}
            />
          </div>
        );
        
      case 'capture':
        return (
          <div>
            <h2>Step 2: Face Capture</h2>
            <p>Capturing sample {currentSample + 1} of {requiredSamples}</p>
            <p>Please look directly at the camera and remain still.</p>
            
            <div style={{ position: 'relative', display: 'inline-block' }}>
              <video
                ref={videoRef}
                autoPlay
                muted
                style={{ width: '640px', height: '480px', border: '2px solid #007bff' }}
              />
              <canvas
                ref={canvasRef}
                style={{
                  position: 'absolute',
                  top: 0,
                  left: 0,
                  width: '640px',
                  height: '480px',
                  pointerEvents: 'none'
                }}
              />
            </div>
            
            <div style={{ marginTop: '20px' }}>
              <div className="progress-bar" style={{ 
                width: '100%', 
                height: '20px', 
                backgroundColor: '#e0e0e0', 
                borderRadius: '10px'
              }}>
                <div 
                  style={{
                    width: `${(currentSample / requiredSamples) * 100}%`,
                    height: '100%',
                    backgroundColor: '#28a745',
                    borderRadius: '10px',
                    transition: 'width 0.3s ease'
                  }}
                />
              </div>
              <p style={{ textAlign: 'center', marginTop: '10px' }}>
                {currentSample} / {requiredSamples} samples captured
              </p>
            </div>
            
            {qualityScores.length > 0 && (
              <div style={{ marginTop: '20px' }}>
                <h4>Quality Scores:</h4>
                {qualityScores.map((score, index) => (
                  <div key={index} style={{ 
                    padding: '5px', 
                    margin: '5px 0',
                    backgroundColor: score.overall > 0.7 ? '#d4edda' : '#fff3cd',
                    border: `1px solid ${score.overall > 0.7 ? '#c3e6cb' : '#ffeaa7'}`,
                    borderRadius: '4px'
                  }}>
                    Sample {index + 1}: {(score.overall * 100).toFixed(1)}%
                    {score.issues.length > 0 && (
                      <span style={{ marginLeft: '10px', color: '#856404' }}>
                        ({score.issues.join(', ')})
                      </span>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        );
        
      case 'processing':
        return (
          <div style={{ textAlign: 'center', padding: '50px' }}>
            <h2>Processing Enrollment...</h2>
            <div className="spinner" style={{
              border: '4px solid #f3f3f3',
              borderTop: '4px solid #007bff',
              borderRadius: '50%',
              width: '50px',
              height: '50px',
              animation: 'spin 1s linear infinite',
              margin: '20px auto'
            }} />
            <p>Analyzing face samples and creating secure enrollment...</p>
          </div>
        );
        
      case 'complete':
        return (
          <div style={{ textAlign: 'center', padding: '50px' }}>
            <h2 style={{ color: '#28a745' }}>✓ Enrollment Complete!</h2>
            <p>Your face has been successfully enrolled with high security.</p>
            <div style={{ marginTop: '20px', padding: '20px', backgroundColor: '#d4edda', borderRadius: '8px' }}>
              <h4>Enrollment Summary:</h4>
              <p>• Liveness detection: Passed</p>
              <p>• Face samples captured: {capturedSamples.length}</p>
              <p>• Average quality: {qualityScores.length > 0 ? (qualityScores.reduce((sum, q) => sum + q.overall, 0) / qualityScores.length * 100).toFixed(1) : 0}%</p>
              <p>• Security level: High</p>
            </div>
          </div>
        );
        
      default:
        return null;
    }
  };

  return (
    <div className="enhanced-face-enrollment">
      <style jsx>{`
        @keyframes spin {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }
      `}</style>
      {renderStage()}
    </div>
  );
};

export default EnhancedFaceEnrollmentWithLiveness;