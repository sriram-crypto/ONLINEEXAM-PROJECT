-- Dummy exam creation for testing

-- Insert exam
INSERT INTO exams (exam_id, title, duration, exam_date, start_time, end_time, status)
VALUES (1001, 'Dummy Test Exam', 30, CURDATE(), NOW(), DATE_ADD(NOW(), INTERVAL 30 MINUTE), 'active');

-- Insert questions
INSERT INTO questions (id, question_text, option1, option2, option3, option4, answer)
VALUES
  (2001, 'What is the capital of France?', 'London', 'Berlin', 'Paris', 'Rome', 'Paris'),
  (2002, '2 + 2 = ?', '3', '4', '5', '6', '4'),
  (2003, 'Which is a fruit?', 'Carrot', 'Apple', 'Potato', 'Broccoli', 'Apple');

-- Link questions to exam (if you have an exam_questions table)
INSERT INTO exam_questions (exam_id, question_id)
VALUES
  (1001, 2001),
  (1001, 2002),
  (1001, 2003);


-- Assign exam to all students
INSERT INTO exam_students (exam_id, student_id)
SELECT 1001, user_id FROM users WHERE role = 'student';
