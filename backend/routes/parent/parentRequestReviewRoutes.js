const express = require('express');
const router = express.Router();
const db = require('../../config/db');

const query = (sql, params = []) =>
  new Promise((resolve, reject) => {
    db.query(sql, params, (err, rows) => {
      if (err) reject(err);
      else resolve(rows || []);
    });
  });

const isMissingSchema = (err) =>
  err && (err.code === 'ER_NO_SUCH_TABLE' || err.code === 'ER_BAD_FIELD_ERROR' || err.errno === 1146 || err.errno === 1054);

const linkStatuses = new Set(['all', 'pending', 'verified', 'blocked']);
const meetingStatuses = new Set(['all', 'requested', 'scheduled', 'completed', 'cancelled']);

const toPositiveInt = (value) => {
  const parsed = Number(value || 0);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : null;
};

const readBool = (value, fallback) => {
  if (value === undefined || value === null || value === '') return fallback;
  if (value === true || value === 1 || value === '1') return true;
  if (value === false || value === 0 || value === '0') return false;
  return fallback;
};

const sendSchemaSetup = (res) =>
  res.json({
    setup_required: true,
    message: 'Parent request tables are not installed yet. Apply the online exam platform upgrade migration.',
    links: [],
    meetings: [],
    summary: {
      linkCounts: {},
      meetingCounts: {},
      pendingLinks: 0,
      requestedMeetings: 0,
    },
  });

const mapCountRows = (rows) =>
  rows.reduce((acc, row) => {
    acc[row.status || 'unknown'] = Number(row.total || 0);
    return acc;
  }, {});

const fetchLinkById = async (linkId) => {
  const rows = await query(
    `SELECT psl.link_id, psl.parent_id, psl.student_id, psl.relationship, psl.can_view_results,
            psl.can_receive_notifications, psl.status, psl.verified_by, psl.verified_at, psl.created_at,
            parent_user.name AS parent_name, parent_user.email AS parent_email,
            student_user.name AS student_name, student_user.email AS student_email,
            student_user.class AS student_class, student_user.schoolname AS student_school,
            verifier.name AS verified_by_name
     FROM parent_student_links psl
     INNER JOIN users parent_user ON parent_user.user_id = psl.parent_id
     INNER JOIN users student_user ON student_user.user_id = psl.student_id
     LEFT JOIN users verifier ON verifier.user_id = psl.verified_by
     WHERE psl.link_id = ?
     LIMIT 1`,
    [linkId]
  );
  return rows[0] || null;
};

const fetchMeetingById = async (meetingId) => {
  const rows = await query(
    `SELECT pmr.meeting_request_id, pmr.parent_id, pmr.student_id, pmr.requested_slot, pmr.topic,
            pmr.notes, pmr.status, pmr.assigned_to, pmr.meeting_link, pmr.created_at, pmr.updated_at,
            parent_user.name AS parent_name, parent_user.email AS parent_email,
            student_user.name AS student_name, student_user.email AS student_email,
            student_user.class AS student_class, student_user.schoolname AS student_school,
            assignee.name AS assigned_to_name
     FROM parent_meeting_requests pmr
     INNER JOIN users parent_user ON parent_user.user_id = pmr.parent_id
     INNER JOIN users student_user ON student_user.user_id = pmr.student_id
     LEFT JOIN users assignee ON assignee.user_id = pmr.assigned_to
     WHERE pmr.meeting_request_id = ?
     LIMIT 1`,
    [meetingId]
  );
  return rows[0] || null;
};

router.get('/summary', async (_req, res) => {
  try {
    const [linkRows, meetingRows] = await Promise.all([
      query('SELECT status, COUNT(*) AS total FROM parent_student_links GROUP BY status'),
      query('SELECT status, COUNT(*) AS total FROM parent_meeting_requests GROUP BY status'),
    ]);
    const linkCounts = mapCountRows(linkRows);
    const meetingCounts = mapCountRows(meetingRows);

    res.json({
      summary: {
        linkCounts,
        meetingCounts,
        pendingLinks: linkCounts.pending || 0,
        verifiedLinks: linkCounts.verified || 0,
        blockedLinks: linkCounts.blocked || 0,
        requestedMeetings: meetingCounts.requested || 0,
        scheduledMeetings: meetingCounts.scheduled || 0,
        completedMeetings: meetingCounts.completed || 0,
        cancelledMeetings: meetingCounts.cancelled || 0,
      },
    });
  } catch (err) {
    if (isMissingSchema(err)) return sendSchemaSetup(res);
    res.status(500).json({ error: 'Server error', details: err.message });
  }
});

router.get('/links', async (req, res) => {
  const status = String(req.query.status || 'all').toLowerCase();
  if (!linkStatuses.has(status)) return res.status(400).json({ error: 'Invalid link status filter' });

  try {
    const where = status === 'all' ? '' : 'WHERE psl.status = ?';
    const params = status === 'all' ? [] : [status];
    const links = await query(
      `SELECT psl.link_id, psl.parent_id, psl.student_id, psl.relationship, psl.can_view_results,
              psl.can_receive_notifications, psl.status, psl.verified_by, psl.verified_at, psl.created_at,
              parent_user.name AS parent_name, parent_user.email AS parent_email,
              student_user.name AS student_name, student_user.email AS student_email,
              student_user.class AS student_class, student_user.schoolname AS student_school,
              verifier.name AS verified_by_name
       FROM parent_student_links psl
       INNER JOIN users parent_user ON parent_user.user_id = psl.parent_id
       INNER JOIN users student_user ON student_user.user_id = psl.student_id
       LEFT JOIN users verifier ON verifier.user_id = psl.verified_by
       ${where}
       ORDER BY FIELD(psl.status, 'pending', 'verified', 'blocked'), psl.created_at DESC`,
      params
    );
    res.json({ links });
  } catch (err) {
    if (isMissingSchema(err)) return sendSchemaSetup(res);
    res.status(500).json({ error: 'Server error', details: err.message });
  }
});

router.put('/links/:linkId', async (req, res) => {
  const linkId = toPositiveInt(req.params.linkId);
  const status = String(req.body.status || '').toLowerCase();
  if (!linkId) return res.status(400).json({ error: 'Valid link id required' });
  if (!linkStatuses.has(status) || status === 'all') return res.status(400).json({ error: 'Invalid link status' });

  try {
    const existing = await fetchLinkById(linkId);
    if (!existing) return res.status(404).json({ error: 'Parent-student link request not found' });

    const isVerified = status === 'verified';
    const canViewResults = isVerified ? readBool(req.body.can_view_results, true) : false;
    const canReceiveNotifications = isVerified ? readBool(req.body.can_receive_notifications, true) : false;
    const actorId = isVerified ? toPositiveInt(req.body.actor_id || req.body.verified_by) : null;

    await query(
      `UPDATE parent_student_links
       SET status = ?,
           can_view_results = ?,
           can_receive_notifications = ?,
           verified_by = ?,
           verified_at = CASE WHEN ? = 'verified' THEN NOW() ELSE NULL END
       WHERE link_id = ?`,
      [status, canViewResults ? 1 : 0, canReceiveNotifications ? 1 : 0, actorId, status, linkId]
    );

    res.json({ ok: true, link: await fetchLinkById(linkId) });
  } catch (err) {
    if (isMissingSchema(err)) return res.status(503).json({ error: 'Parent link table not installed. Apply the platform upgrade migration.' });
    res.status(500).json({ error: 'Server error', details: err.message });
  }
});

router.get('/meetings', async (req, res) => {
  const status = String(req.query.status || 'all').toLowerCase();
  if (!meetingStatuses.has(status)) return res.status(400).json({ error: 'Invalid meeting status filter' });

  try {
    const where = status === 'all' ? '' : 'WHERE pmr.status = ?';
    const params = status === 'all' ? [] : [status];
    const meetings = await query(
      `SELECT pmr.meeting_request_id, pmr.parent_id, pmr.student_id, pmr.requested_slot, pmr.topic,
              pmr.notes, pmr.status, pmr.assigned_to, pmr.meeting_link, pmr.created_at, pmr.updated_at,
              parent_user.name AS parent_name, parent_user.email AS parent_email,
              student_user.name AS student_name, student_user.email AS student_email,
              student_user.class AS student_class, student_user.schoolname AS student_school,
              assignee.name AS assigned_to_name
       FROM parent_meeting_requests pmr
       INNER JOIN users parent_user ON parent_user.user_id = pmr.parent_id
       INNER JOIN users student_user ON student_user.user_id = pmr.student_id
       LEFT JOIN users assignee ON assignee.user_id = pmr.assigned_to
       ${where}
       ORDER BY FIELD(pmr.status, 'requested', 'scheduled', 'completed', 'cancelled'), pmr.created_at DESC`,
      params
    );
    res.json({ meetings });
  } catch (err) {
    if (isMissingSchema(err)) return sendSchemaSetup(res);
    res.status(500).json({ error: 'Server error', details: err.message });
  }
});

router.put('/meetings/:meetingId', async (req, res) => {
  const meetingId = toPositiveInt(req.params.meetingId);
  const status = String(req.body.status || '').toLowerCase();
  if (!meetingId) return res.status(400).json({ error: 'Valid meeting id required' });
  if (!meetingStatuses.has(status) || status === 'all') return res.status(400).json({ error: 'Invalid meeting status' });

  try {
    const existing = await fetchMeetingById(meetingId);
    if (!existing) return res.status(404).json({ error: 'Meeting request not found' });

    const actorId = toPositiveInt(req.body.actor_id || req.body.assigned_to);
    const assignedTo = ['scheduled', 'completed'].includes(status) ? actorId || existing.assigned_to || null : null;
    const meetingLink =
      req.body.meeting_link !== undefined ? String(req.body.meeting_link || '').trim() || null : existing.meeting_link || null;

    await query(
      `UPDATE parent_meeting_requests
       SET status = ?,
           assigned_to = ?,
           meeting_link = ?
       WHERE meeting_request_id = ?`,
      [status, assignedTo, meetingLink, meetingId]
    );

    res.json({ ok: true, meeting: await fetchMeetingById(meetingId) });
  } catch (err) {
    if (isMissingSchema(err)) return res.status(503).json({ error: 'Parent meeting table not installed. Apply the platform upgrade migration.' });
    res.status(500).json({ error: 'Server error', details: err.message });
  }
});

module.exports = router;
