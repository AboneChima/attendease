const { dbAdapter } = require('./config/database-adapter');

async function checkAttendanceSessionsSchema() {
  try {
    console.log('🔍 Checking attendance_sessions table schema...');
    
    // Get table schema
    const [schema] = await dbAdapter.execute(`PRAGMA table_info(attendance_sessions)`);
    
    console.log('\n📋 attendance_sessions table columns:');
    schema.forEach(column => {
      console.log(`  - ${column.name} (${column.type})`);
    });
    
    // Get sample data
    const [sampleData] = await dbAdapter.execute(`SELECT * FROM attendance_sessions LIMIT 3`);
    
    console.log('\n📊 Sample data:');
    console.log(sampleData);
    
  } catch (error) {
    console.error('❌ Error checking attendance_sessions schema:', error);
  } finally {
    process.exit(0);
  }
}

checkAttendanceSessionsSchema();