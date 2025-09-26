import React, { useState } from 'react';
import SimpleBiometricAuth from '../components/SimpleBiometricAuth';

const FingerprintEnrollmentPage = () => {
  const [studentId, setStudentId] = useState('');
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
      // Check if student exists
      const response = await fetch(`http://localhost:5000/api/students/${studentId}`);
      
      if (!response.ok) {
        if (response.status === 404) {
          throw new Error('Student not found. Please check the student ID.');
        }
        throw new Error('Failed to lookup student');
      }
      
      const student = await response.json();
      setShowEnrollment(true);
      setEnrollmentResult({ student });
    } catch (error) {
      console.error('Student lookup error:', error);
      setError(error.message);
    } finally {
      setLoading(false);
    }
  };

  const handleEnrollmentComplete = (result) => {
    if (result.success) {
      setShowEnrollment(false);
      setStudentId('');
      setEnrollmentResult(null);
      // Show success message
      alert('Fingerprint enrolled successfully!');
    }
  };

  const handleReset = () => {
    setStudentId('');
    setShowEnrollment(false);
    setEnrollmentResult(null);
    setError('');
  };

  return (
    <div className="min-h-screen" style={{ backgroundColor: 'var(--bg-secondary)' }}>
      <div className="container mx-auto px-4 py-8">
        {/* Header */}
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold mb-4" style={{ color: 'var(--text-primary)' }}>
            Fingerprint Enrollment
          </h1>
          <p className="text-lg" style={{ color: 'var(--text-secondary)' }}>
            Enroll fingerprints for existing students to enable biometric attendance
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
                <h3 className="text-xl font-semibold mb-2" style={{ color: 'var(--text-primary)' }}>
                  Student Lookup
                </h3>
                <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>
                  Enter the student ID to enroll their fingerprint
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
                    onChange={(e) => setStudentId(e.target.value)}
                    onKeyPress={(e) => e.key === 'Enter' && handleStudentLookup()}
                    placeholder="Enter student ID"
                    className="w-full px-4 py-3 rounded-xl border transition-all duration-300 focus:outline-none focus:ring-2"
                    style={{
                      backgroundColor: 'var(--bg-secondary)',
                      borderColor: 'var(--border-secondary)',
                      color: 'var(--text-primary)',
                      focusRingColor: 'var(--primary-500)'
                    }}
                    disabled={loading}
                  />
                </div>

                {error && (
                  <div className="p-3 rounded-lg" style={{ backgroundColor: 'var(--error-50)' }}>
                    <div className="flex items-center">
                      <svg className="w-5 h-5 text-red-500 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                      <p className="text-sm" style={{ color: 'var(--error-700)' }}>{error}</p>
                    </div>
                  </div>
                )}

                <button
                  onClick={handleStudentLookup}
                  disabled={loading || !studentId.trim()}
                  className="w-full py-3 px-6 rounded-xl font-semibold transition-all duration-300 hover:-translate-y-1 hover:shadow-lg disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none"
                  style={{
                    backgroundColor: 'var(--primary-600)',
                    color: 'var(--bg-primary)'
                  }}
                >
                  {loading ? (
                    <div className="flex items-center justify-center">
                      <svg className="animate-spin -ml-1 mr-2 h-5 w-5" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                      </svg>
                      Looking up student...
                    </div>
                  ) : (
                    'Find Student'
                  )}
                </button>
              </div>
            </div>
          </div>
        ) : (
          /* Fingerprint Enrollment Modal */
          <div className="max-w-md mx-auto">
            <div className="rounded-3xl shadow-2xl border-0 p-8" style={{
              backgroundColor: 'var(--bg-primary)',
              border: '1px solid var(--border-primary)'
            }}>
              <div className="text-center mb-6">
                <h3 className="text-xl font-semibold mb-2" style={{ color: 'var(--text-primary)' }}>
                  Fingerprint Enrollment
                </h3>
                <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>
                  Enrolling fingerprint for {enrollmentResult?.student?.name}
                </p>
                <p className="text-xs mt-1" style={{ color: 'var(--text-tertiary)' }}>
                  Student ID: {enrollmentResult?.student?.student_id}
                </p>
              </div>
              
              <SimpleBiometricAuth
                studentId={enrollmentResult?.student?.student_id}
                onEnrollmentSuccess={handleEnrollmentComplete}
                mode="enroll"
              />
              
              <div className="mt-4 pt-4 border-t" style={{ borderColor: 'var(--border-secondary)' }}>
                <button
                  onClick={handleReset}
                  className="w-full py-2 px-4 rounded-lg text-sm font-medium transition-colors"
                  style={{
                    backgroundColor: 'var(--bg-secondary)',
                    color: 'var(--text-secondary)'
                  }}
                >
                  Enroll Another Student
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Instructions */}
        <div className="max-w-2xl mx-auto mt-12">
          <div className="rounded-2xl p-6" style={{
            backgroundColor: 'var(--bg-primary)',
            border: '1px solid var(--border-primary)'
          }}>
            <h4 className="text-lg font-semibold mb-4" style={{ color: 'var(--text-primary)' }}>
              How to Enroll Fingerprints
            </h4>
            <div className="space-y-3 text-sm" style={{ color: 'var(--text-secondary)' }}>
              <div className="flex items-start">
                <span className="flex-shrink-0 w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold mr-3" style={{
                  backgroundColor: 'var(--primary-100)',
                  color: 'var(--primary-700)'
                }}>1</span>
                <p>Enter the student ID of the student you want to enroll</p>
              </div>
              <div className="flex items-start">
                <span className="flex-shrink-0 w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold mr-3" style={{
                  backgroundColor: 'var(--primary-100)',
                  color: 'var(--primary-700)'
                }}>2</span>
                <p>Click "Find Student" to verify the student exists in the system</p>
              </div>
              <div className="flex items-start">
                <span className="flex-shrink-0 w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold mr-3" style={{
                  backgroundColor: 'var(--primary-100)',
                  color: 'var(--primary-700)'
                }}>3</span>
                <p>Follow the fingerprint enrollment process using your device's biometric authentication</p>
              </div>
              <div className="flex items-start">
                <span className="flex-shrink-0 w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold mr-3" style={{
                  backgroundColor: 'var(--primary-100)',
                  color: 'var(--primary-700)'
                }}>4</span>
                <p>Once enrolled, the student can use fingerprint verification for attendance</p>
              </div>
            </div>
            
            <div className="mt-4 p-3 rounded-lg" style={{ backgroundColor: 'var(--warning-50)' }}>
              <div className="flex items-start">
                <svg className="w-5 h-5 text-yellow-500 mr-2 mt-0.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" />
                </svg>
                <div>
                  <p className="text-sm font-medium" style={{ color: 'var(--warning-700)' }}>Requirements</p>
                  <p className="text-xs mt-1" style={{ color: 'var(--warning-600)' }}>
                    Fingerprint enrollment requires a compatible device with biometric authentication (Windows Hello, Touch ID, or external FIDO2 authenticator) and HTTPS connection.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default FingerprintEnrollmentPage;