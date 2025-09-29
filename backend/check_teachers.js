const sqlite3 = require('sqlite3').verbose();
const path = require('path');

const dbPath = path.join(__dirname, 'database', 'attendance.db');
const db = new sqlite3.Database(dbPath);

console.log('🔍 Checking available teachers...\n');

db.all('SELECT email, name, password FROM teachers', (err, rows) => {
  if (err) {
    console.error('❌ Error:', err);
  } else {
    console.log('👥 Available Teachers:');
    rows.forEach(teacher => {
      console.log(`  📧 Email: ${teacher.email}`);
      console.log(`  👤 Name: ${teacher.name}`);
      console.log(`  🔐 Password Hash: ${teacher.password.substring(0, 20)}...\n`);
    });
    
    if (rows.length === 0) {
      console.log('⚠️ No teachers found in database');
    }
  }
  
  db.close();
});