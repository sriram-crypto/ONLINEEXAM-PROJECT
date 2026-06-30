import React, { useCallback, useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";

import DashboardLayout from "examples/LayoutContainers/DashboardLayout";
import { useArgonController, setMiniSidenav } from "context";

import "../role-panel.css";

const readUser = () => {
  try {
    return JSON.parse(localStorage.getItem("user") || "null");
  } catch (error) {
    return null;
  }
};

function ParentPanel() {
  const navigate = useNavigate();
  const [controller, dispatch] = useArgonController();
  const { miniSidenav } = controller;
  const user = useMemo(() => readUser(), []);
  const parentId = user?.id || user?.user_id;
  const firstName = (user?.name || "Parent").split(" ")[0];
  const [dashboard, setDashboard] = useState({ wards: [], results: [], meetings: [] });
  const [loading, setLoading] = useState(true);
  const [studentEmail, setStudentEmail] = useState("");
  const [relationship, setRelationship] = useState("Parent");
  const [meeting, setMeeting] = useState({ student_id: "", requested_slot: "", topic: "Performance feedback", notes: "" });
  const [message, setMessage] = useState("");
  const [predictiveAlerts, setPredictiveAlerts] = useState([]);

  const loadDashboard = useCallback(() => {
    if (!parentId) return;
    setLoading(true);
    fetch(`/api/parent/dashboard?parent_id=${parentId}`)
      .then((response) => response.json())
      .then((data) => {
        setDashboard({
          wards: Array.isArray(data.wards) ? data.wards : [],
          results: Array.isArray(data.results) ? data.results : [],
          meetings: Array.isArray(data.meetings) ? data.meetings : [],
          setup_required: data.setup_required,
          message: data.message,
        });
        return fetch(`/api/ml/at-risk-students?parent_id=${parentId}`)
          .then((response) => response.json())
          .then((mlData) => setPredictiveAlerts(Array.isArray(mlData.alerts) ? mlData.alerts : []))
          .catch(() => setPredictiveAlerts([]));
      })
      .catch(() => {
        setPredictiveAlerts([]);
        setDashboard({ wards: [], results: [], meetings: [] });
      })
      .finally(() => setLoading(false));
  }, [parentId]);

  useEffect(() => {
    loadDashboard();
  }, [loadDashboard]);

  const submitLink = async (event) => {
    event.preventDefault();
    setMessage("");
    const response = await fetch("/api/parent/link-student", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ parent_id: parentId, student_email: studentEmail, relationship }),
    });
    const data = await response.json().catch(() => ({}));
    setMessage(data.message || data.error || "Ward link request submitted.");
    if (response.ok) {
      setStudentEmail("");
      loadDashboard();
    }
  };

  const submitMeeting = async (event) => {
    event.preventDefault();
    setMessage("");
    const response = await fetch("/api/parent/meetings", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ parent_id: parentId, ...meeting }),
    });
    const data = await response.json().catch(() => ({}));
    setMessage(data.error || "Feedback meeting request submitted.");
    if (response.ok) {
      setMeeting({ student_id: "", requested_slot: "", topic: "Performance feedback", notes: "" });
      loadDashboard();
    }
  };

  const verifiedWards = dashboard.wards.filter((ward) => ward.status === "verified");
  const averageScore = dashboard.results.length
    ? Math.round(dashboard.results.reduce((total, row) => total + Number(row.total_marks || 0), 0) / dashboard.results.length)
    : 0;

  return (
    <DashboardLayout bgColor="transparent">
      <div className="role-panel-page parent-panel-page">
        <header className="role-panel-topbar">
          <div className="role-panel-title">
            <button
              type="button"
              className="role-panel-icon-button"
              aria-label="Toggle sidebar"
              onClick={() => setMiniSidenav(dispatch, !miniSidenav)}
            >
              <span className="material-icons-round">menu</span>
            </button>
            <div>
              <span>ExamPulse parent</span>
              <h1>Ward performance panel</h1>
            </div>
          </div>

          <div className="role-panel-tools">
            <label className="role-panel-search" htmlFor="parent-search">
              <span className="material-icons-round">search</span>
              <input id="parent-search" type="search" placeholder="Search ward results and meetings" />
            </label>
            <button type="button" className="role-panel-profile-chip" onClick={() => navigate("/dashboard")}>
              <span>{firstName.charAt(0).toUpperCase()}</span>
              <strong>{firstName}</strong>
            </button>
          </div>
        </header>

        <section className="role-panel-hero">
          <div className="role-panel-hero-grid" aria-hidden="true" />
          <div className="role-panel-hero-copy">
            <span className="role-panel-pill">
              <span className="material-icons-round">family_restroom</span>
              Parent workspace
            </span>
            <h2>Track ward results, exam history, and feedback meetings in one place.</h2>
            <p>
              Parents can verify linked students, review cumulative and exam-wise scores, and request
              a feedback call after important exams.
            </p>
            <div className="role-panel-hero-actions">
              <button type="button" onClick={() => document.getElementById("parent-link-form")?.scrollIntoView({ behavior: "smooth" })}>
                Link Ward
                <span className="material-icons-round">arrow_forward</span>
              </button>
              <button type="button" onClick={() => document.getElementById("parent-meeting-form")?.scrollIntoView({ behavior: "smooth" })}>
                Schedule Feedback
              </button>
            </div>
          </div>

          <div className="role-panel-hero-visual" aria-label="Animated parent result review illustration">
            <div className="role-panel-floating-card one">
              <span>Wards</span>
              <strong>{verifiedWards.length}</strong>
            </div>
            <div className="role-panel-floating-card two">
              <span>Avg</span>
              <strong>{averageScore}</strong>
            </div>
            <div className="role-panel-console">
              <div className="role-panel-console-top"><span /><span /><span /></div>
              <div className="role-panel-console-body"><i /><i /><b /><b /><b /></div>
            </div>
          </div>
        </section>

        {dashboard.setup_required && (
          <section id="parent-ml-alerts" className="role-panel-workspace" style={{ marginBottom: 18 }}>
            <div className="role-panel-workspace-head">
              <span className="material-icons-round">database</span>
              <div>
                <small>Database setup required</small>
                <h3>{dashboard.message}</h3>
              </div>
            </div>
          </section>
        )}

        <section className="role-panel-stat-grid" aria-label="Parent highlights">
          <div className="role-panel-stat-card"><span className="material-icons-round">school</span><div><small>Linked Wards</small><strong>{dashboard.wards.length}</strong><em>Pending and verified</em></div></div>
          <div className="role-panel-stat-card"><span className="material-icons-round">verified</span><div><small>Verified</small><strong>{verifiedWards.length}</strong><em>Allowed result access</em></div></div>
          <div className="role-panel-stat-card"><span className="material-icons-round">bar_chart</span><div><small>Results</small><strong>{dashboard.results.length}</strong><em>Exam-wise records</em></div></div>
          <div className="role-panel-stat-card"><span className="material-icons-round">event_available</span><div><small>Meetings</small><strong>{dashboard.meetings.length}</strong><em>Feedback requests</em></div></div>
        </section>

        {predictiveAlerts.length > 0 && (
          <section className="role-panel-workspace" style={{ marginBottom: 18 }}>
            <div className="role-panel-workspace-head">
              <span className="material-icons-round">psychology</span>
              <div>
                <small>ML predictive alerts</small>
                <h3>At-risk trend analysis for linked wards</h3>
              </div>
            </div>
            <div className="role-panel-overview-grid">
              {predictiveAlerts.map((alert) => (
                <article className={`role-panel-overview-card ml-alert ${alert.at_risk ? "danger" : "stable"}`} key={alert.student_id}>
                  <span className="material-icons-round">{alert.at_risk ? "warning" : "verified"}</span>
                  <small>{alert.at_risk ? "Performance Alert" : "Stable"}</small>
                  <strong>{alert.student_name}</strong>
                  <em>
                    Risk {alert.risk_score}% | Latest {alert.latest_score}% | Trend {alert.trend}
                  </em>
                  {alert.meeting_recommended && (
                    <button
                      type="button"
                      onClick={() =>
                        setMeeting((current) => ({
                          ...current,
                          student_id: String(alert.student_id),
                          topic: "ML at-risk performance feedback",
                          notes: alert.message,
                        }))
                      }
                    >
                      Prepare Meeting Request
                    </button>
                  )}
                </article>
              ))}
            </div>
          </section>
        )}

        {message && <p className="role-panel-workspace" style={{ padding: 14, marginBottom: 18 }}>{message}</p>}

        <section className="role-panel-workspace">
          <div className="role-panel-workspace-head">
            <span className="material-icons-round">{loading ? "hourglass_top" : "family_restroom"}</span>
            <div>
              <small>Ward links</small>
              <h3>Verify the students you want to follow</h3>
            </div>
          </div>
          <form id="parent-link-form" className="role-panel-overview-grid" onSubmit={submitLink}>
            <label className="role-panel-overview-card">
              <small>Student email</small>
              <input value={studentEmail} onChange={(event) => setStudentEmail(event.target.value)} placeholder="student@example.com" />
            </label>
            <label className="role-panel-overview-card">
              <small>Relationship</small>
              <input value={relationship} onChange={(event) => setRelationship(event.target.value)} placeholder="Parent" />
            </label>
            <button type="submit" className="role-panel-overview-card">
              <span className="material-icons-round">person_add</span>
              <strong>Submit Link Request</strong>
              <em>Admin can verify the ward relation.</em>
            </button>
          </form>
        </section>

        <section id="parent-results" className="role-panel-workspace" style={{ marginTop: 18 }}>
          <div className="role-panel-workspace-head">
            <span className="material-icons-round">analytics</span>
            <div>
              <small>Exam results</small>
              <h3>Cumulative and exam-wise result review</h3>
            </div>
          </div>
          <div className="role-panel-overview-grid">
            {(dashboard.results.length ? dashboard.results : [{ exam_title: "No verified results yet", total_marks: "-", answered: "-", not_answered: "-", created_at: "" }]).map((row, index) => (
              <article className="role-panel-overview-card" key={`${row.exam_id || "empty"}-${index}`}>
                <span className="material-icons-round">bar_chart</span>
                <small>{row.created_at ? new Date(row.created_at).toLocaleDateString() : "Waiting for results"}</small>
                <strong>{row.exam_title || "Exam result"}</strong>
                <em>Score {row.total_marks} | Answered {row.answered} | Skipped {row.not_answered}</em>
              </article>
            ))}
          </div>
        </section>

        <section className="role-panel-workspace" style={{ marginTop: 18 }}>
          <div className="role-panel-workspace-head">
            <span className="material-icons-round">event_available</span>
            <div>
              <small>Feedback meetings</small>
              <h3>Request a call with the academic team</h3>
            </div>
          </div>
          <form id="parent-meeting-form" className="role-panel-overview-grid" onSubmit={submitMeeting}>
            <label className="role-panel-overview-card">
              <small>Student</small>
              <select value={meeting.student_id} onChange={(event) => setMeeting((current) => ({ ...current, student_id: event.target.value }))}>
                <option value="">Select verified ward</option>
                {verifiedWards.map((ward) => <option value={ward.student_id} key={ward.student_id}>{ward.student_name}</option>)}
              </select>
            </label>
            <label className="role-panel-overview-card">
              <small>Preferred slot</small>
              <input type="datetime-local" value={meeting.requested_slot} onChange={(event) => setMeeting((current) => ({ ...current, requested_slot: event.target.value }))} />
            </label>
            <label className="role-panel-overview-card">
              <small>Notes</small>
              <input value={meeting.notes} onChange={(event) => setMeeting((current) => ({ ...current, notes: event.target.value }))} placeholder="Topics to discuss" />
            </label>
            <button type="submit" className="role-panel-overview-card">
              <span className="material-icons-round">send</span>
              <strong>Request Meeting</strong>
              <em>Track status from this panel.</em>
            </button>
          </form>
        </section>
      </div>
    </DashboardLayout>
  );
}

export default ParentPanel;
