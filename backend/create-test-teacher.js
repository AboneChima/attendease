const bcrypt = require('bcryptjs');
const { dbAdapter } = require('./config/database-adapter');

async function createTestTeacher() {
  try {
    console.log('Creating test teacher account...');
    
    const teacherId = 'TEST001';
    const name = 'Test Teacher';
    const email = 'test@teacher.com';
    const password = 'password123';
    
    // Check if teacher already exists
    const [existingTeachers] = await dbAdapter.execute(
      'SELECT * FROM teachers WHERE teacher_id = ? OR email = ?',
      [teacherId, email]
    );
    
    if (existingTeachers.length > 0) {
      console.log('✅ Test teacher already exists');
      console.log('Email:', email);
      console.log('Password:', password);
      return;
    }
    
    // Hash password
    const hashedPassword = await bcrypt.hash(password, 10);
    
    // Insert teacher into database
    await dbAdapter.execute(
      'INSERT INTO teachers (teacher_id, name, email, password) VALUES (?, ?, ?, ?)',
      [teacherId, name, email, hashedPassword]
    );
    
    console.log('✅ Test teacher created successfully!');
    console.log('Teacher ID:', teacherId);
    console.log('Email:', email);
    console.log('Password:', password);
    console.log('');
    console.log('You can now login with these credentials to get a JWT token.');
    
  } catch (error) {
    console.error('❌ Error creating test teacher:', error);
  } finally {
    process.exit(0);
  }
}

createTestTeacher();