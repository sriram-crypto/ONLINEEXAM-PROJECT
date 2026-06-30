const express = require("express");
const router = express.Router();
const db = require("../../config/db");

const query = (sql, params = []) =>
  new Promise((resolve, reject) => {
    db.query(sql, params, (err, rows) => {
      if (err) reject(err);
      else resolve(rows);
    });
  });

const syncTimedExamStatuses = async () => {
  await query(
    `UPDATE exams
     SET status = 'active'
     WHERE status IN ('scheduled', 'active')
       AND (start_time IS NULL OR start_time <= NOW())
       AND (end_time IS NULL OR end_time >= NOW())`
  );

  await query(
    `UPDATE exams
     SET status = 'scheduled'
     WHERE status IN ('scheduled', 'active')
       AND start_time > NOW()`
  );

  await query(
    `UPDATE exams
     SET status = 'completed'
     WHERE status IN ('scheduled', 'active')
       AND end_time IS NOT NULL
       AND end_time < NOW()`
  );
};

// Get all packages with their single mapped exam.
router.get("/", async (req, res) => {
  try {
    await syncTimedExamStatuses();

    const rows = await query(
      `SELECT
          p.package_id,
          p.package_name,
          p.amount,
          p.currency,
          p.description,
          p.status,
          p.created_at,
          e.exam_id,
          e.title AS exam_name,
          e.status AS exam_status,
          e.start_time,
          e.end_time
       FROM packages p
       LEFT JOIN package_exam_mapping pe ON p.package_id = pe.package_id
       LEFT JOIN exams e ON pe.exam_id = e.exam_id
       ORDER BY p.package_id DESC`
    );
    res.json(rows);
  } catch (err) {
    console.error("packages list error:", err);
    res.status(500).json({ error: "Database error", details: err.message });
  }
});

// Create a new package. One package maps to exactly one currently active/scheduled exam.
router.post("/", async (req, res) => {
  try {
    const { package_name, amount, description, exam_id, exam_ids } = req.body;
    const selectedExamId = exam_id || (Array.isArray(exam_ids) ? exam_ids[0] : null);

    if (!package_name || selectedExamId == null || selectedExamId === "") {
      return res.status(400).json({ error: "Package name and one exam are required" });
    }

    const parsedAmount = Number(amount);
    if (!Number.isFinite(parsedAmount) || parsedAmount < 0) {
      return res.status(400).json({ error: "Enter a valid package amount" });
    }

    await syncTimedExamStatuses();

    const examRows = await query(
      `SELECT exam_id, title, status
       FROM exams
       WHERE exam_id = ?
         AND status IN ('active', 'scheduled')
       LIMIT 1`,
      [selectedExamId]
    );

    if (!examRows.length) {
      return res.status(400).json({ error: "Only current active or scheduled exams can be packaged" });
    }

    const existingMapping = await query(
      `SELECT pe.package_id, p.package_name
       FROM package_exam_mapping pe
       LEFT JOIN packages p ON p.package_id = pe.package_id
       WHERE pe.exam_id = ?
       LIMIT 1`,
      [selectedExamId]
    );

    if (existingMapping.length) {
      return res.status(409).json({
        error: `This exam is already linked to package "${existingMapping[0].package_name || existingMapping[0].package_id}"`,
      });
    }

    const result = await query(
      `INSERT INTO packages (package_name, amount, description, status, created_at, updated_at)
       VALUES (?, ?, ?, 'active', NOW(), NOW())`,
      [package_name, parsedAmount, description || null]
    );
    const packageId = result.insertId;

    await query("INSERT INTO package_exam_mapping (package_id, exam_id) VALUES (?, ?)", [packageId, selectedExamId]);

    try {
      await query("UPDATE exams SET package_id = ?, package = ? WHERE exam_id = ?", [packageId, packageId, selectedExamId]);
    } catch (err) {
      console.warn("Failed to backfill exam package columns:", err.message);
    }

    res.json({ success: true, package_id: packageId, exam_id: selectedExamId });
  } catch (err) {
    console.error("packages create error:", err);
    res.status(500).json({ error: "Database error", details: err.message });
  }
});

// Delete a package and free its exam mapping.
router.delete("/:id", async (req, res) => {
  try {
    const rows = await query("SELECT exam_id FROM package_exam_mapping WHERE package_id = ?", [req.params.id]);
    await query("DELETE FROM package_exam_mapping WHERE package_id = ?", [req.params.id]);
    await query("DELETE FROM packages WHERE package_id = ?", [req.params.id]);

    if (rows.length) {
      await query("UPDATE exams SET package_id = NULL, package = NULL WHERE exam_id IN (?)", [rows.map((row) => row.exam_id)])
        .catch((err) => console.warn("Failed to clear exam package columns:", err.message));
    }

    res.json({ success: true });
  } catch (err) {
    console.error("packages delete error:", err);
    res.status(500).json({ error: "Database error", details: err.message });
  }
});

// GET active/scheduled exams available for package selection.
router.get("/exams", async (req, res) => {
  try {
    await syncTimedExamStatuses();

    const rows = await query(
      `SELECT
          e.exam_id,
          e.title,
          e.status,
          e.start_time,
          e.end_time,
          e.duration,
          c.course_name
       FROM exams e
       LEFT JOIN courses c ON c.course_id = e.course_id
       LEFT JOIN package_exam_mapping pe ON pe.exam_id = e.exam_id
       WHERE e.status IN ('active', 'scheduled')
         AND pe.exam_id IS NULL
       ORDER BY
         CASE WHEN e.status = 'active' THEN 0 ELSE 1 END,
         COALESCE(e.start_time, e.exam_date, e.created_at) ASC,
         e.exam_id DESC`
    );

    res.json(rows);
  } catch (err) {
    console.error("packages exams error:", err);
    res.status(500).json({ error: "Database error", details: err.message });
  }
});

module.exports = router;
