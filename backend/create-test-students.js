const { dbAdapter } = require('./config/database-adapter');

async function createTestStudents() {
  try {
    const testStudents = [
      { student_id: 'STU001', name: 'Test Student 1', email: 'test1@example.com' },
      { student_id: 'STU002', name: 'Test Student 2', email: 'test2@example.com' },
      { student_id: 'STU003', name: 'Test Student 3', email: 'test3@example.com' },
      { student_id: 'STU004', name: 'Test Student 4', email: 'test4@example.com' }
    ];

    for (const student of testStudents) {
      // Check if student already exists
      const [existing] = await dbAdapter.execute(
        'SELECT student_id FROM students WHERE student_id = ?',
        [student.student_id]
      );

      if (existing.length === 0) {
        await dbAdapter.execute(
          'INSERT INTO students (student_id, name, email, qr_code) VALUES (?, ?, ?, ?)',
          [student.student_id, student.name, student.email, `qr_${student.student_id}`]
        );
        console.log(`✅ Created student: ${student.student_id}`);
      } else {
        console.log(`ℹ️  Student already exists: ${student.student_id}`);
      }
    }

    console.log('\n🎉 Test students setup completed!');
  } catch (error) {
    console.error('❌ Error creating test students:', error.message);
  }
}

createTestStudents().then(() => process.exit(0)).catch(error => {
  console.error(error);
  process.exit(1);
});