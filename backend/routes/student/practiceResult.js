const express = require('express');
const router = express.Router();
const db = require('../../config/db');

// POST /api/student/practice-result
router.post('/practice-result', async (req, res) => {
  const {
    user_id,
    total_marks,
    correct_count,
    wrong_count,
    answered,
    not_answered,
    category,
    course,
    subject,
    num_questions
  } = req.body;

  if (!user_id || !category || !course || !subject || !num_questions) {
    return res.status(400).json({ error: 'Missing required fields' });
  }

  try {
    db.query(
      `INSERT INTO practice_results 
        (user_id, total_marks, correct_count, wrong_count, answered, not_answered, category, course, subject, num_questions)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)` ,
      [user_id, total_marks, correct_count, wrong_count, answered, not_answered, category, course, subject, num_questions],
      (err, result) => {
        if (err) return res.status(500).json({ error: 'DB error', details: err.message });
        res.json({ ok: true, id: result.insertId });
      }
    );
  } catch (err) {
    res.status(500).json({ error: 'Server error', details: err.message });
  }
});

module.exports = router;
