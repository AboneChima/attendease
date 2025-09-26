import React, { useState } from 'react';
import axios from 'axios';

const PinFallback = ({ onAttendanceMarked }) => {
  const [studentId, setStudentId] = useState('');
  const [pin, setPin] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');

  const handlePinSubmit = async (e) => {
    e.preventDefault();
    
    if (!studentId.trim() || !pin.trim()) {
      setError('Please enter both Student ID and PIN');
      return;
    }

    setLoading(true);
    setError('');
    setMessage('');

    try {
      // First verify the PIN
      const pinResponse = await axios.post('http://localhost:5000/api/students/verify-pin', {
        student_id: studentId,
        pin: pin
      });

      if (pinResponse.data.success) {
        // PIN verified, now mark attendance
        const attendanceResponse = await axios.post('http://localhost:5000/api/attendance/record', {
          student_id: studentId
        });

        if (attendanceResponse.data) {
          setMessage('Attendance marked successfully!');
          onAttendanceMarked({
            student: {
              student_id: studentId,
              name: attendanceResponse.data.attendance.student_name
            },
            timestamp: new Date().toISOString()
          });
          
          // Clear form
          setStudentId('');
          setPin('');
        }
      }
    } catch (error) {
      console.error('PIN verification error:', error);
      if (error.response?.status === 401) {
        setError('Invalid PIN. Please try again.');
      } else if (error.response?.status === 404) {
        setError('Student not found.');
      } else if (error.response?.status === 400 && error.response?.data?.error?.includes('already recorded')) {
        setError('Attendance already recorded for today.');
      } else {
        setError('Failed to verify PIN. Please try again.');
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-md mx-auto">
      <div className="card p-6">
        <div className="text-center mb-6">
          <div className="w-16 h-16 mx-auto mb-4 rounded-full flex items-center justify-center" style={{
            backgroundColor: 'var(--primary-100)'
          }}>
            <span className="text-2xl">🔢</span>
          </div>
          <h2 className="text-2xl font-bold mb-2" style={{
            color: 'var(--text-primary)'
          }}>PIN Authentication</h2>
          <p className="text-sm" style={{
            color: 'var(--text-secondary)'
          }}>Enter your Student ID and PIN to mark attendance</p>
        </div>

        <form onSubmit={handlePinSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium mb-2" style={{
              color: 'var(--text-primary)'
            }}>Student ID</label>
            <input
              type="text"
              value={studentId}
              onChange={(e) => setStudentId(e.target.value)}
              className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2" 
              style={{
                borderColor: 'var(--border-color)',
                backgroundColor: 'var(--bg-secondary)',
                color: 'var(--text-primary)',
                focusRingColor: 'var(--primary-500)'
              }}
              placeholder="Enter your student ID"
              disabled={loading}
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-2" style={{
              color: 'var(--text-primary)'
            }}>PIN</label>
            <input
              type="password"
              value={pin}
              onChange={(e) => setPin(e.target.value)}
              className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2" 
              style={{
                borderColor: 'var(--border-color)',
                backgroundColor: 'var(--bg-secondary)',
                color: 'var(--text-primary)',
                focusRingColor: 'var(--primary-500)'
              }}
              placeholder="Enter your PIN"
              disabled={loading}
              maxLength="6"
            />
          </div>

          <button
            type="submit"
            disabled={loading || !studentId.trim() || !pin.trim()}
            className="w-full py-3 px-4 rounded-lg font-medium transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
            style={{
              backgroundColor: loading ? 'var(--gray-400)' : 'var(--primary-600)',
              color: 'white'
            }}
          >
            {loading ? (
              <div className="flex items-center justify-center">
                <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white mr-2"></div>
                Verifying...
              </div>
            ) : (
              'Mark Attendance'
            )}
          </button>
        </form>

        {error && (
          <div className="mt-4 p-3 rounded-lg" style={{
            backgroundColor: 'var(--error-50)',
            borderColor: 'var(--error-200)',
            border: '1px solid'
          }}>
            <p className="text-sm" style={{
              color: 'var(--error-700)'
            }}>{error}</p>
          </div>
        )}

        {message && (
          <div className="mt-4 p-3 rounded-lg" style={{
            backgroundColor: 'var(--success-50)',
            borderColor: 'var(--success-200)',
            border: '1px solid'
          }}>
            <p className="text-sm" style={{
              color: 'var(--success-700)'
            }}>{message}</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default PinFallback;