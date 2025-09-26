import React from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Users,
  QrCode,
  BarChart3,
  LogIn
} from 'lucide-react';

const Home = () => {
  const navigate = useNavigate();

  return (
    <>
      {/* Hero Section */}
      <div className="min-h-screen flex items-center relative overflow-hidden w-full theme-transition" style={{
        background: `linear-gradient(135deg, 
          var(--primary-50) 0%, 
          var(--primary-100) 50%, 
          var(--bg-primary) 100%)`,
        backgroundColor: 'var(--bg-primary)'
      }}>
        {/* Animated Background Elements */}
        <div className="absolute inset-0 overflow-hidden">
          <div className="absolute -top-40 -right-40 w-80 h-80 rounded-full opacity-20 animate-pulse" style={{
            background: 'linear-gradient(45deg, var(--primary-400), var(--primary-600))'
          }}></div>
          <div className="absolute -bottom-40 -left-40 w-96 h-96 rounded-full opacity-10 animate-pulse animate-delay-1000" style={{
            background: 'linear-gradient(45deg, var(--success-400), var(--primary-500))'
          }}></div>
          <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-64 h-64 rounded-full opacity-5 animate-spin" style={{
            background: 'conic-gradient(from 0deg, var(--primary-300), var(--success-300), var(--primary-300))',
            animationDuration: '20s'
          }}></div>
        </div>
        
        <div className="w-full px-6 sm:px-8 md:px-12 lg:px-16 xl:px-20 2xl:px-24 relative z-10">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-16 lg:gap-24 xl:gap-32 items-center max-w-8xl mx-auto py-12 lg:py-16">
            <div className="text-center lg:text-left animate-fade-in-left">
              <div className="mb-6">
                <span className="inline-block px-4 py-2 rounded-full text-sm font-semibold animate-fade-in-up" style={{
                  backgroundColor: 'var(--primary-100)',
                  color: 'var(--primary-700)',
                  border: '1px solid var(--primary-200)'
                }}>
                  🏛️ Oracle Powered • Enterprise Grade
                </span>
              </div>
              <h1 className="font-extrabold text-4xl sm:text-5xl md:text-6xl lg:text-7xl leading-tight mb-8 animate-fade-in-up animate-delay-200" style={{
                fontFamily: 'system-ui, -apple-system, sans-serif',
                letterSpacing: '-0.02em'
              }}>
                <span className="block mb-2" style={{ color: 'var(--primary-700)' }}>Oracle</span>
                <span className="block mb-2" style={{ color: 'var(--primary-600)' }}>Attendance</span>
                <span className="block text-3xl sm:text-4xl md:text-5xl lg:text-6xl font-bold" style={{ color: 'var(--success-600)' }}>Revolution</span>
              </h1>
              <div className="mb-12 lg:mb-16 animate-fade-in-up animate-delay-400">
                <p className="text-lg sm:text-xl md:text-2xl leading-relaxed mb-6" style={{
                  color: 'var(--primary-700)',
                  maxWidth: '600px'
                }}>
                  Transform your attendance tracking with Oracle's cutting-edge biometric technology and intelligent automation.
                </p>
                <div className="flex flex-wrap justify-center lg:justify-start gap-4 text-base sm:text-lg font-semibold">
                  <span className="px-4 py-2 rounded-full" style={{
                    backgroundColor: 'var(--primary-50)',
                    color: 'var(--primary-700)',
                    border: '1px solid var(--primary-200)'
                  }}>⚡ Lightning-fast</span>
                  <span className="px-4 py-2 rounded-full" style={{
                    backgroundColor: 'var(--success-50)',
                    color: 'var(--success-700)',
                    border: '1px solid var(--success-200)'
                  }}>🎯 Ultra-accurate</span>
                  <span className="px-4 py-2 rounded-full" style={{
                    backgroundColor: 'var(--warning-50)',
                    color: 'var(--warning-700)',
                    border: '1px solid var(--warning-200)'
                  }}>✨ Effortlessly simple</span>
                </div>
              </div>
              <div className="flex flex-col sm:flex-row gap-4 justify-center lg:justify-start animate-fade-in-up animate-delay-600">
                <button
                  onClick={() => navigate('/register')}
                  className="group px-6 py-3 text-lg font-bold rounded-2xl shadow-lg hover:shadow-2xl transition-all duration-500 hover-lift transform hover:scale-105 focus:outline-none"
                  style={{
                    background: 'linear-gradient(135deg, var(--primary-500), var(--primary-600))',
                    color: 'white',
                    outline: 'none'
                  }}
                >
                  <span className="flex items-center justify-center gap-2">
                    <Users className="w-5 h-5" />
                    Register Student
                  </span>
                </button>
                <button
                  onClick={() => navigate('/enroll-face')}
                  className="group border-2 px-6 py-3 text-lg font-bold rounded-2xl hover:shadow-lg transition-all duration-500 hover-lift transform hover:scale-105 focus:outline-none"
                  style={{
                    borderColor: 'var(--success-500)',
                    color: 'var(--success-600)',
                    backgroundColor: 'transparent',
                    outline: 'none'
                  }}
                  onMouseEnter={(e) => {
                    e.target.style.backgroundColor = 'var(--success-500)';
                    e.target.style.color = 'white';
                  }}
                  onMouseLeave={(e) => {
                    e.target.style.backgroundColor = 'transparent';
                    e.target.style.color = 'var(--success-600)';
                  }}
                >
                  <span className="flex items-center justify-center gap-2">
                    👤
                    Enroll Face
                  </span>
                </button>
                <button
                  onClick={() => navigate('/scan')}
                  className="group border-2 px-6 py-3 text-lg font-bold rounded-2xl hover:shadow-lg transition-all duration-500 hover-lift transform hover:scale-105 focus:outline-none"
                  style={{
                    borderColor: 'var(--primary-500)',
                    color: 'var(--primary-600)',
                    backgroundColor: 'transparent',
                    outline: 'none'
                  }}
                  onMouseEnter={(e) => {
                    e.target.style.backgroundColor = 'var(--primary-500)';
                    e.target.style.color = 'white';
                  }}
                  onMouseLeave={(e) => {
                    e.target.style.backgroundColor = 'transparent';
                    e.target.style.color = 'var(--primary-600)';
                  }}
                >
                  <span className="flex items-center justify-center gap-2">
                    <QrCode className="w-5 h-5" />
                    Scan QR Code
                  </span>
                </button>
              </div>
            </div>
            <div className="flex justify-center items-center animate-fade-in-right animate-delay-300">
              <div className="relative">
                {/* Floating QR Card */}
                <div className="backdrop-blur-xl rounded-3xl p-8 shadow-2xl text-center max-w-md w-full hover-lift animate-scale-in animate-delay-500 transform hover:rotate-1 transition-all duration-700" style={{
                  backgroundColor: 'var(--bg-secondary)',
                  border: '1px solid var(--border-primary)',
                  boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.1)'
                }}>
                  <div className="relative">
                    <div className="absolute -top-2 -right-2 w-4 h-4 rounded-full animate-ping" style={{
                      backgroundColor: 'var(--success-500)'
                    }}></div>
                    <div className="absolute -top-2 -right-2 w-4 h-4 rounded-full" style={{
                      backgroundColor: 'var(--success-500)'
                    }}></div>
                    <QrCode className="w-24 h-24 mx-auto mb-6 animate-pulse" style={{
                      color: 'var(--primary-600)'
                    }} />
                  </div>
                  <h3 className="text-2xl font-bold mb-4" style={{
                    color: 'var(--text-primary)'
                  }}>
                    Instant Recognition
                  </h3>
                  <p className="mb-6 text-base leading-relaxed" style={{
                    color: 'var(--text-secondary)'
                  }}>
                    Advanced QR scanning technology with real-time processing and instant attendance logging
                  </p>
                  <div className="flex justify-center gap-2 mb-4">
                    <span className="px-3 py-1 rounded-full text-xs font-semibold" style={{
                      backgroundColor: 'var(--success-100)',
                      color: 'var(--success-700)'
                    }}>
                      ⚡ Fast
                    </span>
                    <span className="px-3 py-1 rounded-full text-xs font-semibold" style={{
                      backgroundColor: 'var(--primary-100)',
                      color: 'var(--primary-700)'
                    }}>
                      🔒 Secure
                    </span>
                    <span className="px-3 py-1 rounded-full text-xs font-semibold" style={{
                      backgroundColor: 'var(--warning-100)',
                      color: 'var(--warning-700)'
                    }}>
                      📊 Smart
                    </span>
                  </div>
                </div>
                
                {/* Floating Stats */}
                <div className="absolute -top-4 -left-4 bg-white rounded-xl p-3 shadow-lg animate-bounce animate-delay-1000" style={{
                  backgroundColor: 'var(--bg-secondary)',
                  border: '1px solid var(--border-primary)'
                }}>
                  <div className="text-center">
                    <div className="text-lg font-bold" style={{ color: 'var(--success-600)' }}>99.9%</div>
                    <div className="text-xs" style={{ color: 'var(--text-secondary)' }}>Accuracy</div>
                  </div>
                </div>
                
                <div className="absolute -bottom-4 -right-4 bg-white rounded-xl p-3 shadow-lg animate-bounce animate-delay-1500" style={{
                  backgroundColor: 'var(--bg-secondary)',
                  border: '1px solid var(--border-primary)'
                }}>
                  <div className="text-center">
                    <div className="text-lg font-bold" style={{ color: 'var(--primary-600)' }}>&lt;2s</div>
                    <div className="text-xs" style={{ color: 'var(--text-secondary)' }}>Scan Time</div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Features Section */}
      <div className="py-24 lg:py-32 theme-transition" style={{
        backgroundColor: 'var(--bg-secondary)'
      }}>
        <div className="w-full px-6 sm:px-8 md:px-12 lg:px-16 xl:px-20 2xl:px-24">
          <div className="text-center mb-24 lg:mb-32 animate-fade-in-up max-w-6xl mx-auto">
            <h2 className="font-bold text-3xl sm:text-4xl md:text-5xl mb-6" style={{
              color: 'var(--text-primary)'
            }}>
              Why Choose Our System?
            </h2>
            <p className="text-lg sm:text-xl md:text-2xl" style={{
              color: 'var(--text-secondary)'
            }}>
              Experience the future of attendance management with our comprehensive solution
            </p>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-10 lg:gap-16 xl:gap-20 max-w-7xl mx-auto">
            <div className="rounded-2xl border-3 shadow-lg hover:shadow-2xl hover:-translate-y-3 transition-all duration-300 text-center h-full hover-lift animate-fade-in-up animate-delay-100" style={{
              backgroundColor: 'var(--bg-primary)',
              borderColor: 'var(--border-primary)'
            }}>
              <div className="p-8">
                <div className="rounded-full w-24 h-24 flex items-center justify-center mx-auto mb-6 shadow-lg" style={{
                  background: 'linear-gradient(135deg, var(--success-500), var(--success-600))'
                }}>
                  <Users className="w-12 h-12" style={{ color: 'var(--bg-primary)' }} />
                </div>
                <h3 className="font-bold text-2xl mb-4" style={{
                  color: 'var(--text-primary)'
                }}>
                  Student Registration
                </h3>
                <p className="text-lg leading-relaxed mb-6" style={{
                  color: 'var(--text-secondary)'
                }}>
                  Register as a student and get your unique QR code for attendance tracking
                </p>
              </div>
              <div className="p-6 pt-0">
                <button
                  onClick={() => navigate('/register')}
                  className="w-full py-3 text-lg font-semibold rounded-xl hover:-translate-y-1 hover:shadow-lg transition-all duration-300 hover-lift"
                  style={{
                    backgroundColor: 'var(--success-500)',
                    color: 'var(--bg-primary)'
                  }}
                >
                  Register Now
                </button>
              </div>
            </div>

            <div className="rounded-2xl border-3 shadow-lg hover:shadow-2xl hover:-translate-y-3 transition-all duration-300 text-center h-full hover-lift animate-fade-in-up animate-delay-200" style={{
              backgroundColor: 'var(--bg-primary)',
              borderColor: 'var(--border-primary)'
            }}>
              <div className="p-8">
                <div className="rounded-full w-24 h-24 flex items-center justify-center mx-auto mb-6 shadow-lg" style={{
                  background: 'linear-gradient(135deg, var(--warning-500), var(--warning-600))'
                }}>
                  <QrCode className="w-12 h-12" style={{ color: 'var(--bg-primary)' }} />
                </div>
                <h3 className="font-bold text-2xl mb-4" style={{
                  color: 'var(--text-primary)'
                }}>
                  QR Code Scanner
                </h3>
                <p className="text-lg leading-relaxed mb-6" style={{
                  color: 'var(--text-secondary)'
                }}>
                  Scan student QR codes to mark attendance quickly and efficiently
                </p>
              </div>
              <div className="p-6 pt-0">
                <button
                  onClick={() => navigate('/scan')}
                  className="w-full py-3 text-lg font-semibold rounded-xl hover:-translate-y-1 hover:shadow-lg transition-all duration-300 hover-lift"
                  style={{
                    backgroundColor: 'var(--warning-500)',
                    color: 'var(--bg-primary)'
                  }}
                >
                  Start Scanning
                </button>
              </div>
            </div>

            <div className="rounded-2xl border-3 shadow-lg hover:shadow-2xl hover:-translate-y-3 transition-all duration-300 text-center h-full hover-lift animate-fade-in-up animate-delay-300" style={{
              backgroundColor: 'var(--bg-primary)',
              borderColor: 'var(--border-primary)'
            }}>
              <div className="p-8">
                <div className="rounded-full w-24 h-24 flex items-center justify-center mx-auto mb-6 shadow-lg" style={{
                  background: 'linear-gradient(135deg, var(--primary-500), var(--primary-700))'
                }}>
                  <LogIn className="w-12 h-12" style={{ color: 'var(--bg-primary)' }} />
                </div>
                <h3 className="font-bold text-2xl mb-4" style={{
                  color: 'var(--text-primary)'
                }}>
                  Teacher Dashboard
                </h3>
                <p className="text-lg leading-relaxed mb-6" style={{
                  color: 'var(--text-secondary)'
                }}>
                  Access teacher dashboard to manage attendance and view reports
                </p>
              </div>
              <div className="p-6 pt-0">
                <button
                  onClick={() => navigate('/teacher/login')}
                  className="w-full py-3 text-lg font-semibold rounded-xl hover:-translate-y-1 hover:shadow-lg transition-all duration-300 hover-lift"
                  style={{
                    backgroundColor: 'var(--primary-500)',
                    color: 'var(--bg-primary)'
                  }}
                >
                  Login
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* How it Works Section */}
      <div className="py-24 lg:py-32 theme-transition" style={{
        backgroundColor: 'var(--bg-primary)'
      }}>
        <div className="max-w-7xl mx-auto px-6 sm:px-8 md:px-12 lg:px-16 xl:px-20">
          <div className="text-center mb-24 lg:mb-32 animate-fade-in-up">
            <div className="mb-6">
              <span className="inline-block px-4 py-2 rounded-full text-sm font-semibold animate-fade-in-up" style={{
                backgroundColor: 'var(--primary-100)',
                color: 'var(--primary-700)',
                border: '1px solid var(--primary-200)'
              }}>
                ⚡ Simple Process
              </span>
            </div>
            <h2 className="font-extrabold text-4xl sm:text-5xl md:text-6xl mb-8 animate-fade-in-up animate-delay-200" style={{
              color: 'var(--text-primary)',
              letterSpacing: '-0.02em'
            }}>
              How It Works
            </h2>
            <p className="text-xl sm:text-2xl md:text-3xl max-w-4xl mx-auto leading-relaxed animate-fade-in-up animate-delay-400" style={{
              color: 'var(--text-secondary)'
            }}>
              Transform attendance tracking in just <span style={{ color: 'var(--primary-600)', fontWeight: '700' }}>4 simple steps</span> - 
              from registration to comprehensive reporting
            </p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-10 lg:gap-12 xl:gap-16">
            <div className="text-center p-6 rounded-2xl border-2 hover:-translate-y-2 hover:shadow-lg transition-all duration-300 animate-fade-in-up animate-delay-200 hover-lift" style={{
              backgroundColor: 'var(--bg-secondary)',
              borderColor: 'var(--border-primary)'
            }} onMouseEnter={(e) => {
              e.target.style.borderColor = 'var(--primary-500)';
            }} onMouseLeave={(e) => {
              e.target.style.borderColor = 'var(--border-primary)';
            }}>
              <div className="rounded-full w-16 h-16 flex items-center justify-center mx-auto mb-6 text-2xl font-bold text-white animate-scale-in animate-delay-300" style={{
                backgroundColor: 'var(--primary-500)'
              }}>
                1
              </div>
              <h3 className="font-semibold text-xl mb-4 animate-fade-in-up animate-delay-400" style={{
                color: 'var(--text-primary)'
              }}>
                Register Students
              </h3>
              <p className="leading-relaxed animate-fade-in-up animate-delay-500" style={{
                color: 'var(--text-secondary)'
              }}>
                Students register with their details and receive unique QR codes
              </p>
            </div>

            <div className="text-center p-6 rounded-2xl border-2 hover:-translate-y-2 hover:shadow-lg transition-all duration-300 animate-fade-in-up animate-delay-300 hover-lift" style={{
              backgroundColor: 'var(--bg-secondary)',
              borderColor: 'var(--border-primary)'
            }} onMouseEnter={(e) => {
              e.target.style.borderColor = 'var(--success-500)';
            }} onMouseLeave={(e) => {
              e.target.style.borderColor = 'var(--border-primary)';
            }}>
              <div className="rounded-full w-16 h-16 flex items-center justify-center mx-auto mb-6 text-2xl font-bold text-white animate-scale-in animate-delay-400" style={{
                backgroundColor: 'var(--success-500)'
              }}>
                2
              </div>
              <h3 className="font-semibold text-xl mb-4 animate-fade-in-up animate-delay-500" style={{
                color: 'var(--text-primary)'
              }}>
                Scan QR Codes
              </h3>
              <p className="leading-relaxed animate-fade-in-up animate-delay-600" style={{
                color: 'var(--text-secondary)'
              }}>
                Teachers or staff scan student QR codes using the built-in scanner
              </p>
            </div>

            <div className="text-center p-6 rounded-2xl border-2 hover:-translate-y-2 hover:shadow-lg transition-all duration-300 animate-fade-in-up animate-delay-400 hover-lift" style={{
              backgroundColor: 'var(--bg-secondary)',
              borderColor: 'var(--border-primary)'
            }} onMouseEnter={(e) => {
              e.target.style.borderColor = 'var(--warning-500)';
            }} onMouseLeave={(e) => {
              e.target.style.borderColor = 'var(--border-primary)';
            }}>
              <div className="rounded-full w-16 h-16 flex items-center justify-center mx-auto mb-6 text-2xl font-bold text-white animate-scale-in animate-delay-500" style={{
                backgroundColor: 'var(--warning-500)'
              }}>
                3
              </div>
              <h3 className="font-semibold text-xl mb-4 animate-fade-in-up animate-delay-600" style={{
                color: 'var(--text-primary)'
              }}>
                Track Attendance
              </h3>
              <p className="leading-relaxed animate-fade-in-up animate-delay-700" style={{
                color: 'var(--text-secondary)'
              }}>
                Attendance is automatically recorded with timestamp and student details
              </p>
            </div>

            <div className="text-center p-6 rounded-2xl border-2 hover:-translate-y-2 hover:shadow-lg transition-all duration-300 animate-fade-in-up animate-delay-500 hover-lift" style={{
              backgroundColor: 'var(--bg-secondary)',
              borderColor: 'var(--border-primary)'
            }} onMouseEnter={(e) => {
              e.target.style.borderColor = 'var(--error-500)';
            }} onMouseLeave={(e) => {
              e.target.style.borderColor = 'var(--border-primary)';
            }}>
              <div className="rounded-full w-16 h-16 flex items-center justify-center mx-auto mb-6 text-2xl font-bold text-white animate-scale-in animate-delay-600" style={{
                backgroundColor: 'var(--error-500)'
              }}>
                4
              </div>
              <h3 className="font-semibold text-xl mb-4 animate-fade-in-up animate-delay-700" style={{
                color: 'var(--text-primary)'
              }}>
                Generate Reports
              </h3>
              <p className="leading-relaxed animate-fade-in-up animate-delay-800" style={{
                color: 'var(--text-secondary)'
              }}>
                Access comprehensive reports and analytics through the dashboard
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Call to Action */}
      <div className="py-24 lg:py-32 theme-transition animate-fade-in-up animate-delay-600" style={{
        backgroundColor: 'var(--bg-secondary)'
      }}>
        <div className="max-w-5xl mx-auto text-center px-6 sm:px-8 md:px-12 lg:px-16 xl:px-20">
          <h2 className="text-4xl lg:text-5xl xl:text-6xl font-bold mb-8 lg:mb-12 animate-fade-in-up animate-delay-700" style={{
            color: 'var(--text-primary)',
            letterSpacing: '-0.02em'
          }}>
            Ready to Modernize Your Attendance System?
          </h2>
          <p className="text-xl lg:text-2xl mb-12 lg:mb-16 max-w-3xl mx-auto leading-relaxed animate-fade-in-up animate-delay-800" style={{
            color: 'var(--text-secondary)'
          }}>
            Join thousands of institutions already using our smart attendance solution. 
            <span style={{ color: 'var(--primary-600)', fontWeight: '600' }}>Experience the future</span> of attendance management today.
          </p>
          <div className="flex flex-col sm:flex-row gap-6 justify-center animate-fade-in-up animate-delay-900">
            <button
              onClick={() => navigate('/register')}
              className="px-8 py-4 rounded-xl font-semibold text-lg transition-all duration-300 hover:shadow-lg hover:-translate-y-1 text-white hover-lift animate-scale-in animate-delay-1000"
              style={{
                backgroundColor: 'var(--primary-500)'
              }}
              onMouseEnter={(e) => {
                e.target.style.backgroundColor = 'var(--primary-600)';
              }}
              onMouseLeave={(e) => {
                e.target.style.backgroundColor = 'var(--primary-500)';
              }}
            >
              Get Started Now
            </button>
            <button
              onClick={() => navigate('/teacher/login')}
              className="border-2 px-8 py-4 rounded-xl font-semibold text-lg transition-all duration-300 hover:shadow-lg hover:-translate-y-1 hover-lift animate-scale-in animate-delay-1100"
              style={{
                borderColor: 'var(--primary-500)',
                color: 'var(--primary-500)'
              }}
              onMouseEnter={(e) => {
                e.target.style.backgroundColor = 'var(--primary-500)';
                e.target.style.color = 'white';
              }}
              onMouseLeave={(e) => {
                e.target.style.backgroundColor = 'transparent';
                e.target.style.color = 'var(--primary-500)';
              }}
            >
              Teacher Login
            </button>
          </div>
        </div>
      </div>
    </>
  );
};

export default Home;