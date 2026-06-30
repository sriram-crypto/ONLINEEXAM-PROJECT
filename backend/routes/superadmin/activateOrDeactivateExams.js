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

const currentExamOrder = `
  CASE
    WHEN e.status = 'active'
      AND (e.start_time IS NULL OR e.start_time <= NOW())
      AND (e.end_time IS NULL OR e.end_time >= NOW()) THEN 0
    WHEN e.status = 'active' THEN 1
    WHEN e.status = 'scheduled' THEN 2
    ELSE 3
  END,
  COALESCE(e.start_time, e.exam_date, e.created_at) ASC,
  e.exam_id DESC
`;

// GET current active/scheduled exams only.
router.get("/", async (req, res) => {
  try {
    await syncTimedExamStatuses();

    const rows = await query(
      `SELECT
          e.exam_id,
          e.title AS exam_name,
          e.title,
          c.course_name,
          GROUP_CONCAT(DISTINCT s.subject_name ORDER BY s.subject_name SEPARATOR ', ') AS subject_name,
          e.status,
          e.exam_date,
          e.start_time,
          e.end_time,
          e.duration,
          e.schoolname,
          e.class,
          COALESCE(qmeta.question_count, 0) AS question_count,
          COALESCE(qmeta.total_marks, 0) AS total_marks
       FROM exams e
       LEFT JOIN courses c ON e.course_id = c.course_id
       LEFT JOIN exam_subjects es ON e.exam_id = es.exam_id
       LEFT JOIN subjects s ON es.subject_id = s.subject_id
       LEFT JOIN (
         SELECT exam_id, COUNT(*) AS question_count, SUM(COALESCE(marks, 1)) AS total_marks
         FROM exam_question_mapping
         GROUP BY exam_id
       ) qmeta ON qmeta.exam_id = e.exam_id
       WHERE e.status IN ('active', 'scheduled')
       GROUP BY e.exam_id, e.title, c.course_name, e.status, e.exam_date, e.start_time, e.end_time,
                e.duration, e.schoolname, e.class, e.created_at, qmeta.question_count, qmeta.total_marks
       ORDER BY ${currentExamOrder}`
    );

    res.json(rows);
  } catch (err) {
    console.error("activateOrDeactivateExams list error:", err);
    res.status(500).json({ error: "Database error", details: err.message });
  }
});

// PUT update status for an exam.
router.put("/:examId/status", async (req, res) => {
  try {
    const { status } = req.body;
    const allowed = new Set(["scheduled", "active", "cancelled"]);
    if (!allowed.has(status)) {
      return res.status(400).json({ error: "Invalid status" });
    }

    if (status === "cancelled") {
      await query("UPDATE exams SET status = 'cancelled', updated_at = NOW() WHERE exam_id = ?", [req.params.examId]);
      return res.json({ success: true, status: "cancelled" });
    }

    const rows = await query("SELECT start_time, end_time FROM exams WHERE exam_id = ? LIMIT 1", [req.params.examId]);
    if (!rows.length) return res.status(404).json({ error: "Exam not found" });

    const exam = rows[0];
    const now = Date.now();
    const startMs = exam.start_time ? new Date(exam.start_time).getTime() : 0;
    const endMs = exam.end_time ? new Date(exam.end_time).getTime() : Number.POSITIVE_INFINITY;
    const computedStatus = now >= startMs && now <= endMs ? "active" : "scheduled";

    await query("UPDATE exams SET status = ?, updated_at = NOW() WHERE exam_id = ?", [computedStatus, req.params.examId]);
    res.json({ success: true, status: computedStatus });
  } catch (err) {
    console.error("activateOrDeactivateExams status error:", err);
    res.status(500).json({ error: "Database error", details: err.message });
  }
});

module.exports = router;
