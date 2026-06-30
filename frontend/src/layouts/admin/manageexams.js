
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
  Snackbar
} from "@mui/material";
import ExpandMoreIcon from "@mui/icons-material/ExpandMore";
import AddCircleOutlineIcon from "@mui/icons-material/AddCircleOutline";
import RemoveCircleOutlineIcon from "@mui/icons-material/RemoveCircleOutline";
import StyledTextField from "../../components/StyledTextField";
import CustomDropdown from "../../components/CustomDropdown";

// ...existing code...



function ManageExams() {
  // State for 'apply to all' marks/neg marks in Section 3
  const [applyAllMarks, setApplyAllMarks] = useState("");
  const [applyAllNegMarks, setApplyAllNegMarks] = useState("");
  const [applyAllChecked, setApplyAllChecked] = useState(false);
  // State for expanding/collapsing long questions/options in Section 3
  const [expandedQuestions, setExpandedQuestions] = useState({});
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
    from_date: "",
    to_date: "",
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
  // Map: subjectId -> array of selected question IDs
  const [selectedQuestionsMap, setSelectedQuestionsMap] = useState({});
  // Flat list for Section 3
  const selectedQuestions = useMemo(() => Object.values(selectedQuestionsMap).flat(), [selectedQuestionsMap]);

  // Snackbar state
  const [snackbar, setSnackbar] = useState({ open: false, message: "" });

  const [questionDetails, setQuestionDetails] = useState({});
  const [questionMarks, setQuestionMarks] = useState({});
  const [questionNegMarks, setQuestionNegMarks] = useState({});
  const [questionCount, setQuestionCount] = useState({});
  const [success, setSuccess] = useState("");
  const [error, setError] = useState("");
  const [adaptiveRules, setAdaptiveRules] = useState([
    { round: 1, min_score: "", max_score: "", next_level: "" },
  ]);
  const [warning, setWarning] = useState("");
  const [subjectFilters, setSubjectFilters] = useState({});
  const [chapters, setChapters] = useState({});
  const [subjectChapter, setSubjectChapter] = useState({});

  const created_by = 1; // Replace with actual user ID
  const [expandedSection, setExpandedSection] = useState(false);

  // SECTION 6 — Created Exams List
  const [examsList, setExamsList] = useState([]);
  const [loadingExams, setLoadingExams] = useState(false);
  const [viewExamModal, setViewExamModal] = useState(false);
  const [selectedViewExam, setSelectedViewExam] = useState(null);
  const [editExamModal, setEditExamModal] = useState(false);
  const [selectedEditExam, setSelectedEditExam] = useState(null);

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
  };

  // ----- Fetch dropdowns (safe) -----
  useEffect(() => {
    fetch("/api/admin/manageexams/categories")
      .then(safeJson)
      .then((d) => setCategories(asArray(d)))
      .catch(() => setCategories([]));
    fetch("/api/admin/manageexams/levels")
      .then(safeJson)
      .then((d) => setLevels(asArray(d)))
      .catch(() => setLevels([]));
    fetch("/api/admin/manageexams/question-types")
      .then(safeJson)
      .then((d) => setQuestionTypes(asArray(d)))
      .catch(() => setQuestionTypes([]));
  }, []);

  // Fetch exams list when Section 6 is expanded
  useEffect(() => {
    if (expandedSection === "section6") {
      fetchExamsList();
    }
  }, [expandedSection]);

  const fetchExamsList = async () => {
    setLoadingExams(true);
    try {
      const response = await fetch("/api/admin/manageexams/exams");
      const data = await response.json();
      setExamsList(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error("Error fetching exams:", err);
      setExamsList([]);
    } finally {
      setLoadingExams(false);
    }
  };

  // ----- Category change resets -----
  useEffect(() => {
    if (!form.category) {
      setCourses([]);
      setForm((f) => ({ ...f, course: "" }));
      setSubjects([]);
      setSubjectList([{ subject: "", questionCount: "" }]);
      setSubjectQuestions({});
      setSelectedQuestionsMap({});
      setQuestionDetails({});
      return;
    }
    fetch(`/api/admin/manageexams/courses?category_id=${form.category}`)
      .then(safeJson)
      .then((d) => setCourses(asArray(d)))
      .catch(() => setCourses([]));

    setForm((f) => ({ ...f, course: "" }));
    setSubjects([]);
    setSubjectList([{ subject: "", questionCount: "" }]);
    setSubjectQuestions({});
    setSelectedQuestionsMap({});
    setQuestionDetails({});
  }, [form.category]);

  // ----- Course change resets -----
  useEffect(() => {
    if (!form.course) {
      setSubjects([]);
      setForm((f) => ({ ...f, subject: "" }));
      setSubjectList([{ subject: "", questionCount: "" }]);
      setSubjectQuestions({});
      setSelectedQuestionsMap({});
      setQuestionDetails({});
      return;
    }
    fetch(`/api/admin/manageexams/subjects?course_id=${form.course}`)
      .then(safeJson)
      .then((d) => setSubjects(asArray(d)))
      .catch(() => setSubjects([]));
    setForm((f) => ({ ...f, subject: "" }));
    setSubjectList([{ subject: "", questionCount: "" }]);
    setSubjectQuestions({});
    setSelectedQuestionsMap({});
    setQuestionDetails({});
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
        fetch(`/api/admin/manageexams/chapters?subject_id=${item.subject}`)
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
          let url = `/api/admin/manageexams/questions/filter?course_id=${form.course}&subject_id=${item.subject}&level_id=${filters.level}&question_type_id=${filters.type}`;
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
      const subjectQIds = new Set((subjectQuestions[removed] || []).map((q) => q.id));
      // removed: setSelectedQuestions
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

    setSelectedQuestionsMap((prev) => {
      const prevArr = prev[subjectId] || [];
      let newArr;
      if (prevArr.includes(qid)) {
        // Deselect
        newArr = prevArr.filter((id) => id !== qid);
      } else {
        // Select: check limit
        if (prevArr.length >= countLimit) {
          setWarning(`You cannot select more than ${countLimit} questions for this subject.`);
          return prev;
        }
        newArr = [...prevArr, qid];
      }
      setWarning("");
      // Show snackbar with count after every change
      setSnackbar({ open: true, message: `${newArr.length} question${newArr.length !== 1 ? 's' : ''} selected for this subject.` });
      return { ...prev, [subjectId]: newArr };
    });

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
      const res = await fetch("/api/admin/manageexams/preview-audience", {
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
        setError("Add at least one filter: Name, Class, School, Email, or Section.");
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
        selectedQuestions: selectedQuestions.filter((qid) =>
          (subjectQuestions[s.subject] || []).some((q) => q.id === qid)
        ),
      })),
      marks: marksNum,
      negativeMarks: negMarksNum,
      adaptiveRules: adaptiveRules,
      publish_now: assignNow ? 1 : 0,
      audience: buildAudience(),
    };

    try {
      const res = await fetch("/api/admin/manageexams/create-exam", {
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
          from_date: "",
          to_date: "",
          start_time: "",
          end_time: "",
          status: "scheduled",
          schoolname: "",
          class: "",
          package: "",
          order: "",
        });
        setSubjectList([{ subject: "", questionCount: "" }]);
        // removed: setSelectedQuestions
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
      width="100%"
      sx={{
        display: "flex",
        justifyContent: "center",
        alignItems: "flex-start",
        minHeight: "100vh",
        background: "#f8f9fa",
        py: 4,
        px: { xs: 2, sm: 3 },
      }}
    >
      <Paper
        elevation={6}
        sx={{
          background: "#fff",
          borderRadius: 3,
          p: { xs: 2, sm: 3, md: 4 },
          minWidth: 0,
          maxWidth: 900,
          width: "100%",
          boxShadow: "0 6px 18px rgba(16,24,40,0.06)",
        }}
      >
        {success && <Alert severity="success" sx={{ mb: 2 }}>{success}</Alert>}
        {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}

        <Box sx={{ mb: 2, borderRadius: 2, overflow: "hidden" }}>
          <Box
            sx={{
              background: `linear-gradient(90deg, ${colors.primary}, ${colors.accent})`,
              py: 2.2,
              textAlign: "center",
            }}
          >
            <Typography variant="h4" sx={{ color: "#fff", fontWeight: 800, mb: 0 }}>
              Create Exam
            </Typography>
          </Box>
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
                    label="From Date"
                    name="from_date"
                    type="date"
                    value={form.from_date}
                    onChange={handleChange}
                    fullWidth
                    size="small"
                    variant="outlined"
                    InputLabelProps={{ shrink: true }}
                  />
                </Grid>

                <Grid item xs={12} sm={6}>
                  <StyledTextField
                    label="To Date"
                    name="to_date"
                    type="date"
                    value={form.to_date}
                    onChange={handleChange}
                    fullWidth
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
                    label="School Name (optional)"
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
                    label="Class (optional)"
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
              (item, idx) => {
                if (!item.subject) return null;
                return (
                  <Box key={`${item.subject}-${idx}`} sx={{ mb: 4 }}>
                    <Typography variant="subtitle1" sx={{ fontWeight: 700, color: "#1976d2", mb: 1 }}>
                      {subjects.find((s) => Number(s.subject_id) === Number(item.subject))?.subject_name ||
                        `Subject ${idx + 1}`}
                    </Typography>


                    {subjectFilters[item.subject]?.selectMode !== "random" && (
                      <React.Fragment>
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

                        {/* Search bar above Load Questions */}
                        <StyledTextField
                          label="Search Questions"
                          value={subjectFilters[item.subject]?.search || ""}
                          onChange={e => handleSubjectFilterChange(item.subject, "search", e.target.value)}
                          placeholder="Type to search..."
                          fullWidth
                          size="small"
                          sx={{ mb: 2 }}
                        />

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
                              let url = `/api/admin/manageexams/filter?course_id=${form.course}&subject_id=${item.subject}&level_id=${subjectFilters[item.subject].level}&question_type_id=${subjectFilters[item.subject].type}`;
                              if (subjectChapter[item.subject]) url += `&chapter_id=${subjectChapter[item.subject]}`;
                              if (subjectFilters[item.subject]?.search) url += `&q=${encodeURIComponent(subjectFilters[item.subject].search)}`;
                              fetch(url)
                                .then(res => {
                                  if (!res.ok) throw new Error(`Server error: ${res.status}`);
                                  return res.json();
                                })
                                .then((data) => {
                                  const list = asArray(data);
                                  console.log('Loaded questions for subject', item.subject, ':', list.length);
                                  setSubjectQuestions((prev) => ({
                                    ...prev,
                                    [item.subject]: list,
                                  }));
                                  setQuestionDetails((prev) => {
                                    const copy = { ...prev };
                                    for (const q of list) {
                                      if (q && q.id != null) copy[q.id] = q;
                                    }
                                    return copy;
                                  });
                                })
                                .catch(err => {
                                  console.error('Error loading questions:', err);
                                  setError(`Failed to load questions: ${err.message}`);
                                });
                            }
                          }}
                        >
                          Load Questions
                        </Button>

                        <Paper sx={{ maxHeight: 300, overflow: "auto", p: 2, background: "#fafbfd", pointerEvents: 'auto', zIndex: 10, position: 'relative' }}>
                          {(subjectQuestions[item.subject] || []).length === 0 ? (
                            <Typography variant="body2" sx={{ color: '#999', textAlign: 'center', py: 2 }}>
                              Click "Load Questions" to see questions
                            </Typography>
                          ) : (
                            (subjectQuestions[item.subject] || []).map((q, ii) => (
                              <Box key={`${q.id}-${ii}`} sx={{ mb: 2, borderBottom: "1px solid #eee", pb: 1 }}>
                                <FormControlLabel
                                  sx={{ alignItems: 'flex-start', m: 0, width: '100%' }}
                                  control={
                                    <Checkbox
                                      checked={(selectedQuestionsMap[item.subject] || []).includes(q.id)}
                                      onChange={() => handleQuestionSelect(item.subject, q.id)}
                                      sx={{ border: '1px solid #bbb', borderRadius: '4px', zIndex: 2, background: '#fff', p: 0.5, mr: 1, pointerEvents: 'auto' }}
                                      inputProps={{ 'aria-label': 'Select question' }}
                                    />
                                  }
                                  label={
                                    <Box sx={{ pl: 1 }}>
                                      <Typography variant="body1" sx={{ fontWeight: 600 }}>
                                        {q.question_number || ii + 1}. {cleanQuestionText(q.question_text)}
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
                            ))
                          )}
                        </Paper>
                      </React.Fragment>
                    )}
                  </Box>
                );
              }
            )}
          </AccordionDetails>
        </Accordion>

        {/* Snackbar for selection feedback */}
        <Snackbar
          open={snackbar.open}
          autoHideDuration={2000}
          onClose={() => setSnackbar({ ...snackbar, open: false })}
          message={snackbar.message}
          anchorOrigin={{ vertical: 'top', horizontal: 'center' }}
        />

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
                <Paper sx={{ p: 2, mb: 2, overflowX: "auto" }}>
                  {/* Apply to all controls */}
                  <Box sx={{ display: 'flex', alignItems: 'center', mb: 2, gap: 2 }}>
                    <StyledTextField
                      type="number"
                      size="small"
                      value={applyAllMarks}
                      onChange={e => setApplyAllMarks(e.target.value)}
                      placeholder="Marks (all)"
                      sx={{ width: 100 }}
                      disabled={applyAllChecked}
                    />
                    <StyledTextField
                      type="number"
                      size="small"
                      value={applyAllNegMarks}
                      onChange={e => setApplyAllNegMarks(e.target.value)}
                      placeholder="Negative (all)"
                      sx={{ width: 120 }}
                      disabled={applyAllChecked}
                    />
                    <FormControlLabel
                      control={
                        <Checkbox
                          checked={applyAllChecked}
                          onChange={e => {
                            const checked = e.target.checked;
                            setApplyAllChecked(checked);
                            if (checked) {
                              // Apply to all selected questions
                              setQuestionMarks(prev => {
                                const updated = { ...prev };
                                selectedQuestions.forEach(qid => {
                                  updated[qid] = applyAllMarks;
                                });
                                return updated;
                              });
                              setQuestionNegMarks(prev => {
                                const updated = { ...prev };
                                selectedQuestions.forEach(qid => {
                                  updated[qid] = applyAllNegMarks;
                                });
                                return updated;
                              });
                            }
                          }}
                        />
                      }
                      label="Apply to all"
                      sx={{ ml: 2 }}
                    />
                  </Box>
                  <table style={{ width: "100%", borderCollapse: "collapse", minWidth: 500 }}>
                    <thead>
                      <tr>
                        <th style={{ textAlign: "center", padding: "8px", width: 40 }}>S.No.</th>
                        <th style={{ textAlign: "left", padding: "8px" }}>Question</th>
                        <th style={{ textAlign: "center", padding: "8px" }}>Count</th>
                        <th style={{ textAlign: "center", padding: "8px" }}>Marks</th>
                        <th style={{ textAlign: "center", padding: "8px" }}>Negative Marks</th>
                      </tr>
                    </thead>
                    <tbody>
                      {selectedQuestions.map((qid, idx) => {
                        const q = questionDetails[qid];
                        if (!q) return null;
                        const isExpanded = expandedQuestions[qid];
                        // Helper to truncate with ellipsis if more than 1 line (80 chars for question, 40 for option)
                        const truncate = (text, len = 80) => text && text.length > len ? text.slice(0, len) + '...' : text;
                        return (
                          <tr key={q.id}>
                            <td style={{ padding: "8px", textAlign: "center" }}>{idx + 1}</td>
                            <td style={{ padding: "8px", verticalAlign: 'top' }}>
                              <Typography variant="body1" sx={{ fontWeight: 600, whiteSpace: 'pre-line' }}>
                                {isExpanded ? cleanQuestionText(q.question_text) : truncate(cleanQuestionText(q.question_text), 80)}
                                {q.question_text && q.question_text.length > 80 && (
                                  <span
                                    style={{ color: '#1976d2', cursor: 'pointer', marginLeft: 4 }}
                                    onClick={() => setExpandedQuestions((prev) => ({ ...prev, [qid]: !isExpanded }))}
                                  >
                                    {isExpanded ? ' Show less' : ' ...'}
                                  </span>
                                )}
                              </Typography>
                              {q.question_image && isExpanded && (
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
                                  <Typography variant="body2" sx={{ whiteSpace: 'pre-line' }}>
                                    A. {q.option1 ? (isExpanded ? q.option1 : truncate(q.option1, 40)) : '(Image)'}
                                    {q.option1 && q.option1.length > 40 && (
                                      <span
                                        style={{ color: '#1976d2', cursor: 'pointer', marginLeft: 4 }}
                                        onClick={() => setExpandedQuestions((prev) => ({ ...prev, [qid]: !isExpanded }))}
                                      >
                                        {isExpanded ? ' Show less' : ' ...'}
                                      </span>
                                    )}
                                  </Typography>
                                  {q.option1_image && isExpanded && (
                                    <img 
                                      src={`http://localhost:5000${q.option1_image}`} 
                                      alt="Option A" 
                                      style={{ maxWidth: '80px', height: 'auto', borderRadius: '4px' }}
                                    />
                                  )}
                                </Box>
                              )}
                              {(q.option2 || q.option2_image) && (
                                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mt: 0.5 }}>
                                  <Typography variant="body2" sx={{ whiteSpace: 'pre-line' }}>
                                    B. {q.option2 ? (isExpanded ? q.option2 : truncate(q.option2, 40)) : '(Image)'}
                                    {q.option2 && q.option2.length > 40 && (
                                      <span
                                        style={{ color: '#1976d2', cursor: 'pointer', marginLeft: 4 }}
                                        onClick={() => setExpandedQuestions((prev) => ({ ...prev, [qid]: !isExpanded }))}
                                      >
                                        {isExpanded ? ' Show less' : ' ...'}
                                      </span>
                                    )}
                                  </Typography>
                                  {q.option2_image && isExpanded && (
                                    <img 
                                      src={`http://localhost:5000${q.option2_image}`} 
                                      alt="Option B" 
                                      style={{ maxWidth: '80px', height: 'auto', borderRadius: '4px' }}
                                    />
                                  )}
                                </Box>
                              )}
                              {(q.option3 || q.option3_image) && (
                                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mt: 0.5 }}>
                                  <Typography variant="body2" sx={{ whiteSpace: 'pre-line' }}>
                                    C. {q.option3 ? (isExpanded ? q.option3 : truncate(q.option3, 40)) : '(Image)'}
                                    {q.option3 && q.option3.length > 40 && (
                                      <span
                                        style={{ color: '#1976d2', cursor: 'pointer', marginLeft: 4 }}
                                        onClick={() => setExpandedQuestions((prev) => ({ ...prev, [qid]: !isExpanded }))}
                                      >
                                        {isExpanded ? ' Show less' : ' ...'}
                                      </span>
                                    )}
                                  </Typography>
                                  {q.option3_image && isExpanded && (
                                    <img 
                                      src={`http://localhost:5000${q.option3_image}`} 
                                      alt="Option C" 
                                      style={{ maxWidth: '80px', height: 'auto', borderRadius: '4px' }}
                                    />
                                  )}
                                </Box>
                              )}
                              {(q.option4 || q.option4_image) && (
                                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mt: 0.5 }}>
                                  <Typography variant="body2" sx={{ whiteSpace: 'pre-line' }}>
                                    D. {q.option4 ? (isExpanded ? q.option4 : truncate(q.option4, 40)) : '(Image)'}
                                    {q.option4 && q.option4.length > 40 && (
                                      <span
                                        style={{ color: '#1976d2', cursor: 'pointer', marginLeft: 4 }}
                                        onClick={() => setExpandedQuestions((prev) => ({ ...prev, [qid]: !isExpanded }))}
                                      >
                                        {isExpanded ? ' Show less' : ' ...'}
                                      </span>
                                    )}
                                  </Typography>
                                  {q.option4_image && isExpanded && (
                                    <img 
                                      src={`http://localhost:5000${q.option4_image}`} 
                                      alt="Option D" 
                                      style={{ maxWidth: '80px', height: 'auto', borderRadius: '4px' }}
                                    />
                                  )}
                                </Box>
                              )}
                            </td>
                            <td style={{ padding: "8px", textAlign: "center" }}>
                              <StyledTextField
                                type="number"
                                size="small"
                                value={questionCount[q.id] || ""}
                                onChange={e => setQuestionCount({ ...questionCount, [q.id]: e.target.value })}
                                inputProps={{ min: 1 }}
                                sx={{ width: 60 }}
                                placeholder="1"
                              />
                            </td>
                            <td style={{ padding: "8px", textAlign: "center" }}>
                              <StyledTextField
                                type="number"
                                size="small"
                                value={applyAllChecked ? applyAllMarks : (questionMarks[q.id] || "")}
                                onChange={e => setQuestionMarks({ ...questionMarks, [q.id]: e.target.value })}
                                inputProps={{ min: 0 }}
                                sx={{ width: 80 }}
                                placeholder="Marks"
                                disabled={applyAllChecked}
                              />
                            </td>
                            <td style={{ padding: "8px", textAlign: "center" }}>
                              <StyledTextField
                                type="number"
                                size="small"
                                value={applyAllChecked ? applyAllNegMarks : (questionNegMarks[q.id] || "")}
                                onChange={e => setQuestionNegMarks({ ...questionNegMarks, [q.id]: e.target.value })}
                                inputProps={{ min: 0 }}
                                sx={{ width: 80 }}
                                placeholder="Negative"
                                disabled={applyAllChecked}
                              />
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </Paper>
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

                  {/* Section filter (optional) */}
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

        {/* Section 6: View Created Exams - Simple Button */}
        <Box sx={{ mt: 4, textAlign: "center" }}>
          <Button
            variant="outlined"
            sx={{
              px: 4,
              py: 1.2,
              fontWeight: 600,
              fontSize: 15,
              borderRadius: 2,
              border: "1px solid #d1d5db",
              color: "#6b7280",
              background: "transparent",
              textTransform: "none",
              "&:hover": {
                background: "rgba(0,0,0,0.02)",
                borderColor: "#9ca3af",
              },
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

        {/* View Created Exams Modal Content */}
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
                      gridTemplateColumns: "60px 1fr 120px 150px 180px 180px 120px 150px",
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
                    <Box>Actions</Box>
                  </Box>

                  {examsList.map((exam, idx) => (
                    <Box
                      key={exam.exam_id}
                      sx={{
                        display: "grid",
                        gridTemplateColumns: "60px 1fr 120px 150px 180px 180px 120px 150px",
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
                                {subj.subject_name} ({subj.question_count})
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
                      <Box sx={{ display: "flex", gap: 1 }}>
                        <Button
                          size="small"
                          variant="outlined"
                          sx={{
                            fontSize: 11,
                            px: 1.5,
                            py: 0.5,
                            minWidth: "auto",
                            borderColor: "#3b82f6",
                            color: "#3b82f6",
                            "&:hover": {
                              borderColor: "#2563eb",
                              background: "#eff6ff",
                            },
                          }}
                          onClick={async () => {
                            try {
                              const response = await fetch(`/api/admin/manageexams/exams/${exam.exam_id}`);
                              const data = await response.json();
                              setSelectedViewExam(data);
                              setViewExamModal(true);
                            } catch (err) {
                              console.error("Error fetching exam details:", err);
                              setError("Failed to load exam details");
                            }
                          }}
                        >
                          View
                        </Button>
                        <Button
                          size="small"
                          variant="outlined"
                          sx={{
                            fontSize: 11,
                            px: 1.5,
                            py: 0.5,
                            minWidth: "auto",
                            borderColor: "#10b981",
                            color: "#10b981",
                            "&:hover": {
                              borderColor: "#059669",
                              background: "#ecfdf5",
                            },
                          }}
                          onClick={async () => {
                            try {
                              const response = await fetch(`/api/admin/manageexams/exams/${exam.exam_id}`);
                              const data = await response.json();
                              setSelectedEditExam(data);
                              setEditExamModal(true);
                            } catch (err) {
                              console.error("Error fetching exam details:", err);
                              setError("Failed to load exam details for editing");
                            }
                          }}
                        >
                          Edit
                        </Button>
                      </Box>
                    </Box>
                  ))}
                </Box>
              )}
              
              <Box sx={{ mt: 3, textAlign: "center" }}>
                <Button
                  variant="contained"
                  sx={{
                    background: "linear-gradient(90deg, #667eea 0%, #764ba2 100%)",
                    color: "white",
                    fontWeight: 700,
                    px: 3,
                    py: 1,
                  }}
                  onClick={fetchExamsList}
                >
                  Refresh List
                </Button>
              </Box>
            </Box>
          </Paper>
        )}
      </Paper>

      {/* View Exam Modal */}
      {viewExamModal && selectedViewExam && (
        <Box
          sx={{
            position: "fixed",
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            background: "rgba(0,0,0,0.5)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            zIndex: 9999,
            p: 2,
          }}
          onClick={() => setViewExamModal(false)}
        >
          <Paper
            sx={{
              maxWidth: 800,
              width: "100%",
              maxHeight: "90vh",
              overflow: "auto",
              p: 4,
              borderRadius: 3,
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <Box sx={{ mb: 3, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <Typography variant="h5" sx={{ fontWeight: 700, color: "#1f2937" }}>
                Exam Details
              </Typography>
              <Button
                variant="outlined"
                size="small"
                onClick={() => setViewExamModal(false)}
                sx={{ minWidth: "auto" }}
              >
                Close
              </Button>
            </Box>

            <Grid container spacing={2}>
              <Grid item xs={12}>
                <Box sx={{ mb: 2, p: 2, background: "#f9fafb", borderRadius: 2 }}>
                  <Typography variant="subtitle2" sx={{ color: "#6b7280", mb: 0.5 }}>Exam ID</Typography>
                  <Typography variant="h6" sx={{ fontWeight: 600 }}>{selectedViewExam.exam_id}</Typography>
                </Box>
              </Grid>

              <Grid item xs={12}>
                <Box sx={{ mb: 2, p: 2, background: "#f9fafb", borderRadius: 2 }}>
                  <Typography variant="subtitle2" sx={{ color: "#6b7280", mb: 0.5 }}>Title</Typography>
                  <Typography variant="body1" sx={{ fontWeight: 600 }}>{selectedViewExam.title}</Typography>
                </Box>
              </Grid>

              <Grid item xs={6}>
                <Box sx={{ mb: 2, p: 2, background: "#f9fafb", borderRadius: 2 }}>
                  <Typography variant="subtitle2" sx={{ color: "#6b7280", mb: 0.5 }}>Duration</Typography>
                  <Typography variant="body1">{selectedViewExam.duration} minutes</Typography>
                </Box>
              </Grid>

              <Grid item xs={6}>
                <Box sx={{ mb: 2, p: 2, background: "#f9fafb", borderRadius: 2 }}>
                  <Typography variant="subtitle2" sx={{ color: "#6b7280", mb: 0.5 }}>Status</Typography>
                  <Box
                    component="span"
                    sx={{
                      px: 2,
                      py: 0.5,
                      borderRadius: 1,
                      fontSize: 13,
                      fontWeight: 700,
                      background:
                        selectedViewExam.status === "active"
                          ? "#dcfce7"
                          : selectedViewExam.status === "completed"
                          ? "#dbeafe"
                          : "#fef3c7",
                      color:
                        selectedViewExam.status === "active"
                          ? "#15803d"
                          : selectedViewExam.status === "completed"
                          ? "#1e40af"
                          : "#a16207",
                    }}
                  >
                    {selectedViewExam.status}
                  </Box>
                </Box>
              </Grid>

              <Grid item xs={6}>
                <Box sx={{ mb: 2, p: 2, background: "#f9fafb", borderRadius: 2 }}>
                  <Typography variant="subtitle2" sx={{ color: "#6b7280", mb: 0.5 }}>Exam Date</Typography>
                  <Typography variant="body1">
                    {selectedViewExam.exam_date ? new Date(selectedViewExam.exam_date).toLocaleDateString() : "N/A"}
                  </Typography>
                </Box>
              </Grid>

              <Grid item xs={6}>
                <Box sx={{ mb: 2, p: 2, background: "#f9fafb", borderRadius: 2 }}>
                  <Typography variant="subtitle2" sx={{ color: "#6b7280", mb: 0.5 }}>Course ID</Typography>
                  <Typography variant="body1">{selectedViewExam.course_id || "N/A"}</Typography>
                </Box>
              </Grid>

              <Grid item xs={6}>
                <Box sx={{ mb: 2, p: 2, background: "#f9fafb", borderRadius: 2 }}>
                  <Typography variant="subtitle2" sx={{ color: "#6b7280", mb: 0.5 }}>Start Time</Typography>
                  <Typography variant="body1">
                    {selectedViewExam.start_time ? new Date(selectedViewExam.start_time).toLocaleString() : "N/A"}
                  </Typography>
                </Box>
              </Grid>

              <Grid item xs={6}>
                <Box sx={{ mb: 2, p: 2, background: "#f9fafb", borderRadius: 2 }}>
                  <Typography variant="subtitle2" sx={{ color: "#6b7280", mb: 0.5 }}>End Time</Typography>
                  <Typography variant="body1">
                    {selectedViewExam.end_time ? new Date(selectedViewExam.end_time).toLocaleString() : "N/A"}
                  </Typography>
                </Box>
              </Grid>

              <Grid item xs={12}>
                <Box sx={{ mb: 2, p: 2, background: "#f9fafb", borderRadius: 2 }}>
                  <Typography variant="subtitle2" sx={{ color: "#6b7280", mb: 1 }}>Subjects</Typography>
                  {selectedViewExam.subjects && selectedViewExam.subjects.length > 0 ? (
                    <Box sx={{ display: "flex", flexWrap: "wrap", gap: 1 }}>
                      {selectedViewExam.subjects.map((subj, i) => (
                        <Box
                          key={i}
                          sx={{
                            px: 2,
                            py: 1,
                            background: "#e0e7ff",
                            borderRadius: 1,
                            color: "#4338ca",
                            fontWeight: 600,
                            fontSize: 14,
                          }}
                        >
                          {subj.subject_name} ({subj.question_count} questions)
                        </Box>
                      ))}
                    </Box>
                  ) : (
                    <Typography variant="body2" sx={{ color: "#9ca3af" }}>No subjects</Typography>
                  )}
                </Box>
              </Grid>

              {selectedViewExam.schoolname && (
                <Grid item xs={12}>
                  <Box sx={{ mb: 2, p: 2, background: "#f9fafb", borderRadius: 2 }}>
                    <Typography variant="subtitle2" sx={{ color: "#6b7280", mb: 0.5 }}>School</Typography>
                    <Typography variant="body1">{selectedViewExam.schoolname}</Typography>
                  </Box>
                </Grid>
              )}
            </Grid>
          </Paper>
        </Box>
      )}

      {/* Edit Exam Modal */}
      {editExamModal && selectedEditExam && (
        <Box
          sx={{
            position: "fixed",
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            background: "rgba(0,0,0,0.5)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            zIndex: 9999,
            p: 2,
          }}
          onClick={() => setEditExamModal(false)}
        >
          <Paper
            sx={{
              maxWidth: 600,
              width: "100%",
              maxHeight: "90vh",
              overflow: "auto",
              p: 4,
              borderRadius: 3,
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <Box sx={{ mb: 3, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <Typography variant="h5" sx={{ fontWeight: 700, color: "#1f2937" }}>
                Edit Exam
              </Typography>
              <Button
                variant="outlined"
                size="small"
                onClick={() => setEditExamModal(false)}
                sx={{ minWidth: "auto" }}
              >
                Close
              </Button>
            </Box>

            <Grid container spacing={2}>
              <Grid item xs={12}>
                <StyledTextField
                  label="Exam Title"
                  value={selectedEditExam.title || ""}
                  onChange={(e) => setSelectedEditExam({ ...selectedEditExam, title: e.target.value })}
                  fullWidth
                  size="small"
                />
              </Grid>

              <Grid item xs={12} sm={6}>
                <StyledTextField
                  label="Duration (minutes)"
                  type="number"
                  value={selectedEditExam.duration || ""}
                  onChange={(e) => setSelectedEditExam({ ...selectedEditExam, duration: e.target.value })}
                  fullWidth
                  size="small"
                />
              </Grid>

              <Grid item xs={12} sm={6}>
                <CustomDropdown
                  label="Status"
                  options={[
                    { value: "scheduled", label: "Scheduled" },
                    { value: "active", label: "Active" },
                    { value: "completed", label: "Completed" },
                  ]}
                  value={selectedEditExam.status || "scheduled"}
                  onChange={(val) => setSelectedEditExam({ ...selectedEditExam, status: val })}
                  style={{ width: "100%" }}
                />
              </Grid>

              <Grid item xs={12}>
                <StyledTextField
                  label="Exam Date"
                  type="date"
                  value={selectedEditExam.exam_date ? selectedEditExam.exam_date.split('T')[0] : ""}
                  onChange={(e) => setSelectedEditExam({ ...selectedEditExam, exam_date: e.target.value })}
                  fullWidth
                  size="small"
                  InputLabelProps={{ shrink: true }}
                />
              </Grid>

              <Grid item xs={12} sm={6}>
                <StyledTextField
                  label="Start Time"
                  type="time"
                  value={selectedEditExam.start_time ? new Date(selectedEditExam.start_time).toTimeString().slice(0, 5) : ""}
                  onChange={(e) => setSelectedEditExam({ ...selectedEditExam, start_time: e.target.value })}
                  fullWidth
                  size="small"
                  InputLabelProps={{ shrink: true }}
                />
              </Grid>

              <Grid item xs={12} sm={6}>
                <StyledTextField
                  label="End Time"
                  type="time"
                  value={selectedEditExam.end_time ? new Date(selectedEditExam.end_time).toTimeString().slice(0, 5) : ""}
                  onChange={(e) => setSelectedEditExam({ ...selectedEditExam, end_time: e.target.value })}
                  fullWidth
                  size="small"
                  InputLabelProps={{ shrink: true }}
                />
              </Grid>

              <Grid item xs={12}>
                <Alert severity="info" sx={{ mb: 2 }}>
                  Editing subjects and questions requires using the main form. Only basic details can be updated here.
                </Alert>
              </Grid>

              <Grid item xs={12}>
                <Box sx={{ display: "flex", gap: 2, justifyContent: "flex-end" }}>
                  <Button
                    variant="outlined"
                    onClick={() => setEditExamModal(false)}
                  >
                    Cancel
                  </Button>
                  <Button
                    variant="contained"
                    sx={{
                      background: "linear-gradient(90deg, #10b981 0%, #059669 100%)",
                      color: "white",
                    }}
                    onClick={async () => {
                      try {
                        const response = await fetch(`/api/admin/manageexams/exams/${selectedEditExam.exam_id}`, {
                          method: "PUT",
                          headers: { "Content-Type": "application/json" },
                          body: JSON.stringify(selectedEditExam),
                        });
                        if (response.ok) {
                          setSuccess("Exam updated successfully!");
                          setEditExamModal(false);
                          fetchExamsList();
                          setTimeout(() => setSuccess(""), 3000);
                        } else {
                          setError("Failed to update exam");
                          setTimeout(() => setError(""), 3000);
                        }
                      } catch (err) {
                        console.error("Error updating exam:", err);
                        setError("Failed to update exam");
                        setTimeout(() => setError(""), 3000);
                      }
                    }}
                  >
                    Save Changes
                  </Button>
                </Box>
              </Grid>
            </Grid>
          </Paper>
        </Box>
      )}
    </Box>
  );
}

export default ManageExams;
