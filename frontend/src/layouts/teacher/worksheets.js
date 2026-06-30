import React, { useState, useEffect, useRef } from "react";
import ArgonBox from "components/ArgonBox";
import ArgonButton from "components/ArgonButton";
import StyledTextField from "components/StyledTextField";
import CustomDropdown from "components/CustomDropdown";
import Grid from "@mui/material/Grid";
import jsPDF from "jspdf";

function Worksheets() {
  const [form, setForm] = useState({
    category: "",
    course: "",
    subject: "",
    level: "",
  });
  const [categories, setCategories] = useState([]);
  const [courses, setCourses] = useState([]);
  const [subjects, setSubjects] = useState([]);
  const [levels, setLevels] = useState([]);
  const [error, setError] = useState("");
  const [questions, setQuestions] = useState([]);
  const [schoolName, setSchoolName] = useState("");
  const [logo, setLogo] = useState(null);
  const logoInputRef = useRef();
  // Worksheet mode and selection state
  const [mode, setMode] = useState("random"); // "random", "select", or "optimized"
  const [questionCount, setQuestionCount] = useState(10);
  const [selectedQuestions, setSelectedQuestions] = useState([]);
  const [chapters, setChapters] = useState([]);
  const [chapterId, setChapterId] = useState("ALL");
  const [search, setSearch] = useState("");
  const [optimization, setOptimization] = useState(null);
  const [optimizing, setOptimizing] = useState(false);

  useEffect(() => {
    fetch("/api/teacher/manageexams/categories")
      .then(res => res.json())
      .then(data => setCategories(Array.isArray(data) ? data : []))
      .catch(() => setCategories([]));
  }, []);

  useEffect(() => {
    fetch("/api/teacher/manageexams/levels")
      .then(res => res.json())
      .then(data => setLevels(Array.isArray(data) ? data : []))
      .catch(() => setLevels([]));
  }, []);

  useEffect(() => {
    if (form.category) {
      fetch(`/api/teacher/manageexams/courses?category_id=${form.category}`)
        .then(res => res.json())
        .then(data => setCourses(Array.isArray(data) ? data : []))
        .catch(() => setCourses([]));
    } else {
      setCourses([]);
      setForm(f => ({ ...f, course: "", subject: "" }));
    }
  }, [form.category]);

  useEffect(() => {
    if (form.course) {
      fetch(`/api/teacher/manageexams/subjects?course_id=${form.course}`)
        .then(res => res.json())
        .then(data => setSubjects(Array.isArray(data) ? data : []))
        .catch(() => setSubjects([]));
    } else {
      setSubjects([]);
      setForm(f => ({ ...f, subject: "" }));
    }
  }, [form.course]);

  useEffect(() => {
    if (form.category && form.course && form.subject && form.level) {
      fetch(`/api/teacher/worksheets/questions?category_id=${form.category}&course_id=${form.course}&subject_id=${form.subject}&level_id=${form.level}&chapter_id=${chapterId}`)
        .then(res => res.json())
        .then(data => setQuestions(Array.isArray(data) ? data : []));
    } else {
      setQuestions([]);
    }
  }, [form.category, form.course, form.subject, form.level, chapterId]);

  useEffect(() => {
    setOptimization(null);
    setSelectedQuestions([]);
  }, [form.category, form.course, form.subject, form.level, chapterId]);

  useEffect(() => {
    if (form.subject) {
      fetch(`/api/teacher/worksheets/chapters?subject_id=${form.subject}`)
        .then(res => res.json())
        .then(data => setChapters(Array.isArray(data) ? data : []));
    } else {
      setChapters([]);
    }
  }, [form.subject]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setForm(prev => {
      if (name === "category") {
        return { ...prev, category: value, course: "", subject: "", level: "" };
      }
      if (name === "course") {
        return { ...prev, course: value, subject: "", level: "" };
      }
      if (name === "subject") {
        return { ...prev, subject: value, level: "" };
      }
      if (name === "level") {
        return { ...prev, level: value };
      }
      return { ...prev, [name]: value };
    });
  };

  const handleLogoUpload = (e) => {
    const file = e.target.files[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = function (ev) {
        setLogo(ev.target.result);
      };
      reader.readAsDataURL(file);
    }
  };

  const getSelectedLabel = (items, value, idKey, nameKey, fallback = "") => {
    const match = items.find((item) => String(item[idKey]) === String(value));
    return match?.[nameKey] || fallback;
  };

  const sanitizeFileName = (value) =>
    String(value || "worksheet")
      .trim()
      .replace(/[^\w\s-]/g, "")
      .replace(/\s+/g, "_")
      .slice(0, 70) || "worksheet";

  const modeLabel = mode === "optimized" ? "AI Balanced" : mode === "random" ? "Random" : "Manual";

  const handleOptimizeWorksheet = async () => {
    if (!questions || questions.length === 0) {
      setError("No questions found for the selected fields.");
      return;
    }
    if (questionCount < 1 || questionCount > questions.length) {
      setError(`Please enter a valid question count (1-${questions.length})`);
      return;
    }

    setOptimizing(true);
    setError("");
    try {
      const response = await fetch("/api/ml/optimize-worksheet", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          questions,
          target_count: questionCount,
          course_id: form.course,
          subject_id: form.subject,
          chapter_id: chapterId === "ALL" ? null : chapterId,
        }),
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(data.error || "Failed to optimize worksheet.");

      const selectedIds = Array.isArray(data.selected_question_ids) ? data.selected_question_ids : [];
      setOptimization({
        ...data,
        selected_question_ids: selectedIds,
      });
      setSelectedQuestions(selectedIds);
      setMode("optimized");
    } catch (optimizeError) {
      setOptimization(null);
      setError(optimizeError.message || "AI worksheet optimization failed.");
    } finally {
      setOptimizing(false);
    }
  };

  const handleDownloadPDF = () => {
    let usedQuestions = [];
    if (mode === "random") {
      if (!questions || questions.length === 0) {
        setError("No questions found for the selected fields.");
        return;
      }
      if (questionCount < 1 || questionCount > questions.length) {
        setError(`Please enter a valid question count (1-${questions.length})`);
        return;
      }
      usedQuestions = [...questions].sort(() => Math.random() - 0.5).slice(0, questionCount);
    } else if (mode === "optimized") {
      const optimizedIds = optimization?.selected_question_ids || [];
      const questionById = new Map(questions.map((question) => [String(question.id), question]));
      usedQuestions = optimizedIds.map((id) => questionById.get(String(id))).filter(Boolean);
      if (!usedQuestions.length && Array.isArray(optimization?.selected_questions)) {
        usedQuestions = optimization.selected_questions;
      }
      if (!usedQuestions.length) {
        setError("Run AI Balanced selection before downloading the worksheet.");
        return;
      }
      usedQuestions = usedQuestions.slice(0, questionCount);
    } else {
      if (selectedQuestions.length === 0) {
        setError("Please select at least one question.");
        return;
      }
      if (questionCount < 1 || questionCount > selectedQuestions.length) {
        setError(`Please enter a valid question count (1-${selectedQuestions.length})`);
        return;
      }
      usedQuestions = questions.filter(q => selectedQuestions.includes(q.id)).slice(0, questionCount);
    }
    setError("");

    try {
      const doc = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });
      const pageWidth = doc.internal.pageSize.getWidth();
      const pageHeight = doc.internal.pageSize.getHeight();
      const margin = 14;
      const contentWidth = pageWidth - margin * 2;
      const subjectName = getSelectedLabel(subjects, form.subject, "subject_id", "subject_name", "Subject");
      const levelName = getSelectedLabel(levels, form.level, "level_id", "level_name", "Level");
      const chapterName =
        chapterId === "ALL"
          ? "All chapters"
          : getSelectedLabel(chapters, chapterId, "chapter_id", "chapter_name", "Selected chapter");
      let y = margin;

      doc.setProperties({
        title: `${subjectName} Worksheet`,
        subject: "Offline worksheet PDF",
        creator: "ExamPulse Teacher Panel",
      });

      const addFooter = () => {
        const pageNumber = doc.internal.getNumberOfPages();
        doc.setFontSize(8);
        doc.setTextColor(111, 128, 150);
        doc.text("Generated from ExamPulse Teacher Panel", margin, pageHeight - 8);
        doc.text(`Page ${pageNumber}`, pageWidth - margin, pageHeight - 8, { align: "right" });
      };

      const ensureSpace = (heightNeeded) => {
        if (y + heightNeeded <= pageHeight - margin - 10) return;
        addFooter();
        doc.addPage();
        y = margin;
      };

      const writeWrapped = (text, x, width, options = {}) => {
        const fontSize = options.fontSize || 10;
        const lineHeight = options.lineHeight || 5.4;
        doc.setFontSize(fontSize);
        const lines = doc.splitTextToSize(String(text || ""), width);
        const blockHeight = Math.max(lineHeight, lines.length * lineHeight);
        ensureSpace(blockHeight + 2);
        doc.text(lines, x, y, { lineHeightFactor: 1.25 });
        y += blockHeight;
      };

      const drawHeader = () => {
        doc.setFillColor(21, 45, 78);
        doc.rect(0, 0, pageWidth, 34, "F");
        doc.setTextColor(255, 255, 255);
        doc.setFont("helvetica", "bold");
        doc.setFontSize(16);

        if (logo) {
          try {
            const imageType = logo.includes("image/png") ? "PNG" : "JPEG";
            doc.addImage(logo, imageType, margin, 8, 18, 18);
            doc.text(schoolName || "Worksheet", margin + 24, 15);
          } catch (imgErr) {
            doc.text(schoolName || "Worksheet", margin, 15);
          }
        } else {
          doc.text(schoolName || "Worksheet", margin, 15);
        }

        doc.setFont("helvetica", "normal");
        doc.setFontSize(9);
        doc.text("Printable A4 worksheet for offline practice", margin, 25);
        doc.setTextColor(23, 32, 51);
        y = 44;

        doc.setFont("helvetica", "bold");
        doc.setFontSize(15);
        doc.text("Worksheet", pageWidth / 2, y, { align: "center" });
        y += 8;

        doc.setFont("helvetica", "normal");
        doc.setFontSize(9.5);
        doc.setTextColor(82, 95, 127);
        doc.text(`Subject: ${subjectName}`, margin, y);
        doc.text(`Level: ${levelName}`, pageWidth / 2, y);
        y += 6;
        doc.text(`Chapter: ${chapterName}`, margin, y);
        doc.text(`Questions: ${usedQuestions.length}`, pageWidth / 2, y);
        y += 9;

        doc.setDrawColor(203, 213, 225);
        doc.setLineWidth(0.35);
        doc.line(margin, y, pageWidth - margin, y);
        y += 9;

        doc.setTextColor(23, 32, 51);
        doc.setFontSize(10);
        doc.text("Name: ________________________________", margin, y);
        doc.text("Class: ________________", pageWidth - margin, y, { align: "right" });
        y += 8;
      };

      drawHeader();

      usedQuestions.forEach((q, idx) => {
        const optionLines = [
          q.option1 ? `A. ${q.option1}` : "",
          q.option2 ? `B. ${q.option2}` : "",
          q.option3 ? `C. ${q.option3}` : "",
          q.option4 ? `D. ${q.option4}` : "",
        ].filter(Boolean);
        const estimatedHeight =
          9 +
          doc.splitTextToSize(String(q.question_text || ""), contentWidth - 11).length * 5.6 +
          optionLines.reduce((total, option) => total + doc.splitTextToSize(option, contentWidth - 18).length * 5.2, 0);
        ensureSpace(estimatedHeight);

        doc.setFont("helvetica", "bold");
        doc.setTextColor(15, 23, 42);
        doc.setFontSize(10.5);
        doc.text(`${idx + 1}.`, margin, y);
        writeWrapped(q.question_text, margin + 10, contentWidth - 10, { fontSize: 10.5, lineHeight: 5.7 });
        y += 2;

        doc.setFont("helvetica", "normal");
        doc.setTextColor(51, 65, 85);
        optionLines.forEach((option) => {
          writeWrapped(option, margin + 10, contentWidth - 10, { fontSize: 9.5, lineHeight: 5.2 });
        });
        y += 4;
      });

      addFooter();
      doc.addPage();
      y = margin;
      doc.setFont("helvetica", "bold");
      doc.setFontSize(15);
      doc.setTextColor(23, 32, 51);
      doc.text("Answer Key", pageWidth / 2, y, { align: "center" });
      y += 12;
      doc.setFont("helvetica", "normal");
      usedQuestions.forEach((q, idx) => {
        writeWrapped(`${idx + 1}. ${q.answer || "Not provided"}`, margin, contentWidth, { fontSize: 10, lineHeight: 5.6 });
        y += 1;
      });
      addFooter();

      doc.save(`${sanitizeFileName(subjectName)}_worksheet.pdf`);
    } catch (err) {
      setError("Failed to generate PDF. See console for details.");
      console.error("PDF generation error:", err);
    }
  };

  return (
    <ArgonBox
      className="teacher-tool teacher-tool-worksheets"
      width="100%"
      sx={{ p: 0 }}
    >
      <section className="teacher-tool-hero">
        <div>
          <span className="teacher-tool-kicker">
            <span className="material-icons-round">description</span>
            Worksheets
          </span>
          <h2>Build a printable A4 worksheet with a polished PDF download.</h2>
          <p>
            Select the syllabus filters, choose random or manual questions, and download a wrapped,
            paginated PDF with a separate answer key.
          </p>
        </div>
        <div className="teacher-tool-actions">
          <button type="button" className="teacher-action-button primary" onClick={handleDownloadPDF}>
            <span className="material-icons-round">picture_as_pdf</span>
            Download PDF
          </button>
        </div>
      </section>

      <div className="teacher-tool-stat-strip">
        <article>
          <strong>{questions.length}</strong>
          <span>Questions fetched</span>
        </article>
        <article>
          <strong>{modeLabel}</strong>
          <span>Selection mode</span>
        </article>
        <article>
          <strong>{questionCount}</strong>
          <span>PDF question count</span>
        </article>
        <article>
          <strong>{selectedQuestions.length}</strong>
          <span>Selected manually</span>
        </article>
      </div>

      <div
        className="teacher-tool-card"
        style={{
          padding: '24px',
          width: '100%',
        }}
      >
        <div style={{ display: 'none', alignItems: 'center', justifyContent: 'center', marginBottom: 28 }}>
          <div style={{ flex: 1, height: 1.5, background: '#e0e3e7', borderRadius: 1 }} />
          <span style={{ margin: '0 16px', fontSize: 22, color: '#5e72e4' }}>Tools</span>
          <div style={{ flex: 1, height: 1.5, background: '#e0e3e7', borderRadius: 1 }} />
        </div>
        <div className="teacher-section-heading">
          <span className="teacher-tool-kicker">PDF setup</span>
          <h2>Worksheet Download</h2>
          <p>The PDF is generated in A4 format with page breaks, readable spacing, and answer key pages.</p>
        </div>
        {error && form.category && form.course && form.subject && form.level && (
          <div style={{ background: '#ffeaea', color: '#d32f2f', borderRadius: 6, padding: '10px 18px', marginBottom: 18, textAlign: 'center', fontWeight: 500, fontSize: 15 }}>{error}</div>
        )}

        {/* School/College Name and Logo Upload */}
        <Grid container spacing={2} sx={{ mb: 3 }}>
          <Grid item xs={12} sm={6}>
            <label style={{ fontWeight: 600, fontSize: 15, marginBottom: 6, color: '#344767', letterSpacing: 0.1, display: 'block' }}>School/College Name</label>
            <StyledTextField
              name="schoolName"
              value={schoolName}
              onChange={e => setSchoolName(e.target.value)}
              fullWidth
              size="small"
              placeholder="Enter School/College Name"
            />
          </Grid>
          <Grid item xs={12} sm={6}>
            <label style={{ fontWeight: 600, fontSize: 15, marginBottom: 6, color: '#344767', letterSpacing: 0.1, display: 'block' }}>Upload Logo</label>
            <input
              type="file"
              accept="image/*"
              ref={logoInputRef}
              onChange={handleLogoUpload}
              style={{
                display: 'block',
                marginTop: 8,
                fontSize: 14,
                borderRadius: 8,
                background: '#f7f9fa',
                padding: '8px',
                width: '100%',
                border: '1px solid #d0d5dd',
              }}
            />
            {logo && <img src={logo} alt="Logo Preview" style={{ maxHeight: 40, marginTop: 8 }} />}
          </Grid>
        </Grid>

        <form>
          <Grid container spacing={2} sx={{ mb: 2 }}>
            {/* Category Dropdown */}
            <Grid item xs={12} sm={6} md={4}>
              <label style={{ fontWeight: 600, fontSize: 15, marginBottom: 6, color: '#344767', letterSpacing: 0.1, display: 'block' }}>Category <span style={{ color: '#e53935' }}>*</span></label>
              <CustomDropdown
                label="Category"
                options={categories.map(cat => ({ value: cat.category_id, label: cat.category_name }))}
                value={form.category}
                onChange={val => handleChange({ target: { name: 'category', value: val } })}
                placeholder="Select Category"
                style={{ width: '100%' }}
                disabled={false}
              />
            </Grid>
            {/* Course Dropdown */}
            <Grid item xs={12} sm={6} md={4}>
              <label style={{ fontWeight: 600, fontSize: 15, marginBottom: 6, color: '#344767', letterSpacing: 0.1, display: 'block' }}>Course <span style={{ color: '#e53935' }}>*</span></label>
              <CustomDropdown
                label="Course"
                options={courses.map(course => ({ value: course.course_id, label: course.course_name }))}
                value={form.course}
                onChange={val => handleChange({ target: { name: 'course', value: val } })}
                placeholder="Select Course"
                style={{ width: '100%' }}
                disabled={!form.category}
              />
            </Grid>
            {/* Subject Dropdown */}
            <Grid item xs={12} sm={6} md={4}>
              <label style={{ fontWeight: 600, fontSize: 15, marginBottom: 6, color: '#344767', letterSpacing: 0.1, display: 'block' }}>Subject <span style={{ color: '#e53935' }}>*</span></label>
              <CustomDropdown
                label="Subject"
                options={subjects.map(subject => ({ value: subject.subject_id, label: subject.subject_name }))}
                value={form.subject}
                onChange={val => handleChange({ target: { name: 'subject', value: val } })}
                placeholder="Select Subject"
                style={{ width: '100%' }}
                disabled={!form.course}
              />
            </Grid>
            {/* Chapter Dropdown - moved after Subject */}
            <Grid item xs={12} sm={6} md={4}>
              <label style={{ fontWeight: 600, fontSize: 15, marginBottom: 6, color: '#344767', letterSpacing: 0.1, display: 'block' }}>Chapter</label>
              <CustomDropdown
                label="Chapter"
                options={[{ value: 'ALL', label: 'All Chapters' }, ...chapters.map(ch => ({ value: ch.chapter_id, label: ch.chapter_name }))]}
                value={chapterId}
                onChange={setChapterId}
                placeholder="Select Chapter"
                style={{ width: '100%' }}
                disabled={!form.subject}
              />
            </Grid>
            {/* Level Dropdown */}
            <Grid item xs={12} sm={6} md={4}>
              <label style={{ fontWeight: 600, fontSize: 15, marginBottom: 6, color: '#344767', letterSpacing: 0.1, display: 'block' }}>Level <span style={{ color: '#e53935' }}>*</span></label>
              <CustomDropdown
                label="Level"
                options={levels.map(level => ({ value: level.level_id, label: level.level_name }))}
                value={form.level}
                onChange={val => handleChange({ target: { name: 'level', value: val } })}
                placeholder="Select Level"
                style={{ width: '100%' }}
                disabled={!form.subject}
              />
            </Grid>
          </Grid>
        </form>
        <div style={{ marginTop: 18, marginBottom: 16, textAlign: 'center', color: '#344767', fontWeight: 500, fontSize: 15 }}>
          Questions fetched: {questions.length}
        </div>
        {/* Search Bar */}
        <Grid container spacing={2} sx={{ mb: 2, justifyContent: 'center' }}>
          <Grid item xs={12} sm={8} md={6}>
            <label style={{ fontWeight: 600, fontSize: 15, marginBottom: 6, color: '#344767', letterSpacing: 0.1, display: 'block' }}>
              Search questions
            </label>
            <StyledTextField
              fullWidth
              size="small"
              placeholder="Type to search..."
              value={search}
              onChange={e => setSearch(e.target.value)}
              sx={{ background: '#fff', borderRadius: 2 }}
            />
          </Grid>
        </Grid>
        {/* Worksheet Mode Selection */}
        <Grid container spacing={2} sx={{ mb: 3, justifyContent: 'center' }}>
          <Grid item xs={12} sm={6} md={4}>
            <ArgonButton 
              fullWidth
              color={mode === "random" ? "info" : "secondary"} 
              onClick={() => setMode("random")}
              sx={{
                fontSize: { xs: '0.875rem', sm: '1rem' },
                py: 1.5
              }}
            >
              Randomized Order
            </ArgonButton>
          </Grid>
          <Grid item xs={12} sm={6} md={4}>
            <ArgonButton 
              fullWidth
              color={mode === "select" ? "info" : "secondary"} 
              onClick={() => setMode("select")}
              sx={{
                fontSize: { xs: '0.875rem', sm: '1rem' },
                py: 1.5
              }}
            >
              I Will Select
            </ArgonButton>
          </Grid>
          <Grid item xs={12} sm={6} md={4}>
            <ArgonButton
              fullWidth
              color={mode === "optimized" ? "info" : "secondary"}
              onClick={handleOptimizeWorksheet}
              disabled={optimizing || questions.length === 0}
              sx={{
                fontSize: { xs: '0.875rem', sm: '1rem' },
                py: 1.5
              }}
            >
              {optimizing ? "Optimizing..." : "AI Balanced"}
            </ArgonButton>
          </Grid>
        </Grid>
        {/* Question Count Input */}
        <Grid container spacing={2} sx={{ mb: 3, justifyContent: 'center', alignItems: 'center' }}>
          <Grid item xs={12} sm={6} md={4} sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
            <label style={{ fontWeight: 600, fontSize: 15, color: '#344767', whiteSpace: 'nowrap' }}>Questions Count:</label>
            <StyledTextField
              type="number"
              value={questionCount}
              onChange={e => setQuestionCount(Number(e.target.value))}
              size="small"
              inputProps={{ min: 1, max: mode === "random" ? questions.length : selectedQuestions.length || questions.length }}
              sx={{ width: { xs: '100px', sm: '120px' } }}
            />
          </Grid>
        </Grid>
        {optimization && (
          <div className="teacher-result-count" style={{ margin: '0 auto 18px', maxWidth: 820, justifyContent: 'center' }}>
            <span className="material-icons-round">auto_graph</span>
            AI selected {optimization.selected_question_ids?.length || 0} questions
            {optimization.focus_areas?.length ? ` | Focus: ${optimization.focus_areas.slice(0, 3).map(area => area.chapter_name).join(", ")}` : ""}
          </div>
        )}
        {/* If select mode, show all questions with checkboxes */}
        {mode === "select" && questions.length > 0 && (
          <div className="teacher-question-list" style={{ marginBottom: 18 }}>
            {questions.filter(q =>
              !search || q.question_text.toLowerCase().includes(search.toLowerCase())
            ).map(q => (
              <label key={q.id} className="teacher-question-option">
                <input
                  type="checkbox"
                  checked={selectedQuestions.includes(q.id)}
                  onChange={e => {
                    setSelectedQuestions(sel => e.target.checked ? [...sel, q.id] : sel.filter(id => id !== q.id));
                  }}
                />
                <span style={{ fontWeight: 500, fontSize: 15 }}>{q.question_text}</span>
              </label>
            ))}
          </div>
        )}
        <Grid container sx={{ justifyContent: 'center', mt: 2, mb: 2 }}>
          <Grid item xs={12} sm={8} md={6}>
            <ArgonButton
              fullWidth
              variant="contained"
              color="info"
              onClick={handleDownloadPDF}
              sx={{
                fontWeight: 700,
                fontSize: { xs: '1rem', sm: '1.125rem' },
                borderRadius: 3,
                boxShadow: '0 4px 16px rgba(94,114,228,0.13)',
                py: { xs: 1.5, sm: 2 },
                px: { xs: 2, sm: 4 },
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: 1.5,
                textTransform: 'none',
                transition: 'box-shadow 0.2s',
                '&:hover': {
                  boxShadow: '0 8px 24px rgba(94,114,228,0.22)'
                }
              }}
            >
              <span className="material-icons-round">picture_as_pdf</span> <b>Download PDF</b>
            </ArgonButton>
          </Grid>
        </Grid>
        <style>{`
          @keyframes fadeIn {
            from { opacity: 0; transform: translateY(30px); }
            to { opacity: 1; transform: translateY(0); }
          }
          .MuiInputBase-root:hover, .MuiInputBase-root:focus {
            box-shadow: 0 4px 16px rgba(94,114,228,0.13) !important;
            border-color: #5e72e4 !important;
          }
        `}</style>
      </div>
    </ArgonBox>
  );
}

export default Worksheets;
