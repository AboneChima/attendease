const sqlite3 = require('sqlite3').verbose();
const { open } = require('sqlite');
const path = require('path');

let db = null;

// Initialize SQLite database
const initDatabase = async () => {
  try {
    // Use environment variable for database path in production
    const dbPath = process.env.SQLITE_DB_PATH || path.join(__dirname, '../database/attendance.db');
    
    db = await open({
      filename: dbPath,
      driver: sqlite3.Database
    });

    console.log(`SQLite database initialized at: ${dbPath}`);

    // Create tables if they don't exist (Photo-based enrollment schema)
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

      CREATE TABLE IF NOT EXISTS photo_face_enrollments (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        student_id TEXT NOT NULL,
        photo_path TEXT NOT NULL,
        photo_hash TEXT NOT NULL,
        deepface_embedding TEXT NOT NULL,
        face_confidence REAL NOT NULL,
        photo_quality_score REAL NOT NULL,
        enrollment_method TEXT DEFAULT 'photo_upload',
        model_name TEXT DEFAULT 'Facenet512',
        detector_backend TEXT DEFAULT 'opencv',
        enrollment_date DATETIME DEFAULT CURRENT_TIMESTAMP,
        is_active BOOLEAN DEFAULT 1,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (student_id) REFERENCES students(student_id) ON DELETE CASCADE,
        UNIQUE(student_id)
      );

      CREATE TABLE IF NOT EXISTS attendance (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        student_id TEXT NOT NULL,
        student_name TEXT NOT NULL,
        date DATE NOT NULL,
        time TIME NOT NULL,
        verification_method TEXT DEFAULT 'deepface',
        confidence_score REAL,
        timestamp DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (student_id) REFERENCES students(student_id) ON DELETE CASCADE,
        UNIQUE(student_id, date)
      );

      CREATE TABLE IF NOT EXISTS verification_attempts (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        student_id TEXT,
        verification_result TEXT NOT NULL,
        confidence_score REAL,
        verification_time REAL,
        error_message TEXT,
        ip_address TEXT,
        user_agent TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
      );

      CREATE TABLE IF NOT EXISTS attendance_audit_log (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        student_id TEXT,
        student_name TEXT,
        date DATE,
        old_status TEXT,
        new_status TEXT,
        modified_by TEXT,
        modification_reason TEXT,
        modification_type TEXT,
        ip_address TEXT,
        user_agent TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
      );

      -- Insert default teacher account if not exists
      INSERT OR IGNORE INTO teachers (teacher_id, name, email, password) 
      VALUES ('TEACHER001', 'Admin Teacher', 'admin@school.com', '$2a$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi');

      -- Create indexes for better performance
      CREATE INDEX IF NOT EXISTS idx_students_student_id ON students(student_id);
      CREATE INDEX IF NOT EXISTS idx_photo_enrollments_student_id ON photo_face_enrollments(student_id);
      CREATE INDEX IF NOT EXISTS idx_attendance_student_date ON attendance(student_id, date);
      CREATE INDEX IF NOT EXISTS idx_verification_attempts_student_id ON verification_attempts(student_id);
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