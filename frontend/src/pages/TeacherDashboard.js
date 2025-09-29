import React, { useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import axios from 'axios';
import API_BASE_URL from '../config/api';

const TeacherDashboard = () => {
  const [todayAttendance, setTodayAttendance] = useState([]);
  const [summary, setSummary] = useState(null);
  const [enrollmentData, setEnrollmentData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const teacher = JSON.parse(localStorage.getItem('teacher') || '{}');
  const token = localStorage.getItem('token');

  const fetchDashboardData = useCallback(async () => {
    try {
      setLoading(true);
      
      const headers = {
        'Authorization': `Bearer ${token}`
      };

      const today = new Date().toISOString().split('T')[0];

      // Fetch today's attendance from attendance-management (real-time status)
      const todayResponse = await axios.get(`${API_BASE_URL}/attendance-management/daily/${today}`, { headers });
      setTodayAttendance(todayResponse.data.students || []);

      // Fetch summary data from attendance-management
      const summaryResponse = await axios.get(`${API_BASE_URL}/attendance/summary`, { headers });
      setSummary(summaryResponse.data);

      // Fetch enrollment status data
      const enrollmentResponse = await axios.get(`${API_BASE_URL}/enrollment-status/students`, { headers });
      setEnrollmentData(enrollmentResponse.data);

    } catch (error) {
      console.error('Dashboard error:', error);
      setError('Failed to load dashboard data');
    } finally {
      setLoading(false);
    }
  }, [token]);

  useEffect(() => {
    fetchDashboardData();
  }, [fetchDashboardData]);

  const formatTime = (timeString) => {
    return new Date(`2000-01-01T${timeString}`).toLocaleTimeString('en-US', {
      hour: '2-digit',
      minute: '2-digit',
      hour12: true
    });
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center animate-fade-in" style={{
        backgroundColor: 'var(--bg-secondary)'
      }}>
        <div className="text-center">
          <div className="animate-spin w-16 h-16 border-4 rounded-full mx-auto mb-4 animate-bounce-in" style={{
            borderColor: 'var(--primary-200)',
            borderTopColor: 'var(--primary-600)'
          }}></div>
          <h2 className="text-xl font-semibold animate-fade-in-up animate-delay-200" style={{
            color: 'var(--primary-600)'
          }}>Loading Dashboard...</h2>
        </div>
      </div>
    );
  }

  return (
    <div className="page-layout min-h-screen animate-fade-in" style={{
      backgroundColor: 'var(--bg-secondary)'
    }}>
      <div className="container-fluid px-6 sm:px-8 lg:px-12 xl:px-16 py-8 max-w-7xl mx-auto">
        {/* Header Section */}
        <div className="card mb-10 relative overflow-hidden animate-fade-in-up animate-delay-100" style={{
          background: 'linear-gradient(135deg, var(--primary-600), var(--primary-800))',
          color: '#ffffff'
        }}>
          <div className="absolute top-0 right-0 w-32 h-32 md:w-48 md:h-48 rounded-full transform translate-x-16 md:translate-x-24 -translate-y-16 md:-translate-y-24" style={{
            backgroundColor: 'rgba(255, 255, 255, 0.1)'
          }}></div>
          <div className="relative z-10 p-4 md:p-8">
            <div className="flex flex-col md:flex-row items-start md:items-center justify-between mb-4 md:mb-6 space-y-4 md:space-y-0">
              <div className="flex items-center w-full md:w-auto">
                <div className="w-12 h-12 md:w-16 md:h-16 rounded-full flex items-center justify-center mr-4 md:mr-6 text-lg md:text-2xl font-bold animate-bounce-in animate-delay-300 shadow-lg flex-shrink-0" style={{
                  backgroundColor: 'rgba(255, 255, 255, 0.9)',
                  color: 'var(--primary-700)',
                  border: '2px md:border-3 solid rgba(255, 255, 255, 0.3)'
                }}>
                  {teacher.name?.charAt(0) || 'T'}
                </div>
                <div className="flex-1 min-w-0">
                  <h1 className="text-xl md:text-3xl lg:text-4xl font-bold mb-1 md:mb-2 flex items-center animate-fade-in-left animate-delay-400 truncate">
                    Welcome back, {teacher.name?.split(' ')[0] || 'Teacher'}! <span className="ml-2 text-lg md:text-3xl">👋</span>
                  </h1>
                  <div className="flex items-center opacity-90 animate-fade-in-left animate-delay-500">
                    <span className="mr-2 text-sm md:text-lg">📅</span>
                    <p className="text-sm md:text-xl truncate">
                      {new Date().toLocaleDateString('en-US', { 
                        weekday: 'long', 
                        year: 'numeric', 
                        month: 'long', 
                        day: 'numeric' 
                      })}
                    </p>
                  </div>
                </div>
              </div>
              
              <div className="text-center animate-fade-in-right animate-delay-600 self-center md:self-auto">
                <span className="text-3xl md:text-5xl block opacity-80 mb-1 md:mb-2">📊</span>
                <p className="opacity-80 text-sm md:text-base">Dashboard</p>
              </div>
            </div>
          </div>
        </div>

        {/* Error Message */}
        {error && (
          <div className="rounded-xl p-6 mb-8 max-w-4xl mx-auto animate-fade-in-up animate-scale-in" style={{
            backgroundColor: 'var(--error-50)',
            borderColor: 'var(--error-500)',
            border: '2px solid'
          }}>
            <div className="flex items-center justify-center mb-4">
              <span className="text-3xl mr-3">❌</span>
              <h3 className="text-xl font-semibold" style={{ color: 'var(--error-700)' }}>Error</h3>
            </div>
            <p className="text-center" style={{ color: 'var(--error-600)' }}>{error}</p>
          </div>
        )}

        {/* Stats Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8 mb-10">
          <div className="rounded-xl p-6 relative overflow-hidden hover-lift animate-fade-in-up animate-delay-200" style={{
            background: 'linear-gradient(135deg, var(--primary-600), var(--primary-800))',
            color: '#ffffff'
          }}>
            <div className="absolute top-0 right-0 w-20 h-20 rounded-full transform translate-x-10 -translate-y-10" style={{
              backgroundColor: 'rgba(255, 255, 255, 0.1)'
            }}></div>
            <div className="relative z-10 text-center">
              <span className="text-4xl block mb-4 animate-bounce-in animate-delay-300">📅</span>
              <h3 className="text-3xl font-bold mb-2 animate-scale-in animate-delay-400">{todayAttendance.filter(record => record.status === 'present').length}</h3>
              <p className="opacity-90 animate-fade-in-up animate-delay-500">Today's Attendance</p>
            </div>
          </div>

          <div className="rounded-xl p-6 relative overflow-hidden hover-lift animate-fade-in-up animate-delay-300" style={{
            background: 'linear-gradient(135deg, var(--success-500), var(--success-700))',
            color: '#ffffff'
          }}>
            <div className="absolute top-0 right-0 w-20 h-20 rounded-full transform translate-x-10 -translate-y-10" style={{
              backgroundColor: 'rgba(255, 255, 255, 0.1)'
            }}></div>
            <div className="relative z-10 text-center">
              <span className="text-4xl block mb-4 animate-bounce-in animate-delay-400">👥</span>
              <h3 className="text-3xl font-bold mb-2 animate-scale-in animate-delay-500">{summary?.total_attendance || 0}</h3>
              <p className="opacity-90 animate-fade-in-up animate-delay-600">Total Attendance</p>
            </div>
          </div>

          <div className="rounded-xl p-6 relative overflow-hidden hover-lift animate-fade-in-up animate-delay-400" style={{
            background: 'linear-gradient(135deg, var(--warning-500), var(--warning-600))',
            color: '#ffffff'
          }}>
            <div className="absolute top-0 right-0 w-20 h-20 rounded-full transform translate-x-10 -translate-y-10" style={{
              backgroundColor: 'rgba(255, 255, 255, 0.1)'
            }}></div>
            <div className="relative z-10 text-center">
              <span className="text-4xl block mb-4 animate-bounce-in animate-delay-500">📈</span>
              <h3 className="text-3xl font-bold mb-2 animate-scale-in animate-delay-600">{summary?.daily_attendance?.length || 0}</h3>
              <p className="opacity-90 animate-fade-in-up animate-delay-700">Active Days</p>
            </div>
          </div>

          <div className="rounded-xl p-6 relative overflow-hidden hover-lift animate-fade-in-up animate-delay-500" style={{
            background: 'linear-gradient(135deg, var(--secondary-500), var(--warning-600))',
            color: '#ffffff'
          }}>
            <div className="absolute top-0 right-0 w-20 h-20 rounded-full transform translate-x-10 -translate-y-10" style={{
              backgroundColor: 'rgba(255, 255, 255, 0.1)'
            }}></div>
            <div className="relative z-10 text-center">
              <span className="text-4xl block mb-4 animate-bounce-in animate-delay-600">✅</span>
              <h3 className="text-3xl font-bold mb-2 animate-scale-in animate-delay-700">{summary?.total_registered_students || 0}</h3>
              <p className="opacity-90 animate-fade-in-up animate-delay-800">Registered Students</p>
            </div>
          </div>
        </div>

        {/* Enrollment Status Section */}
        {enrollmentData && (
          <div className="card p-8 mb-10 animate-fade-in-up animate-delay-600">
            <div className="flex items-center mb-6">
              <div className="w-12 h-12 rounded-full flex items-center justify-center mr-4 animate-bounce-in animate-delay-700" style={{
                backgroundColor: 'var(--info-600)',
                color: '#ffffff',
                boxShadow: 'var(--shadow-md)',
                border: '2px solid var(--info-700)'
              }}>
                <span className="text-2xl">🔐</span>
              </div>
              <h2 className="text-2xl font-semibold animate-fade-in-left animate-delay-700" style={{ color: 'var(--text-primary)' }}>
                Student Enrollment Status
              </h2>
            </div>

            {/* Enrollment Summary */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
              <div className="rounded-lg p-4 text-center" style={{
                backgroundColor: 'var(--success-100)',
                border: '1px solid var(--success-300)'
              }}>
                <div className="text-2xl font-bold mb-1" style={{ color: 'var(--success-700)' }}>
                  {enrollmentData.summary?.enrolled_face || 0}
                </div>
                <div className="text-sm" style={{ color: 'var(--success-600)' }}>📱 Face Enrolled</div>
              </div>
              
              <div className="rounded-lg p-4 text-center" style={{
                backgroundColor: 'var(--warning-100)',
                border: '1px solid var(--warning-300)'
              }}>
                <div className="text-2xl font-bold mb-1" style={{ color: 'var(--warning-700)' }}>
                  {enrollmentData.summary?.enrolled_fingerprint || 0}
                </div>
                <div className="text-sm" style={{ color: 'var(--warning-600)' }}>👆 Fingerprint Enrolled</div>
              </div>
              
              <div className="rounded-lg p-4 text-center" style={{
                backgroundColor: 'var(--info-100)',
                border: '1px solid var(--info-300)'
              }}>
                <div className="text-2xl font-bold mb-1" style={{ color: 'var(--info-700)' }}>
                  {enrollmentData.summary?.enrolled_pin || 0}
                </div>
                <div className="text-sm" style={{ color: 'var(--info-600)' }}>🔢 PIN Enrolled</div>
              </div>
              
              <div className="rounded-lg p-4 text-center" style={{
                backgroundColor: 'var(--primary-100)',
                border: '1px solid var(--primary-300)'
              }}>
                <div className="text-2xl font-bold mb-1" style={{ color: 'var(--primary-700)' }}>
                  {enrollmentData.summary?.fully_enrolled || 0}
                </div>
                <div className="text-sm" style={{ color: 'var(--primary-600)' }}>✅ Fully Enrolled</div>
              </div>
            </div>

            {/* Students List */}
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr style={{
                    backgroundColor: 'var(--bg-secondary)',
                    borderBottom: '1px solid var(--border-secondary)'
                  }}>
                    <th className="text-left py-3 px-4 font-semibold" style={{ color: 'var(--text-primary)' }}>Student ID</th>
                    <th className="text-left py-3 px-4 font-semibold" style={{ color: 'var(--text-primary)' }}>Name</th>
                    <th className="text-center py-3 px-4 font-semibold" style={{ color: 'var(--text-primary)' }}>📱 Face</th>
                    <th className="text-center py-3 px-4 font-semibold" style={{ color: 'var(--text-primary)' }}>👆 Fingerprint</th>
                    <th className="text-center py-3 px-4 font-semibold" style={{ color: 'var(--text-primary)' }}>🔢 PIN</th>
                    <th className="text-center py-3 px-4 font-semibold" style={{ color: 'var(--text-primary)' }}>Status</th>
                  </tr>
                </thead>
                <tbody>
                  {enrollmentData.students?.map((student, index) => (
                    <tr key={student.student_id} className="hover-lift transition-colors" style={{
                      borderBottom: '1px solid var(--border-primary)',
                      backgroundColor: index % 2 === 0 ? 'var(--bg-primary)' : 'var(--bg-secondary)'
                    }}>
                      <td className="py-3 px-4 font-medium" style={{ color: 'var(--text-primary)' }}>
                        {student.student_id}
                      </td>
                      <td className="py-3 px-4 font-medium" style={{ color: 'var(--text-primary)' }}>
                        {student.student_name}
                      </td>
                      <td className="py-3 px-4 text-center">
                        <span className={`px-2 py-1 rounded-full text-xs font-semibold ${
                          student.face_enrolled 
                            ? 'bg-green-100 text-green-800' 
                            : 'bg-red-100 text-red-800'
                        }`}>
                          {student.face_enrolled ? '✅' : '❌'}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-center">
                        <span className={`px-2 py-1 rounded-full text-xs font-semibold ${
                          student.fingerprint_enrolled 
                            ? 'bg-green-100 text-green-800' 
                            : 'bg-red-100 text-red-800'
                        }`}>
                          {student.fingerprint_enrolled ? '✅' : '❌'}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-center">
                        <span className={`px-2 py-1 rounded-full text-xs font-semibold ${
                          student.pin_enrolled 
                            ? 'bg-green-100 text-green-800' 
                            : 'bg-red-100 text-red-800'
                        }`}>
                          {student.pin_enrolled ? '✅' : '❌'}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-center">
                        <span className={`px-3 py-1 rounded-full text-sm font-semibold ${
                          student.face_enrolled && student.fingerprint_enrolled && student.pin_enrolled
                            ? 'bg-green-100 text-green-800'
                            : student.face_enrolled || student.fingerprint_enrolled || student.pin_enrolled
                            ? 'bg-yellow-100 text-yellow-800'
                            : 'bg-red-100 text-red-800'
                        }`}>
                          {student.face_enrolled && student.fingerprint_enrolled && student.pin_enrolled
                            ? 'Complete'
                            : student.face_enrolled || student.fingerprint_enrolled || student.pin_enrolled
                            ? 'Partial'
                            : 'None'}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Special highlight for STU06 if requested */}
            {enrollmentData.students?.find(s => s.student_id === 'STU06') && (
              <div className="mt-6 p-4 rounded-lg" style={{
                backgroundColor: 'var(--info-50)',
                border: '2px solid var(--info-300)'
              }}>
                <div className="flex items-center">
                  <span className="text-2xl mr-3">🔍</span>
                  <div>
                    <h4 className="font-semibold" style={{ color: 'var(--info-700)' }}>
                      STU06 Status Check
                    </h4>
                    <p style={{ color: 'var(--info-600)' }}>
                      {(() => {
                        const stu06 = enrollmentData.students.find(s => s.student_id === 'STU06');
                        return `${stu06.student_name} is enrolled via: ${
                          [
                            stu06.face_enrolled && 'Face Recognition',
                            stu06.fingerprint_enrolled && 'Fingerprint',
                            stu06.pin_enrolled && 'PIN'
                          ].filter(Boolean).join(', ') || 'No enrollment methods'
                        }`;
                      })()}
                    </p>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-10">
          {/* Today's Attendance */}
          <div className="lg:col-span-2">
            <div className="card p-8 animate-fade-in-up animate-delay-600">
              <div className="flex items-center mb-6">
                <div className="w-12 h-12 rounded-full flex items-center justify-center mr-4 animate-bounce-in animate-delay-700" style={{
                  backgroundColor: 'var(--primary-600)',
                  color: '#ffffff',
                  boxShadow: 'var(--shadow-md)',
                  border: '2px solid var(--primary-700)'
                }}>
                  <span className="text-2xl">📅</span>
                </div>
                <h2 className="text-2xl font-semibold animate-fade-in-left animate-delay-700" style={{ color: 'var(--text-primary)' }}>Today's Attendance</h2>
                <span className="ml-4 px-4 py-2 rounded-full text-sm font-semibold animate-fade-in-right animate-delay-700" style={{
                  backgroundColor: 'var(--primary-600)',
                  color: 'var(--bg-primary)',
                  border: '2px solid var(--primary-700)',
                  fontWeight: 'bold'
                }}>
                  {new Date().toLocaleDateString()}
                </span>
              </div>
              
              <div className="pt-6" style={{ borderTop: '1px solid var(--border-secondary)' }}>
                {todayAttendance.length === 0 ? (
                  <div className="text-center py-16 animate-fade-in-up animate-delay-800">
                    <div className="w-32 h-32 rounded-full flex items-center justify-center mx-auto mb-6 animate-bounce-in animate-delay-900" style={{
                      backgroundColor: 'var(--primary-600)',
                      color: '#ffffff',
                      boxShadow: 'var(--shadow-lg)',
                      border: '4px solid var(--primary-700)'
                    }}>
                      <span className="text-6xl">📅</span>
                    </div>
                    <h3 className="text-xl font-semibold mb-2 animate-fade-in-up animate-delay-1000" style={{ color: 'var(--text-primary)' }}>No students registered</h3>
                    <p className="animate-fade-in-up animate-delay-1100" style={{ color: 'var(--text-secondary)' }}>Please register students first</p>
                  </div>
                ) : (
                  <div className="overflow-x-auto animate-fade-in-up animate-delay-800">
                    <table className="w-full">
                      <thead>
                        <tr style={{
                          backgroundColor: 'var(--bg-secondary)',
                          borderBottom: '1px solid var(--border-secondary)'
                        }}>
                          <th className="text-left py-3 px-4 font-semibold" style={{ color: 'var(--text-primary)' }}>Student ID</th>
                          <th className="text-left py-3 px-4 font-semibold" style={{ color: 'var(--text-primary)' }}>Name</th>
                          <th className="text-left py-3 px-4 font-semibold" style={{ color: 'var(--text-primary)' }}>Time</th>
                          <th className="text-left py-3 px-4 font-semibold" style={{ color: 'var(--text-primary)' }}>Status</th>
                        </tr>
                      </thead>
                      <tbody>
                        {todayAttendance.map((record, index) => (
                          <tr key={record.student_id} className="hover-lift transition-colors" style={{
                            borderBottom: '1px solid var(--border-primary)',
                            backgroundColor: index % 2 === 0 ? 'var(--bg-primary)' : 'var(--bg-secondary)'
                          }}>
                            <td className="py-3 px-4 font-medium" style={{ color: 'var(--text-primary)' }}>{record.student_id}</td>
                            <td className="py-3 px-4 font-medium" style={{ color: 'var(--text-primary)' }}>{record.student_name}</td>
                            <td className="py-3 px-4 font-medium" style={{ color: 'var(--primary-600)' }}>
                              {record.check_in_time ? formatTime(record.check_in_time) : '-'}
                            </td>
                            <td className="py-3 px-4">
                              <span className={`px-3 py-1 rounded-full text-sm font-semibold flex items-center w-fit ${
                                record.status === 'present' 
                                  ? 'bg-green-100 text-green-800' 
                                  : record.status === 'absent'
                                  ? 'bg-red-100 text-red-800'
                                  : 'bg-yellow-100 text-yellow-800'
                              }`}>
                                <span className="mr-1">
                                  {record.status === 'present' ? '✅' : record.status === 'absent' ? '❌' : '⏳'}
                                </span>
                                {record.status === 'present' ? 'Present' : record.status === 'absent' ? 'Absent' : 'Not Yet Here'}
                              </span>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Quick Actions & Top Students */}
          <div className="space-y-8">
            {/* Quick Actions */}
            <div className="card p-8 animate-fade-in-up animate-delay-700">
              <div className="flex items-center mb-6">
                <span className="text-2xl mr-3 animate-bounce-in animate-delay-800">⚡</span>
                <h2 className="text-2xl font-semibold animate-fade-in-left animate-delay-800" style={{ color: 'var(--text-primary)' }}>Quick Actions</h2>
              </div>
              
              <div className="pt-6 space-y-4" style={{ borderTop: '1px solid var(--border-secondary)' }}>
                <Link
                  to="/scan"
                  className="w-full flex items-center justify-center space-x-3 text-lg py-4 hover:shadow-lg transform hover:-translate-y-1 transition-all duration-200 hover-lift animate-fade-in-up animate-delay-900 rounded-lg font-medium"
                  style={{
                    backgroundColor: 'var(--primary-600)',
                    color: '#ffffff'
                  }}
                >
                  <span>📱</span>
                  <span>Scan QR Code</span>
                </Link>
                
                <Link
                  to="/teacher/attendance"
                  className="w-full flex items-center justify-center space-x-3 text-lg py-4 hover:shadow-lg transform hover:-translate-y-1 transition-all duration-200 hover-lift animate-fade-in-up animate-delay-1000 rounded-lg font-medium"
                  style={{
                    backgroundColor: 'var(--info-800)',
                    color: '#ffffff'
                  }}
                >
                  <span style={{
                    backgroundColor: 'rgba(255, 255, 255, 0.2)',
                    borderRadius: '50%',
                    width: '2rem',
                    height: '2rem',
                    display: 'inline-flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    color: '#ffffff'
                  }}>👥</span>
                  <span>Manage Attendance</span>
                </Link>
                
                <Link
                  to="/teacher/reports"
                  className="w-full flex items-center justify-center space-x-3 text-lg py-4 hover:shadow-lg transform hover:-translate-y-1 transition-all duration-200 hover-lift animate-fade-in-up animate-delay-1100 rounded-lg font-medium"
                  style={{
                    backgroundColor: 'var(--success-600)',
                    color: '#ffffff'
                  }}
                >
                  <span style={{
                    backgroundColor: 'rgba(255, 255, 255, 0.2)',
                    borderRadius: '50%',
                    width: '2rem',
                    height: '2rem',
                    display: 'inline-flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    color: '#ffffff'
                  }}>📊</span>
                  <span>View Reports</span>
                </Link>
                
                <Link
                  to="/register"
                  className="w-full flex items-center justify-center space-x-3 text-lg py-4 hover:shadow-lg transform hover:-translate-y-1 transition-all duration-200 hover-lift animate-fade-in-up animate-delay-1200 rounded-lg font-medium"
                  style={{
                    background: 'linear-gradient(135deg, var(--secondary-500), var(--warning-600))',
                    color: '#ffffff'
                  }}
                >
                  <span style={{
                    backgroundColor: 'rgba(255, 255, 255, 0.2)',
                    borderRadius: '50%',
                    width: '2rem',
                    height: '2rem',
                    display: 'inline-flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    color: '#ffffff'
                  }}>👤</span>
                  <span>Register Student</span>
                </Link>
              </div>
            </div>

            {/* Top Students */}
            {summary?.top_students && summary.top_students.length > 0 && (
              <div className="card p-8 animate-fade-in-up animate-delay-800">
                <div className="flex items-center mb-6">
                  <div className="w-12 h-12 rounded-full flex items-center justify-center mr-4 animate-bounce-in animate-delay-900" style={{
                    backgroundColor: 'var(--warning-600)',
                    color: '#ffffff',
                    boxShadow: 'var(--shadow-md)',
                    border: '2px solid var(--warning-700)'
                  }}>
                    <span className="text-2xl">🏆</span>
                  </div>
                  <h2 className="text-2xl font-semibold animate-fade-in-left animate-delay-900" style={{ color: 'var(--text-primary)' }}>Top Students</h2>
                </div>
                
                <div className="pt-6 space-y-3" style={{ borderTop: '1px solid var(--border-secondary)' }}>
                  {summary.top_students.slice(0, 5).map((student, index) => {
                    const medals = ['🥇', '🥈', '🥉'];
                    const bgGradients = [
                      'linear-gradient(135deg, var(--warning-700), var(--warning-800))',
                      'linear-gradient(135deg, var(--secondary-600), var(--secondary-700))',
                      'linear-gradient(135deg, var(--warning-800), var(--warning-900))'
                    ];
                    
                    return (
                      <div 
                        key={student.student_id} 
                        className={`flex items-center justify-between p-4 rounded-lg hover-lift animate-fade-in-up`}
                        style={{
                          background: index < 3 ? bgGradients[index] : 'var(--bg-secondary)',
                          color: index < 3 ? '#ffffff' : 'var(--text-primary)',
                          animationDelay: `${1000 + index * 100}ms`
                        }}
                      >
                        <div className="flex items-center flex-1 min-w-0">
                          <span className="text-xl mr-3 animate-scale-in flex-shrink-0" style={{
                            animationDelay: `${1100 + index * 100}ms`
                          }}>
                            {index < 3 ? medals[index] : `${index + 1}.`}
                          </span>
                          <span className="font-semibold truncate" title={student.student_name}>{student.student_name}</span>
                        </div>
                        <span className="px-3 py-1 rounded-full text-sm font-semibold flex-shrink-0" style={{
                          backgroundColor: index < 3 ? 'rgba(255, 255, 255, 0.9)' : 'var(--info-100)',
                          color: index < 3 ? 'var(--primary-700)' : 'var(--text-primary)',
                          border: index < 3 ? '1px solid rgba(255, 255, 255, 0.3)' : '1px solid var(--info-500)'
                        }}>
                          {student.attendance_count} days
                        </span>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default TeacherDashboard;