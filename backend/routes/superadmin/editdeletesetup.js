const express = require('express');
const router = express.Router();
const db = require('../../config/db');

// DELETE /api/superadmin/chapters/:chapter_id
router.delete('/chapters/:chapter_id', (req, res) => {
	const chapterId = req.params.chapter_id;
	const query = 'DELETE FROM chapters WHERE chapter_id = ?';
	db.query(query, [chapterId], (err, result) => {
		if (err) {
			console.error('Error deleting chapter:', err);
			return res.status(500).json({ error: 'Database error' });
		}
		res.json({ success: true });
	});
});

// DELETE /api/superadmin/subjects/:subject_id
router.delete('/subjects/:subject_id', (req, res) => {
	const subjectId = req.params.subject_id;
	// Check if subject has chapters
	const checkChaptersQuery = 'SELECT COUNT(*) AS chapterCount FROM chapters WHERE subject_id = ?';
	db.query(checkChaptersQuery, [subjectId], (err, results) => {
		if (err) {
			console.error('Error checking chapters for subject:', err);
			return res.status(500).json({ error: 'Database error' });
		}
		if (results[0].chapterCount > 0) {
			return res.status(400).json({ error: 'Cannot delete: Subject has chapters.' });
		}
		// No chapters, safe to delete
		const deleteQuery = 'DELETE FROM subjects WHERE subject_id = ?';
		db.query(deleteQuery, [subjectId], (err2) => {
			if (err2) {
				console.error('Error deleting subject:', err2);
				return res.status(500).json({ error: 'Database error' });
			}
			res.json({ success: true });
		});
	});
});

// GET /api/superadmin/subjects/:subject_id/chapters
router.get('/subjects/:subject_id/chapters', (req, res) => {
	const subjectId = req.params.subject_id;
	const query = 'SELECT chapter_id, chapter_name, description, created_at FROM chapters WHERE subject_id = ? ORDER BY chapter_id ASC';
	db.query(query, [subjectId], (err, results) => {
		if (err) {
			console.error('Error fetching chapters for subject:', err);
			return res.status(500).json({ error: 'Database error' });
		}
		res.json(results);
	});
});

// PUT /api/superadmin/subjects/:subject_id
router.put('/subjects/:subject_id', (req, res) => {
	const subjectId = req.params.subject_id;
	let { subject_name } = req.body;
	if (!subject_name) {
		return res.status(400).json({ error: 'Subject name is required' });
	}
	subject_name = subject_name.trim();
	const query = 'UPDATE subjects SET subject_name = ? WHERE subject_id = ?';
	db.query(query, [subject_name, subjectId], (err, result) => {
		if (err) {
			console.error('Error updating subject name:', err);
			return res.status(500).json({ error: 'Database error' });
		}
		res.json({ success: true });
	});
});

// GET /api/superadmin/courses/:course_id/subjects
router.get('/courses/:course_id/subjects', (req, res) => {
	const courseId = req.params.course_id;
	const query = `SELECT s.subject_id, s.subject_name FROM subjects s
		JOIN course_subject_mapping csm ON s.subject_id = csm.subject_id
		WHERE csm.course_id = ? ORDER BY s.subject_id ASC`;
	db.query(query, [courseId], (err, results) => {
		if (err) {
			console.error('Error fetching subjects for course:', err);
			return res.status(500).json({ error: 'Database error' });
		}
		res.json(results);
	});
});

// DELETE /api/superadmin/courses/:course_id
router.delete('/courses/:course_id', (req, res) => {
	const courseId = req.params.course_id;
	// Check if course has any subjects mapped
	const checkQuery = 'SELECT COUNT(*) AS subjectCount FROM course_subject_mapping WHERE course_id = ?';
	db.query(checkQuery, [courseId], (err, results) => {
		if (err) {
			console.error('Error checking course subjects:', err);
			return res.status(500).json({ error: 'Database error' });
		}
		if (results[0].subjectCount > 0) {
			return res.status(400).json({ error: 'Course has subjects mapped. Cannot delete.' });
		}
		// No subjects mapped, safe to delete
		const deleteQuery = 'DELETE FROM courses WHERE course_id = ?';
		db.query(deleteQuery, [courseId], (err2) => {
			if (err2) {
				console.error('Error deleting course:', err2);
				return res.status(500).json({ error: 'Database error' });
			}
			res.json({ success: true });
		});
	});
});


// PUT /api/superadmin/courses/:course_id
router.put('/courses/:course_id', (req, res) => {
	const courseId = req.params.course_id;
	let { course_name } = req.body;
	if (!course_name) {
		return res.status(400).json({ error: 'Course name is required' });
	}
	course_name = course_name.toUpperCase();
	const query = 'UPDATE courses SET course_name = ? WHERE course_id = ?';
	db.query(query, [course_name, courseId], (err, result) => {
		if (err) {
			console.error('Error updating course name:', err);
			return res.status(500).json({ error: 'Database error' });
		}
		res.json({ success: true });
	});
});

// GET /api/superadmin/courses/:category_id
router.get('/courses/:category_id', (req, res) => {
	const categoryId = req.params.category_id;
	const query = 'SELECT course_id, course_name, course_duration FROM courses WHERE category_id = ? ORDER BY course_id ASC';
	db.query(query, [categoryId], (err, results) => {
		if (err) {
			console.error('Error fetching courses:', err);
			return res.status(500).json({ error: 'Database error' });
		}
		res.json(results);
	});
});

// GET /api/superadmin/course-categories
router.get('/course-categories', (req, res) => {
	const query = 'SELECT category_id, category_name FROM course_categories ORDER BY category_id ASC';
	db.query(query, (err, results) => {
		if (err) {
			console.error('Error fetching course categories:', err);
			return res.status(500).json({ error: 'Database error' });
		}
		res.json(results);
	});
});


// PUT /api/superadmin/chapters/:chapter_id
router.put('/chapters/:chapter_id', (req, res) => {
	const chapterId = req.params.chapter_id;
	let { chapter_name } = req.body;
	if (!chapter_name) {
		return res.status(400).json({ error: 'Chapter name is required' });
	}
	chapter_name = chapter_name.trim();
	const query = 'UPDATE chapters SET chapter_name = ? WHERE chapter_id = ?';
	db.query(query, [chapter_name, chapterId], (err, result) => {
		if (err) {
			console.error('Error updating chapter name:', err);
			return res.status(500).json({ error: 'Database error' });
		}
		res.json({ success: true });
	});
});

module.exports = router;
