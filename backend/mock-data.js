// Mock data service for when database is not available
const mockStudents = [
  {
    id: 1,
    student_id: 'STU001',
    name: 'John Doe',
    email: 'john.doe@example.com',
    phone: '1234567890',
    qr_code: 'STU001_qr.png',
    created_at: new Date().toISOString()
  },
  {
    id: 2,
    student_id: 'STU002',
    name: 'Jane Smith',
    email: 'jane.smith@example.com',
    phone: '0987654321',
    qr_code: 'STU002_qr.png',
    created_at: new Date().toISOString()
  }
];

const mockTeachers = [
  {
    id: 1,
    name: 'Teacher Demo',
    email: 'teacher@example.com',
    password: '$2a$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi' // password123
  }
];

const mockAttendance = [
  {
    id: 1,
    student_id: 'STU001',
    student_name: 'John Doe',
    date: new Date().toISOString().split('T')[0],
    time: '09:30:00',
    created_at: new Date().toISOString()
  },
  {
    id: 2,
    student_id: 'STU002',
    student_name: 'Jane Smith',
    date: new Date().toISOString().split('T')[0],
    time: '09:45:00',
    created_at: new Date().toISOString()
  }
];

// Helper functions for mock data manipulation
const addStudent = (student) => {
  mockStudents.push(student);
  return student;
};

const addTeacher = (teacher) => {
  mockTeachers.push(teacher);
  return teacher;
};

const addAttendance = (attendance) => {
  mockAttendance.push(attendance);
  return attendance;
};

module.exports = {
  students: mockStudents,
  teachers: mockTeachers,
  attendance: mockAttendance,
  addStudent,
  addTeacher,
  addAttendance
};