import React, { useEffect, useMemo, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";

import DashboardLayout from "examples/LayoutContainers/DashboardLayout";
import { StudentEmptyState, StudentTopbar } from "./StudentDashboardChrome";

import "./student-dashboard.css";

const readUser = () => {
  try {
    return JSON.parse(localStorage.getItem("user") || "{}");
  } catch (error) {
    return {};
  }
};

const normalize = (value) => String(value || "").replace(/\s+/g, " ").trim().toLowerCase();

const isSubjectiveFeedback = (question) =>
  question?.is_subjective ||
  question?.answer_mode === "text" ||
  question?.grading_mode === "ml_subjective" ||
  [11, 12, 13].includes(Number(question?.question_type_id || 0)) ||
  /\b(subjective|short answer|long answer)\b/i.test(question?.question_type_name || "");

function OptionReview({ option, label, selectedAnswer, selectedOption, correctAnswer, correctOption }) {
  const isSelected = normalize(selectedOption) === normalize(label) || normalize(selectedAnswer) === normalize(option.text);
  const isCorrect = normalize(correctOption) === normalize(label) || normalize(correctAnswer) === normalize(option.text);

  return (
    <div className={`exam-review-option ${isCorrect ? "correct" : ""} ${isSelected && !isCorrect ? "wrong" : ""}`}>
      <strong>{label}</strong>
      <span>{option.text || "Image option"}</span>
      {isSelected && <em>Your answer</em>}
      {isCorrect && <em>Correct answer</em>}
      {option.image && <img src={option.image} alt={`Option ${label}`} />}
    </div>
  );
}

function SubjectiveReview({ question }) {
  const evaluation = question.ml_evaluation || {};
  const score = Math.round(Number(evaluation.score || 0) * 100);

  return (
    <div className="exam-subjective-review">
      <div>
        <strong>Your answer</strong>
        <p>{question.selected_answer || question.student_answer || "No answer submitted."}</p>
      </div>
      <div>
        <strong>Reference answer</strong>
        <p>{question.correct_answer || question.solution_text || question.explanation || "Reference answer not available."}</p>
      </div>
      {question.status !== "not_attempted" && (
        <div className="exam-ml-review-grid">
          <span>
            <strong>{score}%</strong>
            ML score
          </span>
          <span>
            <strong>{Math.round(Number(evaluation.similarity || 0) * 100)}%</strong>
            Similarity
          </span>
          <span>
            <strong>{Math.round(Number(evaluation.keyword_coverage || 0) * 100)}%</strong>
            Key terms
          </span>
          <span>
            <strong>{Math.round(Number(evaluation.confidence || 0) * 100)}%</strong>
            Confidence
          </span>
        </div>
      )}
    </div>
  );
}

export default function MyExamResult() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const user = useMemo(readUser, []);
  const submissionId = searchParams.get("submission_id") || searchParams.get("submissionId");
  const examId = searchParams.get("exam_id");
  const studentId = searchParams.get("student_id") || user.id || user.user_id;
  const [data, setData] = useState(null);
  const [error, setError] = useState("");

  useEffect(() => {
    const load = async () => {
      setError("");
      const params = new URLSearchParams();
      if (submissionId) params.set("submission_id", submissionId);
      if (examId) params.set("exam_id", examId);
      if (studentId) params.set("student_id", studentId);

      if (!params.toString()) {
        setError("Result identifiers are missing.");
        return;
      }

      try {
        const response = await fetch(`/api/student/myexam/result?${params.toString()}`);
        const payload = await response.json().catch(() => ({}));
        if (!response.ok) {
          throw new Error(payload.error || payload.details || "Failed to load result");
        }
        setData(payload);
      } catch (loadError) {
        setError(loadError.message || "Unable to load result.");
      }
    };

    load();
  }, [examId, studentId, submissionId]);

  if (error) {
    return (
      <DashboardLayout bgColor="transparent">
        <main className="student-page">
          <StudentTopbar title="Exam Result" search="Search results" />
          <StudentEmptyState icon="error" title="Result unavailable" text={error} />
        </main>
      </DashboardLayout>
    );
  }

  if (!data) {
    return (
      <DashboardLayout bgColor="transparent">
        <main className="student-page">
          <StudentTopbar title="Exam Result" search="Search results" />
          <StudentEmptyState icon="hourglass_top" title="Loading result" text="Your exam analysis is being prepared." />
        </main>
      </DashboardLayout>
    );
  }

  const result = data.result || {};
  const feedback = Array.isArray(data.feedback) ? data.feedback : [];
  const subjectPerformance = Array.isArray(data.subject_performance) ? data.subject_performance : [];
  const percentage = Math.max(0, Math.min(100, Number(result.percentage || 0)));

  return (
    <DashboardLayout bgColor="transparent">
      <main className="student-page">
        <StudentTopbar title="Exam Result" search="Search results" />

        <section className="exam-result-hero">
          <div>
            <span className="student-overline">Result analysis</span>
            <h2>{result.exam_title || data.exam?.title || "Exam Result"}</h2>
            <p>Review your total score, pass status, subject performance, and answer-level feedback.</p>
          </div>
          <div className="exam-score-donut" style={{ "--score": `${percentage}%` }}>
            <strong>{percentage}%</strong>
            <span>{result.pass_status || "Result"}</span>
          </div>
        </section>

        <section className="exam-result-metrics">
          <span>
            <strong>{result.max_marks || 0}</strong>
            Total marks
          </span>
          <span>
            <strong>{result.marks_obtained ?? result.total_marks ?? 0}</strong>
            Marks obtained
          </span>
          <span>
            <strong>{result.attempted || result.answered || 0}</strong>
            Attempted
          </span>
          <span>
            <strong>{result.not_answered || 0}</strong>
            Unattempted
          </span>
          <span>
            <strong>{result.correct_count || 0}</strong>
            Correct
          </span>
          <span>
            <strong>{result.wrong_count || 0}</strong>
            Wrong
          </span>
        </section>

        <section className="exam-result-layout">
          <article className="exam-result-panel">
            <h3>Subject-wise performance</h3>
            <div className="exam-subject-performance">
              {subjectPerformance.length === 0 ? (
                <p>No subject-wise analysis is available for this attempt.</p>
              ) : (
                subjectPerformance.map((subject) => (
                  <div className="exam-performance-row" key={subject.subject_id || subject.subject_name}>
                    <div>
                      <strong>{subject.subject_name}</strong>
                      <small>
                        {subject.correct} correct / {subject.wrong} wrong / {subject.not_attempted} skipped
                      </small>
                    </div>
                    <span>{subject.marks_obtained}/{subject.total_marks}</span>
                    <i>
                      <b style={{ width: `${Math.max(0, Math.min(100, Number(subject.percentage || 0)))}%` }} />
                    </i>
                  </div>
                ))
              )}
            </div>
          </article>

          <article className="exam-result-panel">
            <h3>Correct vs wrong answers</h3>
            <div className="exam-answer-bars">
              <span>
                <strong>{result.correct_count || 0}</strong>
                Correct answers
              </span>
              <span>
                <strong>{result.wrong_count || 0}</strong>
                Wrong answers
              </span>
              <span>
                <strong>{result.not_answered || 0}</strong>
                Unattempted
              </span>
              <span>
                <strong>{result.marked_for_review || 0}</strong>
                Marked for review
              </span>
            </div>
            <div className="exam-confirm-actions">
              <button type="button" className="exam-secondary-action" onClick={() => navigate("/student/myexam")}>
                Back to Exams
              </button>
              <button type="button" className="exam-primary-action" onClick={() => navigate("/student/myresults")}>
                All Results
                <span className="material-icons-round">bar_chart</span>
              </button>
            </div>
          </article>
        </section>

        <section className="exam-review-panel">
          <div className="exam-review-head">
            <div>
              <span className="student-overline">Answer review</span>
              <h3>Question feedback</h3>
            </div>
          </div>

          {feedback.length === 0 ? (
            <StudentEmptyState icon="rate_review" title="No feedback available" text="Detailed answer feedback was not returned for this attempt." />
          ) : (
            <div className="exam-review-list">
              {feedback.map((question, index) => {
                const subjective = isSubjectiveFeedback(question);
                return (
                <article className="exam-review-card" key={question.question_id || index}>
                  <div className="exam-review-question">
                    <span>Q{question.question_no || index + 1}</span>
                    <div>
                      <strong>{question.question_text || "Question"}</strong>
                      <small>
                        {question.subject_name || "General"} / Marks: {question.marks_obtained || 0}
                      </small>
                    </div>
                    <em className={question.is_correct ? "correct" : question.is_correct === false ? "wrong" : ""}>
                      {subjective && question.status !== "not_attempted"
                        ? "ML scored"
                        : question.is_correct
                        ? "Correct"
                        : question.is_correct === false
                        ? "Wrong"
                        : "Skipped"}
                    </em>
                  </div>

                  {question.question_image && <img className="exam-review-image" src={question.question_image} alt="Question" />}

                  {subjective ? (
                    <SubjectiveReview question={question} />
                  ) : (
                    <div className="exam-review-options">
                      {(question.options || []).map((option) => (
                        <OptionReview
                          key={option.label}
                          label={option.label}
                          option={option}
                          selectedAnswer={question.selected_answer || question.student_answer}
                          selectedOption={question.selected_option}
                          correctAnswer={question.correct_answer}
                          correctOption={question.correct_option}
                        />
                      ))}
                    </div>
                  )}

                  {question.answer_image && <img className="exam-review-image" src={question.answer_image} alt="Answer explanation" />}
                </article>
                );
              })}
            </div>
          )}
        </section>
      </main>
    </DashboardLayout>
  );
}
