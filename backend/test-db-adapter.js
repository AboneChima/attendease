const { dbAdapter } = require('./config/database-adapter');

async function testDbAdapter() {
  try {
    console.log('🔍 Testing database adapter...');
    
    // Initialize the adapter
    await dbAdapter.initialize();
    console.log('✅ Database adapter initialized successfully');
    
    // Test a simple query
    const result = await dbAdapter.get('SELECT 1 as test');
    console.log('✅ Simple query successful:', result);
    
    // Test getting students count
    const studentCount = await dbAdapter.get('SELECT COUNT(*) as count FROM students');
    console.log('✅ Student count query successful:', studentCount);
    
    console.log('🎉 Database adapter is working correctly!');
    
  } catch (error) {
    console.error('❌ Database adapter test failed:', error.message);
    console.error('Stack trace:', error.stack);
  } finally {
    // Close the connection
    try {
      await dbAdapter.close();
      console.log('✅ Database connection closed');
    } catch (closeError) {
      console.error('❌ Error closing database:', closeError.message);
    }
  }
}

testDbAdapter();