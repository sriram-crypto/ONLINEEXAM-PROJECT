const express = require("express");
const router = express.Router();
const db = require("../../config/db");
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const XLSX = require('xlsx');

// Create uploads directory if it doesn't exist
const uploadsDir = path.join(__dirname, '../../uploads/images');
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
}

// Configure multer storage
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    if (file.fieldname === 'file') {
      // Excel files go to temp directory
      const tempDir = path.join(__dirname, '../../temp');
      if (!fs.existsSync(tempDir)) {
        fs.mkdirSync(tempDir, { recursive: true });
      }
      cb(null, tempDir);
    } else {
      // Image files go to uploads/images directory
      cb(null, uploadsDir);
    }
  },
  filename: function (req, file, cb) {
    // Generate unique filename with timestamp
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, file.fieldname + '-' + uniqueSuffix + path.extname(file.originalname));
  }
});

// Updated file filter to handle both Excel and image files
const fileFilter = (req, file, cb) => {
  console.log('File filter - fieldname:', file.fieldname, 'mimetype:', file.mimetype, 'originalname:', file.originalname);
  
  if (file.fieldname === 'file') {
    // For Excel file uploads - check for Excel MIME types
    const excelMimeTypes = [
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', // .xlsx
      'application/vnd.ms-excel', // .xls
      'application/vnd.ms-excel.sheet.macroEnabled.12', // .xlsm
      'text/csv' // .csv (optional)
    ];
    
    const fileExtension = path.extname(file.originalname).toLowerCase();
    const allowedExtensions = ['.xlsx', '.xls', '.xlsm', '.csv'];
    
    if (excelMimeTypes.includes(file.mimetype) || allowedExtensions.includes(fileExtension)) {
      cb(null, true);
    } else {
      cb(new Error('Only Excel files (.xlsx, .xls) are allowed for question upload!'), false);
    }
  } else if (file.fieldname === 'image' || file.fieldname.includes('image')) {
    // For image uploads - check for image MIME types
    if (file.mimetype.startsWith('image/')) {
      cb(null, true);
    } else {
      cb(new Error('Only image files are allowed for image upload!'), false);
    }
  } else {
    // For any other fieldname, allow both Excel and images
    const isExcel = file.mimetype.includes('spreadsheet') || file.mimetype.includes('excel') || 
                   ['.xlsx', '.xls', '.xlsm'].includes(path.extname(file.originalname).toLowerCase());
    const isImage = file.mimetype.startsWith('image/');
    
    if (isExcel || isImage) {
      cb(null, true);
    } else {
      cb(new Error('Only Excel and image files are allowed!'), false);
    }
  }
};

// Configure multer with updated settings
const upload = multer({ 
  storage: storage,
  fileFilter: fileFilter,
  limits: {
    fileSize: 10 * 1024 * 1024 // 10MB limit (increased for Excel files)
  }
});

// Configure multer for image uploads only
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

// GET /api/teacher/addquestion/chapters - get chapters for a subject (for dropdown)
router.get('/chapters', (req, res) => {
  const { subject_id } = req.query;
  if (!subject_id) {
    return res.status(400).json({ success: false, error: 'subject_id is required' });
  }
  db.query('SELECT chapter_id, chapter_name, description FROM chapters WHERE subject_id = ? ORDER BY chapter_name', [subject_id], (err, results) => {
    if (err) return res.status(500).json({ success: false, error: err.message });
    res.json({ success: true, chapters: results });
  });
});

// GET /api/teacher/addquestion/clear-all-questions - clear all questions from the database
router.get('/clear-all-questions', async (req, res) => {
  try {
    await new Promise((resolve, reject) => {
      db.query('DELETE FROM questions_answers', (err, result) => {
        if (err) reject(err);
        else resolve(result);
      });
    });
    res.json({ success: true, message: 'All questions cleared from the database.' });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// GET /api/admin/subjects-all - get all subjects for dropdown
router.get('/subjects-all', (req, res) => {
  db.query('SELECT subject_id, subject_name FROM subjects ORDER BY subject_name', (err, results) => {
    if (err) return res.status(500).json({ error: err.message });
    res.json(results);
  });
});

// GET /api/admin/courses-all - get all courses for dropdown
router.get('/courses-all', (req, res) => {
  db.query('SELECT course_id, course_name FROM courses ORDER BY course_name', (err, results) => {
    if (err) return res.status(500).json({ error: err.message });
    res.json(results);
  });
});

// GET /api/admin/questions - list all questions
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

// DELETE /api/admin/questions/:id - delete a question
router.delete('/questions/:id', (req, res) => {
  const { id } = req.params;
  db.query('DELETE FROM questions_answers WHERE id = ?', [id], (err, result) => {
    if (err) return res.status(500).json({ error: err.message });
    res.json({ success: true });
  });
});

// PUT /api/admin/questions/:id - update a question
router.put('/questions/:id', (req, res) => {
  const { id } = req.params;
  const { course_id, subject_id, level_id, type, question_text, option1, option2, option3, option4, answer, class: classNum, schoolname } = req.body;
  db.query(
    `UPDATE questions_answers SET course_id=?, subject_id=?, level_id=?, question_type_id=?, question_text=?, option1=?, option2=?, option3=?, option4=?, answer=?, class=?, schoolname=? WHERE id=?`,
    [course_id, subject_id, level_id, type, question_text, option1, option2, option3, option4, answer, classNum, schoolname, id],
    (err, result) => {
      if (err) return res.status(500).json({ error: err.message });
      res.json({ success: true });
    }
  );
});
// POST /api/teacher/addquestion/upload-image - Upload single image
router.post('/upload-image', uploadImages.single('image'), (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ success: false, error: 'No image file provided' });
    }
    
    const imageUrl = `/uploads/images/${req.file.filename}`;
    res.json({ 
      success: true, 
      imageUrl: imageUrl,
      filename: req.file.filename,
      originalName: req.file.originalname
    });
  } catch (error) {
    console.error('Image upload error:', error);
    res.status(500).json({ success: false, error: 'Image upload failed' });
  }
});

// POST /api/teacher/addquestion/upload-multiple-images - Upload multiple images
router.post('/upload-multiple-images', uploadImages.fields([
  { name: 'question_image', maxCount: 1 },
  { name: 'option1_image', maxCount: 1 },
  { name: 'option2_image', maxCount: 1 },
  { name: 'option3_image', maxCount: 1 },
  { name: 'option4_image', maxCount: 1 }
]), (req, res) => {
  try {
    const uploadedImages = {};
    
    for (const fieldName in req.files) {
      if (req.files[fieldName] && req.files[fieldName][0]) {
        const file = req.files[fieldName][0];
        uploadedImages[fieldName] = `/uploads/images/${file.filename}`;
      }
    }
    
    res.json({ 
      success: true, 
      images: uploadedImages
    });
  } catch (error) {
    console.error('Multiple image upload error:', error);
    res.status(500).json({ success: false, error: 'Image upload failed' });
  }
});

// GET /api/teacher/addquestion/list-images - List available images
router.get('/list-images', (req, res) => {
  try {
    const imagesDir = path.join(__dirname, '../../uploads/images');
    if (!fs.existsSync(imagesDir)) {
      return res.json({ success: true, images: [] });
    }
    
    const files = fs.readdirSync(imagesDir);
    const imageFiles = files.filter(file => {
      const ext = path.extname(file).toLowerCase();
      return ['.jpg', '.jpeg', '.png', '.gif', '.svg', '.webp'].includes(ext);
    });
    
    const images = imageFiles.map(file => ({
      filename: file,
      url: `/uploads/images/${file}`
    }));
    
    res.json({ success: true, images });
  } catch (error) {
    console.error('List images error:', error);
    res.status(500).json({ success: false, error: 'Failed to list images' });
  }
});

// GET /api/teacher/addquestion/question-types
router.get('/question-types', (req, res) => {
  console.log('GET /question-types called');
  db.query('SELECT question_type_id, type_name FROM question_types ORDER BY question_type_id', (err, results) => {
    if (err) {
      console.error('DB error in /question-types:', err);
      return res.status(500).json({ error: err.message });
    }
    console.log('Question types results:', results);
    res.json(results);
  });
});
// GET /api/admin/difficulty-levels
router.get('/difficulty-levels', (req, res) => {
  db.query('SELECT level_id, level_name FROM difficulty_levels ORDER BY level_id', (err, results) => {
    if (err) {
      console.error('DB error in /difficulty-levels:', err);
      return res.status(500).json({ error: err.message });
    }
    res.json(results);
  });
});
// GET /api/admin/subjects?course_id=1
router.get('/subjects', (req, res) => {
  const { course_id } = req.query;
  if (!course_id) return res.status(400).json({ error: 'course_id is required' });
  const sql = `
    SELECT s.subject_id, s.subject_name
    FROM subjects s
    JOIN course_subject_mapping csm ON s.subject_id = csm.subject_id
    WHERE csm.course_id = ?
    ORDER BY s.subject_name
  `;
  db.query(sql, [course_id], (err, results) => {
    if (err) {
      console.error('DB error in /subjects:', err);
      return res.status(500).json({ error: err.message });
    }
    res.json(results);
  });
});
// GET /api/admin/courses?category_id=1
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
// Get all course categories for dropdown
router.get("/course-categories", (req, res) => {
  console.log('GET /course-categories called');
  db.query("SELECT category_id, category_name FROM course_categories ORDER BY category_name", (err, results) => {
    if (err) {
      console.error('Database error in course-categories:', err);
      return res.status(500).json({ error: err.message });
    }
    console.log('Course categories results:', results);
    res.json(results);
  });
});
// Get all unique roles for dropdown filter
router.get("/activate-or-deactivate/roles", (req, res) => {
  db.query("SELECT DISTINCT role FROM users", (err, results) => {
    if (err) return res.status(500).json({ error: err.message });
    const roles = results.map(r => r.role);
    res.json(roles);
  });
});
console.log("Loaded activateOrDeactivateUsers routes");

// Get all users (optionally filter by role/status)
router.get("/activate-or-deactivate/users", (req, res) => {
  const { role, status } = req.query;
  let sql = "SELECT user_id, name, email, role, is_active, created_at FROM users WHERE 1=1";
  const params = [];
  if (role) {
    sql += " AND role = ?";
    params.push(role);
  }
  if (status) {
    sql += " AND is_active = ?";
    params.push(status === "active" ? 1 : 0);
  }
  db.query(sql, params, (err, results) => {
    if (err) return res.status(500).json({ error: err.message });
    // Map is_active to 'active'/'inactive' for frontend
    const users = results.map(u => ({
      id: u.user_id,
      name: u.name,
      email: u.email,
      role: u.role,
      status: u.is_active ? "active" : "inactive",
      created_at: u.created_at
    }));
    res.json(users);
  });
});

// Activate or deactivate a user
router.post("/activate-or-deactivate/user/:id/status", (req, res) => {
  const { id } = req.params;
  const { status } = req.body;
  const isActive = status === "active" ? 1 : 0;
  db.query(
    "UPDATE users SET is_active = ? WHERE user_id = ?",
    [isActive, id],
    (err, result) => {
      if (err) return res.status(500).json({ error: err.message });
      res.json({ success: true });
    }
  );
});


// Edit user details
router.post("/activate-or-deactivate/user/:id/edit", (req, res) => {
  const { id } = req.params;
  const { name, email, role, status } = req.body;
  const isActive = status === "active" ? 1 : 0;
  console.log('Edit user:', { id, name, email, role, status });
  db.query(
    "UPDATE users SET name = ?, email = ?, role = ?, is_active = ? WHERE user_id = ?",
    [name, email, role, isActive, id],
    (err, result) => {
      if (err) return res.status(500).json({ error: err.message });
      // Return the updated user for confirmation
      db.query("SELECT user_id, name, email, role, is_active FROM users WHERE user_id = ?", [id], (err2, rows) => {
        if (err2) return res.status(500).json({ error: err2.message });
        if (rows.length === 0) return res.status(404).json({ error: 'User not found' });
        const u = rows[0];
        res.json({
          success: true,
          user: {
            id: u.user_id,
            name: u.name,
            email: u.email,
            role: u.role,
            status: u.is_active ? "active" : "inactive"
          }
        });
      });
    }
  );
});




// POST /api/teacher/addquestion/setup-question-types - setup all question types
router.post('/setup-question-types', (req, res) => {
  console.log('Setting up question types...');
  
  const questionTypes = [
    [1, 'MCQ', 'Multiple Choice Questions – one correct answer'],
    [2, 'MSQ', 'Multiple Select Questions – multiple correct answers'],
    [3, 'True/False', 'Binary choice question with True or False'],
    [4, 'Integer', 'Requires an integer-based answer'],
    [5, 'Fill in the Blanks', 'Blank(s) to be filled with the correct word or value'],
    [6, 'Matching', 'Match columns A and B'],
    [7, 'Matrix Matching', 'Multiple combinations in matrix format'],
    [8, 'Assertion Reason', 'Assertion and Reason-based question type'],
    [9, 'Passage Based', 'Questions based on a given passage or case study'],
    [10, 'Image-Based', 'Question includes an image to interpret']
  ];

  // First, clear existing question types
  db.query('DELETE FROM question_types', (err) => {
    if (err) {
      console.error('Error clearing question types:', err);
      return res.status(500).json({ success: false, error: err.message });
    }

    // Insert new question types
    const sql = 'INSERT INTO question_types (question_type_id, type_name, description) VALUES ?';
    db.query(sql, [questionTypes], (err, result) => {
      if (err) {
        console.error('Error inserting question types:', err);
        return res.status(500).json({ success: false, error: err.message });
      }
      
      console.log(`Successfully inserted ${result.affectedRows} question types`);
      res.json({ 
        success: true, 
        message: `Successfully added ${result.affectedRows} question types`,
        questionTypes: questionTypes.map(qt => ({ id: qt[0], name: qt[1], description: qt[2] }))
      });
    });
  });
});

// POST /api/teacher/addquestion/add-question - add a single question with images
router.post('/add-question', uploadImages.fields([
  { name: 'question_image', maxCount: 1 },
  { name: 'option1_image', maxCount: 1 },
  { name: 'option2_image', maxCount: 1 },
  { name: 'option3_image', maxCount: 1 },
  { name: 'option4_image', maxCount: 1 }
]), async (req, res) => {
  const { category, course, subject, level_id, type, question_text, option1, option2, option3, option4, answer } = req.body;
  
  // Validation
  if (!course || !subject || !level_id || !type || !question_text || !answer) {
    return res.status(400).json({ 
      success: false, 
      error: 'Missing required fields: course, subject, level_id, type, question_text, answer' 
    });
  }

  try {
    // Look up question_type_id from question_types table
    const questionTypeResult = await new Promise((resolve, reject) => {
      db.query('SELECT question_type_id FROM question_types WHERE LOWER(type_name) = LOWER(?)', [type.trim()], (err, results) => {
        if (err) reject(err);
        else resolve(results);
      });
    });
    
    if (questionTypeResult.length === 0) {
      return res.status(400).json({ 
        success: false, 
        error: `Question type '${type}' not found in question_types table` 
      });
    }
    
    const questionTypeId = questionTypeResult[0].question_type_id;

    // Handle uploaded images
    let questionImage = null, option1Image = null, option2Image = null, option3Image = null, option4Image = null;
    
    if (req.files) {
      if (req.files.question_image) questionImage = `/uploads/images/${req.files.question_image[0].filename}`;
      if (req.files.option1_image) option1Image = `/uploads/images/${req.files.option1_image[0].filename}`;
      if (req.files.option2_image) option2Image = `/uploads/images/${req.files.option2_image[0].filename}`;
      if (req.files.option3_image) option3Image = `/uploads/images/${req.files.option3_image[0].filename}`;
      if (req.files.option4_image) option4Image = `/uploads/images/${req.files.option4_image[0].filename}`;
    }

    const now = new Date();
    const sql = `INSERT INTO questions_answers 
      (category_id, course_id, subject_id, chapter_id, level_id, question_type_id, question_text, option1, option2, option3, option4, answer, class, schoolname, question_image, option1_image, option2_image, option3_image, option4_image, answer_image, created_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`;
      
    db.query(sql, [
      category || null,
      course,
      subject,
      chapter || null,
      level_id,
      questionTypeId,
      question_text,
      option1 || null,
      option2 || null,
      option3 || null,
      option4 || null,
      answer,
      classNum || null,
      schoolname || null,
      questionImage,
      option1Image,
      option2Image,
      option3Image,
      option4Image,
      answerImage,
      now
    ], (err, result) => {
      if (err) {
        console.error('DB error in /add-question:', err);
        return res.status(500).json({ success: false, error: err.message });
      }
      res.json({ 
        success: true, 
        message: 'Question added successfully', 
        id: result.insertId,
        images: {
          question_image: questionImage,
          option1_image: option1Image,
          option2_image: option2Image,
          option3_image: option3Image,
          option4_image: option4Image
        }
      });
    });
  } catch (error) {
    console.error('Error in /add-question:', error);
    return res.status(500).json({ success: false, error: error.message });
  }
});

// POST /api/teacher/addquestion/add-question-json - add a single question with JSON data (including image paths)
router.post('/add-question-json', async (req, res) => {
  const { 
    category, course, subject, level_id, type, question_text, 
    option1, option2, option3, option4, answer,
    question_image, option1_image, option2_image, option3_image, option4_image
  } = req.body;
  
  console.log('Adding question with JSON data:', req.body);
  console.log('Question type:', type);
  console.log('Image files received:', { question_image, option1_image, option2_image, option3_image, option4_image });
  
  // Validation
  if (!course || !subject || !level_id || !type || !question_text || !answer) {
    return res.status(400).json({ 
      success: false, 
      error: 'Missing required fields: course, subject, level_id, type, question_text, answer' 
    });
  }

  try {
    // Look up question_type_id from question_types table
    const questionTypeResult = await new Promise((resolve, reject) => {
      db.query('SELECT question_type_id FROM question_types WHERE LOWER(type_name) = LOWER(?)', [type.trim()], (err, results) => {
        if (err) reject(err);
        else resolve(results);
      });
    });
    
    if (questionTypeResult.length === 0) {
      return res.status(400).json({ 
        success: false, 
        error: `Question type '${type}' not found in question_types table` 
      });
    }
    
    const questionTypeId = questionTypeResult[0].question_type_id;

    const now = new Date();
    
    // Build image paths for database (add /uploads/images/ prefix if not already present)
    const buildImagePath = (imagePath) => {
      if (!imagePath) return null;
      if (imagePath.startsWith('/uploads/images/')) return imagePath;
      return `/uploads/images/${imagePath}`;
    };
    
    const questionImagePath = buildImagePath(question_image);
    const option1ImagePath = buildImagePath(option1_image);
    const option2ImagePath = buildImagePath(option2_image);
    const option3ImagePath = buildImagePath(option3_image);
    const option4ImagePath = buildImagePath(option4_image);
    
    const sql = `INSERT INTO questions_answers 
      (category_id, course_id, subject_id, chapter_id, level_id, question_type_id, question_text, option1, option2, option3, option4, answer, class, schoolname, question_image, option1_image, option2_image, option3_image, option4_image, answer_image, created_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`;
      
    db.query(sql, [
      category || null,
      course,
      subject,
      chapter || null,
      level_id,
      questionTypeId,
      question_text,
      option1 || null,
      option2 || null,
      option3 || null,
      option4 || null,
      answer,
      classNum || null,
      req.body.schoolname || null,
      questionImagePath,
      option1ImagePath,
      option2ImagePath,
      option3ImagePath,
      option4ImagePath,
      answerImagePath,
      now
    ], (err, result) => {
      if (err) {
        console.error('DB error in /add-question-json:', err);
        return res.status(500).json({ success: false, error: err.message });
      }
      console.log('Question saved successfully with ID:', result.insertId);
      console.log('Saved image paths:', {
        question_image: questionImagePath,
        option1_image: option1ImagePath,
        option2_image: option2ImagePath,
        option3_image: option3ImagePath,
        option4_image: option4ImagePath
      });
      
      res.json({ 
        success: true, 
        message: 'Question added successfully', 
        id: result.insertId,
        type: type,
        images: {
          question_image: questionImagePath,
          option1_image: option1ImagePath,
          option2_image: option2ImagePath,
          option3_image: option3ImagePath,
          option4_image: option4ImagePath
        }
      });
    });
  } catch (error) {
    console.error('Error in /add-question-json:', error);
    return res.status(500).json({ success: false, error: error.message });
  }
});

// POST /api/teacher/addquestion/upload-questions - SINGLE ENDPOINT FOR BOTH EXCEL AND FORM DATA
router.post('/upload-questions', upload.single('file'), async (req, res) => {
  try {
    console.log('=== UPLOAD QUESTIONS ENDPOINT ===');
    console.log('Request body:', req.body);
    console.log('File:', req.file);

    // If there's a file, it's Excel upload
    if (req.file) {
      console.log('Processing Excel file upload...');
      
      const { category_id, course_id, subject_id, chapter_id, level_id } = req.body;

      // Validate required fields for Excel upload (no type required)
      if (!category_id || !course_id || !subject_id || !level_id) {
        console.log('Missing required fields for Excel upload:', { category_id, course_id, subject_id, level_id });
        return res.status(400).json({ success: false, error: 'Please provide all mandatory fields for Excel upload.' });
      }

      // Use a default question_type_id (e.g., MCQ) if not provided
      let question_type_id = 1; // Default to MCQ, or fetch the first available type
      try {
        const typeResult = await new Promise((resolve, reject) => {
          db.query('SELECT question_type_id FROM question_types ORDER BY question_type_id LIMIT 1', (err, results) => {
            if (err) reject(err);
            else resolve(results);
          });
        });
        if (typeResult.length > 0) {
          question_type_id = typeResult[0].question_type_id;
        }
      } catch (err) {
        // If DB fails, keep default
      }

      // Process Excel file
      const workbook = XLSX.readFile(req.file.path);
      const sheetName = workbook.SheetNames[0];
      const worksheet = workbook.Sheets[sheetName];
      const rows = XLSX.utils.sheet_to_json(worksheet);

      console.log('Excel rows processed:', rows.length);

      if (rows.length === 0) {
        return res.status(400).json({ success: false, error: 'No valid questions found in the Excel file.' });
      }

      const validRows = [];
      const failedRows = [];

      for (let i = 0; i < rows.length; i++) {
        const row = rows[i];
        
        // Check required fields
        if (!row['question_text'] || !row['answer']) {
          failedRows.push(`Question ${i + 1}: Missing question text or answer`);
          continue;
        }

        // For MCQ/MSQ, check if at least 2 options are provided
        if ((!row['option1'] || !row['option2'])) {
          failedRows.push(`Question ${i + 1}: Questions must have at least 2 options`);
          continue;
        }

        // Prepare question data
        const questionData = {
          category_id: parseInt(category_id),
          course_id: parseInt(course_id),
          subject_id: parseInt(subject_id),
          chapter_id: chapter_id ? parseInt(chapter_id) : null,
          level_id: parseInt(level_id),
          question_type_id: question_type_id,
          question_text: row['question_text'] || '',
          option1: row['option1'] || null,
          option2: row['option2'] || null,
          option3: row['option3'] || null,
          option4: row['option4'] || null,
          answer: row['answer'] || '',
          class: row['class'] || null,
          schoolname: row['schoolname'] || ''
        };

        validRows.push(questionData);
      }

      console.log('Valid rows found:', validRows.length);

      if (validRows.length === 0) {
        return res.status(400).json({ 
          success: false, 
          error: 'No valid questions found.',
          failures: failedRows
        });
      }

      // Insert valid questions into database
      const insertedQuestions = [];
      
      for (const questionData of validRows) {
        try {
          const sql = `
            INSERT INTO questions_answers (
              category_id, course_id, subject_id, chapter_id, level_id, question_type_id, question_text, option1, option2, option3, option4, answer, class, schoolname, question_image, option1_image, option2_image, option3_image, option4_image, answer_image, created_at
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NOW())
          `;
          const insertQuestion = (data) => {
            return new Promise((resolve, reject) => {
              db.query(sql, [
                data.category_id,
                data.course_id,
                data.subject_id,
                data.chapter_id,
                data.level_id,
                data.question_type_id,
                data.question_text,
                data.option1,
                data.option2,
                data.option3,
                data.option4,
                data.answer,
                data.classNum,
                data.schoolname,
                data.question_image,
                data.option1_image,
                data.option2_image,
                data.option3_image,
                data.option4_image,
                data.answer_image
              ], (err, result) => {
                if (err) reject(err);
                else resolve(result);
              });
            });
          };

          const result = await insertQuestion(questionData);
          insertedQuestions.push({
            id: result.insertId,
            question_text: questionData.question_text
          });
        } catch (error) {
          console.error('Database insertion error:', error);
          failedRows.push(`Question: ${questionData.question_text} - ${error.message}`);
        }
      }

      // Clean up uploaded Excel file
      fs.unlinkSync(req.file.path);

      if (failedRows.length > 0) {
        res.status(207).json({
          success: false,
          error: `Some questions failed to upload: ${failedRows.join(', ')}`,
          inserted: insertedQuestions.length,
          failed: failedRows.length
        });
      } else {
        res.json({
          success: true,
          message: `${insertedQuestions.length} questions uploaded successfully!`,
          inserted: insertedQuestions
        });
      }

    } else {
      // No file - this is form data submission (not implemented yet)
      console.log('No file provided - treating as form data submission');
      return res.status(400).json({ 
        success: false, 
        error: 'Please select an Excel file to upload questions.' 
      });
    }

  } catch (error) {
    console.error('Upload questions error:', error);
    res.status(500).json({ success: false, error: 'Error uploading questions: ' + error.message });
  }
});

// POST /api/teacher/addquestion/upload-image - upload single image
router.post('/upload-image', uploadImages.single('image'), (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ success: false, error: 'No image file provided' });
    }

    const imageUrl = `/uploads/images/${req.file.filename}`;
    
    res.json({
      success: true,
      message: 'Image uploaded successfully',
      imageUrl: imageUrl,
      filename: req.file.filename
    });
  } catch (error) {
    console.error('Image upload error:', error);
    res.status(500).json({ success: false, error: 'Failed to upload image' });
  }
});

// GET /api/teacher/addquestion/download-format
router.get('/download-format', (req, res) => {
  console.log('Download format endpoint called with query:', req.query);
  
  try {
    const { type } = req.query;
    
    let headers;
    let sampleData;

    if (type === 'comprehensive') {
      headers = [
        'Category', 'Course', 'Subject', 'Chapter', 'Level', 'Question Type',
        'Question Text', 'Question Image', 'Option 1', 'Option 1 Image', 
        'Option 2', 'Option 2 Image', 'Option 3', 'Option 3 Image', 
        'Option 4', 'Option 4 Image',
        'Answer', 'Answer Image',
        'Answer 1', 'Answer 1 Image', 'Answer 2', 'Answer 2 Image', 'Answer 3', 'Answer 3 Image', 'Answer 4', 'Answer 4 Image',
        'Class', 'School Name'
      ];
      sampleData = [];
    } else {
      headers = [
        'question_text',
        'option1',
        'option2',
        'option3',
        'option4',
        'answer',
        'class',
        'schoolname'
      ];
      sampleData = [];
    }

    const worksheet = XLSX.utils.aoa_to_sheet([headers, ...sampleData]);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Questions');

    const buffer = XLSX.write(workbook, { bookType: 'xlsx', type: 'buffer' });

    const filename = type === 'comprehensive' 
      ? 'Comprehensive_Question_Format.xlsx' 
      : 'Question_Format.xlsx';

    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.send(buffer);

    console.log('Download format file sent successfully');

  } catch (error) {
    console.error('Download format error:', error);
    res.status(500).json({ success: false, error: 'Error generating format file' });
  }
});

// POST /api/teacher/addquestion/add-manual-question - Add a single question manually
router.post('/add-manual-question', async (req, res) => {
  try {
    console.log('=== ADD MANUAL QUESTION ENDPOINT ===');
    console.log('Request body:', req.body);

    const {
      category_id, course_id, subject_id, chapter_id, level_id, question_type_id,
      question_text, question_image, option1, option1_image, option2, option2_image,
      option3, option3_image, option4, option4_image, answer, answer_image,
      class: classNum, schoolname
    } = req.body;

    // Validate required fields and ensure they are valid numbers
    const requiredFields = [category_id, course_id, subject_id, level_id, question_type_id];
    if (requiredFields.some(f => f === undefined || f === null || f === '' || isNaN(parseInt(f))) || (!question_text && !question_image)) {
      return res.status(400).json({ 
        success: false, 
        error: 'Please provide all required fields: category_id, course_id, subject_id, level_id, question_type_id, and either question_text or question_image' 
      });
    }

    // Get question type to validate options requirement
    const getQuestionType = () => {
      return new Promise((resolve, reject) => {
        db.query('SELECT type_name FROM question_types WHERE question_type_id = ?', [question_type_id], (err, results) => {
          if (err) reject(err);
          else resolve(results);
        });
      });
    };

    const typeResult = await getQuestionType();
    if (typeResult.length === 0) {
      return res.status(400).json({ success: false, error: 'Invalid question type' });
    }

    const questionTypeName = typeResult[0].type_name;

    // For MCQ/MSQ, validate that at least 2 options and answer are provided
   /*  if ((questionTypeName === 'MCQ' || questionTypeName === 'MSQ') && 
        (!option1 || !option2 || !answer)) {
      return res.status(400).json({ 
        success: false, 
        error: 'MCQ/MSQ questions must have at least 2 options and an answer' 
      }); 
    }*/

    // Insert question into database
    const sql = `
      INSERT INTO questions_answers (
        category_id, course_id, subject_id, chapter_id, level_id, 
        question_type_id, question_text, option1, option2, option3, option4, 
        answer, class, schoolname, question_image, option1_image, option2_image, option3_image, option4_image, answer_image, created_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NOW())
    `;

    const insertQuestion = (data) => {
      return new Promise((resolve, reject) => {
        db.query(sql, [
          data.category_id, data.course_id, data.subject_id,
          data.chapter_id, data.level_id, data.question_type_id,
          data.question_text, data.option1, data.option2,
          data.option3, data.option4, data.answer,
          data.class, data.schoolname, data.question_image,
          data.option1_image, data.option2_image,
          data.option3_image, data.option4_image, data.answer_image
        ], (err, result) => {
          if (err) reject(err);
          else resolve(result);
        });
      });
    };

    const questionData = {
      category_id: parseInt(category_id),
      course_id: parseInt(course_id),
      subject_id: parseInt(subject_id),
      chapter_id: chapter_id ? parseInt(chapter_id) : null,
      level_id: parseInt(level_id),
      question_type_id: parseInt(question_type_id),
      question_text: question_text,
      option1: option1 || null,
      option2: option2 || null,
      option3: option3 || null,
      option4: option4 || null,
      answer: answer,
      class: classNum || null,
      schoolname: schoolname || '',
      question_image: question_image || null,
      option1_image: option1_image || null,
      option2_image: option2_image || null,
      option3_image: option3_image || null,
      option4_image: option4_image || null,
      answer_image: answer_image || null
    };

    const result = await insertQuestion(questionData);

    console.log('Manual question inserted with ID:', result.insertId);

    res.json({
      success: true,
      message: 'Question added successfully!',
      question_id: result.insertId
    });

  } catch (error) {
    console.error('Add manual question error:', error);
    res.status(500).json({ 
      success: false, 
      error: 'Error adding question: ' + error.message 
    });
  }
});

module.exports = router;