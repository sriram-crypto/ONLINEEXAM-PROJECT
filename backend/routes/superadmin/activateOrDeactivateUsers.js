const express = require("express");
const router = express.Router();
const db = require("../../config/db");
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
  let sql = "SELECT user_id, name, email, role, is_active FROM users WHERE 1=1";
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
      status: u.is_active ? "active" : "inactive"
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

module.exports = router;
