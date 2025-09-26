const { dbAdapter } = require('../config/database-adapter');

// Middleware to check user permissions for attendance modifications
const checkAttendanceModificationPermission = async (req, res, next) => {
  try {
    const username = req.user?.username || req.user?.email || 'unknown';
    
    // Check if user has permission to modify attendance
    const [userRole] = await dbAdapter.execute(
      'SELECT * FROM user_roles WHERE username = ?',
      [username]
    );
    
    if (userRole.length === 0) {
      return res.status(403).json({ 
        error: 'Access denied: User not found in role system',
        code: 'USER_NOT_FOUND'
      });
    }
    
    if (!userRole[0].can_modify_attendance) {
      return res.status(403).json({ 
        error: 'Access denied: Insufficient permissions to modify attendance',
        code: 'INSUFFICIENT_PERMISSIONS'
      });
    }
    
    // Check daily modification limit
    const today = new Date().toISOString().split('T')[0];
    const [modificationCount] = await dbAdapter.execute(
      `SELECT COUNT(*) as count FROM attendance_audit_log 
       WHERE modified_by = ? AND DATE(created_at) = ? AND modification_type = 'manual_update'`,
      [username, today]
    );
    
    const [maxModifications] = await dbAdapter.execute(
      "SELECT setting_value FROM attendance_modification_settings WHERE setting_name = 'max_modifications_per_day'"
    );
    
    const maxLimit = parseInt(maxModifications[0]?.setting_value || '10');
    
    if (modificationCount[0].count >= maxLimit) {
      return res.status(429).json({ 
        error: `Daily modification limit exceeded (${maxLimit} modifications per day)`,
        code: 'DAILY_LIMIT_EXCEEDED'
      });
    }
    
    // Attach user info to request for audit logging
    req.auditUser = {
      username,
      role: userRole[0].role,
      ip: req.ip || req.connection.remoteAddress,
      userAgent: req.get('User-Agent')
    };
    
    next();
  } catch (error) {
    console.error('Error checking attendance modification permission:', error);
    res.status(500).json({ error: 'Internal server error during permission check' });
  }
};

// Middleware to check time-based restrictions
const checkTimeRestrictions = async (req, res, next) => {
  try {
    const { date } = req.body;
    
    if (!date) {
      return res.status(400).json({ error: 'Date is required for time restriction check' });
    }
    
    // Get time limit setting
    const [timeLimitSetting] = await dbAdapter.execute(
      "SELECT setting_value FROM attendance_modification_settings WHERE setting_name = 'modification_time_limit_hours'"
    );
    
    const timeLimitHours = parseInt(timeLimitSetting[0]?.setting_value || '24');
    
    // Calculate the cutoff time
    const targetDate = new Date(date);
    const now = new Date();
    const hoursDifference = (now - targetDate) / (1000 * 60 * 60);
    
    if (hoursDifference > timeLimitHours) {
      return res.status(403).json({ 
        error: `Cannot modify attendance for dates older than ${timeLimitHours} hours`,
        code: 'TIME_RESTRICTION_VIOLATED',
        details: {
          targetDate: date,
          timeLimitHours,
          hoursSinceDate: Math.round(hoursDifference)
        }
      });
    }
    
    next();
  } catch (error) {
    console.error('Error checking time restrictions:', error);
    res.status(500).json({ error: 'Internal server error during time restriction check' });
  }
};

// Function to log attendance modifications
const logAttendanceModification = async (auditData) => {
  try {
    const {
      studentId,
      studentName,
      date,
      oldStatus,
      newStatus,
      oldCheckInTime,
      newCheckInTime,
      modifiedBy,
      reason,
      modificationType = 'manual_update',
      ipAddress,
      userAgent
    } = auditData;
    
    await dbAdapter.execute(`
      INSERT INTO attendance_audit_log (
        student_id, student_name, date, old_status, new_status, 
        old_check_in_time, new_check_in_time, modified_by, 
        modification_reason, modification_type, ip_address, user_agent
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `, [
      studentId, studentName, date, oldStatus, newStatus,
      oldCheckInTime, newCheckInTime, modifiedBy,
      reason, modificationType, ipAddress, userAgent
    ]);
    
    console.log(`Audit log created: ${modifiedBy} changed ${studentId} status from ${oldStatus} to ${newStatus} on ${date}`);
  } catch (error) {
    console.error('Error logging attendance modification:', error);
    // Don't throw error to avoid breaking the main operation
  }
};

// Middleware to validate modification reason if required
const validateModificationReason = async (req, res, next) => {
  try {
    const [requireReasonSetting] = await dbAdapter.execute(
      "SELECT setting_value FROM attendance_modification_settings WHERE setting_name = 'require_reason_for_changes'"
    );
    
    const requireReason = requireReasonSetting[0]?.setting_value === 'true';
    
    if (requireReason && !req.body.reason) {
      return res.status(400).json({ 
        error: 'Modification reason is required',
        code: 'REASON_REQUIRED'
      });
    }
    
    next();
  } catch (error) {
    console.error('Error validating modification reason:', error);
    res.status(500).json({ error: 'Internal server error during reason validation' });
  }
};

module.exports = {
  checkAttendanceModificationPermission,
  checkTimeRestrictions,
  logAttendanceModification,
  validateModificationReason
};