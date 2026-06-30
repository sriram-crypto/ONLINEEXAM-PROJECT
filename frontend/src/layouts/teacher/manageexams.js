import React, { useEffect, useMemo, useState } from "react";
import {
  Box,
  Typography,
  Button,
  Alert,
  Paper,
  Grid,
  FormControlLabel,
  Checkbox,
  Accordion,
  AccordionSummary,
  AccordionDetails,
  IconButton,
  Snackbar,
} from "@mui/material";
import ExpandMoreIcon from "@mui/icons-material/ExpandMore";
import AddCircleOutlineIcon from "@mui/icons-material/AddCircleOutline";
import RemoveCircleOutlineIcon from "@mui/icons-material/RemoveCircleOutline";
import StyledTextField from "components/StyledTextField";
import CustomDropdown from "components/CustomDropdown";

function ManageExams() {
  // color palette for UI accents
  const colors = { primary: "#1976d2", accent: "#00bfa6", warm: "#ff8a65" };

  // helpers
  const asArray = (x) => (Array.isArray(x) ? x : []);
  const safeJson = async (res) => {
    try {
      const contentType = res.headers.get('content-type');
      if (contentType && contentType.includes('application/json')) {
        return await res.json();
      } else {
        // Try to get text for debugging
        await res.text();
        return null;
      }
    } catch (e) {
      // Optionally log error
      return null;
    }
  };
  const toNum = (v) => (v === "" || v === null || v === undefined ? "" : Number(v));
  const cleanQuestionText = (text) => {
    // Strip stray leading "?." or "?" prefixes coming from some question seeds
    if (!text) return "";
    return String(text)
      .replace(/^\s*\?\.\s*/, "")
      .replace(/^\s*\?\s*/, "")
      .trimStart();
  };

  // Dropdown states
  const [categories, setCategories] = useState([]);
  const [courses, setCourses] = useState([]);
  const [subjects, setSubjects] = useState([]);
  const [levels, setLevels] = useState([]);
  const [questionTypes, setQuestionTypes] = useState([]);

  // Exam form state
  const [form, setForm] = useState({
    title: "",
    category: "",
    course: "",
    duration: "",
    exam_date: "",
    start_time: "",
    end_time: "",
    status: "scheduled",
    schoolname: "",
    class: "",
    package: "",
    order: "",
  });

  const [subjectList, setSubjectList] = useState([{ subject: "", questionCount: "" }]);
  const [subjectQuestions, setSubjectQuestions] = useState({});
  const [selectedQuestions, setSelectedQuestions] = useState([]);
  const [questionDetails, setQuestionDetails] = useState({});
  const [questionSubjectMap, setQuestionSubjectMap] = useState({});
  const [questionMarks, setQuestionMarks] = useState({});
  const [questionNegMarks, setQuestionNegMarks] = useState({});
  const [success, setSuccess] = useState("");
  const [error, setError] = useState("");
  const [adaptiveRules, setAdaptiveRules] = useState([
    { round: 1, min_score: "", max_score: "", next_level: "" },
  ]);
  const [warning, setWarning] = useState("");
  const [subjectFilters, setSubjectFilters] = useState({});
  const [chapters, setChapters] = useState({});
  const [subjectChapter, setSubjectChapter] = useState({});
  const [searchQuery, setSearchQuery] = useState({});
  const [snackbar, setSnackbar] = useState({ open: false, message: '', severity: 'success' });
  const [examsList, setExamsList] = useState([]);
  const [loadingExams, setLoadingExams] = useState(false);

  const created_by = 1; // Replace with actual user ID
  const [expandedSection, setExpandedSection] = useState(false);

  // SECTION 5 — audience/assign controls
  const [assignNow, setAssignNow] = useState(false);
  const [audienceMode, setAudienceMode] = useState("all"); // 'all' | 'filtered'

  // NEW fields requested: Name, Class, School, Email
  const [audName, setAudName] = useState("");
  const [audClass, setAudClass] = useState(""); // CSV or free text
  const [audSchool, setAudSchool] = useState("");
  const [audEmail, setAudEmail] = useState("");

  // Existing audience filters
  const [audSection, setAudSection] = useState("");
  const [audiencePreview, setAudiencePreview] = useState(null);
  const [audienceInfo, setAudienceInfo] = useState("");

  const handleAccordionChange = (section) => (_e, isExpanded) => {
    setExpandedSection(isExpanded ? section : false);
    if (isExpanded && section === "section6") {
      fetchExamsList();
    }
  };

  const fetchExamsList = async () => {
    setLoadingExams(true);
    try {
      const response = await fetch("/api/teacher/manageexams/exams");
      const data = await response.json();
      setExamsList(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error("Error fetching exams:", err);
      setExamsList([]);
    } finally {
      setLoadingExams(false);
    }
  };

  // ----- Fetch dropdowns (safe) -----
  useEffect(() => {
    fetch("/api/teacher/manageexams/categories")
      .then(safeJson)
      .then((d) => setCategories(asArray(d)))
      .catch(() => setCategories([]));
    fetch("/api/teacher/manageexams/levels")
      .then(safeJson)
      .then((d) => setLevels(asArray(d)))
      .catch(() => setLevels([]));
    fetch("/api/teacher/manageexams/question-types")
      .then(safeJson)
      .then((d) => setQuestionTypes(asArray(d)))
      .catch(() => setQuestionTypes([]));
  }, []);

  // ----- Category change resets -----
  useEffect(() => {
    if (!form.category) {
      setCourses([]);
      setForm((f) => ({ ...f, course: "" }));
      setSubjects([]);
      setSubjectList([{ subject: "", questionCount: "" }]);
      setSubjectQuestions({});
      setSelectedQuestions([]);
      setQuestionDetails({});
      setQuestionSubjectMap({});
      return;
    }
    fetch(`/api/teacher/manageexams/courses?category_id=${form.category}`)
      .then(safeJson)
      .then((d) => setCourses(asArray(d)))
      .catch(() => setCourses([]));

    setForm((f) => ({ ...f, course: "" }));
    setSubjects([]);
    setSubjectList([{ subject: "", questionCount: "" }]);
    setSubjectQuestions({});
    setSelectedQuestions([]);
    setQuestionDetails({});
    setQuestionSubjectMap({});
  }, [form.category]);

  // ----- Course change resets -----
  useEffect(() => {
    if (!form.course) {
      setSubjects([]);
      setForm((f) => ({ ...f, subject: "" }));
      setSubjectList([{ subject: "", questionCount: "" }]);
      setSubjectQuestions({});
      setSelectedQuestions([]);
      setQuestionDetails({});
      setQuestionSubjectMap({});
      return;
    }
    fetch(`/api/teacher/manageexams/subjects?course_id=${form.course}`)
      .then(safeJson)
      .then((d) => setSubjects(asArray(d)))
      .catch(() => setSubjects([]));
    setForm((f) => ({ ...f, subject: "" }));
    setSubjectList([{ subject: "", questionCount: "" }]);
    setSubjectQuestions({});
    setSelectedQuestions([]);
    setQuestionDetails({});
    setQuestionSubjectMap({});
  }, [form.course]);

  // ----- Derived stable keys to calm effects -----
  const subjectKey = useMemo(
    () => subjectList.map((s) => `${s.subject}:${s.questionCount}`).join("|"),
    [subjectList]
  );
  // ----- Fetch chapters for selected subjects -----
  useEffect(() => {
    subjectList.forEach((item) => {
      if (item.subject) {
        fetch(`/api/teacher/manageexams/chapters?subject_id=${item.subject}`)
          .then(safeJson)
          .then((data) => {
            setChapters((prev) => ({
              ...prev,
              [item.subject]: asArray(data),
            }));
          });
      }
    });
    // we only need to refetch when subject set changes
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [subjectKey]);

  // ----- Fetch questions for subjects based on filters -----
  useEffect(() => {
    const fetchQuestionsForSubjects = async () => {
      const questionsObj = {};
      for (const item of subjectList) {
        const filters = subjectFilters[item.subject] || {};
        if (item.subject && filters.level && filters.type) {
          let url = `/api/teacher/manageexams/questions/filter?course_id=${form.course}&subject_id=${item.subject}&level_id=${filters.level}&question_type_id=${filters.type}`;
          if (subjectChapter[item.subject]) url += `&chapter_id=${subjectChapter[item.subject]}`;
          const res = await fetch(url);
          let data = await safeJson(res);
          data = asArray(data);
          questionsObj[item.subject] = data;
        } else {
          questionsObj[item.subject] = [];
        }
      }
      setSubjectQuestions(questionsObj);
    };
    if (form.course) fetchQuestionsForSubjects();
  }, [subjectList, subjectFilters, subjectChapter, form.course]);

  // ----- Form handlers -----
  const handleChange = (e) => {
    const { name, value } = e.target;
    setForm({ ...form, [name]: value });
  };

  const handleAddSubject = () => {
    setSubjectList([...subjectList, { subject: "", questionCount: "" }]);
  };

  const handleRemoveSubject = (idx) => {
    const removed = subjectList[idx]?.subject;
    const nextList = subjectList.filter((_, i) => i !== idx);
    setSubjectList(nextList);

    if (removed) {
      const subjectQIds = new Set(
        selectedQuestions.filter((id) => {
          const mapped = questionSubjectMap[id];
          const detailSubject = questionDetails[id]?.subject_id || questionDetails[id]?.subjectId || questionDetails[id]?.subject;
          return Number(mapped ?? detailSubject) === Number(removed);
        })
      );
      setSelectedQuestions((prev) => prev.filter((id) => !subjectQIds.has(id)));
      setQuestionSubjectMap((prev) => {
        const copy = { ...prev };
        subjectQIds.forEach((id) => delete copy[id]);
        return copy;
      });
      setQuestionDetails((prev) => {
        const copy = { ...prev };
        subjectQIds.forEach((id) => delete copy[id]);
        return copy;
      });
      setQuestionMarks((prev) => {
        const copy = { ...prev };
        for (const id of subjectQIds) delete copy[id];
        return copy;
      });
      setQuestionNegMarks((prev) => {
        const copy = { ...prev };
        for (const id of subjectQIds) delete copy[id];
        return copy;
      });
      setSubjectQuestions((prev) => {
        const c = { ...prev };
        delete c[removed];
        return c;
      });
      setSubjectFilters((prev) => {
        const c = { ...prev };
        delete c[removed];
        return c;
      });
      setSubjectChapter((prev) => {
        const c = { ...prev };
        delete c[removed];
        return c;
      });
    }
  };

  const handleSubjectListChange = (idx, field, value) => {
    const updated = subjectList.map((item, i) => (i === idx ? { ...item, [field]: value } : item));
    setSubjectList(updated);
  };

  const handleSubjectFilterChange = (subjectId, field, value) => {
    setSubjectFilters((prev) => ({
      ...prev,
      [subjectId]: {
        ...prev[subjectId],
        [field]: value,
      },
    }));
  };

  const handleQuestionSelect = (subjectId, qid) => {
    const subjectObj = subjectList.find((s) => s.subject === subjectId);
    const countLimit = Number(subjectObj?.questionCount) || 0;
    if (countLimit <= 0) {
      setWarning("Set a positive 'Number of Questions' before selecting.");
      return;
    }

    const alreadySelected = selectedQuestions.includes(qid);
    const subjectIdNum = Number(subjectId);
    const selectedForSubject = selectedQuestions.filter((id) => {
      const mapped = questionSubjectMap[id];
      const detailSubject = questionDetails[id]?.subject_id || questionDetails[id]?.subjectId || questionDetails[id]?.subject;
      return Number(mapped ?? detailSubject) === subjectIdNum;
    });

    if (alreadySelected) {
      setSelectedQuestions(selectedQuestions.filter((id) => id !== qid));
      setQuestionSubjectMap((prev) => {
        const copy = { ...prev };
        delete copy[qid];
        return copy;
      });
      setQuestionDetails((prev) => {
        const copy = { ...prev };
        delete copy[qid];
        return copy;
      });
      setQuestionMarks((prev) => {
        const copy = { ...prev };
        delete copy[qid];
        return copy;
      });
      setQuestionNegMarks((prev) => {
        const copy = { ...prev };
        delete copy[qid];
        return copy;
      });
      const newCount = selectedQuestions.length - 1;
      setSnackbar({
        open: true,
        message: `Question deselected. Total selected: ${newCount}`,
        severity: 'info'
      });
      setWarning("");
      return;
    }

    if (selectedForSubject.length >= countLimit) {
      setWarning(`You cannot select more than ${countLimit} questions for this subject.`);
      return;
    }

    setSelectedQuestions([...selectedQuestions, qid]);
    setQuestionSubjectMap((prev) => ({ ...prev, [qid]: subjectIdNum }));
    const newCount = selectedQuestions.length + 1;
    setSnackbar({
      open: true,
      message: `Question selected. Total selected: ${newCount}`,
      severity: 'success'
    });
    setWarning("");

    const questionObj = (subjectQuestions[subjectId] || []).find((q) => q.id === qid);
    if (questionObj) {
      setQuestionDetails((prev) => ({ ...prev, [qid]: questionObj }));
    }
  };

  // Adaptive rules handlers
  const handleAddAdaptiveRule = () => {
    setAdaptiveRules([...adaptiveRules, { round: 1, min_score: "", max_score: "", next_level: "" }]);
  };

  const handleRemoveAdaptiveRule = (idx) => {
    setAdaptiveRules(adaptiveRules.filter((_, i) => i !== idx));
  };

  const handleAdaptiveRuleChange = (idx, field, value) => {
    setAdaptiveRules(adaptiveRules.map((rule, i) => (i === idx ? { ...rule, [field]: value } : rule)));
  };

  const autofillAdaptiveRules = () => {
    setAdaptiveRules([
      { round: 1, min_score: 80, max_score: 100, next_level: "difficult" },
      { round: 1, min_score: 50, max_score: 80, next_level: "moderate" },
      { round: 2, min_score: 40, max_score: 60, next_level: "easy" },
    ]);
  };

  // Helpers: audience build + preview + apply filters
  const csvToArr = (s) =>
    s
      .split(",")
      .map((x) => x.trim())
      .filter(Boolean);

  const buildAudience = () => {
    const audience = { mode: audienceMode, include: {}, exclude: {} };
    if (audienceMode === "filtered") {
      if (audName) audience.include.name = audName.trim();
      if (audClass) audience.include.classes = csvToArr(audClass);
      if (audSchool) audience.include.school = audSchool.trim();
      if (audEmail) audience.include.email = audEmail.trim();
      if (audSection) audience.include.sections = csvToArr(audSection);
    }
    return audience;
  };

  const handlePreviewAudience = async () => {
    setAudienceInfo("");
    setAudiencePreview(null);
    try {
      const audience = buildAudience();
      const res = await fetch("/api/teacher/manageexams/preview-audience", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ audience }),
      });
      if (!res.ok) throw new Error("Preview failed");
      const data = await safeJson(res);
      if (!data) {
        setAudienceInfo("Server did not return valid JSON. Please try again or contact support.");
        return;
      }
      if (typeof data.count === "number") {
        setAudiencePreview(data.count);
      } else {
        setAudienceInfo("Preview endpoint did not return a count.");
      }
    } catch {
      setAudienceInfo("Preview not available. You can still assign — backend will apply filters.");
    }
  };

  const handleApplyFilters = async () => {
    setError("");
    setAudienceInfo("");
    setAudiencePreview(null);

    if (audienceMode === "filtered") {
      const anyFilter =
        audName ||
        audClass ||
        audSchool ||
        audEmail ||
        audSection;
      if (!anyFilter) {
        setError("Add at least one filter: Name, Class, School, Email, Program, or Student IDs.");
        return;
      }
    }
    await handlePreviewAudience();
  };

  // Create/Assign
  const handleCreateExam = async () => {
    setSuccess("");
    setError("");

    if (
      !form.title ||
      !form.category ||
      !form.course ||
      !form.duration ||
      !form.exam_date ||
      !form.start_time ||
      !form.end_time ||
      !form.status ||
      subjectList.some((s) => !s.subject || !s.questionCount)
    ) {
      setError("Please fill all required fields for the exam.");
      return;
    }

    if (audienceMode === "filtered") {
      const anyFilter =
        audName ||
        audClass ||
        audSchool ||
        audEmail ||
        audSection;
      if (!anyFilter) {
        setError("Please add at least one audience filter or switch Visibility to All students.");
        return;
      }
    }

    const marksNum = {};
    Object.entries(questionMarks).forEach(([k, v]) => {
      marksNum[k] = Number(v) || 0;
    });
    const negMarksNum = {};
    Object.entries(questionNegMarks).forEach(([k, v]) => {
      negMarksNum[k] = Number(v) || 0;
    });

    const payload = {
      title: form.title,
      category_id: Number(form.category),
      course_id: Number(form.course),
      duration: Number(form.duration),
      exam_date: form.exam_date,
      start_time: form.start_time.length === 5 ? form.start_time + ":00" : form.start_time,
      end_time: form.end_time.length === 5 ? form.end_time + ":00" : form.end_time,
      status: form.status,
      schoolname: form.schoolname,
      class: form.class,
      package: form.package || null,
      order: form.order || null,
      created_by,
      subjects: subjectList.map((s) => ({
        subject_id: Number(s.subject),
        questionCount: Number(s.questionCount),
        selectedQuestions: selectedQuestions.filter((qid) => {
          const mapped = questionSubjectMap[qid];
          const detailSubject = questionDetails[qid]?.subject_id || questionDetails[qid]?.subjectId || questionDetails[qid]?.subject;
          return Number(mapped ?? detailSubject) === Number(s.subject);
        }),
      })),
      marks: marksNum,
      negativeMarks: negMarksNum,
      adaptiveRules: adaptiveRules,
      publish_now: assignNow ? 1 : 0,
      audience: buildAudience(),
    };

    try {
      const res = await fetch("/api/teacher/manageexams/create-exam", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = await safeJson(res);
      if (!data) {
        setError("Server did not return valid JSON. Please try again or contact support.");
        return;
      }
      if (res.ok && data.success) {
        setSuccess(assignNow ? "Exam created and assigned to selected audience." : "Exam created successfully.");
        // Reset
        setForm({
          title: "",
          category: "",
          course: "",
          duration: "",
          exam_date: "",
          start_time: "",
          end_time: "",
          status: "scheduled",
          schoolname: "",
          class: "",
          package: "",
          order: "",
        });
        setSubjectList([{ subject: "", questionCount: "" }]);
        setSelectedQuestions([]);
        setQuestionSubjectMap({});
        setQuestionDetails({});
        setQuestionMarks({});
        setQuestionNegMarks({});
        setAdaptiveRules([{ round: 1, min_score: "", max_score: "", next_level: "" }]);
        setAssignNow(false);
        setAudienceMode("all");
        setAudName("");
        setAudClass("");
        setAudSchool("");
        setAudEmail("");
        setAudSection("");
        setAudiencePreview(null);
        setAudienceInfo("");
      } else {
        setError((data && data.message) || "Failed to create exam.");
      }
    } catch (_err) {
      setError("Network error. Please try again.");
    }
  };

  return (
    <Box
      className="teacher-tool teacher-tool-manage"
      width="100%"
      sx={{
        p: 0,
      }}
    >
      <section className="teacher-tool-hero">
        <div>
          <span className="teacher-tool-kicker">
            <span className="material-icons-round">assignment</span>
            Manage exams
          </span>
          <h2>Create, assign, and review exam sets from one clean workspace.</h2>
          <p>
            Build the exam details, choose subjects and questions, configure marks, then assign the
            exam to the right student audience.
          </p>
        </div>
        <div className="teacher-tool-actions">
          <button type="button" className="teacher-action-button primary" onClick={() => setExpandedSection("section1")}>
            <span className="material-icons-round">add_circle</span>
            New Exam
          </button>
          <button type="button" className="teacher-action-button secondary" onClick={fetchExamsList}>
            <span className="material-icons-round">refresh</span>
            Refresh
          </button>
        </div>
      </section>

      <div className="teacher-tool-stat-strip">
        <article>
          <strong>{selectedQuestions.length}</strong>
          <span>Questions selected</span>
        </article>
        <article>
          <strong>{subjectList.filter((item) => item.subject).length}</strong>
          <span>Subjects added</span>
        </article>
        <article>
          <strong>{examsList.length}</strong>
          <span>Created exams</span>
        </article>
        <article>
          <strong>{audienceMode === "filtered" ? "Filtered" : "All"}</strong>
          <span>Audience mode</span>
        </article>
      </div>

      <Paper
        className="teacher-tool-card"
        elevation={0}
        sx={{
          p: { xs: 2, sm: 3, md: 4 },
          minWidth: 0,
          width: "100%",
        }}
      >
        {success && <Alert severity="success" sx={{ mb: 2 }}>{success}</Alert>}
        {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}

        <Box className="teacher-section-heading">
          <span className="teacher-tool-kicker">Exam setup</span>
          <h2>Create Exam</h2>
          <p>Use each section in order for a complete online exam record.</p>
        </Box>

        <form onSubmit={(e) => e.preventDefault()}>
          {/* Section 1: Exam Details */}
          <Accordion
            expanded={expandedSection === "section1"}
            onChange={handleAccordionChange("section1")}
            sx={{ boxShadow: "none", borderRadius: 2, mb: 2 }}
          >
            <AccordionSummary expandIcon={<ExpandMoreIcon />} sx={{ background: "#f7fafc", borderRadius: 1 }}>
              <Typography variant="h6" sx={{ fontWeight: 700 }}>
                Section 1: Exam Details
              </Typography>
            </AccordionSummary>
            <AccordionDetails>
              <Grid container spacing={3}>
                <Grid item xs={12}>
                  <StyledTextField
                    label="Exam Title"
                    name="title"
                    value={form.title}
                    onChange={handleChange}
                    fullWidth
                    required
                    size="small"
                    variant="outlined"
                  />
                </Grid>

                <Grid item xs={12} sm={6}>
                  <CustomDropdown
                    label="Category"
                    options={categories.map((opt) => ({ value: Number(opt.category_id), label: opt.category_name }))}
                    value={form.category}
                    onChange={(val) => handleChange({ target: { name: "category", value: toNum(val) } })}
                    placeholder="Select Category"
                    style={{ width: "100%" }}
                    disabled={false}
                  />
                </Grid>

                <Grid item xs={12} sm={6}>
                  <CustomDropdown
                    label="Course"
                    options={courses.map((opt) => ({ value: Number(opt.course_id), label: opt.course_name }))}
                    value={form.course}
                    onChange={(val) => handleChange({ target: { name: "course", value: toNum(val) } })}
                    placeholder="Select Course"
                    style={{ width: "100%" }}
                    disabled={!form.category}
                  />
                </Grid>

                <Grid item xs={12}>
                  <Typography variant="subtitle1" sx={{ fontWeight: 700, mb: 1 }}>
                    Subjects
                  </Typography>

                  {subjectList.map((item, idx) => (
                    <Grid container spacing={2} alignItems="center" key={`${idx}-${item.subject}`} sx={{ mb: 1 }}>
                      <Grid item xs={12} sm={5}>
                        <CustomDropdown
                          label={`Subject ${idx + 1}`}
                          options={subjects.map((opt) => ({ value: Number(opt.subject_id), label: opt.subject_name }))}
                          value={item.subject}
                          onChange={(val) => handleSubjectListChange(idx, "subject", toNum(val))}
                          placeholder="Select Subject"
                          style={{ width: "100%" }}
                          disabled={!form.course}
                        />
                      </Grid>
                      <Grid item xs={12} sm={4}>
                        <StyledTextField
                          label="Number of Questions"
                          name={`questionCount-${idx}`}
                          type="number"
                          value={item.questionCount}
                          onChange={(e) => handleSubjectListChange(idx, "questionCount", e.target.value)}
                          fullWidth
                          required
                          size="small"
                          variant="outlined"
                          InputLabelProps={{ shrink: true }}
                          inputProps={{ min: 1 }}
                        />
                      </Grid>
                      <Grid item xs={12} sm={3}>
                        {subjectList.length > 1 && (
                          <IconButton color="error" onClick={() => handleRemoveSubject(idx)} sx={{ mt: 1 }}>
                            <RemoveCircleOutlineIcon />
                          </IconButton>
                        )}
                      </Grid>
                    </Grid>
                  ))}

                  <Button
                    variant="outlined"
                    startIcon={<AddCircleOutlineIcon />}
                    onClick={handleAddSubject}
                    sx={{
                      mt: 1,
                      borderColor: colors.accent,
                      color: colors.accent,
                      "&:hover": { background: "rgba(0,191,166,0.06)" },
                    }}
                  >
                    Add Subject
                  </Button>
                </Grid>

                <Grid item xs={12} sm={6}>
                  <StyledTextField
                    label="Duration (minutes)"
                    name="duration"
                    type="number"
                    value={form.duration}
                    onChange={handleChange}
                    fullWidth
                    required
                    size="small"
                    variant="outlined"
                    InputLabelProps={{ shrink: true }}
                    inputProps={{ min: 1 }}
                  />
                </Grid>

                <Grid item xs={12} sm={6}>
                  <StyledTextField
                    label="Exam Date"
                    name="exam_date"
                    type="date"
                    value={form.exam_date}
                    onChange={handleChange}
                    fullWidth
                    required
                    size="small"
                    variant="outlined"
                    InputLabelProps={{ shrink: true }}
                  />
                </Grid>

                <Grid item xs={12} sm={6}>
                  <StyledTextField
                    label="Start Time"
                    name="start_time"
                    type="time"
                    value={form.start_time}
                    onChange={handleChange}
                    fullWidth
                    required
                    size="small"
                    variant="outlined"
                    InputLabelProps={{ shrink: true }}
                  />
                </Grid>

                <Grid item xs={12} sm={6}>
                  <StyledTextField
                    label="End Time"
                    name="end_time"
                    type="time"
                    value={form.end_time}
                    onChange={handleChange}
                    fullWidth
                    required
                    size="small"
                    variant="outlined"
                    InputLabelProps={{ shrink: true }}
                  />
                </Grid>

                <Grid item xs={12} sm={6}>
                  <StyledTextField
                    label="School Name"
                    name="schoolname"
                    value={form.schoolname}
                    onChange={handleChange}
                    fullWidth
                    size="small"
                    variant="outlined"
                    InputLabelProps={{ shrink: true }}
                  />
                </Grid>

                <Grid item xs={12} sm={6}>
                  <StyledTextField
                    label="Class"
                    name="class"
                    value={form.class}
                    onChange={handleChange}
                    fullWidth
                    size="small"
                    variant="outlined"
                    InputLabelProps={{ shrink: true }}
                  />
                </Grid>
              </Grid>
            </AccordionDetails>
          </Accordion>
        </form>


        {/* Section 2: Select Questions */}
        <Accordion
          sx={{ mt: 3, boxShadow: "none", borderRadius: 2, mb: 2 }}
          expanded={expandedSection === "section2"}
          onChange={handleAccordionChange("section2")}
        >
          <AccordionSummary expandIcon={<ExpandMoreIcon />} sx={{ background: "#f7fafc", borderRadius: 1 }}>
            <Typography variant="h6" sx={{ fontWeight: 700 }}>
              Section 2: Select Questions
            </Typography>
          </AccordionSummary>
          <AccordionDetails>
            {warning && <Alert severity="warning" sx={{ mb: 2 }}>{warning}</Alert>}

            {subjectList.map(
              (item, idx) =>
                item.subject && (
                  <Box key={`${item.subject}-${idx}`} sx={{ mb: 4 }}>
                    <Typography variant="subtitle1" sx={{ fontWeight: 700, color: "#1976d2", mb: 1 }}>
                      {subjects.find((s) => Number(s.subject_id) === Number(item.subject))?.subject_name ||
                        `Subject ${idx + 1}`}
                    </Typography>

                    <Grid container spacing={2} sx={{ mb: 2 }}>
                      <Grid item xs={12} sm={4}>
                        <CustomDropdown
                          label="Level"
                          options={levels.map((l) => ({ value: Number(l.level_id), label: l.level_name }))}
                          value={subjectFilters[item.subject]?.level || ""}
                          onChange={(val) => handleSubjectFilterChange(item.subject, "level", toNum(val))}
                          placeholder="Select Level"
                          style={{ width: "100%" }}
                          disabled={false}
                        />
                      </Grid>
                      <Grid item xs={12} sm={4}>
                        <CustomDropdown
                          label="Question Type"
                          options={questionTypes.map((qt) => ({
                            value: Number(qt.question_type_id),
                            label: qt.type_name,
                          }))}
                          value={subjectFilters[item.subject]?.type || ""}
                          onChange={(val) => handleSubjectFilterChange(item.subject, "type", toNum(val))}
                          placeholder="Select Type"
                          style={{ width: "100%" }}
                          disabled={false}
                        />
                      </Grid>
                      <Grid item xs={12} sm={4}>
                        <CustomDropdown
                          label="Chapter"
                          options={(chapters[item.subject] || []).map((ch) => ({
                            value: Number(ch.chapter_id),
                            label: ch.chapter_name,
                          }))}
                          value={subjectChapter[item.subject] || ""}
                          onChange={(val) => setSubjectChapter((prev) => ({ ...prev, [item.subject]: toNum(val) }))}
                          placeholder="Select Chapter"
                          style={{ width: "100%" }}
                          disabled={!item.subject}
                        />
                      </Grid>
                    </Grid>

                    <Button
                      variant="contained"
                      sx={{
                        mb: 2,
                        background: `linear-gradient(90deg, ${colors.primary}, ${colors.accent})`,
                        color: "#fff",
                        "&:hover": { opacity: 0.95 },
                      }}
                      onClick={() => {
                        if (
                          form.course &&
                          item.subject &&
                          subjectFilters[item.subject]?.level &&
                          subjectFilters[item.subject]?.type
                        ) {
                          let url = `/api/teacher/manageexams/questions/filter?course_id=${form.course}&subject_id=${item.subject}&level_id=${subjectFilters[item.subject].level}&question_type_id=${subjectFilters[item.subject].type}`;
                          if (subjectChapter[item.subject]) url += `&chapter_id=${subjectChapter[item.subject]}`;
                          fetch(url)
                            .then(safeJson)
                            .then((data) => {
                              const list = asArray(data);
                              // Merge new questions with existing ones (don't replace)
                              setSubjectQuestions((prev) => {
                                const existing = prev[item.subject] || [];
                                const existingIds = new Set(existing.map(q => q.id));
                                // Add new questions that aren't already in the list
                                const merged = [...existing];
                                for (const q of list) {
                                  if (!existingIds.has(q.id)) {
                                    merged.push(q);
                                  }
                                }
                                return {
                                  ...prev,
                                  [item.subject]: merged,
                                };
                              });
                              setQuestionDetails((prev) => {
                                const copy = { ...prev };
                                for (const q of list) {
                                  if (q && q.id != null) copy[q.id] = q;
                                }
                                return copy;
                              });
                            });
                        }
                      }}
                      disabled={
                        !form.course ||
                        !item.subject ||
                        !subjectFilters[item.subject]?.level ||
                        !subjectFilters[item.subject]?.type
                      }
                    >
                      Load Questions
                    </Button>

                    {/* Search Bar for Questions */}
                    <Box sx={{ mb: 2 }}>
                      <StyledTextField
                        label="Search Questions"
                        placeholder="Search by question text..."
                        fullWidth
                        value={searchQuery[item.subject] || ""}
                        onChange={(e) =>
                          setSearchQuery((prev) => ({ ...prev, [item.subject]: e.target.value }))
                        }
                        sx={{ mb: 1 }}
                      />
                    </Box>

                    <Paper sx={{ maxHeight: 300, overflow: "auto", p: 2, background: "#fafbfd" }}>
                      {(() => {
                        const questions = subjectQuestions[item.subject] || [];
                        const filtered = questions.filter((q) =>
                          q.question_text?.toLowerCase().includes((searchQuery[item.subject] || "").toLowerCase())
                        );
                        
                        if (filtered.length === 0 && searchQuery[item.subject]) {
                          return (
                            <Typography sx={{ color: "#666", fontStyle: "italic", p: 2 }}>
                              No questions found matching your search.
                            </Typography>
                          );
                        }

                        return filtered.map((q, ii) => (
                        <Box key={`${q.id}-${ii}`} sx={{ mb: 2, borderBottom: "1px solid #eee", pb: 1 }}>
                          <FormControlLabel
                            control={
                              <Checkbox
                                checked={selectedQuestions.includes(q.id)}
                                onChange={() => handleQuestionSelect(item.subject, q.id)}
                              />
                            }
                            label={
                              <Box>
                                <Typography variant="body1" sx={{ fontWeight: 600 }}>
                                  {cleanQuestionText(q.question_text)}
                                </Typography>
                                {q.question_image && (
                                  <Box sx={{ mt: 1, mb: 1 }}>
                                    <img 
                                      src={`http://localhost:5000${q.question_image}`} 
                                      alt="Question" 
                                      style={{ maxWidth: '300px', height: 'auto', borderRadius: '4px' }}
                                    />
                                  </Box>
                                )}
                                {(q.option1 || q.option1_image) && (
                                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mt: 0.5 }}>
                                    <Typography variant="body2">A. {q.option1 || '(Image Option)'}</Typography>
                                    {q.option1_image && (
                                      <img 
                                        src={`http://localhost:5000${q.option1_image}`} 
                                        alt="Option A" 
                                        style={{ maxWidth: '100px', height: 'auto', borderRadius: '4px' }}
                                      />
                                    )}
                                  </Box>
                                )}
                                {(q.option2 || q.option2_image) && (
                                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mt: 0.5 }}>
                                    <Typography variant="body2">B. {q.option2 || '(Image Option)'}</Typography>
                                    {q.option2_image && (
                                      <img 
                                        src={`http://localhost:5000${q.option2_image}`} 
                                        alt="Option B" 
                                        style={{ maxWidth: '100px', height: 'auto', borderRadius: '4px' }}
                                      />
                                    )}
                                  </Box>
                                )}
                                {(q.option3 || q.option3_image) && (
                                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mt: 0.5 }}>
                                    <Typography variant="body2">C. {q.option3 || '(Image Option)'}</Typography>
                                    {q.option3_image && (
                                      <img 
                                        src={`http://localhost:5000${q.option3_image}`} 
                                        alt="Option C" 
                                        style={{ maxWidth: '100px', height: 'auto', borderRadius: '4px' }}
                                      />
                                    )}
                                  </Box>
                                )}
                                {(q.option4 || q.option4_image) && (
                                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mt: 0.5 }}>
                                    <Typography variant="body2">D. {q.option4 || '(Image Option)'}</Typography>
                                    {q.option4_image && (
                                      <img 
                                        src={`http://localhost:5000${q.option4_image}`} 
                                        alt="Option D" 
                                        style={{ maxWidth: '100px', height: 'auto', borderRadius: '4px' }}
                                      />
                                    )}
                                  </Box>
                                )}
                              </Box>
                            }
                          />
                        </Box>
                        ));
                      })()}
                    </Paper>
                  </Box>
                )
            )}
          </AccordionDetails>
        </Accordion>

        {/* Section 3: Selected Questions */}
        <Accordion
          sx={{ mt: 3, boxShadow: "none", borderRadius: 2, mb: 2 }}
          expanded={expandedSection === "section3"}
          onChange={handleAccordionChange("section3")}
        >
          <AccordionSummary expandIcon={<ExpandMoreIcon />} sx={{ background: "#f7fafc", borderRadius: 1 }}>
            <Typography variant="h6" sx={{ fontWeight: 700 }}>
              Section 3: Selected Questions
            </Typography>
          </AccordionSummary>
          <AccordionDetails>
            {selectedQuestions.length > 0 ? (
              <>
                {subjectList.map((item, idx) => {
                  const subjectName = subjects.find((s) => Number(s.subject_id) === Number(item.subject))?.subject_name || `Subject ${idx + 1}`;
                  const subjectIdNum = Number(item.subject);
                  const subjectQs = selectedQuestions.filter((qid) => {
                    const mapped = questionSubjectMap[qid];
                    const detailSubject = questionDetails[qid]?.subject_id || questionDetails[qid]?.subjectId || questionDetails[qid]?.subject;
                    return Number(mapped ?? detailSubject) === subjectIdNum;
                  });
                  
                  if (subjectQs.length === 0) return null;
                  
                  return (
                    <Box key={`subject-${item.subject}-${idx}`} sx={{ mb: 3 }}>
                      <Typography variant="h6" sx={{ fontWeight: 700, color: "#1976d2", mb: 2 }}>
                        {subjectName} ({subjectQs.length} questions)
                      </Typography>
                      <Paper sx={{ p: 2, mb: 2, overflowX: "auto" }}>
                        <table style={{ width: "100%", borderCollapse: "collapse", minWidth: 500 }}>
                          <thead>
                            <tr>
                              <th style={{ textAlign: "left", padding: "8px" }}>Question</th>
                              <th style={{ textAlign: "center", padding: "8px" }}>Marks</th>
                              <th style={{ textAlign: "center", padding: "8px" }}>Negative Marks</th>
                            </tr>
                          </thead>
                          <tbody>
                            {subjectQs.map((qid) => {
                              const q = questionDetails[qid];
                              if (!q) return null;
                              return (
                                <tr key={q.id}>
                                  <td style={{ padding: "8px", verticalAlign: 'top' }}>
                                    <Box>
                                      <Typography variant="body1" sx={{ fontWeight: 600 }}>
                                        {cleanQuestionText(q.question_text)}
                                      </Typography>
                                      {q.question_image && (
                                        <Box sx={{ mt: 1, mb: 1 }}>
                                          <img 
                                            src={`http://localhost:5000${q.question_image}`} 
                                            alt="Question" 
                                            style={{ maxWidth: '200px', height: 'auto', borderRadius: '4px' }}
                                          />
                                        </Box>
                                      )}
                                      {(q.option1 || q.option1_image) && (
                                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mt: 0.5 }}>
                                          <Typography variant="body2" sx={{ fontSize: '0.875rem' }}>A. {q.option1 || '(Image)'}</Typography>
                                          {q.option1_image && (
                                            <img 
                                              src={`http://localhost:5000${q.option1_image}`} 
                                              alt="Option A" 
                                              style={{ maxWidth: '60px', height: 'auto', borderRadius: '4px' }}
                                            />
                                          )}
                                        </Box>
                                      )}
                                      {(q.option2 || q.option2_image) && (
                                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mt: 0.5 }}>
                                          <Typography variant="body2" sx={{ fontSize: '0.875rem' }}>B. {q.option2 || '(Image)'}</Typography>
                                          {q.option2_image && (
                                            <img 
                                              src={`http://localhost:5000${q.option2_image}`} 
                                              alt="Option B" 
                                              style={{ maxWidth: '60px', height: 'auto', borderRadius: '4px' }}
                                            />
                                          )}
                                        </Box>
                                      )}
                                      {(q.option3 || q.option3_image) && (
                                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mt: 0.5 }}>
                                          <Typography variant="body2" sx={{ fontSize: '0.875rem' }}>C. {q.option3 || '(Image)'}</Typography>
                                          {q.option3_image && (
                                            <img 
                                              src={`http://localhost:5000${q.option3_image}`} 
                                              alt="Option C" 
                                              style={{ maxWidth: '60px', height: 'auto', borderRadius: '4px' }}
                                            />
                                          )}
                                        </Box>
                                      )}
                                      {(q.option4 || q.option4_image) && (
                                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mt: 0.5 }}>
                                          <Typography variant="body2" sx={{ fontSize: '0.875rem' }}>D. {q.option4 || '(Image)'}</Typography>
                                          {q.option4_image && (
                                            <img 
                                              src={`http://localhost:5000${q.option4_image}`} 
                                              alt="Option D" 
                                              style={{ maxWidth: '60px', height: 'auto', borderRadius: '4px' }}
                                            />
                                          )}
                                        </Box>
                                      )}
                                    </Box>
                                  </td>

                                  <td style={{ padding: "8px", textAlign: "center" }}>
                                    <StyledTextField
                                      type="number"
                                      size="small"
                                      value={questionMarks[q.id] || ""}
                                      onChange={(e) =>
                                        setQuestionMarks({ ...questionMarks, [q.id]: e.target.value })
                                      }
                                      inputProps={{ min: 0 }}
                                      sx={{ width: 80 }}
                                      placeholder="Marks"
                                    />
                                  </td>
                                  <td style={{ padding: "8px", textAlign: "center" }}>
                                    <StyledTextField
                                      type="number"
                                      size="small"
                                      value={questionNegMarks[q.id] || ""}
                                      onChange={(e) =>
                                        setQuestionNegMarks({ ...questionNegMarks, [q.id]: e.target.value })
                                      }
                                      inputProps={{ min: 0 }}
                                      sx={{ width: 80 }}
                                      placeholder="Negative"
                                    />
                                  </td>
                                </tr>
                              );
                            })}
                          </tbody>
                        </table>
                      </Paper>
                    </Box>
                  );
                })}
              </>
            ) : (
              <Typography variant="body2" sx={{ textAlign: "center", color: "#666", py: 3 }}>
                No questions selected yet. Go to Section 2 to select questions.
              </Typography>
            )}
          </AccordionDetails>
        </Accordion>

        {/* Section 4: Adaptive Rules */}
        <Accordion
          sx={{ mt: 3, boxShadow: "none", borderRadius: 2, mb: 2 }}
          expanded={expandedSection === "section4"}
          onChange={handleAccordionChange("section4")}
        >
          <AccordionSummary expandIcon={<ExpandMoreIcon />} sx={{ background: "#f7fafc", borderRadius: 1 }}>
            <Typography variant="h6" sx={{ fontWeight: 700 }}>
              Section 4: Adaptive Rules (Optional)
            </Typography>
          </AccordionSummary>
          <AccordionDetails>
            <Box sx={{ mb: 2 }}>
              <Alert severity="info">
                Define rules to change difficulty based on performance. Leave empty if not needed.
              </Alert>
            </Box>
            <Grid container spacing={2}>
              <Grid item xs={12}>
                <Button
                  variant="outlined"
                  startIcon={<AddCircleOutlineIcon />}
                  onClick={handleAddAdaptiveRule}
                  sx={{
                    borderColor: colors.accent,
                    color: colors.accent,
                    "&:hover": { background: "rgba(0,191,166,0.06)" },
                  }}
                >
                  Add Rule
                </Button>
                <Button
                  variant="outlined"
                  onClick={autofillAdaptiveRules}
                  sx={{ ml: 2, borderColor: colors.warm, color: colors.warm }}
                >
                  Quick Fill Sample
                </Button>
              </Grid>
              <Grid item xs={12}>
                <Paper sx={{ overflowX: "auto" }}>
                  <table style={{ width: "100%", borderCollapse: "collapse", minWidth: 600 }}>
                    <thead>
                      <tr>
                        <th style={{ textAlign: "left", padding: "8px", borderBottom: "1px solid #ddd" }}>Round</th>
                        <th style={{ textAlign: "left", padding: "8px", borderBottom: "1px solid #ddd" }}>Min Score</th>
                        <th style={{ textAlign: "left", padding: "8px", borderBottom: "1px solid #ddd" }}>Max Score</th>
                        <th style={{ textAlign: "left", padding: "8px", borderBottom: "1px solid #ddd" }}>Next Level</th>
                        <th style={{ textAlign: "center", padding: "8px", borderBottom: "1px solid #ddd" }}>Action</th>
                      </tr>
                    </thead>
                    <tbody>
                      {adaptiveRules.map((rule, idx) => (
                        <tr key={idx}>
                          <td style={{ padding: "8px" }}>
                            <StyledTextField
                              type="number"
                              value={rule.round}
                              onChange={(e) => handleAdaptiveRuleChange(idx, "round", Number(e.target.value))}
                              size="small"
                              sx={{ width: 60 }}
                            />
                          </td>
                          <td style={{ padding: "8px" }}>
                            <StyledTextField
                              type="number"
                              value={rule.min_score}
                              onChange={(e) => handleAdaptiveRuleChange(idx, "min_score", e.target.value)}
                              size="small"
                              sx={{ width: 80 }}
                            />
                          </td>
                          <td style={{ padding: "8px" }}>
                            <StyledTextField
                              type="number"
                              value={rule.max_score}
                              onChange={(e) => handleAdaptiveRuleChange(idx, "max_score", e.target.value)}
                              size="small"
                              sx={{ width: 80 }}
                            />
                          </td>
                          <td style={{ padding: "8px" }}>
                            <CustomDropdown
                              label="Next Level"
                              options={[
                                { value: "", label: "Select Level" },
                                { value: "easy", label: "Easy" },
                                { value: "moderate", label: "Moderate" },
                                { value: "difficult", label: "Difficult" },
                                { value: "not eligible", label: "Not Eligible" },
                              ]}
                              value={rule.next_level}
                              onChange={(val) => handleAdaptiveRuleChange(idx, "next_level", val)}
                              placeholder="Select Level"
                              style={{ width: 150 }}
                              disabled={false}
                            />
                          </td>
                          <td style={{ padding: "8px", textAlign: "center" }}>
                            <IconButton color="error" onClick={() => handleRemoveAdaptiveRule(idx)} size="small">
                              <RemoveCircleOutlineIcon />
                            </IconButton>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </Paper>
              </Grid>
            </Grid>
          </AccordionDetails>
        </Accordion>

        {/* Section 5: Assign Exam — audience filters + APPLY FILTERS */}
        <Accordion
          sx={{ mt: 3, boxShadow: "none", borderRadius: 2, mb: 2 }}
          expanded={expandedSection === "section5"}
          onChange={handleAccordionChange("section5")}
        >
          <AccordionSummary expandIcon={<ExpandMoreIcon />} sx={{ background: "#f7fafc", borderRadius: 1 }}>
            <Typography variant="h6" sx={{ fontWeight: 700 }}>
              Section 5: Assign Exam
            </Typography>
          </AccordionSummary>
          <AccordionDetails>
            <Grid container spacing={2}>
              <Grid item xs={12}>
                <Alert severity="info" sx={{ mb: 2 }}>
                  Apply filters to control visibility. For example, exclude program <b>IIT</b> to hide Biology exam for IIT students.
                </Alert>
              </Grid>

              <Grid item xs={12} sm={6}>
                <CustomDropdown
                  label="Visibility (All / Filtered)"
                  options={[
                    { value: "all", label: "All students" },
                    { value: "filtered", label: "Filtered students only" },
                  ]}
                  value={audienceMode}
                  onChange={(val) => setAudienceMode(val)}
                  placeholder="Select Visibility"
                  style={{ width: "100%" }}
                />
              </Grid>

              {/* Removed Publish now checkbox */}

              {audienceMode === "filtered" && (
                <>
                  {/* NEW required inputs for Apply Filters */}
                  <Grid item xs={12} sm={6}>
                    <StyledTextField
                      label="Name"
                      value={audName}
                      onChange={(e) => setAudName(e.target.value)}
                      fullWidth
                      size="small"
                      placeholder="Student name contains..."
                    />
                  </Grid>
                  <Grid item xs={12} sm={6}>
                    <StyledTextField
                      label="Class (comma-separated)"
                      value={audClass}
                      onChange={(e) => setAudClass(e.target.value)}
                      fullWidth
                      size="small"
                      placeholder="e.g., 10,A1"
                    />
                  </Grid>
                  <Grid item xs={12} sm={6}>
                    <StyledTextField
                      label="School"
                      value={audSchool}
                      onChange={(e) => setAudSchool(e.target.value)}
                      fullWidth
                      size="small"
                      placeholder="School name contains..."
                    />
                  </Grid>
                  <Grid item xs={12} sm={6}>
                    <StyledTextField
                      label="Email"
                      value={audEmail}
                      onChange={(e) => setAudEmail(e.target.value)}
                      fullWidth
                      size="small"
                      placeholder="Email contains..."
                    />
                  </Grid>

                  {/* Section filter */}
                  <Grid item xs={12} sm={6}>
                    <StyledTextField
                      label="Section (comma-separated)"
                      value={audSection}
                      onChange={(e) => setAudSection(e.target.value)}
                      fullWidth
                      size="small"
                    />
                  </Grid>

                  <Grid item xs={12}>
                    <Button 
                      variant="contained" 
                      color="primary" 
                      onClick={handleApplyFilters}
                      sx={{ minWidth: 180, fontWeight: 700, mr: 2, boxShadow: 2 }}
                    >
                      Apply Filters
                    </Button>
                    <Button 
                      variant="contained" 
                      color="secondary" 
                      onClick={handlePreviewAudience}
                      sx={{ minWidth: 220, fontWeight: 700, boxShadow: 2 }}
                    >
                      Preview Eligible Count
                    </Button>
                    {audiencePreview !== null && (
                      <Typography variant="body2" sx={{ ml: 2, display: "inline-block" }}>
                        Eligible students: <b>{audiencePreview}</b>
                      </Typography>
                    )}
                    {audienceInfo && (
                      <Typography variant="body2" sx={{ ml: 2, display: "inline-block", color: "#d97706" }}>
                        {audienceInfo}
                      </Typography>
                    )}
                  </Grid>
                </>
              )}

              {/* Removed Assign Exam button */}
            </Grid>
          </AccordionDetails>
        </Accordion>

        {/* Save All Details */}
        <Box sx={{ textAlign: "center", mt: 4 }}>
          <Button
            variant="contained"
            size="large"
            sx={{
              px: 5,
              py: 1.5,
              fontWeight: 700,
              fontSize: 17,
              borderRadius: 2,
              background: `linear-gradient(90deg, ${colors.primary}, ${colors.accent})`,
              color: "#fff",
              boxShadow: "0 6px 20px rgba(25,118,210,0.12)",
            }}
            onClick={handleCreateExam}
          >
            Save All Details
          </Button>
          <Typography variant="body2" sx={{ mt: 2, color: "#888" }}>
            Section 4 (Adaptive Rules) is optional.
          </Typography>
        </Box>
      </Paper>

      {/* View Created Exams Section */}
      <Box sx={{ mt: 4, mb: 3 }}>
        <Button
          fullWidth
          variant="outlined"
          sx={{
            py: 2,
            fontSize: 15,
            fontWeight: 700,
            borderColor: colors.primary,
            color: colors.primary,
            borderWidth: 2,
            "&:hover": { borderWidth: 2, background: "rgba(25, 118, 210, 0.04)" },
          }}
          onClick={() => {
            setExpandedSection(expandedSection === "section6" ? false : "section6");
            if (expandedSection !== "section6") {
              fetchExamsList();
            }
          }}
        >
          {expandedSection === "section6" ? "Hide Exams" : "View Created Exams"}
        </Button>
      </Box>

      {/* View Created Exams Content */}
      {expandedSection === "section6" && (
        <Paper
          elevation={2}
          sx={{
            mt: 3,
            p: 3,
            borderRadius: 3,
            width: "100%",
          }}
        >
          <Box sx={{ width: "100%", overflowX: "auto" }}>
            {loadingExams ? (
              <Box sx={{ textAlign: "center", py: 4 }}>
                <Typography variant="body1" color="text.secondary">
                  Loading exams...
                </Typography>
              </Box>
            ) : examsList.length === 0 ? (
              <Box sx={{ textAlign: "center", py: 4 }}>
                <Typography variant="body1" color="text.secondary">
                  No exams created yet.
                </Typography>
              </Box>
            ) : (
              <Box sx={{ minWidth: 800 }}>
                <Box
                  sx={{
                    display: "grid",
                    gridTemplateColumns: "60px 1fr 120px 150px 180px 180px 120px",
                    gap: 1,
                    background: "linear-gradient(90deg, #667eea 0%, #764ba2 100%)",
                    color: "white",
                    p: 2,
                    borderRadius: "8px 8px 0 0",
                    fontWeight: 700,
                    fontSize: 14,
                  }}
                >
                  <Box>ID</Box>
                  <Box>Title</Box>
                  <Box>Duration</Box>
                  <Box>Status</Box>
                  <Box>Start Time</Box>
                  <Box>End Time</Box>
                  <Box>Subjects</Box>
                </Box>

                {examsList.map((exam, idx) => (
                  <Box
                    key={exam.exam_id}
                    sx={{
                      display: "grid",
                      gridTemplateColumns: "60px 1fr 120px 150px 180px 180px 120px",
                      gap: 1,
                      p: 2,
                      borderBottom: "1px solid #e5e7eb",
                      background: idx % 2 === 0 ? "#f9fafb" : "white",
                      alignItems: "center",
                      fontSize: 13,
                      "&:hover": {
                        background: "#f3f4f6",
                      },
                    }}
                  >
                    <Box sx={{ fontWeight: 600 }}>{exam.exam_id}</Box>
                    <Box sx={{ fontWeight: 600, color: "#1f2937" }}>{exam.title || "Untitled"}</Box>
                    <Box>{exam.duration ? `${exam.duration} min` : "N/A"}</Box>
                    <Box>
                      <Box
                        component="span"
                        sx={{
                          px: 1.5,
                          py: 0.5,
                          borderRadius: 1,
                          fontSize: 11,
                          fontWeight: 700,
                          background:
                            exam.status === "active"
                              ? "#dcfce7"
                              : exam.status === "completed"
                              ? "#dbeafe"
                              : "#fef3c7",
                          color:
                            exam.status === "active"
                              ? "#15803d"
                              : exam.status === "completed"
                              ? "#1e40af"
                              : "#a16207",
                        }}
                      >
                        {exam.status || "scheduled"}
                      </Box>
                    </Box>
                    <Box sx={{ fontSize: 12, color: "#6b7280" }}>
                      {exam.start_time
                        ? new Date(exam.start_time).toLocaleString("en-US", {
                            month: "short",
                            day: "numeric",
                            hour: "2-digit",
                            minute: "2-digit",
                          })
                        : "N/A"}
                    </Box>
                    <Box sx={{ fontSize: 12, color: "#6b7280" }}>
                      {exam.end_time
                        ? new Date(exam.end_time).toLocaleString("en-US", {
                            month: "short",
                            day: "numeric",
                            hour: "2-digit",
                            minute: "2-digit",
                          })
                        : "N/A"}
                    </Box>
                    <Box sx={{ fontSize: 12 }}>
                      {exam.subjects && exam.subjects.length > 0 ? (
                        <Box>
                          {exam.subjects.slice(0, 2).map((subj, i) => (
                            <Box key={i} sx={{ color: "#6366f1", fontWeight: 600 }}>
                              {subj.subject_name}
                            </Box>
                          ))}
                          {exam.subjects.length > 2 && (
                            <Box sx={{ color: "#9ca3af", fontSize: 11 }}>+{exam.subjects.length - 2} more</Box>
                          )}
                        </Box>
                      ) : (
                        <Box sx={{ color: "#9ca3af" }}>No subjects</Box>
                      )}
                    </Box>
                  </Box>
                ))}
              </Box>
            )}
          </Box>
        </Paper>
      )}

      {/* Snackbar for question selection messages */}
      <Snackbar
        open={snackbar.open}
        autoHideDuration={3000}
        onClose={() => setSnackbar({ ...snackbar, open: false })}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
      >
        <Alert
          onClose={() => setSnackbar({ ...snackbar, open: false })}
          severity={snackbar.severity}
          sx={{ width: '100%' }}
        >
          {snackbar.message}
        </Alert>
      </Snackbar>
    </Box>
  );
}

export default ManageExams;
