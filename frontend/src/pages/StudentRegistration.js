import React, { useState } from 'react';
import axios from 'axios';
import FingerprintEnrollment from '../components/FingerprintEnrollment';

const API_BASE_URL = 'http://localhost:5000/api';

const StudentRegistration = () => {
  const [formData, setFormData] = useState({
    student_id: '',
    name: '',
    email: '',
    phone: ''
  });
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);
  const [error, setError] = useState(null);
  const [showFingerprintEnrollment, setShowFingerprintEnrollment] = useState(false);
  const [fingerprintEnrolled, setFingerprintEnrolled] = useState(false);

  const handleChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setResult(null);

    try {
      const response = await axios.post(`${API_BASE_URL}/students/register`, formData);
      setResult(response.data);
      
      // Reset form
      setFormData({
        student_id: '',
        name: '',
        email: '',
        phone: ''
      });
    } catch (error) {
      console.error('Registration error:', error);
      if (error.response?.data?.error) {
        setError(error.response.data.error);
      } else if (error.response?.data?.errors) {
        setError(error.response.data.errors.map(err => err.msg).join(', '));
      } else {
        setError('Failed to register student');
      }
    } finally {
      setLoading(false);
    }
  };

  const downloadQRCode = () => {
    if (result?.student?.qr_code) {
      const link = document.createElement('a');
      link.href = result.student.qr_code;
      link.download = `${result.student.student_id}_qr_code.png`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    }
  };

  const printQRCode = () => {
    if (result?.student?.qr_code) {
      const printWindow = window.open('', '_blank');
      printWindow.document.write(`
        <html>
          <head>
            <title>QR Code - ${result.student.name}</title>
            <style>
              body { 
                font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; 
                text-align: center; 
                padding: 40px;
                background: #f8fafc;
              }
              .qr-container { 
                background: white;
                border: 2px solid #e2e8f0; 
                border-radius: 12px;
                padding: 30px; 
                display: inline-block; 
                margin: 20px;
                box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
              }
              img { 
                max-width: 250px; 
                height: auto;
                border-radius: 8px;
              }
              .student-info {
                margin-top: 20px;
                font-size: 16px;
                color: #334155;
              }
              h2 {
                color: #1e293b;
                margin-bottom: 20px;
              }
            </style>
          </head>
          <body>
            <div class="qr-container">
              <h2>Student QR Code</h2>
              <img src="${result.student.qr_code}" alt="QR Code" />
              <div class="student-info">
                <p><strong>Student ID:</strong> ${result.student.student_id}</p>
                <p><strong>Name:</strong> ${result.student.name}</p>
                <p><strong>Email:</strong> ${result.student.email}</p>
              </div>
            </div>
          </body>
        </html>
      `);
      printWindow.document.close();
      printWindow.print();
    }
  };

  const handleFingerprintEnrollment = () => {
    setShowFingerprintEnrollment(true);
  };

  const handleFingerprintEnrollmentComplete = (enrollmentResult) => {
    if (enrollmentResult.success) {
      setFingerprintEnrolled(true);
      setShowFingerprintEnrollment(false);
    }
  };

  const handleFingerprintEnrollmentCancel = () => {
    setShowFingerprintEnrollment(false);
  };

  return (
    <div className="min-h-screen py-12 theme-transition animate-fade-in" style={{
      background: 'linear-gradient(135deg, var(--bg-secondary), var(--primary-50))'
    }}>
      <div className="container mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header Section */}
        <div className="card mb-8 relative overflow-hidden animate-fade-in-up theme-transition" style={{
          background: 'linear-gradient(135deg, var(--primary-600), var(--primary-800))',
          color: 'var(--bg-primary)'
        }}>
          <div className="absolute top-0 right-0 w-32 h-32 rounded-full transform translate-x-16 -translate-y-16" style={{
            backgroundColor: 'rgba(255, 255, 255, 0.1)'
          }}></div>
          <div className="relative z-10 text-center py-12">
            <div className="flex items-center justify-center mb-6 animate-scale-in">
              <div className="w-20 h-20 rounded-full flex items-center justify-center mr-6" style={{
                backgroundColor: 'rgba(255, 255, 255, 0.2)'
              }}>
                <span className="text-4xl">🎓</span>
              </div>
              <div className="text-left">
                <h1 className="text-4xl font-bold mb-2 animate-fade-in-left">Student Registration</h1>
                <p className="text-xl opacity-90 animate-fade-in-left animate-delay-100">Create student profiles and generate QR codes for attendance tracking</p>
              </div>
            </div>
          </div>
        </div>

        {/* Error Message */}
        {error && (
          <div className="border-2 rounded-xl p-6 mb-8 max-w-4xl mx-auto animate-fade-in-up theme-transition" style={{
            backgroundColor: 'var(--error-50)',
            borderColor: 'var(--error-500)'
          }}>
            <div className="flex items-center justify-center mb-4">
              <span className="text-3xl mr-3">❌</span>
              <h3 className="text-xl font-semibold" style={{ color: 'var(--error-700)' }}>Registration Failed</h3>
            </div>
            <p className="text-center" style={{ color: 'var(--error-600)' }}>{error}</p>
          </div>
        )}

        {/* Main Content - Form and QR Side by Side */}
        <div className="max-w-7xl mx-auto">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 items-start justify-center">
            {/* Registration Form */}
            <div className="w-full max-w-2xl mx-auto lg:mx-0 rounded-3xl shadow-2xl border-0 animate-fade-in-up animate-delay-200 theme-transition" style={{
              backgroundColor: 'var(--bg-primary)'
            }}>
              <div className="p-8 sm:p-12">
                <h2 className="text-3xl font-bold mb-8 text-center animate-fade-in-up animate-delay-300" style={{
                  color: 'var(--text-primary)'
                }}>
                  Registration Form
                </h2>
              
                <form onSubmit={handleSubmit} className="space-y-8">
                  <div className="animate-fade-in-up animate-delay-400">
                    <label htmlFor="student_id" className="block text-lg font-semibold mb-3" style={{
                      color: 'var(--text-primary)'
                    }}>
                      Student ID *
                    </label>
                    <input
                      type="text"
                      id="student_id"
                      name="student_id"
                      value={formData.student_id}
                      onChange={handleChange}
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
                  
                  <div className="animate-fade-in-up animate-delay-500">
                    <label htmlFor="name" className="block text-lg font-semibold mb-3" style={{
                      color: 'var(--text-primary)'
                    }}>
                      Full Name *
                    </label>
                    <input
                      type="text"
                      id="name"
                      name="name"
                      value={formData.name}
                      onChange={handleChange}
                      required
                      placeholder="e.g., John Doe"
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
                  
                  <div className="animate-fade-in-up animate-delay-600">
                    <label htmlFor="email" className="block text-lg font-semibold mb-3" style={{
                      color: 'var(--text-primary)'
                    }}>
                      Email Address *
                    </label>
                    <input
                      type="email"
                      id="email"
                      name="email"
                      value={formData.email}
                      onChange={handleChange}
                      required
                      placeholder="e.g., john.doe@email.com"
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
                  
                  <div className="animate-fade-in-up animate-delay-700">
                    <label htmlFor="phone" className="block text-lg font-semibold mb-3" style={{
                      color: 'var(--text-primary)'
                    }}>
                      Phone Number (Optional)
                    </label>
                    <input
                      type="tel"
                      id="phone"
                      name="phone"
                      value={formData.phone}
                      onChange={handleChange}
                      placeholder="e.g., +1234567890"
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
                    className="w-full text-xl font-bold py-4 px-8 rounded-xl hover:-translate-y-1 hover:shadow-xl transition-all duration-300 flex items-center justify-center space-x-3 disabled:opacity-50 animate-fade-in-up animate-delay-800 hover-lift"
                    style={{
                      background: loading ? 'var(--secondary-400)' : 'linear-gradient(135deg, var(--primary-600), var(--secondary-600))',
                      color: 'var(--bg-primary)'
                    }}
                  >
                    {loading ? (
                      <>
                        <div className="animate-spin w-5 h-5 border-2 border-t-transparent rounded-full" style={{
                          borderColor: 'var(--bg-primary)',
                          borderTopColor: 'transparent'
                        }}></div>
                        <span>Registering Student...</span>
                      </>
                    ) : (
                      <>
                        <span>👤</span>
                        <span>Register Student</span>
                      </>
                    )}
                  </button>
                </form>
              </div>
            </div>

            {/* QR Code Display */}
            <div className="w-full max-w-2xl mx-auto lg:mx-0 animate-fade-in-up animate-delay-300">
              {result ? (
                <div className="rounded-3xl shadow-2xl border-0 p-8 sm:p-12 animate-scale-in theme-transition" style={{
                  backgroundColor: 'var(--bg-primary)'
                }}>
                  <div className="text-center">
                    <div className="flex items-center justify-center mb-8 animate-bounce-in">
                      <span className="text-2xl mr-3">✅</span>
                      <h2 className="text-2xl font-semibold" style={{ color: 'var(--success-700)' }}>Registration Successful!</h2>
                    </div>
                    
                    <div className="pt-6" style={{ borderTop: '1px solid var(--border-secondary)' }}>
                      <div className="border-2 rounded-xl p-6 mb-6 animate-fade-in-up animate-delay-200" style={{
                        backgroundColor: 'var(--bg-secondary)',
                        borderColor: 'var(--primary-600)'
                      }}>
                        <span className="text-4xl mb-4 block animate-scale-in animate-delay-300">📱</span>
                        <div className="flex justify-center mb-6">
                          <img 
                            src={result.student.qr_code} 
                            alt="Student QR Code"
                            className="max-w-56 h-auto border-4 rounded-xl shadow-lg animate-scale-in animate-delay-400"
                            style={{ borderColor: 'var(--primary-600)' }}
                          />
                        </div>
                        
                        <div className="p-4 rounded-lg border text-left space-y-3 animate-fade-in-up animate-delay-500" style={{
                          backgroundColor: 'var(--bg-primary)',
                          borderColor: 'var(--border-secondary)'
                        }}>
                          <div className="flex items-center">
                            <span className="px-3 py-1 rounded-full text-sm font-semibold mr-3 min-w-16 text-center" style={{
                              backgroundColor: 'var(--primary-600)',
                              color: 'var(--bg-primary)'
                            }}>ID</span>
                            <span className="font-semibold" style={{ color: 'var(--text-primary)' }}>{result.student.student_id}</span>
                          </div>
                          <div className="flex items-center">
                            <span className="px-3 py-1 rounded-full text-sm font-semibold mr-3 min-w-16 text-center" style={{
                              backgroundColor: 'var(--primary-600)',
                              color: 'var(--bg-primary)'
                            }}>Name</span>
                            <span className="font-semibold" style={{ color: 'var(--text-primary)' }}>{result.student.name}</span>
                          </div>
                          <div className="flex items-center">
                            <span className="px-3 py-1 rounded-full text-sm font-semibold mr-3 min-w-16 text-center" style={{
                              backgroundColor: 'var(--primary-600)',
                              color: 'var(--bg-primary)'
                            }}>Email</span>
                            <span className="font-semibold" style={{ color: 'var(--text-primary)' }}>{result.student.email}</span>
                          </div>
                        </div>
                      </div>

                      <div className="space-y-4">
                        <div className="flex gap-4 justify-center animate-fade-in-up animate-delay-600">
                          <button
                            onClick={downloadQRCode}
                            className="flex items-center space-x-2 px-6 py-3 rounded-xl font-semibold transition-all duration-300 hover:-translate-y-1 hover:shadow-lg hover-lift"
                            style={{
                              backgroundColor: 'var(--success-500)',
                              color: 'var(--bg-primary)'
                            }}
                          >
                            <span>📥</span>
                            <span>Download QR</span>
                          </button>
                          <button
                            onClick={printQRCode}
                            className="flex items-center space-x-2 px-6 py-3 rounded-xl font-semibold transition-all duration-300 hover:-translate-y-1 hover:shadow-lg hover-lift"
                            style={{
                              backgroundColor: 'var(--secondary-500)',
                              color: 'var(--bg-primary)'
                            }}
                          >
                            <span>🖨️</span>
                            <span>Print QR</span>
                          </button>
                        </div>
                        
                        {/* Fingerprint Enrollment Section */}
                        <div className="pt-4 border-t animate-fade-in-up animate-delay-700" style={{ borderColor: 'var(--border-secondary)' }}>
                          <div className="text-center mb-4">
                            <h4 className="text-lg font-semibold mb-2" style={{ color: 'var(--text-primary)' }}>
                              Enhanced Security
                            </h4>
                            <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>
                              Enroll your fingerprint for faster and more secure attendance marking
                            </p>
                          </div>
                          
                          {fingerprintEnrolled ? (
                            <div className="flex items-center justify-center p-3 rounded-lg" style={{ backgroundColor: 'var(--success-50)' }}>
                              <svg className="w-5 h-5 text-green-500 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                              </svg>
                              <span className="text-sm font-medium" style={{ color: 'var(--success-700)' }}>
                                Fingerprint enrolled successfully!
                              </span>
                            </div>
                          ) : (
                            <button
                              onClick={handleFingerprintEnrollment}
                              className="flex items-center space-x-2 px-6 py-3 rounded-xl font-semibold transition-all duration-300 hover:-translate-y-1 hover:shadow-lg hover-lift mx-auto"
                              style={{
                                backgroundColor: 'var(--primary-600)',
                                color: 'var(--bg-primary)'
                              }}
                            >
                              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                              </svg>
                              <span>Enroll Fingerprint</span>
                            </button>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="rounded-3xl shadow-2xl border-0 p-8 sm:p-12 theme-transition" style={{
                  backgroundColor: 'var(--bg-primary)',
                  opacity: 0.6
                }}>
                  <div className="text-center py-12">
                    <span className="text-6xl mb-4 block">📱</span>
                    <h3 className="text-xl font-semibold mb-2" style={{ color: 'var(--text-primary)' }}>QR Code Preview</h3>
                    <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>Complete the registration form to generate the student's QR code</p>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Instructions */}
        <div className="w-full mt-8 animate-fade-in-up animate-delay-300 theme-transition">
          <div className="card mx-auto px-4 sm:px-6 lg:px-8" style={{
            backgroundColor: 'var(--bg-primary)'
          }}>
            <div className="flex items-center justify-center mb-8 animate-fade-in-left">
              <span className="text-2xl mr-3">ℹ️</span>
              <h2 className="text-2xl font-semibold" style={{ color: 'var(--text-primary)' }}>How It Works</h2>
            </div>
            
            <div className="pt-8" style={{ borderTop: '1px solid var(--border-secondary)' }}>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8 max-w-7xl mx-auto">
              <div className="text-center p-4 animate-fade-in-up animate-delay-400 hover-lift">
                <div className="w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4" style={{
                  background: 'linear-gradient(135deg, var(--primary-600), var(--primary-800))'
                }}>
                  <span className="text-xl font-bold" style={{ color: 'var(--bg-primary)' }}>1</span>
                </div>
                <h3 className="text-lg font-semibold mb-2" style={{ color: 'var(--text-primary)' }}>Fill Information</h3>
                <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>
                  Enter student details in the registration form
                </p>
              </div>
              
              <div className="text-center p-4 animate-fade-in-up animate-delay-500 hover-lift">
                <div className="w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4" style={{
                  background: 'linear-gradient(135deg, var(--success-500), var(--success-700))'
                }}>
                  <span className="text-xl font-bold" style={{ color: 'var(--bg-primary)' }}>2</span>
                </div>
                <h3 className="text-lg font-semibold mb-2" style={{ color: 'var(--text-primary)' }}>Generate QR Code</h3>
                <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>
                  System creates a unique QR code for the student
                </p>
              </div>
              
              <div className="text-center p-4 animate-fade-in-up animate-delay-600 hover-lift">
                <div className="w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4" style={{
                  background: 'linear-gradient(135deg, var(--warning-500), var(--warning-600))'
                }}>
                  <span className="text-xl font-bold" style={{ color: 'var(--bg-primary)' }}>3</span>
                </div>
                <h3 className="text-lg font-semibold mb-2" style={{ color: 'var(--text-primary)' }}>Download & Print</h3>
                <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>
                  Save or print the QR code for distribution
                </p>
              </div>
              
              <div className="text-center p-4 animate-fade-in-up animate-delay-700 hover-lift">
                <div className="w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4" style={{
                  background: 'linear-gradient(135deg, var(--secondary-500), var(--secondary-700))'
                }}>
                  <span className="text-xl font-bold" style={{ color: 'var(--bg-primary)' }}>4</span>
                </div>
                <h3 className="text-lg font-semibold mb-2" style={{ color: 'var(--text-primary)' }}>Track Attendance</h3>
                <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>
                  Students scan QR codes to mark attendance
                </p>
              </div>
              </div>
            </div>
          </div>
        </div>
      </div>
      
      {/* Fingerprint Enrollment Modal */}
      {showFingerprintEnrollment && result && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-2xl p-6 max-w-md w-full mx-4 shadow-2xl">
            <div className="text-center mb-4">
              <h3 className="text-xl font-bold text-gray-800 mb-2">
                Fingerprint Enrollment
              </h3>
              <p className="text-sm text-gray-600">
                Enrolling fingerprint for {result.student.name}
              </p>
            </div>
            
            <FingerprintEnrollment
              studentId={result.student.student_id}
              onEnrollmentComplete={handleFingerprintEnrollmentComplete}
              onCancel={handleFingerprintEnrollmentCancel}
            />
          </div>
        </div>
      )}
    </div>
  );
};

export default StudentRegistration;