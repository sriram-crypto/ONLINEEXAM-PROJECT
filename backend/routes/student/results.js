const express = require('express');
const router = express.Router();
const db = require('../../config/db');

// Get all results for a student (final + practice)
router.get('/all', (req, res) => {
  const { student_id } = req.query;
  
  console.log('📊 Fetching results for student_id:', student_id);
  
  if (!student_id) {
    console.log('❌ No student_id provided in request');
    return res.status(400).json({ error: 'Missing student_id' });
  }
  
  // Query with JOIN to get exam details
  db.query(
    `SELECT ser.*, e.title as exam_name, e.exam_date 
     FROM student_exam_results ser 
     LEFT JOIN exams e ON ser.exam_id = e.exam_id 
     WHERE ser.user_id = ? 
     ORDER BY ser.created_at DESC`,
    [student_id],
    (err, examRows) => {
      if (err) {
        console.error('❌ Error fetching exam results:', err.message);
        console.error('SQL Error:', err.sqlMessage || err);
        // Fallback query without JOIN
        db.query(
          `SELECT * FROM student_exam_results WHERE user_id = ? ORDER BY created_at DESC`,
          [student_id],
          (fallbackErr, fallbackRows) => {
            let finalExamRows = [];
            if (fallbackErr) {
              console.error('❌ Fallback query failed:', fallbackErr.message);
            } else {
              console.log('✅ Fallback query successful. Found', (fallbackRows || []).length, 'exam results');
              finalExamRows = fallbackRows || [];
            }
            
            // Continue to practice results
            db.query(
              `SELECT * FROM practice_results WHERE user_id = ? ORDER BY created_at DESC`,
              [student_id],
              (err2, practiceRows) => {
                if (err2) {
                  console.error('❌ Error fetching practice results:', err2.message);
                  return res.status(500).json({ error: 'DB error', details: err2.message });
                }
                console.log('✅ Found', (practiceRows || []).length, 'practice results');
                console.log('📤 Returning:', finalExamRows.length, 'exam results,', (practiceRows || []).length, 'practice results');
                return res.json({ results: finalExamRows, practice: practiceRows || [] });
              }
            );
          }
        );
        return;
      }
      
      // If JOIN query succeeded, continue to get practice results
      console.log('✅ Main query successful. Found', (examRows || []).length, 'exam results');
      db.query(
        `SELECT * FROM practice_results WHERE user_id = ? ORDER BY created_at DESC`,
        [student_id],
        (err2, practiceRows) => {
          if (err2) {
            console.error('❌ Error fetching practice results:', err2.message);
            return res.json({ results: examRows || [], practice: [] });
          }
          console.log('✅ Found', (examRows || []).length, 'exam results,', (practiceRows || []).length, 'practice results');
          console.log('📤 Returning results');
          res.json({ results: examRows || [], practice: practiceRows || [] });
        }
      );
    }
  );
});

module.exports = router;
