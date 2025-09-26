-- Additional tables for comprehensive attendance management
USE qr_attendance;

-- Daily attendance tracking table
-- This table tracks the daily attendance status for all students
CREATE TABLE IF NOT EXISTS daily_attendance (
    id INT AUTO_INCREMENT PRIMARY KEY,
    student_id VARCHAR(20) NOT NULL,
    student_name VARCHAR(100) NOT NULL,
    date DATE NOT NULL,
    status ENUM('present', 'absent', 'not_yet_here') DEFAULT 'not_yet_here',
    check_in_time TIME NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (student_id) REFERENCES students(student_id) ON DELETE CASCADE,
    UNIQUE KEY unique_daily_attendance (student_id, date)
);

-- Historical attendance records table
-- This table stores historical attendance data for reporting and analytics
CREATE TABLE IF NOT EXISTS attendance_history (
    id INT AUTO_INCREMENT PRIMARY KEY,
    date DATE NOT NULL,
    total_students INT NOT NULL,
    present_count INT NOT NULL,
    absent_count INT NOT NULL,
    attendance_rate DECIMAL(5,2) NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE KEY unique_history_date (date)
);

-- Attendance sessions table
-- This table tracks when daily attendance was last reset
CREATE TABLE IF NOT EXISTS attendance_sessions (
    id INT AUTO_INCREMENT PRIMARY KEY,
    session_date DATE NOT NULL,
    reset_time TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    total_students INT NOT NULL,
    UNIQUE KEY unique_session_date (session_date)
);

-- Create indexes for better performance
CREATE INDEX idx_daily_attendance_date ON daily_attendance(date);
CREATE INDEX idx_daily_attendance_status ON daily_attendance(status);
CREATE INDEX idx_daily_attendance_student_id ON daily_attendance(student_id);
CREATE INDEX idx_attendance_history_date ON attendance_history(date);
CREATE INDEX idx_attendance_sessions_date ON attendance_sessions(session_date);

-- Trigger to automatically update daily_attendance when attendance is recorded
DELIMITER //
CREATE TRIGGER IF NOT EXISTS update_daily_attendance_on_checkin
AFTER INSERT ON attendance
FOR EACH ROW
BEGIN
    -- Update daily_attendance status to 'present' when student checks in
    UPDATE daily_attendance 
    SET status = 'present', 
        check_in_time = NEW.time,
        updated_at = CURRENT_TIMESTAMP
    WHERE student_id = NEW.student_id AND date = NEW.date;
    
    -- If no record exists in daily_attendance, create one
    INSERT IGNORE INTO daily_attendance (student_id, student_name, date, status, check_in_time)
    VALUES (NEW.student_id, NEW.student_name, NEW.date, 'present', NEW.time);
END//
DELIMITER ;

-- Stored procedure to initialize daily attendance for all students
DELIMITER //
CREATE PROCEDURE IF NOT EXISTS InitializeDailyAttendance(IN target_date DATE)
BEGIN
    DECLARE done INT DEFAULT FALSE;
    DECLARE student_id_var VARCHAR(20);
    DECLARE student_name_var VARCHAR(100);
    DECLARE student_cursor CURSOR FOR 
        SELECT student_id, name FROM students ORDER BY student_id;
    DECLARE CONTINUE HANDLER FOR NOT FOUND SET done = TRUE;
    
    -- Insert attendance session record
    INSERT INTO attendance_sessions (session_date, total_students)
    SELECT target_date, COUNT(*) FROM students
    ON DUPLICATE KEY UPDATE 
        reset_time = CURRENT_TIMESTAMP,
        total_students = (SELECT COUNT(*) FROM students);
    
    -- Initialize daily attendance for all students
    OPEN student_cursor;
    read_loop: LOOP
        FETCH student_cursor INTO student_id_var, student_name_var;
        IF done THEN
            LEAVE read_loop;
        END IF;
        
        INSERT IGNORE INTO daily_attendance (student_id, student_name, date, status)
        VALUES (student_id_var, student_name_var, target_date, 'not_yet_here');
    END LOOP;
    CLOSE student_cursor;
    
    -- Update students who already have attendance recorded today to 'present'
    UPDATE daily_attendance da
    INNER JOIN attendance a ON da.student_id = a.student_id AND da.date = a.date
    SET da.status = 'present', da.check_in_time = a.time
    WHERE da.date = target_date;
END//
DELIMITER ;

-- Stored procedure to finalize daily attendance and create historical record
DELIMITER //
CREATE PROCEDURE IF NOT EXISTS FinalizeDailyAttendance(IN target_date DATE)
BEGIN
    DECLARE total_students INT DEFAULT 0;
    DECLARE present_count INT DEFAULT 0;
    DECLARE absent_count INT DEFAULT 0;
    DECLARE attendance_rate DECIMAL(5,2) DEFAULT 0.00;
    
    -- Get attendance counts
    SELECT COUNT(*) INTO total_students FROM daily_attendance WHERE date = target_date;
    SELECT COUNT(*) INTO present_count FROM daily_attendance WHERE date = target_date AND status = 'present';
    SET absent_count = total_students - present_count;
    
    -- Calculate attendance rate
    IF total_students > 0 THEN
        SET attendance_rate = (present_count / total_students) * 100;
    END IF;
    
    -- Update 'not_yet_here' status to 'absent' for the day
    UPDATE daily_attendance 
    SET status = 'absent', updated_at = CURRENT_TIMESTAMP
    WHERE date = target_date AND status = 'not_yet_here';
    
    -- Create historical record
    INSERT INTO attendance_history (date, total_students, present_count, absent_count, attendance_rate)
    VALUES (target_date, total_students, present_count, absent_count, attendance_rate)
    ON DUPLICATE KEY UPDATE
        total_students = VALUES(total_students),
        present_count = VALUES(present_count),
        absent_count = VALUES(absent_count),
        attendance_rate = VALUES(attendance_rate);
END//
DELIMITER ;