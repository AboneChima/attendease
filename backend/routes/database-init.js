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

module.exports = router;