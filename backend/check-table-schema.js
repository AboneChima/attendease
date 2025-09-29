const { getDatabase } = require('./config/sqlite-database');

async function checkTableSchema() {
  try {
    const db = await getDatabase();
    
    console.log('🔍 Checking face_samples table schema...');
    
    // Get table info
    const tableInfo = await db.all("PRAGMA table_info(face_samples)");
    console.log('\n📋 Table columns:');
    tableInfo.forEach(col => {
      console.log(`  ${col.name}: ${col.type} ${col.notnull ? 'NOT NULL' : ''} ${col.pk ? 'PRIMARY KEY' : ''}`);
    });
    
    // Get indexes
    const indexes = await db.all("PRAGMA index_list(face_samples)");
    console.log('\n📊 Table indexes:');
    for (const index of indexes) {
      console.log(`  ${index.name}: unique=${index.unique}`);
      const indexInfo = await db.all(`PRAGMA index_info(${index.name})`);
      const columns = indexInfo.map(info => info.name).join(', ');
      console.log(`    Columns: ${columns}`);
    }
    
    // Check for existing data
    const sampleCount = await db.get('SELECT COUNT(*) as count FROM face_samples');
    console.log(`\n📈 Current samples count: ${sampleCount.count}`);
    
    if (sampleCount.count > 0) {
      const samples = await db.all('SELECT student_id, sample_index, session_id, capture_angle FROM face_samples LIMIT 5');
      console.log('\n📝 Sample data:');
      samples.forEach(sample => {
        console.log(`  Student: ${sample.student_id}, Index: ${sample.sample_index}, Session: ${sample.session_id}, Angle: ${sample.capture_angle}`);
      });
    }
    
    await db.close();
    
  } catch (error) {
    console.error('❌ Error:', error);
  }
}

checkTableSchema();