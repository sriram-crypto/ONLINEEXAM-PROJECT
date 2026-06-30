const express = require('express');
const router = express.Router();
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const db = require('../config/db'); // MySQL connection

// Email validation regex
const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const allowedRoles = new Set(['superadmin', 'admin', 'teacher', 'student', 'parent']);
const isBcryptHash = (value) => /^\$2[aby]\$/.test(String(value || ''));

// POST /api/auth/signup
router.post('/signup', (req, res) => {
  const { name, email, password, role } = req.body;
  const normalizedRole = String(role || '').toLowerCase();
  if (!name || !email || !password || !role) {
    return res.status(400).json({ message: 'All fields are required' });
  }

  if (!allowedRoles.has(normalizedRole)) {
    return res.status(400).json({ message: 'Invalid role selected' });
  }
  
  // Validate email format
  if (!emailRegex.test(email)) {
    return res.status(400).json({ message: 'Invalid email format' });
  }

  // Check if email already exists
  const checkQuery = 'SELECT email FROM users WHERE email = ?';
  db.query(checkQuery, [email], (err, results) => {
    if (err) {
      return res.status(500).json({ error: 'Database error' });
    }
    
    if (results.length > 0) {
      return res.status(409).json({ message: 'Email already exists. Please use a different email.' });
    }

    const passwordHash = bcrypt.hashSync(password, 10);
    const query = 'INSERT INTO users (name, email, password, role, is_active, created_at) VALUES (?, ?, ?, ?, 1, NOW())';
    db.query(query, [name, email, passwordHash, normalizedRole], (err, result) => {
      if (err) {
        if (err.code === 'ER_DUP_ENTRY') {
          return res.status(409).json({ message: 'Email already exists. Please use a different email.' });
        }
        return res.status(500).json({ error: 'Database error' });
      }
      res.status(201).json({ message: 'User registered successfully' });
    });
  });
});

// POST /api/auth/login
router.post('/login', async (req, res) => {
  const body = req.body || {};
  const { email, password } = body;

  if (!email || !password) {
    return res.status(400).json({ error: 'Missing email or password' });
  }

  // Validate email format
  if (!emailRegex.test(email)) {
    return res.status(400).json({ error: 'Invalid email format' });
  }

  const query = 'SELECT * FROM users WHERE email = ? AND is_active = 1 LIMIT 1';
  db.query(query, [email], async (err, results) => {
    if (err) {
      console.error('Database error during login:', err);
      return res.status(500).json({ error: 'Database error', details: err.message });
    }
    
    if (results.length === 0) {
      console.log(`Login failed for email: ${email}`);
      return res.status(401).json({ error: 'Invalid email or password. Email does not exist or credentials are incorrect.' });
    }

    const user = results[0];
    const storedPassword = user.password || '';
    const passwordMatches = isBcryptHash(storedPassword)
      ? await bcrypt.compare(password, storedPassword)
      : password === storedPassword;

    if (!passwordMatches) {
      console.log(`Login failed for email: ${email}`);
      return res.status(401).json({ error: 'Invalid email or password. Email does not exist or credentials are incorrect.' });
    }

    if (!isBcryptHash(storedPassword)) {
      const upgradedHash = await bcrypt.hash(password, 10);
      db.query('UPDATE users SET password = ? WHERE user_id = ?', [upgradedHash, user.user_id || user.id], () => {});
    }

    console.log(`User logged in: ${user.email}, role: ${user.role}`);
    
    const jwtSecret = process.env.JWT_SECRET || 'your-super-secret-jwt-key-for-development-only';
    const token = jwt.sign(
      { id: user.user_id || user.id, role: user.role },
      jwtSecret,
      { expiresIn: '1d' }
    );
    res.json({ token, user: { id: user.user_id || user.id, name: user.name, email: user.email, role: user.role } });
  });
});

module.exports = router;
