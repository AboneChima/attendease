const express = require('express');
const { initializePostgreSQLDatabase } = require('../init-postgresql-database');

const router = express.Router();

// Database initialization endpoint
router.post('/initialize', async (req, res) => {
    try {
        console.log('🚀 Database initialization requested via API...');
        
        // Run the database initialization
        await initializePostgreSQLDatabase();
        
        res.json({
            success: true,
            message: 'Database initialized successfully',
            timestamp: new Date().toISOString()
        });
        
    } catch (error) {
        console.error('❌ Database initialization failed:', error);
        
        res.status(500).json({
            success: false,
            message: 'Database initialization failed',
            error: error.message,
            timestamp: new Date().toISOString()
        });
    }
});

// Database status check endpoint
router.get('/status', async (req, res) => {
    try {
        const { dbAdapter } = require('../config/database-adapter');
        
        // Initialize database adapter
        await dbAdapter.initialize();
        
        // Check if key tables exist
        const tables = [
            'students', 'teachers', 'attendance', 'daily_attendance', 
            'attendance_sessions', 'attendance_history'
        ];
        
        const tableStatus = {};
        
        for (const table of tables) {
            try {
                const [result] = await dbAdapter.execute(`SELECT COUNT(*) as count FROM ${table}`);
                tableStatus[table] = {
                    exists: true,
                    count: result[0].count
                };
            } catch (error) {
                tableStatus[table] = {
                    exists: false,
                    error: error.message
                };
            }
        }
        
        // Check if default teacher exists
        let defaultTeacherExists = false;
        try {
            const [teacher] = await dbAdapter.execute(
                'SELECT id FROM teachers WHERE email = ?',
                ['admin@school.com']
            );
            defaultTeacherExists = teacher.length > 0;
        } catch (error) {
            // Table might not exist
        }
        
        res.json({
            success: true,
            database_type: process.env.DATABASE_URL ? 'PostgreSQL' : 'MySQL/SQLite',
            tables: tableStatus,
            default_teacher_exists: defaultTeacherExists,
            timestamp: new Date().toISOString()
        });
        
    } catch (error) {
        console.error('❌ Database status check failed:', error);
        
        res.status(500).json({
            success: false,
            message: 'Database status check failed',
            error: error.message,
            timestamp: new Date().toISOString()
        });
    }
});

// Emergency fix endpoint to add missing qr_code column
router.post('/fix-schema', async (req, res) => {
    try {
        console.log('🔧 Emergency schema fix requested via API...');
        
        const { dbAdapter } = require('../config/database-adapter');
        await dbAdapter.initialize();
        
        // First, check if the column already exists using PostgreSQL-specific query
        let columnExists = false;
        try {
            const [columns] = await dbAdapter.execute(`
                SELECT column_name 
                FROM information_schema.columns 
                WHERE table_name = 'students' AND column_name = 'qr_code'
            `);
            columnExists = columns.length > 0;
            console.log('✅ Column existence check:', columnExists);
        } catch (checkError) {
            console.log('❌ Column check error (might be SQLite):', checkError.message);
            // Fallback for SQLite - try to select from the column
            try {
                await dbAdapter.execute('SELECT qr_code FROM students LIMIT 1');
                columnExists = true;
                console.log('✅ Column exists (SQLite fallback check)');
            } catch (fallbackError) {
                columnExists = false;
                console.log('✅ Column does not exist (SQLite fallback check)');
            }
        }
        
        if (!columnExists) {
            // Add the column using the appropriate syntax
            try {
                console.log('Attempting to add qr_code column...');
                
                // Try PostgreSQL syntax first
                try {
                    await dbAdapter.execute('ALTER TABLE students ADD COLUMN qr_code TEXT');
                    console.log('✅ Column added using PostgreSQL syntax');
                } catch (pgError) {
                    console.log('PostgreSQL syntax failed, trying SQLite syntax...');
                    await dbAdapter.execute('ALTER TABLE students ADD COLUMN qr_code TEXT');
                    console.log('✅ Column added using SQLite syntax');
                }
                
            } catch (alterError) {
                console.log('❌ ALTER TABLE failed:', alterError.message);
                throw alterError;
            }
        } else {
            console.log('✅ QR code column already exists');
        }
        
        // Verify the column was actually added by testing functionality
        try {
            console.log('🔍 Testing column functionality...');
            
            // First, try to select with qr_code column to verify it exists
            const testQuery = 'SELECT student_id, qr_code FROM students LIMIT 1';
            
            const testResult = await dbAdapter.execute(testQuery);
            console.log('✅ QR code column is accessible in SELECT queries');
            
            // Only test INSERT if we can find a safe way to do it
            const testId = `TEST_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
            const testEmail = `test_${Date.now()}_${Math.random().toString(36).substr(2, 9)}@example.com`;
            
            try {
                // Try to insert a test record with qr_code
                await dbAdapter.execute(
                    'INSERT INTO students (student_id, name, email, qr_code) VALUES (?, ?, ?, ?)',
                    [testId, 'Test Student', testEmail, 'TEST_QR']
                );
                
                console.log('✅ Test record inserted successfully');
                
                // Clean up test record
                await dbAdapter.execute('DELETE FROM students WHERE student_id = ?', [testId]);
                console.log('🧹 Test record cleaned up');
                
            } catch (insertError) {
                console.log('⚠️ INSERT test failed (this may be due to existing constraints):', insertError.message);
                // Don't throw here - the SELECT test already proved the column exists
            }
            
        } catch (testError) {
            console.error('❌ Column functionality test failed:', testError.message);
            throw new Error(`QR code column is not functional: ${testError.message}`);
        }
        
        // Update existing students with default QR codes
        const [students] = await dbAdapter.execute('SELECT student_id, name FROM students WHERE qr_code IS NULL');
        console.log(`Updating ${students.length} students with QR codes...`);
        
        let updatedCount = 0;
        for (const student of students) {
            try {
                const qrData = JSON.stringify({
                    student_id: student.student_id,
                    name: student.name,
                    timestamp: Date.now()
                });
                
                await dbAdapter.execute(
                    'UPDATE students SET qr_code = ? WHERE student_id = ?',
                    [qrData, student.student_id]
                );
                updatedCount++;
            } catch (updateError) {
                console.log(`❌ Failed to update student ${student.student_id}:`, updateError.message);
            }
        }
        
        console.log(`✅ ${updatedCount} students updated with QR codes`);
        
        res.json({
            success: true,
            message: 'Schema fixed successfully - QR code column is functional',
            column_existed: columnExists,
            students_updated: updatedCount,
            timestamp: new Date().toISOString()
        });
        
    } catch (error) {
        console.error('❌ Schema fix failed:', error);
        
        res.status(500).json({
            success: false,
            message: 'Schema fix failed',
            error: error.message,
            timestamp: new Date().toISOString()
        });
    }
});

module.exports = router;