const { dbAdapter } = require('./config/database-adapter');

async function debugDatabaseAdapter() {
    console.log('🔍 Debugging database adapter and ALTER TABLE execution...');
    
    try {
        // Initialize database adapter
        await dbAdapter.initialize();
        console.log('✅ Database adapter initialized');
        
        // Check current students table structure
        console.log('\n1. Checking current students table structure...');
        const [students] = await dbAdapter.execute('SELECT * FROM students LIMIT 1');
        if (students.length > 0) {
            const columnNames = Object.keys(students[0]);
            console.log('Current columns:', columnNames);
            console.log('QR code column exists:', columnNames.includes('qr_code'));
        } else {
            console.log('No students found, checking table schema directly...');
            
            // Use PostgreSQL information_schema to check columns
            const [columns] = await dbAdapter.execute(`
                SELECT column_name 
                FROM information_schema.columns 
                WHERE table_name = 'students' 
                ORDER BY ordinal_position
            `);
            console.log('Table columns from information_schema:', columns.map(c => c.column_name));
        }
        
        // Test ALTER TABLE command directly
        console.log('\n2. Testing ALTER TABLE command...');
        try {
            console.log('Executing: ALTER TABLE students ADD COLUMN IF NOT EXISTS qr_code TEXT');
            const alterResult = await dbAdapter.execute('ALTER TABLE students ADD COLUMN IF NOT EXISTS qr_code TEXT');
            console.log('ALTER TABLE result:', alterResult);
            console.log('ALTER TABLE result type:', typeof alterResult);
            console.log('ALTER TABLE result length:', Array.isArray(alterResult) ? alterResult.length : 'Not an array');
        } catch (alterError) {
            console.log('ALTER TABLE error:', alterError.message);
            console.log('Full ALTER error:', alterError);
        }
        
        // Check table structure again after ALTER
        console.log('\n3. Checking table structure after ALTER...');
        const [studentsAfter] = await dbAdapter.execute('SELECT * FROM students LIMIT 1');
        if (studentsAfter.length > 0) {
            const columnNamesAfter = Object.keys(studentsAfter[0]);
            console.log('Columns after ALTER:', columnNamesAfter);
            console.log('QR code column exists after ALTER:', columnNamesAfter.includes('qr_code'));
        }
        
        // Test with information_schema again
        console.log('\n4. Checking with information_schema after ALTER...');
        const [columnsAfter] = await dbAdapter.execute(`
            SELECT column_name 
            FROM information_schema.columns 
            WHERE table_name = 'students' 
            ORDER BY ordinal_position
        `);
        console.log('Table columns from information_schema after ALTER:', columnsAfter.map(c => c.column_name));
        
        // Test a simple INSERT to see if qr_code column works
        console.log('\n5. Testing INSERT with qr_code column...');
        try {
            const testStudentId = `DEBUG_${Date.now()}`;
            const insertResult = await dbAdapter.execute(
                'INSERT INTO students (student_id, name, email, qr_code) VALUES (?, ?, ?, ?)',
                [testStudentId, 'Debug Test', 'debug@test.com', 'TEST_QR']
            );
            console.log('INSERT with qr_code successful:', insertResult);
            
            // Verify the insert
            const [insertedStudent] = await dbAdapter.execute(
                'SELECT * FROM students WHERE student_id = ?',
                [testStudentId]
            );
            console.log('Inserted student:', insertedStudent[0]);
            
            // Clean up
            await dbAdapter.execute('DELETE FROM students WHERE student_id = ?', [testStudentId]);
            console.log('Test student cleaned up');
            
        } catch (insertError) {
            console.log('INSERT with qr_code failed:', insertError.message);
            console.log('This confirms the qr_code column does not exist');
        }
        
        console.log('\n🏁 Database adapter debug completed');
        
    } catch (error) {
        console.error('❌ Debug failed:', error);
    }
    
    process.exit(0);
}

debugDatabaseAdapter();