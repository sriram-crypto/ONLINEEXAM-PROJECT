const express = require('express');
const router = express.Router();
const db = require('../../config/db');

const query = (sql, params = []) =>
  new Promise((resolve, reject) => {
    db.query(sql, params, (err, rows) => {
      if (err) reject(err);
      else resolve(rows);
    });
  });

const isMissingSchema = (err) =>
  err && (err.code === 'ER_NO_SUCH_TABLE' || err.code === 'ER_BAD_FIELD_ERROR' || err.errno === 1146 || err.errno === 1054);

router.get('/dashboard', async (req, res) => {
  const parentId = Number(req.query.parent_id || req.query.user_id || 0);
  if (!parentId) return res.status(400).json({ error: 'parent_id required' });

  try {
    const wards = await query(
      `SELECT psl.link_id, psl.student_id, psl.relationship, psl.status, psl.can_view_results,
              s.name AS student_name, s.email AS student_email, s.class, s.schoolname
       FROM parent_student_links psl
       INNER JOIN users s ON s.user_id = psl.student_id
       WHERE psl.parent_id = ?
       ORDER BY psl.status DESC, s.name ASC`,
      [parentId]
    );

    const verifiedStudentIds = wards.filter((ward) => ward.status === 'verified' && ward.can_view_results).map((ward) => ward.student_id);
    let results = [];

    if (verifiedStudentIds.length) {
      results = await query(
        `SELECT ser.id, ser.exam_id, ser.user_id AS student_id, ser.total_marks, ser.correct_count, ser.wrong_count,
                ser.answered, ser.not_answered, ser.created_at, e.title AS exam_title, e.exam_date
         FROM student_exam_results ser
         LEFT JOIN exams e ON e.exam_id = ser.exam_id
         WHERE ser.user_id IN (?)
         ORDER BY ser.created_at DESC
         LIMIT 100`,
        [verifiedStudentIds]
      );
    }

    const meetings = await query(
      `SELECT meeting_request_id, student_id, requested_slot, topic, notes, status, meeting_link, created_at
       FROM parent_meeting_requests
       WHERE parent_id = ?
       ORDER BY created_at DESC
       LIMIT 20`,
      [parentId]
    );

    res.json({ wards, results, meetings });
  } catch (err) {
    if (isMissingSchema(err)) {
      return res.json({
        setup_required: true,
        message: 'Parent tables are not installed yet. Apply backend/migrations/20260428_online_exam_platform_upgrade.sql.',
        wards: [],
        results: [],
        meetings: [],
      });
    }
    res.status(500).json({ error: 'Server error', details: err.message });
  }
});

router.post('/link-student', async (req, res) => {
  const parentId = Number(req.body.parent_id || req.body.user_id || 0);
  const studentEmail = String(req.body.student_email || '').trim();
  const studentIdFromBody = Number(req.body.student_id || 0);
  const relationship = req.body.relationship || 'Parent';

  if (!parentId || (!studentEmail && !studentIdFromBody)) {
    return res.status(400).json({ error: 'parent_id and student_email/student_id required' });
  }

  try {
    let studentId = studentIdFromBody;
    if (!studentId && studentEmail) {
      const students = await query('SELECT user_id FROM users WHERE email = ? AND role = "student" LIMIT 1', [studentEmail]);
      if (!students.length) return res.status(404).json({ error: 'Student account not found' });
      studentId = students[0].user_id;
    }

    await query(
      `INSERT INTO parent_student_links (parent_id, student_id, relationship, status)
       VALUES (?, ?, ?, 'pending')
       ON DUPLICATE KEY UPDATE relationship = VALUES(relationship), status = IF(status = 'blocked', status, 'pending')`,
      [parentId, studentId, relationship]
    );

    res.json({ ok: true, message: 'Ward link request submitted for admin verification.' });
  } catch (err) {
    if (isMissingSchema(err)) {
      return res.status(503).json({ error: 'Parent link table not installed. Apply the platform upgrade migration.' });
    }
    res.status(500).json({ error: 'Server error', details: err.message });
  }
});

router.post('/meetings', async (req, res) => {
  const parentId = Number(req.body.parent_id || req.body.user_id || 0);
  const studentId = Number(req.body.student_id || 0);
  const requestedSlot = req.body.requested_slot || null;
  const topic = req.body.topic || 'Performance feedback';
  const notes = req.body.notes || null;

  if (!parentId || !studentId) return res.status(400).json({ error: 'parent_id and student_id required' });

  try {
    const result = await query(
      `INSERT INTO parent_meeting_requests (parent_id, student_id, requested_slot, topic, notes, status)
       VALUES (?, ?, ?, ?, ?, 'requested')`,
      [parentId, studentId, requestedSlot, topic, notes]
    );

    res.json({ ok: true, meeting_request_id: result.insertId });
  } catch (err) {
    if (isMissingSchema(err)) {
      return res.status(503).json({ error: 'Parent meeting table not installed. Apply the platform upgrade migration.' });
    }
    res.status(500).json({ error: 'Server error', details: err.message });
  }
});

router.post('/notify-result', async (req, res) => {
  const parentId = Number(req.body.parent_id || req.body.user_id || 0);
  const studentId = Number(req.body.student_id || 0);
  const resultId = req.body.result_id || null;
  const channel = req.body.channel || 'email';

  if (!parentId || !studentId) return res.status(400).json({ error: 'parent_id and student_id required' });

  try {
    const result = await query(
      `INSERT INTO notification_logs
       (recipient_user_id, student_id, exam_id, channel, subject, body, status)
       VALUES (?, ?, ?, ?, ?, ?, 'queued')`,
      [
        parentId,
        studentId,
        req.body.exam_id || null,
        channel,
        'Exam result update',
        JSON.stringify({ result_id: resultId, message: req.body.message || 'A new result is available.' }),
      ]
    );

    res.json({
      ok: true,
      notification_id: result.insertId,
      message: 'Result notification queued. Connect an email/WhatsApp/SMS provider to deliver it.',
    });
  } catch (err) {
    if (isMissingSchema(err)) {
      return res.status(503).json({ error: 'Notification table not installed. Apply the platform upgrade migration.' });
    }
    res.status(500).json({ error: 'Server error', details: err.message });
  }
});

module.exports = router;
