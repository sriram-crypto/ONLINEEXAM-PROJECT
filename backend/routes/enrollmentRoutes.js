const express = require('express');
const router = express.Router();
const db = require('../config/db');

// Get all courses
router.get('/courses', (req, res) => {
  const query = 'SELECT course_id, course_name, course_duration, category_id FROM courses ORDER BY course_name';
  
  db.query(query, (err, results) => {
    if (err) {
      console.error('Error fetching courses:', err);
      return res.status(500).json({ error: 'Failed to fetch courses' });
    }
    console.log('Courses fetched:', results);
    res.json({ courses: results });
  });
});

// Get all students
router.get('/students', (req, res) => {
  const query = "SELECT user_id, name, email FROM users WHERE role = 'student' ORDER BY name";
  
  db.query(query, (err, results) => {
    if (err) {
      console.error('Error fetching students:', err);
      return res.status(500).json({ error: 'Failed to fetch students' });
    }
    res.json({ students: results });
  });
});

// Enroll student in courses
router.post('/enroll-student', (req, res) => {
  const { student_id, course_ids } = req.body;

  if (!student_id || !course_ids || course_ids.length === 0) {
    return res.status(400).json({ error: 'Student ID and course IDs are required' });
  }

  // Insert enrollments for each course
  const values = course_ids.map(course_id => [student_id, course_id, 'active']);
  const query = `
    INSERT INTO student_enrollments (student_id, course_id, status) 
    VALUES ? 
    ON DUPLICATE KEY UPDATE status = 'active'
  `;

  db.query(query, [values], (err, result) => {
    if (err) {
      console.error('Error enrolling student:', err);
      return res.status(500).json({ error: 'Failed to enroll student' });
    }
    res.json({ 
      success: true, 
      message: 'Student enrolled successfully',
      enrollments: result.affectedRows 
    });
  });
});

// Get student enrollments
router.get('/student-enrollments/:student_id', (req, res) => {
  const { student_id } = req.params;
  
  const query = `
    SELECT se.*, c.course_name 
    FROM student_enrollments se
    JOIN courses c ON se.course_id = c.course_id
    WHERE se.student_id = ? AND se.status = 'active'
  `;

  db.query(query, [student_id], (err, results) => {
    if (err) {
      console.error('Error fetching enrollments:', err);
      return res.status(500).json({ error: 'Failed to fetch enrollments' });
    }
    res.json({ enrollments: results });
  });
});

module.exports = router;
