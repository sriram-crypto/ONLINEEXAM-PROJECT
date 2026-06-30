-- Create a manual active exam for testing

-- Insert exam
INSERT INTO exams (exam_id, title, duration, exam_date, start_time, end_time, status)
VALUES (2002, 'Manual Active Exam', 30, CURDATE(), NOW() - INTERVAL 10 MINUTE, NOW() + INTERVAL 1 HOUR, 'active');

-- Insert questions
INSERT INTO questions (id, question_text, option1, option2, option3, option4, answer)
VALUES
  (3001, 'What is the color of the sky?', 'Blue', 'Green', 'Red', 'Yellow', 'Blue'),
  (3002, '5 + 3 = ?', '6', '7', '8', '9', '8'),
  (3003, 'Which is a vegetable?', 'Apple', 'Carrot', 'Banana', 'Grapes', 'Carrot');

-- Link questions to exam (if you have an exam_questions table)
INSERT INTO exam_questions (exam_id, question_id)
VALUES
  (2002, 3001),
  (2002, 3002),
  (2002, 3003);

-- Assign exam to all students
INSERT INTO exam_students (exam_id, student_id)
SELECT 2002, user_id FROM users WHERE role = 'student';
