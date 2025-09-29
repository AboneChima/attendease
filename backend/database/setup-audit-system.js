const { dbAdapter } = require('../config/database-adapter');

// Setup audit system tables and initial data
const setupAuditSystem = async () => {
  try {
    console.log('Setting up audit system tables...');
    
    // Audit log table to track all manual attendance modifications
    await dbAdapter.execute(`
      CREATE TABLE IF NOT EXISTS attendance_audit_log (
        id SERIAL PRIMARY KEY,
        student_id TEXT NOT NULL,
        student_name TEXT NOT NULL,
        date DATE NOT NULL,
        old_status TEXT CHECK (old_status IN ('present', 'absent', 'not_yet_here')),
        new_status TEXT NOT NULL CHECK (new_status IN ('present', 'absent', 'not_yet_here')),
        old_check_in_time TIME NULL,
        new_check_in_time TIME NULL,
        modified_by TEXT NOT NULL,
        modification_reason TEXT NULL,
        modification_type TEXT NOT NULL CHECK (modification_type IN ('manual_update', 'qr_scan', 'system_reset')),
        ip_address TEXT NULL,
        user_agent TEXT NULL,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (student_id) REFERENCES students(student_id) ON DELETE CASCADE
      )
    `);
    console.log('✓ Created attendance_audit_log table');
    
    // User roles table for role-based access control
    await dbAdapter.execute(`
      CREATE TABLE IF NOT EXISTS user_roles (
        id SERIAL PRIMARY KEY,
        username TEXT NOT NULL UNIQUE,
        role TEXT NOT NULL DEFAULT 'viewer' CHECK (role IN ('admin', 'teacher', 'viewer')),
        can_modify_attendance BOOLEAN DEFAULT FALSE,
        can_view_audit_logs BOOLEAN DEFAULT FALSE,
        can_manage_users BOOLEAN DEFAULT FALSE,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )
    `);
    console.log('✓ Created user_roles table');
    
    // Attendance modification settings table
    await dbAdapter.execute(`
      CREATE TABLE IF NOT EXISTS attendance_modification_settings (
        id SERIAL PRIMARY KEY,
        setting_name TEXT NOT NULL UNIQUE,
        setting_value TEXT NOT NULL,
        description TEXT NULL,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )
    `);
    console.log('✓ Created attendance_modification_settings table');
    
    // Create indexes for better performance
    await dbAdapter.execute('CREATE INDEX IF NOT EXISTS idx_audit_student_id ON attendance_audit_log(student_id)');
    await dbAdapter.execute('CREATE INDEX IF NOT EXISTS idx_audit_date ON attendance_audit_log(date)');
    await dbAdapter.execute('CREATE INDEX IF NOT EXISTS idx_audit_modified_by ON attendance_audit_log(modified_by)');
    await dbAdapter.execute('CREATE INDEX IF NOT EXISTS idx_audit_created_at ON attendance_audit_log(created_at)');
    await dbAdapter.execute('CREATE INDEX IF NOT EXISTS idx_audit_modification_type ON attendance_audit_log(modification_type)');
    await dbAdapter.execute('CREATE INDEX IF NOT EXISTS idx_username ON user_roles(username)');
    await dbAdapter.execute('CREATE INDEX IF NOT EXISTS idx_role ON user_roles(role)');
    console.log('✓ Created indexes');
    
    // Insert default admin user (PostgreSQL compatible)
    const existingAdmin = await dbAdapter.execute(`
      SELECT username FROM user_roles WHERE username = 'admin'
    `);
    
    if (existingAdmin.length === 0) {
      await dbAdapter.execute(`
        INSERT INTO user_roles (username, role, can_modify_attendance, can_view_audit_logs, can_manage_users)
        VALUES ('admin', 'admin', 1, 1, 1)
      `);
    }
    console.log('✓ Created default admin user');
    
    // Insert default settings
    const defaultSettings = [
      ['modification_time_limit_hours', '24', 'Number of hours after which attendance cannot be manually modified'],
      ['require_reason_for_changes', 'true', 'Whether to require a reason for manual attendance changes'],
      ['max_modifications_per_day', '10', 'Maximum number of manual modifications allowed per user per day'],
      ['enable_audit_logging', 'true', 'Whether to log all attendance modifications']
    ];
    
    for (const [name, value, description] of defaultSettings) {
      const existingSetting = await dbAdapter.execute(`
        SELECT setting_name FROM attendance_modification_settings WHERE setting_name = ?
      `, [name]);
      
      if (existingSetting.length === 0) {
        await dbAdapter.execute(`
          INSERT INTO attendance_modification_settings (setting_name, setting_value, description)
          VALUES (?, ?, ?)
        `, [name, value, description]);
      }
    }
    console.log('✓ Inserted default settings');
    
    console.log('\n🔒 Audit system setup completed successfully!');
    console.log('\n📋 Next steps:');
    console.log('1. Update user_roles table with actual teacher usernames');
    console.log('2. Configure attendance_modification_settings as needed');
    console.log('3. Test the secure attendance modification endpoints');
    
  } catch (error) {
    console.error('❌ Error setting up audit system:', error);
    throw error;
  }
};

// Helper function to add a user role
const addUserRole = async (username, role = 'teacher', permissions = {}) => {
  try {
    const {
      canModifyAttendance = role === 'admin' || role === 'teacher',
      canViewAuditLogs = role === 'admin',
      canManageUsers = role === 'admin'
    } = permissions;
    
    const existingUser = await dbAdapter.execute(`
      SELECT username FROM user_roles WHERE username = ?
    `, [username]);
    
    if (existingUser.length > 0) {
      await dbAdapter.execute(`
        UPDATE user_roles 
        SET role = ?, can_modify_attendance = ?, can_view_audit_logs = ?, can_manage_users = ?
        WHERE username = ?
      `, [role, canModifyAttendance, canViewAuditLogs, canManageUsers, username]);
    } else {
      await dbAdapter.execute(`
        INSERT INTO user_roles 
        (username, role, can_modify_attendance, can_view_audit_logs, can_manage_users)
        VALUES (?, ?, ?, ?, ?)
      `, [username, role, canModifyAttendance, canViewAuditLogs, canManageUsers]);
    }
    
    console.log(`✓ Added/updated user role: ${username} as ${role}`);
  } catch (error) {
    console.error(`❌ Error adding user role for ${username}:`, error);
    throw error;
  }
};

// Helper function to update settings
const updateSetting = async (settingName, settingValue) => {
  try {
    await dbAdapter.execute(`
      UPDATE attendance_modification_settings 
      SET setting_value = ?, updated_at = CURRENT_TIMESTAMP
      WHERE setting_name = ?
    `, [settingValue, settingName]);
    
    console.log(`✓ Updated setting: ${settingName} = ${settingValue}`);
  } catch (error) {
    console.error(`❌ Error updating setting ${settingName}:`, error);
    throw error;
  }
};

// Helper function to get audit statistics
const getAuditStatistics = async (dateFrom = null, dateTo = null) => {
  try {
    let whereClause = '';
    let params = [];
    
    if (dateFrom && dateTo) {
      whereClause = 'WHERE DATE(created_at) BETWEEN ? AND ?';
      params = [dateFrom, dateTo];
    } else if (dateFrom) {
      whereClause = 'WHERE DATE(created_at) >= ?';
      params = [dateFrom];
    }
    
    const [stats] = await dbAdapter.execute(`
      SELECT 
        COUNT(*) as total_modifications,
        COUNT(DISTINCT modified_by) as unique_modifiers,
        COUNT(DISTINCT student_id) as affected_students,
        modification_type,
        COUNT(*) as count_by_type
      FROM attendance_audit_log
      ${whereClause}
      GROUP BY modification_type
    `, params);
    
    const [topModifiers] = await dbAdapter.execute(`
      SELECT 
        modified_by,
        COUNT(*) as modification_count
      FROM attendance_audit_log
      ${whereClause}
      GROUP BY modified_by
      ORDER BY modification_count DESC
      LIMIT 10
    `, params);
    
    return {
      statistics: stats,
      top_modifiers: topModifiers
    };
  } catch (error) {
    console.error('❌ Error getting audit statistics:', error);
    throw error;
  }
};

module.exports = {
  setupAuditSystem,
  addUserRole,
  updateSetting,
  getAuditStatistics
};

// If this script is run directly, setup the audit system
if (require.main === module) {
  setupAuditSystem()
    .then(() => {
      console.log('\n✅ Audit system setup completed!');
      process.exit(0);
    })
    .catch((error) => {
      console.error('\n❌ Audit system setup failed:', error);
      process.exit(1);
    });
}