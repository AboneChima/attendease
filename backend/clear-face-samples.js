const { getDatabase } = require('./config/sqlite-database');

async function clearFaceSamples() {
  try {
    const db = await getDatabase();
    
    console.log('🧹 Clearing existing face samples for testing...');
    
    // Clear face samples
    await db.run('DELETE FROM face_samples');
    console.log('✅ Cleared face_samples table');
    
    // Clear enrollment sessions
    await db.run('DELETE FROM face_enrollment_sessions');
    console.log('✅ Cleared face_enrollment_sessions table');
    
    // Verify
    const sampleCount = await db.get('SELECT COUNT(*) as count FROM face_samples');
    const sessionCount = await db.get('SELECT COUNT(*) as count FROM face_enrollment_sessions');
    
    console.log(`📊 Remaining samples: ${sampleCount.count}`);
    console.log(`📊 Remaining sessions: ${sessionCount.count}`);
    
    await db.close();
    console.log('🎉 Database cleared successfully!');
    
  } catch (error) {
    console.error('❌ Error:', error);
  }
}

clearFaceSamples();