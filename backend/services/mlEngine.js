const STOP_WORDS = new Set([
  "a",
  "an",
  "and",
  "are",
  "as",
  "at",
  "be",
  "by",
  "for",
  "from",
  "has",
  "in",
  "into",
  "is",
  "it",
  "of",
  "on",
  "or",
  "that",
  "the",
  "this",
  "to",
  "was",
  "were",
  "what",
  "which",
  "with",
]);

const clamp = (value, min = 0, max = 100) => Math.max(min, Math.min(max, Number(value) || 0));

const cleanText = (value) =>
  String(value ?? "")
    .replace(/<[^>]+>/g, " ")
    .replace(/\s+/g, " ")
    .trim();

const normalizeText = (value) =>
  cleanText(value)
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim();

const tokenize = (value) =>
  normalizeText(value)
    .split(" ")
    .filter((token) => token.length > 1 && !STOP_WORDS.has(token));

const termVector = (value) => {
  const vector = new Map();
  tokenize(value).forEach((token) => {
    vector.set(token, (vector.get(token) || 0) + 1);
  });
  return vector;
};

const cosineSimilarity = (left, right) => {
  const a = left instanceof Map ? left : termVector(left);
  const b = right instanceof Map ? right : termVector(right);
  let dot = 0;
  let aNorm = 0;
  let bNorm = 0;

  a.forEach((value, key) => {
    aNorm += value * value;
    dot += value * (b.get(key) || 0);
  });
  b.forEach((value) => {
    bNorm += value * value;
  });

  if (!aNorm || !bNorm) return 0;
  return dot / (Math.sqrt(aNorm) * Math.sqrt(bNorm));
};

const jaccardSimilarity = (left, right) => {
  const a = new Set(tokenize(left));
  const b = new Set(tokenize(right));
  if (!a.size || !b.size) return 0;
  let intersection = 0;
  a.forEach((token) => {
    if (b.has(token)) intersection += 1;
  });
  const union = new Set([...a, ...b]).size;
  return union ? intersection / union : 0;
};

const textSimilarity = (left, right) => {
  const exactBoost = normalizeText(left) === normalizeText(right) ? 1 : 0;
  return Math.max(exactBoost, cosineSimilarity(left, right) * 0.68 + jaccardSimilarity(left, right) * 0.32);
};

const keyTermCoverage = (studentAnswer, referenceAnswer) => {
  const referenceTerms = new Set(tokenize(referenceAnswer).filter((token) => token.length >= 4));
  if (!referenceTerms.size) return normalizeText(studentAnswer) ? 0.5 : 0;
  const studentTerms = new Set(tokenize(studentAnswer));
  let matched = 0;
  referenceTerms.forEach((term) => {
    if (studentTerms.has(term)) matched += 1;
  });
  return matched / referenceTerms.size;
};

const lengthAdequacy = (studentAnswer, referenceAnswer) => {
  const studentWords = tokenize(studentAnswer).length;
  const referenceWords = Math.max(1, tokenize(referenceAnswer).length);
  if (!studentWords) return 0;
  const ratio = studentWords / referenceWords;
  if (ratio >= 0.65 && ratio <= 1.55) return 1;
  if (ratio < 0.65) return clamp(ratio / 0.65, 0, 1);
  return clamp(1.55 / ratio, 0.45, 1);
};

const subjectiveAnswerScore = ({ studentAnswer, referenceAnswer, questionText = "", maxMarks = 1 }) => {
  const student = cleanText(studentAnswer);
  const reference = cleanText(referenceAnswer);
  const marks = Math.max(0, Number(maxMarks) || 0);

  if (!student) {
    return {
      score: 0,
      marks_awarded: 0,
      confidence: 0.92,
      similarity: 0,
      keyword_coverage: 0,
      length_adequacy: 0,
      algorithm: "TF-IDF cosine + Jaccard + keyword coverage",
      reason: "No answer submitted",
    };
  }

  if (!reference) {
    const fallback = Math.min(0.55, tokenize(student).length / 45);
    return {
      score: Number(fallback.toFixed(2)),
      marks_awarded: Number((marks * fallback).toFixed(2)),
      confidence: 0.38,
      similarity: 0,
      keyword_coverage: 0,
      length_adequacy: Number(lengthAdequacy(student, questionText || student).toFixed(2)),
      algorithm: "Length adequacy fallback",
      reason: "Reference answer missing",
    };
  }

  const similarity = textSimilarity(student, reference);
  const coverage = keyTermCoverage(student, reference);
  const adequacy = lengthAdequacy(student, reference);
  const promptRelevance = questionText ? textSimilarity(student, questionText) : similarity;
  const weighted = clamp(similarity * 0.58 + coverage * 0.24 + adequacy * 0.12 + promptRelevance * 0.06, 0, 1);
  const score = Number(weighted.toFixed(2));

  return {
    score,
    marks_awarded: Number((marks * score).toFixed(2)),
    confidence: Number(clamp(0.45 + similarity * 0.28 + coverage * 0.18 + adequacy * 0.09, 0.35, 0.92).toFixed(2)),
    similarity: Number(similarity.toFixed(2)),
    keyword_coverage: Number(coverage.toFixed(2)),
    length_adequacy: Number(adequacy.toFixed(2)),
    algorithm: "TF-IDF cosine + Jaccard + keyword coverage",
    reason: score >= 0.72 ? "Strong semantic match" : score >= 0.45 ? "Partial semantic match" : "Low semantic match",
  };
};

const difficultyBucket = (value) => {
  const text = normalizeText(value);
  if (!text) return "Medium";
  if (/\b(easy|basic|simple|low|beginner|remember|define|list)\b/.test(text)) return "Easy";
  if (/\b(hard|difficult|advanced|high|complex|analy[sz]e|derive|prove|evaluate)\b/.test(text)) return "Hard";
  if (/\b(medium|moderate|intermediate|apply|explain)\b/.test(text)) return "Medium";
  return "Medium";
};

const inferDifficultyFromQuestion = (questionText, options = []) => {
  const question = cleanText(questionText);
  const words = tokenize(question);
  const optionCount = options.filter(Boolean).length;
  const hasComplexCue = /\b(explain|derive|prove|analy[sz]e|compare|evaluate|calculate|application|reason)\b/i.test(question);
  const hasBasicCue = /\b(define|identify|name|who|what is|true|false|choose)\b/i.test(question);

  let score = 45;
  score += Math.min(words.length, 40) * 0.8;
  score += optionCount >= 4 ? 6 : 0;
  score += hasComplexCue ? 22 : 0;
  score -= hasBasicCue ? 16 : 0;

  if (score < 43) return { label: "Easy", confidence: 0.72 };
  if (score > 68) return { label: "Hard", confidence: 0.69 };
  return { label: "Medium", confidence: 0.64 };
};

const estimateAbility = (answered = []) => {
  if (!answered.length) return 0.5;
  const usable = answered.filter(Boolean);
  if (!usable.length) return 0.5;

  const weighted = usable.reduce(
    (acc, row, index) => {
      const correct = row.correct === true || row.is_correct === true || row.is_correct === 1;
      const orderWeight = 1 + index / Math.max(usable.length, 1) * 0.18;
      const time = Number(row.time_taken_seconds ?? row.time ?? row.seconds ?? 0);
      const speedWeight = time > 0 && time <= 20 ? 1.06 : time >= 90 ? 0.94 : 1;
      acc.weight += orderWeight;
      acc.correct += correct ? orderWeight * speedWeight : 0;
      return acc;
    },
    { correct: 0, weight: 0 }
  );

  const accuracy = weighted.weight ? weighted.correct / weighted.weight : 0.5;
  const recent = usable.slice(-3);
  const recentAccuracy = recent.filter((row) => row.correct === true || row.is_correct === true || row.is_correct === 1).length / recent.length;
  return Number(clamp(accuracy * 0.72 + recentAccuracy * 0.28, 0, 1).toFixed(2));
};

const recommendedDifficultyForAbility = (ability) => {
  if (ability >= 0.72) return "Hard";
  if (ability <= 0.42) return "Easy";
  return "Medium";
};

const pickNextQuestion = (remainingQuestions = [], ability = 0.5) => {
  if (!remainingQuestions.length) return null;
  const target = recommendedDifficultyForAbility(ability);
  const targetRank = { Easy: 1, Medium: 2, Hard: 3 }[target] || 2;

  const ranked = remainingQuestions
    .map((question) => {
      const bucket = difficultyBucket(question.level_name || question.difficulty || question.level_id);
      const rank = { Easy: 1, Medium: 2, Hard: 3 }[bucket] || 2;
      const distance = Math.abs(rank - targetRank);
      const freshness = Number(question.order_no || question.id || question.question_id || 0) % 17;
      return { question, score: distance * 100 - freshness };
    })
    .sort((a, b) => a.score - b.score);

  return {
    question: ranked[0].question,
    target,
  };
};

const readabilityScore = (value) => {
  const text = cleanText(value);
  if (!text) return 0;
  const words = text.split(/\s+/).filter(Boolean);
  const sentences = Math.max(1, text.split(/[.!?]+/).filter((part) => part.trim()).length);
  const avgWords = words.length / sentences;
  const longWords = words.filter((word) => word.length >= 9).length;
  const penalty = Math.max(0, avgWords - 14) * 2.4 + longWords * 1.8;
  return Math.round(clamp(96 - penalty, 10, 100));
};

const distractorQuality = (answer, options = []) => {
  const wrongOptions = options.filter((option) => cleanText(option) && normalizeText(option) !== normalizeText(answer));
  if (!wrongOptions.length) return 0.35;
  const similarities = wrongOptions.map((option) => textSimilarity(answer, option));
  const avgSimilarity = similarities.reduce((sum, value) => sum + value, 0) / similarities.length;
  const duplicates = wrongOptions.length - new Set(wrongOptions.map(normalizeText)).size;
  const balance = avgSimilarity >= 0.18 && avgSimilarity <= 0.72 ? 1 : 0.72;
  return Number(clamp((0.52 + avgSimilarity * 0.46) * balance - duplicates * 0.12, 0, 1).toFixed(2));
};

const grammarSignal = (value) => {
  const text = cleanText(value);
  if (!text) return { status: "Warning", score: 0.55 };
  let score = 1;
  if (!/^[A-Z0-9]/.test(text)) score -= 0.16;
  if (!/[.?!]$/.test(text)) score -= 0.12;
  if (/\s{2,}/.test(value)) score -= 0.08;
  if (/\b(the the|is is|of of|and and)\b/i.test(text)) score -= 0.22;
  const finalScore = clamp(score, 0, 1);
  return {
    status: finalScore >= 0.82 ? "Pass" : finalScore >= 0.58 ? "Warning" : "Fail",
    score: Number(finalScore.toFixed(2)),
  };
};

const qualityScore = ({ question_text, answer, options = [] }) => {
  const readability = readabilityScore(question_text);
  const distractor = distractorQuality(answer, options);
  const grammar = grammarSignal(question_text);
  const overall = Math.round(readability * 0.45 + distractor * 100 * 0.35 + grammar.score * 100 * 0.2);
  const grade = overall >= 85 ? "A" : overall >= 70 ? "B" : overall >= 55 ? "C" : "D";

  return {
    readability,
    distractor_quality: distractor,
    grammar,
    overall_score: overall,
    grade,
  };
};

const slope = (values = []) => {
  const points = values.map(Number).filter(Number.isFinite);
  const n = points.length;
  if (n < 2) return 0;
  const xs = points.map((_value, index) => index + 1);
  const xMean = xs.reduce((sum, value) => sum + value, 0) / n;
  const yMean = points.reduce((sum, value) => sum + value, 0) / n;
  const numerator = points.reduce((sum, y, index) => sum + (xs[index] - xMean) * (y - yMean), 0);
  const denominator = xs.reduce((sum, x) => sum + (x - xMean) ** 2, 0);
  return denominator ? numerator / denominator : 0;
};

const scorePrediction = (results = []) => {
  const sorted = [...results]
    .map((row) => ({
      ...row,
      percentage: Number(row.percentage ?? row.score ?? row.total_marks ?? 0),
      created_at: row.created_at || row.exam_date || row.attempt_time,
    }))
    .filter((row) => Number.isFinite(row.percentage))
    .sort((a, b) => new Date(a.created_at || 0) - new Date(b.created_at || 0));

  if (!sorted.length) {
    return {
      predicted_score: 65,
      range: [58, 72],
      confidence: 0.35,
      trend: 0,
      factors: ["No historical results yet", "Using portal baseline until attempts are available"],
    };
  }

  const last = sorted.slice(-6);
  const scores = last.map((row) => clamp(row.percentage));
  const avg = scores.reduce((sum, value) => sum + value, 0) / scores.length;
  const trend = slope(scores);
  const recency = scores[scores.length - 1] || avg;
  const predicted = clamp(avg * 0.58 + recency * 0.28 + trend * 1.6 + Math.min(sorted.length, 10) * 0.35);
  const spread = Math.max(5, 14 - Math.min(sorted.length, 9));

  return {
    predicted_score: Math.round(predicted),
    range: [Math.round(clamp(predicted - spread)), Math.round(clamp(predicted + spread))],
    confidence: Number(clamp(0.42 + sorted.length * 0.055, 0.42, 0.88).toFixed(2)),
    trend: Number(trend.toFixed(2)),
    factors: [
      `Average of recent attempts: ${Math.round(avg)}%`,
      trend >= 0 ? "Trend is improving" : "Trend is declining",
      `Based on ${sorted.length} available result${sorted.length === 1 ? "" : "s"}`,
    ],
  };
};

const riskLevel = (score) => {
  if (score >= 70) return "High";
  if (score >= 40) return "Medium";
  return "Low";
};

const answerEntropy = (answers = []) => {
  const labels = answers.map((row) => normalizeText(row.selected_option || row.answer_text || "")).filter(Boolean);
  if (!labels.length) return 0;
  const counts = labels.reduce((acc, label) => {
    acc[label] = (acc[label] || 0) + 1;
    return acc;
  }, {});
  const total = labels.length;
  return Object.values(counts).reduce((sum, count) => {
    const p = count / total;
    return sum - p * Math.log2(p);
  }, 0);
};

const anomalyRiskScore = ({ tabSwitches = 0, copyPaste = 0, avgAnswerTime = 45, scoreGap = 0, entropy = 1 }) => {
  const tabRisk = clamp(tabSwitches * 18, 0, 36);
  const copyRisk = clamp(copyPaste * 14, 0, 24);
  const speedRisk = avgAnswerTime > 0 && avgAnswerTime < 8 ? 22 : avgAnswerTime < 15 ? 12 : 0;
  const gapRisk = scoreGap > 30 ? 24 : scoreGap > 18 ? 14 : 0;
  const patternRisk = entropy < 0.75 ? 14 : 0;
  return Math.round(clamp(tabRisk + copyRisk + speedRisk + gapRisk + patternRisk));
};

const atRiskSummary = (student, results = []) => {
  const scores = results
    .map((row) => Number(row.percentage ?? row.total_marks ?? 0))
    .filter(Number.isFinite)
    .slice(0, 5)
    .reverse();
  const latest = scores[scores.length - 1] || 0;
  const trend = slope(scores);
  const skippedRatio =
    results.length > 0
      ? results.reduce((sum, row) => {
          const total = Number(row.total_questions || row.answered || 0) + Number(row.not_answered || 0);
          return sum + (total ? Number(row.not_answered || 0) / total : 0);
        }, 0) / results.length
      : 0;

  const risk = clamp((trend < 0 ? Math.abs(trend) * 9 : 0) + (latest < 45 ? 28 : latest < 60 ? 14 : 0) + skippedRatio * 28);

  return {
    student_id: student.student_id || student.user_id,
    student_name: student.student_name || student.name || "Student",
    latest_score: Math.round(latest),
    trend: Number(trend.toFixed(2)),
    skipped_ratio: Number(skippedRatio.toFixed(2)),
    risk_score: Math.round(risk),
    at_risk: risk >= 45,
    confidence: Number(clamp(0.48 + scores.length * 0.08, 0.48, 0.9).toFixed(2)),
  };
};

const optimizeWorksheetSelection = ({ questions = [], targetCount = 10, weakChapterIds = [], difficultySplit = null }) => {
  const desired = Math.max(1, Number(targetCount) || 10);
  const split = difficultySplit || { Easy: 0.4, Medium: 0.4, Hard: 0.2 };
  const selected = [];
  const used = new Set();
  const weakSet = new Set((weakChapterIds || []).map(String));

  const byDifficulty = ["Easy", "Medium", "Hard"].reduce((acc, label) => {
    acc[label] = questions
      .filter((q) => difficultyBucket(q.level_name || q.difficulty || q.level_id) === label)
      .sort((a, b) => {
        const aWeak = weakSet.has(String(a.chapter_id)) ? 1 : 0;
        const bWeak = weakSet.has(String(b.chapter_id)) ? 1 : 0;
        return bWeak - aWeak || Number(b.id || 0) - Number(a.id || 0);
      });
    return acc;
  }, {});

  Object.entries(split).forEach(([label, ratio]) => {
    const take = Math.round(desired * Number(ratio || 0));
    byDifficulty[label]?.forEach((question) => {
      if (selected.length >= desired || selected.filter((q) => difficultyBucket(q.level_name || q.level_id) === label).length >= take) return;
      if (!used.has(question.id)) {
        used.add(question.id);
        selected.push(question);
      }
    });
  });

  questions
    .sort((a, b) => {
      const aWeak = weakSet.has(String(a.chapter_id)) ? 1 : 0;
      const bWeak = weakSet.has(String(b.chapter_id)) ? 1 : 0;
      return bWeak - aWeak || Number(b.id || 0) - Number(a.id || 0);
    })
    .forEach((question) => {
      if (selected.length >= desired) return;
      if (!used.has(question.id)) {
        used.add(question.id);
        selected.push(question);
      }
    });

  return selected.slice(0, desired);
};

module.exports = {
  answerEntropy,
  anomalyRiskScore,
  atRiskSummary,
  cleanText,
  clamp,
  cosineSimilarity,
  difficultyBucket,
  estimateAbility,
  inferDifficultyFromQuestion,
  normalizeText,
  optimizeWorksheetSelection,
  pickNextQuestion,
  qualityScore,
  recommendedDifficultyForAbility,
  scorePrediction,
  slope,
  subjectiveAnswerScore,
  textSimilarity,
  tokenize,
};
