const express = require('express');
const router = express.Router();
const db = require('../config/db');

const query = (sql, params = []) =>
  new Promise((resolve, reject) => {
    db.query(sql, params, (err, rows) => {
      if (err) reject(err);
      else resolve(rows);
    });
  });

router.get('/platform', async (req, res) => {
  try {
    const [users, exams, questions, attempts, results] = await Promise.all([
      query(`SELECT role, COUNT(*) AS count FROM users GROUP BY role`),
      query(`SELECT status, COUNT(*) AS count FROM exams GROUP BY status`),
      query(`SELECT COUNT(*) AS count FROM questions_answers`),
      query(`SELECT COUNT(*) AS count FROM submissions`),
      query(
        `SELECT COUNT(*) AS result_count,
                ROUND(AVG(CASE WHEN total_marks IS NULL THEN 0 ELSE total_marks END), 2) AS average_marks
         FROM student_exam_results`
      ),
    ]);

    res.json({
      users,
      exams,
      questions: questions[0]?.count || 0,
      attempts: attempts[0]?.count || 0,
      results: results[0] || { result_count: 0, average_marks: 0 },
    });
  } catch (err) {
    res.status(500).json({ error: 'Server error', details: err.message });
  }
});

router.get('/student/:student_id', async (req, res) => {
  const studentId = Number(req.params.student_id || 0);
  if (!studentId) return res.status(400).json({ error: 'student_id required' });

  try {
    const results = await query(
      `SELECT ser.exam_id, e.title, ser.total_marks, ser.correct_count, ser.wrong_count,
              ser.answered, ser.not_answered, ser.created_at
       FROM student_exam_results ser
       LEFT JOIN exams e ON e.exam_id = ser.exam_id
       WHERE ser.user_id = ?
       ORDER BY ser.created_at ASC`,
      [studentId]
    );

    const trend = results.map((row, index) => ({
      label: row.title || `Exam ${index + 1}`,
      score: Number(row.total_marks || 0),
      correct: Number(row.correct_count || 0),
      wrong: Number(row.wrong_count || 0),
      attempted: Number(row.answered || 0),
      not_attempted: Number(row.not_answered || 0),
      date: row.created_at,
    }));

    const totalScore = trend.reduce((sum, row) => sum + row.score, 0);
    res.json({
      results,
      trend,
      summary: {
        exams_taken: results.length,
        average_score: results.length ? Number((totalScore / results.length).toFixed(2)) : 0,
        best_score: trend.length ? Math.max(...trend.map((row) => row.score)) : 0,
      },
    });
  } catch (err) {
    res.status(500).json({ error: 'Server error', details: err.message });
  }
});

module.exports = router;
