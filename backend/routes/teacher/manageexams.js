const express = require('express');
const router = express.Router();
const db = require('../../config/db');

/* ----------------------------- UTILITIES ----------------------------- */
// Promisify database queries for async/await usage
const queryAsync = (sql, params = []) => {
  return new Promise((resolve, reject) => {
    db.query(sql, params, (err, results) => {
      if (err) reject(err);
      else resolve(results);
    });
  });
};

function combineDateTime(dateStr, timeStr) {
  if (!dateStr || !timeStr) return null;
  let t = String(timeStr).trim();
  if (/^\d{2}:\d{2}$/.test(t)) t += ':00';
  if (/^\d{2}:\d{2}:\d{2}$/.test(t)) return `${dateStr} ${t}`;
  if (t.includes('T')) return t.replace('T', ' ').slice(0, 19);
  if (/^\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2}$/.test(t)) return t;
  return `${dateStr} ${t}`;
}

// Validate exam date is not in the past
function isValidExamDate(examDate) {
  const exam = new Date(examDate);
  const now = new Date();
  // Set to start of day to allow today's date
  now.setHours(0, 0, 0, 0);
  exam.setHours(0, 0, 0, 0);
  return exam >= now;
}

/* -------------------------- LIST/GET EXAMS --------------------------- */

// List all exams with their subjects and question counts
router.get('/exams', (_req, res) => {
  db.query('SELECT * FROM exams ORDER BY exam_id DESC', (err, exams = []) => {
    if (err) return res.status(500).json({ error: err.message });

    if (!exams.length) return res.json([]);
    const examIds = exams.map(e => e.exam_id);

    db.query(
      `SELECT es.*, s.subject_name
       FROM exam_subjects es
       LEFT JOIN subjects s ON es.subject_id = s.subject_id
       WHERE es.exam_id IN (?)`,
      [examIds],
      (err2, examSubjects = []) => {
        if (err2) return res.status(500).json({ error: err2.message });

        const subjectsByExam = {};
        examSubjects.forEach(es => {
          if (!subjectsByExam[es.exam_id]) subjectsByExam[es.exam_id] = [];
          subjectsByExam[es.exam_id].push({
            subject_id: es.subject_id,
            subject_name: es.subject_name,
            question_count: es.question_count,
          });
        });

        const out = exams.map(e => ({ ...e, subjects: subjectsByExam[e.exam_id] || [] }));
        res.json(out);
      }
    );
  });
});

// Get one exam with subjects
router.get('/exams/:exam_id', (req, res) => {
  const { exam_id } = req.params;
  if (!exam_id) return res.status(400).json({ error: 'exam_id is required' });

  db.query('SELECT * FROM exams WHERE exam_id = ?', [exam_id], (err, rows = []) => {
    if (err) return res.status(500).json({ error: err.message });
    if (!rows.length) return res.status(404).json({ error: 'Exam not found' });

    const exam = rows[0];
    db.query(
      `SELECT es.*, s.subject_name
       FROM exam_subjects es
       LEFT JOIN subjects s ON es.subject_id = s.subject_id
       WHERE es.exam_id = ?`,
      [exam_id],
      (err2, examSubjects = []) => {
        if (err2) return res.status(500).json({ error: err2.message });
        exam.subjects = examSubjects.map(es => ({
          subject_id: es.subject_id,
          subject_name: es.subject_name,
          question_count: es.question_count,
        }));
        res.json(exam);
      }
    );
  });
});

/* ---------------------------- DROPDOWNS ------------------------------ */

router.get('/categories', (_req, res) => {
  db.query(
    'SELECT category_id, category_name FROM course_categories ORDER BY category_name',
    (err, results = []) => (err ? res.status(500).json({ error: err.message }) : res.json(results))
  );
});

router.get('/courses', (req, res) => {
  const { category_id } = req.query;
  if (!category_id) return res.status(400).json({ error: 'category_id is required' });
  db.query(
    'SELECT course_id, course_name FROM courses WHERE category_id = ? ORDER BY course_name',
    [Number(category_id)],
    (err, results = []) => (err ? res.status(500).json({ error: err.message }) : res.json(results))
  );
});

router.get('/subjects', (req, res) => {
  const { course_id } = req.query;
  if (!course_id) return res.status(400).json({ error: 'course_id is required' });

  db.query(
    `SELECT s.subject_id, s.subject_name
     FROM subjects s
     JOIN course_subject_mapping csm ON s.subject_id = csm.subject_id
     WHERE csm.course_id = ?
     ORDER BY s.subject_name`,
    [Number(course_id)],
    (err, results = []) => (err ? res.status(500).json({ error: err.message }) : res.json(results))
  );
});

router.get('/chapters', (req, res) => {
  const { subject_id } = req.query;
  if (!subject_id) return res.status(400).json({ error: 'subject_id is required' });
  db.query(
    'SELECT chapter_id, chapter_name FROM chapters WHERE subject_id = ? ORDER BY chapter_name',
    [Number(subject_id)],
    (err, results = []) => (err ? res.status(500).json({ error: err.message }) : res.json(results))
  );
});

router.get('/question-types', (_req, res) => {
  db.query(
    'SELECT question_type_id, type_name FROM question_types ORDER BY question_type_id',
    (err, results = []) => (err ? res.status(500).json({ error: err.message }) : res.json(results))
  );
});

router.get('/levels', (_req, res) => {
  db.query(
    'SELECT level_id, level_name FROM difficulty_levels ORDER BY level_id',
    (err, results = []) => (err ? res.status(500).json({ error: err.message }) : res.json(results))
  );
});

/* ---------------------------- QUESTIONS ------------------------------ */

// By subject (not used by your current UI grid, but keeping)
router.get('/questions', (req, res) => {
  const { subject_id } = req.query;
  if (!subject_id) return res.status(400).json({ error: 'subject_id is required' });

  db.query(
    `SELECT id, question_text, option1, option2, option3, option4, answer
     FROM questions_answers
     WHERE subject_id = ?
     ORDER BY id DESC`,
    [Number(subject_id)],
    (err, results = []) => {
      if (err) return res.status(500).json({ error: err.message });
      const questions = results.map(q => ({
        id: q.id,
        question_text: q.question_text,
        options: [q.option1, q.option2, q.option3, q.option4]
          .filter(v => v !== null && v !== '')
          .map(v => ({ value: v, label: v })),
        answer: q.answer,
      }));
      res.json(questions);
    }
  );
});

// Filter by course/subject/level/type (+ optional chapter_id)
router.get('/questions/filter', (req, res) => {
  const { course_id, subject_id, level_id, question_type_id, chapter_id } = req.query;
  if (!course_id || !subject_id || !level_id || !question_type_id) {
    return res.status(400).json({ error: 'Missing parameters' });
  }

  const params = [Number(course_id), Number(subject_id), Number(level_id), Number(question_type_id)];
  let extra = '';
  if (chapter_id) {
    extra = ' AND chapter_id = ?';
    params.push(Number(chapter_id));
  }

  db.query(
    `SELECT id, question_text, option1, option2, option3, option4, answer
     FROM questions_answers
     WHERE course_id = ? AND subject_id = ? AND level_id = ? AND question_type_id = ? ${extra}
     ORDER BY id DESC`,
    params,
    (err, results = []) => (err ? res.status(500).json({ error: err.message }) : res.json(results))
  );
});

// Friendly alias with search support (kept as you had)
router.get('/filter', (req, res) => {
  try {
    const {
      course_id, subject_id, level_id,
      question_type, question_type_id, q, limit, chapter_id
    } = req.query;

    if (!course_id || !subject_id || !level_id) {
      return res.status(400).json({ error: 'Missing course_id, subject_id or level_id' });
    }

    const params = [Number(course_id), Number(subject_id), Number(level_id)];
    let typeJoin = '';
    let whereExtras = '';

    if (question_type_id && /^\d+$/.test(String(question_type_id))) {
      whereExtras += ' AND qa.question_type_id = ?';
      params.push(Number(question_type_id));
    } else if (question_type) {
      if (/^\d+$/.test(String(question_type))) {
        whereExtras += ' AND qa.question_type_id = ?';
        params.push(Number(question_type));
      } else {
        typeJoin = ' JOIN question_types qt ON qa.question_type_id = qt.question_type_id ';
        whereExtras += ' AND qt.type_name = ?';
        params.push(String(question_type));
      }
    }

    if (chapter_id) {
      whereExtras += ' AND qa.chapter_id = ?';
      params.push(Number(chapter_id));
    }

    if (q && String(q).trim()) {
      whereExtras += ' AND qa.question_text LIKE ?';
      params.push(`%${String(q).trim()}%`);
    }

    const finalLimit = Number(limit && /^\d+$/.test(limit) ? limit : 200);
    params.push(finalLimit);

    const sql = `
      SELECT qa.id, qa.question_text, qa.option1, qa.option2, qa.option3, qa.option4, qa.answer,
             qa.question_image, qa.option1_image, qa.option2_image, qa.option3_image, qa.option4_image
      FROM questions_answers qa
      ${typeJoin}
      WHERE qa.course_id = ? AND qa.subject_id = ? AND qa.level_id = ?
      ${whereExtras}
      ORDER BY qa.id DESC
      LIMIT ?`;

    db.query(sql, params, (err, results = []) => {
      if (err) return res.status(500).json({ error: 'Database error' });
      const normalized = results.map(r => ({
        id: r.id,
        question_text: r.question_text,
        options: [r.option1, r.option2, r.option3, r.option4].filter(Boolean),
        answer: r.answer,
        question_image: r.question_image,
        option1_image: r.option1_image,
        option2_image: r.option2_image,
        option3_image: r.option3_image,
        option4_image: r.option4_image,
        raw: r,
      }));
      res.json(normalized);
    });
  } catch (ex) {
    res.status(500).json({ error: 'Unexpected error' });
  }
});

/* -------------------------- PREVIEW AUDIENCE ------------------------- */

router.post('/preview-audience', (req, res) => {
  const { audience } = req.body || {};
  if (!audience) return res.status(400).json({ error: 'audience object is required' });

  const { mode = 'all', include = {}, exclude = {} } = audience;

  const buildFilterSQL = (filterObj, operatorAND = true) => {
    const conditions = [];
    const params = [];

    if (filterObj.name) { conditions.push('u.name LIKE ?'); params.push(`%${filterObj.name}%`); }
    if (filterObj.school) { conditions.push('u.schoolname LIKE ?'); params.push(`%${filterObj.school}%`); }
    if (filterObj.email) { conditions.push('u.email LIKE ?'); params.push(`%${filterObj.email}%`); }

    if (Array.isArray(filterObj.classes) && filterObj.classes.length) {
      conditions.push(`u.class IN (${filterObj.classes.map(() => '?').join(',')})`);
      params.push(...filterObj.classes);
    }
    if (Array.isArray(filterObj.sections) && filterObj.sections.length) {
      conditions.push(`u.section IN (${filterObj.sections.map(() => '?').join(',')})`);
      params.push(...filterObj.sections);
    }
    if (Array.isArray(filterObj.student_ids) && filterObj.student_ids.length) {
      conditions.push(`u.user_id IN (${filterObj.student_ids.map(() => '?').join(',')})`);
      params.push(...filterObj.student_ids.map(id => Number(id)));
    }
    if (Array.isArray(filterObj.programs) && filterObj.programs.length) {
      conditions.push(`(${filterObj.programs.map(() => 'u.program_name LIKE ?').join(' OR ')})`);
      params.push(...filterObj.programs.map(p => `%${p}%`));
    }

    const whereClause = conditions.length ? conditions.join(operatorAND ? ' AND ' : ' OR ') : '1=1';
    return { whereClause, params };
  };

  let sql = `
    SELECT COUNT(DISTINCT u.user_id) as total
    FROM users u
    WHERE u.role = 'student' AND u.is_active = 1
  `;
  const params = [];

  if (mode === 'filtered') {
    const { whereClause: inc, params: incP } = buildFilterSQL(include, true);
    sql += ` AND (${inc})`;
    params.push(...incP);
    if (Object.keys(exclude).length) {
      const { whereClause: exc, params: excP } = buildFilterSQL(exclude, false);
      sql += ` AND NOT (${exc})`;
      params.push(...excP);
    }
  }

  db.query(sql, params, (err, rows = []) => {
    if (err) return res.status(500).json({ error: 'Database error', details: err.message });
    res.json({ count: rows[0]?.total || 0 });
  });
});

/* ---------------------------- CREATE EXAM ---------------------------- */

router.post('/create-exam', async (req, res) => {
  try {
    const {
      title, course_id, duration, exam_date, start_time, end_time,
      created_by, status, package: examPackage, schoolname, class: classNo, order: orderType,
      subjects, marks, negativeMarks, adaptiveRules, publish_now, audience
    } = req.body || {};

    console.log('Create exam request:', JSON.stringify(req.body, null, 2));


    // Validate
    const missing = [];
    if (!title || !String(title).trim()) missing.push('title');
    if (!course_id || Number.isNaN(Number(course_id))) missing.push('course_id');
    if (!duration || Number.isNaN(Number(duration))) missing.push('duration');
    if (!exam_date || isNaN(Date.parse(exam_date))) missing.push('exam_date');
    if (!isValidExamDate(exam_date)) missing.push('exam_date (must be in future)');
    if (!start_time || !end_time) missing.push('start_time/end_time');
    if (!created_by || Number.isNaN(Number(created_by))) missing.push('created_by');
    if (!status || !['scheduled','active','completed','cancelled'].includes(String(status).toLowerCase())) missing.push('status');
    if (!schoolname) missing.push('schoolname');
    if (!classNo) missing.push('class');
    if (!Array.isArray(subjects) || !subjects.length) missing.push('subjects');

    if (missing.length) {
      console.error('Validation errors:', missing);
      return res.status(400).json({ error: 'Missing or invalid required fields', missingFields: missing });
    }
    
    for (const [i, s] of subjects.entries()) {
      if (!s.subject_id || Number.isNaN(Number(s.subject_id))) missing.push(`subjects[${i}].subject_id`);
      if (!s.questionCount || Number.isNaN(Number(s.questionCount))) missing.push(`subjects[${i}].questionCount`);
      if (!Array.isArray(s.selectedQuestions)) missing.push(`subjects[${i}].selectedQuestions`);
    }
    if (missing.length) {
      console.error('Subject validation errors:', missing);
      return res.status(400).json({ error: 'Missing or invalid required fields', missingFields: missing });
    }

    // Normalize times (handle overnight)
    let startDateTime = combineDateTime(exam_date, start_time);
    let endDateTime = combineDateTime(exam_date, end_time);
    const start = new Date(startDateTime);
    let end = new Date(endDateTime);
    if (end <= start) {
      end.setDate(end.getDate() + 1);
      const pad = n => String(n).padStart(2, '0');
      endDateTime = `${end.getFullYear()}-${pad(end.getMonth()+1)}-${pad(end.getDate())} ${pad(end.getHours())}:${pad(end.getMinutes())}:${pad(end.getSeconds())}`;
    }

    // Start transaction
    await new Promise((resolve, reject) => {
      db.beginTransaction((err) => {
        if (err) reject(err);
        else resolve();
      });
    });

    try {
      // Insert exam
      const examInsert = await queryAsync(
        'INSERT INTO exams (title, course_id, duration, exam_date, start_time, end_time, created_by, status, package, schoolname, class, `order`) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)',
        [title, Number(course_id), Number(duration), exam_date, startDateTime, endDateTime, Number(created_by), status, examPackage || null, schoolname, classNo, orderType || null]
      );
      const exam_id = examInsert.insertId;
      console.log('Exam created with ID:', exam_id);

      // Insert exam subjects
      if (subjects.length) {
        const subjectRows = subjects.map(s => [exam_id, s.subject_id, s.questionCount]);
        await queryAsync('INSERT INTO exam_subjects (exam_id, subject_id, question_count) VALUES ?', [subjectRows]);
      }

      // Insert exam question mapping
      const qRows = [];
      subjects.forEach((s, sectionIdx) => {
        s.selectedQuestions.forEach((qid, orderNo) => {
          qRows.push([
            exam_id,
            qid,
            `Section ${sectionIdx + 1}`,
            orderNo + 1,
            Number(marks?.[qid]) || 1,
            Number(negativeMarks?.[qid]) || 0
          ]);
        });
      });
      if (qRows.length) {
        await queryAsync(
          'INSERT INTO exam_question_mapping (exam_id, question_id, section, order_no, marks, negative_marks) VALUES ?',
          [qRows]
        );
      }

      // Insert adaptive rules (optional)
      if (Array.isArray(adaptiveRules) && adaptiveRules.length && adaptiveRules[0]?.min_score !== '') {
        const ar = adaptiveRules.map(r => [exam_id, r.round, r.min_score, r.max_score, r.next_level]);
        await queryAsync(
          'INSERT INTO exam_adaptive_rules (exam_id, round, min_score, max_score, next_level) VALUES ?',
          [ar]
        );
      }




      // Assign audience (always assign when audience is provided)
      if (audience) {
        const { mode = 'all', include = {}, exclude = {} } = audience;

        const buildFilterSQL = (filterObj) => {
          const conditions = [];
          const params = [];
          if (filterObj.name) { conditions.push('u.name LIKE ?'); params.push(`%${filterObj.name}%`); }
          if (filterObj.school) { conditions.push('u.schoolname LIKE ?'); params.push(`%${filterObj.school}%`); }
          if (filterObj.email) { conditions.push('u.email LIKE ?'); params.push(`%${filterObj.email}%`); }
          if (Array.isArray(filterObj.classes) && filterObj.classes.length) {
            conditions.push(`u.class IN (${filterObj.classes.map(()=>'?').join(',')})`);
            params.push(...filterObj.classes);
          }
          if (Array.isArray(filterObj.sections) && filterObj.sections.length) {
            conditions.push(`u.section IN (${filterObj.sections.map(()=>'?').join(',')})`);
            params.push(...filterObj.sections);
          }
          if (Array.isArray(filterObj.student_ids) && filterObj.student_ids.length) {
            conditions.push(`u.user_id IN (${filterObj.student_ids.map(()=>'?').join(',')})`);
            params.push(...filterObj.student_ids.map(Number));
          }
          if (Array.isArray(filterObj.programs) && filterObj.programs.length) {
            conditions.push(`(${filterObj.programs.map(()=> 'u.program_name LIKE ?').join(' OR ')})`);
            params.push(...filterObj.programs.map(p => `%${p}%`));
          }
          const whereClause = conditions.length ? conditions.join(' AND ') : '1=1';
          return { whereClause, params };
        };

        let studentSql = `
          SELECT DISTINCT u.user_id
          FROM users u
          WHERE u.role = 'student' AND u.is_active = 1
        `;
        const studentParams = [];

        // Apply filters for both 'all' and 'filtered' modes
        if (Object.keys(include).length > 0 || Object.keys(exclude).length > 0) {
          if (Object.keys(include).length > 0) {
            const { whereClause: inc, params: incP } = buildFilterSQL(include);
            studentSql += ` AND (${inc})`;
            studentParams.push(...incP);
          }

          if (Object.keys(exclude).length > 0) {
            const { whereClause: exc, params: excP } = buildFilterSQL(exclude);
            studentSql += ` AND NOT (${exc})`;
            studentParams.push(...excP);
          }
        }

        console.log('Assigning exam to students with SQL:', studentSql);
        console.log('Student parameters:', studentParams);

        const matching = await queryAsync(studentSql, studentParams);
        console.log('Found students to assign:', matching);

        if (matching.length) {
          const assignRows = matching.map(m => [exam_id, m.user_id, 'assigned', null, null, created_by]);
          console.log('Assignment rows:', assignRows);
          
          const assignmentResult = await queryAsync(
            `INSERT INTO exam_students (exam_id, student_id, status, visible_from, visible_to, assigned_by)
             VALUES ? ON DUPLICATE KEY UPDATE status = VALUES(status)`,
            [assignRows]
          );
          console.log('Assignment result:', assignmentResult);
        } else {
          console.log('No students found to assign exam to');
        }
      }

      // Commit transaction
      await new Promise((resolve, reject) => {
        db.commit((err) => {
          if (err) reject(err);
          else resolve();
        });
      });

      res.json({ success: true, exam_id });
    } catch (transactionErr) {
      await new Promise((resolve) => {
        db.rollback(() => resolve());
      });
      throw transactionErr;
    }
  } catch (err) {
    console.error('Create exam error:', err);
    res.status(500).json({ error: 'Failed to create exam', details: err.message });
  }
});

/* ----------------------- UPDATE/DELETE EXAM ----------------------- */

router.put('/exams/:exam_id', async (req, res) => {
  try {
    const { exam_id } = req.params;
    const { title, status, subjects, marks, negativeMarks } = req.body || {};

    if (!exam_id) return res.status(400).json({ error: 'exam_id is required' });

    // Check exam exists
    const exam = await queryAsync('SELECT * FROM exams WHERE exam_id = ?', [exam_id]);
    if (!exam.length) return res.status(404).json({ error: 'Exam not found' });

    await new Promise((resolve, reject) => {
      db.beginTransaction((err) => {
        if (err) reject(err);
        else resolve();
      });
    });

    try {
      // Update exam
      if (title || status) {
        const updates = [];
        const params = [];
        if (title) { updates.push('title = ?'); params.push(title); }
        if (status) { updates.push('status = ?'); params.push(status); }
        params.push(exam_id);
        
        await queryAsync(`UPDATE exams SET ${updates.join(', ')} WHERE exam_id = ?`, params);
      }

      // Update question marks if provided
      if (marks) {
        for (const [qid, markValue] of Object.entries(marks)) {
          await queryAsync(
            'UPDATE exam_question_mapping SET marks = ? WHERE exam_id = ? AND question_id = ?',
            [Number(markValue), exam_id, Number(qid)]
          );
        }
      }

      await new Promise((resolve, reject) => {
        db.commit((err) => {
          if (err) reject(err);
          else resolve();
        });
      });

      res.json({ success: true, message: 'Exam updated' });
    } catch (transactionErr) {
      await new Promise((resolve) => {
        db.rollback(() => resolve());
      });
      throw transactionErr;
    }
  } catch (err) {
    console.error('Update exam error:', err);
    res.status(500).json({ error: 'Failed to update exam', details: err.message });
  }
});

router.delete('/exams/:exam_id', async (req, res) => {
  try {
    const { exam_id } = req.params;

    if (!exam_id) return res.status(400).json({ error: 'exam_id is required' });

    // Check exam exists
    const exam = await queryAsync('SELECT * FROM exams WHERE exam_id = ?', [exam_id]);
    if (!exam.length) return res.status(404).json({ error: 'Exam not found' });

    await new Promise((resolve, reject) => {
      db.beginTransaction((err) => {
        if (err) reject(err);
        else resolve();
      });
    });

    try {
      // Delete related records
      await queryAsync('DELETE FROM exam_students WHERE exam_id = ?', [exam_id]);
      await queryAsync('DELETE FROM exam_question_mapping WHERE exam_id = ?', [exam_id]);
      await queryAsync('DELETE FROM exam_adaptive_rules WHERE exam_id = ?', [exam_id]);
      await queryAsync('DELETE FROM exam_subjects WHERE exam_id = ?', [exam_id]);
      await queryAsync('DELETE FROM exams WHERE exam_id = ?', [exam_id]);

      await new Promise((resolve, reject) => {
        db.commit((err) => {
          if (err) reject(err);
          else resolve();
        });
      });

      res.json({ success: true, message: 'Exam deleted' });
    } catch (transactionErr) {
      await new Promise((resolve) => {
        db.rollback(() => resolve());
      });
      throw transactionErr;
    }
  } catch (err) {
    console.error('Delete exam error:', err);
    res.status(500).json({ error: 'Failed to delete exam', details: err.message });
  }
});

/* ----------------------- ASSIGN EXAM TO STUDENTS ---------------------- */

router.post('/assign-exam', async (req, res) => {
  try {
    const { exam_id, audience } = req.body || {};

    if (!exam_id) return res.status(400).json({ error: 'exam_id is required' });
    if (!audience) return res.status(400).json({ error: 'audience is required' });

    const exam = await queryAsync('SELECT * FROM exams WHERE exam_id = ?', [exam_id]);
    if (!exam.length) return res.status(404).json({ error: 'Exam not found' });

    const { mode = 'all', include = {}, exclude = {} } = audience;

    const buildFilterSQL = (filterObj) => {
      const conditions = [];
      const params = [];
      if (filterObj.name) { conditions.push('u.name LIKE ?'); params.push(`%${filterObj.name}%`); }
      if (filterObj.school) { conditions.push('u.schoolname LIKE ?'); params.push(`%${filterObj.school}%`); }
      if (filterObj.email) { conditions.push('u.email LIKE ?'); params.push(`%${filterObj.email}%`); }
      if (Array.isArray(filterObj.classes) && filterObj.classes.length) {
        conditions.push(`u.class IN (${filterObj.classes.map(()=>'?').join(',')})`);
        params.push(...filterObj.classes);
      }
      if (Array.isArray(filterObj.sections) && filterObj.sections.length) {
        conditions.push(`u.section IN (${filterObj.sections.map(()=>'?').join(',')})`);
        params.push(...filterObj.sections);
      }
      if (Array.isArray(filterObj.student_ids) && filterObj.student_ids.length) {
        conditions.push(`u.user_id IN (${filterObj.student_ids.map(()=>'?').join(',')})`);
        params.push(...filterObj.student_ids.map(Number));
      }
      if (Array.isArray(filterObj.programs) && filterObj.programs.length) {
        conditions.push(`(${filterObj.programs.map(()=> 'u.program_name LIKE ?').join(' OR ')})`);
        params.push(...filterObj.programs.map(p => `%${p}%`));
      }
      const whereClause = conditions.length ? conditions.join(' AND ') : '1=1';
      return { whereClause, params };
    };

    let studentSql = `
      SELECT DISTINCT u.user_id
      FROM users u
      WHERE u.role = 'student' AND u.is_active = 1
    `;
    const studentParams = [];

    if (mode === 'filtered') {
      const { whereClause: inc, params: incP } = buildFilterSQL(include);
      studentSql += ` AND (${inc})`;
      studentParams.push(...incP);

      if (Object.keys(exclude).length) {
        const { whereClause: exc, params: excP } = buildFilterSQL(exclude);
        studentSql += ` AND NOT (${exc})`;
        studentParams.push(...excP);
      }
    }

    const matching = await queryAsync(studentSql, studentParams);

    if (matching.length) {
      const assignRows = matching.map(m => [exam_id, m.user_id, 'assigned', null, null]);
      await queryAsync(
        `INSERT INTO exam_students (exam_id, student_id, status, visible_from, visible_to)
         VALUES ? ON DUPLICATE KEY UPDATE status = VALUES(status)`,
        [assignRows]
      );
    }

    res.json({ success: true, assigned_count: matching.length });
  } catch (err) {
    console.error('Assign exam error:', err);
    res.status(500).json({ error: 'Failed to assign exam', details: err.message });
  }
});


/* ------------------------ GROUPED (OPTIONAL) ------------------------- */
router.get('/questions/grouped', (req, res) => {
  const { course_id, subject_id } = req.query;
  if (!course_id || !subject_id) return res.status(400).json({ error: 'course_id and subject_id are required' });

  db.query(
    `SELECT qa.*, qt.type_name, dl.level_name
     FROM questions_answers qa
     JOIN question_types qt ON qa.question_type_id = qt.question_type_id
     JOIN difficulty_levels dl ON qa.level_id = dl.level_id
     WHERE qa.course_id = ? AND qa.subject_id = ?
     ORDER BY qt.type_name, dl.level_name, qa.id`,
    [Number(course_id), Number(subject_id)],
    (err, results = []) => (err ? res.status(500).json({ error: err.message }) : res.json(results))
  );
});

/* ---------------------- MANUAL ASSIGNMENT (DEBUG) ---------------------- */
router.post('/assign-exam-manual', async (req, res) => {
  try {
    const { exam_id, student_ids } = req.body || {};
    
    if (!exam_id || !Array.isArray(student_ids)) {
      return res.status(400).json({ error: 'exam_id and student_ids array are required' });
    }

    console.log('Manual assignment requested for exam:', exam_id, 'students:', student_ids);

    // Check exam exists
    const exam = await queryAsync('SELECT * FROM exams WHERE exam_id = ?', [exam_id]);
    if (!exam.length) return res.status(404).json({ error: 'Exam not found' });

    const assignRows = student_ids.map(studentId => [exam_id, studentId, 'assigned', null, null, 1]);
    
    const assignmentResult = await queryAsync(
      `INSERT INTO exam_students (exam_id, student_id, status, visible_from, visible_to, assigned_by)
       VALUES ? ON DUPLICATE KEY UPDATE status = VALUES(status)`,
      [assignRows]
    );
    
    console.log('Manual assignment result:', assignmentResult);
    res.json({ success: true, assigned_count: student_ids.length, assignmentResult });
  } catch (err) {
    console.error('Manual assignment error:', err);
    res.status(500).json({ error: 'Failed to manually assign exam', details: err.message });
  }
});

/* ---------------------- DEBUG: CHECK ASSIGNMENTS ---------------------- */
router.get('/debug/exam-assignments/:exam_id', async (req, res) => {
  try {
    const { exam_id } = req.params;
    
    const assignments = await queryAsync(
      `SELECT es.*, u.name, u.email, u.class 
       FROM exam_students es 
       JOIN users u ON es.student_id = u.user_id 
       WHERE es.exam_id = ?`,
      [exam_id]
    );
    
    res.json({ exam_id, assignments });
  } catch (err) {
    console.error('Debug assignment query error:', err);
    res.status(500).json({ error: 'Failed to fetch assignments', details: err.message });
  }
});

module.exports = router;
