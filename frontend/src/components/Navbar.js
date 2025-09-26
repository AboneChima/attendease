import React, { useState } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useTheme } from '../contexts/ThemeContext';
import { 
  Home, 
  UserPlus, 
  QrCode, 
  BarChart3, 
  TrendingUp, 
  LogOut, 
  LogIn, 
  Sun, 
  Moon, 
  Menu, 
  X,
  GraduationCap,
  Fingerprint,
  Shield,
  Users
} from 'lucide-react';

const Navbar = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const { isDarkMode, toggleTheme, isAnimating } = useTheme();
  const isAuthenticated = localStorage.getItem('token') !== null;
  const teacher = JSON.parse(localStorage.getItem('teacher') || '{}');

  const handleLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('teacher');
    navigate('/');
    setMobileMenuOpen(false);
  };

  const toggleMobileMenu = () => {
    setMobileMenuOpen(!mobileMenuOpen);
  };

  const closeMobileMenu = () => {
    setMobileMenuOpen(false);
  };

  const isActivePath = (path) => {
    return location.pathname === path;
  };

  const navItems = [
    { label: 'Home', path: '/', icon: Home },
    { label: 'Register Student', path: '/register', icon: UserPlus },
    { label: 'Biometric Enrollment', path: '/biometric-enrollment', icon: Fingerprint },
    { label: 'QR Attendance', path: '/qr-attendance', icon: QrCode },
    { label: 'Biometric Attendance', path: '/biometric-attendance', icon: QrCode },
  ];

  const teacherNavItems = [
    { label: 'Dashboard', path: '/teacher/dashboard', icon: BarChart3 },
    { label: 'Reports', path: '/teacher/reports', icon: TrendingUp },
    { label: 'Attendance', path: '/teacher/attendance', icon: QrCode },
    { label: 'Students', path: '/admin/students', icon: Users },
    { label: 'Audit Logs', path: '/admin/audit-logs', icon: Shield },
  ];

  return (
    <nav className="nav-layout theme-transition" style={{
      backgroundColor: 'var(--bg-primary)',
      borderBottom: '1px solid var(--border-primary)',
      boxShadow: 'var(--shadow-sm)'
    }}>
      <div className="nav-content">
        {/* Logo/Brand */}
        <Link to="/" className="nav-brand flex items-center space-x-2 theme-transition hover:scale-105 transition-transform duration-300 flex-shrink-0" style={{
          color: 'var(--text-primary)'
        }}>
          <div className="p-2 rounded-lg" style={{
            background: 'linear-gradient(135deg, var(--primary-500), var(--primary-600))',
            color: 'white'
          }}>
            <GraduationCap size={20} />
          </div>
          <span className="font-bold text-lg bg-gradient-to-r from-primary-600 to-primary-700 bg-clip-text text-transparent hidden sm:block">
            AttendEase
          </span>
        </Link>



        {/* Desktop Navigation - Centered */}
        <div className="nav-menu hidden lg:flex items-center justify-center flex-1 mx-8">
          <div className="flex items-center space-x-1">
            {/* Show only essential nav items for non-authenticated users */}
            {!isAuthenticated ? (
              <>
                <Link
                  to="/"
                  className={`nav-link flex items-center space-x-1 px-3 py-2 rounded-lg transition-all duration-300 hover:scale-105 text-sm ${
                    isActivePath('/') ? 'nav-link-active' : ''
                  }`}
                  style={{
                    backgroundColor: isActivePath('/') ? 'var(--primary-100)' : 'transparent',
                    color: isActivePath('/') ? 'var(--primary-700)' : 'var(--text-primary)',
                    border: isActivePath('/') ? '1px solid var(--primary-200)' : '1px solid transparent'
                  }}
                >
                  <Home size={14} />
                  <span className="font-medium">Home</span>
                </Link>
                <Link
                  to="/qr-attendance"
                  className={`nav-link flex items-center space-x-1 px-3 py-2 rounded-lg transition-all duration-300 hover:scale-105 text-sm ${
                    isActivePath('/qr-attendance') ? 'nav-link-active' : ''
                  }`}
                  style={{
                    backgroundColor: isActivePath('/qr-attendance') ? 'var(--primary-100)' : 'transparent',
                    color: isActivePath('/qr-attendance') ? 'var(--primary-700)' : 'var(--text-primary)',
                    border: isActivePath('/qr-attendance') ? '1px solid var(--primary-200)' : '1px solid transparent'
                  }}
                >
                  <QrCode size={14} />
                  <span className="font-medium">Attendance</span>
                </Link>
                <Link
                  to="/biometric-enrollment"
                  className={`nav-link flex items-center space-x-1 px-3 py-2 rounded-lg transition-all duration-300 hover:scale-105 text-sm ${
                    isActivePath('/biometric-enrollment') ? 'nav-link-active' : ''
                  }`}
                  style={{
                    backgroundColor: isActivePath('/biometric-enrollment') ? 'var(--primary-100)' : 'transparent',
                    color: isActivePath('/biometric-enrollment') ? 'var(--primary-700)' : 'var(--text-primary)',
                    border: isActivePath('/biometric-enrollment') ? '1px solid var(--primary-200)' : '1px solid transparent'
                  }}
                >
                  <Fingerprint size={14} />
                  <span className="font-medium">Enroll</span>
                </Link>
              </>
            ) : (
              <>
                {/* Teacher navigation items */}
                {teacherNavItems.map((item) => {
                  const IconComponent = item.icon;
                  return (
                    <Link
                      key={item.path}
                      to={item.path}
                      className={`nav-link flex items-center space-x-1 px-3 py-2 rounded-lg transition-all duration-300 hover:scale-105 text-sm ${
                        isActivePath(item.path) ? 'nav-link-active' : ''
                      }`}
                      style={{
                        backgroundColor: isActivePath(item.path) ? 'var(--primary-100)' : 'transparent',
                        color: isActivePath(item.path) ? 'var(--primary-700)' : 'var(--text-primary)',
                        border: isActivePath(item.path) ? '1px solid var(--primary-200)' : '1px solid transparent'
                      }}
                    >
                      <IconComponent size={14} />
                      <span className="font-medium">{item.label}</span>
                    </Link>
                  );
                })}
              </>
            )}
          </div>
        </div>

        {/* Right Side Controls */}
        <div className="flex items-center space-x-3">
          {/* Theme Toggle */}
          <button
            onClick={toggleTheme}
            className={`p-2 rounded-lg transition-all duration-300 hover:scale-110 focus:outline-none ${
              isAnimating ? 'theme-toggle-animation' : ''
            }`}
            style={{
              backgroundColor: 'var(--bg-secondary)',
              color: 'var(--text-primary)',
              border: '1px solid var(--border-primary)',
              outline: 'none'
            }}
            aria-label={`Switch to ${isDarkMode ? 'light' : 'dark'} mode`}
          >
            {isDarkMode ? <Sun size={18} /> : <Moon size={18} />}
          </button>

          {/* Authentication Controls */}
          {isAuthenticated ? (
            <button
              onClick={handleLogout}
              className="flex items-center space-x-1 px-3 py-2 rounded-lg transition-all duration-300 hover:scale-105 font-medium text-sm"
              style={{
                backgroundColor: 'var(--error-50)',
                color: 'var(--error-700)',
                border: '1px solid var(--error-200)'
              }}
              onMouseEnter={(e) => {
                e.target.style.backgroundColor = 'var(--error-100)';
              }}
              onMouseLeave={(e) => {
                e.target.style.backgroundColor = 'var(--error-50)';
              }}
            >
              <LogOut size={14} />
              <span>Logout</span>
            </button>
          ) : (
            <Link
              to="/teacher/login"
              className={`flex items-center space-x-1 px-3 py-2 rounded-lg transition-all duration-300 hover:scale-105 font-medium text-sm ${
                isActivePath('/teacher/login') ? 'bg-primary-700' : ''
              }`}
              style={{
                background: 'linear-gradient(135deg, var(--primary-500), var(--primary-600))',
                color: 'white',
                border: '1px solid var(--primary-600)'
              }}
            >
              <LogIn size={14} />
              <span>Login</span>
            </Link>
          )}
        </div>

        {/* Mobile Controls */}
        <div className="flex items-center space-x-3 md:hidden">
          {/* Mobile Theme Toggle */}
          <button
            onClick={toggleTheme}
            className={`p-2.5 rounded-lg transition-all duration-300 hover:scale-110 focus:outline-none ${
              isAnimating ? 'theme-toggle-animation' : ''
            }`}
            style={{
              backgroundColor: 'var(--bg-secondary)',
              color: 'var(--text-primary)',
              border: '1px solid var(--border-primary)',
              outline: 'none'
            }}
            aria-label={`Switch to ${isDarkMode ? 'light' : 'dark'} mode`}
          >
            {isDarkMode ? <Sun size={20} /> : <Moon size={20} />}
          </button>
          
          {/* Mobile Menu Button */}
          <button
            className="p-2.5 rounded-lg transition-all duration-300 focus:outline-none hover:scale-110"
            onClick={toggleMobileMenu}
            style={{
              backgroundColor: 'var(--bg-secondary)',
              color: 'var(--text-primary)',
              border: '1px solid var(--border-primary)',
              outline: 'none'
            }}
          >
            {mobileMenuOpen ? <X size={20} /> : <Menu size={20} />}
          </button>
        </div>


      </div>

      {/* Mobile Menu */}
      {mobileMenuOpen && (
        <div className="md:hidden theme-transition animate-slide-in-up" style={{
          backgroundColor: 'var(--bg-primary)',
          borderTop: '1px solid var(--border-primary)',
          boxShadow: 'var(--shadow-lg)'
        }}>
          <div className="px-4 py-2 space-y-2">
            {/* Navigation Items */}
            {isAuthenticated ? (
              <>
                {/* Authenticated Navigation */}
                {[...navItems, ...teacherNavItems].map((item) => {
                  const IconComponent = item.icon;
                  return (
                    <Link
                      key={item.path}
                      to={item.path}
                      onClick={closeMobileMenu}
                      className={`flex items-center space-x-3 px-3 py-3 rounded-lg text-base font-medium transition-all duration-200 ${
                        isActivePath(item.path) ? 'font-semibold' : ''
                      }`}
                      style={{
                        backgroundColor: isActivePath(item.path) ? 'var(--primary-100)' : 'transparent',
                        color: isActivePath(item.path) ? 'var(--primary-700)' : 'var(--text-primary)',
                        border: isActivePath(item.path) ? '1px solid var(--primary-200)' : '1px solid transparent'
                      }}
                    >
                      <IconComponent size={18} />
                      <span>{item.label}</span>
                    </Link>
                  );
                })}
                
                {/* User Info and Logout */}
                <div className="pt-3 mt-3" style={{
                  borderTop: '1px solid var(--border-primary)'
                }}>
                  {teacher.name && (
                    <div className="px-3 py-2 text-sm font-medium" style={{
                      color: 'var(--text-secondary)'
                    }}>
                      Welcome, {teacher.name}
                    </div>
                  )}
                  <button
                    onClick={handleLogout}
                    className="w-full flex items-center space-x-3 px-3 py-3 rounded-lg text-base font-medium transition-all duration-200 hover:scale-105"
                    style={{
                      backgroundColor: 'var(--error-50)',
                      color: 'var(--error-700)',
                      border: '1px solid var(--error-200)'
                    }}
                  >
                    <LogOut size={18} />
                    <span>Logout</span>
                  </button>
                </div>
              </>
            ) : (
              <>
                {/* Non-authenticated Navigation */}
                {navItems.map((item) => {
                  const IconComponent = item.icon;
                  return (
                    <Link
                      key={item.path}
                      to={item.path}
                      onClick={closeMobileMenu}
                      className={`flex items-center space-x-3 px-3 py-3 rounded-lg text-base font-medium transition-all duration-200 ${
                        isActivePath(item.path) ? 'font-semibold' : ''
                      }`}
                      style={{
                        backgroundColor: isActivePath(item.path) ? 'var(--primary-100)' : 'transparent',
                        color: isActivePath(item.path) ? 'var(--primary-700)' : 'var(--text-primary)',
                        border: isActivePath(item.path) ? '1px solid var(--primary-200)' : '1px solid transparent'
                      }}
                    >
                      <IconComponent size={18} />
                      <span>{item.label}</span>
                    </Link>
                  );
                })}
                
                {/* Login Button */}
                <div className="pt-3 mt-3" style={{
                  borderTop: '1px solid var(--border-primary)'
                }}>
                  <Link
                    to="/teacher/login"
                    onClick={closeMobileMenu}
                    className={`flex items-center justify-center space-x-2 px-4 py-3 rounded-lg text-base font-medium transition-all duration-200 ${
                      isActivePath('/teacher/login') ? 'font-semibold' : ''
                    }`}
                    style={{
                      background: 'linear-gradient(135deg, var(--primary-500), var(--primary-600))',
                      color: 'white',
                      border: '1px solid var(--primary-600)'
                    }}
                  >
                    <LogIn size={18} />
                    <span>Login</span>
                  </Link>
                </div>
              </>
            )}
          </div>
        </div>
      )}
    </nav>
  );
};

export default Navbar;