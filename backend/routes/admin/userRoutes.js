const express = require('express');
const router = express.Router();
const db = require('../../config/db');

// Get all users, with optional role/status filter
router.get('/users', (req, res) => {
  const { role, status } = req.query;
  let sql = 'SELECT * FROM users';
  const params = [];
  if (role || status) {
    sql += ' WHERE';
    if (role) {
      sql += ' role = ?';
      params.push(role);
    }
    if (status) {
      if (role) sql += ' AND';
      sql += ' is_active = ?';
      params.push(status === 'active' ? 1 : 0);
    }
  }
  db.query(sql, params, (err, results) => {
    if (err) return res.status(500).json({ error: 'Database error' });
    res.json(results);
  });
});

// Activate/deactivate user
router.post('/user/:id/status', (req, res) => {
  const { id } = req.params;
  const { status } = req.body; // status should be 'active' or 'inactive'
  if (!['active', 'inactive'].includes(status)) {
    return res.status(400).json({ error: 'Invalid status' });
  }
  db.query('UPDATE users SET is_active = ? WHERE user_id = ?', [status === 'active' ? 1 : 0, id], (err, result) => {
    if (err) return res.status(500).json({ error: 'Database error' });
    res.json({ success: true });
  });
});

module.exports = router;
