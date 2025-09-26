const sqlite3 = require('sqlite3').verbose();
const path = require('path');

// Database path
const dbPath = path.join(__dirname, 'database', 'attendance.db');

console.log('🔍 Investigating specific students appearing in frontend...');
console.log('Database path:', dbPath);

const db = new sqlite3.Database(dbPath, (err) => {
    if (err) {
        console.error('❌ Error opening database:', err.message);
        return;
    }
    console.log('✅ Connected to SQLite database');
});

// Students we're investigating
const suspiciousStudents = ['Student1647788', 'STU007'];

async function investigateStudents() {
    console.log('\n📋 Investigating suspicious students:', suspiciousStudents);
    
    // Check if these students exist in students table
    console.log('\n1️⃣ Checking students table...');
    for (const studentId of suspiciousStudents) {
        await new Promise((resolve) => {
            db.get(
                'SELECT * FROM students WHERE student_id = ?',
                [studentId],
                (err, row) => {
                    if (err) {
                        console.error(`❌ Error checking student ${studentId}:`, err.message);
                    } else if (row) {
                        console.log(`✅ Found ${studentId} in students table:`, row);
                    } else {
                        console.log(`❌ ${studentId} NOT found in students table`);
                    }
                    resolve();
                }
            );
        });
    }
    
    // Check if these students exist in daily_attendance for today
    console.log('\n2️⃣ Checking daily_attendance table for today...');
    const today = new Date().toISOString().split('T')[0];
    console.log('Today\'s date:', today);
    
    for (const studentId of suspiciousStudents) {
        await new Promise((resolve) => {
            db.get(
                'SELECT * FROM daily_attendance WHERE student_id = ? AND date = ?',
                [studentId, today],
                (err, row) => {
                    if (err) {
                        console.error(`❌ Error checking attendance for ${studentId}:`, err.message);
                    } else if (row) {
                        console.log(`✅ Found ${studentId} in daily_attendance:`, row);
                    } else {
                        console.log(`❌ ${studentId} NOT found in daily_attendance for today`);
                    }
                    resolve();
                }
            );
        });
    }
    
    // Check if these students exist in any other date's attendance
    console.log('\n3️⃣ Checking daily_attendance for any date...');
    for (const studentId of suspiciousStudents) {
        await new Promise((resolve) => {
            db.all(
                'SELECT * FROM daily_attendance WHERE student_id = ? ORDER BY date DESC LIMIT 5',
                [studentId],
                (err, rows) => {
                    if (err) {
                        console.error(`❌ Error checking historical attendance for ${studentId}:`, err.message);
                    } else if (rows && rows.length > 0) {
                        console.log(`📅 Found ${rows.length} historical attendance records for ${studentId}:`);
                        rows.forEach(row => {
                            console.log(`   - Date: ${row.date}, Status: ${row.status}, Time: ${row.time_in || 'N/A'}`);
                        });
                    } else {
                        console.log(`❌ No attendance records found for ${studentId}`);
                    }
                    resolve();
                }
            );
        });
    }
    
    // Check all tables for these student IDs
    console.log('\n4️⃣ Searching all tables for these student IDs...');
    
    // Get all table names
    await new Promise((resolve) => {
        db.all(
            "SELECT name FROM sqlite_master WHERE type='table'",
            (err, tables) => {
                if (err) {
                    console.error('❌ Error getting table names:', err.message);
                    resolve();
                    return;
                }
                
                console.log('📋 Found tables:', tables.map(t => t.name).join(', '));
                
                // Search each table for our student IDs
                let searchPromises = [];
                
                tables.forEach(table => {
                    if (table.name.startsWith('sqlite_')) return; // Skip system tables
                    
                    suspiciousStudents.forEach(studentId => {
                        searchPromises.push(new Promise((searchResolve) => {
                            // Get column info first
                            db.all(`PRAGMA table_info(${table.name})`, (err, columns) => {
                                if (err) {
                                    console.error(`❌ Error getting columns for ${table.name}:`, err.message);
                                    searchResolve();
                                    return;
                                }
                                
                                // Look for student_id column
                                const hasStudentId = columns.some(col => col.name === 'student_id');
                                if (!hasStudentId) {
                                    searchResolve();
                                    return;
                                }
                                
                                // Search for the student ID
                                db.all(
                                    `SELECT * FROM ${table.name} WHERE student_id = ?`,
                                    [studentId],
                                    (err, rows) => {
                                        if (err) {
                                            console.error(`❌ Error searching ${table.name} for ${studentId}:`, err.message);
                                        } else if (rows && rows.length > 0) {
                                            console.log(`🔍 Found ${studentId} in table ${table.name}:`, rows);
                                        }
                                        searchResolve();
                                    }
                                );
                            });
                        }));
                    });
                });
                
                Promise.all(searchPromises).then(() => {
                    resolve();
                });
            }
        );
    });
    
    console.log('\n✅ Investigation complete!');
    db.close();
}

investigateStudents().catch(console.error);