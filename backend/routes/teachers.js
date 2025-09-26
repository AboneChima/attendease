const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { body, validationResult } = require('express-validator');
const { dbAdapter } = require('../config/database-adapter');
const { authenticateToken } = require('../middleware/auth');

const router = express.Router();

// Teacher login
router.post('/login', [
  body('email').isEmail().withMessage('Valid email is required'),
  body('password').notEmpty().withMessage('Password is required')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { email, password } = req.body;

    // Find teacher by email
    const [teachers] = await dbAdapter.execute(
      'SELECT * FROM teachers WHERE email = ?',
      [email]
    );

    if (teachers.length === 0) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    const teacher = teachers[0];

    // Verify password
    const isValidPassword = await bcrypt.compare(password, teacher.password);
    if (!isValidPassword) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    // Generate JWT token
    const token = jwt.sign(
      { 
        id: teacher.id, 
        teacher_id: teacher.teacher_id, 
        email: teacher.email 
      },
      process.env.JWT_SECRET,
      { expiresIn: '24h' }
    );

    res.json({
      message: 'Login successful',
      token,
      teacher: {
        id: teacher.id,
        teacher_id: teacher.teacher_id,
        name: teacher.name,
        email: teacher.email
      }
    });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ error: 'Login failed' });
  }
});

// Register new teacher (protected route)
router.post('/register', authenticateToken, [
  body('teacher_id').notEmpty().withMessage('Teacher ID is required'),
  body('name').notEmpty().withMessage('Name is required'),
  body('email').isEmail().withMessage('Valid email is required'),
  body('password').isLength({ min: 6 }).withMessage('Password must be at least 6 characters')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { teacher_id, name, email, password } = req.body;

    // Check if teacher already exists
    const [existingTeachers] = await dbAdapter.execute(
      'SELECT * FROM teachers WHERE teacher_id = ? OR email = ?',
      [teacher_id, email]
    );

    if (existingTeachers.length > 0) {
      return res.status(400).json({ error: 'Teacher ID or email already exists' });
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(password, 10);

    // Insert teacher into database
    await dbAdapter.execute(
      'INSERT INTO teachers (teacher_id, name, email, password) VALUES (?, ?, ?, ?)',
      [teacher_id, name, email, hashedPassword]
    );

    res.status(201).json({
      message: 'Teacher registered successfully',
      teacher: {
        teacher_id,
        name,
        email
      }
    });
  } catch (error) {
    console.error('Teacher registration error:', error);
    res.status(500).json({ error: 'Failed to register teacher' });
  }
});

// Get teacher profile
router.get('/profile', authenticateToken, async (req, res) => {
  try {
    const [teachers] = await dbAdapter.execute(
      'SELECT teacher_id, name, email, created_at FROM teachers WHERE teacher_id = ?',
      [req.user.teacher_id]
    );

    if (teachers.length === 0) {
      return res.status(404).json({ error: 'Teacher not found' });
    }

    res.json(teachers[0]);
  } catch (error) {
    console.error('Get profile error:', error);
    res.status(500).json({ error: 'Failed to fetch profile' });
  }
});

module.exports = router;