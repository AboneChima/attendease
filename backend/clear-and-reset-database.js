const sqlite3 = require('sqlite3').verbose();
const { open } = require('sqlite');
const path = require('path');
const fs = require('fs');

async function clearAndResetDatabase() {
  try {
    const dbPath = process.env.SQLITE_DB_PATH || path.join(__dirname, 'database/attendance.db');
    
    // Remove existing database file if it exists
    if (fs.existsSync(dbPath)) {
      fs.unlinkSync(dbPath);
      console.log('✅ Existing database file removed');
    }

    // Ensure database directory exists
    const dbDir = path.dirname(dbPath);
    if (!fs.existsSync(dbDir)) {
      fs.mkdirSync(dbDir, { recursive: true });
    }

    // Create new database connection
    const db = await open({
      filename: dbPath,
      driver: sqlite3.Database
    });

    console.log('✅ New database created at:', dbPath);

    // Create fresh schema optimized for photo-based enrollment
    await db.exec(`
      -- Students table (core information)
      CREATE TABLE students (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        student_id TEXT UNIQUE NOT NULL,
        name TEXT NOT NULL,
        email TEXT UNIQUE NOT NULL,
        phone TEXT,
        qr_code TEXT NOT NULL,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
      );

      -- Teachers table
      CREATE TABLE teachers (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        teacher_id TEXT UNIQUE NOT NULL,
        name TEXT NOT NULL,
        email TEXT UNIQUE NOT NULL,
        password TEXT NOT NULL,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
      );

      -- Photo-based face enrollments (using DeepFace)
      CREATE TABLE photo_face_enrollments (
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

      -- Attendance records
      CREATE TABLE attendance (
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

      -- Verification attempts log (for security and debugging)
      CREATE TABLE verification_attempts (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        student_id TEXT,
        verification_result TEXT NOT NULL, -- 'success', 'failed', 'no_match'
        confidence_score REAL,
        verification_time REAL, -- time taken in seconds
        error_message TEXT,
        ip_address TEXT,
        user_agent TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
      );

      -- Audit log for attendance modifications
      CREATE TABLE attendance_audit_log (
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

      -- Insert default teacher account
      INSERT INTO teachers (teacher_id, name, email, password) 
      VALUES ('TEACHER001', 'Admin Teacher', 'admin@school.com', '$2a$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi');

      -- Create indexes for better performance
      CREATE INDEX idx_students_student_id ON students(student_id);
      CREATE INDEX idx_photo_enrollments_student_id ON photo_face_enrollments(student_id);
      CREATE INDEX idx_attendance_student_date ON attendance(student_id, date);
      CREATE INDEX idx_verification_attempts_student_id ON verification_attempts(student_id);
      CREATE INDEX idx_verification_attempts_created_at ON verification_attempts(created_at);
    `);

    console.log('✅ Fresh database schema created with photo-based enrollment tables');

    // Create uploads directory for photos
    const uploadsDir = path.join(__dirname, 'uploads', 'photos');
    if (!fs.existsSync(uploadsDir)) {
      fs.mkdirSync(uploadsDir, { recursive: true });
      console.log('✅ Photos upload directory created');
    }

    await db.close();
    console.log('✅ Database setup completed successfully!');
    
    console.log('\n📋 New Schema Summary:');
    console.log('- students: Core student information');
    console.log('- photo_face_enrollments: DeepFace embeddings from passport photos');
    console.log('- attendance: Daily attendance records with confidence scores');
    console.log('- verification_attempts: Security and debugging log');
    console.log('- attendance_audit_log: Audit trail for modifications');
    console.log('- teachers: Teacher accounts');

  } catch (error) {
    console.error('❌ Error setting up database:', error);
    process.exit(1);
  }
}

// Run the script
clearAndResetDatabase();