const sqlite3 = require('sqlite3').verbose();
const path = require('path');

// Database path
const dbPath = path.join(__dirname, 'database', 'attendance.db');

console.log('🔍 Checking Audit Log Table Structure');
console.log('=' .repeat(50));

const db = new sqlite3.Database(dbPath, (err) => {
    if (err) {
        console.error('❌ Error opening database:', err.message);
        return;
    }
    console.log('✅ Connected to SQLite database');
    checkAuditStructure();
});

function checkAuditStructure() {
    console.log('\n📋 Checking attendance_audit_log table structure...');
    
    db.all(`PRAGMA table_info(attendance_audit_log)`, [], (err, columns) => {
        if (err) {
            console.error('❌ Error checking table structure:', err.message);
            db.close();
            return;
        }
        
        if (columns.length === 0) {
            console.log('   ⚠️  attendance_audit_log table not found or empty');
        } else {
            console.log('   ✅ Table structure:');
            columns.forEach(column => {
                console.log(`      ${column.name} (${column.type}) - ${column.notnull ? 'NOT NULL' : 'NULL'}`);
            });
        }
        
        // Check if there are any records
        db.all(`SELECT COUNT(*) as count FROM attendance_audit_log`, [], (err, countResult) => {
            if (err) {
                console.error('❌ Error counting records:', err.message);
            } else {
                console.log(`\n📊 Total records in audit log: ${countResult[0].count}`);
                
                if (countResult[0].count > 0) {
                    // Show recent records
                    db.all(`SELECT * FROM attendance_audit_log ORDER BY created_at DESC LIMIT 5`, [], (err, records) => {
                        if (err) {
                            console.error('❌ Error fetching records:', err.message);
                        } else {
                            console.log('\n📝 Recent audit records:');
                            records.forEach((record, index) => {
                                console.log(`\n   ${index + 1}. Record ID: ${record.id}`);
                                Object.keys(record).forEach(key => {
                                    if (key !== 'id') {
                                        console.log(`      ${key}: ${record[key]}`);
                                    }
                                });
                            });
                        }
                        
                        db.close();
                    });
                } else {
                    console.log('   ⚠️  No audit records found');
                    db.close();
                }
            }
        });
    });
}

// Handle database errors
db.on('error', (err) => {
    console.error('❌ Database error:', err.message);
});