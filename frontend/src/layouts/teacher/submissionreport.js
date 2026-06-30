import React, { useEffect, useMemo, useState } from "react";
import { Box, CircularProgress } from "@mui/material";
import StyledTextField from "components/StyledTextField";
import * as XLSX from "xlsx";

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

const statusClass = (status) => String(status || "not_started").toLowerCase().replace(/\s+/g, "_");

const SubmissionReport = () => {
  const [submissions, setSubmissions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filterSchool, setFilterSchool] = useState("");
  const [filterClass, setFilterClass] = useState("");
  const [filterExam, setFilterExam] = useState("");
  const [filterStudent, setFilterStudent] = useState("");
  const [filterStatus, setFilterStatus] = useState("");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");

  const fetchSubmissions = (queryParams = {}) => {
    setLoading(true);
    const params = new URLSearchParams();
    Object.entries(queryParams).forEach(([key, value]) => {
      if (value !== undefined && value !== null && String(value).trim() !== "") params.set(key, value);
    });
    const url = `/api/teacher/submissionreport${params.toString() ? `?${params.toString()}` : ""}`;
    fetch(url)
      .then((res) => res.json())
      .then((data) => {
        setSubmissions(Array.isArray(data.submissions) ? data.submissions : []);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  };

  useEffect(() => {
    fetchSubmissions();
  }, []);

  const stats = useMemo(() => {
    const completed = submissions.filter((row) => ["completed", "submitted"].includes(statusClass(row.status))).length;
    const inProgress = submissions.filter((row) => statusClass(row.status) === "in_progress").length;
    return { total: submissions.length, completed, inProgress };
  }, [submissions]);

  const applyFilters = () =>
    fetchSubmissions({
      schoolname: filterSchool,
      class: filterClass,
      exam_id: filterExam,
      student_id: filterStudent,
      status: filterStatus,
      start_date: startDate,
      end_date: endDate,
    });

  const clearFilters = () => {
    setFilterSchool("");
    setFilterClass("");
    setFilterExam("");
    setFilterStudent("");
    setFilterStatus("");
    setStartDate("");
    setEndDate("");
    fetchSubmissions();
  };

  const downloadExcelReport = () => {
    if (!submissions.length) return;
    const ws = XLSX.utils.json_to_sheet(submissions);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Submissions Report");
    XLSX.writeFile(wb, "submissions_report.xlsx");
  };

  return (
    <Box className="teacher-tool teacher-tool-submissions" sx={{ p: 0 }}>
      <section className="teacher-tool-hero">
        <div>
          <span className="teacher-tool-kicker">
            <span className="material-icons-round">bar_chart</span>
            Submissions
          </span>
          <h2>Review student submissions with quick filters.</h2>
          <p>
            Track exam attempts by school, class, student, status, and date range, then export the
            filtered result set.
          </p>
        </div>
        <div className="teacher-tool-actions">
          <button type="button" className="teacher-action-button primary" onClick={applyFilters}>
            <span className="material-icons-round">filter_alt</span>
            Filter
          </button>
          <button type="button" className="teacher-action-button success" onClick={downloadExcelReport} disabled={!submissions.length}>
            <span className="material-icons-round">download</span>
            Report
          </button>
        </div>
      </section>

      <div className="teacher-tool-stat-strip">
        <article>
          <strong>{stats.total}</strong>
          <span>Total submissions</span>
        </article>
        <article>
          <strong>{stats.completed}</strong>
          <span>Completed</span>
        </article>
        <article>
          <strong>{stats.inProgress}</strong>
          <span>In progress</span>
        </article>
        <article>
          <strong>{new Set(submissions.map((row) => row.exam_id)).size}</strong>
          <span>Exams represented</span>
        </article>
      </div>

      <section className="teacher-tool-filter-card">
        <div className="teacher-section-heading">
          <span className="teacher-tool-kicker">Filters</span>
          <h2>Submission Report</h2>
          <p>Use any combination of filters and refresh the table below.</p>
        </div>
        <div className="teacher-filter-grid">
          <StyledTextField label="School" size="small" value={filterSchool} onChange={(e) => setFilterSchool(e.target.value)} fullWidth />
          <StyledTextField label="Class" size="small" value={filterClass} onChange={(e) => setFilterClass(e.target.value)} fullWidth />
          <StyledTextField label="Exam ID" size="small" value={filterExam} onChange={(e) => setFilterExam(e.target.value)} fullWidth />
          <StyledTextField label="Student ID" size="small" value={filterStudent} onChange={(e) => setFilterStudent(e.target.value)} fullWidth />
          <StyledTextField select label="Status" size="small" value={filterStatus} onChange={(e) => setFilterStatus(e.target.value)} SelectProps={{ native: true }} fullWidth>
            <option value="">All Status</option>
            <option value="completed">completed</option>
            <option value="in_progress">in_progress</option>
            <option value="not_started">not_started</option>
            <option value="submitted">submitted</option>
          </StyledTextField>
          <StyledTextField label="From" type="date" size="small" value={startDate} onChange={(e) => setStartDate(e.target.value)} InputLabelProps={{ shrink: true }} fullWidth />
          <StyledTextField label="To" type="date" size="small" value={endDate} onChange={(e) => setEndDate(e.target.value)} InputLabelProps={{ shrink: true }} fullWidth />
          <div className="teacher-tool-actions">
            <button type="button" className="teacher-action-button primary" onClick={applyFilters}>
              Apply
            </button>
            <button type="button" className="teacher-action-button secondary" onClick={clearFilters}>
              Clear
            </button>
          </div>
        </div>
      </section>

      <section className="teacher-table-shell">
        <div className="teacher-table-title">
          <div>
            <span className="teacher-tool-kicker">Attempt records</span>
            <h3>Submissions</h3>
          </div>
          <span className="teacher-result-count">{submissions.length} result{submissions.length === 1 ? "" : "s"}</span>
        </div>

        {loading ? (
          <Box display="flex" justifyContent="center" alignItems="center" minHeight={140}>
            <CircularProgress />
          </Box>
        ) : submissions.length ? (
          <div className="teacher-table-scroll">
            <table className="teacher-data-table">
              <thead>
                <tr>
                  <th>Submission ID</th>
                  <th>Exam</th>
                  <th>Student</th>
                  <th>Start Time</th>
                  <th>End Time</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                {submissions.map((row) => (
                  <tr key={row.submission_id}>
                    <td>{row.submission_id}</td>
                    <td>
                      <strong>{row.exam_name || `Exam #${row.exam_id}`}</strong>
                      <small>Exam ID {row.exam_id}</small>
                    </td>
                    <td>
                      <strong>{row.student_name || `Student #${row.student_id}`}</strong>
                      <small>Student ID {row.student_id}</small>
                    </td>
                    <td>{formatDateTime(row.start_time)}</td>
                    <td>{formatDateTime(row.end_time)}</td>
                    <td>
                      <span className={`teacher-status-pill ${statusClass(row.status)}`}>{row.status}</span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="teacher-empty-state">No submissions found.</div>
        )}
      </section>
    </Box>
  );
};

export default SubmissionReport;
