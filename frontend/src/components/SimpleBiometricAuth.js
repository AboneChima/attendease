import React, { useState, useEffect } from 'react';
import axios from 'axios';

// Add CSS for spin animation
const addSpinAnimation = () => {
  const style = document.createElement('style');
  style.textContent = `
    @keyframes spin {
      0% { transform: rotate(0deg); }
      100% { transform: rotate(360deg); }
    }
  `;
  if (!document.head.querySelector('style[data-spin-animation]')) {
    style.setAttribute('data-spin-animation', 'true');
    document.head.appendChild(style);
  }
};
const SimpleBiometricAuth = ({ studentId, onEnrollmentSuccess, onVerificationSuccess, mode = 'enroll' }) => {
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');

  useEffect(() => {
    addSpinAnimation();
  }, []);

  // Check if biometric authentication is supported
  const isBiometricSupported = () => {
    return (
      window.PublicKeyCredential &&
      typeof window.PublicKeyCredential.isUserVerifyingPlatformAuthenticatorAvailable === 'function'
    );
  };

  // Simple biometric enrollment
  const handleBiometricEnrollment = async () => {
    if (!isBiometricSupported()) {
      setError('Biometric authentication is not supported on this device.');
      return;
    }

    setIsProcessing(true);
    setError('');
    setMessage('Please use your fingerprint or face ID when prompted...');

    try {
      // Check if platform authenticator is available
      const available = await window.PublicKeyCredential.isUserVerifyingPlatformAuthenticatorAvailable();
      if (!available) {
        throw new Error('No biometric authenticator available on this device');
      }

      // Create a simple credential for biometric authentication
      const credential = await navigator.credentials.create({
        publicKey: {
          challenge: new Uint8Array(32), // Simple random challenge
          rp: {
            name: 'School Attendance System',
            id: window.location.hostname,
          },
          user: {
            id: new TextEncoder().encode(studentId),
            name: studentId,
            displayName: `Student ${studentId}`,
          },
          pubKeyCredParams: [
            { alg: -7, type: 'public-key' },   // ES256
            { alg: -257, type: 'public-key' }  // RS256
          ],
          authenticatorSelection: {
            authenticatorAttachment: 'platform',
            userVerification: 'required',
            requireResidentKey: false,
          },
          timeout: 60000,
        },
      });

      if (credential) {
        // Convert credential ID to base64 for storage
        const credentialIdBase64 = btoa(String.fromCharCode(...new Uint8Array(credential.rawId)));
        
        // Send enrollment data to backend
        const response = await fetch('http://localhost:5000/api/students/enroll-fingerprint', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            studentId,
            credentialId: credentialIdBase64,
            enrolled: true,
            enrollmentDate: new Date().toISOString(),
          }),
        });

        const result = await response.json();

        if (response.ok) {
          setMessage('✅ Biometric enrollment successful!');
          if (onEnrollmentSuccess) {
            onEnrollmentSuccess(result);
          }
        } else if (response.status === 409) {
          // Handle duplicate fingerprint error
          setError(`❌ ${result.message || 'This fingerprint is already registered in the system.'}`);
        } else {
          throw new Error(result.error || 'Enrollment failed');
        }
      }
    } catch (error) {
      console.error('Biometric enrollment error:', error);
      setError(`Enrollment failed: ${error.message}`);
    } finally {
      setIsProcessing(false);
    }
  };

  // Simple biometric verification
  const handleBiometricVerification = async () => {
    if (!isBiometricSupported()) {
      setError('Biometric authentication is not supported on this device.');
      return;
    }

    setIsProcessing(true);
    setError('');
    setMessage('Please use your fingerprint or face ID to verify...');

    try {
      // Get stored credentials for this student
      const response = await fetch(`http://localhost:5000/api/students/${studentId}/biometric-credentials`);
      const data = await response.json();

      if (!response.ok || !data.credentials || data.credentials.length === 0) {
        throw new Error('No biometric credentials found. Please enroll first.');
      }

      // Use the stored credential for verification
      const assertion = await navigator.credentials.get({
        publicKey: {
          challenge: new Uint8Array(32),
          allowCredentials: data.credentials.map(cred => {
            try {
              // Decode base64 credential ID to Uint8Array
              const binaryString = atob(cred.credentialId);
              const bytes = new Uint8Array(binaryString.length);
              for (let i = 0; i < binaryString.length; i++) {
                bytes[i] = binaryString.charCodeAt(i);
              }
              return {
                id: bytes,
                type: 'public-key',
              };
            } catch (error) {
              console.error('Failed to decode credential ID:', cred.credentialId, error);
              throw new Error('Invalid credential ID format');
            }
          }),
          userVerification: 'required',
          timeout: 60000,
        },
      });

      if (assertion) {
        setMessage('✅ Biometric verification successful!');
        if (onVerificationSuccess) {
          onVerificationSuccess({ studentId, verified: true });
        }
      }
    } catch (error) {
      console.error('Biometric verification error:', error);
      setError(`Verification failed: ${error.message}`);
    } finally {
      setIsProcessing(false);
    }
  };

  const cardStyle = {
    backgroundColor: 'white',
    borderRadius: '12px',
    boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)',
    border: '1px solid #e5e7eb',
    padding: '24px',
    width: '100%',
    maxWidth: '28rem',
    margin: '0 auto'
  };

  return (
    <div style={cardStyle}>
      <div style={{ textAlign: 'center', marginBottom: '24px' }}>
        <div style={{
          width: '64px',
          height: '64px',
          margin: '0 auto 16px',
          padding: '12px',
          backgroundColor: mode === 'enroll' ? '#dbeafe' : '#dcfce7',
          borderRadius: '50%',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center'
        }}>
          <span style={{ fontSize: '32px' }}>
            {mode === 'enroll' ? '👆' : '🛡️'}
          </span>
        </div>
        <h2 style={{
          fontSize: '24px',
          fontWeight: 'bold',
          margin: '0 0 8px 0',
          color: '#1f2937'
        }}>
          {mode === 'enroll' ? 'Enroll Biometric' : 'Biometric Verification'}
        </h2>
        <p style={{
          fontSize: '14px',
          color: '#6b7280',
          margin: '0'
        }}>
          {mode === 'enroll'
            ? 'Set up fingerprint or face ID for quick attendance'
            : 'Use your fingerprint or face ID to mark attendance'}
        </p>
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
        {error && (
          <div style={{
            padding: '12px',
            backgroundColor: '#fef2f2',
            border: '1px solid #fecaca',
            borderRadius: '8px',
            display: 'flex',
            alignItems: 'center',
            gap: '8px'
          }}>
            <span style={{ color: '#dc2626', fontSize: '16px' }}>⚠️</span>
            <span style={{ color: '#dc2626', fontSize: '14px' }}>{error}</span>
          </div>
        )}

        {message && !error && (
          <div style={{
            padding: '12px',
            backgroundColor: '#f0fdf4',
            border: '1px solid #bbf7d0',
            borderRadius: '8px'
          }}>
            <span style={{ color: '#16a34a', fontSize: '14px' }}>{message}</span>
          </div>
        )}

        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          {mode === 'enroll' ? (
            <button
              onClick={handleBiometricEnrollment}
              disabled={isProcessing}
              style={{
                width: '100%',
                padding: '12px 24px',
                backgroundColor: isProcessing ? '#9ca3af' : '#3b82f6',
                color: 'white',
                border: 'none',
                borderRadius: '8px',
                fontSize: '16px',
                fontWeight: '500',
                cursor: isProcessing ? 'not-allowed' : 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '8px',
                transition: 'background-color 0.2s'
              }}
            >
              {isProcessing ? (
                <>
                  <div style={{
                    width: '16px',
                    height: '16px',
                    border: '2px solid transparent',
                    borderTop: '2px solid white',
                    borderRadius: '50%',
                    animation: 'spin 1s linear infinite'
                  }}></div>
                  Enrolling...
                </>
              ) : (
                <>
                  <span>👆</span>
                  Enroll Biometric
                </>
              )}
            </button>
          ) : (
            <button
              onClick={handleBiometricVerification}
              disabled={isProcessing}
              style={{
                width: '100%',
                padding: '12px 24px',
                backgroundColor: isProcessing ? '#9ca3af' : '#10b981',
                color: 'white',
                border: 'none',
                borderRadius: '8px',
                fontSize: '16px',
                fontWeight: '500',
                cursor: isProcessing ? 'not-allowed' : 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '8px',
                transition: 'background-color 0.2s'
              }}
            >
              {isProcessing ? (
                <>
                  <div style={{
                    width: '16px',
                    height: '16px',
                    border: '2px solid transparent',
                    borderTop: '2px solid white',
                    borderRadius: '50%',
                    animation: 'spin 1s linear infinite'
                  }}></div>
                  Verifying...
                </>
              ) : (
                <>
                  <span>🛡️</span>
                  Verify Identity
                </>
              )}
            </button>
          )}
        </div>

        <div style={{
          fontSize: '14px',
          color: '#6b7280',
          textAlign: 'center',
          marginTop: '16px'
        }}>
          <p style={{ margin: '0 0 4px 0' }}>This uses your device's built-in biometric authentication.</p>
          <p style={{ margin: '0' }}>Your biometric data stays secure on your device.</p>
        </div>
      </div>
    </div>
  );
};

export default SimpleBiometricAuth;