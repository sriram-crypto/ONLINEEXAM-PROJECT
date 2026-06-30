const express = require("express");
const router = express.Router();
const db = require("../../config/db");

// GET /api/superadmin/users - get all users for super admin view
router.get("/viewusers", (req, res) => {
  db.query(
    "SELECT user_id, name, email, role, is_active FROM users",
    (err, results) => {
      if (err) return res.status(500).json({ error: "Database error" });
      // Map is_active to status string
      const users = results.map(u => ({
        id: u.user_id,
        name: u.name,
        email: u.email,
        role: u.role,
        status: u.is_active ? "active" : "inactive"
      }));
      res.json(users);
    }
  );
});

// PUT /api/superadmin/users/:id - update user details
router.put("/viewusers/:id", (req, res) => {
  const { name, email, role, status } = req.body;
  const is_active = status === "active" ? 1 : 0;
  db.query(
    "UPDATE users SET name=?, email=?, role=?, is_active=? WHERE user_id=?",
    [name, email, role, is_active, req.params.id],
    (err, result) => {
      if (err) return res.status(500).json({ error: "Database error" });
      res.json({ success: true });
    }
  );
});

module.exports = router;