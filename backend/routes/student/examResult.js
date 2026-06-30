const express = require('express');
const router = express.Router();
const db = require('../../config/db');

// POST /api/student/exam-result
// Expects: exam_id, user_id, start_time, end_time, answers: { [question_id]: selected_option }
router.post('/exam-result', async (req, res) => {
  let { exam_id, user_id, start_time, end_time, answers } = req.body;
  if (!exam_id || !user_id || !answers || typeof answers !== 'object') {
    return res.status(400).json({ error: 'Missing required fields' });
  }
  // Convert answers array to object if needed
  if (Array.isArray(answers)) {
    const obj = {};
    answers.forEach(a => {
      if (a && a.question_id != null) obj[a.question_id] = a.student_answer || '';
    });
    answers = obj;
  }

  // Show evaluating message (frontend should show spinner)
  // res.json({ message: 'Evaluating your answers...' });

  try {
    // Get all question details for this exam (with all fields needed for analysis)
    db.query(
      `SELECT eqm.question_id, eqm.marks, eqm.negative_marks, eqm.section, eqm.order_no, eqm.subject_id,
              qa.question_text, qa.option1, qa.option2, qa.option3, qa.option4, qa.answer as correct_answer,
              qa.question_image, qa.option1_image, qa.option2_image, qa.option3_image, qa.option4_image, qa.answer_image
       FROM exam_question_mapping eqm
       INNER JOIN questions_answers qa ON qa.id = eqm.question_id
       WHERE eqm.exam_id = ?
       ORDER BY eqm.order_no ASC`,
      [exam_id],
      (err, questions) => {
        if (err) return res.status(500).json({ error: 'DB error', details: err.message });
        const total_questions = questions.length;
        let total_marks = 0, correct_count = 0, wrong_count = 0, attempted = 0;
        // Build detailed analysis for each question
        const analysis = questions.map(q => {
          let userAns = answers[q.question_id];
          if (userAns === undefined || userAns === null) userAns = '';
          userAns = String(userAns).trim();
          const correctAns = (q.correct_answer || '').trim();
          const isCorrect = userAns !== '' && userAns === correctAns;
          const isAttempted = userAns !== '';
          if (isAttempted) {
            attempted++;
            if (isCorrect) {
              total_marks += q.marks || 0;
              correct_count++;
            } else {
              total_marks -= q.negative_marks || 0;
              wrong_count++;
            }
          }
          // Build options array with text and images
          const options = [1,2,3,4].map(i => ({
            text: q[`option${i}`],
            image: q[`option${i}_image`]
          })).filter(opt => opt.text && String(opt.text).trim() !== '');
          return {
            question_id: q.question_id,
            question_text: q.question_text,
            question_image: q.question_image,
            options,
            correct_answer: q.correct_answer,
            correct_answer_image: q.answer_image,
            student_answer: userAns,
            is_correct: isCorrect,
            marks: q.marks,
            negative_marks: q.negative_marks,
            section: q.section,
            order_no: q.order_no,
            subject_id: q.subject_id
          };
        });
        const not_answered = total_questions - attempted;
        // Convert ISO string to MySQL DATETIME format (YYYY-MM-DD HH:MM:SS)
        function toMySQLDatetime(dt) {
          if (!dt) return null;
          const d = new Date(dt);
          if (isNaN(d.getTime())) return null;
          return d.getFullYear() + '-' +
            String(d.getMonth() + 1).padStart(2, '0') + '-' +
            String(d.getDate()).padStart(2, '0') + ' ' +
            String(d.getHours()).padStart(2, '0') + ':' +
            String(d.getMinutes()).padStart(2, '0') + ':' +
            String(d.getSeconds()).padStart(2, '0');
        }
        const mysqlStart = toMySQLDatetime(start_time);
        const mysqlEnd = toMySQLDatetime(end_time);
        // Store result summary in student_exam_results
        db.query(
          `INSERT INTO student_exam_results (exam_id, user_id, start_time, end_time, total_marks, correct_count, wrong_count, answered, not_answered)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
          [exam_id, user_id, mysqlStart, mysqlEnd, total_marks, correct_count, wrong_count, attempted, not_answered],
          (err2, result) => {
            if (err2) {
              console.error('Insert error:', err2);
              return res.status(500).json({ error: 'DB error', details: err2.message });
            }
            // Respond with full analysis and summary for result screen
            res.json({
              message: 'Evaluating your answers',
              result: {
                total_marks,
                correct_count,
                wrong_count,
                answered: attempted,
                not_answered,
                total_questions
              },
              analysis
            });
          }
        );
      }
    );
  } catch (err) {
    res.status(500).json({ error: 'Server error', details: err.message });
  }
});

module.exports = router;
