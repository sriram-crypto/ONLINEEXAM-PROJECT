import React, { useEffect, useMemo, useState } from "react";
import * as XLSX from "xlsx";

const formatDateTime = (value) => {
  if (!value) return "Not set";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "Not set";
  return date.toLocaleString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
};

const isLiveExam = (exam) => {
  if (exam.status !== "active") return false;
  const now = Date.now();
  const start = exam.start_time ? new Date(exam.start_time).getTime() : 0;
  const end = exam.end_time ? new Date(exam.end_time).getTime() : Number.POSITIVE_INFINITY;
  return now >= start && now <= end;
};

function ActivateOrDeactivateExams() {
  const [exams, setExams] = useState([]);
  const [filters, setFilters] = useState({ search: "", course: "", status: "" });
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState("");
  const [busyExamId, setBusyExamId] = useState(null);
  const [riskScores, setRiskScores] = useState({});

  const fetchExams = async ({ keepMessage = false } = {}) => {
    setLoading(true);
    if (!keepMessage) setMessage("");
    try {
      const response = await fetch("/api/superadmin/activateOrDeactivateExams");
      const data = await response.json().catch(() => []);
      if (!response.ok) throw new Error(data.error || "Failed to load exams");
      setExams(Array.isArray(data) ? data : []);
      const riskResponse = await fetch("/api/ml/risk-score");
      const riskData = await riskResponse.json().catch(() => ({}));
      const riskMap = {};
      (Array.isArray(riskData.attempts) ? riskData.attempts : []).forEach((attempt) => {
        const existing = riskMap[attempt.exam_id];
        if (!existing || Number(attempt.risk_score || 0) > Number(existing.risk_score || 0)) {
          riskMap[attempt.exam_id] = attempt;
        }
      });
      setRiskScores(riskMap);
    } catch (error) {
      setMessage(error.message || "Unable to load current exams.");
      setExams([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchExams();
  }, []);

  const courses = useMemo(
    () => Array.from(new Set(exams.map((exam) => exam.course_name).filter(Boolean))).sort(),
    [exams]
  );

  const filteredExams = useMemo(() => {
    const search = filters.search.trim().toLowerCase();
    return exams.filter((exam) => {
      const text = `${exam.exam_name || ""} ${exam.course_name || ""} ${exam.subject_name || ""}`.toLowerCase();
      if (search && !text.includes(search)) return false;
      if (filters.course && exam.course_name !== filters.course) return false;
      if (filters.status && exam.status !== filters.status) return false;
      return true;
    });
  }, [exams, filters]);

  const counts = useMemo(
    () => ({
      total: exams.length,
      active: exams.filter((exam) => exam.status === "active").length,
      scheduled: exams.filter((exam) => exam.status === "scheduled").length,
      live: exams.filter(isLiveExam).length,
      highRisk: Object.values(riskScores).filter((risk) => risk.risk_level === "High").length,
    }),
    [exams, riskScores]
  );

  const handleCancelExam = async (exam) => {
    const ok = window.confirm(`Cancel "${exam.exam_name}"? Students will no longer see this exam as active or scheduled.`);
    if (!ok) return;

    setBusyExamId(exam.exam_id);
    setMessage("");
    try {
      const response = await fetch(`/api/superadmin/activateOrDeactivateExams/${exam.exam_id}/status`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: "cancelled" }),
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(data.error || "Failed to cancel exam");
      await fetchExams({ keepMessage: true });
      setMessage(`"${exam.exam_name}" was cancelled and removed from current exams.`);
    } catch (error) {
      setMessage(error.message || "Unable to cancel exam.");
    } finally {
      setBusyExamId(null);
    }
  };

  const downloadExcelReport = () => {
    const rows = filteredExams.map((exam) => ({
      "Exam ID": exam.exam_id,
      "Exam Name": exam.exam_name,
      Course: exam.course_name || "",
      Subjects: exam.subject_name || "",
      Status: exam.status,
      Questions: exam.question_count || 0,
      Marks: exam.total_marks || 0,
      "Start Time": formatDateTime(exam.start_time),
      "End Time": formatDateTime(exam.end_time),
      "ML Risk": riskScores[exam.exam_id]?.risk_score ?? "",
      "ML Risk Level": riskScores[exam.exam_id]?.risk_level ?? "",
    }));
    const sheet = XLSX.utils.json_to_sheet(rows);
    const book = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(book, sheet, "Current Exams");
    XLSX.writeFile(book, "current_active_scheduled_exams.xlsx");
  };

  return (
    <div className="sa-current-tool">
      <section className="sa-tool-hero">
        <div>
          <span className="sa-tool-kicker">Current exam control</span>
          <h2>Active and scheduled exams only</h2>
          <p>Exam status is synced with the time window whenever this screen loads. Live exams stay at the top.</p>
        </div>
        <div className="sa-tool-actions">
          <button type="button" className="sa-button secondary" onClick={fetchExams} disabled={loading}>
            <span className="material-icons-round">sync</span>
            Refresh & Sync
          </button>
          <button type="button" className="sa-button primary" onClick={downloadExcelReport} disabled={!filteredExams.length}>
            <span className="material-icons-round">download</span>
            Export
          </button>
        </div>
      </section>

      <section className="sa-metric-row" aria-label="Exam counts">
        <article><strong>{counts.total}</strong><span>Current exams</span></article>
        <article><strong>{counts.live}</strong><span>Live now</span></article>
        <article><strong>{counts.active}</strong><span>Active</span></article>
        <article><strong>{counts.scheduled}</strong><span>Scheduled</span></article>
        <article><strong>{counts.highRisk}</strong><span>High risk attempts</span></article>
      </section>

      <section className="sa-filter-panel">
        <label>
          <span>Search</span>
          <input
            type="search"
            placeholder="Exam, course, subject"
            value={filters.search}
            onChange={(event) => setFilters((current) => ({ ...current, search: event.target.value }))}
          />
        </label>
        <label>
          <span>Course</span>
          <select value={filters.course} onChange={(event) => setFilters((current) => ({ ...current, course: event.target.value }))}>
            <option value="">All courses</option>
            {courses.map((course) => <option value={course} key={course}>{course}</option>)}
          </select>
        </label>
        <label>
          <span>Status</span>
          <select value={filters.status} onChange={(event) => setFilters((current) => ({ ...current, status: event.target.value }))}>
            <option value="">Active and scheduled</option>
            <option value="active">Active</option>
            <option value="scheduled">Scheduled</option>
          </select>
        </label>
        <button type="button" className="sa-button secondary" onClick={() => setFilters({ search: "", course: "", status: "" })}>
          Clear
        </button>
      </section>

      {message && <div className="sa-inline-message">{message}</div>}

      <section className="sa-table-shell">
        <div className="sa-table-title">
          <div>
            <span className="sa-tool-kicker">Exam list</span>
            <h3>{loading ? "Loading current exams" : `Showing ${filteredExams.length} exams`}</h3>
          </div>
        </div>

        <div className="sa-table-scroll">
          <table className="sa-data-table">
            <thead>
              <tr>
                <th>Exam</th>
                <th>Course / Subjects</th>
                <th>Schedule</th>
                <th>Questions</th>
                <th>ML Risk</th>
                <th>Status</th>
                <th>Action</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={7} className="sa-empty-cell">Loading exams...</td></tr>
              ) : filteredExams.length === 0 ? (
                <tr><td colSpan={7} className="sa-empty-cell">No active or scheduled exams match the filters.</td></tr>
              ) : (
                filteredExams.map((exam, index) => (
                  <tr className={isLiveExam(exam) ? "live-row" : ""} key={exam.exam_id}>
                    <td>
                      <div className="sa-exam-title">
                        <span>{index + 1}</span>
                        <div>
                          <strong>{exam.exam_name}</strong>
                          <small>ID #{exam.exam_id}</small>
                        </div>
                      </div>
                    </td>
                    <td>
                      <strong>{exam.course_name || "No course"}</strong>
                      <small>{exam.subject_name || "No subjects mapped"}</small>
                    </td>
                    <td>
                      <strong>{formatDateTime(exam.start_time || exam.exam_date)}</strong>
                      <small>Ends {formatDateTime(exam.end_time)}</small>
                    </td>
                    <td>
                      <strong>{exam.question_count || 0} Qs</strong>
                      <small>{exam.total_marks || 0} marks</small>
                    </td>
                    <td>
                      <span className={`sa-status-pill risk-${(riskScores[exam.exam_id]?.risk_level || "Low").toLowerCase()}`}>
                        {riskScores[exam.exam_id]?.risk_score ?? 0}
                      </span>
                      <small>{riskScores[exam.exam_id]?.risk_level || "Low"} risk</small>
                    </td>
                    <td>
                      <span className={`sa-status-pill ${isLiveExam(exam) ? "live" : exam.status}`}>
                        {isLiveExam(exam) ? "Live now" : exam.status}
                      </span>
                    </td>
                    <td>
                      <button
                        type="button"
                        className="sa-button danger"
                        onClick={() => handleCancelExam(exam)}
                        disabled={busyExamId === exam.exam_id}
                      >
                        <span className="material-icons-round">cancel</span>
                        {busyExamId === exam.exam_id ? "Cancelling" : "Cancel"}
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}

export default ActivateOrDeactivateExams;
