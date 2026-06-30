-- Create student_enrollments table
-- This table tracks which students are enrolled in which courses

CREATE TABLE IF NOT EXISTS student_enrollments (
  enrollment_id INT PRIMARY KEY AUTO_INCREMENT,
  student_id INT NOT NULL,
  course_id INT NOT NULL,
  enrolled_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  status ENUM('active', 'inactive') DEFAULT 'active',
  FOREIGN KEY (student_id) REFERENCES users(user_id) ON DELETE CASCADE,
  FOREIGN KEY (course_id) REFERENCES courses(course_id) ON DELETE CASCADE,
  UNIQUE KEY unique_enrollment (student_id, course_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- Create indexes for better performance
CREATE INDEX idx_student ON student_enrollments(student_id);
CREATE INDEX idx_course ON student_enrollments(course_id);
CREATE INDEX idx_status ON student_enrollments(status);

-- Example: Insert sample enrollments (optional - remove if not needed)
-- INSERT INTO student_enrollments (student_id, course_id) VALUES
-- (4, 1),  -- Student 4 enrolled in Course 1
-- (5, 2),  -- Student 5 enrolled in Course 2
-- (6, 1);  -- Student 6 enrolled in Course 1
