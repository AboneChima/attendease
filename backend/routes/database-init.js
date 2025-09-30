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
        
        // Check if qr_code column exists using proper PostgreSQL method
        const [columnCheck] = await dbAdapter.execute(`
            SELECT column_name 
            FROM information_schema.columns 
            WHERE table_name = 'students' 
            AND column_name = 'qr_code'
        `);
        
        if (columnCheck.length > 0) {
            console.log('QR code column already exists');
            res.json({
                success: true,
                message: 'QR code column already exists',
                timestamp: new Date().toISOString()
            });
            return;
        }
        
        console.log('QR code column missing, adding it...');
        
        // Add the missing qr_code column
        await dbAdapter.execute('ALTER TABLE students ADD COLUMN qr_code TEXT');
        console.log('✅ QR code column added successfully');
        
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