import React, { useState, useEffect } from 'react';
import axios from 'axios';
import EnhancedFaceEnrollment from './EnhancedFaceEnrollment';
import API_BASE_URL from '../config/api';

const StudentFaceEnrollment = () => {
  const [step, setStep] = useState('verification'); // 'verification' or 'enrollment'
  const [studentId, setStudentId] = useState('');
  const [verifiedStudent, setVerifiedStudent] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const handleStudentVerification = async (e) => {
    e.preventDefault();
    if (!studentId.trim()) {
      setError('Please enter a valid Student ID');
      return;
    }

    setLoading(true);
    setError('');

    try {
      // Fetch student details by ID
      const response = await axios.get(`${API_BASE_URL}/students/${studentId}`);
      
      if (response.data) {
        setVerifiedStudent(response.data);
        setStep('confirmation');
      }
    } catch (error) {
      if (error.response?.status === 404) {
        setError('Student not found. Please check your Student ID.');
      } else {
        setError('Failed to verify student. Please try again.');
      }
    } finally {
      setLoading(false);
    }
  };

  const confirmIdentity = () => {
    setStep('enrollment');
    setError('');
  };

  const handleFaceEnrolled = async (faceData) => {
    try {
      setLoading(true);
      
      console.log('Face enrollment completed:', faceData);
      
      if (faceData.success) {
        setSuccess(`🎉 Face enrolled successfully for ${verifiedStudent.name}! Your face data has been securely stored and is ready for verification.`);
        setStep('success');
      } else {
        setError('Face enrollment was not completed successfully. Please try again.');
      }
    } catch (error) {
      console.error('Face enrollment handler error:', error);
      setError('Failed to process face enrollment. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleError = (errorMessage) => {
    setError(errorMessage);
  };

  const resetFlow = () => {
    setStep('verification');
    setStudentId('');
    setVerifiedStudent(null);
    setError('');
    setSuccess('');
  };

  // Step 1: Student ID Verification
  if (step === 'verification') {
    return (
      <div className="min-h-screen py-12 theme-transition animate-fade-in" style={{
        background: 'linear-gradient(135deg, var(--bg-secondary), var(--primary-50))'
      }}>
        <div className="container mx-auto px-4 sm:px-6 lg:px-8">
          {/* Header */}
          <div className="card mb-8 relative overflow-hidden animate-fade-in-up theme-transition" style={{
            background: 'linear-gradient(135deg, var(--primary-600), var(--primary-800))',
            color: 'var(--bg-primary)'
          }}>
            <div className="relative z-10 text-center py-12">
              <div className="flex items-center justify-center mb-6 animate-scale-in">
                <div className="w-20 h-20 rounded-full flex items-center justify-center mr-6" style={{
                  backgroundColor: 'rgba(255, 255, 255, 0.2)'
                }}>
                  <span className="text-4xl">🔐</span>
                </div>
                <div className="text-left">
                  <h1 className="text-4xl font-bold mb-2 animate-fade-in-left">Face Enrollment</h1>
                  <p className="text-xl opacity-90 animate-fade-in-left animate-delay-100">Verify your identity to enroll your face for attendance</p>
                </div>
              </div>
            </div>
          </div>

          {/* Error Message */}
          {error && (
            <div className="border-2 rounded-xl p-6 mb-8 max-w-2xl mx-auto animate-fade-in-up theme-transition" style={{
              backgroundColor: 'var(--error-50)',
              borderColor: 'var(--error-500)'
            }}>
              <div className="flex items-center justify-center mb-4">
                <span className="text-3xl mr-3">❌</span>
                <h3 className="text-xl font-semibold" style={{ color: 'var(--error-700)' }}>Verification Failed</h3>
              </div>
              <p className="text-center" style={{ color: 'var(--error-600)' }}>{error}</p>
            </div>
          )}

          {/* Verification Form */}
          <div className="max-w-2xl mx-auto">
            <div className="card p-8 animate-fade-in-up animate-delay-200">
              <div className="text-center mb-8">
                <h2 className="text-3xl font-bold mb-4" style={{ color: 'var(--text-primary)' }}>
                  Student Verification
                </h2>
                <p style={{ color: 'var(--text-secondary)' }}>
                  Enter your Student ID to verify your identity before face enrollment
                </p>
              </div>

              <form onSubmit={handleStudentVerification} className="space-y-6">
                <div>
                  <label htmlFor="studentId" className="block text-lg font-semibold mb-3" style={{
                    color: 'var(--text-primary)'
                  }}>
                    Student ID *
                  </label>
                  <input
                    type="text"
                    id="studentId"
                    value={studentId}
                    onChange={(e) => setStudentId(e.target.value)}
                    required
                    placeholder="e.g., STU001"
                    className="w-full px-4 py-3 text-lg border-2 rounded-xl transition-all duration-300 theme-transition"
                    style={{
                      backgroundColor: 'var(--bg-primary)',
                      borderColor: 'var(--border-primary)',
                      color: 'var(--text-primary)'
                    }}
                    onFocus={(e) => {
                      e.target.style.borderColor = 'var(--primary-500)';
                      e.target.style.boxShadow = '0 0 0 4px rgba(59, 130, 246, 0.1)';
                    }}
                    onBlur={(e) => {
                      e.target.style.borderColor = 'var(--border-primary)';
                      e.target.style.boxShadow = 'none';
                    }}
                  />
                </div>

                <button
                  type="submit"
                  disabled={loading}
                  className="w-full text-xl font-bold py-4 px-8 rounded-xl hover:-translate-y-1 hover:shadow-xl transition-all duration-300 flex items-center justify-center space-x-3 disabled:opacity-50"
                  style={{
                    background: loading ? 'var(--secondary-400)' : 'linear-gradient(135deg, var(--primary-600), var(--secondary-600))',
                    color: 'var(--bg-primary)'
                  }}
                >
                  {loading ? (
                    <>
                      <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-white"></div>
                      <span>Verifying...</span>
                    </>
                  ) : (
                    <>
                      <span>🔍</span>
                      <span>Verify Identity</span>
                    </>
                  )}
                </button>
              </form>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Step 2: Identity Confirmation
  if (step === 'confirmation') {
    return (
      <div className="min-h-screen py-12 theme-transition animate-fade-in" style={{
        background: 'linear-gradient(135deg, var(--bg-secondary), var(--primary-50))'
      }}>
        <div className="container mx-auto px-4 sm:px-6 lg:px-8">
          <div className="max-w-2xl mx-auto">
            <div className="card p-8 animate-fade-in-up">
              <div className="text-center mb-8">
                <h2 className="text-3xl font-bold mb-4" style={{ color: 'var(--text-primary)' }}>
                  Confirm Your Identity
                </h2>
                <p style={{ color: 'var(--text-secondary)' }}>
                  Please confirm that this information belongs to you
                </p>
              </div>

              {/* Student Details */}
              <div className="border-2 rounded-xl p-6 mb-8" style={{
                backgroundColor: 'var(--success-50)',
                borderColor: 'var(--success-200)'
              }}>
                <div className="flex items-center justify-center mb-4">
                  <span className="text-4xl mr-3">✅</span>
                  <h3 className="text-xl font-semibold" style={{ color: 'var(--success-700)' }}>Student Found</h3>
                </div>
                
                <div className="space-y-3">
                  <div className="flex justify-between">
                    <span className="font-semibold" style={{ color: 'var(--text-primary)' }}>Student ID:</span>
                    <span style={{ color: 'var(--text-secondary)' }}>{verifiedStudent.student_id}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="font-semibold" style={{ color: 'var(--text-primary)' }}>Name:</span>
                    <span style={{ color: 'var(--text-secondary)' }}>{verifiedStudent.name}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="font-semibold" style={{ color: 'var(--text-primary)' }}>Email:</span>
                    <span style={{ color: 'var(--text-secondary)' }}>{verifiedStudent.email}</span>
                  </div>
                </div>
              </div>

              {/* Confirmation Buttons */}
              <div className="flex space-x-4">
                <button
                  onClick={() => setStep('verification')}
                  className="flex-1 py-3 px-6 rounded-xl border-2 font-semibold transition-all duration-300"
                  style={{
                    borderColor: 'var(--border-primary)',
                    color: 'var(--text-secondary)',
                    backgroundColor: 'var(--bg-primary)'
                  }}
                >
                  ← Back
                </button>
                <button
                  onClick={confirmIdentity}
                  className="flex-1 py-3 px-6 rounded-xl font-semibold transition-all duration-300"
                  style={{
                    background: 'linear-gradient(135deg, var(--success-600), var(--success-700))',
                    color: 'var(--bg-primary)'
                  }}
                >
                  Yes, This is Me →
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Step 3: Face Enrollment
  if (step === 'enrollment') {
    return (
      <div className="min-h-screen py-12 theme-transition animate-fade-in" style={{
        background: 'linear-gradient(135deg, var(--bg-secondary), var(--primary-50))'
      }}>
        <div className="container mx-auto px-4 sm:px-6 lg:px-8">
          {/* Header */}
          <div className="card mb-8 relative overflow-hidden animate-fade-in-up theme-transition" style={{
            background: 'linear-gradient(135deg, var(--success-600), var(--success-800))',
            color: 'var(--bg-primary)'
          }}>
            <div className="relative z-10 text-center py-8">
              <h1 className="text-3xl font-bold mb-2">Welcome, {verifiedStudent.name}!</h1>
              <p className="text-lg opacity-90">Now let's enroll your face for future attendance verification</p>
            </div>
          </div>

          {/* Error Message */}
          {error && (
            <div className="border-2 rounded-xl p-6 mb-8 max-w-2xl mx-auto animate-fade-in-up theme-transition" style={{
              backgroundColor: 'var(--error-50)',
              borderColor: 'var(--error-500)'
            }}>
              <div className="flex items-center justify-center mb-4">
                <span className="text-3xl mr-3">❌</span>
                <h3 className="text-xl font-semibold" style={{ color: 'var(--error-700)' }}>Enrollment Error</h3>
              </div>
              <p className="text-center" style={{ color: 'var(--error-600)' }}>{error}</p>
            </div>
          )}

          {/* Face Enrollment Component */}
          <div className="max-w-4xl mx-auto">
            <EnhancedFaceEnrollment
              studentId={verifiedStudent.student_id}
              onFaceEnrolled={handleFaceEnrolled}
              onError={handleError}
            />
          </div>

          {/* Back Button */}
          <div className="text-center mt-8">
            <button
              onClick={() => setStep('confirmation')}
              className="py-3 px-6 rounded-xl border-2 font-semibold transition-all duration-300"
              style={{
                borderColor: 'var(--border-primary)',
                color: 'var(--text-secondary)',
                backgroundColor: 'var(--bg-primary)'
              }}
            >
              ← Back to Confirmation
            </button>
          </div>
        </div>
      </div>
    );
  }

  // Step 4: Success
  if (step === 'success') {
    return (
      <div className="min-h-screen py-12 theme-transition animate-fade-in" style={{
        background: 'linear-gradient(135deg, var(--bg-secondary), var(--success-50))'
      }}>
        <div className="container mx-auto px-4 sm:px-6 lg:px-8">
          <div className="max-w-2xl mx-auto">
            <div className="card p-8 text-center animate-fade-in-up">
              <div className="mb-8">
                <div className="w-24 h-24 rounded-full mx-auto mb-6 flex items-center justify-center" style={{
                  backgroundColor: 'var(--success-100)'
                }}>
                  <span className="text-5xl">🎉</span>
                </div>
                <h2 className="text-3xl font-bold mb-4" style={{ color: 'var(--success-700)' }}>
                  Face Enrollment Successful!
                </h2>
                <p className="text-lg mb-6" style={{ color: 'var(--text-secondary)' }}>
                  {success}
                </p>
                <p style={{ color: 'var(--text-secondary)' }}>
                  You can now use face verification for attendance. Your face data has been securely stored and linked to your student profile.
                </p>
              </div>

              <div className="space-y-4">
                <button
                  onClick={resetFlow}
                  className="w-full py-3 px-6 rounded-xl font-semibold transition-all duration-300"
                  style={{
                    background: 'linear-gradient(135deg, var(--primary-600), var(--secondary-600))',
                    color: 'var(--bg-primary)'
                  }}
                >
                  Enroll Another Student
                </button>
                
                <button
                  onClick={() => window.location.href = '/'}
                  className="w-full py-3 px-6 rounded-xl border-2 font-semibold transition-all duration-300"
                  style={{
                    borderColor: 'var(--border-primary)',
                    color: 'var(--text-secondary)',
                    backgroundColor: 'var(--bg-primary)'
                  }}
                >
                  Go to Home
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return null;
};

export default StudentFaceEnrollment;