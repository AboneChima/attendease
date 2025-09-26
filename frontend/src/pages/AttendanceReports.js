import React, { useState, useEffect } from 'react';
import axios from 'axios';

const API_BASE_URL = 'http://localhost:5000/api';

const AttendanceReports = () => {
  const [tabValue, setTabValue] = useState(0);
  const [dateAttendance, setDateAttendance] = useState([]);
  const [studentAttendance, setStudentAttendance] = useState([]);
  const [students, setStudents] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  
  // Filters
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);
  const [selectedStudent, setSelectedStudent] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');

  const token = localStorage.getItem('token');

  useEffect(() => {
    fetchStudents();
    fetchDateAttendance();
  }, []);

  const fetchStudents = async () => {
    try {
      const response = await axios.get(`${API_BASE_URL}/students`);
      setStudents(response.data);
    } catch (error) {
      console.error('Fetch students error:', error);
    }
  };

  const fetchDateAttendance = async (date = selectedDate) => {
    try {
      setLoading(true);
      const headers = { 'Authorization': `Bearer ${token}` };
      const response = await axios.get(`${API_BASE_URL}/attendance/date/${date}`, { headers });
      setDateAttendance(response.data.attendance);
    } catch (error) {
      console.error('Fetch date attendance error:', error);
      setError('Failed to fetch attendance data');
    } finally {
      setLoading(false);
    }
  };

  const fetchStudentAttendance = async () => {
    if (!selectedStudent) return;

    try {
      setLoading(true);
      const headers = { 'Authorization': `Bearer ${token}` };
      let url = `${API_BASE_URL}/attendance/student/${selectedStudent}`;
      
      if (startDate && endDate) {
        url += `?start_date=${startDate}&end_date=${endDate}`;
      }

      const response = await axios.get(url, { headers });
      setStudentAttendance(response.data.attendance);
    } catch (error) {
      console.error('Fetch student attendance error:', error);
      setError('Failed to fetch student attendance data');
    } finally {
      setLoading(false);
    }
  };

  const handleTabChange = (newValue) => {
    setTabValue(newValue);
    setError(null);
  };

  const handleDateSearch = () => {
    fetchDateAttendance(selectedDate);
  };

  const handleStudentSearch = () => {
    fetchStudentAttendance();
  };

  const exportToCSV = (data, filename) => {
    if (!data || data.length === 0) return;

    const headers = ['Student ID', 'Student Name', 'Date', 'Time'];
    const csvContent = [
      headers.join(','),
      ...data.map(record => [
        record.student_id,
        record.student_name,
        record.date,
        record.time
      ].join(','))
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `${filename}.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    window.URL.revokeObjectURL(url);
  };

  const formatTime = (timeString) => {
    return new Date(`2000-01-01T${timeString}`).toLocaleTimeString('en-US', {
      hour: '2-digit',
      minute: '2-digit',
      hour12: true
    });
  };

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  return (
    <div className="page-layout bg-secondary-50 min-h-screen">
      <div className="container-fluid py-8">
        {/* Header Section */}
        <div className="card bg-gradient-to-br from-primary-600 to-primary-800 text-white mb-8 relative overflow-hidden">
          <div className="absolute top-0 right-0 w-48 h-48 bg-white bg-opacity-10 rounded-full transform translate-x-24 -translate-y-24"></div>
          <div className="relative z-10 p-8">
            <div className="flex items-center mb-6">
              <div className="w-20 h-20 bg-white bg-opacity-20 rounded-full flex items-center justify-center mr-6 text-3xl">
                📊
              </div>
              <div>
                <h1 className="text-4xl font-bold mb-2">Attendance Reports</h1>
                <p className="text-xl opacity-90">Comprehensive attendance analytics and insights</p>
              </div>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mt-8">
              <div className="flex items-center">
                <span className="text-2xl mr-4">📅</span>
                <div>
                  <p className="text-sm opacity-80">Daily Reports</p>
                  <p className="text-lg font-semibold">View by Date</p>
                </div>
              </div>
              <div className="flex items-center">
                <span className="text-2xl mr-4">👥</span>
                <div>
                  <p className="text-sm opacity-80">Student Analytics</p>
                  <p className="text-lg font-semibold">Individual Records</p>
                </div>
              </div>
              <div className="flex items-center">
                <span className="text-2xl mr-4">📈</span>
                <div>
                  <p className="text-sm opacity-80">Export Data</p>
                  <p className="text-lg font-semibold">CSV Downloads</p>
                </div>
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
              <span className="text-3xl mr-3 animate-bounce-in">❌</span>
              <h3 className="text-xl font-semibold animate-fade-in-left" style={{ color: 'var(--error-700)' }}>Error Loading Data</h3>
            </div>
            <p className="text-center animate-fade-in-up animate-delay" style={{ color: 'var(--error-600)' }}>{error}</p>
          </div>
        )}

        {/* Tabs */}
        <div className="card mb-8 overflow-hidden">
          <div className="flex border-b" style={{ borderColor: 'var(--border-secondary)' }}>
            <button
              onClick={() => handleTabChange(0)}
              className={`flex-1 flex items-center justify-center space-x-3 py-4 px-6 font-semibold text-lg transition-all duration-300 animate-fade-in-up hover-lift ${
                tabValue === 0
                  ? 'text-white shadow-lg transform scale-105'
                  : 'hover:transform hover:scale-105'
              }`}
              style={{
                background: tabValue === 0 ? 'linear-gradient(135deg, var(--primary-600), var(--primary-800))' : 'var(--bg-primary)',
                color: tabValue === 0 ? 'var(--bg-primary)' : 'var(--text-secondary)'
              }}
              onMouseEnter={(e) => {
                if (tabValue !== 0) {
                  e.target.style.backgroundColor = 'var(--secondary-50)';
                }
              }}
              onMouseLeave={(e) => {
                if (tabValue !== 0) {
                  e.target.style.backgroundColor = 'var(--bg-primary)';
                }
              }}
            >
              <span>📅</span>
              <span>Reports by Date</span>
            </button>
            <button
              onClick={() => handleTabChange(1)}
              className={`flex-1 flex items-center justify-center space-x-3 py-4 px-6 font-semibold text-lg transition-all duration-300 animate-fade-in-up animate-delay-200 hover-lift ${
                tabValue === 1
                  ? 'text-white shadow-lg transform scale-105'
                  : 'hover:transform hover:scale-105'
              }`}
              style={{
                background: tabValue === 1 ? 'linear-gradient(135deg, var(--primary-600), var(--primary-800))' : 'var(--bg-primary)',
                color: tabValue === 1 ? 'var(--bg-primary)' : 'var(--text-secondary)'
              }}
              onMouseEnter={(e) => {
                if (tabValue !== 1) {
                  e.target.style.backgroundColor = 'var(--secondary-50)';
                }
              }}
              onMouseLeave={(e) => {
                if (tabValue !== 1) {
                  e.target.style.backgroundColor = 'var(--bg-primary)';
                }
              }}
            >
              <span>👤</span>
              <span>Student Analytics</span>
            </button>
          </div>

          {/* Date Tab */}
          {tabValue === 0 && (
            <div className="p-6">
              <div className="flex items-center mb-6">
                <span className="text-2xl mr-3">🔍</span>
                <h2 className="text-2xl font-semibold text-secondary-800">Filter by Date</h2>
              </div>
              
              <div className="pt-6 mb-6 animate-fade-in-up animate-delay-200" style={{ borderTop: '1px solid var(--border-secondary)' }}>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 items-end">
                  <div className="animate-fade-in-up animate-delay-300">
                    <label className="block text-sm font-medium mb-2 animate-fade-in-left animate-delay-400" style={{ color: 'var(--text-secondary)' }}>Select Date</label>
                    <input
                      type="date"
                      value={selectedDate}
                      onChange={(e) => setSelectedDate(e.target.value)}
                      className="w-full px-4 py-3 rounded-xl transition-all duration-200 animate-fade-in-up animate-delay-500"
                      style={{
                        border: '2px solid var(--border-secondary)',
                        backgroundColor: 'var(--bg-primary)',
                        color: 'var(--text-primary)'
                      }}
                      onFocus={(e) => {
                        e.target.style.borderColor = 'var(--primary-500)';
                        e.target.style.boxShadow = '0 0 0 2px var(--primary-200)';
                      }}
                      onBlur={(e) => {
                        e.target.style.borderColor = 'var(--border-secondary)';
                        e.target.style.boxShadow = 'none';
                      }}
                    />
                  </div>
                  <div className="animate-fade-in-up animate-delay-600">
                    <button
                      onClick={handleDateSearch}
                      disabled={loading}
                      className="w-full flex items-center justify-center space-x-2 disabled:opacity-50 px-6 py-3 text-white rounded-xl font-semibold transition-all duration-200 hover-lift"
                      style={{
                        background: 'linear-gradient(135deg, var(--primary-600), var(--primary-800))'
                      }}
                      onMouseEnter={(e) => {
                        if (!loading) {
                          e.target.style.background = 'linear-gradient(135deg, var(--primary-700), var(--primary-900))';
                        }
                      }}
                      onMouseLeave={(e) => {
                        e.target.style.background = 'linear-gradient(135deg, var(--primary-600), var(--primary-800))';
                      }}
                    >
                      <span>🔍</span>
                      <span>Search Records</span>
                    </button>
                  </div>
                  <div className="animate-fade-in-up animate-delay-700">
                    <button
                      onClick={() => exportToCSV(dateAttendance, `attendance_${selectedDate}`)}
                      disabled={dateAttendance.length === 0}
                      className="w-full flex items-center justify-center space-x-2 disabled:opacity-50 px-6 py-3 text-white rounded-xl font-semibold transition-all duration-200 hover-lift"
                      style={{
                        background: 'linear-gradient(135deg, var(--success-600), var(--success-800))'
                      }}
                      onMouseEnter={(e) => {
                        if (dateAttendance.length > 0) {
                          e.target.style.background = 'linear-gradient(135deg, var(--success-700), var(--success-900))';
                        }
                      }}
                      onMouseLeave={(e) => {
                        e.target.style.background = 'linear-gradient(135deg, var(--success-600), var(--success-800))';
                      }}
                    >
                      <span>📥</span>
                      <span>Export CSV</span>
                    </button>
                  </div>
                </div>
              </div>

              {loading ? (
                <div className="bg-gradient-to-br from-blue-50 to-blue-100 rounded-xl p-12 text-center">
                  <div className="animate-spin w-16 h-16 border-4 border-primary-600 border-t-transparent rounded-full mx-auto mb-4"></div>
                  <h3 className="text-xl font-semibold text-secondary-800 mb-2">Loading attendance data...</h3>
                  <p className="text-secondary-600">Please wait while we fetch the records</p>
                </div>
              ) : (
                <>
                  <div className="rounded-xl p-6 mb-6 animate-fade-in-up animate-delay-200" style={{
                    background: 'linear-gradient(135deg, var(--success-50), var(--success-100))',
                    borderColor: 'var(--success-500)',
                    border: '2px solid'
                  }}>
                    <div className="flex items-center mb-4">
                      <div className="w-16 h-16 rounded-full flex items-center justify-center mr-4 text-2xl animate-scale-in animate-delay-300" style={{
                        backgroundColor: 'var(--success-500)',
                        color: 'var(--bg-primary)'
                      }}>
                        ✅
                      </div>
                      <div>
                        <h3 className="text-xl font-bold mb-1 animate-fade-in-left animate-delay-300" style={{ color: 'var(--success-800)' }}>Attendance Summary</h3>
                        <p className="animate-fade-in-left animate-delay-400" style={{ color: 'var(--success-700)' }}>{formatDate(selectedDate)}</p>
                      </div>
                    </div>
                    
                    <div className="border-t pt-4" style={{ borderColor: 'var(--success-200)' }}>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                        <div className="flex items-center animate-fade-in-up animate-delay-500">
                          <span className="text-2xl mr-3">👥</span>
                          <div>
                            <p className="text-sm" style={{ color: 'var(--secondary-600)' }}>Students Present</p>
                            <p className="text-3xl font-bold animate-scale-in animate-delay-600" style={{ color: 'var(--secondary-800)' }}>{dateAttendance.length}</p>
                          </div>
                        </div>
                        <div className="flex items-center animate-fade-in-up animate-delay-600">
                          <span className="text-2xl mr-3">⏰</span>
                          <div>
                            <p className="text-sm" style={{ color: 'var(--secondary-600)' }}>Attendance Rate</p>
                            <p className="text-3xl font-bold animate-scale-in animate-delay-700" style={{ color: 'var(--secondary-800)' }}>{dateAttendance.length > 0 ? '100%' : '0%'}</p>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>

                  {dateAttendance.length === 0 ? (
                    <div className="text-center py-16 bg-gradient-to-br from-secondary-50 to-secondary-100 rounded-xl border-2 border-dashed border-primary-300">
                      <span className="text-8xl block mb-6 opacity-50">📅</span>
                      <h3 className="text-xl font-semibold text-secondary-600 mb-2">No Records Found</h3>
                      <p className="text-secondary-500">No attendance records found for {formatDate(selectedDate)}</p>
                    </div>
                  ) : (
                    <div className="rounded-xl overflow-hidden animate-fade-in-up animate-delay-800" style={{
                      backgroundColor: 'var(--bg-primary)',
                      borderColor: 'var(--border-secondary)',
                      border: '2px solid'
                    }}>
                      <div className="overflow-x-auto">
                        <table className="w-full">
                          <thead>
                            <tr className="text-white" style={{
                              background: 'linear-gradient(135deg, var(--primary-600), var(--primary-800))'
                            }}>
                              <th className="text-left py-4 px-6 font-semibold animate-fade-in-up animate-delay-900">Student ID</th>
                              <th className="text-left py-4 px-6 font-semibold animate-fade-in-up animate-delay-1000">Student Name</th>
                              <th className="text-left py-4 px-6 font-semibold animate-fade-in-up animate-delay-1100">Time</th>
                              <th className="text-left py-4 px-6 font-semibold animate-fade-in-up animate-delay-1200">Status</th>
                            </tr>
                          </thead>
                          <tbody>
                            {dateAttendance.map((record, index) => (
                              <tr key={record.id} className={`transition-colors duration-200 hover-lift`} style={{
                                borderBottom: '1px solid var(--border-primary)',
                                backgroundColor: index % 2 === 0 ? 'var(--bg-primary)' : 'var(--bg-secondary)',
                                animationDelay: `${1300 + index * 100}ms`
                              }} onMouseEnter={(e) => e.target.closest('tr').style.backgroundColor = 'var(--primary-50)'} onMouseLeave={(e) => e.target.closest('tr').style.backgroundColor = index % 2 === 0 ? 'var(--bg-primary)' : 'var(--bg-secondary)'}>
                                <td className="py-4 px-6">
                                  <div className="flex items-center animate-fade-in-left" style={{ animationDelay: `${1300 + index * 100}ms` }}>
                                    <span className="px-2 py-1 rounded-full text-xs font-semibold mr-3" style={{
                                      backgroundColor: 'var(--primary-100)',
                                      color: 'var(--primary-800)'
                                    }}>
                                      {index + 1}
                                    </span>
                                    <span className="font-semibold" style={{ color: 'var(--text-primary)' }}>{record.student_id}</span>
                                  </div>
                                </td>
                                <td className="py-4 px-6">
                                  <div className="flex items-center animate-fade-in-left" style={{ animationDelay: `${1350 + index * 100}ms` }}>
                                    <div className="w-8 h-8 rounded-full flex items-center justify-center mr-3 text-white text-sm font-bold" style={{
                                      backgroundColor: 'var(--primary-600)'
                                    }}>
                                      {record.student_name.charAt(0)}
                                    </div>
                                    <span className="font-medium" style={{ color: 'var(--text-primary)' }}>{record.student_name}</span>
                                  </div>
                                </td>
                                <td className="py-4 px-6">
                                  <div className="flex items-center animate-fade-in-left" style={{ animationDelay: `${1400 + index * 100}ms` }}>
                                    <span className="mr-2">⏰</span>
                                    <span className="font-medium" style={{ color: 'var(--primary-600)' }}>{formatTime(record.time)}</span>
                                  </div>
                                </td>
                                <td className="py-4 px-6">
                                  <span className="px-3 py-1 rounded-full text-sm font-semibold flex items-center w-fit animate-scale-in" style={{
                                    backgroundColor: 'var(--success-100)',
                                    color: 'var(--success-800)',
                                    animationDelay: `${1450 + index * 100}ms`
                                  }}>
                                    <span className="mr-1">✅</span>
                                    Present
                                  </span>
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  )}
                </>
              )}
            </div>
          )}

          {/* Student Tab */}
          {tabValue === 1 && (
            <div className="p-6">
              <div className="flex items-center mb-6">
                <span className="text-2xl mr-3">🔍</span>
                <h2 className="text-2xl font-semibold text-secondary-800">Student Analytics</h2>
              </div>
              
              <div className="pt-6 mb-6 animate-fade-in-up animate-delay-200" style={{ borderTop: '1px solid var(--border-secondary)' }}>
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4 items-end">
                  <div className="animate-fade-in-up animate-delay-300">
                    <label className="block text-sm font-medium mb-2 animate-fade-in-left animate-delay-400" style={{ color: 'var(--text-secondary)' }}>Select Student</label>
                    <select
                      value={selectedStudent}
                      onChange={(e) => setSelectedStudent(e.target.value)}
                      className="w-full px-4 py-3 rounded-xl transition-all duration-200 animate-fade-in-up animate-delay-500"
                      style={{
                        border: '2px solid var(--border-secondary)',
                        backgroundColor: 'var(--bg-primary)',
                        color: 'var(--text-primary)'
                      }}
                      onFocus={(e) => {
                        e.target.style.borderColor = 'var(--primary-500)';
                        e.target.style.boxShadow = '0 0 0 2px var(--primary-200)';
                      }}
                      onBlur={(e) => {
                        e.target.style.borderColor = 'var(--border-secondary)';
                        e.target.style.boxShadow = 'none';
                      }}
                    >
                      <option value="">
                        👥 All Students
                      </option>
                      {students.map((student) => (
                        <option key={student.student_id} value={student.student_id}>
                          {student.name} ({student.student_id})
                        </option>
                      ))}
                    </select>
                  </div>
                  <div className="animate-fade-in-up animate-delay-400">
                    <label className="block text-sm font-medium mb-2 animate-fade-in-left animate-delay-500" style={{ color: 'var(--text-secondary)' }}>Start Date</label>
                    <input
                      type="date"
                      value={startDate}
                      onChange={(e) => setStartDate(e.target.value)}
                      className="w-full px-4 py-3 rounded-xl transition-all duration-200 animate-fade-in-up animate-delay-600"
                      style={{
                        border: '2px solid var(--border-secondary)',
                        backgroundColor: 'var(--bg-primary)',
                        color: 'var(--text-primary)'
                      }}
                      onFocus={(e) => {
                        e.target.style.borderColor = 'var(--primary-500)';
                        e.target.style.boxShadow = '0 0 0 2px var(--primary-200)';
                      }}
                      onBlur={(e) => {
                        e.target.style.borderColor = 'var(--border-secondary)';
                        e.target.style.boxShadow = 'none';
                      }}
                    />
                  </div>
                  <div className="animate-fade-in-up animate-delay-500">
                    <label className="block text-sm font-medium mb-2 animate-fade-in-left animate-delay-600" style={{ color: 'var(--text-secondary)' }}>End Date</label>
                    <input
                      type="date"
                      value={endDate}
                      onChange={(e) => setEndDate(e.target.value)}
                      className="w-full px-4 py-3 rounded-xl transition-all duration-200 animate-fade-in-up animate-delay-700"
                      style={{
                        border: '2px solid var(--border-secondary)',
                        backgroundColor: 'var(--bg-primary)',
                        color: 'var(--text-primary)'
                      }}
                      onFocus={(e) => {
                        e.target.style.borderColor = 'var(--primary-500)';
                        e.target.style.boxShadow = '0 0 0 2px var(--primary-200)';
                      }}
                      onBlur={(e) => {
                        e.target.style.borderColor = 'var(--border-secondary)';
                        e.target.style.boxShadow = 'none';
                      }}
                    />
                  </div>
                  <div className="animate-fade-in-up animate-delay-600">
                    <button
                      onClick={handleStudentSearch}
                      disabled={loading || !selectedStudent}
                      className="w-full flex items-center justify-center space-x-2 disabled:opacity-50 px-6 py-3 text-white rounded-xl font-semibold transition-all duration-200 hover-lift"
                      style={{
                        background: 'linear-gradient(135deg, var(--primary-600), var(--primary-800))'
                      }}
                      onMouseEnter={(e) => {
                        if (!loading && selectedStudent) {
                          e.target.style.background = 'linear-gradient(135deg, var(--primary-700), var(--primary-900))';
                        }
                      }}
                      onMouseLeave={(e) => {
                        e.target.style.background = 'linear-gradient(135deg, var(--primary-600), var(--primary-800))';
                      }}
                    >
                      <span>🔍</span>
                      <span>Search Records</span>
                    </button>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
                  <button
                    onClick={() => exportToCSV(studentAttendance, `student_${selectedStudent}_attendance`)}
                    disabled={studentAttendance.length === 0}
                    className="flex items-center justify-center space-x-2 disabled:opacity-50 px-6 py-3 text-white rounded-xl font-semibold transition-all duration-200 hover-lift animate-fade-in-up animate-delay-700"
                    style={{
                      background: 'linear-gradient(135deg, var(--success-600), var(--success-800))'
                    }}
                    onMouseEnter={(e) => {
                      if (studentAttendance.length > 0) {
                        e.target.style.background = 'linear-gradient(135deg, var(--success-700), var(--success-900))';
                      }
                    }}
                    onMouseLeave={(e) => {
                      e.target.style.background = 'linear-gradient(135deg, var(--success-600), var(--success-800))';
                    }}
                  >
                    <span>📥</span>
                    <span>Export Student Data</span>
                  </button>
                </div>
              </div>

              {loading ? (
                <div className="rounded-xl p-12 text-center animate-fade-in-up" style={{
                  background: 'linear-gradient(135deg, var(--primary-50), var(--primary-100))'
                }}>
                  <div className="animate-spin w-16 h-16 border-4 border-t-transparent rounded-full mx-auto mb-4 animate-scale-in" style={{
                    borderColor: 'var(--primary-600)'
                  }}></div>
                  <h3 className="text-xl font-semibold mb-2 animate-fade-in-up animate-delay" style={{ color: 'var(--text-primary)' }}>Analyzing student data...</h3>
                  <p className="animate-fade-in-up animate-delay-300" style={{ color: 'var(--text-secondary)' }}>Please wait while we process the records</p>
                </div>
              ) : (
                <>
                  {selectedStudent && studentAttendance.length > 0 && (
                    <div className="rounded-xl p-6 mb-6 border-2 animate-fade-in-up animate-delay-200" style={{
                      background: `linear-gradient(135deg, var(--warning-50), var(--warning-100))`,
                      borderColor: 'var(--warning-500)'
                    }}>
                      <div className="flex items-center mb-4">
                        <div className="w-16 h-16 rounded-full flex items-center justify-center mr-4 text-2xl text-white animate-scale-in animate-delay-300" style={{
                          backgroundColor: 'var(--warning-500)'
                        }}>
                          📈
                        </div>
                        <div>
                          <h3 className="text-xl font-bold mb-1 animate-fade-in-left animate-delay-400" style={{
                            color: 'var(--warning-800)'
                          }}>Student Analytics Summary</h3>
                          <p className="animate-fade-in-left animate-delay-500" style={{
                            color: 'var(--warning-700)'
                          }}>
                            {startDate && endDate ? `${formatDate(startDate)} - ${formatDate(endDate)}` : 'All time records'}
                          </p>
                        </div>
                      </div>
                      
                      <div className="pt-4 animate-fade-in-up animate-delay-600" style={{
                        borderTop: `1px solid var(--warning-200)`
                      }}>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                          <div className="flex items-center animate-fade-in-up animate-delay-700">
                              <span className="text-2xl mr-3">📊</span>
                              <div>
                                <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>Total Records</p>
                                <p className="text-3xl font-bold animate-scale-in animate-delay-800" style={{ color: 'var(--text-primary)' }}>{studentAttendance.length}</p>
                              </div>
                            </div>
                            <div className="flex items-center animate-fade-in-up animate-delay-800">
                              <span className="text-2xl mr-3">📅</span>
                              <div>
                                <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>Days Present</p>
                                <p className="text-3xl font-bold animate-scale-in animate-delay-900" style={{ color: 'var(--text-primary)' }}>
                                  {new Set(studentAttendance.map(record => record.date)).size}
                                </p>
                              </div>
                            </div>
                        </div>
                      </div>
                    </div>
                  )}

                  {selectedStudent && studentAttendance.length === 0 ? (
                    <div className="text-center py-16 rounded-xl border-2 border-dashed animate-fade-in-up" style={{
                      background: 'linear-gradient(135deg, var(--secondary-50), var(--secondary-100))',
                      borderColor: 'var(--primary-300)'
                    }}>
                      <span className="text-8xl block mb-6 opacity-50 animate-bounce-in">👥</span>
                      <h3 className="text-xl font-semibold mb-2 animate-fade-in-up animate-delay" style={{ color: 'var(--text-primary)' }}>No Student Records</h3>
                      <p className="animate-fade-in-up animate-delay-300" style={{ color: 'var(--text-secondary)' }}>No attendance records found for this student</p>
                    </div>
                  ) : studentAttendance.length > 0 ? (
                    <div className="rounded-xl overflow-hidden animate-fade-in-up animate-delay-800" style={{
                      backgroundColor: 'var(--bg-primary)',
                      borderColor: 'var(--border-secondary)',
                      border: '2px solid'
                    }}>
                      <div className="overflow-x-auto">
                        <table className="w-full">
                          <thead>
                            <tr className="text-white" style={{
                              background: 'linear-gradient(135deg, var(--primary-600), var(--primary-800))'
                            }}>
                              <th className="text-left py-4 px-6 font-semibold animate-fade-in-up animate-delay-900">Date</th>
                              <th className="text-left py-4 px-6 font-semibold animate-fade-in-up animate-delay-1000">Student ID</th>
                              <th className="text-left py-4 px-6 font-semibold animate-fade-in-up animate-delay-1100">Student Name</th>
                              <th className="text-left py-4 px-6 font-semibold animate-fade-in-up animate-delay-1200">Time</th>
                              <th className="text-left py-4 px-6 font-semibold animate-fade-in-up animate-delay-1300">Status</th>
                            </tr>
                          </thead>
                          <tbody>
                            {studentAttendance.map((record, index) => (
                              <tr key={record.id} className={`transition-colors duration-200 hover-lift`} style={{
                                borderBottom: '1px solid var(--border-primary)',
                                backgroundColor: index % 2 === 0 ? 'var(--bg-primary)' : 'var(--bg-secondary)',
                                animationDelay: `${1400 + index * 100}ms`
                              }} onMouseEnter={(e) => e.target.closest('tr').style.backgroundColor = 'var(--primary-50)'} onMouseLeave={(e) => e.target.closest('tr').style.backgroundColor = index % 2 === 0 ? 'var(--bg-primary)' : 'var(--bg-secondary)'}>
                                <td className="py-4 px-6">
                                  <div className="flex items-center animate-fade-in-left" style={{ animationDelay: `${1400 + index * 100}ms` }}>
                                    <span className="mr-2">📅</span>
                                    <span className="font-medium" style={{ color: 'var(--text-primary)' }}>{formatDate(record.date)}</span>
                                  </div>
                                </td>
                                <td className="py-4 px-6">
                                  <div className="flex items-center animate-fade-in-left" style={{ animationDelay: `${1450 + index * 100}ms` }}>
                                    <span className="px-2 py-1 rounded-full text-xs font-semibold mr-3" style={{
                                      backgroundColor: 'var(--primary-100)',
                                      color: 'var(--primary-800)'
                                    }}>
                                      {index + 1}
                                    </span>
                                    <span className="font-semibold" style={{ color: 'var(--text-primary)' }}>{record.student_id}</span>
                                  </div>
                                </td>
                                <td className="py-4 px-6">
                                  <div className="flex items-center animate-fade-in-left" style={{ animationDelay: `${1500 + index * 100}ms` }}>
                                    <div className="w-8 h-8 rounded-full flex items-center justify-center mr-3 text-white text-sm font-bold" style={{
                                      backgroundColor: 'var(--primary-600)'
                                    }}>
                                      {record.student_name.charAt(0)}
                                    </div>
                                    <span className="font-medium" style={{ color: 'var(--text-primary)' }}>{record.student_name}</span>
                                  </div>
                                </td>
                                <td className="py-4 px-6">
                                  <div className="flex items-center animate-fade-in-left" style={{ animationDelay: `${1550 + index * 100}ms` }}>
                                    <span className="mr-2">⏰</span>
                                    <span className="font-medium" style={{ color: 'var(--primary-600)' }}>{formatTime(record.time)}</span>
                                  </div>
                                </td>
                                <td className="py-4 px-6">
                                  <span className="px-3 py-1 rounded-full text-sm font-semibold flex items-center w-fit animate-scale-in" style={{
                                    backgroundColor: 'var(--success-100)',
                                    color: 'var(--success-800)',
                                    animationDelay: `${1600 + index * 100}ms`
                                  }}>
                                    <span className="mr-1">✅</span>
                                    Present
                                  </span>
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  ) : null}
                </>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default AttendanceReports;