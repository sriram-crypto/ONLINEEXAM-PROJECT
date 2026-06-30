const express = require('express');
const router = express.Router();
const db = require('../../config/db');

// GET /api/teacher/submissionreport
router.get('/', (req, res) => {
	// Supported query params: schoolname, class, exam_id, student_id, status, start_date, end_date
	const { schoolname, class: className, exam_id, student_id, status, start_date, end_date } = req.query;

	let sql = `
		SELECT s.submission_id, s.exam_id, s.student_id, s.start_time, s.end_time, s.status,
					 e.title AS exam_name, u.name AS student_name, e.schoolname AS exam_school, e.class AS exam_class
		FROM submissions s
		JOIN exams e ON s.exam_id = e.exam_id
		JOIN users u ON s.student_id = u.user_id
	`;

	const where = [];
	const params = [];

	if (schoolname) {
		where.push('e.schoolname = ?');
		params.push(schoolname);
	}
	if (className) {
		where.push('e.class = ?');
		params.push(className);
	}
	if (exam_id) {
		where.push('s.exam_id = ?');
		params.push(Number(exam_id));
	}
	if (student_id) {
		where.push('s.student_id = ?');
		params.push(Number(student_id));
	}
	if (status) {
		where.push('s.status = ?');
		params.push(status);
	}
	if (start_date) {
		where.push('DATE(s.start_time) >= ?');
		params.push(start_date);
	}
	if (end_date) {
		where.push('DATE(s.end_time) <= ?');
		params.push(end_date);
	}

	if (where.length) {
		sql += ' WHERE ' + where.join(' AND ');
	}

	sql += ' ORDER BY s.submission_id DESC';

	db.query(sql, params, (err, results) => {
		if (err) {
			console.error(err);
			return res.status(500).json({ error: 'Database error' });
		}
		res.json({ submissions: results });
	});
});

module.exports = router;
