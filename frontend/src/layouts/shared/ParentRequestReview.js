import React, { useCallback, useEffect, useMemo, useState } from "react";
import { Box, CircularProgress } from "@mui/material";

const readUser = () => {
  try {
    return JSON.parse(localStorage.getItem("user") || "null");
  } catch (error) {
    return null;
  }
};

const formatDateTime = (value) => {
  if (!value) return "Not set";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return String(value);
  return date.toLocaleString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
};

const statusClass = (status) => String(status || "pending").toLowerCase().replace(/\s+/g, "_");

function ParentRequestReview({ actor = "admin" }) {
  const user = useMemo(() => readUser(), []);
  const actorId = user?.id || user?.user_id || null;
  const actorLabel = actor === "teacher" ? "Teacher" : "Admin";
  const [links, setLinks] = useState([]);
  const [meetings, setMeetings] = useState([]);
  const [summary, setSummary] = useState({});
  const [linkStatus, setLinkStatus] = useState("pending");
  const [meetingStatus, setMeetingStatus] = useState("requested");
  const [meetingLinks, setMeetingLinks] = useState({});
  const [loading, setLoading] = useState(true);
  const [savingKey, setSavingKey] = useState("");
  const [message, setMessage] = useState("");

  const loadRequests = useCallback((options = {}) => {
    setLoading(true);
    if (!options.keepMessage) setMessage("");
    return Promise.all([
      fetch("/api/parent-requests/summary").then((response) => response.json()),
      fetch(`/api/parent-requests/links?status=${linkStatus}`).then((response) => response.json()),
      fetch(`/api/parent-requests/meetings?status=${meetingStatus}`).then((response) => response.json()),
    ])
      .then(([summaryData, linkData, meetingData]) => {
        setSummary(summaryData.summary || {});
        setLinks(Array.isArray(linkData.links) ? linkData.links : []);
        const nextMeetings = Array.isArray(meetingData.meetings) ? meetingData.meetings : [];
        setMeetings(nextMeetings);
        setMeetingLinks(
          nextMeetings.reduce((acc, row) => {
            acc[row.meeting_request_id] = row.meeting_link || "";
            return acc;
          }, {})
        );
        if (summaryData.setup_required || linkData.setup_required || meetingData.setup_required) {
          setMessage(summaryData.message || linkData.message || meetingData.message || "Parent request tables are not installed.");
        }
      })
      .catch(() => {
        setLinks([]);
        setMeetings([]);
        setMessage("Unable to load parent requests right now.");
      })
      .finally(() => setLoading(false));
  }, [linkStatus, meetingStatus]);

  useEffect(() => {
    loadRequests();
  }, [loadRequests]);

  const updateLink = async (linkId, status) => {
    const key = `link-${linkId}-${status}`;
    setSavingKey(key);
    setMessage("");
    try {
      const response = await fetch(`/api/parent-requests/links/${linkId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          status,
          actor_id: actorId,
          can_view_results: status === "verified",
          can_receive_notifications: status === "verified",
        }),
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(data.error || "Unable to update ward link request.");
      await loadRequests({ keepMessage: true });
      setMessage(status === "verified" ? "Ward link approved successfully." : "Ward link status updated.");
    } catch (error) {
      setMessage(error.message || "Unable to update ward link request.");
    } finally {
      setSavingKey("");
    }
  };

  const updateMeeting = async (meetingId, status) => {
    const key = `meeting-${meetingId}-${status}`;
    setSavingKey(key);
    setMessage("");
    try {
      const response = await fetch(`/api/parent-requests/meetings/${meetingId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          status,
          actor_id: actorId,
          meeting_link: meetingLinks[meetingId] || "",
        }),
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(data.error || "Unable to update meeting request.");
      await loadRequests({ keepMessage: true });
      setMessage(status === "scheduled" ? "Parent meeting scheduled successfully." : "Meeting request status updated.");
    } catch (error) {
      setMessage(error.message || "Unable to update meeting request.");
    } finally {
      setSavingKey("");
    }
  };

  const stats = [
    { label: "Pending Links", value: summary.pendingLinks || 0 },
    { label: "Verified Links", value: summary.verifiedLinks || 0 },
    { label: "Meeting Requests", value: summary.requestedMeetings || 0 },
    { label: "Scheduled Meets", value: summary.scheduledMeetings || 0 },
  ];

  return (
    <Box className="teacher-tool parent-request-review" sx={{ p: 0 }}>
      <section className="teacher-tool-hero">
        <div>
          <span className="teacher-tool-kicker">
            <span className="material-icons-round">family_restroom</span>
            Parent interactions
          </span>
          <h2>Approve ward links and schedule parent feedback meetings.</h2>
          <p>
            Review every parent-student link request, allow result access after verification, and
            convert meeting requests into scheduled academic feedback calls.
          </p>
        </div>
        <div className="teacher-tool-actions">
          <button type="button" className="teacher-action-button secondary" onClick={loadRequests} disabled={loading}>
            <span className="material-icons-round">refresh</span>
            Refresh
          </button>
        </div>
      </section>

      <div className="teacher-tool-stat-strip">
        {stats.map((stat) => (
          <article key={stat.label}>
            <strong>{stat.value}</strong>
            <span>{stat.label}</span>
          </article>
        ))}
      </div>

      <section className="teacher-tool-filter-card">
        <div className="teacher-section-heading">
          <span className="teacher-tool-kicker">{actorLabel} queue</span>
          <h2>Request Filters</h2>
          <p>Switch between pending, approved, scheduled, and closed parent interaction records.</p>
        </div>
        <div className="teacher-filter-grid two">
          <label>
            <span>Ward link status</span>
            <select value={linkStatus} onChange={(event) => setLinkStatus(event.target.value)}>
              <option value="pending">Pending</option>
              <option value="verified">Verified</option>
              <option value="blocked">Blocked</option>
              <option value="all">All</option>
            </select>
          </label>
          <label>
            <span>Meeting status</span>
            <select value={meetingStatus} onChange={(event) => setMeetingStatus(event.target.value)}>
              <option value="requested">Requested</option>
              <option value="scheduled">Scheduled</option>
              <option value="completed">Completed</option>
              <option value="cancelled">Cancelled</option>
              <option value="all">All</option>
            </select>
          </label>
        </div>
      </section>

      {message && <div className="teacher-result-count parent-review-message">{message}</div>}

      <section className="teacher-table-shell">
        <div className="teacher-table-title">
          <div>
            <span className="teacher-tool-kicker">Ward verification</span>
            <h3>Parent Student Link Requests</h3>
          </div>
          <span className="teacher-result-count">{links.length} record{links.length === 1 ? "" : "s"}</span>
        </div>

        {loading ? (
          <Box display="flex" justifyContent="center" alignItems="center" minHeight={140}>
            <CircularProgress />
          </Box>
        ) : links.length ? (
          <div className="teacher-table-scroll">
            <table className="teacher-data-table parent-review-table">
              <thead>
                <tr>
                  <th>Parent</th>
                  <th>Student</th>
                  <th>Relationship</th>
                  <th>Access</th>
                  <th>Status</th>
                  <th>Verified</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {links.map((row) => (
                  <tr key={row.link_id}>
                    <td>
                      <strong>{row.parent_name || `Parent #${row.parent_id}`}</strong>
                      <small>{row.parent_email}</small>
                    </td>
                    <td>
                      <strong>{row.student_name || `Student #${row.student_id}`}</strong>
                      <small>{row.student_email}</small>
                      <small>{[row.student_class, row.student_school].filter(Boolean).join(" | ")}</small>
                    </td>
                    <td>{row.relationship || "Parent"}</td>
                    <td>{Number(row.can_view_results) ? "Results allowed" : "No result access"}</td>
                    <td>
                      <span className={`teacher-status-pill ${statusClass(row.status)}`}>{row.status}</span>
                    </td>
                    <td>
                      <strong>{row.verified_by_name || "Not verified"}</strong>
                      <small>{formatDateTime(row.verified_at || row.created_at)}</small>
                    </td>
                    <td>
                      <div className="teacher-tool-actions parent-review-actions">
                        {row.status !== "verified" && (
                          <button
                            type="button"
                            className="teacher-action-button success"
                            onClick={() => updateLink(row.link_id, "verified")}
                            disabled={savingKey === `link-${row.link_id}-verified`}
                          >
                            <span className="material-icons-round">verified</span>
                            Approve
                          </button>
                        )}
                        {row.status !== "blocked" && (
                          <button
                            type="button"
                            className="teacher-action-button danger"
                            onClick={() => updateLink(row.link_id, "blocked")}
                            disabled={savingKey === `link-${row.link_id}-blocked`}
                          >
                            <span className="material-icons-round">block</span>
                            Block
                          </button>
                        )}
                        {row.status !== "pending" && (
                          <button
                            type="button"
                            className="teacher-action-button secondary"
                            onClick={() => updateLink(row.link_id, "pending")}
                            disabled={savingKey === `link-${row.link_id}-pending`}
                          >
                            Reopen
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="teacher-empty-state">No ward link requests found.</div>
        )}
      </section>

      <section className="teacher-table-shell">
        <div className="teacher-table-title">
          <div>
            <span className="teacher-tool-kicker">Meeting review</span>
            <h3>Parent Meeting Requests</h3>
          </div>
          <span className="teacher-result-count">{meetings.length} record{meetings.length === 1 ? "" : "s"}</span>
        </div>

        {loading ? (
          <Box display="flex" justifyContent="center" alignItems="center" minHeight={140}>
            <CircularProgress />
          </Box>
        ) : meetings.length ? (
          <div className="teacher-table-scroll">
            <table className="teacher-data-table parent-review-table">
              <thead>
                <tr>
                  <th>Parent</th>
                  <th>Student</th>
                  <th>Preferred Slot</th>
                  <th>Topic</th>
                  <th>Meeting Link</th>
                  <th>Status</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {meetings.map((row) => (
                  <tr key={row.meeting_request_id}>
                    <td>
                      <strong>{row.parent_name || `Parent #${row.parent_id}`}</strong>
                      <small>{row.parent_email}</small>
                    </td>
                    <td>
                      <strong>{row.student_name || `Student #${row.student_id}`}</strong>
                      <small>{row.student_email}</small>
                      <small>{[row.student_class, row.student_school].filter(Boolean).join(" | ")}</small>
                    </td>
                    <td>{formatDateTime(row.requested_slot)}</td>
                    <td>
                      <strong>{row.topic || "Performance feedback"}</strong>
                      <small>{row.notes || "No extra notes"}</small>
                    </td>
                    <td>
                      <input
                        value={meetingLinks[row.meeting_request_id] || ""}
                        onChange={(event) =>
                          setMeetingLinks((current) => ({
                            ...current,
                            [row.meeting_request_id]: event.target.value,
                          }))
                        }
                        placeholder="https://meet.example.com/session"
                      />
                      <small>{row.assigned_to_name ? `Assigned to ${row.assigned_to_name}` : "Not assigned"}</small>
                    </td>
                    <td>
                      <span className={`teacher-status-pill ${statusClass(row.status)}`}>{row.status}</span>
                    </td>
                    <td>
                      <div className="teacher-tool-actions parent-review-actions">
                        {row.status !== "scheduled" && row.status !== "completed" && (
                          <button
                            type="button"
                            className="teacher-action-button success"
                            onClick={() => updateMeeting(row.meeting_request_id, "scheduled")}
                            disabled={savingKey === `meeting-${row.meeting_request_id}-scheduled`}
                          >
                            <span className="material-icons-round">event_available</span>
                            Schedule
                          </button>
                        )}
                        {row.status !== "cancelled" && row.status !== "completed" && (
                          <button
                            type="button"
                            className="teacher-action-button danger"
                            onClick={() => updateMeeting(row.meeting_request_id, "cancelled")}
                            disabled={savingKey === `meeting-${row.meeting_request_id}-cancelled`}
                          >
                            Cancel
                          </button>
                        )}
                        {row.status !== "completed" && (
                          <button
                            type="button"
                            className="teacher-action-button secondary"
                            onClick={() => updateMeeting(row.meeting_request_id, "completed")}
                            disabled={savingKey === `meeting-${row.meeting_request_id}-completed`}
                          >
                            Complete
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="teacher-empty-state">No meeting requests found.</div>
        )}
      </section>
    </Box>
  );
}

export default ParentRequestReview;
