const { dbAdapter } = require('./config/database-adapter');

async function testFaceEncodingsTable() {
  try {
    console.log('Testing face_encodings table...');
    
    // Check if table exists
    const [tables] = await dbAdapter.execute(
      "SELECT name FROM sqlite_master WHERE type='table' AND name='face_encodings'"
    );
    
    if (tables.length === 0) {
      console.log('❌ face_encodings table does not exist!');
      
      // Create the table
      console.log('Creating face_encodings table...');
      await dbAdapter.execute(`
        CREATE TABLE IF NOT EXISTS face_encodings (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          student_id VARCHAR(20) NOT NULL,
          face_descriptor TEXT NOT NULL,
          sample_count INTEGER DEFAULT 1,
          enrollment_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          FOREIGN KEY (student_id) REFERENCES students(student_id) ON DELETE CASCADE
        )
      `);
      
      console.log('✅ face_encodings table created successfully!');
    } else {
      console.log('✅ face_encodings table exists');
    }
    
    // Check table structure
    const [columns] = await dbAdapter.execute("PRAGMA table_info(face_encodings)");
    console.log('Table structure:');
    columns.forEach(col => {
      console.log(`  - ${col.name}: ${col.type}`);
    });
    
    // Check existing records
    const [records] = await dbAdapter.execute('SELECT COUNT(*) as count FROM face_encodings');
    console.log(`Current records in face_encodings: ${records[0].count}`);
    
    process.exit(0);
  } catch (error) {
    console.error('Error testing face_encodings table:', error);
    process.exit(1);
  }
}

testFaceEncodingsTable();