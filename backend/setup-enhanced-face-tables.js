const sqlite3 = require('sqlite3').verbose();
const path = require('path');

const dbPath = path.join(__dirname, 'database/attendance.db');
const db = new sqlite3.Database(dbPath);

console.log('🚀 Setting up enhanced face enrollment tables...');

// Create face_enrollment_sessions table
const createSessionsTable = `
  CREATE TABLE IF NOT EXISTS face_enrollment_sessions (
    session_id TEXT PRIMARY KEY,
    student_id TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'active',
    required_angles TEXT NOT NULL,
    total_samples INTEGER DEFAULT 0,
    average_quality REAL DEFAULT 0,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    completed_at DATETIME,
    FOREIGN KEY (student_id) REFERENCES students(student_id) ON DELETE CASCADE
  )
`;

// Create face_samples table
const createSamplesTable = `
  CREATE TABLE IF NOT EXISTS face_samples (
    sample_id TEXT PRIMARY KEY,
    session_id TEXT NOT NULL,
    student_id TEXT NOT NULL,
    face_descriptor TEXT NOT NULL,
    capture_angle TEXT NOT NULL,
    quality_score REAL NOT NULL,
    quality_metrics TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (session_id) REFERENCES face_enrollment_sessions(session_id) ON DELETE CASCADE,
    FOREIGN KEY (student_id) REFERENCES students(student_id) ON DELETE CASCADE,
    UNIQUE(session_id, capture_angle)
  )
`;

// Create indexes for better performance
const createIndexes = [
  'CREATE INDEX IF NOT EXISTS idx_face_sessions_student ON face_enrollment_sessions(student_id)',
  'CREATE INDEX IF NOT EXISTS idx_face_sessions_status ON face_enrollment_sessions(status)',
  'CREATE INDEX IF NOT EXISTS idx_face_samples_session ON face_samples(session_id)',
  'CREATE INDEX IF NOT EXISTS idx_face_samples_student ON face_samples(student_id)',
  'CREATE INDEX IF NOT EXISTS idx_face_samples_angle ON face_samples(capture_angle)'
];

// Execute table creation
db.serialize(() => {
  console.log('📋 Creating face_enrollment_sessions table...');
  db.run(createSessionsTable, (err) => {
    if (err) {
      console.error('❌ Error creating face_enrollment_sessions table:', err);
    } else {
      console.log('✅ face_enrollment_sessions table created successfully');
    }
  });

  console.log('📋 Creating face_samples table...');
  db.run(createSamplesTable, (err) => {
    if (err) {
      console.error('❌ Error creating face_samples table:', err);
    } else {
      console.log('✅ face_samples table created successfully');
    }
  });

  console.log('📋 Creating indexes...');
  createIndexes.forEach((indexSQL, i) => {
    db.run(indexSQL, (err) => {
      if (err) {
        console.error(`❌ Error creating index ${i + 1}:`, err);
      } else {
        console.log(`✅ Index ${i + 1} created successfully`);
      }
    });
  });

  // Verify tables were created
  setTimeout(() => {
    console.log('\n🔍 Verifying table creation...');
    
    db.all(`SELECT name FROM sqlite_master WHERE type='table' AND (name LIKE '%face%' OR name LIKE '%enrollment%')`, (err, rows) => {
      if (err) {
        console.error('❌ Error verifying tables:', err);
      } else {
        console.log('📊 Enhanced face enrollment tables:');
        rows.forEach(row => {
          console.log(`  ✅ ${row.name}`);
        });
        
        if (rows.length >= 2) {
          console.log('\n🎉 Enhanced face enrollment database setup completed successfully!');
        } else {
          console.log('\n⚠️ Some tables may not have been created properly');
        }
      }
      
      db.close();
    });
  }, 1000);
});