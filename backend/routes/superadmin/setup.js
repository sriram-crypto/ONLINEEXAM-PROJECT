const express = require("express");
const router = express.Router();
const db = require("../../config/db");

// POST /api/superadmin/subjects - create a new subject and map to course
router.post('/subjects', (req, res) => {
  const { course, subject } = req.body;
  const subjectUpper = subject ? subject.toUpperCase() : subject;
  if (!course || !subject) {
    return res.status(400).json({ success: false, error: 'Course and subject name required.' });
  }
  // Check if subject already exists for this course
  db.query('SELECT s.subject_id FROM subjects s JOIN course_subject_mapping csm ON s.subject_id = csm.subject_id WHERE csm.course_id = ? AND s.subject_name = ?', [course, subjectUpper], (err, results) => {
    if (err) return res.status(500).json({ success: false, error: err.message });
    if (results.length > 0) {
      return res.json({ already: true });
    }
    // Insert subject
    db.query('INSERT INTO subjects (subject_name, created_at) VALUES (?, NOW())', [subjectUpper], (err2, result2) => {
      if (err2) return res.status(500).json({ success: false, error: err2.message });
      const subject_id = result2.insertId;
      // Map subject to course
      db.query('INSERT INTO course_subject_mapping (course_id, subject_id, created_at) VALUES (?, ?, NOW())', [course, subject_id], (err3, result3) => {
        if (err3) return res.status(500).json({ success: false, error: err3.message });
        res.json({ success: true, subject_id });
      });
    });
  });
});

// POST /api/superadmin/setup - create a new course if not exists
router.post('/setup', (req, res) => {
  const { category, course } = req.body;
  const courseUpper = course ? course.toUpperCase() : course;
  if (!category || !course) {
    return res.status(400).json({ success: false, error: 'Category and course name required.' });
  }
  // Check if course already exists for this category
  db.query('SELECT course_id FROM courses WHERE category_id = ? AND course_name = ?', [category, courseUpper], (err, results) => {
    if (err) return res.status(500).json({ success: false, error: err.message });
    if (results.length > 0) {
      return res.json({ already: true });
    }
    // Insert new course
    db.query('INSERT INTO courses (category_id, course_name) VALUES (?, ?)', [category, courseUpper], (err2, result) => {
      if (err2) return res.status(500).json({ success: false, error: err2.message });
      res.json({ success: true, course_id: result.insertId });
    });
  });
});

// GET /api/superadmin/subjects-all - get all subjects for dropdown
router.get('/subjects-all', (req, res) => {
  db.query('SELECT subject_id, subject_name FROM subjects ORDER BY subject_name', (err, results) => {
    if (err) return res.status(500).json({ error: err.message });
    res.json(results);
  });
});

// GET /api/superadmin/courses-all - get all courses for dropdown
router.get('/courses-all', (req, res) => {
  db.query('SELECT course_id, course_name FROM courses ORDER BY course_name', (err, results) => {
    if (err) return res.status(500).json({ error: err.message });
    res.json(results);
  });
});

// GET /api/superadmin/questions - list all questions
router.get('/questions', (req, res) => {
  const sql = `
    SELECT qa.*, s.subject_name, c.course_name
    FROM questions_answers qa
    LEFT JOIN subjects s ON qa.subject_id = s.subject_id
    LEFT JOIN courses c ON qa.course_id = c.course_id
    ORDER BY qa.id DESC
  `;
  db.query(sql, (err, results) => {
    if (err) return res.status(500).json({ error: err.message });
    // DataGrid expects an 'id' field
    res.json(results.map(q => ({ ...q, id: q.id })));
  });
});

// DELETE /api/superadmin/questions/:id - delete a question
router.delete('/questions/:id', (req, res) => {
  const { id } = req.params;
  db.query('DELETE FROM questions_answers WHERE id = ?', [id], (err, result) => {
    if (err) return res.status(500).json({ error: err.message });
    res.json({ success: true });
  });
});

// PUT /api/superadmin/questions/:id - update a question
router.put('/questions/:id', (req, res) => {
  const { id } = req.params;
  const { course_id, subject_id, level_id, type, question_text, option1, option2, option3, option4, answer } = req.body;
  db.query(
    `UPDATE questions_answers SET course_id=?, subject_id=?, level_id=?, type=?, question_text=?, option1=?, option2=?, option3=?, option4=?, answer=? WHERE id=?`,
    [course_id, subject_id, level_id, type, question_text, option1, option2, option3, option4, answer, id],
    (err, result) => {
      if (err) return res.status(500).json({ error: err.message });
      res.json({ success: true });
    }
  );
});
// GET /api/superadmin/question-types
router.get('/question-types', (req, res) => {
  db.query('SELECT question_type_id, type_name FROM question_types ORDER BY question_type_id', (err, results) => {
    if (err) {
      console.error('DB error in /question-types:', err);
      return res.status(500).json({ error: err.message });
    }
    res.json(results);
  });
});
// GET /api/superadmin/difficulty-levels
router.get('/difficulty-levels', (req, res) => {
  db.query('SELECT level_id, level_name FROM difficulty_levels ORDER BY level_id', (err, results) => {
    if (err) {
      console.error('DB error in /difficulty-levels:', err);
      return res.status(500).json({ error: err.message });
    }
    res.json(results);
  });
});
// GET /api/superadmin/subjects?course_id=...
router.get('/subjects', (req, res) => {
  const { course_id } = req.query;
  if (!course_id) return res.json([]);
  db.query(
    `SELECT s.subject_id, s.subject_name
     FROM course_subject_mapping m
     JOIN subjects s ON m.subject_id = s.subject_id
     WHERE m.course_id = ?
     ORDER BY s.subject_name`,
    [course_id],
    (err, results) => {
      if (err) return res.status(500).json({ error: 'Database error' });
      res.json(results);
    }
  );
});
// GET /api/superadmin/courses?category_id=1
router.get('/courses', (req, res) => {
  const { category_id } = req.query;
  console.log('Received /courses request with category_id:', category_id);
  if (!category_id) return res.status(400).json({ error: 'category_id is required' });
  db.query('SELECT course_id, course_name FROM courses WHERE category_id = ?', [category_id], (err, results) => {
    if (err) {
      console.error('DB error in /courses:', err);
      return res.status(500).json({ error: err.message });
    }
    console.log('DB results for /courses:', results);
    res.json(results);
  });
});
// GET /api/superadmin/course-categories - get all categories for dropdown
router.get('/course-categories', (req, res) => {
  db.query("SELECT category_id, category_name FROM course_categories", (err, results) => {
    if (err) {
      return res.status(500).json({ error: "Database error" });
    }
    res.json(results);
  });
});

// Get all subjects for chapter dropdown
router.get('/subjects-all', (req, res) => {
  db.query('SELECT subject_id, subject_name FROM subjects ORDER BY subject_name', (err, results) => {
    if (err) return res.status(500).json({ error: 'Database error' });
    res.json(results);
  });
});

// Create chapter
router.post('/chapters', (req, res) => {
  const { subject_id, chapter_name } = req.body;
  const chapterUpper = chapter_name ? chapter_name.toUpperCase() : chapter_name;
  if (!subject_id || !chapter_name) return res.status(400).json({ error: "Missing data" });
  db.query(
    'SELECT chapter_id FROM chapters WHERE subject_id = ? AND chapter_name = ?',
    [subject_id, chapterUpper],
    (err, rows) => {
      if (err) return res.status(500).json({ error: 'Database error' });
      if (rows.length > 0) return res.json({ already: true });
      db.query(
        'INSERT INTO chapters (subject_id, chapter_name, created_at) VALUES (?, ?, NOW())',
        [subject_id, chapterUpper],
        (err2, result) => {
          if (err2) return res.status(500).json({ error: 'Database error' });
          res.json({ success: true, chapter_id: result.insertId });
        }
      );
    }
  );
});

module.exports = router;