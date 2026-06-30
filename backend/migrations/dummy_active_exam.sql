-- Create a dummy active exam for testing

-- Insert exam
INSERT INTO exams (exam_id, title, duration, exam_date, start_time, end_time, status)
VALUES (3003, 'Dummy Active Exam', 30, CURDATE(), NOW() - INTERVAL 10 MINUTE, NOW() + INTERVAL 1 HOUR, 'active');

-- Insert questions
INSERT INTO questions (id, question_text, option1, option2, option3, option4, answer)
VALUES
  (4001, 'What is 2 + 2?', '3', '4', '5', '6', '4'),
  (4002, 'What is the capital of France?', 'London', 'Berlin', 'Paris', 'Rome', 'Paris'),
  (4003, 'Which is a fruit?', 'Potato', 'Apple', 'Carrot', 'Broccoli', 'Apple');

-- Link questions to exam
INSERT INTO exam_questions (exam_id, question_id)
VALUES
  (3003, 4001),
  (3003, 4002),
  (3003, 4003);

-- Assign exam to all students
INSERT INTO exam_students (exam_id, student_id)
SELECT 3003, user_id FROM users WHERE role = 'student';