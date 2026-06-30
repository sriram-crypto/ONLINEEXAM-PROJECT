const express = require('express');
const router = express.Router();
const db = require('../../config/db');

// Get all users pending approval (is_active = 0)
router.get('/pending', (req, res) => {
	db.query('SELECT user_id, name, email, role, class, schoolname, created_at FROM users WHERE is_active = 0', (err, results) => {
		if (err) return res.status(500).json({ error: 'Database error' });
		res.json(results);
	});
});

// Approve (activate) a user
router.post('/approve/:user_id', (req, res) => {
	const { user_id } = req.params;
	db.query('UPDATE users SET is_active = 1 WHERE user_id = ?', [user_id], (err, result) => {
		if (err) return res.status(500).json({ error: 'Database error' });
		res.json({ success: true });
	});
});

module.exports = router;
