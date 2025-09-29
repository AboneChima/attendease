const sqlite3 = require('sqlite3').verbose();

const dbPath = './database/attendance.db';

async function checkStudentsTable() {
    console.log('🔍 Checking students table structure...\n');
    
    const db = new sqlite3.Database(dbPath);
    
    try {
        // Get table schema
        const schema = await new Promise((resolve, reject) => {
            db.all("PRAGMA table_info(students)", (err, rows) => {
                if (err) reject(err);
                else resolve(rows);
            });
        });
        
        console.log('📋 Students table columns:');
        schema.forEach(col => {
            console.log(`  ${col.name}: ${col.type} ${col.pk ? 'PRIMARY KEY' : ''} ${col.notnull ? 'NOT NULL' : ''}`);
        });
        
        // Get sample data
        const sample = await new Promise((resolve, reject) => {
            db.get("SELECT * FROM students LIMIT 1", (err, row) => {
                if (err) reject(err);
                else resolve(row);
            });
        });
        
        if (sample) {
            console.log('\n📊 Sample student data:');
            Object.entries(sample).forEach(([key, value]) => {
                console.log(`  ${key}: ${value}`);
            });
        }
        
        return schema;
        
    } catch (error) {
        console.error('❌ Error checking table:', error.message);
    } finally {
        db.close();
    }
}

async function createNewStudent() {
    console.log('\n🆕 Creating new test student...\n');
    
    const db = new sqlite3.Database(dbPath);
    
    try {
        // Create new student with unique ID
        const newStudentId = 'TEST' + Date.now().toString().slice(-4);
        
        // Generate a simple QR code data (base64 encoded placeholder)
        const qrCodeData = Buffer.from(`student:${newStudentId}`).toString('base64');
        
        // Use all required columns
        await new Promise((resolve, reject) => {
            db.run(
                `INSERT INTO students (student_id, name, email, qr_code, created_at, updated_at) 
                 VALUES (?, ?, ?, ?, datetime('now'), datetime('now'))`,
                [newStudentId, 'Test Student', `${newStudentId.toLowerCase()}@test.com`, qrCodeData],
                function(err) {
                    if (err) reject(err);
                    else resolve(this.lastID);
                }
            );
        });
        
        console.log(`✅ Created new student: ${newStudentId}`);
        console.log(`📋 Student Details:`);
        console.log(`   ID: ${newStudentId}`);
        console.log(`   Name: Test Student`);
        console.log(`   Email: ${newStudentId.toLowerCase()}@test.com`);
        
        console.log(`\n🎯 Next steps:`);
        console.log(`1. Go to the enrollment page: http://localhost:3000`);
        console.log(`2. Use Student ID: ${newStudentId}`);
        console.log(`3. Complete the face enrollment process`);
        console.log(`4. Test verification with the new student`);
        
        return newStudentId;
        
    } catch (error) {
        console.error('❌ Error creating student:', error.message);
    } finally {
        db.close();
    }
}

async function main() {
    await checkStudentsTable();
    await createNewStudent();
}

main();