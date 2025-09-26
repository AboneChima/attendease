const express = require('express');
const { body, validationResult } = require('express-validator');
const { dbAdapter } = require('../config/database-adapter');
const { authenticateToken } = require('../middleware/auth');

const router = express.Router();

// Record attendance
router.post('/record', [
  body('student_id').notEmpty().withMessage('Student ID is required')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { student_id } = req.body;

    // Verify student exists
    const [students] = await dbAdapter.execute(
      'SELECT student_id, name FROM students WHERE student_id = ?',
      [student_id]
    );

    if (students.length === 0) {
      return res.status(404).json({ error: 'Student not found' });
    }

    const student = students[0];
    const today = new Date().toISOString().split('T')[0]; // YYYY-MM-DD format
    const currentTime = new Date().toTimeString().split(' ')[0]; // HH:MM:SS format

    // Check if attendance already recorded today
    const [existingAttendance] = await dbAdapter.execute(
      'SELECT * FROM attendance WHERE student_id = ? AND date = ?',
      [student_id, today]
    );

    if (existingAttendance.length > 0) {
      return res.status(400).json({ 
        error: 'Attendance already recorded for today',
        attendance: existingAttendance[0]
      });
    }

    // Record attendance
    await dbAdapter.execute(
      'INSERT INTO attendance (student_id, student_name, date, time) VALUES (?, ?, ?, ?)',
      [student_id, student.name, today, currentTime]
    );

    res.status(201).json({
      message: 'Attendance recorded successfully',
      attendance: {
        student_id,
        student_name: student.name,
        date: today,
        time: currentTime
      }
    });
  } catch (error) {
    console.error('Record attendance error:', error);
    res.status(500).json({ error: 'Failed to record attendance' });
  }
});

// Get attendance by date (protected route)
router.get('/date/:date', authenticateToken, async (req, res) => {
  try {
    const { date } = req.params;

    // Validate date format (YYYY-MM-DD)
    if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) {
      return res.status(400).json({ error: 'Invalid date format. Use YYYY-MM-DD' });
    }

    const [attendance] = await dbAdapter.execute(
      'SELECT * FROM attendance WHERE date = ? ORDER BY time ASC',
      [date]
    );

    res.json({
      date,
      count: attendance.length,
      attendance
    });
  } catch (error) {
    console.error('Get attendance by date error:', error);
    res.status(500).json({ error: 'Failed to fetch attendance' });
  }
});

// Get attendance by student (protected route)
router.get('/student/:student_id', authenticateToken, async (req, res) => {
  try {
    const { student_id } = req.params;
    const { start_date, end_date } = req.query;

    let query = 'SELECT * FROM attendance WHERE student_id = ?';
    let params = [student_id];

    if (start_date && end_date) {
      query += ' AND date BETWEEN ? AND ?';
      params.push(start_date, end_date);
    }

    query += ' ORDER BY date DESC, time DESC';

    const [attendance] = await dbAdapter.execute(query, params);

    // Get student info
    const [students] = await dbAdapter.execute(
      'SELECT student_id, name, email FROM students WHERE student_id = ?',
      [student_id]
    );

    if (students.length === 0) {
      return res.status(404).json({ error: 'Student not found' });
    }

    res.json({
      student: students[0],
      count: attendance.length,
      attendance
    });
  } catch (error) {
    console.error('Get attendance by student error:', error);
    res.status(500).json({ error: 'Failed to fetch attendance' });
  }
});

// Get attendance summary (protected route)
router.get('/summary', authenticateToken, async (req, res) => {
  try {
    const { start_date, end_date } = req.query;

    let dateFilter = '';
    let params = [];

    if (start_date && end_date) {
      dateFilter = 'WHERE date BETWEEN ? AND ?';
      params = [start_date, end_date];
    }

    // Get total attendance count
    const [totalCount] = await dbAdapter.execute(
      `SELECT COUNT(*) as total FROM attendance ${dateFilter}`,
      params
    );

    // Get attendance by date
    const [dailyAttendance] = await dbAdapter.execute(
      `SELECT date, COUNT(*) as count FROM attendance ${dateFilter} GROUP BY date ORDER BY date DESC`,
      params
    );

    // Get top attending students
    const [topStudents] = await dbAdapter.execute(
      `SELECT student_id, student_name, COUNT(*) as attendance_count 
       FROM attendance ${dateFilter} 
       GROUP BY student_id, student_name 
       ORDER BY attendance_count DESC 
       LIMIT 10`,
      params
    );

    // Get total registered students count
    const [totalStudents] = await dbAdapter.execute(
      'SELECT COUNT(*) as total FROM students'
    );

    res.json({
        total_attendance: totalCount[0].total,
        daily_attendance: dailyAttendance,
        top_students: topStudents,
        total_registered_students: totalStudents[0].total,
        date_range: {
          start: start_date || 'All time',
          end: end_date || 'All time'
        }
      });
  } catch (error) {
    console.error('Get attendance summary error:', error);
    res.status(500).json({ error: 'Failed to fetch attendance summary' });
  }
});

// Get today's attendance
router.get('/today', authenticateToken, async (req, res) => {
  try {
    const today = new Date().toISOString().split('T')[0];

    const [attendance] = await dbAdapter.execute(
      'SELECT * FROM attendance WHERE date = ? ORDER BY time ASC',
      [today]
    );

    res.json({
      date: today,
      count: attendance.length,
      attendance
    });
  } catch (error) {
    console.error('Get today attendance error:', error);
    res.status(500).json({ error: 'Failed to fetch today\'s attendance' });
  }
});

module.exports = router;