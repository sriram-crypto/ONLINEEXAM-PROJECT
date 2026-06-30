const express = require("express");
const router = express.Router();
const db = require("../../config/db");
const multer = require('multer');
const path = require('path');
const fs = require('fs');

// GET /api/admin/questions - list all questions
router.get('/', (req, res) => {
  const sql = `
    SELECT qa.*, s.subject_name, c.course_name, qt.type_name AS type, qt.question_type_id
    FROM questions_answers qa
    LEFT JOIN subjects s ON qa.subject_id = s.subject_id
    LEFT JOIN courses c ON qa.course_id = c.course_id
    LEFT JOIN question_types qt ON qa.question_type_id = qt.question_type_id
    ORDER BY qa.id DESC
  `;
  db.query(sql, (err, results) => {
    if (err) return res.status(500).json({ error: err.message });
    // Ensure both question_type_id and type (type_name) are present for frontend
    const rows = (results || []).map(row => ({
      ...row,
      question_type_id: row.question_type_id || (row.type ? row.question_type_id : null)
    }));
    res.json(rows);
  });
});

// GET /api/admin/questions/:id - get all columns for a specific question
router.get('/:id', (req, res) => {
  const { id } = req.params;
  const sql = `
    SELECT qa.*, s.subject_name, c.course_name, qt.type_name AS type, qt.question_type_id
    FROM questions_answers qa
    LEFT JOIN subjects s ON qa.subject_id = s.subject_id
    LEFT JOIN courses c ON qa.course_id = c.course_id
    LEFT JOIN question_types qt ON qa.question_type_id = qt.question_type_id
    WHERE qa.id = ?
  `;
  db.query(sql, [id], (err, results) => {
    if (err) return res.status(500).json({ error: err.message });
    if (!results || results.length === 0) return res.status(404).json({ error: 'Question not found' });
    // Ensure both question_type_id and type (type_name) are present for frontend
    const row = results[0];
    row.question_type_id = row.question_type_id || row.type ? row.question_type_id : null;
    res.json(row);
  });
});

// Setup Multer for image uploads (same as addQuestion.js)
const uploadsDir = path.join(__dirname, '../../uploads/images');
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
}
const uploadImages = multer({
  storage: multer.diskStorage({
    destination: function (req, file, cb) {
      cb(null, uploadsDir);
    },
    filename: function (req, file, cb) {
      const uniqueName = Date.now() + '-' + Math.round(Math.random() * 1E9) + path.extname(file.originalname);
      cb(null, uniqueName);
    }
  }),
  fileFilter: function (req, file, cb) {
    if (file.mimetype.startsWith('image/')) {
      cb(null, true);
    } else {
      cb(new Error('Only image files are allowed!'), false);
    }
  },
  limits: {
    fileSize: 5 * 1024 * 1024 // 5MB limit
  }
});

// PUT /api/admin/questions/:id - update a question (with image URLs)


router.put(
  '/questions/:id',
  uploadImages.fields([
    { name: 'question_image', maxCount: 1 },
    { name: 'option1_image', maxCount: 1 },
    { name: 'option2_image', maxCount: 1 },
    { name: 'option3_image', maxCount: 1 },
    { name: 'option4_image', maxCount: 1 }
  ]),
  (err, req, res, next) => {
    if (err) {
      console.error('MULTER ERROR:', err);
      return res.status(400).json({ error: 'File upload error', details: err.message });
    }
    next();
  },
  async (req, res) => {
  // Debug: log incoming request
  console.log('--- PUT /questions/:id ---');
  console.log('req.body:', req.body);
  console.log('req.files:', req.files);

  const { id } = req.params;
  // Build update fields dynamically
  const updatableFields = [
    'category_id','course_id','subject_id','chapter_id','level_id','question_type_id','question_text',
    'option1','option2','option3','option4','answer','class','schoolname','question_image',
    'option1_image','option2_image','option3_image','option4_image','answer_image'
  ];

  // Handle uploaded images
  if (req.files) {
    if (req.files.question_image) req.body.question_image = `/uploads/images/${req.files.question_image[0].filename}`;
    if (req.files.option1_image) req.body.option1_image = `/uploads/images/${req.files.option1_image[0].filename}`;
    if (req.files.option2_image) req.body.option2_image = `/uploads/images/${req.files.option2_image[0].filename}`;
    if (req.files.option3_image) req.body.option3_image = `/uploads/images/${req.files.option3_image[0].filename}`;
    if (req.files.option4_image) req.body.option4_image = `/uploads/images/${req.files.option4_image[0].filename}`;
  }

  // Required fields for NOT NULL columns
  const requiredFields = ['course_id', 'subject_id', 'level_id', 'question_type_id'];
  // Fetch current values for required fields if not present in request
  db.query('SELECT ?? FROM questions_answers WHERE id = ?', [requiredFields, id], (err, results) => {
    if (err) return res.status(500).json({ error: err.message });
    if (!results || results.length === 0) return res.status(404).json({ error: 'Question not found' });
    const current = results[0];
    // Defensive: abort if any required field is null in DB
    for (const field of requiredFields) {
      if (current[field] === null || current[field] === undefined) {
        return res.status(400).json({
          success: false,
          error: `Cannot update: ${field} is null in the database for this question. Please fix the data first.`
        });
      }
    }
    // Build SET clause and params, using request value if present, else current value from DB for required fields
    const setClauses = [];
    const params = [];
    for (const field of updatableFields) {
      let value = req.body[field];
      // If value is an array (from FormData), use the first element
      if (Array.isArray(value)) value = value[0];
      // For required fields, use DB value if request value is empty/invalid
      if (requiredFields.includes(field)) {
        if (
          value === undefined ||
          value === null ||
          value === '' ||
          value === 'null' ||
          value === 'undefined' ||
          (Array.isArray(value) && (value[0] === undefined || value[0] === null || value[0] === '' || value[0] === 'null' || value[0] === 'undefined'))
        ) {
          setClauses.push(`${field} = ?`);
          params.push(current[field]);
        } else {
          setClauses.push(`${field} = ?`);
          params.push(value);
        }
      } else {
        if (
          Object.prototype.hasOwnProperty.call(req.body, field) &&
          value !== undefined &&
          value !== null &&
          value !== '' &&
          value !== 'null' &&
          value !== 'undefined'
        ) {
          setClauses.push(`${field} = ?`);
          params.push(value);
        }
      }
    }
    if (setClauses.length === 0) {
      return res.status(400).json({ success: false, error: 'No valid fields to update.' });
    }
    const sql = `UPDATE questions_answers SET ${setClauses.join(', ')} WHERE id = ?`;
    params.push(id);
    console.log('SQL:', sql);
    console.log('Params:', params);
    db.query(sql, params, (err2, result) => {
      if (err2) {
        console.error('SQL ERROR:', err2);
        return res.status(500).json({ error: err2.message, received: req.body });
      }
      res.json({ success: true, received: req.body });
    });
  });
});

module.exports = router;