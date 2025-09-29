import React, { useState } from 'react';

const CameraDiagnostic = () => {
  const [diagnosticResult, setDiagnosticResult] = useState(null);
  const [isRunning, setIsRunning] = useState(false);

  const runDiagnostic = async () => {
    setIsRunning(true);
    setDiagnosticResult(null);

    const results = {
      browserSupport: false,
      permissions: 'unknown',
      cameraAvailable: false,
      cameraCount: 0,
      error: null
    };

    try {
      // Check if getUserMedia is supported
      if (navigator.mediaDevices && navigator.mediaDevices.getUserMedia) {
        results.browserSupport = true;
      } else {
        results.error = 'Browser does not support camera access';
        setDiagnosticResult(results);
        setIsRunning(false);
        return;
      }

      // Check available cameras
      try {
        const devices = await navigator.mediaDevices.enumerateDevices();
        const cameras = devices.filter(device => device.kind === 'videoinput');
        results.cameraCount = cameras.length;
        
        if (cameras.length === 0) {
          results.error = 'No cameras found on this device';
          setDiagnosticResult(results);
          setIsRunning(false);
          return;
        }
      } catch (err) {
        results.error = 'Cannot enumerate devices: ' + err.message;
      }

      // Try to access camera
      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          video: { width: 320, height: 240 }
        });
        
        results.cameraAvailable = true;
        results.permissions = 'granted';
        
        // Immediately stop the stream
        stream.getTracks().forEach(track => track.stop());
        
      } catch (err) {
        results.permissions = 'denied';
        results.error = err.name + ': ' + err.message;
        
        if (err.name === 'NotReadableError') {
          results.error += ' - Camera is in use by another application';
        } else if (err.name === 'NotAllowedError') {
          results.error += ' - Camera permission denied';
        } else if (err.name === 'NotFoundError') {
          results.error += ' - No camera found';
        }
      }

    } catch (err) {
      results.error = 'Unexpected error: ' + err.message;
    }

    setDiagnosticResult(results);
    setIsRunning(false);
  };

  const getSolutionSteps = () => {
    if (!diagnosticResult) return [];

    const steps = [];

    if (!diagnosticResult.browserSupport) {
      steps.push('Update your browser to the latest version');
      steps.push('Try using Chrome, Firefox, or Edge');
    }

    if (diagnosticResult.cameraCount === 0) {
      steps.push('Connect a camera to your device');
      steps.push('Check if camera drivers are installed');
    }

    if (diagnosticResult.error?.includes('NotReadableError') || diagnosticResult.error?.includes('in use')) {
      steps.push('Close Zoom, Teams, Skype, or other video apps');
      steps.push('Close other browser tabs using camera');
      steps.push('Close Windows Camera app');
      steps.push('Restart your browser');
    }

    if (diagnosticResult.error?.includes('NotAllowedError') || diagnosticResult.permissions === 'denied') {
      steps.push('Click "Allow" when browser asks for camera permission');
      steps.push('Check browser camera settings');
      steps.push('Check Windows camera privacy settings');
    }

    if (steps.length === 0 && diagnosticResult.cameraAvailable) {
      steps.push('Camera is working! Try the verification page again.');
    }

    return steps;
  };

  return (
    <div style={{ 
      maxWidth: '600px', 
      margin: '20px auto', 
      padding: '20px', 
      border: '1px solid #ddd', 
      borderRadius: '8px',
      backgroundColor: '#f9f9f9'
    }}>
      <h3>🔍 Camera Diagnostic Tool</h3>
      <p>This tool will help identify camera access issues.</p>
      
      <button 
        onClick={runDiagnostic}
        disabled={isRunning}
        style={{
          padding: '10px 20px',
          backgroundColor: '#007bff',
          color: 'white',
          border: 'none',
          borderRadius: '4px',
          cursor: isRunning ? 'not-allowed' : 'pointer'
        }}
      >
        {isRunning ? '🔄 Running Diagnostic...' : '🔍 Run Camera Diagnostic'}
      </button>

      {diagnosticResult && (
        <div style={{ marginTop: '20px' }}>
          <h4>📊 Diagnostic Results:</h4>
          <ul style={{ listStyle: 'none', padding: 0 }}>
            <li>✅ Browser Support: {diagnosticResult.browserSupport ? 'Yes' : 'No'}</li>
            <li>📹 Cameras Found: {diagnosticResult.cameraCount}</li>
            <li>🔐 Permissions: {diagnosticResult.permissions}</li>
            <li>📷 Camera Available: {diagnosticResult.cameraAvailable ? 'Yes' : 'No'}</li>
          </ul>

          {diagnosticResult.error && (
            <div style={{ 
              backgroundColor: '#f8d7da', 
              color: '#721c24', 
              padding: '10px', 
              borderRadius: '4px',
              marginTop: '10px'
            }}>
              <strong>Error:</strong> {diagnosticResult.error}
            </div>
          )}

          <div style={{ marginTop: '15px' }}>
            <h4>🔧 Recommended Solutions:</h4>
            <ol>
              {getSolutionSteps().map((step, index) => (
                <li key={index} style={{ marginBottom: '5px' }}>{step}</li>
              ))}
            </ol>
          </div>
        </div>
      )}
    </div>
  );
};

export default CameraDiagnostic;