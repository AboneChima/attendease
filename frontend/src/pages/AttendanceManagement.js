import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { Calendar, Users, Clock, CheckCircle, XCircle, AlertCircle, RefreshCw, BarChart3, History } from 'lucide-react';

const API_BASE_URL = 'http://localhost:5000/api';

const AttendanceManagement = () => {
  const [attendanceData, setAttendanceData] = useState([]);
  const [summary, setSummary] = useState(null);
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [refreshing, setRefreshing] = useState(false);
  const [updatingStatus, setUpdatingStatus] = useState(null);

  const token = localStorage.getItem('token');

  useEffect(() => {
    fetchAttendanceData();
  }, [selectedDate]);

  const fetchAttendanceData = async () => {
    try {
      setLoading(true);
      setError(null);
      
      const headers = {
        'Authorization': `Bearer ${token}`
      };

      const response = await axios.get(
        `${API_BASE_URL}/attendance-management/daily/${selectedDate}`,
        { headers }
      );

      setAttendanceData(response.data.students);
      setSummary(response.data.summary);
    } catch (error) {
      console.error('Error fetching attendance data:', error);
      setError('Failed to load attendance data');
    } finally {
      setLoading(false);
    }
  };

  const handleRefresh = async () => {
    setRefreshing(true);
    await fetchAttendanceData();
    setRefreshing(false);
  };

  const handleStatusUpdate = async (studentId, newStatus) => {
    try {
      // Find student name for confirmation dialog
      const student = attendanceData.find(s => s.student_id === studentId);
      const studentName = student ? student.student_name : studentId;
      const currentStatus = student ? student.status : 'unknown';
      
      // Show confirmation dialog
      const confirmed = window.confirm(
        `Are you sure you want to change ${studentName}'s attendance status from "${currentStatus}" to "${newStatus}"?\n\n` +
        `This action will be logged for audit purposes.`
      );
      
      if (!confirmed) {
        return;
      }
      
      // Prompt for reason (required for manual changes)
      const reason = window.prompt(
        `Please provide a reason for changing ${studentName}'s attendance status:\n\n` +
        `From: ${currentStatus}\nTo: ${newStatus}\n\n` +
        `Reason (required):`,
        ''
      );
      
      if (reason === null) {
        // User cancelled
        return;
      }
      
      if (!reason.trim()) {
        alert('A reason is required for manual attendance changes.');
        return;
      }
      
      setUpdatingStatus(studentId);
      
      const headers = {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      };

      const response = await axios.put(
        `${API_BASE_URL}/attendance-management/update-status`,
        {
          student_id: studentId,
          date: selectedDate,
          status: newStatus,
          reason: reason.trim()
        },
        { headers }
      );
      
      // Show success message with audit info
      if (response.data.success && response.data.changes) {
        const changes = response.data.changes;
        alert(
          `✅ Attendance Updated Successfully\n\n` +
          `Student: ${studentName}\n` +
          `Status changed: ${changes.old_status} → ${changes.new_status}\n` +
          `Modified by: ${changes.modified_by}\n` +
          `Time: ${new Date(changes.timestamp).toLocaleString()}\n` +
          `Reason: ${reason}`
        );
      }

      // Refresh data after update
      await fetchAttendanceData();
    } catch (error) {
      console.error('Error updating status:', error);
      
      // Handle specific error codes
      if (error.response?.data?.code) {
        const errorCode = error.response.data.code;
        const errorMessage = error.response.data.error;
        
        switch (errorCode) {
          case 'INSUFFICIENT_PERMISSIONS':
            alert('❌ Access Denied\n\nYou do not have permission to modify attendance records.');
            break;
          case 'TIME_RESTRICTION_VIOLATED':
            const details = error.response.data.details;
            alert(
              `❌ Time Restriction Violated\n\n` +
              `Cannot modify attendance for dates older than ${details.timeLimitHours} hours.\n` +
              `Target date: ${details.targetDate}\n` +
              `Hours since date: ${details.hoursSinceDate}`
            );
            break;
          case 'DAILY_LIMIT_EXCEEDED':
            alert('❌ Daily Limit Exceeded\n\nYou have reached the maximum number of manual attendance modifications allowed per day.');
            break;
          case 'REASON_REQUIRED':
            alert('❌ Reason Required\n\nA reason must be provided for manual attendance changes.');
            break;
          case 'USER_NOT_FOUND':
            alert('❌ User Not Found\n\nYour user account is not properly configured in the system.');
            break;
          default:
            alert(`❌ Error: ${errorMessage}`);
        }
      } else {
        setError('Failed to update attendance status');
      }
    } finally {
      setUpdatingStatus(null);
    }
  };

  const handleFinalizeDayAttendance = async () => {
    try {
      setRefreshing(true);
      
      const headers = {
        'Authorization': `Bearer ${token}`
      };

      await axios.post(
        `${API_BASE_URL}/attendance-management/finalize/${selectedDate}`,
        {},
        { headers }
      );

      await fetchAttendanceData();
    } catch (error) {
      console.error('Error finalizing attendance:', error);
      setError('Failed to finalize attendance');
    } finally {
      setRefreshing(false);
    }
  };

  const getStatusIcon = (status) => {
    switch (status) {
      case 'present':
        return <CheckCircle className="w-6 h-6 text-green-500" />;
      case 'absent':
        return <XCircle className="w-6 h-6 text-red-500" />;
      case 'not_yet_here':
        return <AlertCircle className="w-6 h-6 text-yellow-500" />;
      default:
        return <AlertCircle className="w-6 h-6 text-gray-400" />;
    }
  };

  const getStatusText = (status) => {
    switch (status) {
      case 'present':
        return 'Present 🎉';
      case 'absent':
        return 'Absent 😔';
      case 'not_yet_here':
        return 'Not Yet Here ⏰';
      default:
        return 'Unknown';
    }
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'present':
        return 'var(--success-100)';
      case 'absent':
        return 'var(--error-100)';
      case 'not_yet_here':
        return 'var(--warning-100)';
      default:
        return 'var(--bg-secondary)';
    }
  };

  const getStatusTextColor = (status) => {
    switch (status) {
      case 'present':
        return 'var(--success-800)';
      case 'absent':
        return 'var(--error-800)';
      case 'not_yet_here':
        return 'var(--warning-800)';
      default:
        return 'var(--text-secondary)';
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center animate-fade-in" style={{
        background: 'linear-gradient(135deg, var(--primary-50), var(--secondary-50))'
      }}>
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-t-transparent rounded-full animate-spin mx-auto mb-4" style={{
            borderColor: 'var(--primary-500)',
            borderTopColor: 'transparent'
          }}></div>
          <p className="text-xl" style={{ color: 'var(--text-primary)' }}>Loading attendance data...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen py-8 animate-fade-in" style={{
      background: 'linear-gradient(135deg, var(--primary-50), var(--secondary-50))'
    }}>
      <div className="container mx-auto px-4 sm:px-6 lg:px-8 max-w-7xl">
        {/* Header */}
        <div className="text-center mb-8 animate-fade-in-up">
          <div className="flex items-center justify-center mb-4">
            <div className="w-16 h-16 rounded-full flex items-center justify-center mr-4 animate-bounce-in" style={{
              backgroundColor: 'var(--primary-600)',
              color: 'var(--bg-primary)'
            }}>
              <Users className="w-8 h-8" />
            </div>
            <h1 className="text-4xl font-bold" style={{ color: 'var(--text-primary)' }}>
              Attendance Management
            </h1>
          </div>
          <p className="text-xl" style={{ color: 'var(--text-secondary)' }}>
            Track and manage student attendance with real-time updates
          </p>
        </div>

        {/* Date Selector and Controls */}
        <div className="rounded-xl p-6 mb-8 animate-fade-in-up animate-delay-200" style={{
          backgroundColor: 'var(--bg-primary)',
          borderColor: 'var(--border-primary)',
          border: '2px solid',
          boxShadow: 'var(--shadow-lg)'
        }}>
          <div className="flex flex-col md:flex-row items-center justify-between gap-4">
            <div className="flex items-center gap-4">
              <Calendar className="w-6 h-6" style={{ color: 'var(--primary-600)' }} />
              <input
                type="date"
                value={selectedDate}
                onChange={(e) => setSelectedDate(e.target.value)}
                className="px-4 py-2 rounded-lg border-2 text-lg font-semibold"
                style={{
                  backgroundColor: 'var(--bg-secondary)',
                  borderColor: 'var(--border-secondary)',
                  color: 'var(--text-primary)'
                }}
              />
            </div>
            
            <div className="flex items-center gap-3">
              <button
                onClick={handleRefresh}
                disabled={refreshing}
                className="flex items-center gap-2 px-4 py-2 rounded-lg font-semibold transition-all duration-300 hover:-translate-y-1 hover:shadow-lg"
                style={{
                  backgroundColor: 'var(--primary-600)',
                  color: 'var(--bg-primary)'
                }}
              >
                <RefreshCw className={`w-4 h-4 ${refreshing ? 'animate-spin' : ''}`} />
                Refresh
              </button>
              
              <button
                onClick={handleFinalizeDayAttendance}
                disabled={refreshing}
                className="flex items-center gap-2 px-4 py-2 rounded-lg font-semibold transition-all duration-300 hover:-translate-y-1 hover:shadow-lg"
                style={{
                  backgroundColor: 'var(--secondary-600)',
                  color: 'var(--bg-primary)'
                }}
              >
                <Clock className="w-4 h-4" />
                Finalize Day
              </button>
            </div>
          </div>
        </div>

        {/* Error Message */}
        {error && (
          <div className="rounded-xl p-6 mb-8 animate-fade-in-up" style={{
            backgroundColor: 'var(--error-50)',
            borderColor: 'var(--error-500)',
            border: '2px solid'
          }}>
            <div className="flex items-center justify-center">
              <XCircle className="w-6 h-6 mr-3" style={{ color: 'var(--error-600)' }} />
              <p style={{ color: 'var(--error-700)' }}>{error}</p>
            </div>
          </div>
        )}

        {/* Summary Cards */}
        {summary && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
            <div className="rounded-xl p-6 text-center animate-fade-in-up animate-delay-300" style={{
              backgroundColor: 'var(--success-100)',
              borderColor: 'var(--success-500)',
              border: '2px solid'
            }}>
              <CheckCircle className="w-12 h-12 mx-auto mb-3" style={{ color: 'var(--success-600)' }} />
              <h3 className="text-3xl font-bold mb-2" style={{ color: 'var(--success-800)' }}>
                {summary.present_count}
              </h3>
              <p style={{ color: 'var(--success-700)' }}>Present Students</p>
            </div>
            
            <div className="rounded-xl p-6 text-center animate-fade-in-up animate-delay-400" style={{
              backgroundColor: 'var(--error-100)',
              borderColor: 'var(--error-500)',
              border: '2px solid'
            }}>
              <XCircle className="w-12 h-12 mx-auto mb-3" style={{ color: 'var(--error-600)' }} />
              <h3 className="text-3xl font-bold mb-2" style={{ color: 'var(--error-800)' }}>
                {summary.absent_count}
              </h3>
              <p style={{ color: 'var(--error-700)' }}>Absent Students</p>
            </div>
            
            <div className="rounded-xl p-6 text-center animate-fade-in-up animate-delay-500" style={{
              backgroundColor: 'var(--warning-100)',
              borderColor: 'var(--warning-500)',
              border: '2px solid'
            }}>
              <AlertCircle className="w-12 h-12 mx-auto mb-3" style={{ color: 'var(--warning-600)' }} />
              <h3 className="text-3xl font-bold mb-2" style={{ color: 'var(--warning-800)' }}>
                {summary.not_yet_here_count}
              </h3>
              <p style={{ color: 'var(--warning-700)' }}>Not Yet Here</p>
            </div>
            
            <div className="rounded-xl p-6 text-center animate-fade-in-up animate-delay-600" style={{
              backgroundColor: 'var(--primary-100)',
              borderColor: 'var(--primary-500)',
              border: '2px solid'
            }}>
              <BarChart3 className="w-12 h-12 mx-auto mb-3" style={{ color: 'var(--primary-600)' }} />
              <h3 className="text-3xl font-bold mb-2" style={{ color: 'var(--primary-800)' }}>
                {summary.attendance_rate}%
              </h3>
              <p style={{ color: 'var(--primary-700)' }}>Attendance Rate</p>
            </div>
          </div>
        )}

        {/* Students List */}
        <div className="rounded-xl overflow-hidden animate-fade-in-up animate-delay-700" style={{
          backgroundColor: 'var(--bg-primary)',
          borderColor: 'var(--border-primary)',
          border: '2px solid',
          boxShadow: 'var(--shadow-lg)'
        }}>
          <div className="p-6 border-b-2" style={{ borderColor: 'var(--border-secondary)' }}>
            <div className="flex items-center justify-between">
              <h2 className="text-2xl font-bold flex items-center gap-3" style={{ color: 'var(--text-primary)' }}>
                <Users className="w-8 h-8" style={{ color: 'var(--primary-600)' }} />
                Student Attendance List
              </h2>
              <span className="px-4 py-2 rounded-full text-sm font-semibold" style={{
                backgroundColor: 'var(--primary-100)',
                color: 'var(--primary-800)'
              }}>
                {attendanceData.length} Students
              </span>
            </div>
          </div>
          
          {attendanceData.length === 0 ? (
            <div className="text-center py-16">
              <Users className="w-24 h-24 mx-auto mb-6 opacity-50" style={{ color: 'var(--text-secondary)' }} />
              <h3 className="text-xl font-semibold mb-2" style={{ color: 'var(--text-primary)' }}>
                No students found
              </h3>
              <p style={{ color: 'var(--text-secondary)' }}>
                No students are enrolled in the system for the selected date
              </p>
            </div>
          ) : (
            <div className="divide-y-2" style={{ borderColor: 'var(--border-secondary)' }}>
              {attendanceData.map((student, index) => (
                <div
                  key={student.student_id}
                  className="p-6 hover-lift transition-all duration-300 animate-fade-in-up"
                  style={{
                    animationDelay: `${800 + index * 100}ms`,
                    backgroundColor: getStatusColor(student.status)
                  }}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-4">
                      <div className="w-12 h-12 rounded-full flex items-center justify-center" style={{
                        backgroundColor: 'var(--bg-primary)',
                        border: '3px solid var(--primary-500)'
                      }}>
                        <span className="text-lg font-bold" style={{ color: 'var(--primary-600)' }}>
                          {student.student_name.charAt(0).toUpperCase()}
                        </span>
                      </div>
                      
                      <div>
                        <h3 className="text-xl font-semibold" style={{ color: 'var(--text-primary)' }}>
                          {student.student_name}
                        </h3>
                        <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>
                          ID: {student.student_id}
                        </p>
                        {student.check_in_time && (
                          <p className="text-sm flex items-center gap-1 mt-1" style={{ color: 'var(--text-secondary)' }}>
                            <Clock className="w-4 h-4" />
                            Checked in at {student.check_in_time}
                          </p>
                        )}
                      </div>
                    </div>
                    
                    <div className="flex items-center gap-4">
                      <div className="flex items-center gap-2">
                        {getStatusIcon(student.status)}
                        <span className="text-lg font-semibold" style={{ color: getStatusTextColor(student.status) }}>
                          {getStatusText(student.status)}
                        </span>
                      </div>
                      
                      {/* Status Update Buttons */}
                      <div className="flex gap-2">
                        {student.status !== 'present' && (
                          <button
                            onClick={() => handleStatusUpdate(student.student_id, 'present')}
                            disabled={updatingStatus === student.student_id}
                            className="px-3 py-1 rounded-lg text-sm font-semibold transition-all duration-300 hover:-translate-y-1 hover:shadow-md"
                            style={{
                              backgroundColor: 'var(--success-600)',
                              color: 'var(--bg-primary)'
                            }}
                          >
                            Mark Present
                          </button>
                        )}
                        
                        {student.status !== 'absent' && (
                          <button
                            onClick={() => handleStatusUpdate(student.student_id, 'absent')}
                            disabled={updatingStatus === student.student_id}
                            className="px-3 py-1 rounded-lg text-sm font-semibold transition-all duration-300 hover:-translate-y-1 hover:shadow-md"
                            style={{
                              backgroundColor: 'var(--error-600)',
                              color: 'var(--bg-primary)'
                            }}
                          >
                            Mark Absent
                          </button>
                        )}
                        
                        {student.status !== 'not_yet_here' && (
                          <button
                            onClick={() => handleStatusUpdate(student.student_id, 'not_yet_here')}
                            disabled={updatingStatus === student.student_id}
                            className="px-3 py-1 rounded-lg text-sm font-semibold transition-all duration-300 hover:-translate-y-1 hover:shadow-md"
                            style={{
                              backgroundColor: 'var(--warning-600)',
                              color: 'var(--bg-primary)'
                            }}
                          >
                            Reset Status
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
        
        {/* Info Section */}
        <div className="mt-8 rounded-xl p-6 animate-fade-in-up animate-delay-1000" style={{
          backgroundColor: 'var(--bg-primary)',
          borderColor: 'var(--border-primary)',
          border: '2px solid'
        }}>
          <div className="flex items-center gap-3 mb-4">
            <History className="w-6 h-6" style={{ color: 'var(--primary-600)' }} />
            <h3 className="text-xl font-semibold" style={{ color: 'var(--text-primary)' }}>
              How It Works
            </h3>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm" style={{ color: 'var(--text-secondary)' }}>
            <div className="flex items-start gap-2">
              <span className="text-2xl">🌅</span>
              <div>
                <p className="font-semibold">Daily Reset:</p>
                <p>Attendance resets every 24 hours with all students marked as "Not Yet Here"</p>
              </div>
            </div>
            <div className="flex items-start gap-2">
              <span className="text-2xl">📱</span>
              <div>
                <p className="font-semibold">Auto Update:</p>
                <p>When students scan QR codes, their status automatically changes to "Present"</p>
              </div>
            </div>
            <div className="flex items-start gap-2">
              <span className="text-2xl">📊</span>
              <div>
                <p className="font-semibold">Historical Records:</p>
                <p>Previous day's attendance is saved for reporting and analytics</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AttendanceManagement;