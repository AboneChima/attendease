const { dbAdapter } = require('./config/database-adapter');

async function checkFaceTable() {
  try {
    console.log('=== Checking face_encodings table ===');
    
    // Check table structure
    const [tableInfo] = await dbAdapter.execute('PRAGMA table_info(face_encodings)');
    console.log('\nTable structure:');
    tableInfo.forEach(col => {
      console.log(`  - ${col.name}: ${col.type} ${col.notnull ? 'NOT NULL' : ''} ${col.pk ? 'PRIMARY KEY' : ''}`);
    });
    
    // Check if table has any data
    const [count] = await dbAdapter.execute('SELECT COUNT(*) as count FROM face_encodings');
    console.log(`\nTotal records: ${count[0].count}`);
    
    // Show all records if any exist
    if (count[0].count > 0) {
      const [records] = await dbAdapter.execute('SELECT student_id, LENGTH(face_descriptor) as desc_length, sample_count, enrollment_date FROM face_encodings');
      console.log('\nExisting records:');
      records.forEach(record => {
        console.log(`  - Student: ${record.student_id}, Descriptor Length: ${record.desc_length}, Samples: ${record.sample_count}, Enrolled: ${record.enrollment_date}`);
      });
    } else {
      console.log('\n❌ No face encodings found in the database');
    }
    
    // Check if students table has data
    const [studentCount] = await dbAdapter.execute('SELECT COUNT(*) as count FROM students');
    console.log(`\nTotal students: ${studentCount[0].count}`);
    
    if (studentCount[0].count > 0) {
      const [students] = await dbAdapter.execute('SELECT student_id, name FROM students LIMIT 5');
      console.log('\nSample students:');
      students.forEach(student => {
        console.log(`  - ${student.student_id}: ${student.name}`);
      });
    }
    
    process.exit(0);
  } catch (error) {
    console.error('Error:', error);
    process.exit(1);
  }
}

checkFaceTable();