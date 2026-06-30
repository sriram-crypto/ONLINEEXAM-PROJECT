import React, { useEffect, useState } from "react";
import ArgonBox from "components/ArgonBox";
import ArgonTypography from "components/ArgonTypography";
import ArgonButton from "components/ArgonButton";
import StyledTextField from "components/StyledTextField";
import CustomDropdown from "components/CustomDropdown";
import Grid from "@mui/material/Grid";

function Setup() {
  const [form, setForm] = useState({
    category: { value: '', label: '' },
    course: "",
    subject: "",
  });
  const [categories, setCategories] = useState([]);
  const [allCourses, setAllCourses] = useState([]);
  const [courseError, setCourseError] = useState("");
  const [courseSuccess, setCourseSuccess] = useState("");
  const [subjectError, setSubjectError] = useState("");
  const [subjectSuccess, setSubjectSuccess] = useState("");
  const [subjectForm, setSubjectForm] = useState({ course: "", subject: "" });
  const [chapterForm, setChapterForm] = useState({ course: "", subject: "", chapter: "" });
  const [chapterError, setChapterError] = useState("");
  const [chapterSuccess, setChapterSuccess] = useState("");
  const [subjects, setSubjects] = useState([]);

  useEffect(() => {
    // Fetch course categories from backend
    const fetchCategories = async () => {
      try {
        const res = await fetch("/api/superadmin/course-categories");
        const data = await res.json();
        if (Array.isArray(data)) {
          setCategories(data);
        }
      } catch (err) {
        // Optionally handle error
      }
    };
    fetchCategories();
    // Fetch all courses for subject card dropdown
    const fetchAllCourses = async () => {
      try {
        const res = await fetch("/api/superadmin/courses-all");
        const data = await res.json();
        if (Array.isArray(data)) {
          setAllCourses(data);
        }
      } catch (err) {
        setAllCourses([]);
      }
    };
    fetchAllCourses();
  }, []);

  useEffect(() => {
    if (!chapterForm.course) {
      setSubjects([]);
      setChapterForm(f => ({ ...f, subject: "" }));
      return;
    }
    const fetchSubjects = async () => {
      try {
        const res = await fetch(`/api/superadmin/subjects?course_id=${chapterForm.course}`);
        const data = await res.json();
        if (Array.isArray(data)) {
          setSubjects(data);
        } else {
          setSubjects([]);
        }
      } catch (err) {
        setSubjects([]);
      }
    };
    fetchSubjects();
  }, [chapterForm.course]);

  const handleChange = (e) => {
    if (e.target.name === 'category') {
      const selected = categories.find(cat => cat.category_id === e.target.value);
      setForm({ ...form, category: { value: e.target.value, label: selected ? selected.category_name : '' }, course: "" });
    } else {
      setForm({ ...form, [e.target.name]: typeof e.target.value === 'string' ? e.target.value.toUpperCase() : String(e.target.value).toUpperCase() });
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setCourseError("");
    setCourseSuccess("");
    // Example: send setup data to backend
    try {
      const res = await fetch("/api/superadmin/setup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ category: form.category.value, course: form.course }),
      });
      let data;
      try {
        data = await res.json();
      } catch (jsonErr) {
        // If response is HTML, show generic error
        setCourseError("Server error or invalid response. Please check backend.");
        return;
      }
      if (data.already) {
        setCourseError("Course already exists!");
        return;
      }
      if (!res.ok || !data.success) {
        setCourseError(data.error || "Failed to save setup");
      } else {
        setCourseSuccess("Setup saved successfully!");
        // Refresh allCourses list
        const coursesRes = await fetch("/api/superadmin/courses-all");
        const coursesData = await coursesRes.json();
        if (Array.isArray(coursesData)) {
          setAllCourses(coursesData);
        }
      }
    } catch (err) {
      setCourseError("Error: " + err.message);
    }
  };

  return (
    <ArgonBox 
      width="100%" 
      sx={{ 
        display: 'flex', 
        justifyContent: 'center', 
        alignItems: 'flex-start', 
        minHeight: '100vh', 
        background: '#f8f9fa', 
        py: { xs: 2, sm: 4 },
        px: { xs: 2, sm: 2 }
      }}
    >
      <div style={{ background: '#fff', borderRadius: 18, boxShadow: '0 6px 32px rgba(44,62,80,0.13)', padding: '24px', maxWidth: 700, width: '100%' }}>
        <ArgonTypography 
          variant="h4" 
          sx={{ 
            fontWeight: 700, 
            color: '#344767', 
            mb: 2, 
            letterSpacing: 0.2, 
            textAlign: 'center',
            fontSize: { xs: '1.5rem', sm: '2rem' }
          }}
        >
          Setup: Create Course
        </ArgonTypography>
        {/* Removed inner card border divider */}
        {courseError && (
          <div style={{ background: '#ffeaea', color: '#d32f2f', borderRadius: 6, padding: '10px 18px', marginBottom: 18, textAlign: 'center', fontWeight: 500, fontSize: 15 }}>{courseError}</div>
        )}
        {courseSuccess && (
          <div style={{ background: '#e7fbe7', color: '#388e3c', borderRadius: 6, padding: '10px 18px', marginBottom: 18, textAlign: 'center', fontWeight: 500, fontSize: 15 }}>{courseSuccess}</div>
        )}
        <form onSubmit={handleSubmit}>
          <Grid container spacing={2} sx={{ mt: 1 }}>
            <Grid item xs={12} sm={6}>
              <ArgonTypography sx={{ fontWeight: 600, fontSize: 15, mb: 1, color: '#344767' }}>
                Category <span style={{ color: '#e53935' }}>*</span>
              </ArgonTypography>
              <CustomDropdown
                label="Category"
                options={categories.map(cat => ({ value: cat.category_id, label: cat.category_name }))}
                value={form.category.value}
                onChange={val => handleChange({ target: { name: 'category', value: val } })}
                placeholder="Select Category"
                style={{ width: '100%' }}
                disabled={false}
              />
            </Grid>
            <Grid item xs={12} sm={6}>
              <ArgonTypography sx={{ fontWeight: 600, fontSize: 15, mb: 1, color: '#344767' }}>
                Course Name <span style={{ color: '#e53935' }}>*</span>
              </ArgonTypography>
              <StyledTextField
                name="course"
                value={form.course}
                onChange={handleChange}
                required
                fullWidth
                size="small"
                placeholder="Enter course name"
              />
            </Grid>
            <Grid item xs={12}>
              <ArgonButton
                type="submit"
                color="info"
                fullWidth
                sx={{ 
                  height: 44, 
                  fontWeight: 600, 
                  fontSize: { xs: '0.875rem', sm: '1rem' },
                  borderRadius: 2,
                  textTransform: 'none',
                  boxShadow: 2,
                  '&:hover': { boxShadow: 3 }
                }}
                disabled={!form.category.value || !form.course}
              >
                Create Course
              </ArgonButton>
            </Grid>
          </Grid>
        </form>
        {/* Setup: Create Subject Card */}
        <div style={{ background: '#fff', borderRadius: 18, boxShadow: '0 6px 32px rgba(44,62,80,0.13)', padding: '24px', maxWidth: 700, width: '100%', marginTop: 32 }}>
          <ArgonTypography 
            variant="h4" 
            sx={{ 
              fontWeight: 700, 
              color: '#344767', 
              mb: 2, 
              letterSpacing: 0.2, 
              textAlign: 'center',
              fontSize: { xs: '1.5rem', sm: '2rem' }
            }}
          >
            Setup: Create Subject
          </ArgonTypography>
          {/* Removed inner card border divider */}
          {subjectError && (
            <div style={{ background: '#ffeaea', color: '#d32f2f', borderRadius: 6, padding: '10px 18px', marginBottom: 18, textAlign: 'center', fontWeight: 500, fontSize: 15 }}>{subjectError}</div>
          )}
          {subjectSuccess && (
            <div style={{ background: '#e7fbe7', color: '#388e3c', borderRadius: 6, padding: '10px 18px', marginBottom: 18, textAlign: 'center', fontWeight: 500, fontSize: 15 }}>{subjectSuccess}</div>
          )}
          <form onSubmit={async (e) => {
            e.preventDefault();
            setSubjectError("");
            setSubjectSuccess("");
            if (!subjectForm.course || !subjectForm.subject) {
              setSubjectError("Course and subject name required!");
              return;
            }
            try {
              const res = await fetch("/api/superadmin/subjects", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ course: subjectForm.course, subject: subjectForm.subject }),
              });
              let data;
              try {
                data = await res.json();
              } catch (jsonErr) {
                setSubjectError("Server error or invalid response. Please check backend.");
                return;
              }
              if (data.already) {
                setSubjectError("Subject already exists!");
                return;
              }
              if (!res.ok || !data.success) {
                setSubjectError(data.error || "Failed to save subject");
              } else {
                setSubjectSuccess("Subject saved successfully!");
                setSubjectForm({ course: "", subject: "" });
              }
            } catch (err) {
              setSubjectError("Error: " + err.message);
            }
          }}>
            <Grid container spacing={2} sx={{ mt: 1 }}>
              <Grid item xs={12} sm={6}>
                <ArgonTypography sx={{ fontWeight: 600, fontSize: 15, mb: 1, color: '#344767' }}>
                  Course <span style={{ color: '#e53935' }}>*</span>
                </ArgonTypography>
                <CustomDropdown
                  label="Course"
                  options={allCourses.map(course => ({ value: course.course_id, label: course.course_name }))}
                  value={subjectForm.course}
                  onChange={val => setSubjectForm(f => ({ ...f, course: val }))}
                  placeholder="Select Course"
                  style={{ width: '100%' }}
                  disabled={false}
                />
              </Grid>
              <Grid item xs={12} sm={6}>
                <ArgonTypography sx={{ fontWeight: 600, fontSize: 15, mb: 1, color: '#344767' }}>
                  Subject Name <span style={{ color: '#e53935' }}>*</span>
                </ArgonTypography>
                <StyledTextField
                  name="subject"
                  value={subjectForm.subject}
                  onChange={e => setSubjectForm(f => ({ ...f, subject: typeof e.target.value === 'string' ? e.target.value.toUpperCase() : String(e.target.value).toUpperCase() }))}
                  required
                  fullWidth
                  size="small"
                  placeholder="Enter subject name"
                />
              </Grid>
              <Grid item xs={12}>
                <ArgonButton
                  type="submit"
                  color="info"
                  fullWidth
                  sx={{ 
                    height: 44, 
                    fontWeight: 600, 
                    fontSize: { xs: '0.875rem', sm: '1rem' },
                    borderRadius: 2,
                    textTransform: 'none',
                    boxShadow: 2,
                    '&:hover': { boxShadow: 3 }
                  }}
                  disabled={!subjectForm.course || !subjectForm.subject}
                >
                  Create Subject
                </ArgonButton>
              </Grid>
            </Grid>
          </form>
        </div>
        {/* Setup: Create Chapter Card */}
        <div style={{ background: '#fff', borderRadius: 18, boxShadow: '0 6px 32px rgba(44,62,80,0.13)', padding: '24px', maxWidth: 700, width: '100%', marginTop: 32 }}>
          <ArgonTypography 
            variant="h4" 
            sx={{ 
              fontWeight: 700, 
              color: '#344767', 
              mb: 2, 
              letterSpacing: 0.2, 
              textAlign: 'center',
              fontSize: { xs: '1.5rem', sm: '2rem' }
            }}
          >
            Setup: Create Chapter
          </ArgonTypography>
          {chapterError && (
            <div style={{ background: '#ffeaea', color: '#d32f2f', borderRadius: 6, padding: '10px 18px', marginBottom: 18, textAlign: 'center', fontWeight: 500, fontSize: 15 }}>{chapterError}</div>
          )}
          {chapterSuccess && (
            <div style={{ background: '#e7fbe7', color: '#388e3c', borderRadius: 6, padding: '10px 18px', marginBottom: 18, textAlign: 'center', fontWeight: 500, fontSize: 15 }}>{chapterSuccess}</div>
          )}
          <form onSubmit={async (e) => {
            e.preventDefault();
            setChapterError("");
            setChapterSuccess("");
            if (!chapterForm.course || !chapterForm.subject || !chapterForm.chapter) {
              setChapterError("Course, subject, and chapter name required!");
              return;
            }
            try {
              const res = await fetch("/api/superadmin/chapters", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ subject_id: chapterForm.subject, chapter_name: chapterForm.chapter }),
              });
              let data;
              try {
                data = await res.json();
              } catch (jsonErr) {
                setChapterError("Server error or invalid response. Please check backend.");
                return;
              }
              if (data.already) {
                setChapterError("Chapter already exists!");
                return;
              }
              if (!res.ok || !data.success) {
                setChapterError(data.error || "Failed to save chapter");
              } else {
                setChapterSuccess("Chapter saved successfully!");
                setChapterForm({ course: "", subject: "", chapter: "" });
                setSubjects([]);
              }
            } catch (err) {
              setChapterError("Error: " + err.message);
            }
          }}>
            <Grid container spacing={2} sx={{ mt: 1 }}>
              <Grid item xs={12} sm={4}>
                <ArgonTypography sx={{ fontWeight: 600, fontSize: 15, mb: 1, color: '#344767' }}>
                  Course <span style={{ color: '#e53935' }}>*</span>
                </ArgonTypography>
                <CustomDropdown
                  label="Course"
                  options={allCourses.map(course => ({ value: course.course_id, label: course.course_name }))}
                  value={chapterForm.course}
                  onChange={val => setChapterForm(f => ({ ...f, course: val, subject: "" }))}
                  placeholder="Select Course"
                  style={{ width: '100%' }}
                  disabled={false}
                />
              </Grid>
              <Grid item xs={12} sm={4}>
                <ArgonTypography sx={{ fontWeight: 600, fontSize: 15, mb: 1, color: '#344767' }}>
                  Subject <span style={{ color: '#e53935' }}>*</span>
                </ArgonTypography>
                <CustomDropdown
                  label="Subject"
                  options={subjects.map(sub => ({ value: sub.subject_id, label: sub.subject_name }))}
                  value={chapterForm.subject}
                  onChange={val => setChapterForm(f => ({ ...f, subject: val }))}
                  placeholder="Select Subject"
                  style={{ width: '100%' }}
                  disabled={!chapterForm.course}
                />
              </Grid>
              <Grid item xs={12} sm={4}>
                <ArgonTypography sx={{ fontWeight: 600, fontSize: 15, mb: 1, color: '#344767' }}>
                  Chapter Name <span style={{ color: '#e53935' }}>*</span>
                </ArgonTypography>
                <StyledTextField
                  name="chapter"
                  value={chapterForm.chapter}
                  onChange={e => setChapterForm(f => ({ ...f, chapter: typeof e.target.value === 'string' ? e.target.value.toUpperCase() : String(e.target.value).toUpperCase() }))}
                  required
                  fullWidth
                  size="small"
                  placeholder="Enter chapter name"
                />
              </Grid>
              <Grid item xs={12}>
                <ArgonButton
                  type="submit"
                  color="info"
                  fullWidth
                  sx={{ 
                    height: 44, 
                    fontWeight: 600, 
                    fontSize: { xs: '0.875rem', sm: '1rem' },
                    borderRadius: 2,
                    textTransform: 'none',
                    boxShadow: 2,
                    '&:hover': { boxShadow: 3 }
                  }}
                  disabled={!chapterForm.course || !chapterForm.subject || !chapterForm.chapter}
                >
                  Create Chapter
                </ArgonButton>
              </Grid>
            </Grid>
          </form>
        </div>
      </div>
    </ArgonBox>
  );
}

export default Setup;
