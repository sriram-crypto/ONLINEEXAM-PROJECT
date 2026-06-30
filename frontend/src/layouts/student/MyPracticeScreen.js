import React, { useEffect, useMemo, useRef, useState } from "react";

const normalize = (value) => String(value || "").replace(/\s+/g, "").trim().toLowerCase();

const getOptions = (question) => {
  if (Array.isArray(question.options) && question.options.length) {
    return question.options.map((option, index) =>
      typeof option === "string"
        ? { label: String.fromCharCode(65 + index), text: option, image: null }
        : { label: option.label || String.fromCharCode(65 + index), text: option.text || "", image: option.image || null }
    );
  }

  return [
    { label: "A", text: question.option1, image: question.option1_image },
    { label: "B", text: question.option2, image: question.option2_image },
    { label: "C", text: question.option3, image: question.option3_image },
    { label: "D", text: question.option4, image: question.option4_image },
  ].filter((option) => option.text || option.image);
};

const getCorrectValues = (question) => {
  const correct = question.answer ?? question.correct_option ?? question.correct_answer ?? "";
  const pieces = Array.isArray(correct) ? correct : String(correct).split(/[;,]/);
  const values = new Set(pieces.map(normalize).filter(Boolean));
  const options = getOptions(question);

  pieces.forEach((piece) => {
    const index = ["A", "B", "C", "D"].findIndex((letter) => normalize(letter) === normalize(piece));
    if (index >= 0 && options[index]?.text) values.add(normalize(options[index].text));
  });

  return values;
};

const getCorrectCount = (question) => {
  const correct = question.answer ?? question.correct_option ?? question.correct_answer ?? "";
  return (Array.isArray(correct) ? correct : String(correct).split(/[;,]/)).map(normalize).filter(Boolean).length || 1;
};

const isMultiSelect = (question) => {
  const correct = question.answer ?? question.correct_option ?? question.correct_answer ?? "";
  return Array.isArray(correct) || String(correct).includes(",") || String(correct).includes(";");
};

export default function MyPracticeScreen({ exam: initialExam, onClose, onSubmit }) {
  const [exam, setExam] = useState(initialExam || null);
  const [loading, setLoading] = useState(!initialExam);
  const [current, setCurrent] = useState(0);
  const [answers, setAnswers] = useState({});
  const [submitted, setSubmitted] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [result, setResult] = useState(null);
  const [feedback, setFeedback] = useState([]);
  const [timeLeft, setTimeLeft] = useState(() => Number(initialExam?.duration || 20) * 60);
  const submitRef = useRef(null);

  useEffect(() => {
    if (initialExam) {
      setExam(initialExam);
      setLoading(false);
      setTimeLeft(Number(initialExam.duration || 20) * 60);
    }
  }, [initialExam]);

  const questions = useMemo(() => exam?.questions || [], [exam]);
  const currentQuestion = questions[current];
  const answeredCount = Object.values(answers).filter((answer) =>
    Array.isArray(answer) ? answer.length > 0 : normalize(answer) !== ""
  ).length;

  useEffect(() => {
    if (submitted || !questions.length || timeLeft == null) return undefined;
    if (timeLeft <= 0) {
      submitRef.current?.("auto_submitted");
      return undefined;
    }

    const timerId = window.setInterval(() => {
      setTimeLeft((value) => Math.max(0, (value || 0) - 1));
    }, 1000);

    return () => window.clearInterval(timerId);
  }, [timeLeft, submitted, questions.length]);

  const formatTime = (seconds) => {
    const safeSeconds = Math.max(0, Number(seconds || 0));
    const minutes = Math.floor(safeSeconds / 60);
    const remaining = safeSeconds % 60;
    return `${String(minutes).padStart(2, "0")}:${String(remaining).padStart(2, "0")}`;
  };

  const readPracticeFilters = () => {
    let filters = exam?.filters || {};
    try {
      const practiceForm = JSON.parse(sessionStorage.getItem("practice_form") || "{}");
      filters = {
        ...filters,
        category_id: filters.category_id || practiceForm.category || "",
        course_id: filters.course_id || practiceForm.course || "",
        subject_id: filters.subject_id || practiceForm.subject || "",
        questionCount: filters.questionCount || practiceForm.questionCount || questions.length,
      };
    } catch (error) {
      // Keep generated filters if session storage is unavailable.
    }
    return filters;
  };

  const gradeLocally = () => {
    let correct_count = 0;
    let wrong_count = 0;
    let attempted_count = 0;
    let total_marks = 0;

    const feedbackRows = questions.map((question, index) => {
      const questionId = question.id || question.question_id || index;
      const studentAnswer = answers[questionId] ?? "";
      const normalizedAnswer = Array.isArray(studentAnswer)
        ? studentAnswer.map(normalize).filter(Boolean)
        : [normalize(studentAnswer)].filter(Boolean);
      const correctValues = getCorrectValues(question);
      const attempted = normalizedAnswer.length > 0;
      const isCorrect =
        attempted &&
        normalizedAnswer.length === getCorrectCount(question) &&
        normalizedAnswer.every((value) => correctValues.has(value));
      const marks = Number(question.marks || 1);
      const negativeMarks = Number(question.negative_marks || 0);
      const marks_obtained = attempted ? (isCorrect ? marks : -Math.abs(negativeMarks)) : 0;

      if (attempted) attempted_count += 1;
      if (isCorrect) correct_count += 1;
      if (attempted && !isCorrect) wrong_count += 1;
      total_marks += marks_obtained;

      return {
        ...question,
        question_id: questionId,
        student_answer: Array.isArray(studentAnswer) ? studentAnswer.join(", ") : studentAnswer,
        correct_answer: question.answer ?? question.correct_option ?? question.correct_answer ?? "",
        is_correct: isCorrect,
        marks_obtained,
      };
    });

    const not_attempted_count = Math.max(0, questions.length - attempted_count);
    return {
      result: {
        total_questions: questions.length,
        total_marks,
        correct_count,
        wrong_count,
        attempted_count,
        not_attempted_count,
        answered: attempted_count,
        not_answered: not_attempted_count,
        percentage: questions.length ? Math.round((correct_count / questions.length) * 100) : 0,
      },
      feedback: feedbackRows,
    };
  };

  async function handleSubmit(reason = "submitted") {
    if (submitting || submitted || !questions.length) return;
    setSubmitting(true);

    const localGrade = gradeLocally();
    let serverGrade = null;

    try {
      const user = JSON.parse(localStorage.getItem("user") || "{}");
      const studentId = user.id || user.user_id || user.student_id;
      const response = await fetch("/api/student/mypractice/submit", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          exam_id: exam.exam_id || exam.practice_uid,
          attempt_id: exam.attempt_id,
          practice_session_id: exam.practice_session_id,
          student_id: studentId,
          status: reason,
          answers,
          questions,
          filters: readPracticeFilters(),
          ...localGrade.result,
        }),
      });

      if (response.ok) {
        serverGrade = await response.json();
        if (serverGrade?.submission_id) {
          sessionStorage.setItem(
            `practice_result_${serverGrade.submission_id}`,
            JSON.stringify({
              result: serverGrade.result || localGrade.result,
              feedback: serverGrade.feedback?.length ? serverGrade.feedback : localGrade.feedback,
            })
          );
          if (typeof onSubmit === "function") {
            onSubmit(serverGrade.submission_id);
          }
        }
      }
    } catch (error) {
      console.error("Error saving practice result:", error);
    }

    setResult(serverGrade?.result || localGrade.result);
    setFeedback(serverGrade?.feedback?.length ? serverGrade.feedback : localGrade.feedback);
    setSubmitted(true);
    setSubmitting(false);
  }

  submitRef.current = handleSubmit;

  const setAnswer = (question, optionText) => {
    const questionId = question.id || question.question_id || current;
    if (!isMultiSelect(question)) {
      setAnswers((currentAnswers) => ({ ...currentAnswers, [questionId]: optionText }));
      return;
    }

    setAnswers((currentAnswers) => {
      const currentValue = Array.isArray(currentAnswers[questionId]) ? currentAnswers[questionId] : [];
      const exists = currentValue.includes(optionText);
      return {
        ...currentAnswers,
        [questionId]: exists ? currentValue.filter((item) => item !== optionText) : [...currentValue, optionText],
      };
    });
  };

  if (loading) return <div style={{ padding: 32 }}>Loading practice exam...</div>;
  if (!exam || !questions.length) {
    return (
      <div style={{ display: "grid", placeItems: "center", minHeight: 260, padding: 40, textAlign: "center" }}>
        <span className="material-icons-round" style={{ fontSize: 48, color: "#d84c5f" }}>search_off</span>
        <h3 style={{ margin: "12px 0 6px", color: "#172033" }}>Questions not found</h3>
        <p style={{ margin: 0, color: "#647087" }}>Try another category, subject, or difficulty level.</p>
        {onClose && (
          <button type="button" className="student-primary-button" style={{ marginTop: 22 }} onClick={onClose}>
            Go Back
          </button>
        )}
      </div>
    );
  }

  if (submitted && result) {
    return (
      <div style={{ maxWidth: 1080, margin: "0 auto", background: "#fff", borderRadius: 8, padding: 24 }}>
        <div style={{ display: "flex", justifyContent: "space-between", gap: 12, alignItems: "center", marginBottom: 18 }}>
          <div>
            <span className="student-overline">Instant practice result</span>
            <h2 style={{ margin: "4px 0 0", color: "#172033" }}>Practice Result</h2>
          </div>
          {onClose && <button type="button" className="student-secondary-button" onClick={onClose}>Close</button>}
        </div>

        <div className="student-grid-4" style={{ marginBottom: 20 }}>
          <div className="student-card"><strong>Total</strong><h3>{result.total_questions ?? feedback.length}</h3></div>
          <div className="student-card"><strong>Correct</strong><h3 style={{ color: "#2f855a" }}>{result.correct_count || 0}</h3></div>
          <div className="student-card"><strong>Wrong</strong><h3 style={{ color: "#d84c5f" }}>{result.wrong_count || 0}</h3></div>
          <div className="student-card"><strong>Score</strong><h3 style={{ color: "#2754d8" }}>{result.total_marks || 0}</h3></div>
        </div>

        <div style={{ display: "grid", gap: 12 }}>
          {feedback.map((item, index) => {
            const options = getOptions(item);
            return (
              <article key={item.question_id || index} className="student-card" style={{ borderLeft: `4px solid ${item.is_correct ? "#2f855a" : "#d84c5f"}` }}>
                <strong>Q{index + 1}: {item.question_text}</strong>
                {item.question_image && <img src={item.question_image} alt="Question" style={{ maxWidth: "100%", maxHeight: 240, marginTop: 12, borderRadius: 8 }} />}
                <div style={{ display: "grid", gap: 8, marginTop: 12 }}>
                  {options.map((option) => {
                    const isStudent = normalize(item.student_answer).split(",").includes(normalize(option.text)) || normalize(item.student_answer).split(",").includes(normalize(option.label));
                    const isCorrect = getCorrectValues(item).has(normalize(option.text)) || getCorrectValues(item).has(normalize(option.label));
                    return (
                      <div
                        key={option.label}
                        style={{
                          padding: 10,
                          borderRadius: 8,
                          border: isCorrect ? "1px solid #2f855a" : isStudent ? "1px solid #d84c5f" : "1px solid rgba(23, 32, 51, 0.1)",
                          background: isCorrect ? "#ecfdf5" : isStudent ? "#fff1f2" : "#fff",
                          color: isCorrect ? "#065f46" : isStudent ? "#9f1239" : "#172033",
                        }}
                      >
                        <strong>{option.label}.</strong> {option.text}
                        {isStudent && <span style={{ marginLeft: 8 }}>(your)</span>}
                        {isCorrect && <span style={{ marginLeft: 8 }}>correct</span>}
                        {option.image && <img src={option.image} alt={`Option ${option.label}`} style={{ maxWidth: "100%", maxHeight: 180, display: "block", marginTop: 8, borderRadius: 6 }} />}
                      </div>
                    );
                  })}
                </div>
                <p style={{ margin: "10px 0 0", color: "#647087" }}>Marks: <strong>{item.marks_obtained}</strong></p>
              </article>
            );
          })}
        </div>
      </div>
    );
  }

  const options = getOptions(currentQuestion);
  const questionId = currentQuestion.id || currentQuestion.question_id || current;
  const selectedValue = answers[questionId] || (isMultiSelect(currentQuestion) ? [] : "");

  return (
    <div style={{ maxWidth: 1180, margin: "0 auto", background: "#fff", borderRadius: 8, boxShadow: "0 18px 48px rgba(24,42,72,0.16)", overflow: "hidden" }}>
      <header style={{ display: "flex", justifyContent: "space-between", gap: 12, alignItems: "center", padding: "18px 22px", borderBottom: "1px solid rgba(23,32,51,0.1)" }}>
        <div>
          <span className="student-overline">My Practice</span>
          <h2 style={{ margin: "4px 0 0", color: "#172033" }}>{exam.title || "Practice Test"}</h2>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <strong style={{ color: timeLeft < 60 ? "#d84c5f" : "#0f8f83" }}>{formatTime(timeLeft)}</strong>
          {onClose && <button type="button" className="student-secondary-button" onClick={onClose}>Close</button>}
        </div>
      </header>

      <div style={{ display: "grid", gridTemplateColumns: "minmax(0, 1fr) 280px", minHeight: 560 }}>
        <main style={{ padding: 28 }}>
          <div style={{ marginBottom: 18, color: "#647087", fontWeight: 800 }}>Question {current + 1} of {questions.length}</div>
          <h3 style={{ color: "#172033", lineHeight: 1.5 }}>{currentQuestion.question_text || currentQuestion.text}</h3>
          {currentQuestion.question_image && <img src={currentQuestion.question_image} alt="Question" style={{ maxWidth: "100%", maxHeight: 360, borderRadius: 8, marginBottom: 16 }} />}

          <div style={{ display: "grid", gap: 12, marginTop: 18 }}>
            {options.map((option) => {
              const selected = Array.isArray(selectedValue) ? selectedValue.includes(option.text || option.label) : selectedValue === (option.text || option.label);
              return (
                <label
                  key={option.label}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 12,
                    padding: 14,
                    borderRadius: 8,
                    border: selected ? "2px solid #0f8f83" : "1px solid rgba(23,32,51,0.12)",
                    background: selected ? "#ecfdf5" : "#fff",
                    cursor: "pointer",
                  }}
                >
                  <input
                    type={isMultiSelect(currentQuestion) ? "checkbox" : "radio"}
                    name={`practice-question-${questionId}`}
                    checked={selected}
                    onChange={() => setAnswer(currentQuestion, option.text || option.label)}
                  />
                  <span><strong>{option.label}.</strong> {option.text}</span>
                  {option.image && <img src={option.image} alt={`Option ${option.label}`} style={{ maxHeight: 90, borderRadius: 6 }} />}
                </label>
              );
            })}
          </div>

          <div style={{ display: "flex", justifyContent: "space-between", marginTop: 28 }}>
            <button type="button" className="student-secondary-button" disabled={current === 0} onClick={() => setCurrent((value) => Math.max(0, value - 1))}>Previous</button>
            {current < questions.length - 1 ? (
              <button type="button" className="student-primary-button" onClick={() => setCurrent((value) => Math.min(questions.length - 1, value + 1))}>Save & Next</button>
            ) : (
              <button type="button" className="student-primary-button" disabled={submitting} onClick={() => handleSubmit()}>
                {submitting ? "Submitting..." : "Submit Practice"}
              </button>
            )}
          </div>
        </main>

        <aside style={{ padding: 18, background: "#fbfdff", borderLeft: "1px solid rgba(23,32,51,0.1)" }}>
          <div className="student-card" style={{ marginBottom: 14 }}>
            <strong>Progress</strong>
            <p style={{ color: "#647087", margin: "8px 0 0" }}>{answeredCount} answered, {questions.length - answeredCount} remaining</p>
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(5, 1fr)", gap: 8 }}>
            {questions.map((question, index) => {
              const qId = question.id || question.question_id || index;
              const answered = Array.isArray(answers[qId]) ? answers[qId].length > 0 : normalize(answers[qId]) !== "";
              return (
                <button
                  type="button"
                  key={qId}
                  onClick={() => setCurrent(index)}
                  style={{
                    width: 38,
                    height: 38,
                    borderRadius: 8,
                    border: index === current ? "2px solid #2754d8" : "1px solid rgba(23,32,51,0.12)",
                    background: answered ? "#0f8f83" : "#fff",
                    color: answered ? "#fff" : "#172033",
                    fontWeight: 900,
                  }}
                >
                  {index + 1}
                </button>
              );
            })}
          </div>
        </aside>
      </div>
    </div>
  );
}
