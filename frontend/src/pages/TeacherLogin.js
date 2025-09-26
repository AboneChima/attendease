import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { LogIn, GraduationCap, Shield, Loader2 } from 'lucide-react';

const API_BASE_URL = 'http://localhost:5000/api';

const TeacherLogin = () => {
  const [formData, setFormData] = useState({
    email: '',
    password: ''
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const navigate = useNavigate();

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

    try {
      const response = await axios.post(`${API_BASE_URL}/teachers/login`, formData);
      
      // Store token and teacher info in localStorage
      localStorage.setItem('token', response.data.token);
      localStorage.setItem('teacher', JSON.stringify(response.data.teacher));
      
      // Redirect to dashboard
      navigate('/teacher/dashboard');
    } catch (error) {
      console.error('Login error:', error);
      if (error.response?.data?.error) {
        setError(error.response.data.error);
      } else if (error.response?.data?.errors) {
        setError(error.response.data.errors.map(err => err.msg).join(', '));
      } else {
        setError('Login failed. Please try again.');
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center py-8 animate-fade-in" style={{
      background: 'linear-gradient(135deg, var(--primary-600), var(--secondary-600), var(--secondary-800))'
    }}>
      <div className="container mx-auto px-4 sm:px-6 lg:px-8 max-w-6xl">
        <div className="flex gap-8 items-stretch">
          {/* Left Side - Welcome Section */}
          <div className="hidden md:flex flex-1 backdrop-blur-xl rounded-3xl p-8 flex-col justify-center text-center shadow-2xl animate-fade-in-left animate-delay-200" style={{
            backgroundColor: 'var(--bg-primary)',
            borderColor: 'var(--border-primary)',
            border: '1px solid'
          }}>
            <GraduationCap className="w-20 h-20 mx-auto mb-6 animate-bounce-in animate-delay-400" style={{
              color: 'var(--primary-600)'
            }} />
            <h2 className="text-4xl font-bold mb-4 animate-fade-in-up animate-delay-500" style={{
              color: 'var(--text-primary)'
            }}>
              Welcome Back
            </h2>
            <p className="text-xl mb-8 leading-relaxed animate-fade-in-up animate-delay-600" style={{
              color: 'var(--text-secondary)'
            }}>
              Access your attendance management dashboard and monitor student participation with ease.
            </p>
            
            <div className="mt-8 animate-fade-in-up animate-delay-700">
              <div className="inline-flex items-center px-4 py-2 rounded-full font-semibold" style={{
                backgroundColor: 'var(--success-50)',
                color: 'var(--success-700)'
              }}>
                <Shield className="w-4 h-4 mr-2" />
                Secure Login
              </div>
            </div>
          </div>

          {/* Right Side - Login Form */}
          <div className="flex-1 backdrop-blur-xl rounded-3xl p-8 shadow-2xl animate-fade-in-right animate-delay-300" style={{
            backgroundColor: 'var(--bg-primary)',
            borderColor: 'var(--border-primary)',
            border: '1px solid'
          }}>
            <div className="text-center mb-8">
              <h1 className="text-4xl font-bold mb-2 animate-fade-in-up animate-delay-400" style={{
                color: 'var(--text-primary)'
              }}>
                Teacher Login
              </h1>
              <p className="text-lg animate-fade-in-up animate-delay-500" style={{
                color: 'var(--text-secondary)'
              }}>
                Sign in to manage attendance
              </p>
            </div>

            <div className="flex items-center justify-center mb-8 animate-fade-in-up animate-delay-600">
              <div className="flex-1 h-px" style={{ backgroundColor: 'var(--border-secondary)' }}></div>
              <span className="px-4 text-sm rounded-full py-1" style={{
                color: 'var(--text-secondary)',
                backgroundColor: 'var(--bg-secondary)'
              }}>
                Enter Credentials
              </span>
              <div className="flex-1 h-px" style={{ backgroundColor: 'var(--border-secondary)' }}></div>
            </div>

            <form onSubmit={handleSubmit} className="space-y-6">
              <div className="animate-fade-in-up animate-delay-700">
                <label htmlFor="email" className="block text-sm font-semibold mb-2" style={{
                  color: 'var(--text-primary)'
                }}>
                  Email Address
                </label>
                <input
                  id="email"
                  name="email"
                  type="email"
                  value={formData.email}
                  onChange={handleChange}
                  required
                  placeholder="teacher@school.com"
                  className="w-full px-4 py-4 rounded-2xl focus:outline-none focus:ring-2 transition-all duration-200 text-lg"
                  style={{
                    backgroundColor: 'var(--bg-secondary)',
                    borderColor: 'var(--border-primary)',
                    border: '1px solid',
                    color: 'var(--text-primary)'
                  }}
                  onFocus={(e) => {
                    e.target.style.backgroundColor = 'var(--bg-primary)';
                    e.target.style.borderColor = 'var(--primary-500)';
                    e.target.style.boxShadow = '0 0 0 2px var(--primary-200)';
                  }}
                  onBlur={(e) => {
                    e.target.style.backgroundColor = 'var(--bg-secondary)';
                    e.target.style.borderColor = 'var(--border-primary)';
                    e.target.style.boxShadow = 'none';
                  }}
                />
              </div>
              
              <div className="animate-fade-in-up animate-delay-800">
                <label htmlFor="password" className="block text-sm font-semibold mb-2" style={{
                  color: 'var(--text-primary)'
                }}>
                  Password
                </label>
                <input
                  id="password"
                  name="password"
                  type="password"
                  value={formData.password}
                  onChange={handleChange}
                  required
                  placeholder="Enter your password"
                  className="w-full px-4 py-4 rounded-2xl focus:outline-none focus:ring-2 transition-all duration-200 text-lg"
                  style={{
                    backgroundColor: 'var(--bg-secondary)',
                    borderColor: 'var(--border-primary)',
                    border: '1px solid',
                    color: 'var(--text-primary)'
                  }}
                  onFocus={(e) => {
                    e.target.style.backgroundColor = 'var(--bg-primary)';
                    e.target.style.borderColor = 'var(--primary-500)';
                    e.target.style.boxShadow = '0 0 0 2px var(--primary-200)';
                  }}
                  onBlur={(e) => {
                    e.target.style.backgroundColor = 'var(--bg-secondary)';
                    e.target.style.borderColor = 'var(--border-primary)';
                    e.target.style.boxShadow = 'none';
                  }}
                />
              </div>

              {error && (
                <div className="px-4 py-3 rounded-2xl animate-fade-in-up animate-scale-in" style={{
                  backgroundColor: 'var(--error-50)',
                  borderColor: 'var(--error-200)',
                  border: '1px solid',
                  color: 'var(--error-700)'
                }}>
                  <p className="text-sm font-medium">{error}</p>
                </div>
              )}

              <button
                type="submit"
                disabled={loading}
                className="w-full py-4 px-6 rounded-2xl font-semibold text-lg transition-all duration-300 hover:-translate-y-1 hover:shadow-xl disabled:cursor-not-allowed animate-fade-in-up animate-delay-900 hover-lift flex items-center justify-center gap-2"
                style={{
                  background: loading 
                    ? 'linear-gradient(135deg, var(--secondary-400), var(--secondary-500))'
                    : 'linear-gradient(135deg, var(--primary-600), var(--secondary-600))',
                  color: 'var(--bg-primary)'
                }}
                onMouseEnter={(e) => {
                  if (!loading) {
                    e.target.style.background = 'linear-gradient(135deg, var(--primary-700), var(--secondary-700))';
                  }
                }}
                onMouseLeave={(e) => {
                  if (!loading) {
                    e.target.style.background = 'linear-gradient(135deg, var(--primary-600), var(--secondary-600))';
                  }
                }}
              >
                {loading ? (
                  <>
                    <Loader2 className="w-5 h-5 animate-spin" />
                    Signing In...
                  </>
                ) : (
                  <>
                    <LogIn className="w-5 h-5" />
                    Sign In to Dashboard
                  </>
                )}
              </button>
            </form>

            {/* Demo Credentials */}
            <div className="mt-8 rounded-2xl p-6 animate-fade-in-up animate-delay-1000 hover-lift" style={{
              backgroundColor: 'var(--primary-50)',
              borderColor: 'var(--primary-200)',
              border: '1px solid'
            }}>
              <div className="flex items-center mb-4 animate-fade-in-left animate-delay-1100">
                <Shield className="w-5 h-5 mr-2" style={{ color: 'var(--primary-600)' }} />
                <h3 className="text-lg font-semibold" style={{
                  color: 'var(--primary-900)'
                }}>
                  Demo Credentials
                </h3>
              </div>
              <div className="space-y-2 animate-fade-in-up animate-delay-1200" style={{
                color: 'var(--text-primary)'
              }}>
                <p className="text-sm">
                  <span className="font-semibold">Email:</span> admin@school.com
                </p>
                <p className="text-sm">
                  <span className="font-semibold">Password:</span> password
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default TeacherLogin;