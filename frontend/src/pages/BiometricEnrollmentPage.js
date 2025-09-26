import React, { useState } from 'react';
import { Fingerprint, Eye, ArrowLeft } from 'lucide-react';
import SimpleBiometricAuth from '../components/SimpleBiometricAuth';
import EnhancedFaceEnrollment from '../components/EnhancedFaceEnrollment';

const BiometricEnrollmentPage = () => {
  const [studentId, setStudentId] = useState('');
  const [selectedMethod, setSelectedMethod] = useState(null); // 'fingerprint' or 'face'
  const [showEnrollment, setShowEnrollment] = useState(false);
  const [enrollmentResult, setEnrollmentResult] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleStudentLookup = async () => {
    if (!studentId.trim()) {
      setError('Please enter a student ID');
      return;
    }

    setLoading(true);
    setError('');

    try {
      const response = await fetch(`http://localhost:5000/api/students/${studentId}`);
      const data = await response.json();

      if (response.ok) {
        setEnrollmentResult({ student: data });
        setShowEnrollment(true);
      } else {
        setError(data.error || 'Student not found');
      }
    } catch (err) {
      setError('Failed to lookup student. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleEnrollmentSuccess = (result) => {
    console.log('Enrollment successful:', result);
    // You can add success handling here
  };

  const handleEnrollmentError = (errorMessage) => {
    setError(errorMessage);
  };

  const handleReset = () => {
    setStudentId('');
    setSelectedMethod(null);
    setShowEnrollment(false);
    setEnrollmentResult(null);
    setError('');
  };

  const handleBack = () => {
    if (selectedMethod) {
      setSelectedMethod(null);
    } else {
      setShowEnrollment(false);
      setEnrollmentResult(null);
    }
  };

  return (
    <div className="min-h-screen" style={{ backgroundColor: 'var(--bg-secondary)' }}>
      <div className="container mx-auto px-4 py-8">
        {/* Header */}
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold mb-4" style={{ color: 'var(--text-primary)' }}>
            Biometric Enrollment
          </h1>
          <p className="text-lg" style={{ color: 'var(--text-secondary)' }}>
            Enroll fingerprint or face recognition for secure attendance
          </p>
        </div>

        {!showEnrollment ? (
          /* Student Lookup Form */
          <div className="max-w-md mx-auto">
            <div className="rounded-3xl shadow-2xl border-0 p-8" style={{
              backgroundColor: 'var(--bg-primary)',
              border: '1px solid var(--border-primary)'
            }}>
              <div className="text-center mb-6">
                <div className="w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4" style={{
                  background: 'linear-gradient(135deg, var(--primary-500), var(--primary-700))'
                }}>
                  <svg className="w-8 h-8" style={{ color: 'var(--bg-primary)' }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                  </svg>
                </div>
                <h2 className="text-2xl font-bold mb-2" style={{ color: 'var(--text-primary)' }}>
                  Student Lookup
                </h2>
                <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>
                  Enter student ID to begin biometric enrollment
                </p>
              </div>

              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium mb-2" style={{ color: 'var(--text-primary)' }}>
                    Student ID
                  </label>
                  <input
                    type="text"
                    value={studentId}
                    onChange={(e) => setStudentId(e.target.value.toUpperCase())}
                    placeholder="Enter student ID (e.g., STU001)"
                    className="w-full px-4 py-3 rounded-lg border-2 text-lg font-medium transition-all duration-200 focus:outline-none focus:ring-2"
                    style={{
                      backgroundColor: 'var(--bg-secondary)',
                      borderColor: 'var(--border-secondary)',
                      color: 'var(--text-primary)',
                      focusRingColor: 'var(--primary-500)'
                    }}
                    onKeyPress={(e) => e.key === 'Enter' && handleStudentLookup()}
                  />
                </div>

                {error && (
                  <div className="p-3 rounded-lg border-2" style={{
                    backgroundColor: 'var(--error-50)',
                    borderColor: 'var(--error-200)'
                  }}>
                    <p className="text-sm font-medium" style={{ color: 'var(--error-700)' }}>
                      {error}
                    </p>
                  </div>
                )}

                <button
                  onClick={handleStudentLookup}
                  disabled={loading || !studentId.trim()}
                  className="w-full py-3 px-6 rounded-lg font-semibold text-lg transition-all duration-200 hover:scale-105 active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed"
                  style={{
                    background: 'linear-gradient(135deg, var(--primary-500), var(--primary-600))',
                    color: 'var(--bg-primary)',
                    boxShadow: '0 4px 12px rgba(59, 130, 246, 0.3)'
                  }}
                >
                  {loading ? (
                    <div className="flex items-center justify-center space-x-2">
                      <div className="animate-spin rounded-full h-5 w-5 border-2 border-white border-t-transparent"></div>
                      <span>Looking up...</span>
                    </div>
                  ) : (
                    'Find Student'
                  )}
                </button>
              </div>
            </div>
          </div>
        ) : !selectedMethod ? (
          /* Method Selection */
          <div className="max-w-4xl mx-auto">
            <div className="rounded-3xl shadow-2xl border-0 p-8" style={{
              backgroundColor: 'var(--bg-primary)',
              border: '1px solid var(--border-primary)'
            }}>
              <div className="flex items-center justify-between mb-6">
                <button
                  onClick={handleBack}
                  className="flex items-center space-x-2 px-4 py-2 rounded-lg transition-all duration-200 hover:scale-105"
                  style={{
                    backgroundColor: 'var(--bg-secondary)',
                    color: 'var(--text-primary)',
                    border: '1px solid var(--border-secondary)'
                  }}
                >
                  <ArrowLeft size={16} />
                  <span>Back</span>
                </button>
                <div className="text-center">
                  <h3 className="text-xl font-semibold" style={{ color: 'var(--text-primary)' }}>
                    Choose Enrollment Method
                  </h3>
                  <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>
                    {enrollmentResult?.student?.name} ({enrollmentResult?.student?.student_id})
                  </p>
                </div>
                <div className="w-20"></div> {/* Spacer for centering */}
              </div>

              <div className="grid md:grid-cols-2 gap-6">
                {/* Fingerprint Option */}
                <div
                  onClick={() => setSelectedMethod('fingerprint')}
                  className="p-6 rounded-2xl border-2 cursor-pointer transition-all duration-300 hover:scale-105 hover:shadow-lg"
                  style={{
                    backgroundColor: 'var(--bg-secondary)',
                    borderColor: 'var(--border-secondary)'
                  }}
                >
                  <div className="text-center">
                    <div className="w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4" style={{
                      background: 'linear-gradient(135deg, var(--primary-500), var(--primary-600))'
                    }}>
                      <Fingerprint size={32} style={{ color: 'var(--bg-primary)' }} />
                    </div>
                    <h4 className="text-xl font-bold mb-2" style={{ color: 'var(--text-primary)' }}>
                      Fingerprint
                    </h4>
                    <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>
                      Use fingerprint sensor or Windows Hello for secure authentication
                    </p>
                    <div className="mt-4 px-4 py-2 rounded-lg" style={{
                      backgroundColor: 'var(--primary-50)',
                      color: 'var(--primary-700)'
                    }}>
                      <span className="text-xs font-medium">Recommended for speed</span>
                    </div>
                  </div>
                </div>

                {/* Face Recognition Option */}
                <div
                  onClick={() => setSelectedMethod('face')}
                  className="p-6 rounded-2xl border-2 cursor-pointer transition-all duration-300 hover:scale-105 hover:shadow-lg"
                  style={{
                    backgroundColor: 'var(--bg-secondary)',
                    borderColor: 'var(--border-secondary)'
                  }}
                >
                  <div className="text-center">
                    <div className="w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4" style={{
                      background: 'linear-gradient(135deg, var(--success-500), var(--success-600))'
                    }}>
                      <Eye size={32} style={{ color: 'var(--bg-primary)' }} />
                    </div>
                    <h4 className="text-xl font-bold mb-2" style={{ color: 'var(--text-primary)' }}>
                      Face Recognition
                    </h4>
                    <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>
                      Use camera-based face recognition for contactless authentication
                    </p>
                    <div className="mt-4 px-4 py-2 rounded-lg" style={{
                      backgroundColor: 'var(--success-50)',
                      color: 'var(--success-700)'
                    }}>
                      <span className="text-xs font-medium">Contactless option</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        ) : (
          /* Enrollment Process */
          <div className="max-w-2xl mx-auto">
            <div className="rounded-3xl shadow-2xl border-0 p-8" style={{
              backgroundColor: 'var(--bg-primary)',
              border: '1px solid var(--border-primary)'
            }}>
              <div className="flex items-center justify-between mb-6">
                <button
                  onClick={handleBack}
                  className="flex items-center space-x-2 px-4 py-2 rounded-lg transition-all duration-200 hover:scale-105"
                  style={{
                    backgroundColor: 'var(--bg-secondary)',
                    color: 'var(--text-primary)',
                    border: '1px solid var(--border-secondary)'
                  }}
                >
                  <ArrowLeft size={16} />
                  <span>Back</span>
                </button>
                <div className="text-center">
                  <h3 className="text-xl font-semibold mb-2" style={{ color: 'var(--text-primary)' }}>
                    {selectedMethod === 'fingerprint' ? 'Fingerprint' : 'Face'} Enrollment
                  </h3>
                  <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>
                    {enrollmentResult?.student?.name} ({enrollmentResult?.student?.student_id})
                  </p>
                </div>
                <div className="w-20"></div> {/* Spacer for centering */}
              </div>

              {error && (
                <div className="mb-6 p-4 rounded-lg border-2" style={{
                  backgroundColor: 'var(--error-50)',
                  borderColor: 'var(--error-200)'
                }}>
                  <p className="text-sm font-medium" style={{ color: 'var(--error-700)' }}>
                    {error}
                  </p>
                </div>
              )}

              {selectedMethod === 'fingerprint' ? (
                <SimpleBiometricAuth
                  studentId={enrollmentResult?.student?.student_id}
                  mode="enroll"
                  onEnrollmentSuccess={handleEnrollmentSuccess}
                  onError={handleEnrollmentError}
                />
              ) : (
                <EnhancedFaceEnrollment
                  studentId={enrollmentResult?.student?.student_id}
                  onFaceEnrolled={handleEnrollmentSuccess}
                  onError={handleEnrollmentError}
                />
              )}

              <div className="mt-6 text-center">
                <button
                  onClick={handleReset}
                  className="px-6 py-2 rounded-lg font-medium transition-all duration-200 hover:scale-105"
                  style={{
                    backgroundColor: 'var(--bg-secondary)',
                    color: 'var(--text-secondary)',
                    border: '1px solid var(--border-secondary)'
                  }}
                >
                  Start Over
                </button>
              </div>
            </div>

            {/* Requirements Notice */}
            <div className="mt-6 p-4 rounded-lg border-2" style={{
              backgroundColor: 'var(--warning-50)',
              borderColor: 'var(--warning-200)'
            }}>
              <div className="flex items-start space-x-3">
                <svg className="w-5 h-5 mt-0.5" style={{ color: 'var(--warning-600)' }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" />
                </svg>
                <div>
                  <p className="text-sm font-medium" style={{ color: 'var(--warning-700)' }}>Requirements</p>
                  <p className="text-xs mt-1" style={{ color: 'var(--warning-600)' }}>
                    {selectedMethod === 'fingerprint'
                      ? 'Fingerprint enrollment requires a compatible device with biometric authentication (Windows Hello, Touch ID, or external FIDO2 authenticator) and HTTPS connection.'
                      : 'Face enrollment requires camera access and good lighting conditions. Multiple samples will be captured for better accuracy.'}
                  </p>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default BiometricEnrollmentPage;