import React, { useEffect, useMemo, useState } from "react";
import PropTypes from "prop-types";
import { Alert, Box, Button, Chip, LinearProgress, Stack, Typography } from "@mui/material";
import AutoAwesomeIcon from "@mui/icons-material/AutoAwesome";
import CheckCircleIcon from "@mui/icons-material/CheckCircle";
import ContentCopyIcon from "@mui/icons-material/ContentCopy";
import FactCheckIcon from "@mui/icons-material/FactCheck";

const scoreColor = (score) => {
  if (score >= 80) return "#2f855a";
  if (score >= 60) return "#d98a16";
  return "#d84c5f";
};

function MLQuestionAssistant({
  form,
  levels,
  questionTypes,
  subjects,
  chapters,
  onApplyField,
}) {
  const [loading, setLoading] = useState(false);
  const [tags, setTags] = useState(null);
  const [duplicate, setDuplicate] = useState(null);
  const [quality, setQuality] = useState(null);
  const [error, setError] = useState("");

  const questionText = form.question_text || "";
  const { option1, option2, option3, option4 } = form;
  const options = useMemo(
    () => [option1, option2, option3, option4].filter(Boolean),
    [option1, option2, option3, option4]
  );

  useEffect(() => {
    const text = questionText.trim();
    if (text.length < 12) {
      setTags(null);
      setDuplicate(null);
      setQuality(null);
      setError("");
      return undefined;
    }

    const controller = new AbortController();
    const timer = setTimeout(async () => {
      setLoading(true);
      setError("");
      const payload = {
        question_text: text,
        options,
        answer: form.answer,
        course_id: form.course,
        subject_id: form.subject,
        chapter_id: form.chapter,
      };

      try {
        const [tagRes, duplicateRes, qualityRes] = await Promise.all([
          fetch("/api/ml/suggest-tags", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(payload),
            signal: controller.signal,
          }),
          fetch("/api/ml/check-duplicate", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(payload),
            signal: controller.signal,
          }),
          fetch("/api/ml/quality-score", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(payload),
            signal: controller.signal,
          }),
        ]);

        if (!tagRes.ok || !duplicateRes.ok || !qualityRes.ok) {
          throw new Error("ML analysis failed");
        }

        setTags(await tagRes.json());
        setDuplicate(await duplicateRes.json());
        setQuality(await qualityRes.json());
      } catch (requestError) {
        if (requestError.name !== "AbortError") {
          setError("ML assistant is not available for this question right now.");
        }
      } finally {
        setLoading(false);
      }
    }, 650);

    return () => {
      clearTimeout(timer);
      controller.abort();
    };
  }, [form.answer, form.chapter, form.course, form.subject, options, questionText]);

  const canApplyLevel =
    tags?.difficulty?.level_id &&
    levels.some((level) => String(level.level_id) === String(tags.difficulty.level_id));
  const canApplyType =
    tags?.question_type?.question_type_id &&
    questionTypes.some((type) => String(type.question_type_id) === String(tags.question_type.question_type_id));
  const canApplySubject =
    tags?.subject?.subject_id &&
    subjects.some((subject) => String(subject.subject_id) === String(tags.subject.subject_id));
  const canApplyChapter =
    tags?.chapter?.chapter_id &&
    chapters.some((chapter) => String(chapter.chapter_id) === String(tags.chapter.chapter_id));

  if (!questionText.trim()) return null;

  return (
    <Box
      sx={{
        mt: 2,
        p: 2,
        border: "1px solid rgba(39, 84, 216, 0.14)",
        borderRadius: 2,
        background: "linear-gradient(180deg, rgba(45,108,223,0.06), rgba(15,143,131,0.04))",
      }}
    >
      <Stack direction="row" alignItems="center" spacing={1} sx={{ mb: 1 }}>
        <AutoAwesomeIcon fontSize="small" sx={{ color: "#2754d8" }} />
        <Typography variant="subtitle2" sx={{ fontWeight: 800, color: "#172033" }}>
          ML Question Intelligence
        </Typography>
      </Stack>

      {loading && <LinearProgress sx={{ mb: 1.5 }} />}
      {error && <Alert severity="warning">{error}</Alert>}

      {tags && (
        <Stack direction="row" spacing={1} useFlexGap flexWrap="wrap" sx={{ mb: 1.5 }}>
          <Chip
            icon={<FactCheckIcon />}
            label={`Difficulty: ${tags.difficulty?.level_name || tags.difficulty?.label || "Medium"}`}
            color={canApplyLevel ? "primary" : "default"}
            onClick={canApplyLevel ? () => onApplyField("level_id", tags.difficulty.level_id) : undefined}
          />
          <Chip
            icon={<FactCheckIcon />}
            label={`Type: ${tags.question_type?.type_name || "MCQ"}`}
            color={canApplyType ? "primary" : "default"}
            onClick={canApplyType ? () => onApplyField("type", tags.question_type.question_type_id) : undefined}
          />
          {tags.subject && (
            <Chip
              label={`Subject: ${tags.subject.subject_name}`}
              color={canApplySubject ? "success" : "default"}
              onClick={canApplySubject ? () => onApplyField("subject", tags.subject.subject_id) : undefined}
            />
          )}
          {tags.chapter && (
            <Chip
              label={`Chapter: ${tags.chapter.chapter_name}`}
              color={canApplyChapter ? "success" : "default"}
              onClick={canApplyChapter ? () => onApplyField("chapter", tags.chapter.chapter_id) : undefined}
            />
          )}
        </Stack>
      )}

      {duplicate?.is_duplicate && (
        <Alert severity="warning" icon={<ContentCopyIcon fontSize="inherit" />} sx={{ mb: 1.5 }}>
          Similar question exists #{duplicate.similar_question_id} with {Math.round(duplicate.similarity_score * 100)}%
          similarity.
        </Alert>
      )}

      {quality && (
        <Box sx={{ display: "grid", gridTemplateColumns: { xs: "1fr", sm: "auto 1fr auto" }, gap: 1.5, alignItems: "center" }}>
          <Chip
            icon={<CheckCircleIcon />}
            label={`Quality ${quality.grade}`}
            sx={{ fontWeight: 800, color: "#fff", backgroundColor: scoreColor(quality.overall_score) }}
          />
          <LinearProgress
            variant="determinate"
            value={quality.overall_score}
            sx={{
              height: 8,
              borderRadius: 2,
              backgroundColor: "rgba(23,32,51,0.08)",
              "& .MuiLinearProgress-bar": { backgroundColor: scoreColor(quality.overall_score) },
            }}
          />
          <Button size="small" variant="text" disabled>
            {quality.overall_score}/100
          </Button>
        </Box>
      )}
    </Box>
  );
}

MLQuestionAssistant.propTypes = {
  form: PropTypes.object.isRequired,
  levels: PropTypes.array.isRequired,
  questionTypes: PropTypes.array.isRequired,
  subjects: PropTypes.array.isRequired,
  chapters: PropTypes.array.isRequired,
  onApplyField: PropTypes.func.isRequired,
};

export default MLQuestionAssistant;
