
process.env.TZ = 'Asia/Kolkata';
// GET /api/student/profile/:id - get student profile by user_id
const express = require('express');
const router = express.Router();
const db = require('../config/db');

// Get student profile by user_id
router.get('/profile/:id', (req, res) => {
  const { id } = req.params;
  db.query('SELECT * FROM users WHERE user_id = ? AND role = "student"', [id], (err, results) => {
    if (err) return res.status(500).json({ error: err.message });
    if (results.length === 0) return res.status(404).json({ error: 'Student not found' });
    res.json(results[0]);
  });
});

// Update student profile by user_id
router.put('/profile/:id', (req, res) => {
  const { id } = req.params;
  const {
    name,
    email,
    phone,
    dateOfBirth,
    course,
    address,
    guardianName,
    guardianPhone
  } = req.body;
  // Only update provided fields
  const fields = [];
  const values = [];
  if (name !== undefined) { fields.push('name = ?'); values.push(name); }
  if (email !== undefined) { fields.push('email = ?'); values.push(email); }
  if (phone !== undefined) { fields.push('phone = ?'); values.push(phone); }
  if (dateOfBirth !== undefined) { fields.push('dateOfBirth = ?'); values.push(dateOfBirth); }
  if (course !== undefined) { fields.push('course = ?'); values.push(course); }
  if (address !== undefined) { fields.push('address = ?'); values.push(address); }
  if (guardianName !== undefined) { fields.push('guardianName = ?'); values.push(guardianName); }
  if (guardianPhone !== undefined) { fields.push('guardianPhone = ?'); values.push(guardianPhone); }
  if (fields.length === 0) {
    return res.status(400).json({ error: 'No fields to update' });
  }
  const query = `UPDATE users SET ${fields.join(', ')} WHERE user_id = ? AND role = "student"`;
  values.push(id);
  db.query(query, values, (err, result) => {
    if (err) return res.status(500).json({ error: err.message });
    // Return updated profile
    db.query('SELECT * FROM users WHERE user_id = ? AND role = "student"', [id], (err2, results) => {
      if (err2) return res.status(500).json({ error: err2.message });
      if (results.length === 0) return res.status(404).json({ error: 'Student not found' });
      res.json(results[0]);
    });
  });
});

// Example: Get student exams

// Get exam scores for a student by user_id
router.get('/exam-scores/:id', (req, res) => {
  const { id } = req.params;
  // Example query: assumes a table 'exam_scores' with columns: user_id, exam_name, score, date
  db.query('SELECT exam_name, score, date FROM exam_scores WHERE user_id = ?', [id], (err, results) => {
    if (err) return res.status(500).json({ error: err.message });
    res.json(results);
  });
});

// Fetch student results

router.get('/myexam/results', (req, res) => {
  const { student_id } = req.query;
  if (!student_id) {
    return res.status(400).json({ error: 'Student ID is required' });
  }

  // Get student exam results with exam details
  const query = `SELECT 
    se.student_exam_id AS result_id,
    se.exam_id,
    se.total_marks AS final_score,
    se.feedback,
    e.title,
    e.exam_date
  FROM student_exams se
  LEFT JOIN exams e ON se.exam_id = e.exam_id
  WHERE se.student_id = ?
  ORDER BY se.updated_at DESC`;

  db.query(query, [student_id], (err, results) => {
    if (err) {
      return res.status(500).json({ error: 'Database query failed', details: err.message });
    }
    res.json({ results });
  });
});


// Fetch active exams for a student (only enrolled courses)
router.get('/myexam/active', (req, res) => {
  const { student_id } = req.query;
  if (!student_id) {
    return res.status(400).json({ error: 'Student ID is required' });
  }

  // Get active exams assigned to THIS specific student
  // Include running exams (within time window) that THIS student has NOT yet completed
  const query = `
    SELECT DISTINCT e.exam_id, e.title, e.duration, e.exam_date, e.start_time, e.end_time, e.status, c.course_name
    FROM exams e
    JOIN exam_students es ON e.exam_id = es.exam_id AND es.student_id = ?
    LEFT JOIN courses c ON e.course_id = c.course_id
    LEFT JOIN submissions s ON e.exam_id = s.exam_id AND s.student_id = ?
    LEFT JOIN student_exam_results ser ON e.exam_id = ser.exam_id AND ser.user_id = ?
    WHERE e.status IN ('active', 'scheduled')
      AND NOW() BETWEEN e.start_time AND e.end_time
      AND (s.submission_id IS NULL OR s.status != 'submitted')
      AND ser.exam_id IS NULL
    ORDER BY e.exam_date DESC, e.start_time DESC`;

  db.query(query, [student_id, student_id, student_id], (err, results) => {
    if (err) {
      console.error('Active exams error:', err);
      return res.status(500).json({ error: 'Database query failed', details: err.message });
    }
    res.json({ exams: results || [] });
  });
});


// Fetch scheduled exams for a student (only enrolled courses)
router.get('/myexam/scheduled', (req, res) => {
  const { student_id } = req.query;
  if (!student_id) {
    return res.status(400).json({ error: 'Student ID is required' });
  }

  // Get scheduled exams assigned to THIS specific student
  // Strictly future exams (start_time > NOW())
  const query = `
    SELECT DISTINCT e.exam_id, e.title, e.duration, e.exam_date, e.start_time, e.end_time, e.status, c.course_name
    FROM exams e
    JOIN exam_students es ON e.exam_id = es.exam_id AND es.student_id = ?
    LEFT JOIN courses c ON e.course_id = c.course_id
    WHERE e.status IN ('active', 'scheduled')
      AND e.start_time > NOW()
    ORDER BY e.exam_date ASC, e.start_time ASC`;

  db.query(query, [student_id], (err, results) => {
    if (err) {
      console.error('Scheduled exams error:', err);
      return res.status(500).json({ error: 'Database query failed', details: err.message });
    }
    res.json({ exams: results || [] });
  });
});


// Fetch completed exams for a student (only enrolled courses)
router.get('/myexam/completed', (req, res) => {
  const { student_id } = req.query;
  if (!student_id) {
    return res.status(400).json({ error: 'Student ID is required' });
  }

  // Get completed exams for THIS specific student ONLY
  // Include exams that THIS student has submitted OR has results for (no cross-student data leakage)
  const query = `
    SELECT e.exam_id, e.title, e.duration, e.exam_date, e.start_time, e.end_time, e.status, c.course_name,
            COALESCE(MAX(ser.created_at), MAX(s.end_time), e.exam_date) as completion_time
    FROM exams e
    LEFT JOIN courses c ON e.course_id = c.course_id
    LEFT JOIN exam_students es ON e.exam_id = es.exam_id AND es.student_id = ?
    LEFT JOIN submissions s ON e.exam_id = s.exam_id AND s.student_id = ?
    LEFT JOIN student_exam_results ser ON e.exam_id = ser.exam_id AND ser.user_id = ?
    WHERE (s.status = 'submitted' OR ser.exam_id IS NOT NULL)
    GROUP BY e.exam_id, e.title, e.duration, e.exam_date, e.start_time, e.end_time, e.status, c.course_name
    ORDER BY completion_time DESC`;

  db.query(query, [student_id, student_id, student_id], (err, results) => {
    if (err) {
      console.error('Completed exams error:', err);
      return res.status(500).json({ error: 'Database query failed', details: err.message });
    }
    res.json({ exams: results || [] });
  });
});

// Fetch exam information
router.get('/myexam/examinfo', (req, res) => {
  const { exam_id } = req.query;
  if (!exam_id) {
    return res.status(400).json({ error: 'Exam ID is required' });
  }

  const query = 'SELECT exam_id, title, exam_date FROM exams WHERE exam_id = ?';
  db.query(query, [exam_id], (err, results) => {
    if (err) {
      return res.status(500).json({ error: 'Database query failed', details: err.message });
    }
    if (results.length === 0) {
      return res.status(404).json({ error: 'Exam not found' });
    }
    res.json({ exam: results[0] });
  });
});

// Fetch exam questions with subject information
router.get('/myexam/questions/:exam_id', (req, res) => {
  const { exam_id } = req.params;
  if (!exam_id) {
    return res.status(400).json({ error: 'Exam ID is required' });
  }

  // Get exam details
  db.query('SELECT exam_id, title, duration FROM exams WHERE exam_id = ?', [exam_id], (err, examResults) => {
    if (err) {
      return res.status(500).json({ error: 'Database query failed', details: err.message });
    }
    if (examResults.length === 0) {
      return res.status(404).json({ error: 'Exam not found' });
    }

    const exam = examResults[0];

    // Get exam subjects
    db.query(
      `SELECT es.subject_id, es.question_count, s.subject_name
       FROM exam_subjects es
       LEFT JOIN subjects s ON es.subject_id = s.subject_id
       WHERE es.exam_id = ?`,
      [exam_id],
      (err, subjects) => {
        if (err) {
          return res.status(500).json({ error: 'Database query failed', details: err.message });
        }

        // Get exam questions with subject information
        db.query(
          `SELECT eqm.question_id as id, qa.question_text, qa.option1, qa.option2, qa.option3, qa.option4, 
                  qa.answer, qa.question_image, qa.option1_image, qa.option2_image, qa.option3_image, 
                  qa.option4_image, s.subject_name as subject, eqm.marks, eqm.negative_marks, eqm.order_no
           FROM exam_question_mapping eqm
           JOIN questions_answers qa ON eqm.question_id = qa.id
           LEFT JOIN subjects s ON qa.subject_id = s.subject_id
           WHERE eqm.exam_id = ?
           ORDER BY eqm.order_no ASC`,
          [exam_id],
          (err, questions) => {
            if (err) {
              console.error('Error fetching questions for exam', exam_id, ':', err);
              return res.status(500).json({ error: 'Database query failed', details: err.message });
            }

            // Questions fetched successfully
            if (questions.length === 0) {
              console.warn(`WARNING: No questions found in exam_question_mapping for exam_id ${exam_id}`);
            }

            // Transform questions to expected format
            const transformedQuestions = questions.map(q => {
              const opts = [
                { text: q.option1, image: q.option1_image },
                { text: q.option2, image: q.option2_image },
                { text: q.option3, image: q.option3_image },
                { text: q.option4, image: q.option4_image }
              ].filter(o => (o.text !== null && o.text !== '') || (o.image !== null && o.image !== ''));
              
              console.log(`[Backend] Question ${q.id} options:`, opts);
              
              return {
                id: q.id,
                question_text: q.question_text,
                options: opts,
                answer: q.answer,
                question_image: q.question_image,
                subject: q.subject,
                marks: q.marks,
                negative_marks: q.negative_marks,
                order_no: q.order_no
              };
            });

            res.json({
              exam: {
                exam_id: exam.exam_id,
                title: exam.title,
                duration: exam.duration,
                subjects: subjects.map(s => ({
                  subject_id: s.subject_id,
                  subject_name: s.subject_name,
                  question_count: s.question_count
                }))
              },
              questions: transformedQuestions
            });
          }
        );
      }
    );
  });
});

// Fetch practice exams for a student
router.get('/mypractice', (req, res) => {
  const { student_id } = req.query;
  if (!student_id) {
    return res.status(400).json({ error: 'Student ID is required' });
  }

  const query = 'SELECT practice_id, title, description, created_at FROM practice_exams WHERE student_id = ?';
  db.query(query, [student_id], (err, results) => {
    if (err) {
      return res.status(500).json({ error: 'Database query failed', details: err.message });
    }
    res.json({ practiceExams: results });
  });
});

// Fetch categories
router.get('/mypractice/categories', (req, res) => {
  const query = 'SELECT category_id, category_name FROM categories';
  db.query(query, (err, results) => {
    if (err) {
      return res.status(500).json({ error: 'Database query failed', details: err.message });
    }
    res.json({ categories: results });
  });
});

// Fetch courses based on category
router.get('/mypractice/courses', (req, res) => {
  const { category_id } = req.query;
  if (!category_id) {
    return res.status(400).json({ error: 'Category ID is required' });
  }

  const query = 'SELECT course_id, course_name FROM courses WHERE category_id = ?';
  db.query(query, [category_id], (err, results) => {
    if (err) {
      return res.status(500).json({ error: 'Database query failed', details: err.message });
    }
    res.json({ courses: results });
  });
});

// Fetch subjects based on course
router.get('/mypractice/subjects', (req, res) => {
  const { course_id } = req.query;
  if (!course_id) {
    return res.status(400).json({ error: 'Course ID is required' });
  }

  const query = 'SELECT subject_id, subject_name FROM subjects WHERE course_id = ?';
  db.query(query, [course_id], (err, results) => {
    if (err) {
      return res.status(500).json({ error: 'Database query failed', details: err.message });
    }
    res.json({ subjects: results });
  });
});

// Fetch levels
router.get('/mypractice/levels', (req, res) => {
  const query = 'SELECT level_id, level_name FROM levels';
  db.query(query, (err, results) => {
    if (err) {
      return res.status(500).json({ error: 'Database query failed', details: err.message });
    }
    res.json({ levels: results });
  });
});

// Generate practice exam
router.post('/mypractice/generate', (req, res) => {
  // Request body received and validated

  const { category_id, course_id, subject_id, level_id, questionCount } = req.body;

  if (!category_id || !course_id || !subject_id || !level_id || !questionCount) {
    return res.status(400).json({ error: 'All fields are required' });
  }

  const query = `
    SELECT id AS question_id, question_text, 
           CONCAT(option1, ',', option2, ',', option3, ',', option4) AS options, 
           answer AS correct_option
    FROM questions_answers
    WHERE category_id = ? AND course_id = ? AND subject_id = ? AND level_id = ?
    ORDER BY RAND()
    LIMIT ?`;

  db.query(query, [category_id, course_id, subject_id, level_id, parseInt(questionCount)], (err, results) => {
    if (err) {
      console.error('Database query error:', err); // Log database errors
      return res.status(500).json({ error: 'Database query failed', details: err.message });
    }

    // Results retrieved from database

    if (!results || results.length === 0) {
      return res.status(404).json({ error: 'No questions found for the given criteria.' });
    }

    try {
      res.json({ practiceExam: results });
    } catch (jsonError) {
      console.error('JSON response error:', jsonError); // Log JSON response errors
      res.status(500).json({ error: 'Failed to send JSON response', details: jsonError.message });
    }
  });
});

// Test route to verify router is loaded
router.get('/test', (req, res) => {
  res.json({ message: 'Student router is working!' });
});

// Ensure all routes return valid JSON responses

// Middleware to handle unexpected errors
router.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ error: 'Internal Server Error', details: err.message });
});

// Wrap database queries with error handling
const safeQuery = (query, params, res) => {
  db.query(query, params, (err, results) => {
    if (err) {
      console.error('Database query failed:', err.message);
      return res.status(500).json({ error: 'Database query failed', details: err.message });
    }
    res.json(results);
  });
};

// Example: Update existing routes to use safeQuery
router.get('/mypractice/categories', (req, res) => {
  const query = 'SELECT category_id, category_name FROM categories';
  safeQuery(query, [], res);
});

router.get('/mypractice/courses', (req, res) => {
  const { category_id } = req.query;
  if (!category_id) {
    return res.status(400).json({ error: 'Category ID is required' });
  }
  const query = 'SELECT course_id, course_name FROM courses WHERE category_id = ?';
  safeQuery(query, [category_id], res);
});

// Start exam - create submission record
router.post('/myexam/start', (req, res) => {
  const { exam_id, student_id } = req.body;
  if (!exam_id || !student_id) {
    return res.status(400).json({ error: 'exam_id and student_id are required' });
  }

  // Create submission record
  const query = `INSERT INTO submissions (exam_id, student_id, start_time, status) 
                 VALUES (?, ?, NOW(), 'in_progress')`;
  db.query(query, [exam_id, student_id], (err, result) => {
    if (err) {
      return res.status(500).json({ error: 'Failed to start exam', details: err.message });
    }
    res.json({ ok: true, submission_id: result.insertId });
  });
});


// Submit exam - save answers and mark as submitted
router.post('/myexam/submit', (req, res) => {
  const { exam_id, student_id, submission_id, answers, reason } = req.body;
  
  if (!exam_id || !student_id) {
    return res.status(400).json({ error: 'exam_id and student_id are required' });
  }

  // Update submission record for THIS specific student ONLY (optional - may not exist)
  const updateQuery = `UPDATE submissions SET end_time = NOW(), status = 'submitted' 
                       WHERE exam_id = ? AND student_id = ?`;
  
  db.query(updateQuery, [exam_id, student_id], (err, updateResult) => {
    if (err) {
      // Continue anyway - submission table is optional
    }

    // Save answers if provided and calculate result
    if (answers && typeof answers === 'object') {
      // First fetch the actual question IDs for this exam in order with marks and correct answers
      db.query(
        `SELECT eqm.question_id, eqm.marks, eqm.negative_marks, qa.answer as correct_answer
         FROM exam_question_mapping eqm
         INNER JOIN questions_answers qa ON qa.id = eqm.question_id
         WHERE eqm.exam_id = ? 
         ORDER BY eqm.order_no ASC`,
        [exam_id],
        (err, questions) => {
          if (err) {
            console.error('Failed to fetch exam questions:', err);
            return res.status(500).json({ error: 'Failed to fetch exam structure', details: err.message });
          }

          const answerRecords = [];
          let total_marks = 0;
          let correct_count = 0;
          let wrong_count = 0;
          let attempted = 0;
          
          // Map answer array indices to actual question IDs and calculate scores
          Object.entries(answers).forEach(([answerIndex, answer]) => {
            const questionIndex = parseInt(answerIndex);
            if (!isNaN(questionIndex) && questions[questionIndex]) {
              const question = questions[questionIndex];
              const actualQuestionId = question.question_id;
              const studentAnswer = answer.student_answer || answer.value || '';
              
              if (answer && (answer.status === 'answered' || studentAnswer)) {
                attempted++;
                
                // Check if answer is correct
                const correctAnswer = (question.correct_answer || '').trim();
                const isCorrect = studentAnswer.trim() === correctAnswer;
                
                if (isCorrect) {
                  correct_count++;
                  total_marks += question.marks || 1;
                } else {
                  wrong_count++;
                  total_marks -= question.negative_marks || 0;
                }
                
                answerRecords.push([exam_id, student_id, actualQuestionId, studentAnswer]);
              }
            }
          });

          const not_answered = questions.length - attempted;

          // Save answers to student_answers table
          const saveAnswers = (callback) => {
            if (answerRecords.length > 0) {
              const insertQuery = `INSERT INTO student_answers (exam_id, user_id, question_id, answer) 
                                   VALUES ? ON DUPLICATE KEY UPDATE answer = VALUES(answer)`;
              db.query(insertQuery, [answerRecords], (err) => {
                if (err) {
                  console.error('Failed to save answers:', err);
                }
                callback();
              });
            } else {
              callback();
            }
          };

          // Save result to student_exam_results table
          saveAnswers(() => {
            // First, try to delete any existing result for this exam and student
            db.query(
              'DELETE FROM student_exam_results WHERE exam_id = ? AND user_id = ?',
              [exam_id, student_id],
              (delErr) => {
                
                // Now insert the new result
                db.query(
                  `INSERT INTO student_exam_results 
                   (exam_id, user_id, start_time, end_time, total_marks, correct_count, wrong_count, answered, not_answered, created_at) 
                   VALUES (?, ?, NOW(), NOW(), ?, ?, ?, ?, ?, NOW())`,
                  [exam_id, student_id, total_marks, correct_count, wrong_count, attempted, not_answered],
                  (err, result) => {
                    if (err) {
                      console.error('Failed to save exam result:', err.message);
                    }
                    res.json({ 
                      ok: true, 
                      message: 'Exam submitted successfully', 
                      submission_id: submission_id || null,
                      result: {
                        total_marks,
                        correct_count,
                        wrong_count,
                        answered: attempted,
                        not_answered,
                        total_questions: questions.length
                      }
                    });
                  }
                );
              }
            );
          });
        }
      );
    } else {
      // No answers provided, but still save a zero-result record
      db.query(
        'DELETE FROM student_exam_results WHERE exam_id = ? AND user_id = ?',
        [exam_id, student_id],
        (delErr) => {
          
          db.query(
            `INSERT INTO student_exam_results 
             (exam_id, user_id, start_time, end_time, total_marks, correct_count, wrong_count, answered, not_answered, created_at) 
             VALUES (?, ?, NOW(), NOW(), 0, 0, 0, 0, 0, NOW())`,
            [exam_id, student_id],
            (err, result) => {
              if (err) {
                console.error('Failed to save empty result:', err.message);
              }
              res.json({ ok: true, message: 'Exam submitted successfully', submission_id: submission_id || null });
            }
          );
        }
      );
    }
  });
});

// Demo submission endpoint (for demo exams)
router.post('/myexam/demo/start', (req, res) => {
  const { exam_id, student_id } = req.body;
  res.json({ ok: true, submission_id: `demo-${Date.now()}` });
});

router.post('/myexam/demo/submit', (req, res) => {
  res.json({ ok: true, message: 'Demo submission recorded' });
});


// Get exam result
router.get('/myexam/result', (req, res) => {
  const { exam_id, student_id, submission_id } = req.query;
  if (!exam_id || !student_id) {
    return res.status(400).json({ error: 'exam_id and student_id are required' });
  }

  // First get the exam questions with correct answers
  db.query(
    `SELECT eqm.question_id as id, qa.question_text, qa.option1, qa.option2, qa.option3, qa.option4, 
            qa.answer as correct_answer, eqm.marks, eqm.negative_marks, eqm.order_no
     FROM exam_question_mapping eqm
     JOIN questions_answers qa ON eqm.question_id = qa.id
     WHERE eqm.exam_id = ?
     ORDER BY eqm.order_no ASC`,
    [exam_id],
    (err, questions) => {
      if (err) {
        return res.status(500).json({ error: 'Database query failed', details: err.message });
      }

      if (questions.length === 0) {
        return res.status(404).json({ error: 'No questions found for this exam' });
      }

      // Get student answers
      db.query(
        `SELECT question_id, answer 
         FROM student_answers 
         WHERE exam_id = ? AND user_id = ?`,
        [exam_id, student_id],
        (err, studentAnswers) => {
          if (err) {
            return res.status(500).json({ error: 'Database query failed', details: err.message });
          }

          // Process results and feedback
          let totalQuestions = questions.length;
          let attempted = 0;
          let correct = 0;
          let wrong = 0;
          let notAttempted = 0;
          let totalMarks = 0;
          let positiveMarks = 0;
          let negativeMarks = 0;


          const feedback = questions.map((question, index) => {
            const studentAnswer = studentAnswers.find(sa => sa.question_id == question.id);
            const answerText = studentAnswer ? studentAnswer.answer : null;

            let isCorrect = false;
            let status = 'not_attempted';
            let marksObtained = 0;

            if (answerText && answerText.trim() !== '') {
              attempted++;
              status = 'attempted';
              
              if (answerText === question.correct_answer) {
                isCorrect = true;
                correct++;
                marksObtained = question.marks || 1;
                positiveMarks += marksObtained;
              } else {
                wrong++;
                marksObtained = -(question.negative_marks || 0);
                negativeMarks += Math.abs(marksObtained);
              }
            } else {
              notAttempted++;
            }

            totalMarks += marksObtained;


            // Create options array for display with enhanced details
            const options = [
              { 
                value: question.option1, 
                label: question.option1,
                letter: 'A'
              },
              { 
                value: question.option2, 
                label: question.option2,
                letter: 'B'
              },
              { 
                value: question.option3, 
                label: question.option3,
                letter: 'C'
              },
              { 
                value: question.option4, 
                label: question.option4,
                letter: 'D'
              }
            ].filter(opt => opt.value && opt.value.trim() !== '');

            // Find the correct option letter
            const correctOption = options.find(opt => opt.value === question.correct_answer);
            const correctLetter = correctOption ? correctOption.letter : 'N/A';

            return {
              question_id: question.id,
              question_text: question.question_text,
              option1: question.option1,
              option2: question.option2,
              option3: question.option3,
              option4: question.option4,
              correct_answer: question.correct_answer,
              correct_letter: correctLetter,
              student_answer: answerText,
              is_correct: isCorrect,
              status: status,
              marks_obtained: marksObtained,
              question_number: index + 1,
              total_marks: question.marks || 1,
              negative_marks: question.negative_marks || 0
            };
          });

          const result = {
            total_questions: totalQuestions,
            attempted: attempted,
            correct: correct,
            wrong: wrong,
            not_attempted: notAttempted,
            total_marks: totalMarks,
            positive_marks: positiveMarks,
            negative_marks: Math.abs(negativeMarks),
            percentage: totalQuestions > 0 ? ((correct / totalQuestions) * 100).toFixed(2) : 0
          };

          // Get submission details
          db.query(
            `SELECT submission_id, start_time, end_time, status 
             FROM submissions 
             WHERE exam_id = ? AND student_id = ? AND status = 'submitted'
             ORDER BY submission_id DESC LIMIT 1`,
            [exam_id, student_id],
            (err, submissionResults) => {
              if (err) {
                return res.status(500).json({ error: 'Database query failed', details: err.message });
              }

              const submission = submissionResults[0] || {};

              res.json({
                submission_id: submission.submission_id || null,
                start_time: submission.start_time,
                end_time: submission.end_time,
                status: submission.status || 'submitted',
                result: result,
                feedback: feedback
              });
            }
          );
        }
      );
    }
  );
});

// Update other routes similarly to use safeQuery for consistent error handling.

module.exports = router;
