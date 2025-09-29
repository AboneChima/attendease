// Simple test to verify PostgreSQL connection
const { Pool } = require('pg');

async function testPostgresConnection() {
    console.log('🔍 Testing PostgreSQL Connection...');
    
    // Use a test DATABASE_URL (this won't work locally but will help identify issues)
    const testDatabaseUrl = process.env.DATABASE_URL || 'postgresql://test:test@localhost:5432/test';
    
    console.log('Database URL format:', testDatabaseUrl.replace(/\/\/.*@/, '//***:***@'));
    
    try {
        const pool = new Pool({
            connectionString: testDatabaseUrl,
            ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false
        });
        
        console.log('✅ Pool created successfully');
        
        // Test a simple query
        const result = await pool.query('SELECT 1 as test');
        console.log('✅ Query executed successfully:', result.rows);
        
        await pool.end();
        console.log('✅ Connection closed successfully');
        
        console.log('🎉 PostgreSQL connection test passed!');
        
    } catch (error) {
        console.error('❌ PostgreSQL connection failed:');
        console.error('Error name:', error.name);
        console.error('Error message:', error.message);
        console.error('Error code:', error.code);
        console.error('Full error:', error);
        
        process.exit(1);
    }
}

testPostgresConnection();