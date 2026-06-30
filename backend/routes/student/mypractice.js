const express = require('express');
const router = express.Router();
const db = require('../../config/db');
const path = require('path');

const query = (sql, params = []) =>
  new Promise((resolve, reject) => {
    db.query(sql, params, (err, rows) => {
      if (err) reject(err);
      else resolve(rows);
    });
  });

const isMissingTable = (err) => err && (err.code === 'ER_NO_SUCH_TABLE' || err.errno === 1146);
const isMissingColumn = (err) => err && (err.code === 'ER_BAD_FIELD_ERROR' || err.errno === 1054);

function ensureUrl(src) {
  if (!src || typeof src !== 'string') return null;
  let value = src.trim();
  if (!value) return null;
  if (value.startsWith('data:') || value.startsWith('http:') || value.startsWith('https:') || value.startsWith('//')) {
    return value;
  }

  value = value.replace(/\\/g, '/');
  const uploadsIndex = value.indexOf('/uploads');
  if (uploadsIndex >= 0) return value.substring(uploadsIndex);

  const relativeUploadsIndex = value.indexOf('uploads/');
  if (relativeUploadsIndex >= 0) return `/${value.substring(relativeUploadsIndex)}`;

  return `/uploads/images/${path.basename(value)}`;
}

function normalizeQuestion(row) {
  const optionRows = [
    { text: row.option1 || '', image: ensureUrl(row.option1_image), label: 'A' },
    { text: row.option2 || '', image: ensureUrl(row.option2_image), label: 'B' },
    { text: row.option3 || '', image: ensureUrl(row.option3_image), label: 'C' },
    { text: row.option4 || '', image: ensureUrl(row.option4_image), label: 'D' },
  ].filter((item) => item.text || item.image);

  return {
    id: row.id,
    question_id: row.id,
    category_id: row.category_id,
    course_id: row.course_id,
    subject_id: row.subject_id,
    chapter_id: row.chapter_id,
    level_id: row.level_id,
    question_type_id: row.question_type_id,
    question_text: row.question_text,
    question_image: ensureUrl(row.question_image),
    option1: row.option1 || '',
    option2: row.option2 || '',
    option3: row.option3 || '',
    option4: row.option4 || '',
    option1_image: ensureUrl(row.option1_image),
    option2_image: ensureUrl(row.option2_image),
    option3_image: ensureUrl(row.option3_image),
    option4_image: ensureUrl(row.option4_image),
    answer_image: ensureUrl(row.answer_image),
    options: optionRows.map((item) => item.text || item.label),
    option_details: optionRows,
    answer: row.answer || row.correct_option || '',
    correct_option: row.correct_option || row.answer || '',
    marks: Number(row.positive_marks || row.marks || 1),
    negative_marks: Number(row.negative_marks || 0),
  };
}

function normalizeAnswer(value) {
  return String(value ?? '').replace(/\s+/g, '').trim().toLowerCase();
}

function acceptedAnswers(question) {
  const correct = question.answer || question.correct_option || question.correct_answer || '';
  const values = new Set([normalizeAnswer(correct)]);
  const letters = ['A', 'B', 'C', 'D'];
  const options = [question.option1, question.option2, question.option3, question.option4];
  const index = letters.findIndex((letter) => normalizeAnswer(letter) === normalizeAnswer(correct));
  if (index >= 0 && options[index]) values.add(normalizeAnswer(options[index]));
  return values;
}

function acceptedAnswerCount(question) {
  const correct = question.answer || question.correct_option || question.correct_answer || '';
  const pieces = Array.isArray(correct) ? correct : String(correct).split(/[;,]/);
  return pieces.map(normalizeAnswer).filter(Boolean).length || 1;
}

function gradeQuestions(questions, answers = {}) {
  let total_marks = 0;
  let correct_count = 0;
  let wrong_count = 0;
  let attempted_count = 0;

  const feedback = questions.map((question, index) => {
    const questionId = question.question_id || question.id;
    const rawAnswer =
      answers[questionId] ??
      answers[String(questionId)] ??
      answers[index]?.student_answer ??
      answers[index]?.value ??
      answers[index] ??
      '';
    const student_answer = typeof rawAnswer === 'object' ? rawAnswer.student_answer || rawAnswer.value || '' : rawAnswer;
    const hasAnswer = normalizeAnswer(student_answer) !== '';
    const answerValues = Array.isArray(student_answer)
      ? student_answer.map(normalizeAnswer).filter(Boolean)
      : String(student_answer).split(/[;,]/).map(normalizeAnswer).filter(Boolean);
    const correctValues = acceptedAnswers(question);
    const isCorrect =
      hasAnswer &&
      answerValues.length === acceptedAnswerCount(question) &&
      answerValues.every((value) => correctValues.has(value));
    const marks = Number(question.marks || question.positive_marks || 1);
    const negativeMarks = Number(question.negative_marks || 0);
    let marks_obtained = 0;

    if (hasAnswer) {
      attempted_count += 1;
      if (isCorrect) {
        correct_count += 1;
        marks_obtained = marks;
      } else {
        wrong_count += 1;
        marks_obtained = -Math.abs(negativeMarks);
      }
      total_marks += marks_obtained;
    }

    return {
      ...question,
      question_id: questionId,
      student_answer,
      correct_answer: question.answer || question.correct_option || question.correct_answer || '',
      is_correct: isCorrect,
      marks_obtained,
    };
  });

  const not_attempted_count = Math.max(0, questions.length - attempted_count);
  const percentage = questions.length ? Number(((correct_count / questions.length) * 100).toFixed(2)) : 0;

  return {
    result: {
      total_questions: questions.length,
      total_marks,
      correct_count,
      wrong_count,
      attempted_count,
      answered: attempted_count,
      not_attempted_count,
      not_answered: not_attempted_count,
      percentage,
    },
    feedback,
  };
}

async function tryInsertPracticeAttempt({ studentId, practiceUid, questions, filters }) {
  try {
    const attemptResult = await query(
      `INSERT INTO exam_attempts
       (attempt_uid, exam_id, student_id, attempt_type, source_id, status, started_at, duration_seconds, total_questions, not_answered_count, client_state_json)
       VALUES (?, NULL, ?, 'practice', ?, 'in_progress', NOW(), ?, ?, ?, ?)`,
      [
        practiceUid,
        studentId,
        practiceUid,
        20 * 60,
        questions.length,
        questions.length,
        JSON.stringify({ filters, generated_at: new Date().toISOString() }),
      ]
    );

    const attemptId = attemptResult.insertId;
    const sessionResult = await query(
      `INSERT INTO practice_sessions
       (practice_uid, student_id, attempt_id, category_id, course_id, subject_id, chapter_id, level_id, question_count, duration_minutes, filters_json)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        practiceUid,
        studentId,
        attemptId,
        filters.category_id || null,
        filters.course_id || null,
        filters.subject_id || null,
        filters.chapter_id || null,
        filters.level_id || null,
        questions.length,
        20,
        JSON.stringify(filters),
      ]
    );

    if (questions.length) {
      const attemptQuestionRows = questions.map((question, index) => [
        attemptId,
        null,
        question.question_id || question.id,
        'PRACTICE',
        index + 1,
        Number(question.marks || 1),
        Number(question.negative_marks || 0),
        JSON.stringify(question),
      ]);

      await query(
        `INSERT INTO exam_attempt_questions
         (attempt_id, exam_id, question_id, section_code, question_order, marks, negative_marks, question_snapshot)
         VALUES ?`,
        [attemptQuestionRows]
      );
    }

    return {
      attempt_id: attemptId,
      practice_session_id: sessionResult.insertId,
    };
  } catch (err) {
    if (isMissingTable(err) || isMissingColumn(err)) {
      return { setup_required: true, warning: err.message };
    }
    throw err;
  }
}

async function savePracticeResultSummary({ studentId, result, filters }) {
  const insertResult = await query(
    `INSERT INTO practice_results
     (user_id, total_marks, correct_count, wrong_count, answered, not_answered, category, course, subject, num_questions)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      studentId,
      result.total_marks || 0,
      result.correct_count || 0,
      result.wrong_count || 0,
      result.attempted_count || result.answered || 0,
      result.not_attempted_count || result.not_answered || 0,
      String(filters.category_id || filters.category || ''),
      String(filters.course_id || filters.course || ''),
      String(filters.subject_id || filters.subject || ''),
      Number(filters.questionCount || filters.num_questions || result.total_questions || 0),
    ]
  );

  return insertResult.insertId;
}

async function persistAttemptAnswers({ attemptId, questions, grading }) {
  if (!attemptId) return;

  try {
    const rows = await query(
      `SELECT attempt_question_id, question_id
       FROM exam_attempt_questions
       WHERE attempt_id = ?`,
      [attemptId]
    );
    const questionMap = new Map((rows || []).map((row) => [Number(row.question_id), row.attempt_question_id]));
    const answerRows = grading.feedback
      .filter((item) => questionMap.has(Number(item.question_id)))
      .map((item) => [
        attemptId,
        questionMap.get(Number(item.question_id)),
        item.question_id,
        item.student_answer || null,
        JSON.stringify({ answer: item.student_answer || null }),
        item.student_answer ? 'answered' : 'not_attempted',
        item.student_answer ? (item.is_correct ? 1 : 0) : null,
        item.marks_obtained,
      ]);

    if (answerRows.length) {
      await query(
        `INSERT INTO exam_attempt_answers
         (attempt_id, attempt_question_id, question_id, answer_text, answer_json, status, is_correct, marks_awarded, auto_scored_at)
         VALUES ?
         ON DUPLICATE KEY UPDATE
           answer_text = VALUES(answer_text),
           answer_json = VALUES(answer_json),
           status = VALUES(status),
           is_correct = VALUES(is_correct),
           marks_awarded = VALUES(marks_awarded),
           auto_scored_at = NOW()`,
        [answerRows]
      );
    }

    await query(
      `UPDATE exam_attempts
       SET status = 'submitted',
           submitted_at = NOW(),
           total_questions = ?,
           answered_count = ?,
           not_answered_count = ?,
           correct_count = ?,
           wrong_count = ?,
           total_marks = ?,
           percentage = ?,
           result_status = 'auto_scored'
       WHERE attempt_id = ?`,
      [
        grading.result.total_questions,
        grading.result.attempted_count,
        grading.result.not_attempted_count,
        grading.result.correct_count,
        grading.result.wrong_count,
        grading.result.total_marks,
        grading.result.percentage,
        attemptId,
      ]
    );

    await query(
      `INSERT INTO attempt_events (attempt_id, event_type, event_payload)
       VALUES (?, 'submit', ?)`,
      [attemptId, JSON.stringify({ total_questions: questions.length })]
    ).catch(() => {});
  } catch (err) {
    if (!isMissingTable(err) && !isMissingColumn(err)) throw err;
  }
}

async function loadAttemptQuestions(attemptId) {
  if (!attemptId) return [];
  try {
    const rows = await query(
      `SELECT eaq.question_id, eaq.marks, eaq.negative_marks,
              qa.id, qa.category_id, qa.course_id, qa.subject_id, qa.chapter_id, qa.level_id, qa.question_type_id,
              qa.question_text, qa.option1, qa.option2, qa.option3, qa.option4, qa.answer,
              qa.question_image, qa.option1_image, qa.option2_image, qa.option3_image, qa.option4_image, qa.answer_image
       FROM exam_attempt_questions eaq
       INNER JOIN questions_answers qa ON qa.id = eaq.question_id
       WHERE eaq.attempt_id = ?
       ORDER BY eaq.question_order`,
      [attemptId]
    );
    return rows.map((row) => normalizeQuestion({ ...row, id: row.question_id || row.id }));
  } catch (err) {
    if (isMissingTable(err) || isMissingColumn(err)) return [];
    throw err;
  }
}

// GET /api/student/mypractice/history
router.get('/history', async (req, res) => {
  const { student_id } = req.query;
  if (!student_id) return res.status(400).json({ error: 'student_id required' });

  try {
    const legacyRows = await query(
      `SELECT id, user_id, total_marks, correct_count, wrong_count, answered, not_answered,
              category, course, subject, num_questions, created_at AS attempt_time, 'Practice Exam' AS title
       FROM practice_results
       WHERE user_id = ?
       ORDER BY created_at DESC
       LIMIT 100`,
      [student_id]
    );

    let attemptRows = [];
    try {
      attemptRows = await query(
        `SELECT attempt_id, attempt_uid AS exam_id, student_id, total_marks, correct_count, wrong_count,
                answered_count AS answered, not_answered_count AS not_answered,
                total_questions AS num_questions, started_at AS attempt_time, 'Practice Exam' AS title
         FROM exam_attempts
         WHERE student_id = ? AND attempt_type = 'practice'
         ORDER BY started_at DESC
         LIMIT 100`,
        [student_id]
      );
    } catch (err) {
      if (!isMissingTable(err) && !isMissingColumn(err)) throw err;
    }

    res.json({ history: [...attemptRows, ...legacyRows] });
  } catch (err) {
    res.status(500).json({ error: 'Server error', details: err.message });
  }
});

// POST /api/student/mypractice/generate
router.post('/generate', async (req, res) => {
  const filters = {
    category_id: req.body.category_id || null,
    course_id: req.body.course_id || null,
    subject_id: req.body.subject_id || null,
    level_id: req.body.level_id || null,
    chapter_id: req.body.chapter_id || null,
    class: req.body.class || null,
    schoolname: req.body.schoolname || null,
    questionCount: Number(req.body.questionCount || 1),
  };
  const studentId = Number(req.body.student_id || req.body.user_id || 0) || null;

  try {
    let sql = 'SELECT * FROM questions_answers WHERE 1=1';
    const params = [];

    if (filters.category_id) {
      sql += ' AND category_id = ?';
      params.push(filters.category_id);
    }
    if (filters.course_id) {
      sql += ' AND course_id = ?';
      params.push(filters.course_id);
    }
    if (filters.subject_id) {
      sql += ' AND subject_id = ?';
      params.push(filters.subject_id);
    }
    if (filters.level_id) {
      sql += ' AND level_id = ?';
      params.push(filters.level_id);
    }
    if (filters.chapter_id) {
      sql += ' AND chapter_id = ?';
      params.push(filters.chapter_id);
    }
    if (filters.class) {
      sql += ' AND class = ?';
      params.push(filters.class);
    }
    if (filters.schoolname) {
      sql += ' AND schoolname = ?';
      params.push(filters.schoolname);
    }

    sql += ' ORDER BY RAND() LIMIT ?';
    params.push(Math.max(1, Math.min(100, filters.questionCount)));

    const rows = await query(sql, params);
    const questions = (rows || []).map(normalizeQuestion);

    if (!questions.length) {
      return res.status(404).json({ message: 'No questions found for the selected criteria.' });
    }

    const practiceUid = `practice_${Date.now()}_${studentId || 'guest'}`;
    const attemptInfo = studentId
      ? await tryInsertPracticeAttempt({ studentId, practiceUid, questions, filters })
      : { setup_required: false };

    res.json({
      exam: {
        exam_id: practiceUid,
        practice_uid: practiceUid,
        attempt_id: attemptInfo.attempt_id || null,
        practice_session_id: attemptInfo.practice_session_id || null,
        questions,
        title: 'Practice Test',
        duration: 20,
        filters,
      },
      setup_required: Boolean(attemptInfo.setup_required),
      warning: attemptInfo.warning || null,
    });
  } catch (err) {
    res.status(500).json({ error: 'Server error', details: err.message });
  }
});

// POST /api/student/mypractice/submit
router.post('/submit', async (req, res) => {
  const studentId = Number(req.body.student_id || req.body.user_id || 0);
  const attemptId = Number(req.body.attempt_id || 0) || null;
  const requestQuestions = Array.isArray(req.body.questions) ? req.body.questions : [];
  const filters = req.body.filters || {};

  if (!studentId) return res.status(400).json({ ok: false, error: 'student_id required' });

  try {
    const attemptQuestions = await loadAttemptQuestions(attemptId);
    const questions = attemptQuestions.length ? attemptQuestions : requestQuestions.map(normalizeQuestion);
    const grading = gradeQuestions(questions, req.body.answers || {});

    if (!questions.length && typeof req.body.total_marks !== 'undefined') {
      grading.result.total_marks = Number(req.body.total_marks || 0);
      grading.result.correct_count = Number(req.body.correct_count || 0);
      grading.result.wrong_count = Number(req.body.wrong_count || 0);
      grading.result.attempted_count = Number(req.body.attempted_count || req.body.answered || 0);
      grading.result.answered = grading.result.attempted_count;
      grading.result.not_attempted_count = Number(req.body.not_attempted_count || req.body.not_answered || 0);
      grading.result.not_answered = grading.result.not_attempted_count;
      grading.result.total_questions = grading.result.attempted_count + grading.result.not_attempted_count;
    }

    await persistAttemptAnswers({ attemptId, questions, grading });
    const resultId = await savePracticeResultSummary({ studentId, result: grading.result, filters });

    res.json({
      ok: true,
      submission_id: resultId,
      attempt_id: attemptId,
      result: grading.result,
      feedback: grading.feedback,
    });
  } catch (err) {
    res.status(500).json({ ok: false, error: 'Server error', details: err.message });
  }
});

// GET /api/student/mypractice/result
router.get('/result', async (req, res) => {
  const { submission_id, attempt_id, student_id } = req.query;

  try {
    if (attempt_id) {
      const attempts = await query(
        `SELECT attempt_id, attempt_uid, student_id, total_marks, correct_count, wrong_count,
                answered_count AS attempted_count, not_answered_count AS not_attempted_count,
                total_questions, percentage, status, submitted_at
         FROM exam_attempts
         WHERE attempt_id = ? AND (? IS NULL OR student_id = ?)
         LIMIT 1`,
        [attempt_id, student_id || null, student_id || null]
      );
      if (!attempts.length) return res.status(404).json({ error: 'Practice attempt not found' });
      return res.json({ result: attempts[0], feedback: [] });
    }

    if (submission_id) {
      const rows = await query(
        `SELECT id, user_id, total_marks, correct_count, wrong_count,
                answered AS attempted_count, not_answered AS not_attempted_count,
                num_questions AS total_questions, created_at
         FROM practice_results
         WHERE id = ?
         LIMIT 1`,
        [submission_id]
      );
      if (!rows.length) return res.status(404).json({ error: 'Practice result not found' });
      return res.json({ result: rows[0], feedback: [] });
    }

    return res.status(400).json({ error: 'submission_id or attempt_id required' });
  } catch (err) {
    res.status(500).json({ error: 'Server error', details: err.message });
  }
});

module.exports = router;
