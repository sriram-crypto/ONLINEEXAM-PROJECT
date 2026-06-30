const express = require("express");
const router = express.Router();
const db = require("../../config/db");
const ml = require("../../services/mlEngine");

const query = (sql, params = []) =>
  new Promise((resolve, reject) => {
    db.query(sql, params, (err, rows) => {
      if (err) reject(err);
      else resolve(rows);
    });
  });

const isMissingSchema = (err) =>
  err && (err.code === "ER_NO_SUCH_TABLE" || err.code === "ER_BAD_FIELD_ERROR" || err.errno === 1146 || err.errno === 1054);

const toNumber = (value, fallback = 0) => {
  const number = Number(value);
  return Number.isFinite(number) ? number : fallback;
};

const cleanText = (value) => String(value ?? "").replace(/\s+/g, " ").trim();
const compareText = (value) => cleanText(value).toLowerCase();

const freeTextQuestionTypeIds = new Set([11, 12, 13]);

const isFreeTextQuestion = (row = {}) => {
  const typeId = Number(row.question_type_id || 0);
  const typeName = compareText(row.question_type_name || row.type_name || "");
  return (
    freeTextQuestionTypeIds.has(typeId) ||
    /\b(subjective|short answer|long answer)\b/.test(typeName)
  );
};

const referenceAnswerForSubjective = (row = {}) =>
  cleanText(row.answer || row.correct_option || row.solution_text || row.explanation || "");

const getBaseUrl = (req) => `${req.protocol}://${req.get("host")}`;

const buildImageUrl = (req, value) => {
  if (!value) return null;
  const raw = String(value).trim();
  if (!raw) return null;
  if (/^https?:\/\//i.test(raw) || raw.startsWith("data:")) return raw;

  const normalized = raw.replace(/\\/g, "/").replace(/^\/+/, "");
  const uploadPath = normalized.includes("uploads/")
    ? normalized.slice(normalized.indexOf("uploads/"))
    : `uploads/images/${normalized.split("/").pop()}`;

  return `${getBaseUrl(req)}/${encodeURI(uploadPath)}`;
};

const buildOptions = (row, req) =>
  [1, 2, 3, 4]
    .map((optionNo) => {
      const label = String.fromCharCode(64 + optionNo);
      const text = row[`option${optionNo}`] || "";
      const image = buildImageUrl(req, row[`option${optionNo}_image`]);
      if (!cleanText(text) && !image) return null;
      return {
        label,
        key: `option${optionNo}`,
        text,
        image,
        value: cleanText(text) || label,
      };
    })
    .filter(Boolean);

const deriveCorrectLabel = (row) => {
  const correct = compareText(row.answer);
  if (!correct) return "";

  const directLabels = {
    a: "A",
    b: "B",
    c: "C",
    d: "D",
    "1": "A",
    "2": "B",
    "3": "C",
    "4": "D",
    option1: "A",
    option2: "B",
    option3: "C",
    option4: "D",
  };
  if (directLabels[correct]) return directLabels[correct];

  for (const optionNo of [1, 2, 3, 4]) {
    const label = String.fromCharCode(64 + optionNo);
    if (compareText(row[`option${optionNo}`]) === correct) return label;
  }

  return "";
};

const deriveSelectedLabel = (row, answer) => {
  const selectedOption = compareText(answer.selected_option || answer.option || answer.label);
  const selectedAnswer = compareText(answer.student_answer || answer.answer || answer.value);

  const labels = {
    a: "A",
    b: "B",
    c: "C",
    d: "D",
    "1": "A",
    "2": "B",
    "3": "C",
    "4": "D",
    option1: "A",
    option2: "B",
    option3: "C",
    option4: "D",
  };

  if (labels[selectedOption]) return labels[selectedOption];
  if (labels[selectedAnswer]) return labels[selectedAnswer];

  for (const optionNo of [1, 2, 3, 4]) {
    const label = String.fromCharCode(64 + optionNo);
    if (compareText(row[`option${optionNo}`]) === selectedAnswer) return label;
  }

  return "";
};

const normalizeQuestion = (row, req, includeAnswer = false) => {
  const isSubjective = isFreeTextQuestion(row);
  const question = {
    question_id: row.question_id,
    id: row.question_id,
    bank_question_id: row.id,
    subject_id: row.subject_id,
    subject_name: row.subject_name || "General",
    subject: row.subject_name || "General",
    section: row.section || row.subject_name || "General",
    order_no: row.order_no || 0,
    question_text: row.question_text || "",
    question_image: buildImageUrl(req, row.question_image),
    question_type_id: row.question_type_id || null,
    question_type_name: row.question_type_name || row.type_name || "",
    is_subjective: isSubjective,
    answer_mode: isSubjective ? "text" : "options",
    options: isSubjective ? [] : buildOptions(row, req),
    option1: row.option1,
    option2: row.option2,
    option3: row.option3,
    option4: row.option4,
    option1_image: buildImageUrl(req, row.option1_image),
    option2_image: buildImageUrl(req, row.option2_image),
    option3_image: buildImageUrl(req, row.option3_image),
    option4_image: buildImageUrl(req, row.option4_image),
    marks: toNumber(row.marks, 1),
    negative_marks: toNumber(row.negative_marks, 0),
  };

  if (includeAnswer) {
    question.answer = row.answer || "";
    question.correct_answer = row.answer || "";
    question.correct_option = deriveCorrectLabel(row);
    question.solution_text = row.solution_text || "";
    question.explanation = row.explanation || "";
    question.answer_image = buildImageUrl(req, row.answer_image);
  }

  return question;
};

const groupQuestionsBySubject = (questions) => {
  const map = new Map();
  questions.forEach((question) => {
    const key = question.subject_id || question.subject_name || "General";
    if (!map.has(key)) {
      map.set(key, {
        subject_id: question.subject_id || null,
        subject_name: question.subject_name || "General",
        question_count: 0,
        total_marks: 0,
        questions: [],
      });
    }

    const subject = map.get(key);
    subject.question_count += 1;
    subject.total_marks += toNumber(question.marks, 1);
    subject.questions.push(question);
  });

  return Array.from(map.values());
};

const getExam = async (examId) => {
  const rows = await query(
    `SELECT e.exam_id, e.title, e.course_id, e.duration, e.exam_date, e.start_time, e.end_time,
            e.created_by, e.status, e.package, e.schoolname, e.class, e.instructions,
            c.course_name
     FROM exams e
     LEFT JOIN courses c ON c.course_id = e.course_id
     WHERE e.exam_id = ?
     LIMIT 1`,
    [examId]
  );
  return rows[0] || null;
};

const getExamQuestions = async (examId, req, includeAnswer = false) => {
  const rows = await query(
    `SELECT eqm.question_id, eqm.order_no, eqm.marks, eqm.negative_marks, eqm.section,
            qa.id, qa.subject_id, qa.question_type_id, qt.type_name AS question_type_name,
            qa.question_text, qa.option1, qa.option2, qa.option3, qa.option4,
            qa.question_image, qa.option1_image, qa.option2_image, qa.option3_image, qa.option4_image,
            qa.answer, qa.correct_option, qa.solution_text, qa.explanation, qa.answer_image,
            s.subject_name
     FROM exam_question_mapping eqm
     INNER JOIN questions_answers qa ON qa.id = eqm.question_id
     LEFT JOIN question_types qt ON qt.question_type_id = qa.question_type_id
     LEFT JOIN subjects s ON s.subject_id = qa.subject_id
     WHERE eqm.exam_id = ?
     ORDER BY COALESCE(s.subject_name, 'General') ASC, COALESCE(eqm.order_no, eqm.question_id) ASC, eqm.question_id ASC`,
    [examId]
  );

  return rows.map((row) => normalizeQuestion(row, req, includeAnswer));
};

const getExamQuestionRowsForScoring = async (examId) =>
  query(
    `SELECT eqm.question_id, eqm.order_no, eqm.marks, eqm.negative_marks, eqm.section,
            qa.id, qa.subject_id, qa.question_type_id, qt.type_name AS question_type_name,
            qa.question_text, qa.option1, qa.option2, qa.option3, qa.option4,
            qa.question_image, qa.option1_image, qa.option2_image, qa.option3_image, qa.option4_image,
            qa.answer, qa.correct_option, qa.solution_text, qa.explanation, qa.answer_image,
            s.subject_name
     FROM exam_question_mapping eqm
     INNER JOIN questions_answers qa ON qa.id = eqm.question_id
     LEFT JOIN question_types qt ON qt.question_type_id = qa.question_type_id
     LEFT JOIN subjects s ON s.subject_id = qa.subject_id
     WHERE eqm.exam_id = ?
     ORDER BY COALESCE(s.subject_name, 'General') ASC, COALESCE(eqm.order_no, eqm.question_id) ASC, eqm.question_id ASC`,
    [examId]
  );

const hasSubmittedResult = async (examId, studentId) => {
  try {
    const rows = await query(
      "SELECT id FROM student_exam_results WHERE exam_id = ? AND user_id = ? LIMIT 1",
      [examId, studentId]
    );
    return rows.length > 0;
  } catch (err) {
    if (isMissingSchema(err)) return false;
    throw err;
  }
};

const getStudentAccess = async (examId, studentId) => {
  try {
    const rows = await query(
      "SELECT 1 AS assigned FROM exam_students WHERE exam_id = ? AND student_id = ? AND status = 'assigned' LIMIT 1",
      [examId, studentId]
    );
    if (rows.length) return true;
  } catch (err) {
    if (!isMissingSchema(err)) throw err;
  }

  try {
    const rows = await query(
      `SELECT se.enrollment_id
       FROM student_enrollments se
       INNER JOIN exams e ON e.course_id = se.course_id
       WHERE e.exam_id = ? AND se.student_id = ?
       LIMIT 1`,
      [examId, studentId]
    );
    return rows.length > 0;
  } catch (err) {
    if (isMissingSchema(err)) return true;
    throw err;
  }
};

const durationSecondsForExam = (exam) => Math.max(0, Math.round(toNumber(exam?.duration, 0) * 60));

const getExpiryIso = (startedAt, durationSeconds) => {
  if (!durationSeconds) return null;
  const startMs = new Date(startedAt).getTime();
  if (!Number.isFinite(startMs)) return null;
  return new Date(startMs + durationSeconds * 1000).toISOString();
};

const isExamLive = (exam) => {
  if (!exam) return false;
  const now = Date.now();
  const startMs = exam.start_time ? new Date(exam.start_time).getTime() : 0;
  const endMs = exam.end_time ? new Date(exam.end_time).getTime() : Number.POSITIVE_INFINITY;
  const inWindow = now >= startMs && now <= endMs;
  return exam.status === "active" || inWindow;
};

const mapSubmittedAnswers = (answers) => {
  const map = new Map();

  if (Array.isArray(answers)) {
    answers.forEach((answer) => {
      if (!answer || answer.question_id === undefined || answer.question_id === null) return;
      map.set(String(answer.question_id), answer);
    });
    return map;
  }

  if (answers && typeof answers === "object") {
    Object.entries(answers).forEach(([key, value]) => {
      if (value && typeof value === "object") {
        const questionId = value.question_id || key;
        map.set(String(questionId), value);
      } else {
        map.set(String(key), { question_id: key, student_answer: value });
      }
    });
  }

  return map;
};

const scoreAnswers = (questionRows, answers, req) => {
  const answerMap = mapSubmittedAnswers(answers);
  const subjectMap = new Map();
  const feedback = [];
  const compatibilityRows = [];
  const attemptAnswerRows = [];

  let correct_count = 0;
  let wrong_count = 0;
  let answered = 0;
  let marked_for_review = 0;
  let total_marks = 0;
  let max_marks = 0;

  questionRows.forEach((row, index) => {
    const answer = answerMap.get(String(row.question_id)) || {};
    const selectedRaw = cleanText(answer.student_answer || answer.answer || answer.value || "");
    const selectedOption = cleanText(answer.selected_option || answer.option || answer.label || "");
    const timeTakenSeconds = Math.max(0, toNumber(answer.time_taken_seconds ?? answer.time ?? answer.seconds, 0));
    const selectedLabel = deriveSelectedLabel(row, answer);
    const correctLabel = deriveCorrectLabel(row);
    const hasAnswer = Boolean(selectedRaw || selectedOption || selectedLabel);
    const reviewStatus = cleanText(answer.status || "").toLowerCase();
    const isMarked = reviewStatus.includes("mark") || answer.marked_for_review === true;
    const isSubjective = isFreeTextQuestion(row);

    const marks = toNumber(row.marks, 1);
    const negativeMarks = Math.abs(toNumber(row.negative_marks, 0));
    max_marks += marks;

    let isCorrect = false;
    let marksObtained = 0;
    let mlEvaluation = null;
    let gradingMode = "exact_match";

    if (hasAnswer) {
      answered += 1;
      if (isSubjective) {
        gradingMode = "ml_subjective";
        mlEvaluation = ml.subjectiveAnswerScore({
          studentAnswer: selectedRaw || selectedOption,
          referenceAnswer: referenceAnswerForSubjective(row),
          questionText: row.question_text,
          maxMarks: marks,
        });
        marksObtained = mlEvaluation.marks_awarded;
        isCorrect = mlEvaluation.score >= 0.6;
      } else {
        isCorrect =
          compareText(selectedRaw) === compareText(row.answer) ||
          compareText(selectedOption) === compareText(row.answer) ||
          (selectedLabel && correctLabel && selectedLabel === correctLabel);

        marksObtained = isCorrect ? marks : -negativeMarks;
      }

      if (isCorrect) correct_count += 1;
      else wrong_count += 1;
      total_marks += marksObtained;
    }

    if (isMarked) marked_for_review += 1;

    const subjectName = row.subject_name || "General";
    const subjectId = row.subject_id || subjectName;
    if (!subjectMap.has(subjectId)) {
      subjectMap.set(subjectId, {
        subject_id: row.subject_id || null,
        subject_name: subjectName,
        total_questions: 0,
        attempted: 0,
        correct: 0,
        wrong: 0,
        marked_for_review: 0,
        total_marks: 0,
        marks_obtained: 0,
      });
    }

    const subject = subjectMap.get(subjectId);
    subject.total_questions += 1;
    subject.total_marks += marks;
    if (hasAnswer) subject.attempted += 1;
    if (isCorrect) subject.correct += 1;
    if (hasAnswer && !isCorrect) subject.wrong += 1;
    if (isMarked) subject.marked_for_review += 1;
    subject.marks_obtained += marksObtained;

    const status = isMarked
      ? hasAnswer
        ? "answered_marked_for_review"
        : "marked_for_review"
      : hasAnswer
      ? "answered"
      : "not_attempted";

    const answerJson = {
      selected_option: selectedOption || selectedLabel || null,
      selected_label: selectedLabel || null,
      grading_mode: gradingMode,
      question_type: row.question_type_name || row.type_name || null,
      ml_evaluation: mlEvaluation,
      status,
      order: index + 1,
      time_taken_seconds: timeTakenSeconds || null,
    };

    compatibilityRows.push([
      row.question_id,
      selectedRaw || selectedOption || null,
      marksObtained,
      JSON.stringify(answerJson),
    ]);

    attemptAnswerRows.push({
      question_id: row.question_id,
      answer_text: selectedRaw || selectedOption || null,
      answer_json: JSON.stringify(answerJson),
      status,
      is_correct: hasAnswer ? (isCorrect ? 1 : 0) : null,
      marks_awarded: marksObtained,
    });

    feedback.push({
      ...normalizeQuestion(row, req, true),
      question_no: index + 1,
      selected_answer: selectedRaw || selectedOption || "",
      selected_option: selectedLabel || selectedOption || "",
      status,
      grading_mode: gradingMode,
      ml_evaluation: mlEvaluation,
      is_correct: hasAnswer ? isCorrect : null,
      marks_obtained: marksObtained,
    });
  });

  const not_answered = questionRows.length - answered;
  const percentage = max_marks > 0 ? Math.max(0, Number(((total_marks / max_marks) * 100).toFixed(2))) : 0;
  const subject_performance = Array.from(subjectMap.values()).map((subject) => ({
    ...subject,
    not_attempted: subject.total_questions - subject.attempted,
    percentage: subject.total_marks > 0 ? Math.max(0, Number(((subject.marks_obtained / subject.total_marks) * 100).toFixed(2))) : 0,
  }));

  return {
    result: {
      total_questions: questionRows.length,
      attempted: answered,
      answered,
      not_answered,
      marked_for_review,
      correct_count,
      correct: correct_count,
      wrong_count,
      wrong: wrong_count,
      total_marks,
      marks_obtained: total_marks,
      max_marks,
      percentage,
      pass_status: percentage >= 40 ? "Pass" : "Fail",
    },
    feedback,
    subject_performance,
    compatibilityRows,
    attemptAnswerRows,
  };
};

const insertAttemptEvent = async (attemptId, eventType, payload = {}) => {
  if (!attemptId) return;
  try {
    await query(
      "INSERT INTO attempt_events (attempt_id, event_type, event_payload) VALUES (?, ?, ?)",
      [attemptId, eventType, JSON.stringify(payload)]
    );
  } catch (err) {
    if (!isMissingSchema(err)) console.warn("Failed to write attempt event:", err.message);
  }
};

const saveAttemptAnswers = async (attemptId, scored) => {
  if (!attemptId) return;

  try {
    const attemptQuestions = await query(
      "SELECT attempt_question_id, question_id FROM exam_attempt_questions WHERE attempt_id = ?",
      [attemptId]
    );
    const questionMap = new Map(attemptQuestions.map((row) => [String(row.question_id), row.attempt_question_id]));

    const rows = scored.attemptAnswerRows
      .map((answer) => {
        const attemptQuestionId = questionMap.get(String(answer.question_id));
        if (!attemptQuestionId) return null;
        return [
          attemptId,
          attemptQuestionId,
          answer.question_id,
          answer.answer_text,
          answer.answer_json,
          answer.status,
          answer.is_correct,
          answer.marks_awarded,
        ];
      })
      .filter(Boolean);

    if (!rows.length) return;

    await query(
      `INSERT INTO exam_attempt_answers
       (attempt_id, attempt_question_id, question_id, answer_text, answer_json, status, is_correct, marks_awarded, auto_scored_at)
       VALUES ?
       ON DUPLICATE KEY UPDATE
         answer_text = VALUES(answer_text),
         answer_json = VALUES(answer_json),
         status = VALUES(status),
         is_correct = VALUES(is_correct),
         marks_awarded = VALUES(marks_awarded),
         auto_scored_at = NOW()`,
      [rows]
    );
  } catch (err) {
    if (!isMissingSchema(err)) console.warn("Failed to save normalized attempt answers:", err.message);
  }
};

const saveCompatibilityAnswers = async (examId, studentId, attemptId, scored) => {
  const simpleRows = scored.compatibilityRows.map((row) => [examId, studentId, row[0], row[1], row[2]]);
  if (!simpleRows.length) return;

  try {
    await query("DELETE FROM student_exam_answers WHERE exam_id = ? AND user_id = ?", [examId, studentId]);
  } catch (err) {
    if (!isMissingSchema(err)) console.warn("Failed to clear old exam answers:", err.message);
  }

  try {
    const extendedRows = scored.compatibilityRows.map((row) => [
      attemptId || null,
      examId,
      studentId,
      row[0],
      row[1],
      row[1],
      row[2],
      row[2],
      row[3],
      "auto_scored",
    ]);
    await query(
      `INSERT INTO student_exam_answers
       (attempt_id, exam_id, user_id, question_id, selected_answer, student_answer, marks_awarded, marks_obtained, answer_json, review_status)
      VALUES ?`,
      [extendedRows]
    );
  } catch (err) {
    if (!isMissingSchema(err)) {
      console.warn("Failed to save extended student_exam_answers:", err.message);
    }

    try {
      await query(
        `INSERT INTO student_exam_answers (exam_id, user_id, question_id, student_answer, marks_obtained)
         VALUES ?`,
        [simpleRows]
      );
    } catch (fallbackErr) {
      if (!isMissingSchema(fallbackErr)) console.warn("Failed to save student_exam_answers:", fallbackErr.message);
    }
  }

  try {
    await query(
      `INSERT INTO student_answers (exam_id, user_id, question_id, answer, marks_obtained)
       VALUES ?
       ON DUPLICATE KEY UPDATE
         answer = VALUES(answer),
         marks_obtained = VALUES(marks_obtained),
         submitted_at = NOW()`,
      [simpleRows]
    );
  } catch (err) {
    if (!isMissingSchema(err)) console.warn("Failed to save legacy student_answers:", err.message);
  }
};

const saveResult = async ({ examId, studentId, submissionId, attemptId, scored }) => {
  const result = scored.result;
  const analysisJson = JSON.stringify({
    subject_performance: scored.subject_performance,
    pass_status: result.pass_status,
  });
  const feedbackJson = JSON.stringify(scored.feedback);

  try {
    await query(
      `INSERT INTO student_exam_results
       (submission_id, attempt_id, exam_id, user_id, start_time, end_time, total_marks, total_questions,
        correct_count, wrong_count, answered, not_answered, percentage, result_status, result_visibility,
        analysis_json, feedback_json, created_at)
       VALUES (?, ?, ?, ?, NOW(), NOW(), ?, ?, ?, ?, ?, ?, ?, 'auto_scored', 'full_feedback', ?, ?, NOW())
       ON DUPLICATE KEY UPDATE
         submission_id = VALUES(submission_id),
         attempt_id = VALUES(attempt_id),
         end_time = NOW(),
         total_marks = VALUES(total_marks),
         total_questions = VALUES(total_questions),
         correct_count = VALUES(correct_count),
         wrong_count = VALUES(wrong_count),
         answered = VALUES(answered),
         not_answered = VALUES(not_answered),
         percentage = VALUES(percentage),
         result_status = VALUES(result_status),
         result_visibility = VALUES(result_visibility),
         analysis_json = VALUES(analysis_json),
         feedback_json = VALUES(feedback_json),
         created_at = NOW()`,
      [
        submissionId || null,
        attemptId || null,
        examId,
        studentId,
        result.total_marks,
        result.total_questions,
        result.correct_count,
        result.wrong_count,
        result.answered,
        result.not_answered,
        result.percentage,
        analysisJson,
        feedbackJson,
      ]
    );
    return;
  } catch (err) {
    if (!isMissingSchema(err)) throw err;
  }

  await query(
    `INSERT INTO student_exam_results
     (exam_id, user_id, start_time, end_time, total_marks, correct_count, wrong_count, answered, not_answered)
     VALUES (?, ?, NOW(), NOW(), ?, ?, ?, ?, ?)
     ON DUPLICATE KEY UPDATE
       end_time = NOW(),
       total_marks = VALUES(total_marks),
       correct_count = VALUES(correct_count),
       wrong_count = VALUES(wrong_count),
       answered = VALUES(answered),
       not_answered = VALUES(not_answered)`,
    [examId, studentId, result.total_marks, result.correct_count, result.wrong_count, result.answered, result.not_answered]
  );
};

const updateSubmission = async ({ submissionId, status, submittedBy, antiCheatSummary }) => {
  if (!submissionId) return;
  try {
    await query(
      `UPDATE submissions
       SET end_time = NOW(),
           status = ?,
           submitted_by = ?,
           duration_seconds = TIMESTAMPDIFF(SECOND, start_time, NOW()),
           anti_cheat_summary = ?
       WHERE submission_id = ?`,
      [status, submittedBy, JSON.stringify(antiCheatSummary || {}), submissionId]
    );
  } catch (err) {
    if (!isMissingSchema(err)) {
      await query("UPDATE submissions SET end_time = NOW(), status = ? WHERE submission_id = ?", [status, submissionId]);
    }
  }
};

const updateAttempt = async ({ attemptId, status, scored, clientState }) => {
  if (!attemptId) return;
  try {
    await query(
      `UPDATE exam_attempts
       SET status = ?,
           submitted_at = NOW(),
           duration_seconds = TIMESTAMPDIFF(SECOND, started_at, NOW()),
           total_questions = ?,
           answered_count = ?,
           not_answered_count = ?,
           marked_for_review_count = ?,
           correct_count = ?,
           wrong_count = ?,
           total_marks = ?,
           percentage = ?,
           client_state_json = ?
       WHERE attempt_id = ?`,
      [
        status,
        scored.result.total_questions,
        scored.result.answered,
        scored.result.not_answered,
        scored.result.marked_for_review,
        scored.result.correct_count,
        scored.result.wrong_count,
        scored.result.total_marks,
        scored.result.percentage,
        JSON.stringify(clientState || {}),
        attemptId,
      ]
    );
  } catch (err) {
    if (!isMissingSchema(err)) console.warn("Failed to update attempt:", err.message);
  }
};

const fetchStoredAnswers = async (examId, studentId) => {
  try {
    const rows = await query(
      `SELECT question_id,
              COALESCE(student_answer, selected_answer) AS student_answer,
              COALESCE(marks_obtained, marks_awarded, 0) AS marks_obtained,
              answer_json
       FROM student_exam_answers
       WHERE exam_id = ? AND user_id = ?`,
      [examId, studentId]
    );
    if (rows.length) return rows;
  } catch (err) {
    if (!isMissingSchema(err)) console.warn("Failed to load student_exam_answers:", err.message);
  }

  try {
    return await query(
      "SELECT question_id, answer AS student_answer, marks_obtained FROM student_answers WHERE exam_id = ? AND user_id = ?",
      [examId, studentId]
    );
  } catch (err) {
    if (!isMissingSchema(err)) console.warn("Failed to load legacy answers:", err.message);
    return [];
  }
};

const buildResultResponse = async (req, examId, studentId, submissionId = null) => {
  const exam = await getExam(examId);
  const questionRows = await getExamQuestionRowsForScoring(examId);
  const answerRows = await fetchStoredAnswers(examId, studentId);

  const answers = answerRows.map((row) => {
    let answerJson = {};
    try {
      answerJson = row.answer_json ? JSON.parse(row.answer_json) : {};
    } catch (error) {
      answerJson = {};
    }
    return {
      question_id: row.question_id,
      student_answer: row.student_answer || "",
      selected_option: answerJson.selected_option || answerJson.selected_label || "",
      status: answerJson.status || "",
    };
  });

  const scored = scoreAnswers(questionRows, answers, req);
  let resultRow = null;
  try {
    const resultRows = await query(
      `SELECT * FROM student_exam_results
       WHERE exam_id = ? AND user_id = ?
       ORDER BY created_at DESC, id DESC
       LIMIT 1`,
      [examId, studentId]
    );
    resultRow = resultRows[0] || null;
  } catch (err) {
    if (!isMissingSchema(err)) console.warn("Failed to load result summary:", err.message);
  }

  const result = {
    ...(resultRow || {}),
    ...scored.result,
    exam_id: toNumber(examId),
    student_id: toNumber(studentId),
    submission_id: submissionId || resultRow?.submission_id || null,
    exam_title: exam?.title || "Exam",
  };

  return {
    ok: true,
    exam,
    result,
    feedback: scored.feedback,
    subject_performance: scored.subject_performance,
    answer_breakdown: {
      correct: scored.result.correct_count,
      wrong: scored.result.wrong_count,
      unattempted: scored.result.not_answered,
      marked_for_review: scored.result.marked_for_review,
    },
  };
};

const listExams = async (type, studentId) => {
  const activeWindow = `e.status IN ('active', 'scheduled')
    AND (e.start_time IS NULL OR e.start_time <= NOW())
    AND (e.end_time IS NULL OR e.end_time >= NOW())`;
  const scheduledWindow = `e.status = 'scheduled' AND e.start_time > NOW()`;

  if (type === "completed") {
    return query(
      `SELECT e.exam_id, e.title, e.course_id, e.duration, e.exam_date, e.start_time, e.end_time,
              e.status, e.schoolname, e.class, c.course_name,
              MAX(ser.total_marks) AS total_marks,
              MAX(ser.total_questions) AS total_questions,
              MAX(ser.percentage) AS percentage,
              MAX(ser.correct_count) AS correct_count,
              MAX(ser.wrong_count) AS wrong_count,
              MAX(ser.answered) AS answered,
              MAX(ser.not_answered) AS not_answered,
              MAX(ser.created_at) AS result_date
       FROM student_exam_results ser
       INNER JOIN exams e ON e.exam_id = ser.exam_id
       LEFT JOIN courses c ON c.course_id = e.course_id
       WHERE ser.user_id = ?
       GROUP BY e.exam_id, e.title, e.course_id, e.duration, e.exam_date, e.start_time, e.end_time,
                e.status, e.schoolname, e.class, c.course_name
       ORDER BY result_date DESC
       LIMIT 50`,
      [studentId]
    );
  }

  const windowClause = type === "scheduled" ? scheduledWindow : activeWindow;

  try {
    return await query(
      `SELECT e.exam_id, e.title, e.course_id, e.duration, e.exam_date, e.start_time, e.end_time,
              e.status, e.schoolname, e.class, c.course_name
       FROM exams e
       LEFT JOIN courses c ON c.course_id = e.course_id
       INNER JOIN exam_students es ON es.exam_id = e.exam_id AND es.student_id = ? AND es.status = 'assigned'
       LEFT JOIN student_exam_results ser ON ser.exam_id = e.exam_id AND ser.user_id = ?
       WHERE ${windowClause}
         AND ser.id IS NULL
       ORDER BY e.start_time ASC, e.exam_date ASC`,
      [studentId, studentId]
    );
  } catch (err) {
    if (!isMissingSchema(err)) throw err;
  }

  try {
    return await query(
      `SELECT e.exam_id, e.title, e.course_id, e.duration, e.exam_date, e.start_time, e.end_time,
              e.status, e.schoolname, e.class, c.course_name
       FROM exams e
       LEFT JOIN courses c ON c.course_id = e.course_id
       INNER JOIN student_enrollments se ON se.course_id = e.course_id AND se.student_id = ?
       LEFT JOIN student_exam_results ser ON ser.exam_id = e.exam_id AND ser.user_id = ?
       WHERE ${windowClause}
         AND ser.id IS NULL
       ORDER BY e.start_time ASC, e.exam_date ASC`,
      [studentId, studentId]
    );
  } catch (err) {
    if (isMissingSchema(err)) return [];
    throw err;
  }
};

router.get("/active", async (req, res) => {
  try {
    const { student_id } = req.query;
    if (!student_id) return res.status(400).json({ error: "Missing student_id" });
    const exams = await listExams("active", student_id);
    res.json({ exams: exams.map((exam) => ({ ...exam, status: "active" })) });
  } catch (err) {
    res.status(500).json({ error: "Failed to load active exams", details: err.message });
  }
});

router.get("/scheduled", async (req, res) => {
  try {
    const { student_id } = req.query;
    if (!student_id) return res.status(400).json({ error: "Missing student_id" });
    const exams = await listExams("scheduled", student_id);
    res.json({ exams: exams.map((exam) => ({ ...exam, status: "scheduled" })) });
  } catch (err) {
    res.status(500).json({ error: "Failed to load scheduled exams", details: err.message });
  }
});

router.get("/completed", async (req, res) => {
  try {
    const { student_id } = req.query;
    if (!student_id) return res.status(400).json({ error: "Missing student_id" });
    const exams = await listExams("completed", student_id);
    res.json({ exams: exams.map((exam) => ({ ...exam, status: "completed" })) });
  } catch (err) {
    res.status(500).json({ error: "Failed to load completed exams", details: err.message });
  }
});

router.get("/overview/:exam_id", async (req, res) => {
  try {
    const { exam_id } = req.params;
    const { student_id } = req.query;
    const exam = await getExam(exam_id);
    if (!exam) return res.status(404).json({ error: "Exam not found" });

    if (student_id) {
      const allowed = await getStudentAccess(exam_id, student_id);
      if (!allowed) return res.status(403).json({ error: "Exam is not assigned to this student" });
    }

    const questions = await getExamQuestions(exam_id, req, false);
    const subjects = groupQuestionsBySubject(questions).map(({ questions: _questions, ...subject }) => subject);
    const totalMarks = subjects.reduce((sum, subject) => sum + toNumber(subject.total_marks, 0), 0);

    res.json({
      ok: true,
      exam,
      subjects,
      total_questions: questions.length,
      total_marks: totalMarks,
      duration_seconds: durationSecondsForExam(exam),
      is_live: isExamLive(exam),
    });
  } catch (err) {
    res.status(500).json({ error: "Failed to load exam overview", details: err.message });
  }
});

router.post("/start", async (req, res) => {
  try {
    const { exam_id, student_id } = req.body;
    if (!exam_id || !student_id) return res.status(400).json({ error: "Missing exam_id or student_id" });

    const exam = await getExam(exam_id);
    if (!exam) return res.status(404).json({ error: "Exam not found" });

    const allowed = await getStudentAccess(exam_id, student_id);
    if (!allowed) return res.status(403).json({ error: "Exam is not assigned to this student" });

    if (!isExamLive(exam)) {
      return res.status(403).json({ error: "Exam is not currently active" });
    }

    if (await hasSubmittedResult(exam_id, student_id)) {
      return res.status(409).json({ error: "This exam has already been submitted" });
    }

    const durationSeconds = durationSecondsForExam(exam);

    try {
      const existing = await query(
        `SELECT submission_id, attempt_id, start_time
         FROM submissions
         WHERE exam_id = ? AND student_id = ? AND status = 'in_progress'
         ORDER BY start_time DESC
         LIMIT 1`,
        [exam_id, student_id]
      );
      if (existing.length) {
        const startedAt = existing[0].start_time || new Date();
        return res.json({
          ok: true,
          resumed: true,
          submission_id: existing[0].submission_id,
          attempt_id: existing[0].attempt_id || null,
          started_at: new Date(startedAt).toISOString(),
          expires_at: getExpiryIso(startedAt, durationSeconds),
          server_time: new Date().toISOString(),
          duration_seconds: durationSeconds,
        });
      }
    } catch (err) {
      if (!isMissingSchema(err)) throw err;
    }

    const submission = await query(
      "INSERT INTO submissions (exam_id, student_id, start_time, status) VALUES (?, ?, NOW(), 'in_progress')",
      [exam_id, student_id]
    );
    const submissionId = submission.insertId;
    let attemptId = null;

    try {
      const questions = await getExamQuestions(exam_id, req, false);
      const attempt = await query(
        `INSERT INTO exam_attempts
         (attempt_uid, exam_id, student_id, attempt_type, status, started_at, total_questions, not_answered_count)
         VALUES (?, ?, ?, 'my_exam', 'in_progress', NOW(), ?, ?)`,
        [`exam_${exam_id}_${student_id}_${Date.now()}`, exam_id, student_id, questions.length, questions.length]
      );
      attemptId = attempt.insertId;

      if (questions.length) {
        const rows = questions.map((question, index) => [
          attemptId,
          exam_id,
          question.question_id,
          question.subject_name || question.section || "General",
          index + 1,
          toNumber(question.marks, 1),
          toNumber(question.negative_marks, 0),
          JSON.stringify(question),
        ]);
        await query(
          `INSERT INTO exam_attempt_questions
           (attempt_id, exam_id, question_id, section_code, question_order, marks, negative_marks, question_snapshot)
           VALUES ?`,
          [rows]
        );
      }

      await insertAttemptEvent(attemptId, "start", { submission_id: submissionId });

      try {
        await query("UPDATE submissions SET attempt_id = ?, submission_uid = COALESCE(submission_uid, ?) WHERE submission_id = ?", [
          attemptId,
          `SUB-${submissionId}`,
          submissionId,
        ]);
      } catch (err) {
        if (!isMissingSchema(err)) console.warn("Failed to link attempt to submission:", err.message);
      }
    } catch (err) {
      if (!isMissingSchema(err)) throw err;
    }

    const startedAt = new Date();
    res.json({
      ok: true,
      submission_id: submissionId,
      attempt_id: attemptId,
      started_at: startedAt.toISOString(),
      expires_at: getExpiryIso(startedAt, durationSeconds),
      server_time: startedAt.toISOString(),
      duration_seconds: durationSeconds,
    });
  } catch (err) {
    res.status(500).json({ error: "Failed to start exam", details: err.message });
  }
});

router.get("/questions/:exam_id", async (req, res) => {
  try {
    const { exam_id } = req.params;
    const { student_id } = req.query;
    if (student_id) {
      const allowed = await getStudentAccess(exam_id, student_id);
      if (!allowed) return res.status(403).json({ error: "Exam is not assigned to this student" });
    }

    const questions = await getExamQuestions(exam_id, req, false);
    res.json(groupQuestionsBySubject(questions));
  } catch (err) {
    res.status(500).json({ error: "Failed to load questions", details: err.message });
  }
});

router.post("/event", async (req, res) => {
  try {
    const { attempt_id, submission_id, event_type, payload } = req.body;
    const allowedEvents = new Set([
      "tab_switch",
      "copy_attempt",
      "paste_attempt",
      "fullscreen_exit",
      "network_loss",
      "resume",
      "answer_save",
      "section_change",
    ]);
    const type = allowedEvents.has(event_type) ? event_type : "tab_switch";
    await insertAttemptEvent(attempt_id, type, { submission_id, ...(payload || {}) });
    res.json({ ok: true });
  } catch (err) {
    res.status(500).json({ error: "Failed to log event", details: err.message });
  }
});

router.post("/submit", async (req, res) => {
  try {
    const {
      submission_id,
      attempt_id,
      exam_id,
      student_id,
      answers,
      client_state,
      submitted_by = "student",
      reason = "manual",
      tab_warnings = 0,
    } = req.body;

    if (!exam_id || !student_id || (!Array.isArray(answers) && (!answers || typeof answers !== "object"))) {
      return res.status(400).json({ error: "Missing required fields" });
    }

    const questionRows = await getExamQuestionRowsForScoring(exam_id);
    const scored = scoreAnswers(questionRows, answers, req);
    const attemptStatus = reason === "timeout" ? "timeout" : reason === "tab_switch" || reason === "auto" ? "auto_submitted" : "submitted";

    await saveResult({ examId: exam_id, studentId: student_id, submissionId: submission_id, attemptId: attempt_id, scored });
    await saveCompatibilityAnswers(exam_id, student_id, attempt_id, scored);
    await saveAttemptAnswers(attempt_id, scored);
    await updateAttempt({ attemptId: attempt_id, status: attemptStatus, scored, clientState: client_state });
    await updateSubmission({
      submissionId: submission_id,
      status: attemptStatus === "submitted" ? "submitted" : "auto_submitted",
      submittedBy: submitted_by === "system" ? "system" : "student",
      antiCheatSummary: {
        reason,
        tab_warnings,
        submitted_at: new Date().toISOString(),
      },
    });
    await insertAttemptEvent(attempt_id, attemptStatus === "submitted" ? "submit" : "auto_submit", {
      submission_id,
      reason,
      tab_warnings,
    });

    res.json({
      ok: true,
      message: "Exam submitted successfully",
      submission_id,
      attempt_id,
      result: scored.result,
      feedback: scored.feedback,
      subject_performance: scored.subject_performance,
      answer_breakdown: {
        correct: scored.result.correct_count,
        wrong: scored.result.wrong_count,
        unattempted: scored.result.not_answered,
        marked_for_review: scored.result.marked_for_review,
      },
    });
  } catch (err) {
    res.status(500).json({ error: "Failed to submit exam", details: err.message });
  }
});

router.get("/result", async (req, res) => {
  try {
    let { submission_id, exam_id, student_id } = req.query;

    if ((!exam_id || !student_id) && submission_id) {
      try {
        const rows = await query(
          "SELECT exam_id, user_id AS student_id FROM student_exam_results WHERE submission_id = ? LIMIT 1",
          [submission_id]
        );
        if (rows.length) {
          exam_id = rows[0].exam_id;
          student_id = rows[0].student_id;
        }
      } catch (err) {
        if (!isMissingSchema(err)) throw err;
      }
    }

    if ((!exam_id || !student_id) && submission_id) {
      const rows = await query(
        "SELECT exam_id, student_id FROM submissions WHERE submission_id = ? LIMIT 1",
        [submission_id]
      );
      if (rows.length) {
        exam_id = rows[0].exam_id;
        student_id = rows[0].student_id;
      }
    }

    if (!exam_id || !student_id) {
      return res.status(400).json({ error: "exam_id and student_id required" });
    }

    const result = await buildResultResponse(req, exam_id, student_id, submission_id || null);
    res.json(result);
  } catch (err) {
    res.status(500).json({ error: "Failed to load result", details: err.message });
  }
});

module.exports = router;
