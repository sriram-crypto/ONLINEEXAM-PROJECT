import React, { useEffect, useMemo, useState } from "react";
import { Box, CircularProgress } from "@mui/material";

const formatPercent = (value) => `${Number(value || 0).toFixed(1)}%`;

const riskClass = (value) => String(value || "Low").toLowerCase();

const formatDate = (value) => {
  if (!value) return "Not available";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "Not available";
  return date.toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" });
};

const subjectLabel = (subjects = []) =>
  subjects.length ? subjects.map((subject) => subject.subject_name).join(", ") : "No weak subject detected";

const clampPercent = (value) => Math.max(0, Math.min(100, Number(value || 0)));

function StudentAnalytics({ actor = "admin" }) {
  const actorLabel = actor === "teacher" ? "Teacher" : "Admin";
  const [payload, setPayload] = useState(null);
  const [examId, setExamId] = useState("");
  const [examOptions, setExamOptions] = useState([]);
  const [riskFilter, setRiskFilter] = useState("all");
  const [search, setSearch] = useState("");
  const [selectedStudentId, setSelectedStudentId] = useState(null);
  const [reloadKey, setReloadKey] = useState(0);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState("");

  useEffect(() => {
    const loadAnalytics = async () => {
      setLoading(true);
      setMessage("");
      const params = new URLSearchParams();
      if (examId) params.set("exam_id", examId);
      try {
        const response = await fetch(`/api/ml/student-analytics${params.toString() ? `?${params.toString()}` : ""}`);
        const data = await response.json().catch(() => ({}));
        if (!response.ok) throw new Error(data.error || data.details || "Unable to load student analytics.");
        setPayload(data);
        if (!examId && Array.isArray(data.available_exams)) setExamOptions(data.available_exams);
        if (data.students?.[0]) {
          setSelectedStudentId((current) =>
            current && data.students.some((student) => String(student.student_id) === String(current))
              ? current
              : data.students[0].student_id
          );
        }
      } catch (error) {
        setPayload(null);
        setMessage(error.message || "Unable to load student analytics.");
      } finally {
        setLoading(false);
      }
    };

    loadAnalytics();
  }, [examId, reloadKey]);

  const students = useMemo(() => payload?.students || [], [payload]);
  const summary = payload?.summary || {};
  const subjectOverview = useMemo(() => payload?.subject_overview || [], [payload]);
  const examOverview = useMemo(() => payload?.exam_overview || [], [payload]);

  const filteredStudents = useMemo(() => {
    const query = search.trim().toLowerCase();
    return students.filter((student) => {
      const matchesRisk = riskFilter === "all" || riskClass(student.risk_level) === riskFilter;
      const matchesSearch =
        !query ||
        [student.student_name, student.email, student.class, student.schoolname, subjectLabel(student.weak_subjects)]
          .join(" ")
          .toLowerCase()
          .includes(query);
      return matchesRisk && matchesSearch;
    });
  }, [riskFilter, search, students]);

  const selectedStudent =
    filteredStudents.find((student) => String(student.student_id) === String(selectedStudentId)) ||
    filteredStudents[0] ||
    null;

  const riskDistribution = useMemo(() => {
    const counts = { high: 0, medium: 0, low: 0 };
    filteredStudents.forEach((student) => {
      const level = riskClass(student.risk_level);
      counts[level] = (counts[level] || 0) + 1;
    });
    const total = filteredStudents.length || 1;
    return [
      { key: "high", label: "High", count: counts.high, width: (counts.high / total) * 100 },
      { key: "medium", label: "Medium", count: counts.medium, width: (counts.medium / total) * 100 },
      { key: "low", label: "Low", count: counts.low, width: (counts.low / total) * 100 },
    ];
  }, [filteredStudents]);

  const scoreBands = useMemo(() => {
    const bands = [
      { key: "critical", label: "0-39%", count: 0 },
      { key: "developing", label: "40-59%", count: 0 },
      { key: "steady", label: "60-79%", count: 0 },
      { key: "strong", label: "80-100%", count: 0 },
    ];
    filteredStudents.forEach((student) => {
      const percentage = Number(student.average_percentage || 0);
      if (percentage < 40) bands[0].count += 1;
      else if (percentage < 60) bands[1].count += 1;
      else if (percentage < 80) bands[2].count += 1;
      else bands[3].count += 1;
    });
    const maxCount = Math.max(1, ...bands.map((band) => band.count));
    return bands.map((band) => ({ ...band, height: (band.count / maxCount) * 100 }));
  }, [filteredStudents]);

  const topRiskStudents = useMemo(
    () => [...filteredStudents].sort((a, b) => Number(b.risk_score || 0) - Number(a.risk_score || 0)).slice(0, 7),
    [filteredStudents]
  );

  const subjectBars = useMemo(() => subjectOverview.slice(0, 7), [subjectOverview]);
  const examBars = useMemo(() => examOverview.slice(0, 7), [examOverview]);
  const selectedHistoryBars = useMemo(
    () => [...(selectedStudent?.exam_history || [])].slice(-6),
    [selectedStudent]
  );

  const statCards = [
    { label: "Students tracked", value: summary.students || 0, detail: `${summary.result_records || 0} result records` },
    { label: "Class average", value: formatPercent(summary.class_average), detail: `${summary.exams || 0} exams analyzed` },
    { label: "At risk", value: summary.at_risk_students || 0, detail: `${summary.high_risk_students || 0} high risk` },
    { label: "Weak flags", value: summary.weak_subject_flags || 0, detail: summary.top_weak_subject || "No weak subject yet" },
  ];

  return (
    <Box className="teacher-tool student-analytics-tool" sx={{ p: 0 }}>
      <section className="teacher-tool-hero">
        <div>
          <span className="teacher-tool-kicker">
            <span className="material-icons-round">psychology</span>
            ML student analytics
          </span>
          <h2>Find weak students, weak subjects, and exam performance trends.</h2>
          <p>
            {actorLabel}s can review overall percentages, subject-wise weakness, score trends,
            predictions, risk levels, and targeted actions for every student.
          </p>
        </div>
        <div className="teacher-tool-actions">
          <button type="button" className="teacher-action-button secondary" onClick={() => setReloadKey((value) => value + 1)}>
            <span className="material-icons-round">refresh</span>
            Refresh
          </button>
        </div>
      </section>

      <div className="teacher-tool-stat-strip">
        {statCards.map((stat) => (
          <article key={stat.label}>
            <strong>{stat.value}</strong>
            <span>{stat.label}</span>
            <small>{stat.detail}</small>
          </article>
        ))}
      </div>

      <section className="teacher-tool-filter-card">
        <div className="teacher-section-heading">
          <span className="teacher-tool-kicker">Filters</span>
          <h2>Student Performance Diagnostics</h2>
          <p>Filter by exam, risk level, student name, class, school, or weak subject.</p>
        </div>
        <div className="teacher-filter-grid">
          <label>
            <span>Exam</span>
            <select value={examId} onChange={(event) => setExamId(event.target.value)}>
              <option value="">All exams</option>
              {examOptions.map((exam) => (
                <option value={exam.exam_id} key={exam.exam_id}>
                  {exam.exam_title} ({formatPercent(exam.average_percentage)})
                </option>
              ))}
            </select>
          </label>
          <label>
            <span>Risk level</span>
            <select value={riskFilter} onChange={(event) => setRiskFilter(event.target.value)}>
              <option value="all">All risk levels</option>
              <option value="high">High</option>
              <option value="medium">Medium</option>
              <option value="low">Low</option>
            </select>
          </label>
          <label>
            <span>Search</span>
            <input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Student, class, school, subject" />
          </label>
          <div className="teacher-tool-actions">
            <button
              type="button"
              className="teacher-action-button secondary"
              onClick={() => {
                setExamId("");
                setRiskFilter("all");
                setSearch("");
              }}
            >
              Clear
            </button>
          </div>
        </div>
      </section>

      {message && <div className="teacher-result-count student-analytics-message">{message}</div>}

      <section className="student-visual-analytics" aria-label="Student analytics charts">
        <article className="teacher-tool-card student-chart-card">
          <div className="student-chart-head">
            <span className="teacher-tool-kicker">Risk spread</span>
            <h3>Risk Distribution</h3>
          </div>
          <div className="student-risk-stack" aria-label="Risk distribution stacked bar">
            {riskDistribution.map((risk) => (
              <span
                key={risk.key}
                className={`risk-${risk.key}`}
                style={{ width: `${Math.max(risk.count ? 8 : 0, risk.width)}%` }}
                title={`${risk.label}: ${risk.count}`}
              />
            ))}
          </div>
          <div className="student-risk-legend">
            {riskDistribution.map((risk) => (
              <span key={risk.key}>
                <i className={`risk-${risk.key}`} />
                {risk.label} <strong>{risk.count}</strong>
              </span>
            ))}
          </div>
        </article>

        <article className="teacher-tool-card student-chart-card">
          <div className="student-chart-head">
            <span className="teacher-tool-kicker">Score bands</span>
            <h3>Overall Percentage</h3>
          </div>
          <div className="student-score-band-chart">
            {scoreBands.map((band) => (
              <article key={band.key} className={`band-${band.key}`}>
                <div>
                  <span style={{ height: `${Math.max(band.count ? 12 : 3, band.height)}%` }} />
                </div>
                <strong>{band.count}</strong>
                <small>{band.label}</small>
              </article>
            ))}
          </div>
        </article>

        <article className="teacher-tool-card student-chart-card wide">
          <div className="student-chart-head">
            <span className="teacher-tool-kicker">Attention list</span>
            <h3>Top Risk Students</h3>
          </div>
          <div className="student-bar-list">
            {topRiskStudents.map((student) => (
              <div key={`risk-bar-${student.student_id}`}>
                <span>
                  <strong>{student.student_name}</strong>
                  <small>{formatPercent(student.average_percentage)} avg</small>
                </span>
                <i>
                  <b className={`risk-${riskClass(student.risk_level)}`} style={{ width: `${clampPercent(student.risk_score)}%` }} />
                </i>
                <em>{student.risk_score}</em>
              </div>
            ))}
            {!topRiskStudents.length && <div className="teacher-empty-state">No student risk data yet.</div>}
          </div>
        </article>

        <article className="teacher-tool-card student-chart-card wide">
          <div className="student-chart-head">
            <span className="teacher-tool-kicker">Exam graph</span>
            <h3>Exam Average Comparison</h3>
          </div>
          <div className="student-bar-list exam-bars">
            {examBars.map((exam) => (
              <div key={`exam-bar-${exam.exam_id}`}>
                <span>
                  <strong>{exam.exam_title}</strong>
                  <small>{exam.attempts} attempts | {formatPercent(exam.low_performer_ratio)} low performers</small>
                </span>
                <i>
                  <b style={{ width: `${clampPercent(exam.average_percentage)}%` }} />
                </i>
                <em>{formatPercent(exam.average_percentage)}</em>
              </div>
            ))}
            {!examBars.length && <div className="teacher-empty-state">No exam comparison data yet.</div>}
          </div>
        </article>
      </section>

      <section className="student-analytics-grid">
        <article className="teacher-table-shell">
          <div className="teacher-table-title">
            <div>
              <span className="teacher-tool-kicker">Student list</span>
              <h3>Weakness and Risk Ranking</h3>
            </div>
            <span className="teacher-result-count">{filteredStudents.length} student{filteredStudents.length === 1 ? "" : "s"}</span>
          </div>

          {loading ? (
            <Box display="flex" justifyContent="center" alignItems="center" minHeight={180}>
              <CircularProgress />
            </Box>
          ) : filteredStudents.length ? (
            <div className="teacher-table-scroll">
              <table className="teacher-data-table student-analytics-table">
                <thead>
                  <tr>
                    <th>Student</th>
                    <th>Overall</th>
                    <th>Latest Exam</th>
                    <th>Weak Subjects</th>
                    <th>Prediction</th>
                    <th>Risk</th>
                    <th>Action</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredStudents.map((student) => (
                    <tr
                      key={student.student_id}
                      className={String(student.student_id) === String(selectedStudent?.student_id) ? "selected" : ""}
                    >
                      <td>
                        <strong>{student.student_name}</strong>
                        <small>{student.email || "No email"} {student.class ? `| Class ${student.class}` : ""}</small>
                      </td>
                      <td>
                        <strong>{formatPercent(student.average_percentage)}</strong>
                        <small>Trend {student.trend >= 0 ? "+" : ""}{student.trend}</small>
                      </td>
                      <td>
                        <strong>{student.latest_exam?.exam_title || "No exam"}</strong>
                        <small>{formatPercent(student.latest_percentage)} | {formatDate(student.latest_exam?.created_at)}</small>
                      </td>
                      <td>
                        <div className="student-weak-pills">
                          {(student.weak_subjects || []).slice(0, 3).map((subject) => (
                            <span key={`${student.student_id}-${subject.subject_id || subject.subject_name}`}>
                              {subject.subject_name} {formatPercent(subject.percentage)}
                            </span>
                          ))}
                          {!student.weak_subjects?.length && <em>Stable</em>}
                        </div>
                      </td>
                      <td>
                        <strong>{student.predicted_score}%</strong>
                        <small>{student.predicted_range?.[0]}-{student.predicted_range?.[1]}% confidence {Math.round((student.prediction_confidence || 0) * 100)}%</small>
                      </td>
                      <td>
                        <span className={`teacher-status-pill risk-${riskClass(student.risk_level)}`}>{student.risk_level} {student.risk_score}</span>
                      </td>
                      <td>
                        <button type="button" className="teacher-action-button secondary" onClick={() => setSelectedStudentId(student.student_id)}>
                          Details
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="teacher-empty-state">No student analytics found.</div>
          )}
        </article>

        <aside className="student-analytics-side">
          <section className="teacher-tool-card">
            <div className="teacher-section-heading">
              <span className="teacher-tool-kicker">Weak subjects</span>
              <h2>Class Heatmap</h2>
            </div>
            <div className="student-subject-heatmap">
              {subjectBars.map((subject) => (
                <div key={subject.subject_id || subject.subject_name}>
                  <span>
                    <strong>{subject.subject_name}</strong>
                    <small>{subject.weak_students}/{subject.students} weak</small>
                  </span>
                  <i>
                    <b style={{ width: `${Math.min(100, subject.average_weakness_score || 0)}%` }} />
                  </i>
                  <em>{formatPercent(subject.average_percentage)}</em>
                </div>
              ))}
              {!subjectOverview.length && <div className="teacher-empty-state">No subject data yet.</div>}
            </div>
          </section>

          <section className="teacher-tool-card">
            <div className="teacher-section-heading">
              <span className="teacher-tool-kicker">Exam analytics</span>
              <h2>Exam Averages</h2>
            </div>
            <div className="student-exam-mini-list">
              {examOverview.slice(0, 6).map((exam) => (
                <article key={exam.exam_id}>
                  <strong>{exam.exam_title}</strong>
                  <span>{formatPercent(exam.average_percentage)} avg</span>
                  <small>{exam.attempts} attempts | {formatPercent(exam.low_performer_ratio)} low performers</small>
                </article>
              ))}
              {!examOverview.length && <div className="teacher-empty-state">No exam data yet.</div>}
            </div>
          </section>
        </aside>
      </section>

      {selectedStudent && (
        <section className="teacher-tool-card student-detail-card">
          <div className="teacher-table-title">
            <div>
              <span className="teacher-tool-kicker">Student details</span>
              <h3>{selectedStudent.student_name}</h3>
            </div>
            <span className={`teacher-status-pill risk-${riskClass(selectedStudent.risk_level)}`}>
              {selectedStudent.risk_level} risk {selectedStudent.risk_score}
            </span>
          </div>

          <div className="student-detail-grid">
            <div>
              <h4>Subject Breakdown</h4>
              <div className="student-subject-detail-list">
                {selectedStudent.subject_breakdown.length ? selectedStudent.subject_breakdown.map((subject) => (
                  <article key={subject.subject_id || subject.subject_name}>
                    <div>
                      <strong>{subject.subject_name}</strong>
                      <small>{subject.status} | weakness {subject.weakness_score}</small>
                    </div>
                    <span>{formatPercent(subject.percentage)}</span>
                    <i>
                      <b style={{ width: `${Math.min(100, subject.percentage || 0)}%` }} />
                    </i>
                  </article>
                )) : <div className="teacher-empty-state">No subject-level data yet.</div>}
              </div>
            </div>

            <div>
              <h4>Exam History</h4>
              <div className="student-timeline-bars">
                {selectedHistoryBars.map((exam) => (
                  <article key={`timeline-${selectedStudent.student_id}-${exam.exam_id}-${exam.created_at}`}>
                    <span style={{ height: `${Math.max(8, clampPercent(exam.percentage))}%` }} />
                    <strong>{formatPercent(exam.percentage)}</strong>
                    <small>{exam.exam_title}</small>
                  </article>
                ))}
              </div>
              <div className="student-exam-history">
                {selectedStudent.exam_history.map((exam) => (
                  <article key={`${selectedStudent.student_id}-${exam.exam_id}-${exam.created_at}`}>
                    <strong>{exam.exam_title}</strong>
                    <span>{formatPercent(exam.percentage)}</span>
                    <small>{formatDate(exam.created_at)} | {exam.correct_count} correct, {exam.wrong_count} wrong</small>
                  </article>
                ))}
              </div>
            </div>

            <div>
              <h4>ML Recommendations</h4>
              <ul className="student-recommendation-list">
                {selectedStudent.recommendations.map((recommendation) => (
                  <li key={recommendation}>{recommendation}</li>
                ))}
              </ul>
            </div>
          </div>
        </section>
      )}
    </Box>
  );
}

export default StudentAnalytics;
