const express = require('express');
const { dbAdapter } = require('../config/database-adapter');
const { authenticateToken } = require('../middleware/auth');
const { initializeDailyAttendance, finalizeDailyAttendance } = require('../database/setup-attendance-management');
const {
  checkAttendanceModificationPermission,
  checkTimeRestrictions,
  logAttendanceModification,
  validateModificationReason
} = require('../middleware/audit-middleware');

const router = express.Router();

// Get all students with their attendance status for a specific date
router.get('/daily/:date?', authenticateToken, async (req, res) => {
  try {
    const date = req.params.date || new Date().toISOString().split('T')[0];
    
    // Check if daily attendance has been initialized for this date
    const [sessionCheck] = await dbAdapter.execute(
      'SELECT * FROM attendance_sessions WHERE session_date = ?',
      [date]
    );
    
    // If not initialized, initialize it
    if (sessionCheck.length === 0) {
      await initializeDailyAttendance(date);
    }
    
    // Get all students with their attendance status
    const [attendanceData] = await dbAdapter.execute(`
      SELECT 
        da.student_id,
        da.student_name,
        da.status,
        da.check_in_time,
        da.updated_at,
        s.email,
        s.phone
      FROM daily_attendance da
      LEFT JOIN students s ON da.student_id = s.student_id
      WHERE da.date = ?
      ORDER BY da.student_name ASC
    `, [date]);
    
    // Get summary statistics
    const [summary] = await dbAdapter.execute(`
      SELECT 
        COUNT(*) as total_students,
        SUM(CASE WHEN status = 'present' THEN 1 ELSE 0 END) as present_count,
        SUM(CASE WHEN status = 'absent' THEN 1 ELSE 0 END) as absent_count,
        SUM(CASE WHEN status = 'not_yet_here' THEN 1 ELSE 0 END) as not_yet_here_count
      FROM daily_attendance
      WHERE date = ?
    `, [date]);
    
    const stats = summary[0] || { total_students: 0, present_count: 0, absent_count: 0, not_yet_here_count: 0 };
    const attendanceRate = stats.total_students > 0 ? (stats.present_count / stats.total_students) * 100 : 0;
    
    res.json({
      success: true,
      date,
      students: attendanceData,
      summary: {
        ...stats,
        attendance_rate: Math.round(attendanceRate * 100) / 100
      }
    });
    
  } catch (error) {
    console.error('Error fetching daily attendance:', error);
    res.status(500).json({ error: 'Failed to fetch daily attendance' });
  }
});

// Initialize daily attendance for a specific date
router.post('/initialize/:date?', authenticateToken, async (req, res) => {
  try {
    const date = req.params.date || new Date().toISOString().split('T')[0];
    
    const studentCount = await initializeDailyAttendance(date);
    
    res.json({
      success: true,
      message: `Daily attendance initialized for ${studentCount} students`,
      date,
      student_count: studentCount
    });
    
  } catch (error) {
    console.error('Error initializing daily attendance:', error);
    res.status(500).json({ error: 'Failed to initialize daily attendance' });
  }
});

// Finalize daily attendance (mark not_yet_here as absent)
router.post('/finalize/:date?', authenticateToken, async (req, res) => {
  try {
    const date = req.params.date || new Date().toISOString().split('T')[0];
    
    const result = await finalizeDailyAttendance(date);
    
    res.json({
      success: true,
      message: 'Daily attendance finalized',
      date,
      ...result
    });
    
  } catch (error) {
    console.error('Error finalizing daily attendance:', error);
    res.status(500).json({ error: 'Failed to finalize daily attendance' });
  }
});

// Get attendance history
router.get('/history', authenticateToken, async (req, res) => {
  try {
    const { limit = 30, offset = 0 } = req.query;
    
    const [history] = await dbAdapter.execute(`
      SELECT 
        date,
        total_students,
        present_count,
        absent_count,
        attendance_rate,
        created_at
      FROM attendance_history
      ORDER BY date DESC
      LIMIT ? OFFSET ?
    `, [parseInt(limit), parseInt(offset)]);
    
    // Get total count for pagination
    const [countResult] = await dbAdapter.execute(
      'SELECT COUNT(*) as total FROM attendance_history'
    );
    
    res.json({
      success: true,
      history,
      pagination: {
        total: countResult[0]?.total || 0,
        limit: parseInt(limit),
        offset: parseInt(offset)
      }
    });
    
  } catch (error) {
    console.error('Error fetching attendance history:', error);
    res.status(500).json({ error: 'Failed to fetch attendance history' });
  }
});

// Get attendance statistics for a date range
router.get('/stats', authenticateToken, async (req, res) => {
  try {
    const { start_date, end_date } = req.query;
    
    if (!start_date || !end_date) {
      return res.status(400).json({ error: 'start_date and end_date are required' });
    }
    
    const [stats] = await dbAdapter.execute(`
      SELECT 
        AVG(attendance_rate) as avg_attendance_rate,
        MAX(attendance_rate) as max_attendance_rate,
        MIN(attendance_rate) as min_attendance_rate,
        AVG(total_students) as avg_total_students,
        SUM(present_count) as total_present,
        SUM(absent_count) as total_absent,
        COUNT(*) as total_days
      FROM attendance_history
      WHERE date BETWEEN ? AND ?
    `, [start_date, end_date]);
    
    // Get daily breakdown
    const [dailyBreakdown] = await dbAdapter.execute(`
      SELECT 
        date,
        total_students,
        present_count,
        absent_count,
        attendance_rate
      FROM attendance_history
      WHERE date BETWEEN ? AND ?
      ORDER BY date ASC
    `, [start_date, end_date]);
    
    res.json({
      success: true,
      period: { start_date, end_date },
      summary: stats[0] || {},
      daily_breakdown: dailyBreakdown
    });
    
  } catch (error) {
    console.error('Error fetching attendance statistics:', error);
    res.status(500).json({ error: 'Failed to fetch attendance statistics' });
  }
});

// Update student attendance status manually (SECURED)
router.put('/update-status', 
  authenticateToken,
  checkAttendanceModificationPermission,
  checkTimeRestrictions,
  validateModificationReason,
  async (req, res) => {
    try {
      const { student_id, date, status, reason } = req.body;
      
      if (!student_id || !date || !status) {
        return res.status(400).json({ error: 'student_id, date, and status are required' });
      }
      
      if (!['present', 'absent', 'not_yet_here'].includes(status)) {
        return res.status(400).json({ error: 'Invalid status. Must be present, absent, or not_yet_here' });
      }
      
      // Get current attendance record for audit logging
      const [currentRecord] = await dbAdapter.execute(
        'SELECT * FROM daily_attendance WHERE student_id = ? AND date = ?',
        [student_id, date]
      );
      
      if (currentRecord.length === 0) {
        return res.status(404).json({ error: 'Attendance record not found' });
      }
      
      const oldRecord = currentRecord[0];
      
      // Check if status is actually changing
      if (oldRecord.status === status) {
        return res.status(400).json({ 
          error: 'Status is already set to the requested value',
          current_status: status
        });
      }
      
      // Update the attendance status
      const [result] = await dbAdapter.execute(`
        UPDATE daily_attendance 
        SET status = ?, updated_at = CURRENT_TIMESTAMP
        WHERE student_id = ? AND date = ?
      `, [status, student_id, date]);
      
      if (result.affectedRows === 0) {
        return res.status(404).json({ error: 'Failed to update attendance record' });
      }
      
      let newCheckInTime = oldRecord.check_in_time;
      
      // If marking as present, also check if there's an attendance record
      if (status === 'present') {
        const [attendanceRecord] = await dbAdapter.execute(
          'SELECT time FROM attendance WHERE student_id = ? AND date = ?',
          [student_id, date]
        );
        
        if (attendanceRecord.length > 0) {
          newCheckInTime = attendanceRecord[0].time;
          await dbAdapter.execute(`
            UPDATE daily_attendance 
            SET check_in_time = ?
            WHERE student_id = ? AND date = ?
          `, [newCheckInTime, student_id, date]);
        }
      } else if (status === 'absent' || status === 'not_yet_here') {
        // Clear check-in time for absent or not_yet_here status
        newCheckInTime = null;
        await dbAdapter.execute(`
          UPDATE daily_attendance 
          SET check_in_time = NULL
          WHERE student_id = ? AND date = ?
        `, [student_id, date]);
      }
      
      // Log the modification for audit trail
      await logAttendanceModification({
        studentId: student_id,
        studentName: oldRecord.student_name,
        date: date,
        oldStatus: oldRecord.status,
        newStatus: status,
        oldCheckInTime: oldRecord.check_in_time,
        newCheckInTime: newCheckInTime,
        modifiedBy: req.auditUser.username,
        reason: reason || null,
        modificationType: 'manual_update',
        ipAddress: req.auditUser.ip,
        userAgent: req.auditUser.userAgent
      });
      
      res.json({
        success: true,
        message: 'Attendance status updated successfully',
        changes: {
          student_id,
          date,
          old_status: oldRecord.status,
          new_status: status,
          modified_by: req.auditUser.username,
          timestamp: new Date().toISOString()
        }
      });
      
    } catch (error) {
      console.error('Error updating attendance status:', error);
      res.status(500).json({ error: 'Failed to update attendance status' });
    }
  }
);

// Get audit logs (admin only)
router.get('/audit-logs', authenticateToken, async (req, res) => {
  try {
    const username = req.user?.username || req.user?.email || 'unknown';
    
    // Check if user has permission to view audit logs
    const [userRole] = await dbAdapter.execute(
      'SELECT * FROM user_roles WHERE username = ?',
      [username]
    );
    
    if (userRole.length === 0 || !userRole[0].can_view_audit_logs) {
      return res.status(403).json({ 
        error: 'Access denied: Insufficient permissions to view audit logs'
      });
    }
    
    const { page = 1, limit = 50, student_id, date_from, date_to, modified_by } = req.query;
    const offset = (page - 1) * limit;
    
    let whereClause = 'WHERE 1=1';
    let params = [];
    
    if (student_id) {
      whereClause += ' AND student_id = ?';
      params.push(student_id);
    }
    
    if (date_from) {
      whereClause += ' AND date >= ?';
      params.push(date_from);
    }
    
    if (date_to) {
      whereClause += ' AND date <= ?';
      params.push(date_to);
    }
    
    if (modified_by) {
      whereClause += ' AND modified_by = ?';
      params.push(modified_by);
    }
    
    // Get total count
    const [countResult] = await dbAdapter.execute(
      `SELECT COUNT(*) as total FROM attendance_audit_log ${whereClause}`,
      params
    );
    
    // Get audit logs
    const [auditLogs] = await dbAdapter.execute(`
      SELECT 
        aal.*,
        ur.role as modifier_role
      FROM attendance_audit_log aal
      LEFT JOIN user_roles ur ON aal.modified_by = ur.username
      ${whereClause}
      ORDER BY aal.created_at DESC
      LIMIT ? OFFSET ?
    `, [...params, parseInt(limit), offset]);
    
    res.json({
      success: true,
      data: auditLogs,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total: countResult[0].total,
        pages: Math.ceil(countResult[0].total / limit)
      }
    });
    
  } catch (error) {
    console.error('Error fetching audit logs:', error);
    res.status(500).json({ error: 'Failed to fetch audit logs' });
  }
});

// Get current session info
router.get('/session/:date?', authenticateToken, async (req, res) => {
  try {
    const date = req.params.date || new Date().toISOString().split('T')[0];
    
    const [session] = await dbAdapter.execute(
      'SELECT * FROM attendance_sessions WHERE session_date = ?',
      [date]
    );
    
    res.json({
      success: true,
      session: session[0] || null,
      date
    });
    
  } catch (error) {
    console.error('Error fetching session info:', error);
    res.status(500).json({ error: 'Failed to fetch session info' });
  }
});

module.exports = router;