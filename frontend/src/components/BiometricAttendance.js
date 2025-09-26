import React, { useState } from 'react';
import { Shield, User, CheckCircle, AlertCircle, Fingerprint } from 'lucide-react';

const BiometricAttendance = ({ onAttendanceMarked }) => {
  const [studentId, setStudentId] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [showBiometric, setShowBiometric] = useState(false);
  const [studentInfo, setStudentInfo] = useState(null);

  // Check if biometric authentication is supported
  const isBiometricSupported = () => {
    return (
      window.PublicKeyCredential &&
      typeof window.PublicKeyCredential.isUserVerifyingPlatformAuthenticatorAvailable === 'function'
    );
  };

  // Handle student lookup
  const handleStudentLookup = async () => {
    if (!studentId.trim()) {
      setError('Please enter a student ID');
      return;
    }

    setIsProcessing(true);
    setError('');
    setMessage('');

    try {
      // Check if student exists and has biometric enrollment
      const response = await fetch(`http://localhost:5000/api/students/${studentId}`);
      
      if (!response.ok) {
        if (response.status === 404) {
          throw new Error('Student not found. Please check the student ID.');
        }
        throw new Error('Failed to lookup student');
      }
      
      const student = await response.json();
      setStudentInfo(student);
      
      // Check if student has biometric credentials
      const credentialsResponse = await fetch(`http://localhost:5000/api/students/${studentId}/biometric-credentials`);
      
      if (credentialsResponse.ok) {
        const credentialsData = await credentialsResponse.json();
        if (credentialsData.credentials && credentialsData.credentials.length > 0) {
          setShowBiometric(true);
          setMessage('Student found! Please use your biometric authentication.');
        } else {
          throw new Error('No biometric enrollment found for this student. Please enroll first.');
        }
      } else {
        throw new Error('No biometric enrollment found for this student. Please enroll first.');
      }
    } catch (error) {
      console.error('Student lookup error:', error);
      setError(error.message);
    } finally {
      setIsProcessing(false);
    }
  };

  // Handle biometric verification for attendance
  const handleBiometricVerification = async () => {
    if (!isBiometricSupported()) {
      setError('Biometric authentication is not supported on this device.');
      return;
    }

    setIsProcessing(true);
    setError('');
    setMessage('Please use your fingerprint or face ID to mark attendance...');

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
        // Mark attendance
        const attendanceResponse = await fetch('http://localhost:5000/api/attendance/record', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            student_id: studentId,
            method: 'biometric',
            timestamp: new Date().toISOString(),
          }),
        });

        const attendanceResult = await attendanceResponse.json();

        if (attendanceResponse.ok) {
          setMessage(`✅ Attendance marked successfully for ${studentInfo.name}!`);
          if (onAttendanceMarked) {
            onAttendanceMarked({
              student: studentInfo,
              method: 'biometric',
              timestamp: new Date().toISOString(),
            });
          }
          // Reset form after success
          setTimeout(() => {
            handleReset();
          }, 2000);
        } else {
          throw new Error(attendanceResult.error || 'Failed to mark attendance');
        }
      }
    } catch (error) {
      console.error('Biometric verification error:', error);
      setError(`Verification failed: ${error.message}`);
    } finally {
      setIsProcessing(false);
    }
  };

  // Handle PIN/Password fallback
  const handlePinFallback = () => {
    setError('PIN/Password fallback is not yet implemented. Please use biometric authentication or contact administrator.');
  };

  // Reset form
  const handleReset = () => {
    setStudentId('');
    setShowBiometric(false);
    setStudentInfo(null);
    setMessage('');
    setError('');
  };

  return (
    <div className="w-full max-w-md mx-auto bg-white rounded-lg shadow-lg border border-gray-200">
      <div className="p-6 text-center border-b border-gray-200">
        <div className="mx-auto mb-4 p-3 bg-green-100 rounded-full w-fit">
          <Shield className="h-8 w-8 text-green-600" />
        </div>
        <h2 className="text-xl font-semibold text-gray-900">Biometric Attendance</h2>
        <p className="text-sm text-gray-600 mt-1">
          Use your fingerprint or face ID to mark attendance
        </p>
      </div>
      <div className="p-6 space-y-4">
        {error && (
          <div className="p-3 rounded-lg border border-red-200 bg-red-50">
            <div className="flex items-center">
              <AlertCircle className="h-4 w-4 text-red-600 mr-2" />
              <p className="text-sm text-red-700">{error}</p>
            </div>
          </div>
        )}

        {message && !error && (
          <div className="p-3 rounded-lg border border-green-200 bg-green-50">
            <div className="flex items-center">
              <CheckCircle className="h-4 w-4 text-green-600 mr-2" />
              <p className="text-sm text-green-700">{message}</p>
            </div>
          </div>
        )}

        {!showBiometric ? (
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium mb-2">Student ID</label>
              <input
                type="text"
                value={studentId}
                onChange={(e) => setStudentId(e.target.value)}
                onKeyPress={(e) => e.key === 'Enter' && handleStudentLookup()}
                placeholder="Enter your student ID"
                disabled={isProcessing}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:bg-gray-100 disabled:cursor-not-allowed"
              />
            </div>
            <button
              onClick={handleStudentLookup}
              disabled={isProcessing || !studentId.trim()}
              className="w-full py-3 px-4 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors duration-200 flex items-center justify-center"
            >
              {isProcessing ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                  Looking up...
                </>
              ) : (
                <>
                  <User className="mr-2 h-4 w-4" />
                  Find Student
                </>
              )}
            </button>
          </div>
        ) : (
          <div className="space-y-4">
            {studentInfo && (
              <div className="p-3 bg-blue-50 rounded-lg">
                <p className="font-medium text-blue-900">{studentInfo.name}</p>
                <p className="text-sm text-blue-700">ID: {studentInfo.student_id}</p>
              </div>
            )}
            
            <button
              onClick={handleBiometricVerification}
              disabled={isProcessing}
              className="w-full py-3 px-4 bg-green-600 text-white rounded-md hover:bg-green-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors duration-200 flex items-center justify-center"
            >
              {isProcessing ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                  Verifying...
                </>
              ) : (
                <>
                  <Fingerprint className="mr-2 h-4 w-4" />
                  Mark Attendance
                </>
              )}
            </button>
            
            <div className="flex space-x-2">
              <button
                onClick={handlePinFallback}
                className="flex-1 py-2 px-3 border border-gray-300 text-gray-700 rounded-md hover:bg-gray-50 transition-colors duration-200"
              >
                Use PIN
              </button>
              <button
                onClick={handleReset}
                className="flex-1 py-2 px-3 border border-gray-300 text-gray-700 rounded-md hover:bg-gray-50 transition-colors duration-200"
              >
                Reset
              </button>
            </div>
          </div>
        )}

        <div className="text-sm text-gray-600 text-center">
          <p>Secure biometric authentication</p>
          <p>Your biometric data stays on your device</p>
        </div>
      </div>
    </div>
  );
};

export default BiometricAttendance;