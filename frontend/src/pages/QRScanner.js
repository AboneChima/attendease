import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Html5QrcodeScanner, Html5Qrcode } from 'html5-qrcode';
import axios from 'axios';
import FaceVerification from '../components/FaceVerification';
import BiometricAttendance from '../components/BiometricAttendance';
import PinFallback from '../components/PinFallback';
import API_BASE_URL from '../config/api';

const QRScanner = () => {
  const [scanning, setScanning] = useState(false);
  const [result, setResult] = useState(null);
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(false);
  const [attendanceMethod, setAttendanceMethod] = useState('qr'); // 'qr', 'face', 'fingerprint', or 'pin'
  const html5QrcodeScannerRef = useRef(null);

  const stopScanner = useCallback(() => {
    if (html5QrcodeScannerRef.current) {
      html5QrcodeScannerRef.current.clear().then(() => {
        html5QrcodeScannerRef.current = null;
        setScanning(false);
      }).catch(error => {
        console.error("Failed to clear scanner", error);
        html5QrcodeScannerRef.current = null;
        setScanning(false);
      });
    } else {
      setScanning(false);
    }
  }, []);

  const processQRCode = useCallback(async (decodedText) => {
    try {
      // Verify QR code with backend
      const verifyResponse = await axios.post(`${API_BASE_URL}/students/verify-qr`, {
        qr_data: decodedText
      });

      if (verifyResponse.data.valid) {
        // Record attendance
        const attendanceResponse = await axios.post(`${API_BASE_URL}/attendance/record`, {
          student_id: verifyResponse.data.student.student_id
        });

        setResult({
          success: true,
          student: verifyResponse.data.student,
          attendance: attendanceResponse.data.attendance,
          message: attendanceResponse.data.message
        });
      } else {
        setError('Invalid QR code');
      }
    } catch (error) {
      console.error('QR processing error:', error);
      if (error.response?.data?.error) {
        setError(error.response.data.error);
      } else {
        setError('Failed to process QR code');
      }
    }
  }, []);

  const onScanSuccess = useCallback(async (decodedText, decodedResult) => {
    setLoading(true);
    
    try {
      // Stop scanner first
      stopScanner();
      
      // Process the scanned QR code
      await processQRCode(decodedText);
    } catch (error) {
      console.error('Scan error:', error);
      setError('Failed to process QR code');
    } finally {
      setLoading(false);
    }
  }, [stopScanner, processQRCode]);

  const onScanFailure = useCallback((error) => {
    // Handle scan failure silently - this is called frequently during scanning
    console.warn(`QR scan error: ${error}`);
  }, []);

  const startScanner = useCallback(() => {
    setScanning(true);
    setResult(null);
    setError(null);
  }, []);

  // Initialize scanner after DOM element is available
  useEffect(() => {
    if (scanning && !html5QrcodeScannerRef.current) {
      const config = {
        fps: 10,
        qrbox: { width: 250, height: 250 },
        aspectRatio: 1.0,
      };

      // Small delay to ensure DOM element is rendered
      setTimeout(() => {
        const element = document.getElementById('qr-reader');
        if (element) {
          html5QrcodeScannerRef.current = new Html5QrcodeScanner(
            "qr-reader",
            config,
            false
          );
          html5QrcodeScannerRef.current.render(onScanSuccess, onScanFailure);
        }
      }, 100);
    }
  }, [scanning, onScanSuccess, onScanFailure]);

  const handleFileUpload = useCallback(async (event) => {
    const file = event.target.files[0];
    if (!file) return;

    // Validate file type
    if (!file.type.startsWith('image/')) {
      setError('Please select a valid image file (JPG, PNG, GIF, etc.).');
      event.target.value = '';
      return;
    }

    // Validate file size (max 10MB)
    if (file.size > 10 * 1024 * 1024) {
      setError('Image file is too large. Please select an image smaller than 10MB.');
      event.target.value = '';
      return;
    }

    setLoading(true);
    setError(null);
    setResult(null);

    try {
      const html5QrCode = new Html5Qrcode("qr-file-reader");
      const qrCodeMessage = await html5QrCode.scanFile(file, true);
      
      // Process the scanned QR code
      await processQRCode(qrCodeMessage);
      
    } catch (error) {
      console.error('File scan error:', error);
      let errorMessage = 'Failed to scan QR code from file.';
      
      if (error.message && error.message.includes('QR code parse error')) {
        errorMessage = 'No QR code found in the image. Please select an image that contains a clear QR code.';
      } else if (error.message && error.message.includes('Unable to load image')) {
        errorMessage = 'Unable to load the selected image. Please try a different image file.';
      } else {
        errorMessage = 'Failed to scan QR code from file. Please ensure the image contains a valid QR code.';
      }
      
      setError(errorMessage);
    } finally {
      setLoading(false);
      // Reset file input
      event.target.value = '';
    }
  }, [processQRCode]);

  const handleFaceVerificationSuccess = useCallback(async (student) => {
    try {
      setLoading(true);
      
      // Record attendance for face verification
      const attendanceResponse = await axios.post(`${API_BASE_URL}/attendance/record`, {
        student_id: student.student_id
      });

      setResult({
        success: true,
        student: student,
        attendance: attendanceResponse.data.attendance,
        message: attendanceResponse.data.message
      });
    } catch (error) {
      console.error('Face verification attendance error:', error);
      if (error.response?.data?.error) {
        setError(error.response.data.error);
      } else {
        setError('Failed to record attendance');
      }
    } finally {
      setLoading(false);
    }
  }, []);

  const handleFaceVerificationError = useCallback((errorMessage) => {
    setError(errorMessage);
  }, []);

  useEffect(() => {
    return () => {
      // Cleanup scanner on component unmount
      if (html5QrcodeScannerRef.current) {
        html5QrcodeScannerRef.current.clear().catch(console.error);
      }
    };
  }, []);

  const resetScanner = useCallback(() => {
    setResult(null);
    setError(null);
    setLoading(false);
  }, []);

  return (
    <div className="page-layout min-h-screen theme-transition animate-fade-in" style={{
      backgroundColor: 'var(--bg-secondary)'
    }}>
      <div className="container-fluid py-8">
        {/* Header */}
        <div className="card mb-8 relative overflow-hidden animate-fade-in-up theme-transition" style={{
          background: 'linear-gradient(135deg, var(--primary-600), var(--primary-800))',
          color: 'white',
          borderColor: 'var(--border-primary)'
        }}>
          <div className="absolute top-0 right-0 w-32 h-32 rounded-full transform translate-x-16 -translate-y-16" style={{
            backgroundColor: 'rgba(255, 255, 255, 0.1)'
          }}></div>
          <div className="relative z-10 text-center py-12">
            <div className="w-20 h-20 rounded-full flex items-center justify-center mx-auto mb-6 animate-bounce-in" style={{
              backgroundColor: 'rgba(255, 255, 255, 0.2)'
            }}>
              <span className="text-4xl">📱</span>
            </div>
            <h1 className="text-4xl font-bold mb-4 animate-fade-in-up animate-delay-100">Attendance Scanner</h1>
            <p className="text-xl opacity-90 max-w-2xl mx-auto animate-fade-in-up animate-delay-200">
              Mark attendance using QR code scanning or face verification for quick and secure check-ins
            </p>
          </div>
        </div>

        {/* Method Selection */}
        <div className="card mb-8 animate-fade-in-up animate-delay-300 theme-transition" style={{
          backgroundColor: 'var(--bg-primary)',
          borderColor: 'var(--border-primary)'
        }}>
          <div className="text-center mb-6">
            <h2 className="text-2xl font-semibold mb-4" style={{ color: 'var(--text-primary)' }}>
              Choose Attendance Method
            </h2>
            <div className="flex flex-wrap gap-4 justify-center">
              <button
                onClick={() => {
                  setAttendanceMethod('qr');
                  setResult(null);
                  setError(null);
                  if (scanning) stopScanner();
                }}
                className={`px-6 py-3 rounded-lg font-medium transition-all duration-300 flex items-center space-x-2 ${
                  attendanceMethod === 'qr' 
                    ? 'bg-primary-600 text-white shadow-lg' 
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                <span className="text-xl">📱</span>
                <span>QR Code</span>
              </button>
              <button
                onClick={() => {
                  setAttendanceMethod('face');
                  setResult(null);
                  setError(null);
                  if (scanning) stopScanner();
                }}
                className={`px-6 py-3 rounded-lg font-medium transition-all duration-300 flex items-center space-x-2 ${
                  attendanceMethod === 'face' 
                    ? 'bg-primary-600 text-white shadow-lg' 
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                <span className="text-xl">👤</span>
                <span>Face Verification</span>
              </button>
              <button
                onClick={() => {
                  setAttendanceMethod('fingerprint');
                  setResult(null);
                  setError(null);
                  if (scanning) stopScanner();
                }}
                className={`px-6 py-3 rounded-lg font-medium transition-all duration-300 flex items-center space-x-2 ${
                  attendanceMethod === 'fingerprint' 
                    ? 'bg-primary-600 text-white shadow-lg' 
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                </svg>
                <span>Fingerprint</span>
              </button>
              <button
                onClick={() => {
                  setAttendanceMethod('pin');
                  setResult(null);
                  setError(null);
                  if (scanning) stopScanner();
                }}
                className={`px-6 py-3 rounded-lg font-medium transition-all duration-300 flex items-center space-x-2 ${
                  attendanceMethod === 'pin' 
                    ? 'bg-primary-600 text-white shadow-lg' 
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                <span className="text-xl">🔢</span>
                <span>PIN</span>
              </button>
            </div>
          </div>
        </div>

        <div className="card text-center animate-fade-in-up animate-delay-400 theme-transition" style={{
          backgroundColor: 'var(--bg-primary)',
          borderColor: 'var(--border-primary)',
          color: 'var(--text-primary)'
        }}>
          {attendanceMethod === 'qr' ? (
            <>
              {/* QR Scanner Controls */}
              <div className="mb-8">
                {!scanning && !loading && (
                  <div className="flex gap-4 justify-center flex-wrap">
                    <button
                      onClick={startScanner}
                      className="btn-primary flex items-center space-x-2 text-lg px-8 py-4 hover-lift animate-fade-in-left animate-delay-500 theme-transition"
                  style={{
                    backgroundColor: 'var(--primary-600)',
                    color: '#ffffff',
                    borderColor: 'var(--primary-600)'
                  }}
                  onMouseEnter={(e) => {
                    e.target.style.backgroundColor = 'var(--primary-700)';
                    e.target.style.borderColor = 'var(--primary-700)';
                  }}
                  onMouseLeave={(e) => {
                    e.target.style.backgroundColor = 'var(--primary-600)';
                    e.target.style.borderColor = 'var(--primary-600)';
                  }}
                >
                  <span>▶️</span>
                  <span>Start Camera</span>
                </button>
                
                <label className="btn-secondary flex items-center space-x-2 text-lg px-8 py-4 cursor-pointer hover-lift animate-fade-in-right animate-delay-500 theme-transition border-2 rounded-xl font-bold transition-all duration-300 focus:outline-none" style={{
                  backgroundColor: '#f3f4f6',
                  color: '#1f2937',
                  borderColor: '#d1d5db',
                  outline: 'none'
                }}
                onMouseEnter={(e) => {
                  e.target.style.backgroundColor = '#e5e7eb';
                  e.target.style.borderColor = '#9ca3af';
                  e.target.style.transform = 'translateY(-2px) scale(1.02)';
                }}
                onMouseLeave={(e) => {
                  e.target.style.backgroundColor = '#f3f4f6';
                  e.target.style.borderColor = '#d1d5db';
                  e.target.style.transform = 'translateY(0) scale(1)';
                }}>
                  <span>📁</span>
                  <span>Upload Image</span>
                  <input
                    type="file"
                    className="hidden"
                    accept="image/*"
                    onChange={handleFileUpload}
                  />
                </label>
              </div>
            )}

            {scanning && (
              <button
                onClick={stopScanner}
                className="btn-danger flex items-center space-x-2 text-lg px-8 py-4 hover-lift animate-scale-in theme-transition"
                style={{
                  backgroundColor: 'var(--error-600)',
                  color: '#ffffff',
                  borderColor: 'var(--error-600)'
                }}
                onMouseEnter={(e) => {
                  e.target.style.backgroundColor = 'var(--error-700)';
                  e.target.style.borderColor = 'var(--error-700)';
                }}
                onMouseLeave={(e) => {
                  e.target.style.backgroundColor = 'var(--error-600)';
                  e.target.style.borderColor = 'var(--error-600)';
                }}
              >
                <span>⏹️</span>
                <span>Stop Scanner</span>
              </button>
            )}

            {(result || error) && (
              <button
                onClick={() => {
                  resetScanner();
                  startScanner();
                }}
                className="btn-secondary flex items-center space-x-2 text-lg px-8 py-4 mt-4 hover-lift animate-fade-in-up theme-transition"
                style={{
                  backgroundColor: '#f3f4f6',
                  color: '#1f2937',
                  borderColor: '#d1d5db'
                }}
                onMouseEnter={(e) => {
                  e.target.style.backgroundColor = '#e5e7eb';
                  e.target.style.borderColor = '#9ca3af';
                }}
                onMouseLeave={(e) => {
                  e.target.style.backgroundColor = '#f3f4f6';
                  e.target.style.borderColor = '#d1d5db';
                }}
              >
                <span>🔄</span>
                <span>Scan Another</span>
              </button>
            )}
          </div>

          {/* Loading Indicator */}
          {loading && (
            <div className="rounded-xl p-8 mb-8 max-w-md mx-auto animate-fade-in-up animate-scale-in theme-transition" style={{
              backgroundColor: 'var(--primary-50)',
              borderColor: 'var(--primary-200)',
              border: '1px solid'
            }}>
              <div className="animate-spin w-12 h-12 border-4 rounded-full mx-auto mb-4" style={{
                borderColor: 'var(--primary-200)',
                borderTopColor: 'transparent'
              }}></div>
              <h3 className="text-xl font-semibold mb-2 animate-fade-in-up animate-delay-100" style={{
                color: 'var(--text-primary)'
              }}>Processing QR code...</h3>
              <p className="animate-fade-in-up animate-delay-200" style={{
                color: 'var(--text-secondary)'
              }}>Please wait while we verify the student information</p>
            </div>
          )}

          {/* Scanner Container */}
          {scanning && (
            <div className="border-2 rounded-xl p-6 mb-8 max-w-2xl mx-auto animate-fade-in-up animate-scale-in theme-transition" style={{
              backgroundColor: 'var(--bg-secondary)',
              borderColor: 'var(--primary-600)'
            }}>
              <h3 className="text-xl font-semibold mb-4 flex items-center justify-center animate-fade-in-up animate-delay-100" style={{
                color: 'var(--text-primary)'
              }}>
                <span className="mr-2">📱</span>
                Point your camera at the QR code
              </h3>
              <div id="qr-reader" className="w-full animate-fade-in-up animate-delay-200"></div>
            </div>
          )}

          {/* Hidden div for file scanning */}
          <div id="qr-file-reader" className="hidden"></div>

          {/* Scanner Area Placeholder */}
          {!scanning && !loading && !result && !error && (
            <div className="w-full max-w-2xl h-96 mx-auto mb-8 border-4 border-dashed rounded-3xl flex items-center justify-center relative overflow-hidden animate-fade-in-up animate-delay-600 hover-lift theme-transition" style={{
              borderColor: 'var(--primary-600)',
              backgroundColor: 'var(--bg-secondary)'
            }}>
              <div className="absolute top-0 right-0 w-24 h-24 rounded-full transform translate-x-12 -translate-y-12" style={{
                backgroundColor: 'var(--primary-100)'
              }}></div>
              <div className="text-center relative z-10">
                <span className="text-6xl mb-4 block animate-bounce-in animate-delay-700">📱</span>
                <h3 className="text-2xl font-semibold mb-2 animate-fade-in-up animate-delay-800" style={{
                  color: 'var(--text-primary)'
                }}>Ready to Scan</h3>
                <p className="animate-fade-in-up animate-delay-900" style={{
                  color: 'var(--text-secondary)'
                }}>Click "Start Scanner" to activate the camera</p>
              </div>
            </div>
          )}

          {/* Success Result */}
          {result && result.success && (
            <div className="card border-2 mb-8 max-w-4xl mx-auto animate-fade-in-up animate-scale-in theme-transition" style={{
              backgroundColor: 'var(--success-50)',
              borderColor: 'var(--success-500)'
            }}>
              <div className="flex items-center justify-center mb-6">
                <div className="w-16 h-16 rounded-full flex items-center justify-center mr-4 animate-bounce-in" style={{
                  backgroundColor: 'var(--success-500)'
                }}>
                  <span className="text-white text-2xl">✅</span>
                </div>
                <h2 className="text-3xl font-bold animate-fade-in-left animate-delay-100" style={{
                  color: 'var(--success-700)'
                }}>Success!</h2>
              </div>
              
              <h3 className="text-xl mb-6 text-center animate-fade-in-up animate-delay-200" style={{
                color: 'var(--success-700)'
              }}>Attendance recorded successfully</h3>
              
              <div className="pt-6" style={{
                borderTop: '1px solid var(--success-200)'
              }}>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 max-w-2xl mx-auto">
                  <div className="flex items-center animate-fade-in-left animate-delay-300">
                    <span className="text-2xl mr-3">🆔</span>
                    <div>
                      <p className="text-sm" style={{
                        color: 'var(--text-secondary)'
                      }}>Student ID</p>
                      <p className="text-lg font-semibold" style={{
                        color: 'var(--text-primary)'
                      }}>{result.student.student_id}</p>
                    </div>
                  </div>
                  
                  <div className="flex items-center animate-fade-in-right animate-delay-400">
                    <span className="text-2xl mr-3">👤</span>
                    <div>
                      <p className="text-sm" style={{
                        color: 'var(--text-secondary)'
                      }}>Student Name</p>
                      <p className="text-lg font-semibold" style={{
                        color: 'var(--text-primary)'
                      }}>{result.student.name}</p>
                    </div>
                  </div>
                  
                  <div className="flex items-center animate-fade-in-left animate-delay-500">
                    <span className="text-2xl mr-3">📧</span>
                    <div>
                      <p className="text-sm" style={{
                        color: 'var(--text-secondary)'
                      }}>Email</p>
                      <p className="text-base" style={{
                        color: 'var(--text-primary)'
                      }}>{result.student.email}</p>
                    </div>
                  </div>
                  
                  <div className="flex items-center animate-fade-in-right animate-delay-600">
                    <span className="text-2xl mr-3">📅</span>
                    <div>
                      <p className="text-sm" style={{
                        color: 'var(--text-secondary)'
                      }}>Date</p>
                      <p className="text-base" style={{
                        color: 'var(--text-primary)'
                      }}>{result.attendance.date}</p>
                    </div>
                  </div>
                  
                  <div className="md:col-span-2 flex items-center justify-center animate-fade-in-up animate-delay-700">
                    <span className="text-2xl mr-3">⏰</span>
                    <div className="text-center">
                      <p className="text-sm" style={{
                        color: 'var(--text-secondary)'
                      }}>Time Recorded</p>
                      <p className="text-2xl font-semibold" style={{
                        color: 'var(--text-primary)'
                      }}>{result.attendance.time}</p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Error Message */}
          {error && (
            <div className="border-2 rounded-xl p-6 mb-8 max-w-2xl mx-auto animate-fade-in-up animate-scale-in theme-transition" style={{
              backgroundColor: 'var(--error-50)',
              borderColor: 'var(--error-500)'
            }}>
              <div className="flex items-center justify-center mb-4">
                <span className="text-3xl mr-3 animate-bounce-in">❌</span>
                <h3 className="text-xl font-semibold animate-fade-in-up animate-delay-100" style={{
                  color: 'var(--error-700)'
                }}>Scan Failed</h3>
              </div>
              <p className="animate-fade-in-up animate-delay-200" style={{
                color: 'var(--error-600)'
              }}>{error}</p>
            </div>
          )}

          {/* Instructions */}
          <div className="w-full animate-fade-in-up animate-delay-800 theme-transition">
            <div className="card border mx-auto px-4 sm:px-6 lg:px-8" style={{
              backgroundColor: 'var(--bg-secondary)',
              borderColor: 'var(--border-primary)'
            }}>
              <div className="flex items-center justify-center mb-8">
                <span className="text-2xl mr-3 animate-bounce-in animate-delay-900">📱</span>
                <h2 className="text-2xl font-semibold animate-fade-in-up animate-delay-1000" style={{
                  color: 'var(--text-primary)'
                }}>How to Use</h2>
              </div>
              
              <div className="pt-8" style={{
                borderTop: '1px solid var(--border-secondary)'
              }}>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-8 text-left max-w-7xl mx-auto">
                  <div className="text-center p-4 animate-fade-in-up animate-delay-1100 hover-lift">
                    <div className="w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4" style={{
                      backgroundColor: 'var(--primary-600)'
                    }}>
                      <span className="text-xl font-bold text-white">1</span>
                    </div>
                    <h3 className="text-lg font-semibold mb-2" style={{
                      color: 'var(--text-primary)'
                    }}>Start Scanner</h3>
                    <p className="text-sm" style={{
                      color: 'var(--text-secondary)'
                    }}>Click "Start Scanner" to activate the camera</p>
                  </div>
                  
                  <div className="text-center p-4 animate-fade-in-up animate-delay-1200 hover-lift">
                    <div className="w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4" style={{
                      backgroundColor: 'var(--success-600)'
                    }}>
                      <span className="text-xl font-bold text-white">2</span>
                    </div>
                    <h3 className="text-lg font-semibold mb-2" style={{
                      color: 'var(--text-primary)'
                    }}>Position QR Code</h3>
                    <p className="text-sm" style={{
                      color: 'var(--text-secondary)'
                    }}>Hold the QR code steady within the scanning frame</p>
                  </div>
                  
                  <div className="text-center p-4 animate-fade-in-up animate-delay-1300 hover-lift">
                    <div className="w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4" style={{
                      backgroundColor: 'var(--warning-600)'
                    }}>
                      <span className="text-xl font-bold text-white">3</span>
                    </div>
                    <h3 className="text-lg font-semibold mb-2" style={{
                      color: 'var(--text-primary)'
                    }}>Good Lighting</h3>
                    <p className="text-sm" style={{
                      color: 'var(--text-secondary)'
                    }}>Ensure good lighting for better scanning accuracy</p>
                  </div>
                  
                  <div className="text-center p-4 animate-fade-in-up animate-delay-1400 hover-lift">
                    <div className="w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4" style={{
                      backgroundColor: 'var(--secondary-600)'
                    }}>
                      <span className="text-xl font-bold text-white">4</span>
                    </div>
                    <h3 className="text-lg font-semibold mb-2" style={{
                      color: 'var(--text-primary)'
                    }}>Auto Detection</h3>
                    <p className="text-sm" style={{
                      color: 'var(--text-secondary)'
                    }}>The system will automatically record attendance once detected</p>
                  </div>
                  
                  <div className="text-center p-4 animate-fade-in-up animate-delay-1500 hover-lift">
                    <div className="w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4" style={{
                      backgroundColor: 'var(--error-600)'
                    }}>
                      <span className="text-xl font-bold text-white">5</span>
                    </div>
                    <h3 className="text-lg font-semibold mb-2" style={{
                      color: 'var(--text-primary)'
                    }}>One Per Day</h3>
                    <p className="text-sm" style={{
                      color: 'var(--text-secondary)'
                    }}>Each student can only be marked present once per day</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
            </>
          ) : attendanceMethod === 'face' ? (
            <>
              {/* Face Verification Section */}
              <div className="mb-8">
                <FaceVerification 
                  onVerificationSuccess={handleFaceVerificationSuccess}
                  onError={handleFaceVerificationError}
                />
              </div>
            </>
          ) : attendanceMethod === 'fingerprint' ? (
            <>
              {/* Biometric Attendance Section */}
              <div className="mb-8">
                <BiometricAttendance 
                  onAttendanceMarked={(data) => {
                    setResult({
                      success: true,
                      student: data.student,
                      attendance: {
                        time: new Date(data.timestamp).toLocaleTimeString(),
                        date: new Date(data.timestamp).toLocaleDateString()
                      },
                      message: `Attendance marked for ${data.student.name}`
                    });
                  }}
                />
              </div>
            </>
          ) : attendanceMethod === 'pin' ? (
            <>
              {/* PIN Fallback Section */}
              <div className="mb-8">
                <PinFallback 
                  onAttendanceMarked={(data) => {
                    setResult({
                      success: true,
                      student: data.student,
                      attendance: {
                        time: new Date(data.timestamp).toLocaleTimeString(),
                        date: new Date(data.timestamp).toLocaleDateString()
                      },
                      message: `Attendance marked for ${data.student.name}`
                    });
                  }}
                />
              </div>
            </>
          ) : null}

          {/* Success Result */}
          {result && result.success && (
            <div className="card border-2 mb-8 max-w-4xl mx-auto animate-fade-in-up animate-scale-in theme-transition" style={{
              backgroundColor: 'var(--success-50)',
              borderColor: 'var(--success-500)'
            }}>
              <div className="flex items-center justify-center mb-6">
                <div className="w-16 h-16 rounded-full flex items-center justify-center mr-4 animate-bounce-in" style={{
                  backgroundColor: 'var(--success-500)'
                }}>
                  <span className="text-white text-2xl">✅</span>
                </div>
                <h2 className="text-3xl font-bold animate-fade-in-left animate-delay-100" style={{
                  color: 'var(--success-700)'
                }}>Success!</h2>
              </div>
              
              <h3 className="text-xl mb-6 text-center animate-fade-in-up animate-delay-200" style={{
                color: 'var(--success-700)'
              }}>Attendance recorded successfully</h3>
              
              <div className="pt-6" style={{
                borderTop: '1px solid var(--success-200)'
              }}>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 max-w-2xl mx-auto">
                  <div className="flex items-center animate-fade-in-left animate-delay-300">
                    <span className="text-2xl mr-3">🆔</span>
                    <div>
                      <p className="text-sm" style={{
                        color: 'var(--text-secondary)'
                      }}>Student ID</p>
                      <p className="text-lg font-semibold" style={{
                        color: 'var(--text-primary)'
                      }}>{result.student.student_id}</p>
                    </div>
                  </div>
                  
                  <div className="flex items-center animate-fade-in-right animate-delay-400">
                    <span className="text-2xl mr-3">👤</span>
                    <div>
                      <p className="text-sm" style={{
                        color: 'var(--text-secondary)'
                      }}>Student Name</p>
                      <p className="text-lg font-semibold" style={{
                        color: 'var(--text-primary)'
                      }}>{result.student.name}</p>
                    </div>
                  </div>
                  
                  <div className="flex items-center animate-fade-in-left animate-delay-500">
                    <span className="text-2xl mr-3">📧</span>
                    <div>
                      <p className="text-sm" style={{
                        color: 'var(--text-secondary)'
                      }}>Email</p>
                      <p className="text-lg font-semibold" style={{
                        color: 'var(--text-primary)'
                      }}>{result.student.email}</p>
                    </div>
                  </div>
                  
                  <div className="flex items-center animate-fade-in-right animate-delay-600">
                    <span className="text-2xl mr-3">📅</span>
                    <div>
                      <p className="text-sm" style={{
                        color: 'var(--text-secondary)'
                      }}>Date</p>
                      <p className="text-lg font-semibold" style={{
                        color: 'var(--text-primary)'
                      }}>{result.attendance.date}</p>
                    </div>
                  </div>
                  
                  <div className="md:col-span-2 flex items-center justify-center animate-fade-in-up animate-delay-700">
                    <span className="text-2xl mr-3">⏰</span>
                    <div className="text-center">
                      <p className="text-sm" style={{
                        color: 'var(--text-secondary)'
                      }}>Time Recorded</p>
                      <p className="text-2xl font-semibold" style={{
                        color: 'var(--text-primary)'
                      }}>{result.attendance.time}</p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Error Result */}
          {error && (
            <div className="card border-2 mb-8 max-w-2xl mx-auto animate-fade-in-up animate-scale-in theme-transition" style={{
              backgroundColor: 'var(--error-50)',
              borderColor: 'var(--error-500)'
            }}>
              <div className="flex items-center justify-center mb-4">
                <div className="w-16 h-16 rounded-full flex items-center justify-center mr-4 animate-bounce-in" style={{
                  backgroundColor: 'var(--error-500)'
                }}>
                  <span className="text-white text-2xl">❌</span>
                </div>
                <h2 className="text-3xl font-bold animate-fade-in-left animate-delay-100" style={{
                  color: 'var(--error-700)'
                }}>Error</h2>
              </div>
              
              <p className="text-center text-lg animate-fade-in-up animate-delay-200" style={{
                color: 'var(--error-700)'
              }}>{error}</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default QRScanner;