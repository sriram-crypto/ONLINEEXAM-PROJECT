import React, { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";

import DashboardLayout from "examples/LayoutContainers/DashboardLayout";
import {
  StudentEmptyState,
  StudentHero,
  StudentStatCard,
  StudentTopbar,
} from "./StudentDashboardChrome";

import "./student-dashboard.css";

const readUser = () => {
  try {
    return JSON.parse(localStorage.getItem("user") || "{}");
  } catch (error) {
    return {};
  }
};

const categoryMap = { 3: "Science", 1: "Math", 2: "English" };
const courseMap = { 10: "Physics", 11: "Chemistry", 12: "Biology" };
const subjectMap = { 27: "Mechanics", 28: "Organic", 29: "Botany" };

const getGrade = (percentage) => {
  if (percentage >= 90) return { grade: "A", color: "#38a169" };
  if (percentage >= 80) return { grade: "B", color: "#2d6cdf" };
  if (percentage >= 70) return { grade: "C", color: "#f4a62a" };
  if (percentage >= 60) return { grade: "D", color: "#7161ef" };
  return { grade: "E", color: "#e96459" };
};

const calculatePercentage = (result, isPractice) => {
  if (isPractice) {
    const total = result.num_questions || 1;
    const correct = result.correct_count || 0;
    return Math.min(Math.round((correct / total) * 100), 100);
  }
  const correct = result.correct_count || 0;
  const total = (result.correct_count || 0) + (result.wrong_count || 0) + (result.not_answered || 0);
  if (total === 0) return 0;
  return Math.min(Math.round((correct / total) * 100), 100);
};

function MyResults() {
  const navigate = useNavigate();
  const user = useMemo(readUser, []);
  const studentId = user.id || user.user_id;
  const [results, setResults] = useState([]);
  const [practiceResults, setPracticeResults] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [selectedResult, setSelectedResult] = useState(null);
  const [resultDetails, setResultDetails] = useState(null);
  const [detailsLoading, setDetailsLoading] = useState(false);
  const [mlPrediction, setMlPrediction] = useState(null);
  const [weakAnalytics, setWeakAnalytics] = useState(null);

  useEffect(() => {
    const fetchData = async () => {
      if (!studentId) {
        setError("Please sign in to view results.");
        setLoading(false);
        return;
      }

      setLoading(true);
      setError("");
      try {
        const response = await fetch(`/api/student/results/all?student_id=${studentId}`);
        const data = await response.json();
        setResults(Array.isArray(data.results) ? data.results : []);
        setPracticeResults(Array.isArray(data.practice) ? data.practice : []);
      } catch (requestError) {
        setResults([]);
        setPracticeResults([]);
        setError("Unable to load results right now.");
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [studentId]);

  useEffect(() => {
    if (!studentId) return;
    Promise.all([
      fetch(`/api/ml/predict-score?student_id=${studentId}`).then((response) => response.json()),
      fetch(`/api/ml/weak-chapters?student_id=${studentId}`).then((response) => response.json()),
    ])
      .then(([prediction, weakChapters]) => {
        setMlPrediction(prediction?.predicted_score ? prediction : null);
        setWeakAnalytics(weakChapters?.chapters ? weakChapters : null);
      })
      .catch(() => {
        setMlPrediction(null);
        setWeakAnalytics(null);
      });
  }, [studentId]);

  const allResults = useMemo(() => {
    const finalExams = results.map((result) => ({
      ...result,
      type: "Final",
      percentage: calculatePercentage(result, false),
      exam_date: result.exam_date || result.created_at || result.end_time || result.start_time,
      title: result.exam_name || `Exam #${result.exam_id}`,
      correct: result.correct_count || 0,
      wrong: result.wrong_count || 0,
      total_questions: (result.correct_count || 0) + (result.wrong_count || 0) + (result.not_answered || 0),
    }));

    const practiceExams = practiceResults.map((result) => ({
      ...result,
      type: "Practice",
      percentage: calculatePercentage(result, true),
      category: categoryMap[String(result.category)] || result.category || "General",
      course: courseMap[String(result.course)] || result.course || "General",
      subject: subjectMap[String(result.subject)] || result.subject || "General",
      exam_date: result.created_at || result.end_time || result.start_time,
      title: `${result.category || "Practice"} - ${result.subject || "Test"}`,
      correct: result.correct_count || 0,
      wrong: result.wrong_count || 0,
      total_questions: result.num_questions || (result.correct_count || 0) + (result.wrong_count || 0) + (result.not_answered || 0),
    }));

    return [...finalExams, ...practiceExams].sort((a, b) => new Date(b.exam_date || 0) - new Date(a.exam_date || 0));
  }, [practiceResults, results]);

  const stats = useMemo(() => {
    if (allResults.length === 0) return { total: 0, average: 0, best: 0, grade: "-" };
    const percentages = allResults.map((item) => item.percentage);
    const average = Math.round(percentages.reduce((total, value) => total + value, 0) / percentages.length);
    const best = Math.max(...percentages);
    return { total: allResults.length, average, best, grade: getGrade(average).grade };
  }, [allResults]);

  const gradeDistribution = useMemo(
    () => ({
      A: allResults.filter((item) => item.percentage >= 90).length,
      B: allResults.filter((item) => item.percentage >= 80 && item.percentage < 90).length,
      C: allResults.filter((item) => item.percentage >= 70 && item.percentage < 80).length,
      D: allResults.filter((item) => item.percentage >= 60 && item.percentage < 70).length,
      E: allResults.filter((item) => item.percentage < 60).length,
    }),
    [allResults]
  );

  const fetchResultDetails = async (result) => {
    if (result.type === "Practice") {
      setSelectedResult(result);
      setResultDetails({
        subject_results: [
          {
            subject: result.subject || "General",
            category: result.category,
            course: result.course,
            totalQuestions: result.num_questions || 1,
            correct: result.correct_count || 0,
            wrong: result.wrong_count || 0,
            notAttempted: result.not_attempted_count || 0,
            totalMarks: result.num_questions || 1,
            obtainedMarks: result.total_marks || 0,
          },
        ],
        result: {
          total_questions: result.num_questions || 1,
          correct: result.correct_count || 0,
          wrong: result.wrong_count || 0,
          not_attempted: result.not_attempted_count || 0,
          percentage: result.total_marks || 0,
        },
      });
      return;
    }

    setDetailsLoading(true);
    try {
      const response = await fetch(`/api/student/myexam/result?exam_id=${result.exam_id}&student_id=${studentId}`);
      const data = await response.json();
      setSelectedResult(result);
      setResultDetails(data);
    } catch (requestError) {
      setSelectedResult(result);
      setResultDetails({
        subject_results: [
          {
            subject: "General",
            totalQuestions: result.total_questions || 1,
            correct: result.correct_count || 0,
            wrong: result.wrong_count || 0,
            notAttempted: result.not_attempted_count || 0,
            totalMarks: result.total_questions || 1,
            obtainedMarks: result.total_marks || 0,
          },
        ],
        result: {
          total_questions: result.total_questions || 1,
          correct: result.correct_count || 0,
          wrong: result.wrong_count || 0,
          not_attempted: result.not_attempted_count || 0,
          percentage: calculatePercentage(result, false),
        },
      });
    } finally {
      setDetailsLoading(false);
    }
  };

  const closeDetails = () => {
    setSelectedResult(null);
    setResultDetails(null);
  };

  const ResultDetailModal = () => {
    if (!selectedResult || !resultDetails) return null;

    const result = resultDetails.result || {};
    const correct = result.correct || selectedResult.correct_count || 0;
    const totalQuestions = result.total_questions || selectedResult.total_questions || 1;
    const percentage = totalQuestions > 0 ? Math.round((correct / totalQuestions) * 100) : 0;
    const grade = getGrade(percentage);
    const subjectResults = Array.isArray(resultDetails.subject_results) ? resultDetails.subject_results : [];

    return (
      <div className="student-modal-backdrop" onClick={closeDetails}>
        <article className="student-modal-card" onClick={(event) => event.stopPropagation()}>
          <header className="student-modal-head">
            <span className="student-overline" style={{ color: "#94f4e9" }}>Result analysis</span>
            <h2 style={{ margin: "8px 0 6px" }}>{selectedResult.title || "Exam Result"}</h2>
            <p style={{ margin: 0, color: "rgba(255,255,255,0.76)" }}>
              Grade {grade.grade} with {percentage}% accuracy
            </p>
          </header>
          <div className="student-modal-body">
            <div className="student-grid-4 student-section">
              <StudentStatCard icon="check_circle" label="Correct" value={correct} detail="Answers" tone="green" />
              <StudentStatCard icon="cancel" label="Wrong" value={result.wrong || selectedResult.wrong_count || 0} detail="Review these" tone="coral" />
              <StudentStatCard icon="pending_actions" label="Skipped" value={result.not_attempted || selectedResult.not_attempted_count || 0} detail="Not attempted" tone="amber" />
              <StudentStatCard icon="percent" label="Score" value={`${percentage}%`} detail={`Grade ${grade.grade}`} tone="blue" />
            </div>

            <div className="student-progress-list">
              {subjectResults.map((subject, index) => {
                const subjectCorrect = subject.correct || subject.obtainedMarks || 0;
                const subjectTotal = subject.totalQuestions || 1;
                const subjectPercentage = subjectTotal > 0 ? Math.round((subjectCorrect / subjectTotal) * 100) : 0;
                return (
                  <div className="student-progress-row" key={`${subject.subject || "Subject"}-${index}`}>
                    <div>
                      <span>{subject.subject || "General"}</span>
                      <span>{subjectCorrect} / {subjectTotal}</span>
                    </div>
                    <div className="student-progress-track">
                      <i style={{ width: `${Math.min(subjectPercentage, 100)}%` }} />
                    </div>
                  </div>
                );
              })}
            </div>

            <div className="student-inline-actions" style={{ justifyContent: "flex-end", marginTop: 20 }}>
              <button type="button" className="student-action-button" onClick={closeDetails}>
                Close
                <span className="material-icons-round">close</span>
              </button>
            </div>
          </div>
        </article>
      </div>
    );
  };

  return (
    <DashboardLayout bgColor="transparent">
      <main className="student-page">
        <StudentTopbar title="My Results" />

        <StudentHero
          kicker="Score analytics"
          title="Turn every exam attempt into your next study plan."
          description="Review final exams and practice tests together, compare score movement, and open result details for subject-wise feedback."
          primary={{ label: "Start Practice", icon: "play_circle", onClick: () => navigate("/student/mypractice") }}
          secondary={{ label: "My Exams", onClick: () => navigate("/student/myexam") }}
          metrics={[
            { value: stats.total, label: "Total results" },
            { value: `${stats.average}%`, label: "Average score" },
            { value: `${stats.best}%`, label: "Best score" },
          ]}
        />

        {error && <p className="student-form-note student-section">{error}</p>}

        <section className="student-grid-4 student-section" aria-label="Result summary">
          <StudentStatCard icon="assignment_turned_in" label="Total Exams" value={stats.total} detail="Final and practice" tone="blue" />
          <StudentStatCard icon="trending_up" label="Average Score" value={`${stats.average}%`} detail="Across all results" tone="teal" />
          <StudentStatCard icon="star" label="Best Score" value={`${stats.best}%`} detail="Highest performance" tone="amber" />
          <StudentStatCard icon="military_tech" label="Overall Grade" value={stats.grade} detail="Based on average" tone="green" />
        </section>

        {(mlPrediction || weakAnalytics) && (
          <section className="student-ml-strip student-section">
            {mlPrediction && (
              <article className="student-card student-ml-panel">
                <div>
                  <span className="student-overline">ML prediction</span>
                  <h3>Expected next score</h3>
                </div>
                <strong>{mlPrediction.range?.[0]}-{mlPrediction.range?.[1]}%</strong>
                <small>{mlPrediction.factors?.[1] || "Trend model uses recent attempts."}</small>
              </article>
            )}
            {weakAnalytics && (
              <article className="student-card student-ml-panel wide">
                <div>
                  <span className="student-overline">Weak chapter detection</span>
                  <h3>Revision heatmap</h3>
                </div>
                <div className="student-heatmap">
                  {(weakAnalytics.heatmap || []).slice(0, 8).map((item) => (
                    <span
                      key={`${item.subject}-${item.label}`}
                      className={item.value < 50 ? "danger" : item.value < 70 ? "warn" : "ok"}
                      title={`${item.subject}: ${item.value}%`}
                    >
                      {item.label}
                    </span>
                  ))}
                  {(!weakAnalytics.heatmap || weakAnalytics.heatmap.length === 0) && <small>No chapter-level answers available yet.</small>}
                </div>
              </article>
            )}
            {weakAnalytics?.recommended_study_hours > 0 && (
              <article className="student-card student-ml-panel">
                <div>
                  <span className="student-overline">Study time</span>
                  <h3>Recommended focus</h3>
                </div>
                <strong>{weakAnalytics.recommended_study_hours} hrs</strong>
                <small>{weakAnalytics.weak_topics?.[0]?.chapter_name || "Prioritize lower accuracy chapters."}</small>
              </article>
            )}
          </section>
        )}

        <section className="student-main-grid student-section">
          <article className="student-card">
            <div className="student-card-head">
              <div>
                <span className="student-overline">Grade spread</span>
                <h3>Performance distribution</h3>
              </div>
            </div>
            <div className="student-progress-list">
              {Object.entries(gradeDistribution).map(([grade, count]) => (
                <div className="student-progress-row" key={grade}>
                  <div>
                    <span>Grade {grade}</span>
                    <span>{count} result{count === 1 ? "" : "s"}</span>
                  </div>
                  <div className="student-progress-track">
                    <i style={{ width: `${stats.total ? Math.round((count / stats.total) * 100) : 0}%` }} />
                  </div>
                </div>
              ))}
            </div>
          </article>

          <article className="student-card">
            <div className="student-card-head">
              <div>
                <span className="student-overline">Next move</span>
                <h3>Revision checklist</h3>
              </div>
            </div>
            <div className="student-tips-list">
              <span><span className="material-icons-round">fact_check</span> Open each low-score result and review wrong answers.</span>
              <span><span className="material-icons-round">auto_stories</span> Create practice sets for the weakest subject.</span>
              <span><span className="material-icons-round">timer</span> Repeat under timed conditions before the next exam.</span>
            </div>
          </article>
        </section>

        <section className="student-card student-section">
          <div className="student-card-head">
            <div>
              <span className="student-overline">Result history</span>
              <h3>All attempts</h3>
            </div>
          </div>

          {loading ? (
            <StudentEmptyState icon="hourglass_top" title="Loading results" text="Your score history is being prepared." />
          ) : allResults.length === 0 ? (
            <StudentEmptyState
              icon="analytics"
              title="No results yet"
              text="Complete an exam or practice test to see your score cards here."
            />
          ) : (
            <div className="student-grid-3">
              {allResults.map((result, index) => {
                const grade = getGrade(result.percentage);
                const examDate = result.attempt_time || result.exam_date;
                const examTitle = result.type === "Practice"
                  ? `Practice Exam #${result.student_exam_id || index + 1}`
                  : result.title || result.exam_name || "Final Exam";

                return (
                  <button
                    type="button"
                    className="student-result-card"
                    style={{ "--result-color": grade.color }}
                    key={result.result_id || result.student_exam_id || index}
                    onClick={() => fetchResultDetails(result)}
                  >
                    <div className="student-result-card-head">
                      <span>
                        <strong>{examTitle}</strong>
                        <small>{examDate ? new Date(examDate).toLocaleDateString() : "Date unavailable"}</small>
                      </span>
                      <span className="student-result-score">
                        <strong>{result.percentage}%</strong>
                        <small>Grade {grade.grade}</small>
                      </span>
                    </div>
                    <div className="student-progress-track">
                      <i style={{ width: `${result.percentage}%`, background: grade.color }} />
                    </div>
                    <div className="student-result-meta">
                      <span>{result.type}</span>
                      <span>{result.correct || 0} correct</span>
                      <span>Open details</span>
                    </div>
                  </button>
                );
              })}
            </div>
          )}
        </section>

        {detailsLoading && (
          <div className="student-modal-backdrop">
            <article className="student-modal-card">
              <div className="student-modal-body">
                <StudentEmptyState icon="hourglass_top" title="Loading result" text="Opening detailed performance data." />
              </div>
            </article>
          </div>
        )}
        <ResultDetailModal />
      </main>
    </DashboardLayout>
  );
}

export default MyResults;
