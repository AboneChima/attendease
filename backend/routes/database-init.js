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
        
        // Try to add the column directly - if it exists, PostgreSQL will throw an error
        try {
            console.log('Attempting to execute: ALTER TABLE students ADD COLUMN qr_code TEXT');
            const result = await dbAdapter.execute('ALTER TABLE students ADD COLUMN qr_code TEXT');
            console.log('✅ ALTER TABLE result:', result);
            console.log('✅ QR code column added successfully');
        } catch (error) {
            console.log('❌ ALTER TABLE error:', error.message);
            console.log('❌ Full error:', error);
            
            if (error.message.includes('already exists') || 
                error.message.includes('duplicate column') || 
                error.message.includes('column "qr_code" of relation "students" already exists')) {
                console.log('QR code column already exists (caught by error)');
                res.json({
                    success: true,
                    message: 'QR code column already exists (error caught)',
                    error_message: error.message,
                    timestamp: new Date().toISOString()
                });
                return;
            } else {
                throw error; // Re-throw if it's a different error
            }
        }
        console.log('✅ QR code column added successfully');
        
        // Verify the column was actually added
        try {
            const [verifyResult] = await dbAdapter.execute('SELECT * FROM students LIMIT 1');
            if (verifyResult.length > 0) {
                const columnNames = Object.keys(verifyResult[0]);
                console.log('✅ Verification - Current student columns:', columnNames);
                console.log('✅ QR code column present:', columnNames.includes('qr_code'));
            }
        } catch (verifyError) {
            console.log('❌ Verification error:', verifyError.message);
        }
        
        // Update existing students with default QR codes
        const [students] = await dbAdapter.execute('SELECT student_id FROM students WHERE qr_code IS NULL');
        console.log(`Updating ${students.length} students with QR codes...`);
        
        for (const student of students) {
            const qrData = `STUDENT:${student.student_id}`;
            await dbAdapter.execute(
                'UPDATE students SET qr_code = ? WHERE student_id = ?',
                [qrData, student.student_id]
            );
        }
        
        console.log('✅ All students updated with QR codes');
        
        res.json({
            success: true,
            message: 'Schema fixed successfully - QR code column added',
            students_updated: students.length,
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