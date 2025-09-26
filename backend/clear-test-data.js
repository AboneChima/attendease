const { dbAdapter } = require('./config/database-adapter');

async function clearTestData() {
  try {
    await dbAdapter.execute('DELETE FROM face_encodings WHERE student_id IN (?, ?)', ['STU001', 'STU002']);
    console.log('✅ Test data cleared successfully');
  } catch (error) {
    console.error('❌ Error clearing test data:', error.message);
  }
}

clearTestData().then(() => process.exit(0)).catch(error => {
  console.error(error);
  process.exit(1);
});