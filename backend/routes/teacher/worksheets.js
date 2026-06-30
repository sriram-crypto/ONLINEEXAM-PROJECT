const express = require("express");
const router = express.Router();
const db = require("../../config/db");

// Categories (course_categories)
router.get("/categories", (_req, res) => {
	db.query(
		"SELECT category_id, category_name FROM course_categories ORDER BY category_name",
		(err, results = []) => (err ? res.status(500).json({ error: err.message }) : res.json(results))
	);
});

// Courses
router.get("/courses", (req, res) => {
	const { category_id } = req.query;
	if (!category_id) return res.status(400).json({ error: "category_id is required" });
	db.query(
		"SELECT course_id, course_name FROM courses WHERE category_id = ? ORDER BY course_name",
		[Number(category_id)],
		(err, results = []) => (err ? res.status(500).json({ error: err.message }) : res.json(results))
	);
});

// Subjects
router.get("/subjects", (req, res) => {
	const { course_id } = req.query;
	if (!course_id) return res.status(400).json({ error: "course_id is required" });
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

// Chapters
router.get("/chapters", (req, res) => {
	const { subject_id } = req.query;
	if (!subject_id) return res.status(400).json({ error: "subject_id is required" });
	db.query(
		"SELECT chapter_id, chapter_name FROM chapters WHERE subject_id = ? ORDER BY chapter_name",
		[Number(subject_id)],
		(err, results = []) => (err ? res.status(500).json({ error: err.message }) : res.json(results))
	);
});

// Levels
router.get("/levels", (_req, res) => {
	db.query(
		"SELECT level_id, level_name FROM difficulty_levels ORDER BY level_id",
		(err, results = []) => (err ? res.status(500).json({ error: err.message }) : res.json(results))
	);
});

// Get all school names (distinct)
router.get("/schoolnames", (req, res) => {
	db.query(
		"SELECT DISTINCT schoolname FROM students WHERE schoolname IS NOT NULL AND schoolname != '' ORDER BY schoolname",
		(err, results) => {
			if (err) return res.status(500).json({ error: err.message });
			res.json(results.map(r => r.schoolname));
		}
	);
});

// Worksheet questions (questions_answers)
router.get("/questions", (req, res) => {
	const { course_id, subject_id, level_id, chapter_id } = req.query;
	if (!course_id || !subject_id || !level_id) return res.json([]);
	const params = [Number(course_id), Number(subject_id), Number(level_id)];
	let extra = "";
	if (chapter_id && chapter_id !== "ALL") {
		extra = " AND chapter_id = ?";
		params.push(Number(chapter_id));
	}
	db.query(
		`SELECT qa.id, qa.question_text, qa.option1, qa.option2, qa.option3, qa.option4, qa.answer,
            qa.chapter_id, qa.level_id, ch.chapter_name, dl.level_name
     FROM questions_answers qa
     LEFT JOIN chapters ch ON ch.chapter_id = qa.chapter_id
     LEFT JOIN difficulty_levels dl ON dl.level_id = qa.level_id
     WHERE qa.course_id = ? AND qa.subject_id = ? AND qa.level_id = ? ${extra}
     ORDER BY qa.id DESC LIMIT 100`,
		params,
		(err, results = []) => (err ? res.status(500).json({ error: err.message }) : res.json(results))
	);
});

module.exports = router;
