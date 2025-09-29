const { dbAdapter } = require('./config/database-adapter');

/**
 * Database Migration: Upgrade Face Encodings Schema for Multi-Sample Support
 * 
 * This script upgrades the face_encodings table to support:
 * - Multiple face samples per student
 * - Enhanced metadata (capture angle, quality scores, lighting conditions)
 * - Sample diversity tracking
 * - Improved verification performance
 */

async function upgradeFaceSchema() {
  try {
    console.log('🚀 Starting face schema upgrade for multi-sample support...');
    
    // Check current schema
    console.log('📊 Checking current face_encodings table structure...');
    const [currentColumns] = await dbAdapter.execute("PRAGMA table_info(face_encodings)");
    console.log('Current columns:', currentColumns.map(col => col.name));
    
    // Create new enhanced face_samples table
    console.log('📝 Creating enhanced face_samples table...');
    await dbAdapter.execute(`
      CREATE TABLE IF NOT EXISTS face_samples (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        student_id VARCHAR(20) NOT NULL,
        sample_index INTEGER NOT NULL,
        face_descriptor TEXT NOT NULL,
        
        -- Quality metrics
        quality_score REAL NOT NULL DEFAULT 0.0,
        brightness_score REAL DEFAULT 0.0,
        sharpness_score REAL DEFAULT 0.0,
        pose_score REAL DEFAULT 0.0,
        
        -- Capture metadata
        capture_angle VARCHAR(20) DEFAULT 'front',
        lighting_condition VARCHAR(20) DEFAULT 'normal',
        face_size_pixels INTEGER DEFAULT 0,
        face_confidence REAL DEFAULT 0.0,
        
        -- Technical details
        detection_method VARCHAR(50) DEFAULT 'face-api.js',
        descriptor_version VARCHAR(10) DEFAULT '1.0',
        
        -- Timestamps
        enrollment_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        
        -- Constraints
        FOREIGN KEY (student_id) REFERENCES students(student_id) ON DELETE CASCADE,
        UNIQUE(student_id, sample_index)
      )
    `);
    
    // Create enrollment sessions table for tracking multi-sample enrollment
    console.log('📝 Creating face_enrollment_sessions table...');
    await dbAdapter.execute(`
      CREATE TABLE IF NOT EXISTS face_enrollment_sessions (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        student_id VARCHAR(20) NOT NULL,
        session_id VARCHAR(50) NOT NULL,
        
        -- Session metadata
        total_samples INTEGER DEFAULT 0,
        successful_samples INTEGER DEFAULT 0,
        average_quality REAL DEFAULT 0.0,
        diversity_score REAL DEFAULT 0.0,
        
        -- Session status
        status VARCHAR(20) DEFAULT 'in_progress',
        completion_percentage INTEGER DEFAULT 0,
        
        -- Environment data
        lighting_assessment VARCHAR(20) DEFAULT 'unknown',
        camera_quality VARCHAR(20) DEFAULT 'unknown',
        
        -- Timestamps
        started_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        completed_at TIMESTAMP NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        
        -- Constraints
        FOREIGN KEY (student_id) REFERENCES students(student_id) ON DELETE CASCADE,
        UNIQUE(student_id, session_id)
      )
    `);
    
    // Migrate existing data from face_encodings to face_samples
    console.log('🔄 Migrating existing face encodings...');
    const [existingEncodings] = await dbAdapter.execute(`
      SELECT student_id, face_descriptor, sample_count, enrollment_date 
      FROM face_encodings
    `);
    
    console.log(`Found ${existingEncodings.length} existing face encodings to migrate`);
    
    for (const encoding of existingEncodings) {
      // Create a migration session
      const sessionId = `migration_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      
      await dbAdapter.execute(`
        INSERT INTO face_enrollment_sessions (
          student_id, session_id, total_samples, successful_samples, 
          average_quality, status, completion_percentage, completed_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
      `, [
        encoding.student_id,
        sessionId,
        encoding.sample_count || 1,
        1,
        0.8, // Assume good quality for migrated data
        'completed',
        100,
        encoding.enrollment_date
      ]);
      
      // Migrate the face descriptor as sample 1
      await dbAdapter.execute(`
        INSERT INTO face_samples (
          student_id, sample_index, face_descriptor, quality_score,
          capture_angle, lighting_condition, enrollment_date
        ) VALUES (?, ?, ?, ?, ?, ?, ?)
      `, [
        encoding.student_id,
        1,
        encoding.face_descriptor,
        0.8, // Assume good quality for migrated data
        'front',
        'normal',
        encoding.enrollment_date
      ]);
      
      console.log(`✅ Migrated face encoding for student: ${encoding.student_id}`);
    }
    
    // Create indexes for performance
    console.log('📊 Creating performance indexes...');
    await dbAdapter.execute(`
      CREATE INDEX IF NOT EXISTS idx_face_samples_student_id 
      ON face_samples(student_id)
    `);
    
    await dbAdapter.execute(`
      CREATE INDEX IF NOT EXISTS idx_face_samples_quality 
      ON face_samples(student_id, quality_score DESC)
    `);
    
    await dbAdapter.execute(`
      CREATE INDEX IF NOT EXISTS idx_enrollment_sessions_student 
      ON face_enrollment_sessions(student_id, status)
    `);
    
    // Verify migration
    console.log('🔍 Verifying migration...');
    const [sampleCount] = await dbAdapter.execute('SELECT COUNT(*) as count FROM face_samples');
    const [sessionCount] = await dbAdapter.execute('SELECT COUNT(*) as count FROM face_enrollment_sessions');
    
    console.log(`✅ Migration completed successfully!`);
    console.log(`   - Face samples: ${sampleCount[0].count}`);
    console.log(`   - Enrollment sessions: ${sessionCount[0].count}`);
    console.log(`   - Original encodings: ${existingEncodings.length}`);
    
    // Create a backup note
    console.log('📝 Creating backup information...');
    console.log('⚠️  IMPORTANT: The original face_encodings table is preserved for safety.');
    console.log('   You can drop it manually after verifying the new system works correctly.');
    console.log('   Command: DROP TABLE face_encodings;');
    
    return {
      success: true,
      migratedSamples: sampleCount[0].count,
      migratedSessions: sessionCount[0].count,
      originalEncodings: existingEncodings.length
    };
    
  } catch (error) {
    console.error('❌ Face schema upgrade failed:', error);
    throw error;
  }
}

// Run migration if called directly
if (require.main === module) {
  upgradeFaceSchema()
    .then((result) => {
      console.log('🎉 Schema upgrade completed:', result);
      process.exit(0);
    })
    .catch((error) => {
      console.error('💥 Schema upgrade failed:', error);
      process.exit(1);
    });
}

module.exports = { upgradeFaceSchema };