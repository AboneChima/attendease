import React, { useState } from 'react';
import API_BASE_URL from '../config/api';
import FingerprintScanner from './FingerprintScanner';

const FingerprintEnrollment = ({ studentId, onEnrollmentComplete, onCancel }) => {
  const [isEnrolling, setIsEnrolling] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);

  const handleFingerprintEnrollment = async () => {
    if (!studentId) {
      setError('Student ID is required');
      return;
    }

    setIsEnrolling(true);
    setError('');
    setSuccess(false);

    try {
      console.log('Starting simple fingerprint enrollment for student:', studentId);

      // Check if biometric authentication is available
      if (!window.PublicKeyCredential || !await window.PublicKeyCredential.isUserVerifyingPlatformAuthenticatorAvailable()) {
        throw new Error('Biometric authentication is not available on this device');
      }

      // Create a simple credential for biometric authentication
      const credential = await navigator.credentials.create({
        publicKey: {
          challenge: crypto.getRandomValues(new Uint8Array(32)),
          rp: {
            name: "QR Attendance System",
            id: window.location.hostname,
          },
          user: {
            id: new TextEncoder().encode(studentId.toString()),
            name: studentId.toString(),
            displayName: `Student ${studentId}`,
          },
          pubKeyCredParams: [
            { alg: -7, type: "public-key" },   // ES256
            { alg: -257, type: "public-key" }  // RS256
          ],
          authenticatorSelection: {
            authenticatorAttachment: "platform",
            userVerification: "required",
          },
          timeout: 60000,
        },
      });

      if (!credential) {
        throw new Error('Failed to create biometric credential');
      }

      // Convert credential ID to base64 for storage
      const credentialIdBase64 = btoa(String.fromCharCode(...new Uint8Array(credential.rawId)));
      
      // Store a simple fingerprint enrollment record
      const response = await fetch(`${API_BASE_URL}/students/enroll-fingerprint`, {
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

      if (!response.ok) {
        throw new Error(result.error || 'Failed to enroll fingerprint');
      }

      console.log('Fingerprint enrolled successfully:', result);
      setSuccess(true);
      
      // Call the completion callback
      if (onEnrollmentComplete) {
        onEnrollmentComplete({
          success: true,
          message: 'Fingerprint enrolled successfully!',
          studentId,
        });
      }

    } catch (error) {
      console.error('Fingerprint enrollment error:', error);
      let errorMessage = 'Failed to enroll fingerprint';
      
      if (error.name === 'NotSupportedError') {
        errorMessage = 'Biometric authentication is not supported on this device';
      } else if (error.name === 'NotAllowedError') {
        errorMessage = 'Biometric enrollment was cancelled or denied';
      } else if (error.name === 'InvalidStateError') {
        errorMessage = 'Biometric authentication is already set up for this device';
      } else if (error.name === 'SecurityError') {
        errorMessage = 'Security error occurred during biometric setup';
      } else if (error.message) {
        errorMessage = error.message;
      }
      
      setError(errorMessage);
    } finally {
      setIsEnrolling(false);
    }
  };

  const handleCancel = () => {
    if (onCancel) {
      onCancel();
    }
  };

  return (
    <div className="fingerprint-enrollment">
      <div className="bg-white rounded-lg shadow-md p-6 max-w-md mx-auto">
        <div className="text-center mb-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">
            Enroll Fingerprint
          </h3>
          <p className="text-sm text-gray-600 mb-6">
            Student ID: <span className="font-medium">{studentId}</span>
          </p>
          
          {/* Visual Fingerprint Scanner */}
          <FingerprintScanner 
            isScanning={isEnrolling}
            showSuccess={success}
            showError={!!error}
          />
        </div>

        {error && (
          <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-md">
            <div className="flex">
              <svg className="w-5 h-5 text-red-400 mr-2 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <p className="text-sm text-red-700">{error}</p>
            </div>
          </div>
        )}

        {success && (
          <div className="mb-4 p-3 bg-green-50 border border-green-200 rounded-md">
            <div className="flex">
              <svg className="w-5 h-5 text-green-400 mr-2 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
              <p className="text-sm text-green-700">Fingerprint enrolled successfully!</p>
            </div>
          </div>
        )}

        <div className="space-y-4">
          <div className="text-sm text-gray-600">
            <p className="mb-2">To enroll your fingerprint:</p>
            <ol className="list-decimal list-inside space-y-1 text-xs">
              <li>Click the "Enroll Fingerprint" button below</li>
              <li>Follow your device's prompts to scan your fingerprint</li>
              <li>Complete the enrollment process</li>
            </ol>
          </div>

          <div className="flex space-x-3">
            <button
              onClick={handleFingerprintEnrollment}
              disabled={isEnrolling || success}
              className={`flex-1 py-2 px-4 rounded-md text-sm font-medium transition-colors ${
                isEnrolling || success
                  ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
                  : 'bg-blue-600 text-white hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2'
              }`}
            >
              {isEnrolling ? (
                <div className="flex items-center justify-center">
                  <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  Enrolling...
                </div>
              ) : success ? (
                'Enrolled Successfully'
              ) : (
                'Enroll Fingerprint'
              )}
            </button>
            
            <button
              onClick={handleCancel}
              disabled={isEnrolling}
              className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-200 rounded-md hover:bg-gray-300 focus:outline-none focus:ring-2 focus:ring-gray-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Cancel
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default FingerprintEnrollment;