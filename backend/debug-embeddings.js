const sqlite3 = require('sqlite3').verbose();
const path = require('path');

const DB_PATH = path.join(__dirname, 'database', 'attendance.db');

async function debugEmbeddings() {
    console.log('🔍 [DEBUG-EMBEDDINGS] Examining enrollment embeddings...');
    
    const db = new sqlite3.Database(DB_PATH);
    
    try {
        // Get all active enrollments with embedding data
        const enrollments = await new Promise((resolve, reject) => {
            db.all(
                `SELECT id, student_id, face_confidence, photo_quality_score, 
                        face_embedding, model_name, created_at
                 FROM photo_face_enrollments 
                 WHERE is_active = 1 
                 ORDER BY student_id`,
                (err, rows) => {
                    if (err) reject(err);
                    else resolve(rows);
                }
            );
        });
        
        console.log(`📋 [DEBUG-EMBEDDINGS] Found ${enrollments.length} active enrollments`);
        
        enrollments.forEach(enrollment => {
            console.log(`\n👤 ${enrollment.student_id} (ID: ${enrollment.id}):`);
            console.log(`  📊 Face Confidence: ${enrollment.face_confidence}`);
            console.log(`  🎯 Photo Quality: ${enrollment.photo_quality_score}`);
            console.log(`  🤖 Model: ${enrollment.model_name || 'NULL'}`);
            console.log(`  📅 Created: ${enrollment.created_at}`);
            
            if (enrollment.face_embedding) {
                try {
                    const embedding = JSON.parse(enrollment.face_embedding);
                    console.log(`  🧠 Embedding: Array of ${embedding.length} values`);
                    console.log(`  📈 Sample values: [${embedding.slice(0, 5).map(v => v.toFixed(4)).join(', ')}...]`);
                    
                    // Check for unusual values
                    const hasNaN = embedding.some(v => isNaN(v));
                    const hasInf = embedding.some(v => !isFinite(v));
                    const allZeros = embedding.every(v => v === 0);
                    
                    if (hasNaN) console.log(`  ⚠️  WARNING: Embedding contains NaN values`);
                    if (hasInf) console.log(`  ⚠️  WARNING: Embedding contains infinite values`);
                    if (allZeros) console.log(`  ⚠️  WARNING: Embedding is all zeros`);
                    
                } catch (error) {
                    console.log(`  ❌ Invalid embedding JSON: ${error.message}`);
                }
            } else {
                console.log(`  ❌ No embedding data found`);
            }
        });
        
        // Check for model consistency
        const models = [...new Set(enrollments.map(e => e.model_name).filter(Boolean))];
        console.log(`\n🤖 [DEBUG-EMBEDDINGS] Models in use: ${models.join(', ')}`);
        
        if (models.length > 1) {
            console.log(`⚠️  WARNING: Multiple models detected. This could cause verification issues.`);
        }
        
        // Check for missing model names
        const missingModels = enrollments.filter(e => !e.model_name);
        if (missingModels.length > 0) {
            console.log(`⚠️  WARNING: ${missingModels.length} enrollments have no model_name specified`);
        }
        
        console.log('\n💡 [DEBUG-EMBEDDINGS] Recommendations:');
        console.log('  1. All enrollments should use the same model (Facenet512)');
        console.log('  2. Embeddings should be valid arrays of 512 float values');
        console.log('  3. No NaN, infinite, or all-zero embeddings');
        
    } catch (error) {
        console.error('❌ [DEBUG-EMBEDDINGS] Error:', error);
    } finally {
        db.close();
    }
}

debugEmbeddings().catch(console.error);