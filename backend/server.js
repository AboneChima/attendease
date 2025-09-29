// Add comprehensive error handling and logging
console.log('🚀 Starting AttendEase Backend Server...');
console.log('📍 Node.js version:', process.version);
console.log('📍 Environment:', process.env.NODE_ENV || 'development');
console.log('📍 Port:', process.env.PORT || 5000);

// Handle uncaught exceptions
process.on('uncaughtException', (error) => {
  console.error('💥 Uncaught Exception:', error.message);
  console.error('Stack trace:', error.stack);
  process.exit(1);
});

// Handle unhandled promise rejections
process.on('unhandledRejection', (reason, promise) => {
  console.error('💥 Unhandled Rejection at:', promise);
  console.error('Reason:', reason);
  process.exit(1);
});

console.log('✅ Error handlers set up');

const express = require('express');
const cors = require('cors');
const path = require('path');
require('dotenv').config();

console.log('✅ Basic modules loaded');

console.log('📦 Loading database modules...');
const { testConnection: testMySQLConnection } = require('./config/database');
const { testConnection: testSQLiteConnection, initDatabase } = require('./config/sqlite-database');
const { setupAttendanceManagement } = require('./database/setup-attendance-management');
console.log('✅ Database modules loaded');

console.log('📦 Loading daily reset module...');
const { scheduleDailyReset, performDailyReset } = require('./scripts/daily-attendance-reset');
console.log('✅ Daily reset module loaded');

console.log('📦 Loading route modules...');
const studentRoutes = require('./routes/students');
const teacherRoutes = require('./routes/teachers');
const attendanceRoutes = require('./routes/attendance');
const attendanceManagementRoutes = require('./routes/attendance-management');
const enhancedFaceEnrollmentRoutes = require('./routes/enhancedFaceEnrollment');
const enhancedFaceVerificationRoutes = require('./routes/enhancedFaceVerification');
const enrollmentStatusRoutes = require('./routes/enrollment-status');
const databaseInitRoutes = require('./routes/database-init');
console.log('✅ Route modules loaded');

console.log('🔧 Setting up Express app...');
const app = express();
const PORT = process.env.PORT || 5000;

console.log('🔧 Configuring middleware...');
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Serve static files (for QR codes)
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));
console.log('✅ Middleware configured');

console.log('🔧 Setting up routes...');
app.use('/api/students', studentRoutes);
app.use('/api/teachers', teacherRoutes);
app.use('/api/attendance', attendanceRoutes);
app.use('/api/attendance-management', attendanceManagementRoutes);
app.use('/api/face/enrollment', enhancedFaceEnrollmentRoutes);
app.use('/api/face/verification', enhancedFaceVerificationRoutes);
app.use('/api/enrollment-status', enrollmentStatusRoutes);
app.use('/api/database', databaseInitRoutes);
console.log('✅ Routes configured');

// Health check endpoint
app.get('/api/health', (req, res) => {
  res.json({ status: 'OK', message: 'QR Attendance System API is running' });
});

// Diagnostic endpoint to check environment configuration
app.get('/api/diagnostic', (req, res) => {
  res.json({
    status: 'OK',
    environment: process.env.NODE_ENV || 'development',
    database_configured: !!process.env.DATABASE_URL,
    jwt_secret_configured: !!process.env.JWT_SECRET,
    port: process.env.PORT || 5000,
    database_type: process.env.DATABASE_URL ? 'PostgreSQL' : (process.env.DB_HOST ? 'MySQL' : 'SQLite')
  });
});

// Test endpoint to check teacher retrieval
app.get('/api/test-teacher', async (req, res) => {
  try {
    const { dbAdapter } = require('./config/database-adapter');
    await dbAdapter.initialize();
    
    const [teachers] = await dbAdapter.execute(
      'SELECT id, teacher_id, name, email FROM teachers WHERE email = ?',
      ['admin@school.com']
    );
    
    res.json({
      status: 'OK',
      teacher_found: teachers.length > 0,
      teacher_count: teachers.length,
      teacher_data: teachers.length > 0 ? teachers[0] : null
    });
  } catch (error) {
    res.status(500).json({
      status: 'ERROR',
      error: error.message
    });
  }
});

// Error handling middleware
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ error: 'Something went wrong!' });
});

// 404 handler
app.use('*', (req, res) => {
  res.status(404).json({ error: 'Route not found' });
});

// Start server
console.log('🚀 Starting server...');
app.listen(PORT, async () => {
  console.log(`🎉 Server successfully started on port ${PORT}`);
  console.log(`📍 Server URL: http://localhost:${PORT}`);
  console.log('🔍 Checking database configuration...');
  
  try {
    // Check if PostgreSQL is configured first
    if (process.env.DATABASE_URL) {
      console.log('🐘 PostgreSQL DATABASE_URL detected, using PostgreSQL...');
      console.log('📦 Loading database adapter...');
      const { dbAdapter } = require('./config/database-adapter');
      console.log('🔌 Initializing PostgreSQL connection...');
      await dbAdapter.initialize();
      console.log('✅ PostgreSQL database connected successfully');
      
      // Initialize daily attendance reset scheduler
      console.log('\n🕐 Initializing daily attendance reset scheduler...');
      try {
        console.log('📅 Setting up daily reset schedule...');
        scheduleDailyReset();
        console.log('✅ Daily reset scheduler started successfully!');
        
        // Perform initial reset if needed (for today) - temporarily disabled for debugging
        // const today = new Date().toISOString().split('T')[0];
        // console.log(`🔄 Checking if daily reset is needed for ${today}...`);
        // await performDailyReset();
        console.log('ℹ️ Initial daily reset is temporarily disabled for debugging');
      } catch (resetError) {
        console.error('⚠️ Warning: Daily reset scheduler failed to initialize:', resetError.message);
        console.error('Reset error stack:', resetError.stack);
        console.log('📝 Attendance management will still work, but automatic daily resets may not occur.');
      }
      
    } else {
      // Try MySQL first, then SQLite
      console.log('🔍 No PostgreSQL DATABASE_URL found, trying MySQL...');
      try {
        console.log('🐬 Testing MySQL connection...');
        await testMySQLConnection();
        console.log('✅ Using MySQL database');
        process.env.DB_TYPE = 'mysql';
      } catch (error) {
        console.log('❌ MySQL not available, switching to SQLite...');
        console.log('MySQL error:', error.message);
        try {
          console.log('📁 Initializing SQLite database...');
          await initDatabase();
          console.log('🔧 Setting up attendance management tables...');
          await setupAttendanceManagement(); // Setup attendance management tables
          console.log('🧪 Testing SQLite connection...');
          await testSQLiteConnection();
          console.log('✅ Using SQLite database');
          process.env.DB_TYPE = 'sqlite';
          
          // Initialize daily attendance reset scheduler
          console.log('\n🕐 Initializing daily attendance reset scheduler...');
          try {
            scheduleDailyReset();
            console.log('✅ Daily reset scheduler started successfully!');
            
            // Perform initial reset if needed (for today) - temporarily disabled for debugging
            // const today = new Date().toISOString().split('T')[0];
            // console.log(`🔄 Checking if daily reset is needed for ${today}...`);
            // await performDailyReset();
          } catch (resetError) {
            console.error('⚠️ Warning: Daily reset scheduler failed to initialize:', resetError.message);
            console.log('📝 Attendance management will still work, but automatic daily resets may not occur.');
          }
          
        } catch (sqliteError) {
          console.error('Both MySQL and SQLite failed:', sqliteError.message);
          process.exit(1);
        }
      }
    }
  } catch (postgresError) {
    console.error('❌ PostgreSQL connection failed:', postgresError.message);
    console.error('PostgreSQL error stack:', postgresError.stack);
    console.log('🔄 Falling back to MySQL/SQLite...');
    
    try {
      // Try MySQL first
      console.log('🐬 Testing MySQL connection as fallback...');
      await testMySQLConnection();
      console.log('✅ Using MySQL database as fallback');
      process.env.DB_TYPE = 'mysql';
    } catch (error) {
      console.log('❌ MySQL fallback not available, switching to SQLite...');
      console.log('MySQL fallback error:', error.message);
      try {
        console.log('📁 Initializing SQLite database as final fallback...');
        await initDatabase();
        console.log('🔧 Setting up attendance management tables...');
        await setupAttendanceManagement(); // Setup attendance management tables
        console.log('🧪 Testing SQLite connection...');
        await testSQLiteConnection();
        console.log('✅ Using SQLite database as final fallback');
        process.env.DB_TYPE = 'sqlite';
      } catch (sqliteError) {
        console.error('💥 CRITICAL: All database connections failed!');
        console.error('SQLite error:', sqliteError.message);
        console.error('SQLite error stack:', sqliteError.stack);
        console.error('🚨 Server cannot start without a database connection');
        process.exit(1);
      }
    }
  }
  
  console.log('\n🎉 ===== SERVER STARTUP COMPLETE =====');
  console.log(`✅ AttendEase Backend is running successfully!`);
  console.log(`🌐 Health check: http://localhost:${PORT}/api/health`);
  console.log(`📊 Database type: ${process.env.DB_TYPE || 'unknown'}`);
  console.log('=====================================\n');
});