const sqlite3 = require('sqlite3').verbose();
const { open } = require('sqlite');
const path = require('path');

let db = null;

// Initialize SQLite database
const initDatabase = async () => {
  try {
    db = await open({
      filename: path.join(__dirname, '../database/attendance.db'),
      driver: sqlite3.Database
    });

    // Create tables if they don't exist
    await db.exec(`
      CREATE TABLE IF NOT EXISTS students (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        student_id TEXT UNIQUE NOT NULL,
        name TEXT NOT NULL,
        email TEXT UNIQUE NOT NULL,
        phone TEXT,
        qr_code TEXT NOT NULL,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
      );

      CREATE TABLE IF NOT EXISTS teachers (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        teacher_id TEXT UNIQUE NOT NULL,
        name TEXT NOT NULL,
        email TEXT UNIQUE NOT NULL,
        password TEXT NOT NULL,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
      );

      CREATE TABLE IF NOT EXISTS attendance (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        student_id TEXT NOT NULL,
        student_name TEXT NOT NULL,
        date DATE NOT NULL,
        time TIME NOT NULL,
        timestamp DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (student_id) REFERENCES students(student_id) ON DELETE CASCADE,
        UNIQUE(student_id, date)
      );

      -- Insert default teacher account if not exists
      INSERT OR IGNORE INTO teachers (teacher_id, name, email, password) 
      VALUES ('TEACHER001', 'Admin Teacher', 'admin@school.com', '$2a$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi');
    `);

    console.log('SQLite database initialized successfully');
    return db;
  } catch (error) {
    console.error('SQLite database initialization failed:', error.message);
    throw error;
  }
};

// Get database instance
const getDatabase = async () => {
  if (!db) {
    await initDatabase();
  }
  return db;
};

// Test database connection
const testConnection = async () => {
  try {
    const database = await getDatabase();
    console.log('SQLite database connected successfully');
  } catch (error) {
    console.error('SQLite database connection failed:', error.message);
  }
};

module.exports = { getDatabase, testConnection, initDatabase };