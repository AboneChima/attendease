import React, { useState, useRef, useEffect, useCallback } from 'react';
import * as faceapi from 'face-api.js';

const LivenessDetection = ({ onLivenessComplete, onError }) => {
  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const [currentChallenge, setCurrentChallenge] = useState(null);
  const [challengeIndex, setChallengeIndex] = useState(0);
  const [isDetecting, setIsDetecting] = useState(false);
  const [challengeProgress, setChallengeProgress] = useState(0);
  const [detectionResults, setDetectionResults] = useState([]);
  
  // Liveness challenges
  const challenges = [
    {
      type: 'blink',
      instruction: 'Please blink your eyes naturally',
      duration: 3000,
      requiredActions: 2
    },
    {
      type: 'smile',
      instruction: 'Please smile',
      duration: 2000,
      requiredActions: 1
    },
    {
      type: 'turn_head',
      instruction: 'Slowly turn your head left, then right',
      duration: 4000,
      requiredActions: 2
    },
    {
      type: 'nod',
      instruction: 'Nod your head up and down',
      duration: 3000,
      requiredActions: 2
    }
  ];

  const [blinkState, setBlinkState] = useState({
    eyesOpen: true,
    blinkCount: 0,
    lastBlinkTime: 0
  });

  const [headPose, setHeadPose] = useState({
    yaw: 0,
    pitch: 0,
    roll: 0,
    movements: []
  });

  const [expressionState, setExpressionState] = useState({
    isSmiling: false,
    smileDetected: false
  });

  useEffect(() => {
    startLivenessDetection();
    return () => {
      if (videoRef.current && videoRef.current.srcObject) {
        videoRef.current.srcObject.getTracks().forEach(track => track.stop());
      }
    };
  }, []);

  const startLivenessDetection = async () => {
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
          setCurrentChallenge(challenges[0]);
          setIsDetecting(true);
          detectFaces();
        };
      }
    } catch (error) {
      onError('Camera access denied or not available');
    }
  };

  const detectFaces = useCallback(async () => {
    if (!videoRef.current || !isDetecting) return;

    const detections = await faceapi
      .detectAllFaces(videoRef.current, new faceapi.TinyFaceDetectorOptions())
      .withFaceLandmarks()
      .withFaceExpressions();

    if (detections.length === 0) {
      setTimeout(detectFaces, 100);
      return;
    }

    const detection = detections[0];
    
    // Draw detection on canvas
    if (canvasRef.current) {
      const canvas = canvasRef.current;
      const displaySize = { width: videoRef.current.videoWidth, height: videoRef.current.videoHeight };
      faceapi.matchDimensions(canvas, displaySize);
      
      const ctx = canvas.getContext('2d');
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      
      const resizedDetections = faceapi.resizeResults(detections, displaySize);
      faceapi.draw.drawDetections(canvas, resizedDetections);
      faceapi.draw.drawFaceLandmarks(canvas, resizedDetections);
    }

    // Process current challenge
    if (currentChallenge) {
      await processChallengeDetection(detection);
    }

    setTimeout(detectFaces, 100);
  }, [isDetecting, currentChallenge]);

  const processChallengeDetection = async (detection) => {
    const { landmarks, expressions } = detection;
    
    switch (currentChallenge.type) {
      case 'blink':
        detectBlink(landmarks);
        break;
      case 'smile':
        detectSmile(expressions);
        break;
      case 'turn_head':
        detectHeadMovement(landmarks);
        break;
      case 'nod':
        detectNodding(landmarks);
        break;
    }
  };

  const detectBlink = (landmarks) => {
    const leftEye = landmarks.getLeftEye();
    const rightEye = landmarks.getRightEye();
    
    // Calculate eye aspect ratio (EAR)
    const leftEAR = calculateEAR(leftEye);
    const rightEAR = calculateEAR(rightEye);
    const avgEAR = (leftEAR + rightEAR) / 2;
    
    const EAR_THRESHOLD = 0.25;
    const currentTime = Date.now();
    
    if (avgEAR < EAR_THRESHOLD && blinkState.eyesOpen) {
      // Eyes just closed
      setBlinkState(prev => ({ ...prev, eyesOpen: false }));
    } else if (avgEAR >= EAR_THRESHOLD && !blinkState.eyesOpen) {
      // Eyes just opened - blink detected
      if (currentTime - blinkState.lastBlinkTime > 500) { // Debounce
        setBlinkState(prev => ({
          eyesOpen: true,
          blinkCount: prev.blinkCount + 1,
          lastBlinkTime: currentTime
        }));
        
        if (blinkState.blinkCount + 1 >= currentChallenge.requiredActions) {
          completeChallenge('blink', true);
        }
      }
    }
  };

  const calculateEAR = (eye) => {
    // Eye Aspect Ratio calculation
    const p1 = eye[1];
    const p2 = eye[5];
    const p3 = eye[2];
    const p4 = eye[4];
    const p5 = eye[0];
    const p6 = eye[3];
    
    const vertical1 = Math.sqrt(Math.pow(p2.x - p6.x, 2) + Math.pow(p2.y - p6.y, 2));
    const vertical2 = Math.sqrt(Math.pow(p3.x - p5.x, 2) + Math.pow(p3.y - p5.y, 2));
    const horizontal = Math.sqrt(Math.pow(p1.x - p4.x, 2) + Math.pow(p1.y - p4.y, 2));
    
    return (vertical1 + vertical2) / (2 * horizontal);
  };

  const detectSmile = (expressions) => {
    const smileConfidence = expressions.happy;
    const SMILE_THRESHOLD = 0.7;
    
    if (smileConfidence > SMILE_THRESHOLD && !expressionState.smileDetected) {
      setExpressionState({
        isSmiling: true,
        smileDetected: true
      });
      completeChallenge('smile', true);
    }
  };

  const detectHeadMovement = (landmarks) => {
    const nose = landmarks.getNose();
    const jawline = landmarks.getJawOutline();
    
    // Calculate head pose (simplified)
    const noseCenter = nose[3];
    const leftJaw = jawline[0];
    const rightJaw = jawline[16];
    
    const yaw = Math.atan2(rightJaw.x - leftJaw.x, rightJaw.y - leftJaw.y) * 180 / Math.PI;
    
    setHeadPose(prev => {
      const newMovements = [...prev.movements, yaw];
      if (newMovements.length > 10) newMovements.shift();
      
      // Check for left-right movement
      const minYaw = Math.min(...newMovements);
      const maxYaw = Math.max(...newMovements);
      const yawRange = maxYaw - minYaw;
      
      if (yawRange > 30 && newMovements.length >= 8) {
        completeChallenge('turn_head', true);
      }
      
      return {
        yaw,
        pitch: prev.pitch,
        roll: prev.roll,
        movements: newMovements
      };
    });
  };

  const detectNodding = (landmarks) => {
    const nose = landmarks.getNose();
    const noseY = nose[3].y;
    
    setHeadPose(prev => {
      const newMovements = [...prev.movements, noseY];
      if (newMovements.length > 15) newMovements.shift();
      
      if (newMovements.length >= 10) {
        const minY = Math.min(...newMovements);
        const maxY = Math.max(...newMovements);
        const yRange = maxY - minY;
        
        if (yRange > 20) {
          completeChallenge('nod', true);
        }
      }
      
      return {
        ...prev,
        movements: newMovements
      };
    });
  };

  const completeChallenge = (challengeType, success) => {
    const result = {
      challenge: challengeType,
      success,
      timestamp: Date.now()
    };
    
    setDetectionResults(prev => [...prev, result]);
    
    if (challengeIndex < challenges.length - 1) {
      // Move to next challenge
      const nextIndex = challengeIndex + 1;
      setChallengeIndex(nextIndex);
      setCurrentChallenge(challenges[nextIndex]);
      
      // Reset states
      setBlinkState({ eyesOpen: true, blinkCount: 0, lastBlinkTime: 0 });
      setExpressionState({ isSmiling: false, smileDetected: false });
      setHeadPose({ yaw: 0, pitch: 0, roll: 0, movements: [] });
    } else {
      // All challenges completed
      setIsDetecting(false);
      const allPassed = [...detectionResults, result].every(r => r.success);
      onLivenessComplete(allPassed, [...detectionResults, result]);
    }
  };

  return (
    <div className="liveness-detection">
      <div className="video-container" style={{ position: 'relative', display: 'inline-block' }}>
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
      
      {currentChallenge && (
        <div className="challenge-info" style={{ marginTop: '20px', textAlign: 'center' }}>
          <h3>Liveness Check {challengeIndex + 1} of {challenges.length}</h3>
          <p style={{ fontSize: '18px', color: '#007bff' }}>
            {currentChallenge.instruction}
          </p>
          
          {currentChallenge.type === 'blink' && (
            <p>Blinks detected: {blinkState.blinkCount} / {currentChallenge.requiredActions}</p>
          )}
          
          <div className="progress-bar" style={{ 
            width: '100%', 
            height: '10px', 
            backgroundColor: '#e0e0e0', 
            borderRadius: '5px',
            marginTop: '10px'
          }}>
            <div 
              style={{
                width: `${((challengeIndex + 1) / challenges.length) * 100}%`,
                height: '100%',
                backgroundColor: '#007bff',
                borderRadius: '5px',
                transition: 'width 0.3s ease'
              }}
            />
          </div>
        </div>
      )}
      
      <div className="detection-results" style={{ marginTop: '20px' }}>
        {detectionResults.map((result, index) => (
          <div key={index} style={{ 
            padding: '5px', 
            margin: '5px 0',
            backgroundColor: result.success ? '#d4edda' : '#f8d7da',
            border: `1px solid ${result.success ? '#c3e6cb' : '#f5c6cb'}`,
            borderRadius: '4px'
          }}>
            {result.challenge}: {result.success ? '✓ Passed' : '✗ Failed'}
          </div>
        ))}
      </div>
    </div>
  );
};

export default LivenessDetection;