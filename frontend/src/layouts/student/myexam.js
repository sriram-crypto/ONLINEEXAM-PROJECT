import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";

import DashboardLayout from "examples/LayoutContainers/DashboardLayout";
import { StudentEmptyState, StudentTopbar } from "./StudentDashboardChrome";

import "./student-dashboard.css";

const SESSION_PREFIX = "student_my_exam_session";

const readUser = () => {
  try {
    return JSON.parse(localStorage.getItem("user") || "{}");
  } catch (error) {
    return {};
  }
};

const fetchJson = async (url, options = {}) => {
  const response = await fetch(url, options);
  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(data.error || data.details || "Request failed");
  }
  return data;
};

const formatDateTime = (value) => {
  if (!value) return "Not scheduled";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "Not scheduled";
  return date.toLocaleString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
};

const formatDuration = (seconds) => {
  const totalSeconds = Math.max(0, Number(seconds) || 0);
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  if (hours && minutes) return `${hours}h ${minutes}m`;
  if (hours) return `${hours}h`;
  return `${minutes || 0}m`;
};

const formatTimer = (seconds) => {
  const safe = Math.max(0, Number(seconds) || 0);
  const hours = Math.floor(safe / 3600);
  const minutes = Math.floor((safe % 3600) / 60);
  const secs = safe % 60;
  return `${String(hours).padStart(2, "0")}:${String(minutes).padStart(2, "0")}:${String(secs).padStart(2, "0")}`;
};

const normalizeSubjects = (groups = []) =>
  groups.map((group) => ({
    subject_id: group.subject_id || group.subject_name,
    subject_name: group.subject_name || "General",
    question_count: group.question_count || (Array.isArray(group.questions) ? group.questions.length : 0),
    total_marks: Number(group.total_marks || 0),
    questions: Array.isArray(group.questions) ? group.questions : [],
  }));

const flattenQuestions = (groups = []) => {
  const flat = [];
  normalizeSubjects(groups).forEach((group) => {
    group.questions.forEach((question, subjectIndex) => {
      flat.push({
        ...question,
        subject_id: question.subject_id || group.subject_id,
        subject_name: question.subject_name || group.subject_name,
        subject_question_no: subjectIndex + 1,
      });
    });
  });
  return flat;
};

const questionKey = (question) => String(question?.question_id || question?.id || "");

const cleanText = (value) => String(value || "").replace(/\s+/g, " ").trim();

const isSubjectiveQuestion = (question) => {
  const typeId = Number(question?.question_type_id || 0);
  const typeName = String(question?.question_type_name || question?.type_name || "").toLowerCase();
  return [11, 12, 13].includes(typeId) || /\b(subjective|short answer|long answer)\b/.test(typeName);
};

const wordCount = (value) => cleanText(value).split(" ").filter(Boolean).length;

const hasStoredAnswer = (answer) => Boolean(cleanText(answer?.student_answer) || cleanText(answer?.selected_option));

const buildInitialStatuses = (questions) => {
  const statuses = {};
  questions.forEach((question, index) => {
    statuses[questionKey(question)] = index === 0 ? "not_answered" : "not_visited";
  });
  return statuses;
};

const getStats = (questions, answers, statuses) => {
  const total = questions.length;
  const attempted = questions.filter((question) => {
    const answer = answers[questionKey(question)];
    return hasStoredAnswer(answer);
  }).length;
  const marked = questions.filter((question) => statuses[questionKey(question)] === "marked_for_review").length;
  const notVisited = questions.filter((question) => statuses[questionKey(question)] === "not_visited").length;
  return {
    total,
    attempted,
    unattempted: total - attempted,
    marked,
    notVisited,
    notAnswered: total - attempted,
  };
};

const optionValue = (option) => option?.value || option?.text || option?.label || "";

const statusLabel = {
  not_visited: "Not Visited",
  not_answered: "Not Answered",
  answered: "Answered",
  marked_for_review: "Marked for Review",
};

function MyExam() {
  const navigate = useNavigate();
  const user = useMemo(readUser, []);
  const studentId = user.id || user.user_id || null;
  const studentName = user.name || user.student_name || localStorage.getItem("student_name") || "Student";

  const [examLists, setExamLists] = useState({ active: [], scheduled: [], completed: [] });
  const [activeTab, setActiveTab] = useState("active");
  const [mode, setMode] = useState("list");
  const [selectedExam, setSelectedExam] = useState(null);
  const [overview, setOverview] = useState(null);
  const [questionGroups, setQuestionGroups] = useState([]);
  const [questions, setQuestions] = useState([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [answers, setAnswers] = useState({});
  const [statuses, setStatuses] = useState({});
  const [sessionMeta, setSessionMeta] = useState(null);
  const [warningCount, setWarningCount] = useState(0);
  const [warningMessage, setWarningMessage] = useState("");
  const [resultData, setResultData] = useState(null);
  const [mlPredictions, setMlPredictions] = useState({});
  const [adaptiveMeta, setAdaptiveMeta] = useState(null);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [error, setError] = useState("");
  const [now, setNow] = useState(Date.now());

  const stateRef = useRef({});
  const submitLockRef = useRef(false);
  const warningCountRef = useRef(0);
  const lastSecurityEventRef = useRef(0);
  const questionStartedAtRef = useRef(Date.now());

  const sessionKey = selectedExam && studentId ? `${SESSION_PREFIX}_${studentId}_${selectedExam.exam_id}` : null;

  const remainingSeconds = useMemo(() => {
    if (!sessionMeta?.expires_at) return null;
    return Math.max(0, Math.ceil((new Date(sessionMeta.expires_at).getTime() - now) / 1000));
  }, [sessionMeta, now]);

  const subjectGroups = useMemo(() => {
    const map = new Map();
    questions.forEach((question, index) => {
      const subjectName = question.subject_name || "General";
      if (!map.has(subjectName)) {
        map.set(subjectName, []);
      }
      map.get(subjectName).push({ ...question, globalIndex: index });
    });
    return Array.from(map.entries()).map(([subject_name, items]) => ({ subject_name, questions: items }));
  }, [questions]);

  const currentQuestion = questions[currentIndex] || null;
  const stats = useMemo(() => getStats(questions, answers, statuses), [questions, answers, statuses]);

  useEffect(() => {
    stateRef.current = {
      selectedExam,
      overview,
      questionGroups,
      questions,
      currentIndex,
      answers,
      statuses,
      sessionMeta,
      warningCount,
    };
    warningCountRef.current = warningCount;
  }, [selectedExam, overview, questionGroups, questions, currentIndex, answers, statuses, sessionMeta, warningCount]);

  const loadExamLists = useCallback(async () => {
    if (!studentId) {
      setLoading(false);
      setError("Student login is required to load exams.");
      return;
    }

    setLoading(true);
    setError("");
    try {
      const [active, scheduled, completed] = await Promise.all([
        fetchJson(`/api/student/myexam/active?student_id=${studentId}`),
        fetchJson(`/api/student/myexam/scheduled?student_id=${studentId}`),
        fetchJson(`/api/student/myexam/completed?student_id=${studentId}`),
      ]);
      const nextLists = {
        active: Array.isArray(active.exams) ? active.exams : [],
        scheduled: Array.isArray(scheduled.exams) ? scheduled.exams : [],
        completed: Array.isArray(completed.exams) ? completed.exams : [],
      };
      setExamLists(nextLists);

      const examsForPrediction = [...nextLists.active, ...nextLists.scheduled].slice(0, 8);
      const predictions = await Promise.all(
        examsForPrediction.map((exam) =>
          fetchJson(`/api/ml/predict-score?student_id=${studentId}&exam_id=${exam.exam_id}`)
            .then((prediction) => [exam.exam_id, prediction])
            .catch(() => null)
        )
      );
      setMlPredictions((current) => ({
        ...current,
        ...predictions.filter(Boolean).reduce((acc, [examId, prediction]) => {
          acc[examId] = prediction;
          return acc;
        }, {}),
      }));
    } catch (loadError) {
      setError(loadError.message || "Unable to load exams.");
    } finally {
      setLoading(false);
    }
  }, [studentId]);

  useEffect(() => {
    loadExamLists();
  }, [loadExamLists]);

  useEffect(() => {
    if (!studentId || mode !== "list") return;

    let restored = null;
    for (let index = 0; index < localStorage.length; index += 1) {
      const key = localStorage.key(index);
      if (!key || !key.startsWith(`${SESSION_PREFIX}_${studentId}_`)) continue;
      try {
        const value = JSON.parse(localStorage.getItem(key) || "{}");
        if (!value?.exam || !Array.isArray(value.questions) || value.submitted) continue;
        if (value.expires_at && new Date(value.expires_at).getTime() <= Date.now()) {
          restored = value;
          break;
        }
        restored = value;
        break;
      } catch (restoreError) {
        localStorage.removeItem(key);
      }
    }

    if (!restored) return;
    setSelectedExam(restored.exam);
    setOverview(restored.overview || null);
    setQuestionGroups(restored.questionGroups || []);
    setQuestions(restored.questions || []);
    setCurrentIndex(restored.currentIndex || 0);
    setAnswers(restored.answers || {});
    setStatuses(restored.statuses || buildInitialStatuses(restored.questions || []));
    setSessionMeta({
      submission_id: restored.submission_id,
      attempt_id: restored.attempt_id,
      started_at: restored.started_at,
      expires_at: restored.expires_at,
      duration_seconds: restored.duration_seconds,
    });
    setWarningCount(restored.warningCount || 0);
    setMode("exam");
  }, [mode, studentId]);

  useEffect(() => {
    if (mode !== "exam" || !sessionKey || !selectedExam) return;

    const payload = {
      exam: selectedExam,
      overview,
      questionGroups,
      questions,
      currentIndex,
      answers,
      statuses,
      warningCount,
      submission_id: sessionMeta?.submission_id,
      attempt_id: sessionMeta?.attempt_id,
      started_at: sessionMeta?.started_at,
      expires_at: sessionMeta?.expires_at,
      duration_seconds: sessionMeta?.duration_seconds,
      submitted: false,
    };
    localStorage.setItem(sessionKey, JSON.stringify(payload));
  }, [mode, sessionKey, selectedExam, overview, questionGroups, questions, currentIndex, answers, statuses, sessionMeta, warningCount]);

  useEffect(() => {
    if (mode !== "exam") return undefined;
    const timer = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(timer);
  }, [mode]);

  useEffect(() => {
    if (mode === "exam") questionStartedAtRef.current = Date.now();
  }, [currentIndex, mode]);

  const logSecurityEvent = useCallback(async (eventType, payload = {}) => {
    const state = stateRef.current;
    if (!state.sessionMeta?.attempt_id && !state.sessionMeta?.submission_id) return;
    try {
      await fetchJson("/api/student/myexam/event", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          attempt_id: state.sessionMeta?.attempt_id,
          submission_id: state.sessionMeta?.submission_id,
          event_type: eventType,
          payload,
        }),
      });
    } catch (logError) {
      // Security logging is best-effort so the exam UI remains usable during a temporary network issue.
    }
  }, []);

  const markQuestionVisited = useCallback((index) => {
    const question = stateRef.current.questions?.[index];
    if (!question) return;
    const key = questionKey(question);
    setStatuses((current) => {
      const existing = current[key];
      if (existing && existing !== "not_visited") return current;
      return { ...current, [key]: "not_answered" };
    });
  }, []);

  const goToQuestion = useCallback(
    (index) => {
      if (index < 0 || index >= stateRef.current.questions.length) return;
      markQuestionVisited(index);
      setCurrentIndex(index);
    },
    [markQuestionVisited]
  );

  const submitExam = useCallback(
    async (reason = "manual") => {
      if (submitLockRef.current) return;
      const state = stateRef.current;
      if (!state.selectedExam || !studentId || !state.questions?.length) return;

      submitLockRef.current = true;
      setActionLoading(true);
      setError("");

      const answerPayload = state.questions.map((question, index) => {
        const key = questionKey(question);
        const answer = state.answers[key] || {};
        return {
          question_id: question.question_id,
          selected_option: answer.selected_option || "",
          student_answer: answer.student_answer || "",
          status: state.statuses[key] || "not_visited",
          time_taken_seconds: answer.time_taken_seconds || null,
          attempt_order: index + 1,
        };
      });

      try {
        const data = await fetchJson("/api/student/myexam/submit", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            exam_id: state.selectedExam.exam_id,
            student_id: studentId,
            submission_id: state.sessionMeta?.submission_id,
            attempt_id: state.sessionMeta?.attempt_id,
            answers: answerPayload,
            reason,
            submitted_by: reason === "manual" ? "student" : "system",
            tab_warnings: state.warningCount || 0,
            client_state: {
              currentIndex: state.currentIndex,
              statuses: state.statuses,
              remaining_seconds: state.sessionMeta?.expires_at
                ? Math.max(0, Math.ceil((new Date(state.sessionMeta.expires_at).getTime() - Date.now()) / 1000))
                : null,
            },
          }),
        });

        if (sessionKey) localStorage.removeItem(sessionKey);
        setResultData(data);
        setMode("result");
        await loadExamLists();
      } catch (submitError) {
        setError(submitError.message || "Unable to submit exam.");
        submitLockRef.current = false;
      } finally {
        setActionLoading(false);
      }
    },
    [loadExamLists, sessionKey, studentId]
  );

  useEffect(() => {
    if (mode !== "exam" || remainingSeconds === null || remainingSeconds > 0) return;
    submitExam("timeout");
  }, [mode, remainingSeconds, submitExam]);

  useEffect(() => {
    if (mode !== "exam") return undefined;

    const handleSecurityEvent = (source) => {
      const eventTime = Date.now();
      if (eventTime - lastSecurityEventRef.current < 1800) return;
      lastSecurityEventRef.current = eventTime;

      const nextCount = warningCountRef.current + 1;
      setWarningCount(nextCount);
      logSecurityEvent("tab_switch", { source, warning_count: nextCount });

      if (nextCount >= 3) {
        setWarningMessage("Maximum tab-switch warnings reached. The exam is being submitted.");
        submitExam("tab_switch");
      } else {
        setWarningMessage(`Warning ${nextCount} of 2: stay on the exam screen until submission.`);
      }
    };

    const onVisibility = () => {
      if (document.hidden) handleSecurityEvent("visibilitychange");
    };
    const onBlur = () => handleSecurityEvent("window_blur");
    const onCopyPaste = (event) => {
      event.preventDefault();
      logSecurityEvent(event.type === "copy" ? "copy_attempt" : "paste_attempt", { question_index: stateRef.current.currentIndex });
    };
    const onContextMenu = (event) => event.preventDefault();

    document.addEventListener("visibilitychange", onVisibility);
    window.addEventListener("blur", onBlur);
    document.addEventListener("copy", onCopyPaste);
    document.addEventListener("paste", onCopyPaste);
    document.addEventListener("contextmenu", onContextMenu);

    return () => {
      document.removeEventListener("visibilitychange", onVisibility);
      window.removeEventListener("blur", onBlur);
      document.removeEventListener("copy", onCopyPaste);
      document.removeEventListener("paste", onCopyPaste);
      document.removeEventListener("contextmenu", onContextMenu);
    };
  }, [logSecurityEvent, mode, submitExam]);

  const openStartScreen = async (exam) => {
    setActionLoading(true);
    setError("");
    try {
      const data = await fetchJson(`/api/student/myexam/overview/${exam.exam_id}?student_id=${studentId}`);
      setSelectedExam(data.exam || exam);
      setOverview(data);
      setQuestionGroups([]);
      setQuestions([]);
      setAnswers({});
      setStatuses({});
      setWarningCount(0);
      setWarningMessage("");
      setAdaptiveMeta(null);
      setMode("start");
    } catch (openError) {
      setError(openError.message || "Unable to open exam.");
    } finally {
      setActionLoading(false);
    }
  };

  const startExam = async () => {
    if (!selectedExam || !studentId) return;
    setActionLoading(true);
    setError("");
    try {
      const start = await fetchJson("/api/student/myexam/start", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ exam_id: selectedExam.exam_id, student_id: studentId }),
      });
      const groups = await fetchJson(`/api/student/myexam/questions/${selectedExam.exam_id}?student_id=${studentId}`);
      const normalizedGroups = normalizeSubjects(Array.isArray(groups) ? groups : []);
      const flatQuestions = flattenQuestions(normalizedGroups);

      if (!flatQuestions.length) {
        throw new Error("No questions are available for this exam.");
      }

      setQuestionGroups(normalizedGroups);
      setQuestions(flatQuestions);
      setCurrentIndex(0);
      setAnswers({});
      setStatuses(buildInitialStatuses(flatQuestions));
      setSessionMeta({
        submission_id: start.submission_id,
        attempt_id: start.attempt_id,
        started_at: start.started_at,
        expires_at: start.expires_at,
        duration_seconds: start.duration_seconds,
      });
      setWarningCount(0);
      setWarningMessage("");
      setAdaptiveMeta(null);
      setNow(Date.now());
      setMode("exam");
    } catch (startError) {
      setError(startError.message || "Unable to start exam.");
    } finally {
      setActionLoading(false);
    }
  };

  const selectOption = (option) => {
    if (!currentQuestion) return;
    const key = questionKey(currentQuestion);
    const elapsedSeconds = Math.max(1, Math.round((Date.now() - questionStartedAtRef.current) / 1000));
    setAnswers((current) => ({
      ...current,
      [key]: {
        question_id: currentQuestion.question_id,
        selected_option: option.label,
        student_answer: optionValue(option),
        time_taken_seconds: elapsedSeconds,
        answered_at: new Date().toISOString(),
      },
    }));
    setStatuses((current) => ({
      ...current,
      [key]: current[key] === "marked_for_review" ? "marked_for_review" : "answered",
    }));
    logSecurityEvent("answer_save", {
      question_id: currentQuestion.question_id,
      selected_option: option.label,
      time_taken_seconds: elapsedSeconds,
      question_index: currentIndex,
    });
  };

  const setSubjectiveAnswer = (value) => {
    if (!currentQuestion) return;
    const key = questionKey(currentQuestion);
    const elapsedSeconds = Math.max(1, Math.round((Date.now() - questionStartedAtRef.current) / 1000));
    const cleaned = cleanText(value);

    setAnswers((current) => ({
      ...current,
      [key]: {
        question_id: currentQuestion.question_id,
        selected_option: "",
        student_answer: value,
        answer_mode: "text",
        time_taken_seconds: elapsedSeconds,
        answered_at: new Date().toISOString(),
      },
    }));

    setStatuses((current) => {
      if (current[key] === "marked_for_review") return current;
      return { ...current, [key]: cleaned ? "answered" : "not_answered" };
    });
  };

  const logSubjectiveAnswer = () => {
    if (!currentQuestion) return;
    const key = questionKey(currentQuestion);
    const answer = stateRef.current.answers?.[key] || answers[key] || {};
    const elapsedSeconds = Math.max(1, Math.round((Date.now() - questionStartedAtRef.current) / 1000));
    logSecurityEvent("answer_save", {
      question_id: currentQuestion.question_id,
      answer_mode: "text",
      word_count: wordCount(answer.student_answer),
      time_taken_seconds: answer.time_taken_seconds || elapsedSeconds,
      question_index: currentIndex,
    });
  };

  const clearResponse = () => {
    if (!currentQuestion) return;
    const key = questionKey(currentQuestion);
    setAnswers((current) => {
      const next = { ...current };
      delete next[key];
      return next;
    });
    setStatuses((current) => ({
      ...current,
      [key]: current[key] === "marked_for_review" ? "marked_for_review" : "not_answered",
    }));
  };

  const toggleReview = () => {
    if (!currentQuestion) return;
    const key = questionKey(currentQuestion);
    setStatuses((current) => {
      const existing = current[key] || "not_answered";
      if (existing === "marked_for_review") {
        return { ...current, [key]: hasStoredAnswer(answers[key]) ? "answered" : "not_answered" };
      }
      return { ...current, [key]: "marked_for_review" };
    });
  };

  const nextQuestion = async () => {
    if (currentIndex < questions.length - 1) {
      let targetIndex = currentIndex + 1;
      const state = stateRef.current;
      const remainingPool = state.questions
        .slice(currentIndex + 1)
        .map((question) => question.question_id)
        .filter(Boolean);
      const answeredPayload = Object.values(state.answers || {}).map((answer) => ({
        q_id: answer.question_id,
        selected_option: answer.selected_option,
        student_answer: answer.student_answer,
        time_taken_seconds: answer.time_taken_seconds,
      }));

      if (remainingPool.length) {
        try {
          const recommendation = await fetchJson("/api/ml/next-question", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              student_id: studentId,
              exam_id: selectedExam?.exam_id,
              answered: answeredPayload,
              remaining_pool: remainingPool,
            }),
          });
          const recommendedIndex = state.questions.findIndex(
            (question, index) => index > currentIndex && String(question.question_id) === String(recommendation.next_question_id)
          );
          if (recommendedIndex > currentIndex) {
            targetIndex = currentIndex + 1;
            if (recommendedIndex !== targetIndex) {
              setQuestions((current) => {
                const next = [...current];
                const [picked] = next.splice(recommendedIndex, 1);
                next.splice(targetIndex, 0, picked);
                return next;
              });
            }
          }
          setAdaptiveMeta(recommendation);
        } catch (recommendationError) {
          setAdaptiveMeta(null);
        }
      }

      goToQuestion(targetIndex);
    } else {
      markQuestionVisited(currentIndex);
      setMode("confirm");
    }
  };

  const previousQuestion = () => {
    if (currentIndex > 0) goToQuestion(currentIndex - 1);
  };

  const openSubmission = () => {
    markQuestionVisited(currentIndex);
    setMode("confirm");
  };

  const resetToList = () => {
    setMode("list");
    setSelectedExam(null);
    setOverview(null);
    setQuestionGroups([]);
    setQuestions([]);
    setCurrentIndex(0);
    setAnswers({});
    setStatuses({});
    setSessionMeta(null);
    setResultData(null);
    setError("");
    submitLockRef.current = false;
  };

  const renderExamList = () => {
    const list = examLists[activeTab] || [];

    if (loading) {
      return <StudentEmptyState icon="hourglass_top" title="Loading exams" text="Your exam schedule is being prepared." />;
    }

    if (!list.length) {
      const copy = {
        active: ["No live exams", "Active exams assigned to you will appear here."],
        scheduled: ["No scheduled exams", "Upcoming exams will appear here after assignment."],
        completed: ["No completed exams", "Submitted exams will appear here with result links."],
      }[activeTab];
      return <StudentEmptyState icon="assignment" title={copy[0]} text={copy[1]} />;
    }

    return (
      <div className="exam-card-grid">
        {list.map((exam) => {
          const completed = activeTab === "completed";
          const prediction = mlPredictions[exam.exam_id];
          return (
            <article className="exam-list-card" key={`${activeTab}-${exam.exam_id}`}>
              <div className={`exam-status-chip ${completed ? "completed" : activeTab}`}>
                <span className="material-icons-round">{completed ? "task_alt" : activeTab === "active" ? "radio_button_checked" : "event"}</span>
                {completed ? "Completed" : activeTab === "active" ? "Live" : "Scheduled"}
              </div>
              <h3>{exam.title || "Untitled Exam"}</h3>
              {!completed && prediction && (
                <div className="exam-ml-badge">
                  <span className="material-icons-round">auto_graph</span>
                  Predicted {prediction.range?.[0]}-{prediction.range?.[1]}%
                </div>
              )}
              <div className="exam-list-meta">
                <span>
                  <strong>Course</strong>
                  {exam.course_name || exam.course_id || "Course"}
                </span>
                <span>
                  <strong>Duration</strong>
                  {exam.duration ? `${exam.duration} min` : "Not set"}
                </span>
                <span>
                  <strong>Starts</strong>
                  {formatDateTime(exam.start_time || exam.exam_date)}
                </span>
                <span>
                  <strong>Ends</strong>
                  {formatDateTime(exam.end_time)}
                </span>
              </div>
              {completed ? (
                <button
                  type="button"
                  className="student-primary-button exam-card-action"
                  onClick={() => navigate(`/student/myexam/result?exam_id=${exam.exam_id}&student_id=${studentId}`)}
                >
                  View Result
                  <span className="material-icons-round">bar_chart</span>
                </button>
              ) : (
                <button
                  type="button"
                  className="student-primary-button exam-card-action"
                  onClick={() => openStartScreen(exam)}
                  disabled={activeTab !== "active" || actionLoading}
                >
                  {activeTab === "active" ? "Open Exam" : "Starts Later"}
                  <span className="material-icons-round">{activeTab === "active" ? "arrow_forward" : "lock_clock"}</span>
                </button>
              )}
            </article>
          );
        })}
      </div>
    );
  };

  const renderStartScreen = () => {
    const subjects = overview?.subjects || [];
    const selectedPrediction = selectedExam ? mlPredictions[selectedExam.exam_id] : null;
    return (
      <DashboardLayout bgColor="transparent">
        <main className="student-page">
          <StudentTopbar title="Exam Start" search="Search exams" />
          <section className="exam-start-shell">
            <button type="button" className="exam-text-button" onClick={resetToList}>
              <span className="material-icons-round">arrow_back</span>
              Back to exams
            </button>

            <div className="exam-start-layout">
              <section className="exam-start-main">
                <span className="student-overline">Ready to begin</span>
                <h2>{selectedExam?.title || "Exam"}</h2>
                <p>
                  Review the exam details carefully. The timer starts immediately after you press Start Exam and continues after refresh.
                </p>

                <div className="exam-start-stats">
                  <span>
                    <strong>{overview?.total_questions || 0}</strong>
                    Total questions
                  </span>
                  <span>
                    <strong>{overview?.total_marks || 0}</strong>
                    Total marks
                  </span>
                  <span>
                    <strong>{formatDuration(overview?.duration_seconds || 0)}</strong>
                    Duration
                  </span>
                  <span>
                    <strong>{subjects.length || 0}</strong>
                    Subjects
                  </span>
                </div>
                {selectedPrediction && (
                  <div className="exam-ml-start-panel">
                    <span className="material-icons-round">psychology</span>
                    <div>
                      <strong>Predicted score range {selectedPrediction.range?.[0]}-{selectedPrediction.range?.[1]}%</strong>
                      <small>{selectedPrediction.factors?.[0] || "Prediction based on available result history."}</small>
                    </div>
                  </div>
                )}

                <div className="exam-instructions">
                  <h3>Instructions</h3>
                  <ul>
                    {(selectedExam?.instructions
                      ? String(selectedExam.instructions).split(/\r?\n/).filter(Boolean)
                      : [
                          "Do not refresh, close, or switch tabs during the exam unless there is a genuine issue.",
                          "You will receive only two tab-switch warnings. The third tab switch auto-submits the exam.",
                          "Use Mark for Review for questions you want to revisit before final submission.",
                          "The exam auto-submits when the timer reaches zero.",
                        ]
                    ).map((instruction) => (
                      <li key={instruction}>{instruction}</li>
                    ))}
                  </ul>
                </div>
              </section>

              <aside className="exam-start-side">
                <h3>Subject List</h3>
                <div className="exam-subject-list">
                  {subjects.map((subject) => (
                    <div className="exam-subject-row" key={subject.subject_id || subject.subject_name}>
                      <span>{subject.subject_name}</span>
                      <strong>
                        {subject.question_count} Qs / {subject.total_marks} marks
                      </strong>
                    </div>
                  ))}
                </div>

                <div className="exam-start-window">
                  <span>
                    <strong>Start</strong>
                    {formatDateTime(selectedExam?.start_time || selectedExam?.exam_date)}
                  </span>
                  <span>
                    <strong>End</strong>
                    {formatDateTime(selectedExam?.end_time)}
                  </span>
                </div>

                {error && <div className="exam-error">{error}</div>}
                <button type="button" className="exam-start-button" onClick={startExam} disabled={actionLoading || !overview?.is_live}>
                  <span className="material-icons-round">play_arrow</span>
                  {actionLoading ? "Starting..." : overview?.is_live ? "Start Exam" : "Exam Not Active"}
                </button>
              </aside>
            </div>
          </section>
        </main>
      </DashboardLayout>
    );
  };

  const renderQuestionImage = (src, alt) =>
    src ? (
      <div className="exam-question-image">
        <img src={src} alt={alt} onError={(event) => event.currentTarget.closest(".exam-question-image")?.classList.add("is-hidden")} />
      </div>
    ) : null;

  const renderExamScreen = () => {
    const key = questionKey(currentQuestion);
    const selectedAnswer = answers[key];
    const currentStatus = statuses[key] || "not_answered";
    const subjective = isSubjectiveQuestion(currentQuestion);
    const subjectiveText = selectedAnswer?.student_answer || "";

    return (
      <div className="exam-live-page">
        <header className="exam-live-topbar">
          <div>
            <span>Online Exam</span>
            <h1>{selectedExam?.title || "Exam"}</h1>
          </div>
          <div className={`exam-timer ${remainingSeconds !== null && remainingSeconds <= 300 ? "danger" : ""}`}>
            <span className="material-icons-round">timer</span>
            {remainingSeconds === null ? "--:--:--" : formatTimer(remainingSeconds)}
          </div>
          <button type="button" className="exam-submit-top" onClick={openSubmission} disabled={actionLoading}>
            Submit
          </button>
        </header>

        {warningMessage && (
          <div className="exam-warning-bar">
            <span className="material-icons-round">warning</span>
            <span>{warningMessage}</span>
            <button type="button" onClick={() => setWarningMessage("")} aria-label="Dismiss warning">
              <span className="material-icons-round">close</span>
            </button>
          </div>
        )}

        {adaptiveMeta && (
          <div className="exam-warning-bar ml">
            <span className="material-icons-round">psychology</span>
            <span>
              Adaptive engine recommends {adaptiveMeta.recommended_difficulty} next. Ability estimate: {Math.round((adaptiveMeta.estimated_ability || 0) * 100)}%.
            </span>
          </div>
        )}

        {error && <div className="exam-warning-bar error">{error}</div>}

        <main className="exam-live-layout">
          <section className="exam-question-panel">
            <div className="exam-question-head">
              <div>
                <span className="student-overline">{currentQuestion?.subject_name || "Subject"}</span>
                <h2>
                  Question {currentQuestion?.subject_question_no || currentIndex + 1}
                  <small> of {questions.length}</small>
                </h2>
              </div>
              <div className={`exam-question-status ${currentStatus}`}>{statusLabel[currentStatus] || "Not Answered"}</div>
            </div>

            <div className="exam-question-body">
              {currentQuestion?.question_text && <div className="exam-question-text">{currentQuestion.question_text}</div>}
              {renderQuestionImage(currentQuestion?.question_image, "Question")}

              {subjective ? (
                <div className="exam-subjective-box">
                  <label htmlFor={`subjective-answer-${key}`}>
                    <span>Type your answer</span>
                    <textarea
                      id={`subjective-answer-${key}`}
                      value={subjectiveText}
                      onChange={(event) => setSubjectiveAnswer(event.target.value)}
                      onBlur={logSubjectiveAnswer}
                      placeholder="Write your response here"
                    />
                  </label>
                  <div className="exam-subjective-meta">
                    <span>
                      <span className="material-icons-round">psychology</span>
                      ML auto-scoring on submission
                    </span>
                    <strong>{wordCount(subjectiveText)} words</strong>
                  </div>
                </div>
              ) : (
                <div className="exam-options-list">
                  {(currentQuestion?.options || []).map((option) => {
                    const selected = selectedAnswer?.selected_option === option.label;
                    return (
                      <button
                        type="button"
                        className={`exam-option ${selected ? "selected" : ""}`}
                        key={option.label}
                        onClick={() => selectOption(option)}
                      >
                        <span className="exam-option-label">{option.label}</span>
                        <span className="exam-option-content">
                          {option.text && <span>{option.text}</span>}
                          {renderQuestionImage(option.image, `Option ${option.label}`)}
                        </span>
                      </button>
                    );
                  })}
                  {(!currentQuestion?.options || currentQuestion.options.length === 0) && (
                    <div className="exam-empty-options">No options are available for this question.</div>
                  )}
                </div>
              )}
            </div>
          </section>

          <aside className="exam-navigator">
            <div className="exam-candidate-box">
              <span>{studentName.charAt(0).toUpperCase()}</span>
              <div>
                <strong>{studentName}</strong>
                <small>Warnings: {warningCount}/2</small>
              </div>
            </div>

            <div className="exam-progress-grid">
              <span>
                <strong>{stats.attempted}</strong>
                Answered
              </span>
              <span>
                <strong>{stats.unattempted}</strong>
                Not Answered
              </span>
              <span>
                <strong>{stats.marked}</strong>
                Review
              </span>
              <span>
                <strong>{stats.notVisited}</strong>
                Not Visited
              </span>
            </div>

            <div className="exam-legend">
              {Object.entries(statusLabel).map(([status, label]) => (
                <span key={status}>
                  <i className={status} />
                  {label}
                </span>
              ))}
            </div>

            <div className="exam-subject-nav">
              {subjectGroups.map((group) => (
                <section key={group.subject_name}>
                  <h3>{group.subject_name}</h3>
                  <div className="exam-question-buttons">
                    {group.questions.map((question) => {
                      const qKey = questionKey(question);
                      const status = statuses[qKey] || "not_visited";
                      return (
                        <button
                          type="button"
                          key={qKey}
                          className={`exam-nav-button ${status} ${question.globalIndex === currentIndex ? "current" : ""}`}
                          onClick={() => goToQuestion(question.globalIndex)}
                          aria-label={`${group.subject_name} question ${question.subject_question_no}`}
                        >
                          {question.subject_question_no}
                        </button>
                      );
                    })}
                  </div>
                </section>
              ))}
            </div>
          </aside>
        </main>

        <footer className="exam-live-footer">
          <button type="button" className="exam-secondary-action" onClick={previousQuestion} disabled={currentIndex === 0}>
            <span className="material-icons-round">chevron_left</span>
            Previous
          </button>
          <button type="button" className="exam-secondary-action" onClick={clearResponse}>
            Clear Response
          </button>
          <button type="button" className="exam-review-action" onClick={toggleReview}>
            <span className="material-icons-round">bookmark</span>
            {currentStatus === "marked_for_review" ? "Unmark Review" : "Mark for Review"}
          </button>
          <button type="button" className="exam-primary-action" onClick={nextQuestion}>
            {currentIndex === questions.length - 1 ? "Review Submit" : "Next"}
            <span className="material-icons-round">chevron_right</span>
          </button>
        </footer>
      </div>
    );
  };

  const renderConfirmation = () => (
    <div className="exam-confirm-page">
      <section className="exam-confirm-card">
        <span className="student-overline">Final submission</span>
        <h1>Confirm before submitting</h1>
        <p>Once submitted, you cannot change answers for this attempt.</p>

        <div className="exam-confirm-grid">
          <span>
            <strong>{stats.total}</strong>
            Total questions
          </span>
          <span>
            <strong>{stats.attempted}</strong>
            Attempted
          </span>
          <span>
            <strong>{stats.unattempted}</strong>
            Unattempted
          </span>
          <span>
            <strong>{stats.marked}</strong>
            Marked for review
          </span>
        </div>

        {error && <div className="exam-error">{error}</div>}

        <div className="exam-confirm-actions">
          <button type="button" className="exam-secondary-action" onClick={() => setMode("exam")} disabled={actionLoading}>
            Continue Exam
          </button>
          <button type="button" className="exam-primary-action" onClick={() => submitExam("manual")} disabled={actionLoading}>
            {actionLoading ? "Submitting..." : "Final Submit"}
            <span className="material-icons-round">task_alt</span>
          </button>
        </div>
      </section>
    </div>
  );

  const renderResult = () => {
    const result = resultData?.result || {};
    const subjectPerformance = resultData?.subject_performance || [];
    const percent = Math.max(0, Math.min(100, Number(result.percentage || 0)));

    return (
      <DashboardLayout bgColor="transparent">
        <main className="student-page">
          <StudentTopbar title="Exam Result" search="Search results" />
          <section className="exam-result-hero">
            <div>
              <span className="student-overline">Submitted successfully</span>
              <h2>{result.exam_title || selectedExam?.title || "Exam Result"}</h2>
              <p>Your score, answer accuracy, and subject-wise performance are ready.</p>
            </div>
            <div className="exam-score-donut" style={{ "--score": `${percent}%` }}>
              <strong>{percent}%</strong>
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
                {subjectPerformance.map((subject) => (
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
                ))}
              </div>
            </article>

            <article className="exam-result-panel">
              <h3>Answer analysis</h3>
              <div className="exam-answer-bars">
                <span style={{ "--bar": `${result.correct_count || 0}` }}>
                  <strong>{result.correct_count || 0}</strong>
                  Correct answers
                </span>
                <span style={{ "--bar": `${result.wrong_count || 0}` }}>
                  <strong>{result.wrong_count || 0}</strong>
                  Wrong answers
                </span>
                <span style={{ "--bar": `${result.not_answered || 0}` }}>
                  <strong>{result.not_answered || 0}</strong>
                  Unattempted
                </span>
              </div>
              <div className="exam-confirm-actions">
                <button type="button" className="exam-secondary-action" onClick={resetToList}>
                  Back to Exams
                </button>
                <button
                  type="button"
                  className="exam-primary-action"
                  onClick={() => navigate(`/student/myexam/result?submission_id=${resultData?.submission_id || result.submission_id || ""}&exam_id=${selectedExam?.exam_id || result.exam_id || ""}&student_id=${studentId}`)}
                >
                  Detailed Review
                  <span className="material-icons-round">open_in_new</span>
                </button>
              </div>
            </article>
          </section>
        </main>
      </DashboardLayout>
    );
  };

  if (mode === "start") return renderStartScreen();
  if (mode === "exam") return renderExamScreen();
  if (mode === "confirm") return renderConfirmation();
  if (mode === "result") return renderResult();

  return (
    <DashboardLayout bgColor="transparent">
      <main className="student-page">
        <StudentTopbar title="My Exams" search="Search exams" />

        <section className="exam-module-head">
          <div>
            <span className="student-overline">Secure exam center</span>
            <h2>My Exams</h2>
            <p>Join live exams, review upcoming schedules, and open completed results from one place.</p>
          </div>
          <button type="button" className="exam-refresh-button" onClick={loadExamLists} disabled={loading}>
            <span className="material-icons-round">refresh</span>
            Refresh
          </button>
        </section>

        {error && <div className="exam-error">{error}</div>}

        <nav className="exam-tabs" aria-label="Exam categories">
          {[
            ["active", "Active Exams", examLists.active.length],
            ["scheduled", "Scheduled Exams", examLists.scheduled.length],
            ["completed", "Completed Exams", examLists.completed.length],
          ].map(([key, label, count]) => (
            <button type="button" className={activeTab === key ? "active" : ""} key={key} onClick={() => setActiveTab(key)}>
              {label}
              <strong>{count}</strong>
            </button>
          ))}
        </nav>

        {renderExamList()}
      </main>
    </DashboardLayout>
  );
}

export default MyExam;
