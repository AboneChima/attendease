# Oracle Attendance Pro

![Oracle Attendance Pro](https://img.shields.io/badge/Oracle-Attendance%20Pro-blue?style=for-the-badge&logo=oracle)
![Version](https://img.shields.io/badge/version-1.0.0-green?style=for-the-badge)
![License](https://img.shields.io/badge/license-MIT-yellow?style=for-the-badge)

## 🚀 Overview

**Oracle Attendance Pro** is an advanced, enterprise-grade attendance management system that combines cutting-edge biometric authentication with traditional QR code scanning. Built with modern web technologies, it provides comprehensive student management, real-time attendance tracking, and detailed audit trails.

## ✨ Key Features

### 🔐 Multi-Modal Authentication
- **Biometric Face Recognition** - Advanced facial recognition using face-api.js
- **QR Code Scanning** - Quick and reliable QR-based attendance
- **Secure Teacher Authentication** - JWT-based login system

### 👥 Student Management
- **Complete Student Profiles** - Comprehensive student information management
- **Real-time CRUD Operations** - Add, edit, delete, and search students
- **Biometric Enrollment** - Face encoding registration for students
- **Bulk Operations** - Efficient management of multiple student records

### 📊 Advanced Reporting & Analytics
- **Real-time Dashboard** - Live attendance statistics and insights
- **Detailed Reports** - Comprehensive attendance reports with filtering
- **Audit Trail System** - Complete logging of all system activities
- **Export Capabilities** - Data export for external analysis

### 🛡️ Security & Compliance
- **Comprehensive Audit Logging** - Track all user actions and system changes
- **Secure Data Storage** - SQLite database with proper encryption
- **Role-based Access Control** - Different access levels for teachers and admins
- **Data Integrity** - Robust validation and error handling

## 🏗️ Architecture

### Frontend (React.js)
- **Modern React 19** with functional components and hooks
- **React Router** for seamless navigation
- **Lucide React** for consistent iconography
- **Responsive Design** - Mobile-first approach
- **Theme System** - Dark/light mode support

### Backend (Node.js/Express)
- **RESTful API** design with Express.js
- **JWT Authentication** for secure sessions
- **SQLite Database** for reliable data storage
- **Comprehensive Validation** using express-validator
- **CORS Support** for cross-origin requests

### Database Schema
- **Students Table** - Complete student information
- **Daily Attendance** - Attendance records with timestamps
- **Face Encodings** - Biometric data storage
- **Attendance Audit Log** - Complete audit trail
- **Teachers Table** - Educator authentication data

## 🚀 Quick Start

### Prerequisites
- Node.js (v16 or higher)
- npm or yarn package manager
- Modern web browser with camera support

### Installation

1. **Clone the repository**
   ```bash
   git clone https://github.com/oracle/oracle-attendance-pro.git
   cd oracle-attendance-pro
   ```

2. **Install all dependencies**
   ```bash
   npm run install-all
   ```

3. **Set up environment variables**
   ```bash
   # Backend (.env)
   JWT_SECRET=your-super-secret-jwt-key
   PORT=3000
   NODE_ENV=development
   ```

4. **Start the application**
   ```bash
   npm run dev
   ```

5. **Access the application**
   - Frontend: http://localhost:3001
   - Backend API: http://localhost:3000

## 📱 Usage Guide

### For Students
1. **Registration** - Register with personal details and get a unique QR code
2. **Biometric Enrollment** - Complete face recognition setup
3. **Attendance** - Use QR code or biometric scan for attendance

### For Teachers/Admins
1. **Login** - Secure authentication with JWT tokens
2. **Dashboard** - View real-time attendance statistics
3. **Student Management** - Add, edit, delete, and search students
4. **Reports** - Generate detailed attendance reports
5. **Audit Logs** - Review system activity and changes

## 🔧 Student Management Features

### Edit/Delete Student Buttons Location
The edit and delete buttons for students are located in the **Student Management** section:

1. **Navigate to**: `/admin/students` (Students link in the navigation bar)
2. **Location**: Each student card displays:
   - **Edit Button** (✏️ Edit) - Opens edit modal for updating student information
   - **Delete Button** (🗑️ Delete) - Opens confirmation dialog for student deletion

### Student Management Actions
- **Search Students** - Real-time search by name, ID, or email
- **Edit Student** - Update name, email, phone, and other details
- **Delete Student** - Remove student and all associated data
- **View Details** - Complete student profile with registration date
- **Refresh Data** - Reload student list with latest information

## 🛠️ API Endpoints

### Student Management
- `GET /api/students` - Retrieve all students
- `POST /api/students` - Create new student
- `PUT /api/students/:id` - Update student information
- `DELETE /api/students/:id` - Delete student and associated data

### Attendance
- `POST /api/attendance/checkin` - Record attendance
- `GET /api/attendance/reports` - Generate reports
- `PUT /api/attendance/:id` - Update attendance record

### Authentication
- `POST /api/auth/login` - Teacher login
- `POST /api/auth/verify` - Verify JWT token

## 📊 Database Schema

```sql
-- Students table
CREATE TABLE students (
    student_id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    email TEXT UNIQUE,
    phone TEXT,
    qr_code_data TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Daily attendance table
CREATE TABLE daily_attendance (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    student_id TEXT,
    date TEXT,
    status TEXT DEFAULT 'present',
    check_in_time DATETIME,
    FOREIGN KEY (student_id) REFERENCES students(student_id)
);

-- Audit log table
CREATE TABLE attendance_audit_log (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    student_id TEXT,
    student_name TEXT,
    action_type TEXT,
    old_data TEXT,
    new_data TEXT,
    modified_by TEXT,
    timestamp DATETIME DEFAULT CURRENT_TIMESTAMP,
    ip_address TEXT,
    user_agent TEXT,
    reason TEXT
);
```

## 🔒 Security Features

- **JWT Authentication** - Secure token-based authentication
- **Input Validation** - Comprehensive server-side validation
- **SQL Injection Prevention** - Parameterized queries
- **CORS Configuration** - Controlled cross-origin requests
- **Audit Logging** - Complete activity tracking
- **Error Handling** - Secure error responses

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 👨‍💻 Author

**Oracle** - *Initial work and development*

## 🙏 Acknowledgments

- Face-api.js for biometric recognition
- React.js community for excellent documentation
- Express.js for robust backend framework
- SQLite for reliable data storage
- Lucide React for beautiful icons

---

**Oracle Attendance Pro** - *Revolutionizing attendance management with advanced biometric technology*