const { dbAdapter } = require('./config/database-adapter');

async function testPostgreSQLAdapter() {
    console.log('🔍 Testing PostgreSQL Database Adapter...\n');
    
    try {
        // Test database type detection
        console.log('Database type detected:', dbAdapter.dbType);
        
        // Test initialization
        console.log('Initializing database adapter...');
        await dbAdapter.initialize();
        console.log('✅ Database adapter initialized successfully');
        
        // Test a simple query
        console.log('\nTesting simple query...');
        const result = await dbAdapter.execute('SELECT 1 as test');
        console.log('✅ Query result:', result);
        
        // Test parameter substitution
        console.log('\nTesting parameterized query...');
        const paramResult = await dbAdapter.execute('SELECT ? as param_test', ['hello']);
        console.log('✅ Parameterized query result:', paramResult);
        
        console.log('\n🎉 PostgreSQL adapter test completed successfully!');
        
    } catch (error) {
        console.error('❌ PostgreSQL adapter test failed:', error.message);
        console.error('Stack trace:', error.stack);
    } finally {
        // Close connection
        if (dbAdapter.close) {
            await dbAdapter.close();
        }
    }
}

// Set environment variable to simulate production
process.env.DATABASE_URL = 'postgresql://test:test@localhost:5432/test';

testPostgreSQLAdapter()
    .then(() => {
        console.log('\n✅ Test script completed');
        process.exit(0);
    })
    .catch((error) => {
        console.error('\n❌ Test script failed:', error);
        process.exit(1);
    });