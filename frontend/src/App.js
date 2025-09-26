import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { ThemeProvider } from './contexts/ThemeContext';
import Navbar from './components/Navbar';
import Home from './pages/Home';
import StudentRegistration from './pages/StudentRegistration';
import QRScanner from './pages/QRScanner';
import TeacherLogin from './pages/TeacherLogin';
import TeacherDashboard from './pages/TeacherDashboard';
import AttendanceReports from './pages/AttendanceReports';
import AttendanceManagement from './pages/AttendanceManagement';
import AdminDashboard from './components/AdminDashboard';
import StudentManagement from './components/StudentManagement';
import StudentFaceEnrollment from './components/StudentFaceEnrollment';
import FingerprintEnrollmentPage from './pages/FingerprintEnrollmentPage';
import BiometricEnrollmentPage from './pages/BiometricEnrollmentPage';
import './styles/theme.css';

// Check if user is authenticated
const isAuthenticated = () => {
  return localStorage.getItem('token') !== null;
};

// Protected Route component
const ProtectedRoute = ({ children }) => {
  return isAuthenticated() ? children : <Navigate to="/teacher/login" />;
};

function App() {
  return (
    <ThemeProvider>
      <Router>
        <div className="page-layout theme-transition" style={{
          backgroundColor: 'var(--bg-primary)',
          color: 'var(--text-primary)',
          minHeight: '100vh'
        }}>
          <Navbar />
          <main className="page-content theme-transition">
          <Routes>
              <Route path="/" element={<Home />} />
              <Route path="/register" element={<StudentRegistration />} />
              <Route path="/enroll-face" element={<StudentFaceEnrollment />} />
              <Route path="/enroll-fingerprint" element={<FingerprintEnrollmentPage />} />
              <Route path="/biometric-enrollment" element={<BiometricEnrollmentPage />} />
              <Route path="/qr-attendance" element={<QRScanner />} />
              <Route path="/biometric-attendance" element={<QRScanner />} />
              <Route path="/scan" element={<QRScanner />} />
              <Route path="/teacher/login" element={<TeacherLogin />} />
              <Route 
                path="/teacher/dashboard" 
                element={
                  <ProtectedRoute>
                    <TeacherDashboard />
                  </ProtectedRoute>
                } 
              />
              <Route 
                path="/teacher/reports" 
                element={
                  <ProtectedRoute>
                    <AttendanceReports />
                  </ProtectedRoute>
                } 
              />
              <Route 
                path="/teacher/attendance" 
                element={
                  <ProtectedRoute>
                    <AttendanceManagement />
                  </ProtectedRoute>
                } 
              />
              <Route 
                path="/admin/audit-logs" 
                element={
                  <ProtectedRoute>
                    <AdminDashboard />
                  </ProtectedRoute>
                } 
              />
              <Route 
                path="/admin/students" 
                element={
                  <ProtectedRoute>
                    <StudentManagement />
                  </ProtectedRoute>
                } 
              />
            </Routes>
          </main>
        </div>
      </Router>
    </ThemeProvider>
  );
}

export default App;
