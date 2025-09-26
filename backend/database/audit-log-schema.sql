-- Audit log table for tracking manual attendance changes
USE qr_attendance;

-- Audit log table to track all manual attendance modifications
CREATE TABLE IF NOT EXISTS attendance_audit_log (
    id INT AUTO_INCREMENT PRIMARY KEY,
    student_id VARCHAR(20) NOT NULL,
    student_name VARCHAR(100) NOT NULL,
    date DATE NOT NULL,
    old_status ENUM('present', 'absent', 'not_yet_here') NULL,
    new_status ENUM('present', 'absent', 'not_yet_here') NOT NULL,
    old_check_in_time TIME NULL,
    new_check_in_time TIME NULL,
    modified_by VARCHAR(100) NOT NULL, -- Teacher/admin who made the change
    modification_reason TEXT NULL, -- Optional reason for the change
    modification_type ENUM('manual_update', 'qr_scan', 'system_reset') NOT NULL,
    ip_address VARCHAR(45) NULL, -- IPv4 or IPv6 address
    user_agent TEXT NULL, -- Browser/device information
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (student_id) REFERENCES students(student_id) ON DELETE CASCADE,
    INDEX idx_audit_student_id (student_id),
    INDEX idx_audit_date (date),
    INDEX idx_audit_modified_by (modified_by),
    INDEX idx_audit_created_at (created_at),
    INDEX idx_audit_modification_type (modification_type)
);

-- User roles table for role-based access control
CREATE TABLE IF NOT EXISTS user_roles (
    id INT AUTO_INCREMENT PRIMARY KEY,
    username VARCHAR(100) NOT NULL UNIQUE,
    role ENUM('admin', 'teacher', 'viewer') NOT NULL DEFAULT 'viewer',
    can_modify_attendance BOOLEAN DEFAULT FALSE,
    can_view_audit_logs BOOLEAN DEFAULT FALSE,
    can_manage_users BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    INDEX idx_username (username),
    INDEX idx_role (role)
);

-- Insert default admin user (should be updated with actual admin credentials)
INSERT IGNORE INTO user_roles (username, role, can_modify_attendance, can_view_audit_logs, can_manage_users)
VALUES ('admin', 'admin', TRUE, TRUE, TRUE);

-- Attendance modification settings table
CREATE TABLE IF NOT EXISTS attendance_modification_settings (
    id INT AUTO_INCREMENT PRIMARY KEY,
    setting_name VARCHAR(100) NOT NULL UNIQUE,
    setting_value TEXT NOT NULL,
    description TEXT NULL,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

-- Insert default settings
INSERT IGNORE INTO attendance_modification_settings (setting_name, setting_value, description) VALUES
('modification_time_limit_hours', '24', 'Number of hours after which attendance cannot be manually modified'),
('require_reason_for_changes', 'true', 'Whether to require a reason for manual attendance changes'),
('max_modifications_per_day', '10', 'Maximum number of manual modifications allowed per user per day'),
('enable_audit_logging', 'true', 'Whether to log all attendance modifications');

-- Trigger to automatically log attendance changes
DELIMITER //
CREATE TRIGGER IF NOT EXISTS log_attendance_changes
AFTER UPDATE ON daily_attendance
FOR EACH ROW
BEGIN
    -- Only log if status actually changed
    IF OLD.status != NEW.status OR OLD.check_in_time != NEW.check_in_time THEN
        INSERT INTO attendance_audit_log (
            student_id, 
            student_name, 
            date, 
            old_status, 
            new_status, 
            old_check_in_time, 
            new_check_in_time,
            modified_by,
            modification_type
        ) VALUES (
            NEW.student_id,
            NEW.student_name,
            NEW.date,
            OLD.status,
            NEW.status,
            OLD.check_in_time,
            NEW.check_in_time,
            COALESCE(@current_user, 'system'),
            COALESCE(@modification_type, 'manual_update')
        );
    END IF;
END//
DELIMITER ;

-- View for easy audit log querying
CREATE VIEW IF NOT EXISTS attendance_audit_summary AS
SELECT 
    aal.id,
    aal.student_id,
    aal.student_name,
    aal.date,
    aal.old_status,
    aal.new_status,
    aal.modified_by,
    aal.modification_reason,
    aal.modification_type,
    aal.created_at,
    ur.role as modifier_role
FROM attendance_audit_log aal
LEFT JOIN user_roles ur ON aal.modified_by = ur.username
ORDER BY aal.created_at DESC;