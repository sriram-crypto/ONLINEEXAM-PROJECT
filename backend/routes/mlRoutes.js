const express = require("express");
const router = express.Router();
const db = require("../config/db");
const ml = require("../services/mlEngine");

const query = (sql, params = []) =>
  new Promise((resolve, reject) => {
    db.query(sql, params, (err, rows) => {
      if (err) reject(err);
      else resolve(rows || []);
    });
  });

const isMissingSchema = (err) =>
  err && (err.code === "ER_NO_SUCH_TABLE" || err.code === "ER_BAD_FIELD_ERROR" || err.errno === 1146 || err.errno === 1054);

const parseJson = (value, fallback = null) => {
  if (!value) return fallback;
  if (typeof value === "object") return value;
  try {
    return JSON.parse(value);
  } catch (_error) {
    return fallback;
  }
};

const optionValues = (row) => [row.option1, row.option2, row.option3, row.option4].filter(Boolean);

const questionSelectSql = `
  SELECT qa.id, qa.id AS question_id, qa.question_text, qa.option1, qa.option2, qa.option3, qa.option4,
         qa.answer, qa.category_id, qa.course_id, qa.subject_id, qa.chapter_id, qa.level_id,
         qa.question_type_id, s.subject_name, c.course_name, ch.chapter_name, dl.level_name, qt.type_name
  FROM questions_answers qa
  LEFT JOIN subjects s ON s.subject_id = qa.subject_id
  LEFT JOIN courses c ON c.course_id = qa.course_id
  LEFT JOIN chapters ch ON ch.chapter_id = qa.chapter_id
  LEFT JOIN difficulty_levels dl ON dl.level_id = qa.level_id
  LEFT JOIN question_types qt ON qt.question_type_id = qa.question_type_id
`;

const fetchQuestionBank = async ({ course_id, subject_id, chapter_id, level_id, question_type_id, limit = 600 } = {}) => {
  const where = [];
  const params = [];
  if (course_id) {
    where.push("qa.course_id = ?");
    params.push(Number(course_id));
  }
  if (subject_id) {
    where.push("qa.subject_id = ?");
    params.push(Number(subject_id));
  }
  if (chapter_id && chapter_id !== "ALL") {
    where.push("qa.chapter_id = ?");
    params.push(Number(chapter_id));
  }
  if (level_id) {
    where.push("qa.level_id = ?");
    params.push(Number(level_id));
  }
  if (question_type_id) {
    where.push("qa.question_type_id = ?");
    params.push(Number(question_type_id));
  }
  params.push(Math.max(1, Math.min(Number(limit) || 600, 1500)));

  const sql = `${questionSelectSql} ${where.length ? `WHERE ${where.join(" AND ")}` : ""} ORDER BY qa.id DESC LIMIT ?`;
  return query(sql, params);
};

const resolveCorrectness = async (answered = []) => {
  const items = Array.isArray(answered) ? answered : [];
  const unresolved = items.filter((row) => row.correct === undefined && row.is_correct === undefined && row.q_id);
  if (!unresolved.length) return items;

  const ids = unresolved.map((row) => Number(row.q_id || row.question_id)).filter(Boolean);
  if (!ids.length) return items;
  const rows = await query("SELECT id, answer, option1, option2, option3, option4 FROM questions_answers WHERE id IN (?)", [ids]);
  const byId = new Map(rows.map((row) => [String(row.id), row]));

  return items.map((row) => {
    if (row.correct !== undefined || row.is_correct !== undefined) return row;
    const question = byId.get(String(row.q_id || row.question_id));
    if (!question) return { ...row, correct: false };
    const selected = ml.normalizeText(row.student_answer || row.selected_answer || row.selected_option || row.answer || "");
    const answer = ml.normalizeText(question.answer);
    const labelMap = {
      a: question.option1,
      b: question.option2,
      c: question.option3,
      d: question.option4,
      "1": question.option1,
      "2": question.option2,
      "3": question.option3,
      "4": question.option4,
    };
    const selectedOptionText = labelMap[selected] ? ml.normalizeText(labelMap[selected]) : selected;
    return {
      ...row,
      correct: Boolean(selected && (selected === answer || selectedOptionText === answer)),
    };
  });
};

const fetchStudentResults = async (studentId) => {
  const rows = [];
  try {
    const examRows = await query(
      `SELECT ser.exam_id, ser.percentage, ser.total_marks, ser.total_questions, ser.correct_count,
              ser.wrong_count, ser.answered, ser.not_answered, ser.created_at, e.exam_date
       FROM student_exam_results ser
       LEFT JOIN exams e ON e.exam_id = ser.exam_id
       WHERE ser.user_id = ?
       ORDER BY ser.created_at DESC
       LIMIT 30`,
      [studentId]
    );
    rows.push(
      ...examRows.map((row) => ({
        ...row,
        percentage:
          row.percentage !== null && row.percentage !== undefined
            ? Number(row.percentage)
            : row.total_questions
            ? Number(((Number(row.correct_count || 0) / Number(row.total_questions)) * 100).toFixed(2))
            : Number(row.total_marks || 0),
      }))
    );
  } catch (err) {
    if (!isMissingSchema(err)) throw err;
  }

  try {
    const practiceRows = await query(
      `SELECT total_marks AS percentage, num_questions AS total_questions, correct_count,
              wrong_count, not_attempted_count AS not_answered, created_at
       FROM practice_results
       WHERE user_id = ?
       ORDER BY created_at DESC
       LIMIT 30`,
      [studentId]
    );
    rows.push(...practiceRows);
  } catch (err) {
    if (!isMissingSchema(err)) throw err;
  }

  return rows;
};

const toNumber = (value, fallback = 0) => {
  const number = Number(value);
  return Number.isFinite(number) ? number : fallback;
};

const avg = (values = []) => {
  const usable = values.map(Number).filter(Number.isFinite);
  return usable.length ? usable.reduce((sum, value) => sum + value, 0) / usable.length : 0;
};

const percentFromResult = (row = {}) => {
  if (row.percentage !== null && row.percentage !== undefined && row.percentage !== "") {
    return Number(ml.clamp(row.percentage, 0, 100).toFixed(2));
  }
  const totalQuestions = toNumber(row.total_questions, 0);
  if (totalQuestions > 0) return Number(ml.clamp((toNumber(row.correct_count) / totalQuestions) * 100, 0, 100).toFixed(2));
  const maxMarks = toNumber(row.max_marks, 0);
  if (maxMarks > 0) return Number(ml.clamp((toNumber(row.total_marks) / maxMarks) * 100, 0, 100).toFixed(2));
  return Number(ml.clamp(row.total_marks, 0, 100).toFixed(2));
};

const performanceStatus = (percentage) => {
  if (percentage < 40) return "Critical";
  if (percentage < 60) return "Weak";
  if (percentage < 75) return "Needs Practice";
  return "Strong";
};

const riskLevel = (score) => {
  if (score >= 70) return "High";
  if (score >= 45) return "Medium";
  return "Low";
};

const sortedByDate = (rows = []) =>
  [...rows].sort((a, b) => new Date(a.created_at || a.exam_date || 0) - new Date(b.created_at || b.exam_date || 0));

const extractSubjectRows = (row = {}) => {
  const analysis = parseJson(row.analysis_json, {});
  const subjects = Array.isArray(analysis?.subject_performance) ? analysis.subject_performance : [];
  return subjects.map((subject) => ({
    exam_id: row.exam_id,
    user_id: row.user_id,
    subject_id: subject.subject_id || subject.subject_name || "general",
    subject_name: subject.subject_name || "General",
    total_questions: toNumber(subject.total_questions, 0),
    attempted: toNumber(subject.attempted, 0),
    correct: toNumber(subject.correct, 0),
    wrong: toNumber(subject.wrong, 0),
    not_attempted: toNumber(subject.not_attempted, Math.max(0, toNumber(subject.total_questions, 0) - toNumber(subject.attempted, 0))),
    total_marks: toNumber(subject.total_marks, 0),
    marks_obtained: toNumber(subject.marks_obtained, 0),
    percentage: toNumber(subject.percentage, 0),
    created_at: row.created_at,
  }));
};

const fetchFallbackSubjectRows = async ({ examId, studentId, className, schoolname }) => {
  const where = [];
  const params = [];
  if (examId) {
    where.push("sea.exam_id = ?");
    params.push(examId);
  }
  if (studentId) {
    where.push("sea.user_id = ?");
    params.push(studentId);
  }
  if (className) {
    where.push("u.class = ?");
    params.push(className);
  }
  if (schoolname) {
    where.push("u.schoolname = ?");
    params.push(schoolname);
  }

  try {
    return await query(
      `SELECT sea.exam_id, sea.user_id, qa.subject_id, COALESCE(s.subject_name, 'General') AS subject_name,
              COUNT(*) AS total_questions,
              SUM(CASE WHEN COALESCE(sea.student_answer, sea.selected_answer, '') <> '' THEN 1 ELSE 0 END) AS attempted,
              SUM(CASE WHEN COALESCE(sea.marks_obtained, sea.marks_awarded, 0) > 0 THEN 1 ELSE 0 END) AS correct,
              SUM(CASE WHEN COALESCE(sea.student_answer, sea.selected_answer, '') <> ''
                         AND COALESCE(sea.marks_obtained, sea.marks_awarded, 0) <= 0 THEN 1 ELSE 0 END) AS wrong,
              SUM(COALESCE(eqm.marks, qa.positive_marks, 1)) AS total_marks,
              SUM(COALESCE(sea.marks_obtained, sea.marks_awarded, 0)) AS marks_obtained,
              MAX(sea.answered_at) AS created_at
       FROM student_exam_answers sea
       INNER JOIN users u ON u.user_id = sea.user_id
       LEFT JOIN questions_answers qa ON qa.id = sea.question_id
       LEFT JOIN subjects s ON s.subject_id = qa.subject_id
       LEFT JOIN exam_question_mapping eqm ON eqm.exam_id = sea.exam_id AND eqm.question_id = sea.question_id
       ${where.length ? `WHERE ${where.join(" AND ")}` : ""}
       GROUP BY sea.exam_id, sea.user_id, qa.subject_id, s.subject_name`,
      params
    );
  } catch (err) {
    if (isMissingSchema(err)) return [];
    throw err;
  }
};

const addSubjectMetric = (subjectMap, row) => {
  const key = String(row.subject_id || row.subject_name || "general");
  if (!subjectMap.has(key)) {
    subjectMap.set(key, {
      subject_id: row.subject_id || null,
      subject_name: row.subject_name || "General",
      total_questions: 0,
      attempted: 0,
      correct: 0,
      wrong: 0,
      not_attempted: 0,
      total_marks: 0,
      marks_obtained: 0,
      percentages: [],
      dates: [],
    });
  }

  const subject = subjectMap.get(key);
  const totalQuestions = toNumber(row.total_questions, 0);
  const attempted = toNumber(row.attempted, 0);
  const totalMarks = toNumber(row.total_marks, 0);
  const marksObtained = toNumber(row.marks_obtained, 0);
  const percentage = row.percentage !== undefined && row.percentage !== null && row.percentage !== ""
    ? toNumber(row.percentage, 0)
    : totalMarks > 0
    ? (marksObtained / totalMarks) * 100
    : totalQuestions > 0
    ? (toNumber(row.correct, 0) / totalQuestions) * 100
    : 0;

  subject.total_questions += totalQuestions;
  subject.attempted += attempted;
  subject.correct += toNumber(row.correct, 0);
  subject.wrong += toNumber(row.wrong, 0);
  subject.not_attempted += row.not_attempted !== undefined ? toNumber(row.not_attempted, 0) : Math.max(0, totalQuestions - attempted);
  subject.total_marks += totalMarks;
  subject.marks_obtained += marksObtained;
  subject.percentages.push(ml.clamp(percentage, 0, 100));
  if (row.created_at) subject.dates.push(row.created_at);
};

const finalizeSubjectMetric = (subject) => {
  const percentage =
    subject.total_marks > 0
      ? (subject.marks_obtained / subject.total_marks) * 100
      : subject.total_questions > 0
      ? (subject.correct / subject.total_questions) * 100
      : avg(subject.percentages);
  const skipRate = subject.total_questions > 0 ? subject.not_attempted / subject.total_questions : 0;
  const trend = ml.slope(subject.percentages);
  const weaknessScore = Math.round(
    ml.clamp((100 - ml.clamp(percentage, 0, 100)) * 0.68 + skipRate * 22 + Math.max(0, -trend) * 4 + (subject.percentages.length < 2 ? 4 : 0))
  );

  return {
    ...subject,
    percentage: Number(ml.clamp(percentage, 0, 100).toFixed(2)),
    skip_rate: Number((skipRate * 100).toFixed(1)),
    trend: Number(trend.toFixed(2)),
    weakness_score: weaknessScore,
    status: performanceStatus(percentage),
    recommended_focus_hours: weaknessScore >= 65 ? 5 : weaknessScore >= 45 ? 3 : weaknessScore >= 28 ? 1 : 0,
  };
};

const recommendationsForStudent = ({ weakSubjects, riskScore, trend, skipRate, latestPercentage }) => {
  const recommendations = [];
  if (weakSubjects[0]) recommendations.push(`Assign focused practice in ${weakSubjects[0].subject_name}.`);
  if (weakSubjects[1]) recommendations.push(`Schedule revision for ${weakSubjects[1].subject_name}.`);
  if (riskScore >= 70) recommendations.push("Arrange a mentoring call and weekly progress review.");
  if (trend < -3) recommendations.push("Review the last three attempts because the score trend is dropping.");
  if (skipRate >= 25) recommendations.push("Train attempt strategy; too many questions are left unanswered.");
  if (latestPercentage < 40) recommendations.push("Give remedial worksheet before the next exam.");
  if (!recommendations.length) recommendations.push("Maintain current practice plan and monitor next exam.");
  return recommendations.slice(0, 4);
};

router.post("/suggest-tags", async (req, res) => {
  try {
    const questionText = req.body.question_text || req.body.text || "";
    const options = req.body.options || optionValues(req.body);
    if (!ml.cleanText(questionText)) {
      return res.status(400).json({ error: "question_text is required" });
    }

    const [levels, types, subjects, chapters, nearby] = await Promise.all([
      query("SELECT level_id, level_name FROM difficulty_levels ORDER BY level_id"),
      query("SELECT question_type_id, type_name FROM question_types ORDER BY question_type_id"),
      query("SELECT subject_id, subject_name FROM subjects ORDER BY subject_name"),
      query("SELECT chapter_id, chapter_name, subject_id FROM chapters ORDER BY chapter_name"),
      fetchQuestionBank({ course_id: req.body.course_id, subject_id: req.body.subject_id, limit: 250 }).catch(() => []),
    ]);

    const inferredDifficulty = ml.inferDifficultyFromQuestion(questionText, options);
    const difficulty =
      levels.find((level) => ml.difficultyBucket(level.level_name) === inferredDifficulty.label) ||
      levels.find((level) => ml.difficultyBucket(level.level_name) === "Medium") ||
      levels[0] ||
      null;

    const typeName = options.length >= 2 ? "MCQ" : /\btrue|false\b/i.test(questionText) ? "True/False" : "Fill in the Blanks";
    const questionType =
      types.find((type) => ml.normalizeText(type.type_name).includes(ml.normalizeText(typeName))) ||
      types.find((type) => /mcq/i.test(type.type_name)) ||
      types[0] ||
      null;

    const rankedSubjects = subjects
      .map((subject) => {
        const labelledExamples = nearby
          .filter((question) => String(question.subject_id) === String(subject.subject_id))
          .slice(0, 20)
          .map((question) => question.question_text)
          .join(" ");
        return {
          ...subject,
          score: ml.textSimilarity(questionText, `${subject.subject_name} ${labelledExamples}`),
        };
      })
      .sort((a, b) => b.score - a.score);

    const subject = req.body.subject_id
      ? subjects.find((row) => String(row.subject_id) === String(req.body.subject_id))
      : rankedSubjects[0]?.score > 0
      ? rankedSubjects[0]
      : null;

    const rankedChapters = chapters
      .filter((chapter) => !subject || String(chapter.subject_id) === String(subject.subject_id))
      .map((chapter) => ({ ...chapter, score: ml.textSimilarity(questionText, chapter.chapter_name) }))
      .sort((a, b) => b.score - a.score);

    res.json({
      difficulty: difficulty
        ? {
            level_id: difficulty.level_id,
            level_name: difficulty.level_name,
            label: inferredDifficulty.label,
            confidence: inferredDifficulty.confidence,
          }
        : { label: inferredDifficulty.label, confidence: inferredDifficulty.confidence },
      subject: subject
        ? {
            subject_id: subject.subject_id,
            subject_name: subject.subject_name,
            confidence: Number(ml.clamp(subject.score || 0.45, 0.35, 0.89).toFixed(2)),
          }
        : null,
      chapter: rankedChapters[0]
        ? {
            chapter_id: rankedChapters[0].chapter_id,
            chapter_name: rankedChapters[0].chapter_name,
            subject_id: rankedChapters[0].subject_id,
            confidence: Number(ml.clamp(rankedChapters[0].score || 0.36, 0.28, 0.82).toFixed(2)),
          }
        : null,
      question_type: questionType
        ? {
            question_type_id: questionType.question_type_id,
            type_name: questionType.type_name,
            confidence: options.length >= 2 ? 0.86 : 0.62,
          }
        : null,
    });
  } catch (err) {
    res.status(500).json({ error: "Failed to suggest tags", details: err.message });
  }
});

router.post("/check-duplicate", async (req, res) => {
  try {
    const questionText = req.body.question_text || req.body.text || "";
    if (!ml.cleanText(questionText)) return res.status(400).json({ error: "question_text is required" });

    const bank = await fetchQuestionBank({
      course_id: req.body.course_id,
      subject_id: req.body.subject_id,
      chapter_id: req.body.chapter_id,
      limit: 900,
    });

    const best = bank
      .filter((row) => String(row.id) !== String(req.body.exclude_id || ""))
      .map((row) => ({
        ...row,
        similarity_score: Number(ml.textSimilarity(questionText, row.question_text).toFixed(3)),
      }))
      .sort((a, b) => b.similarity_score - a.similarity_score)[0];

    res.json({
      is_duplicate: Boolean(best && best.similarity_score >= 0.85),
      similar_question_id: best?.id || null,
      similar_question_text: best?.question_text || null,
      similarity_score: best?.similarity_score || 0,
      threshold: 0.85,
    });
  } catch (err) {
    res.status(500).json({ error: "Failed to check duplicate", details: err.message });
  }
});

router.post("/quality-score", (req, res) => {
  const questionText = req.body.question_text || req.body.text || "";
  if (!ml.cleanText(questionText)) return res.status(400).json({ error: "question_text is required" });
  const metrics = ml.qualityScore({
    question_text: questionText,
    answer: req.body.answer,
    options: req.body.options || optionValues(req.body),
  });
  res.json(metrics);
});

router.post("/search-questions", async (req, res) => {
  try {
    const searchQuery = req.body.query || req.body.q || "";
    if (!ml.cleanText(searchQuery)) return res.status(400).json({ error: "query is required" });
    const bank = await fetchQuestionBank({
      course_id: req.body.course_id,
      subject_id: req.body.subject_id,
      chapter_id: req.body.chapter_id,
      level_id: req.body.level_id,
      question_type_id: req.body.question_type_id,
      limit: req.body.limit || 1000,
    });

    const difficultyHint = /\b(easy|medium|moderate|hard|difficult)\b/i.exec(searchQuery)?.[1] || "";
    const typeHint = /\b(mcq|true false|fill|integer|matching|image)\b/i.exec(searchQuery)?.[1] || "";
    const results = bank
      .map((row) => {
        const semantic = ml.textSimilarity(
          searchQuery,
          `${row.question_text} ${row.subject_name || ""} ${row.chapter_name || ""} ${row.course_name || ""} ${row.type_name || ""}`
        );
        const difficultyBoost =
          difficultyHint && ml.difficultyBucket(row.level_name || row.level_id) === ml.difficultyBucket(difficultyHint) ? 0.08 : 0;
        const typeBoost = typeHint && ml.normalizeText(row.type_name || "").includes(ml.normalizeText(typeHint)) ? 0.06 : 0;
        return {
          ...row,
          semantic_score: Number(ml.clamp(semantic + difficultyBoost + typeBoost, 0, 1).toFixed(3)),
        };
      })
      .filter((row) => row.semantic_score > 0.05)
      .sort((a, b) => b.semantic_score - a.semantic_score)
      .slice(0, Math.max(1, Math.min(Number(req.body.top_k || req.body.limit || 30), 100)));

    res.json({ query: searchQuery, results });
  } catch (err) {
    res.status(500).json({ error: "Failed to search questions", details: err.message });
  }
});

router.post("/next-question", async (req, res) => {
  try {
    const remainingPool = Array.isArray(req.body.remaining_pool) ? req.body.remaining_pool.map(Number).filter(Boolean) : [];
    if (!remainingPool.length) {
      return res.json({ next_question_id: null, recommended_difficulty: "Medium", estimated_ability: 0.5 });
    }

    const answered = await resolveCorrectness(req.body.answered || []);
    const ability = ml.estimateAbility(answered);
    const remaining = await query(
      `${questionSelectSql} WHERE qa.id IN (?) ORDER BY qa.id ASC`,
      [remainingPool]
    );
    const pick = ml.pickNextQuestion(remaining, ability);

    res.json({
      next_question_id: pick?.question?.id || remainingPool[0],
      recommended_difficulty: pick?.target || ml.recommendedDifficultyForAbility(ability),
      estimated_ability: ability,
      answered_count: answered.length,
    });
  } catch (err) {
    res.status(500).json({ error: "Failed to select next question", details: err.message });
  }
});

router.get("/predict-score", async (req, res) => {
  try {
    const studentId = Number(req.query.student_id || req.query.user_id || 0);
    if (!studentId) return res.status(400).json({ error: "student_id is required" });
    const results = await fetchStudentResults(studentId);
    res.json({ student_id: studentId, ...ml.scorePrediction(results) });
  } catch (err) {
    res.status(500).json({ error: "Failed to predict score", details: err.message });
  }
});

router.get("/weak-chapters", async (req, res) => {
  try {
    const studentId = Number(req.query.student_id || req.query.user_id || 0);
    if (!studentId) return res.status(400).json({ error: "student_id is required" });

    let rows = [];
    try {
      rows = await query(
        `SELECT qa.chapter_id, COALESCE(ch.chapter_name, 'General') AS chapter_name,
                qa.subject_id, COALESCE(s.subject_name, 'General') AS subject_name,
                COUNT(*) AS attempts,
                SUM(CASE WHEN COALESCE(sea.marks_obtained, sea.marks_awarded, 0) > 0 THEN 1 ELSE 0 END) AS correct
         FROM student_exam_answers sea
         INNER JOIN questions_answers qa ON qa.id = sea.question_id
         LEFT JOIN chapters ch ON ch.chapter_id = qa.chapter_id
         LEFT JOIN subjects s ON s.subject_id = qa.subject_id
         WHERE sea.user_id = ?
         GROUP BY qa.chapter_id, ch.chapter_name, qa.subject_id, s.subject_name
         ORDER BY attempts DESC
         LIMIT 80`,
        [studentId]
      );
    } catch (err) {
      if (!isMissingSchema(err)) throw err;
    }

    const chapters = rows.map((row) => {
      const attempts = Number(row.attempts || 0);
      const correct = Number(row.correct || 0);
      const accuracy = attempts ? Math.round((correct / attempts) * 100) : 0;
      return {
        chapter_id: row.chapter_id,
        chapter_name: row.chapter_name,
        subject_id: row.subject_id,
        subject_name: row.subject_name,
        attempts,
        correct,
        accuracy,
        status: accuracy < 50 ? "Needs Revision" : accuracy < 70 ? "Practice More" : "Strong",
        recommended_study_hours: accuracy < 50 ? 4 : accuracy < 70 ? 2 : 1,
      };
    });

    const weakTopics = chapters
      .filter((chapter) => chapter.status !== "Strong")
      .sort((a, b) => a.accuracy - b.accuracy || b.attempts - a.attempts)
      .slice(0, 6);

    res.json({
      student_id: studentId,
      chapters,
      weak_topics: weakTopics,
      heatmap: chapters.map((chapter) => ({
        label: chapter.chapter_name,
        subject: chapter.subject_name,
        value: chapter.accuracy,
        status: chapter.status,
      })),
      recommended_study_hours: weakTopics.reduce((sum, chapter) => sum + chapter.recommended_study_hours, 0),
    });
  } catch (err) {
    res.status(500).json({ error: "Failed to detect weak chapters", details: err.message });
  }
});

router.get("/at-risk-students", async (req, res) => {
  try {
    const parentId = Number(req.query.parent_id || 0);
    const studentId = Number(req.query.student_id || 0);
    let students = [];

    if (parentId) {
      students = await query(
        `SELECT psl.student_id, u.name AS student_name
         FROM parent_student_links psl
         INNER JOIN users u ON u.user_id = psl.student_id
         WHERE psl.parent_id = ? AND psl.status = 'verified' AND psl.can_view_results = 1`,
        [parentId]
      );
    } else if (studentId) {
      students = await query("SELECT user_id AS student_id, name AS student_name FROM users WHERE user_id = ? LIMIT 1", [studentId]);
    }

    const alerts = [];
    for (const student of students) {
      const results = await fetchStudentResults(student.student_id);
      const summary = ml.atRiskSummary(student, results);
      alerts.push({
        ...summary,
        meeting_recommended: summary.at_risk,
        message: summary.at_risk
          ? `${summary.student_name}'s recent performance needs attention.`
          : `${summary.student_name}'s performance is currently stable.`,
      });
    }

    res.json({ parent_id: parentId || null, alerts });
  } catch (err) {
    res.status(500).json({ error: "Failed to classify at-risk students", details: err.message });
  }
});

router.get("/risk-score", async (req, res) => {
  try {
    const examId = Number(req.query.exam_id || 0);
    const where = examId ? "WHERE ea.exam_id = ?" : "";
    const params = examId ? [examId] : [];

    let attempts = [];
    try {
      attempts = await query(
        `SELECT ea.attempt_id, ea.exam_id, ea.student_id, u.name AS student_name,
                ea.percentage, ea.total_marks, ea.duration_seconds, ea.answered_count, ea.total_questions,
                ea.started_at, ea.submitted_at
         FROM exam_attempts ea
         LEFT JOIN users u ON u.user_id = ea.student_id
         ${where}
         ORDER BY ea.started_at DESC
         LIMIT 200`,
        params
      );
    } catch (err) {
      if (isMissingSchema(err)) return res.json({ exam_id: examId || null, attempts: [] });
      throw err;
    }

    const riskRows = [];
    for (const attempt of attempts) {
      const [events, answers, prior] = await Promise.all([
        query("SELECT event_type, event_payload, created_at FROM attempt_events WHERE attempt_id = ?", [attempt.attempt_id]).catch(() => []),
        query("SELECT answer_text, answer_json FROM exam_attempt_answers WHERE attempt_id = ?", [attempt.attempt_id]).catch(() => []),
        query(
          `SELECT AVG(percentage) AS avg_percentage
           FROM student_exam_results
           WHERE user_id = ? AND exam_id <> ?`,
          [attempt.student_id, attempt.exam_id]
        ).catch(() => []),
      ]);

      const tabSwitches = events.filter((event) => event.event_type === "tab_switch").length;
      const copyPaste = events.filter((event) => event.event_type === "copy_attempt" || event.event_type === "paste_attempt").length;
      const answerTimes = answers
        .map((answer) => parseJson(answer.answer_json, {}))
        .map((json) => Number(json.time_taken_seconds || json.time || 0))
        .filter((value) => value > 0);
      const avgAnswerTime = answerTimes.length ? answerTimes.reduce((sum, value) => sum + value, 0) / answerTimes.length : 0;
      const score = Number(attempt.percentage ?? attempt.total_marks ?? 0);
      const baseline = Number(prior[0]?.avg_percentage || score);
      const scoreGap = Math.max(0, score - baseline);
      const entropy = ml.answerEntropy(answers.map((row) => ({ ...parseJson(row.answer_json, {}), answer_text: row.answer_text })));
      const riskScore = ml.anomalyRiskScore({ tabSwitches, copyPaste, avgAnswerTime, scoreGap, entropy });

      riskRows.push({
        ...attempt,
        risk_score: riskScore,
        risk_level: ml.clamp(riskScore) >= 70 ? "High" : ml.clamp(riskScore) >= 40 ? "Medium" : "Low",
        tab_switches: tabSwitches,
        copy_paste_events: copyPaste,
        avg_answer_time_seconds: Number(avgAnswerTime.toFixed(1)),
        score_gap: Number(scoreGap.toFixed(1)),
        answer_pattern_entropy: Number(entropy.toFixed(2)),
      });
    }

    res.json({ exam_id: examId || null, attempts: riskRows });
  } catch (err) {
    res.status(500).json({ error: "Failed to score proctoring risk", details: err.message });
  }
});

router.get("/student-analytics", async (req, res) => {
  try {
    const examId = Number(req.query.exam_id || 0);
    const studentId = Number(req.query.student_id || 0);
    const className = String(req.query.class || "").trim();
    const schoolname = String(req.query.schoolname || "").trim();

    const where = ["LOWER(u.role) = 'student'"];
    const params = [];
    if (examId) {
      where.push("ser.exam_id = ?");
      params.push(examId);
    }
    if (studentId) {
      where.push("ser.user_id = ?");
      params.push(studentId);
    }
    if (className) {
      where.push("u.class = ?");
      params.push(className);
    }
    if (schoolname) {
      where.push("u.schoolname = ?");
      params.push(schoolname);
    }

    const resultRows = await query(
      `SELECT ser.id, ser.submission_id, ser.attempt_id, ser.exam_id, ser.user_id,
              ser.total_marks, ser.total_questions, ser.correct_count, ser.wrong_count,
              ser.answered, ser.not_answered, ser.percentage, ser.analysis_json, ser.feedback_json, ser.created_at,
              u.name AS student_name, u.email AS student_email, u.class, u.section, u.schoolname,
              e.title AS exam_title, e.exam_date, e.start_time, e.end_time, c.course_name
       FROM student_exam_results ser
       INNER JOIN users u ON u.user_id = ser.user_id
       LEFT JOIN exams e ON e.exam_id = ser.exam_id
       LEFT JOIN courses c ON c.course_id = e.course_id
       WHERE ${where.join(" AND ")}
       ORDER BY ser.created_at DESC, ser.id DESC
       LIMIT 2500`,
      params
    );

    const fallbackRows = await fetchFallbackSubjectRows({ examId, studentId, className, schoolname });
    const fallbackByAttempt = fallbackRows.reduce((map, row) => {
      const key = `${row.exam_id}:${row.user_id}`;
      if (!map.has(key)) map.set(key, []);
      const totalMarks = toNumber(row.total_marks, 0);
      map.get(key).push({
        ...row,
        not_attempted: Math.max(0, toNumber(row.total_questions, 0) - toNumber(row.attempted, 0)),
        percentage: totalMarks > 0 ? (toNumber(row.marks_obtained, 0) / totalMarks) * 100 : 0,
      });
      return map;
    }, new Map());

    const studentMap = new Map();
    const examMap = new Map();

    resultRows.forEach((row) => {
      const percentage = percentFromResult(row);
      const studentKey = String(row.user_id);
      if (!studentMap.has(studentKey)) {
        studentMap.set(studentKey, {
          student_id: row.user_id,
          student_name: row.student_name || `Student #${row.user_id}`,
          email: row.student_email || "",
          class: row.class || "",
          section: row.section || "",
          schoolname: row.schoolname || "",
          result_rows: [],
          exam_history: [],
          subjectMap: new Map(),
        });
      }

      const student = studentMap.get(studentKey);
      const normalizedResult = {
        exam_id: row.exam_id,
        exam_title: row.exam_title || `Exam #${row.exam_id}`,
        course_name: row.course_name || "",
        percentage,
        total_marks: toNumber(row.total_marks, 0),
        total_questions: toNumber(row.total_questions, 0),
        correct_count: toNumber(row.correct_count, 0),
        wrong_count: toNumber(row.wrong_count, 0),
        answered: toNumber(row.answered, 0),
        not_answered: toNumber(row.not_answered, 0),
        created_at: row.created_at,
      };
      student.result_rows.push(normalizedResult);
      student.exam_history.push(normalizedResult);

      const subjectRows = extractSubjectRows(row);
      const fallbackSubjects = fallbackByAttempt.get(`${row.exam_id}:${row.user_id}`) || [];
      (subjectRows.length ? subjectRows : fallbackSubjects).forEach((subjectRow) => addSubjectMetric(student.subjectMap, subjectRow));

      if (!examMap.has(String(row.exam_id))) {
        examMap.set(String(row.exam_id), {
          exam_id: row.exam_id,
          exam_title: row.exam_title || `Exam #${row.exam_id}`,
          course_name: row.course_name || "",
          attempts: 0,
          percentages: [],
          low_performers: 0,
          top_score: 0,
          latest_attempt: row.created_at,
        });
      }
      const exam = examMap.get(String(row.exam_id));
      exam.attempts += 1;
      exam.percentages.push(percentage);
      exam.low_performers += percentage < 40 ? 1 : 0;
      exam.top_score = Math.max(exam.top_score, percentage);
      if (new Date(row.created_at || 0) > new Date(exam.latest_attempt || 0)) exam.latest_attempt = row.created_at;
    });

    const students = Array.from(studentMap.values())
      .map((student) => {
        const results = sortedByDate(student.result_rows);
        const percentages = results.map((row) => row.percentage);
        const latest = results[results.length - 1] || null;
        const averagePercentage = avg(percentages);
        const trend = ml.slope(percentages);
        const totalQuestions = results.reduce((sum, row) => sum + toNumber(row.total_questions, 0), 0);
        const skipped = results.reduce((sum, row) => sum + toNumber(row.not_answered, 0), 0);
        const skipRate = totalQuestions > 0 ? (skipped / totalQuestions) * 100 : 0;
        const prediction = ml.scorePrediction(results);
        const subject_breakdown = Array.from(student.subjectMap.values())
          .map(finalizeSubjectMetric)
          .sort((a, b) => b.weakness_score - a.weakness_score || a.percentage - b.percentage);
        const weakSubjects = subject_breakdown
          .filter((subject) => subject.status !== "Strong" || subject.weakness_score >= 42)
          .slice(0, 4);
        const riskScore = Math.round(
          ml.clamp(
            (100 - averagePercentage) * 0.5 +
              Math.max(0, -trend) * 4 +
              Math.min(weakSubjects.length, 4) * 8 +
              skipRate * 0.35 +
              (latest?.percentage < 40 ? 12 : 0),
            0,
            100
          )
        );

        return {
          student_id: student.student_id,
          student_name: student.student_name,
          email: student.email,
          class: student.class,
          section: student.section,
          schoolname: student.schoolname,
          exams_attempted: results.length,
          average_percentage: Number(averagePercentage.toFixed(2)),
          latest_percentage: Number((latest?.percentage || 0).toFixed(2)),
          latest_exam: latest,
          trend: Number(trend.toFixed(2)),
          skip_rate: Number(skipRate.toFixed(1)),
          risk_score: riskScore,
          risk_level: riskLevel(riskScore),
          status: performanceStatus(averagePercentage),
          predicted_score: prediction.predicted_score,
          predicted_range: prediction.range,
          prediction_confidence: prediction.confidence,
          weak_subjects: weakSubjects,
          strongest_subjects: [...subject_breakdown].sort((a, b) => b.percentage - a.percentage).slice(0, 3),
          subject_breakdown,
          exam_history: [...student.exam_history].sort((a, b) => new Date(b.created_at || 0) - new Date(a.created_at || 0)).slice(0, 10),
          recommendations: recommendationsForStudent({
            weakSubjects,
            riskScore,
            trend,
            skipRate,
            latestPercentage: latest?.percentage || 0,
          }),
        };
      })
      .sort((a, b) => b.risk_score - a.risk_score || a.average_percentage - b.average_percentage);

    const subjectOverviewMap = new Map();
    students.forEach((student) => {
      student.subject_breakdown.forEach((subject) => {
        const key = String(subject.subject_id || subject.subject_name);
        if (!subjectOverviewMap.has(key)) {
          subjectOverviewMap.set(key, {
            subject_id: subject.subject_id,
            subject_name: subject.subject_name,
            students: 0,
            weak_students: 0,
            percentages: [],
            weakness_scores: [],
          });
        }
        const item = subjectOverviewMap.get(key);
        item.students += 1;
        item.weak_students += subject.status !== "Strong" || subject.weakness_score >= 42 ? 1 : 0;
        item.percentages.push(subject.percentage);
        item.weakness_scores.push(subject.weakness_score);
      });
    });

    const subject_overview = Array.from(subjectOverviewMap.values())
      .map((subject) => ({
        ...subject,
        average_percentage: Number(avg(subject.percentages).toFixed(2)),
        average_weakness_score: Math.round(avg(subject.weakness_scores)),
        weak_student_ratio: subject.students ? Number(((subject.weak_students / subject.students) * 100).toFixed(1)) : 0,
      }))
      .sort((a, b) => b.average_weakness_score - a.average_weakness_score || b.weak_students - a.weak_students);

    const exam_overview = Array.from(examMap.values())
      .map((exam) => ({
        ...exam,
        average_percentage: Number(avg(exam.percentages).toFixed(2)),
        low_performer_ratio: exam.attempts ? Number(((exam.low_performers / exam.attempts) * 100).toFixed(1)) : 0,
      }))
      .sort((a, b) => new Date(b.latest_attempt || 0) - new Date(a.latest_attempt || 0));

    const summary = {
      students: students.length,
      result_records: resultRows.length,
      exams: exam_overview.length,
      class_average: Number(avg(students.map((student) => student.average_percentage)).toFixed(2)),
      at_risk_students: students.filter((student) => student.risk_score >= 45).length,
      high_risk_students: students.filter((student) => student.risk_score >= 70).length,
      weak_subject_flags: students.reduce((sum, student) => sum + student.weak_subjects.length, 0),
      top_weak_subject: subject_overview[0]?.subject_name || null,
    };

    res.json({
      ok: true,
      filters: {
        exam_id: examId || null,
        student_id: studentId || null,
        class: className || null,
        schoolname: schoolname || null,
      },
      algorithm: {
        name: "ML Student Performance Diagnostics",
        methods: [
          "Weighted subject weakness scoring",
          "Linear trend regression",
          "At-risk classification",
          "Historical score prediction",
          "Skip-rate and low-performance clustering",
        ],
      },
      summary,
      students,
      subject_overview,
      exam_overview,
      available_exams: exam_overview.map((exam) => ({
        exam_id: exam.exam_id,
        exam_title: exam.exam_title,
        attempts: exam.attempts,
        average_percentage: exam.average_percentage,
      })),
    });
  } catch (err) {
    res.status(500).json({ error: "Failed to build student analytics", details: err.message });
  }
});

router.post("/optimize-worksheet", async (req, res) => {
  try {
    const targetCount = Number(req.body.target_count || req.body.question_count || 10);
    let questions = Array.isArray(req.body.questions) ? req.body.questions : [];
    if (!questions.length) {
      questions = await fetchQuestionBank({
        course_id: req.body.course_id,
        subject_id: req.body.subject_id,
        chapter_id: req.body.chapter_id,
        limit: 1000,
      });
    }

    const selected = ml.optimizeWorksheetSelection({
      questions,
      targetCount,
      weakChapterIds: req.body.weak_chapter_ids || [],
      difficultySplit: req.body.difficulty_split,
    });

    const focusAreas = Array.from(
      selected.reduce((map, question) => {
        const key = question.chapter_id || question.chapter_name || "general";
        if (!map.has(key)) {
          map.set(key, {
            chapter_id: question.chapter_id || null,
            chapter_name: question.chapter_name || "General",
            count: 0,
          });
        }
        map.get(key).count += 1;
        return map;
      }, new Map()).values()
    ).sort((a, b) => b.count - a.count);

    res.json({
      selected_question_ids: selected.map((question) => question.id || question.question_id),
      selected_questions: selected,
      focus_areas: focusAreas,
      difficulty_mix: selected.reduce((acc, question) => {
        const bucket = ml.difficultyBucket(question.level_name || question.level_id);
        acc[bucket] = (acc[bucket] || 0) + 1;
        return acc;
      }, {}),
    });
  } catch (err) {
    res.status(500).json({ error: "Failed to optimize worksheet", details: err.message });
  }
});

module.exports = router;
