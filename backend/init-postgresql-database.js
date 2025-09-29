const { dbAdapter } = require('./config/database-adapter');

async function initializePostgreSQLDatabase() {
    console.log('🚀 Initializing PostgreSQL Database for AttendEase...\n');
    
    try {
        // Initialize database adapter
        await dbAdapter.initialize();
        console.log('✅ Database connection established\n');

        // 1. Create students table
        console.log('📋 Creating students table...');
        await dbAdapter.execute(`
            CREATE TABLE IF NOT EXISTS students (
                id SERIAL PRIMARY KEY,
                student_id VARCHAR(20) UNIQUE NOT NULL,
                name VARCHAR(255) NOT NULL,
                email VARCHAR(255) UNIQUE NOT NULL,
                phone VARCHAR(20),
                qr_code TEXT NOT NULL,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        `);
        console.log('✅ Students table created');

        // 2. Create teachers table
        console.log('📋 Creating teachers table...');
        await dbAdapter.execute(`
            CREATE TABLE IF NOT EXISTS teachers (
                id SERIAL PRIMARY KEY,
                teacher_id VARCHAR(20) UNIQUE NOT NULL,
                name VARCHAR(255) NOT NULL,
                email VARCHAR(255) UNIQUE NOT NULL,
                password VARCHAR(255) NOT NULL,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        `);
        console.log('✅ Teachers table created');

        // 3. Create attendance table
        console.log('📋 Creating attendance table...');
        await dbAdapter.execute(`
            CREATE TABLE IF NOT EXISTS attendance (
                id SERIAL PRIMARY KEY,
                student_id VARCHAR(20) NOT NULL,
                student_name VARCHAR(255) NOT NULL,
                date DATE NOT NULL,
                time TIME NOT NULL,
                method VARCHAR(50) DEFAULT 'qr_code',
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (student_id) REFERENCES students(student_id) ON DELETE CASCADE
            )
        `);
        console.log('✅ Attendance table created');

        // 4. Create daily_attendance table (for attendance management)
        console.log('📋 Creating daily_attendance table...');
        await dbAdapter.execute(`
            CREATE TABLE IF NOT EXISTS daily_attendance (
                id SERIAL PRIMARY KEY,
                student_id VARCHAR(20) NOT NULL,
                student_name VARCHAR(255) NOT NULL,
                date DATE NOT NULL,
                status VARCHAR(20) DEFAULT 'not_yet_here' CHECK (status IN ('present', 'absent', 'not_yet_here')),
                check_in_time TIME NULL,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (student_id) REFERENCES students(student_id) ON DELETE CASCADE,
                UNIQUE(student_id, date)
            )
        `);
        console.log('✅ Daily attendance table created');

        // 5. Create attendance_sessions table
        console.log('📋 Creating attendance_sessions table...');
        await dbAdapter.execute(`
            CREATE TABLE IF NOT EXISTS attendance_sessions (
                id SERIAL PRIMARY KEY,
                session_date DATE NOT NULL UNIQUE,
                reset_time TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                total_students INTEGER NOT NULL
            )
        `);
        console.log('✅ Attendance sessions table created');

        // 6. Create attendance_history table
        console.log('📋 Creating attendance_history table...');
        await dbAdapter.execute(`
            CREATE TABLE IF NOT EXISTS attendance_history (
                id SERIAL PRIMARY KEY,
                date DATE NOT NULL UNIQUE,
                total_students INTEGER NOT NULL,
                present_count INTEGER NOT NULL,
                absent_count INTEGER NOT NULL,
                attendance_rate REAL NOT NULL,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        `);
        console.log('✅ Attendance history table created');

        // 7. Create photo_face_enrollments table
        console.log('📋 Creating photo_face_enrollments table...');
        await dbAdapter.execute(`
            CREATE TABLE IF NOT EXISTS photo_face_enrollments (
                id SERIAL PRIMARY KEY,
                student_id VARCHAR(20) NOT NULL,
                photo_path VARCHAR(500) NOT NULL,
                photo_hash VARCHAR(255) NOT NULL,
                deepface_embedding TEXT NOT NULL,
                face_confidence REAL NOT NULL,
                enrollment_quality VARCHAR(20) DEFAULT 'good',
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (student_id) REFERENCES students(student_id) ON DELETE CASCADE,
                UNIQUE(student_id)
            )
        `);
        console.log('✅ Photo face enrollments table created');

        // 8. Create verification_attempts table
        console.log('📋 Creating verification_attempts table...');
        await dbAdapter.execute(`
            CREATE TABLE IF NOT EXISTS verification_attempts (
                id SERIAL PRIMARY KEY,
                student_id VARCHAR(20),
                verification_result VARCHAR(20) NOT NULL,
                confidence_score REAL,
                verification_time REAL,
                error_message TEXT,
                ip_address VARCHAR(45),
                user_agent TEXT,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        `);
        console.log('✅ Verification attempts table created');

        // 9. Create attendance_audit_log table
        console.log('📋 Creating attendance_audit_log table...');
        await dbAdapter.execute(`
            CREATE TABLE IF NOT EXISTS attendance_audit_log (
                id SERIAL PRIMARY KEY,
                student_id VARCHAR(20),
                student_name VARCHAR(255),
                date DATE,
                old_status VARCHAR(20),
                new_status VARCHAR(20),
                modified_by VARCHAR(255),
                modification_reason TEXT,
                modification_type VARCHAR(50),
                ip_address VARCHAR(45),
                user_agent TEXT,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        `);
        console.log('✅ Attendance audit log table created');

        // 10. Create indexes for better performance
        console.log('📋 Creating indexes...');
        const indexes = [
            'CREATE INDEX IF NOT EXISTS idx_students_student_id ON students(student_id)',
            'CREATE INDEX IF NOT EXISTS idx_attendance_student_date ON attendance(student_id, date)',
            'CREATE INDEX IF NOT EXISTS idx_daily_attendance_date ON daily_attendance(date)',
            'CREATE INDEX IF NOT EXISTS idx_daily_attendance_status ON daily_attendance(status)',
            'CREATE INDEX IF NOT EXISTS idx_daily_attendance_student_id ON daily_attendance(student_id)',
            'CREATE INDEX IF NOT EXISTS idx_attendance_history_date ON attendance_history(date)',
            'CREATE INDEX IF NOT EXISTS idx_attendance_sessions_date ON attendance_sessions(session_date)',
            'CREATE INDEX IF NOT EXISTS idx_photo_enrollments_student_id ON photo_face_enrollments(student_id)',
            'CREATE INDEX IF NOT EXISTS idx_verification_attempts_student_id ON verification_attempts(student_id)'
        ];

        for (const indexSQL of indexes) {
            await dbAdapter.execute(indexSQL);
        }
        console.log('✅ Indexes created');

        // 11. Insert default teacher account if it doesn't exist
        console.log('📋 Creating default teacher account...');
        try {
            // Check if teacher already exists
            const [existingTeacher] = await dbAdapter.execute(
                'SELECT id FROM teachers WHERE email = ?',
                ['admin@school.com']
            );

            if (existingTeacher.length === 0) {
                // Password is 'password' hashed with bcrypt
                await dbAdapter.execute(`
                    INSERT INTO teachers (teacher_id, name, email, password) 
                    VALUES (?, ?, ?, ?)
                `, ['TEACHER001', 'Admin Teacher', 'admin@school.com', '$2a$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi']);
                console.log('✅ Default teacher account created (admin@school.com / password)');
            } else {
                console.log('✅ Default teacher account already exists');
            }
        } catch (error) {
            console.log('⚠️  Warning: Could not create default teacher account:', error.message);
        }

        // 12. Verify table creation
        console.log('\n🔍 Verifying table creation...');
        const tables = [
            'students', 'teachers', 'attendance', 'daily_attendance', 
            'attendance_sessions', 'attendance_history', 'photo_face_enrollments',
            'verification_attempts', 'attendance_audit_log'
        ];

        for (const table of tables) {
            try {
                const [result] = await dbAdapter.execute(`SELECT COUNT(*) as count FROM ${table}`);
                console.log(`✅ ${table}: ${result[0].count} records`);
            } catch (error) {
                console.log(`❌ ${table}: Error - ${error.message}`);
            }
        }

        console.log('\n🎉 PostgreSQL Database initialization completed successfully!');
        console.log('\n📝 Summary:');
        console.log('   - All required tables created');
        console.log('   - Indexes created for performance');
        console.log('   - Default teacher account: admin@school.com / password');
        console.log('   - Database is ready for AttendEase application');

    } catch (error) {
        console.error('❌ Database initialization failed:', error);
        throw error;
    } finally {
        // Close database connection
        if (dbAdapter.close) {
            await dbAdapter.close();
        }
    }
}

// Run initialization if this script is executed directly
if (require.main === module) {
    initializePostgreSQLDatabase()
        .then(() => {
            console.log('\n✅ Database initialization script completed');
            process.exit(0);
        })
        .catch((error) => {
            console.error('\n❌ Database initialization script failed:', error);
            process.exit(1);
        });
}

module.exports = { initializePostgreSQLDatabase };