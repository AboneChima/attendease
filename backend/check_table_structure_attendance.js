const { dbAdapter } = require('./config/database-adapter');

async function checkTableStructure() {
  try {
    console.log('🔍 Checking Table Structure...\n');
    
    await dbAdapter.initialize();
    
    // Check daily_attendance table structure
    console.log('📋 Daily Attendance Table Structure:');
    try {
      const [dailyStructure] = await dbAdapter.execute(`PRAGMA table_info(daily_attendance)`);
      dailyStructure.forEach(column => {
        console.log(`  📝 ${column.name} (${column.type}) - ${column.notnull ? 'NOT NULL' : 'NULL'}`);
      });
    } catch (error) {
      console.log('  ❌ daily_attendance table not found');
    }
    
    console.log('\n📋 Attendance History Table Structure:');
    try {
      const [historyStructure] = await dbAdapter.execute(`PRAGMA table_info(attendance_history)`);
      historyStructure.forEach(column => {
        console.log(`  📝 ${column.name} (${column.type}) - ${column.notnull ? 'NOT NULL' : 'NULL'}`);
      });
    } catch (error) {
      console.log('  ❌ attendance_history table not found');
    }
    
    console.log('\n📋 Students Table Structure:');
    try {
      const [studentsStructure] = await dbAdapter.execute(`PRAGMA table_info(students)`);
      studentsStructure.forEach(column => {
        console.log(`  📝 ${column.name} (${column.type}) - ${column.notnull ? 'NOT NULL' : 'NULL'}`);
      });
    } catch (error) {
      console.log('  ❌ students table not found');
    }
    
    // Check recent attendance data with available columns
    console.log('\n📊 Recent Attendance Data (using available columns):');
    try {
      const [recentData] = await dbAdapter.execute(`
        SELECT * FROM daily_attendance 
        ORDER BY created_at DESC 
        LIMIT 5
      `);
      
      if (recentData.length > 0) {
        console.log('  📝 Recent records:');
        recentData.forEach(record => {
          console.log(`    ${JSON.stringify(record, null, 2)}`);
        });
      } else {
        console.log('  ❌ No records in daily_attendance');
      }
    } catch (error) {
      console.log('  ❌ Error reading daily_attendance:', error.message);
    }
    
    console.log('\n📊 Recent Attendance History:');
    try {
      const [historyData] = await dbAdapter.execute(`
        SELECT * FROM attendance_history 
        ORDER BY created_at DESC 
        LIMIT 5
      `);
      
      if (historyData.length > 0) {
        console.log('  📝 Recent history records:');
        historyData.forEach(record => {
          console.log(`    ${JSON.stringify(record, null, 2)}`);
        });
      } else {
        console.log('  ❌ No records in attendance_history');
      }
    } catch (error) {
      console.log('  ❌ Error reading attendance_history:', error.message);
    }
    
    console.log('\n✅ Table structure check completed!');
    
  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await dbAdapter.close();
  }
}

checkTableStructure();