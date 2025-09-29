const { dbAdapter } = require('./config/database-adapter');

async function checkDailyAttendanceSchema() {
  try {
    console.log('🔍 Checking daily_attendance table schema...');
    
    // Get table schema
    const [schema] = await dbAdapter.execute(`PRAGMA table_info(daily_attendance)`);
    
    console.log('\n📋 daily_attendance table columns:');
    schema.forEach(column => {
      console.log(`  - ${column.name} (${column.type})`);
    });
    
    // Get sample data
    const [sampleData] = await dbAdapter.execute(`SELECT * FROM daily_attendance LIMIT 3`);
    
    console.log('\n📊 Sample data:');
    console.log(sampleData);
    
  } catch (error) {
    console.error('❌ Error checking daily_attendance schema:', error);
  } finally {
    process.exit(0);
  }
}

checkDailyAttendanceSchema();