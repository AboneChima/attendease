const sqlite3 = require('sqlite3').verbose();
const path = require('path');

const DB_PATH = path.join(__dirname, 'database', 'attendance.db');

async function checkTableStructure() {
    console.log('🔍 [TABLE-STRUCTURE] Checking database table structure...');
    
    const db = new sqlite3.Database(DB_PATH);
    
    try {
        // Get table schema
        const schema = await new Promise((resolve, reject) => {
            db.all(
                "PRAGMA table_info(photo_face_enrollments)",
                (err, rows) => {
                    if (err) reject(err);
                    else resolve(rows);
                }
            );
        });
        
        console.log('📋 [TABLE-STRUCTURE] photo_face_enrollments columns:');
        schema.forEach(column => {
            console.log(`  ${column.name}: ${column.type} ${column.notnull ? 'NOT NULL' : ''} ${column.pk ? 'PRIMARY KEY' : ''}`);
        });
        
        // Get sample data
        const sampleData = await new Promise((resolve, reject) => {
            db.all(
                "SELECT * FROM photo_face_enrollments WHERE is_active = 1 LIMIT 1",
                (err, rows) => {
                    if (err) reject(err);
                    else resolve(rows);
                }
            );
        });
        
        if (sampleData.length > 0) {
            console.log('\n📊 [TABLE-STRUCTURE] Sample enrollment data:');
            const sample = sampleData[0];
            Object.keys(sample).forEach(key => {
                const value = sample[key];
                if (typeof value === 'string' && value.length > 100) {
                    console.log(`  ${key}: ${value.substring(0, 100)}... (${value.length} chars)`);
                } else {
                    console.log(`  ${key}: ${value}`);
                }
            });
        }
        
        // Check if there's an embedding column with a different name
        const allColumns = schema.map(col => col.name);
        const embeddingColumns = allColumns.filter(name => 
            name.toLowerCase().includes('embedding') || 
            name.toLowerCase().includes('vector') ||
            name.toLowerCase().includes('feature')
        );
        
        if (embeddingColumns.length > 0) {
            console.log(`\n🧠 [TABLE-STRUCTURE] Found potential embedding columns: ${embeddingColumns.join(', ')}`);
        } else {
            console.log('\n❌ [TABLE-STRUCTURE] No embedding columns found!');
            console.log('💡 This explains why verification is failing - no embeddings to compare against');
        }
        
    } catch (error) {
        console.error('❌ [TABLE-STRUCTURE] Error:', error);
    } finally {
        db.close();
    }
}

checkTableStructure().catch(console.error);