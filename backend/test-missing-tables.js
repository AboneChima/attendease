const { getDatabase } = require('./config/sqlite-database');

async function checkTables() {
  try {
    const db = await getDatabase();
    
    console.log('Checking for required tables...\n');
    
    // Check for basic tables
    const basicTables = ['students', 'teachers', 'attendance'];
    for (const table of basicTables) {
      const result = await db.get(`SELECT name FROM sqlite_master WHERE type='table' AND name=?`, [table]);
      console.log(`${table}: ${result ? '✅ EXISTS' : '❌ MISSING'}`);
    }
    
    console.log('\nChecking for attendance management tables...');
    
    // Check for attendance management tables
    const attendanceTables = ['daily_attendance', 'attendance_history', 'attendance_sessions'];
    for (const table of attendanceTables) {
      const result = await db.get(`SELECT name FROM sqlite_master WHERE type='table' AND name=?`, [table]);
      console.log(`${table}: ${result ? '✅ EXISTS' : '❌ MISSING'}`);
    }
    
    console.log('\nAll tables in database:');
    const allTables = await db.all(`SELECT name FROM sqlite_master WHERE type='table'`);
    allTables.forEach(table => console.log(`- ${table.name}`));
    
  } catch (error) {
    console.error('Error checking tables:', error);
  }
}

checkTables();