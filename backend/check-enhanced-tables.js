const sqlite3 = require('sqlite3').verbose();
const path = require('path');

const dbPath = path.join(__dirname, 'database.sqlite');
const db = new sqlite3.Database(dbPath);

console.log('🔍 Checking for enhanced face enrollment tables...');

db.all(`SELECT name FROM sqlite_master WHERE type='table' AND (name LIKE '%face%' OR name LIKE '%enrollment%')`, (err, rows) => {
  if (err) {
    console.error('❌ Error checking tables:', err);
  } else {
    console.log('📊 Face/Enrollment related tables found:');
    rows.forEach(row => {
      console.log(`  - ${row.name}`);
    });
    
    if (rows.length === 0) {
      console.log('⚠️ No enhanced face enrollment tables found!');
    }
  }
  
  // Check if specific tables exist
  const requiredTables = ['face_enrollment_sessions', 'face_samples'];
  
  requiredTables.forEach(tableName => {
    db.get(`SELECT name FROM sqlite_master WHERE type='table' AND name=?`, [tableName], (err, row) => {
      if (err) {
        console.error(`❌ Error checking ${tableName}:`, err);
      } else if (row) {
        console.log(`✅ Table ${tableName} exists`);
        
        // Show table structure
        db.all(`PRAGMA table_info(${tableName})`, (err, columns) => {
          if (err) {
            console.error(`❌ Error getting ${tableName} structure:`, err);
          } else {
            console.log(`📋 ${tableName} structure:`);
            columns.forEach(col => {
              console.log(`    ${col.name}: ${col.type} ${col.notnull ? 'NOT NULL' : ''} ${col.pk ? 'PRIMARY KEY' : ''}`);
            });
          }
        });
      } else {
        console.log(`❌ Table ${tableName} does NOT exist`);
      }
    });
  });
  
  setTimeout(() => {
    db.close();
  }, 2000);
});