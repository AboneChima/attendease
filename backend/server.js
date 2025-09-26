const express = require('express');
const cors = require('cors');
const path = require('path');
require('dotenv').config();

const { testConnection: testMySQLConnection } = require('./config/database');
const { testConnection: testSQLiteConnection, initDatabase } = require('./config/sqlite-database');
const { setupAttendanceManagement } = require('./database/setup-attendance-management');
const { scheduleDailyReset, performDailyReset } = require('./scripts/daily-attendance-reset');

// Import routes
const studentRoutes = require('./routes/students');
const teacherRoutes = require('./routes/teachers');
const attendanceRoutes = require('./routes/attendance');
const attendanceManagementRoutes = require('./routes/attendance-management');

const app = express();
const PORT = process.env.PORT || 5000;

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Serve static files (for QR codes)
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// Routes
app.use('/api/students', studentRoutes);
app.use('/api/teachers', teacherRoutes);
app.use('/api/attendance', attendanceRoutes);
app.use('/api/attendance-management', attendanceManagementRoutes);

// Health check endpoint
app.get('/api/health', (req, res) => {
  res.json({ status: 'OK', message: 'QR Attendance System API is running' });
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
app.listen(PORT, async () => {
  console.log(`Server running on port ${PORT}`);
  console.log('Connecting to database...');
  
  try {
    // Try MySQL first
    await testMySQLConnection();
    console.log('Using MySQL database');
    process.env.DB_TYPE = 'mysql';
  } catch (error) {
    console.log('MySQL not available, switching to SQLite...');
    try {
      await initDatabase();
      await setupAttendanceManagement(); // Setup attendance management tables
      await testSQLiteConnection();
      console.log('Using SQLite database');
      process.env.DB_TYPE = 'sqlite';
      
      // Initialize daily attendance reset scheduler
      console.log('\n🕐 Initializing daily attendance reset scheduler...');
      try {
        scheduleDailyReset();
        console.log('✅ Daily reset scheduler started successfully!');
        
        // Perform initial reset if needed (for today)
        const today = new Date().toISOString().split('T')[0];
        console.log(`🔄 Checking if daily reset is needed for ${today}...`);
        await performDailyReset();
      } catch (resetError) {
        console.error('⚠️ Warning: Daily reset scheduler failed to initialize:', resetError.message);
        console.log('📝 Attendance management will still work, but automatic daily resets may not occur.');
      }
      
    } catch (sqliteError) {
      console.error('Both MySQL and SQLite failed:', sqliteError.message);
      process.exit(1);
    }
  }
});