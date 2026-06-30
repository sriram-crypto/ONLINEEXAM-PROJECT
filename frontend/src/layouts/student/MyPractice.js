import React, { useEffect, useState } from "react";

import DashboardLayout from "examples/LayoutContainers/DashboardLayout";
import CustomDropdown from "components/CustomDropdown";

import MyPracticeScreen from "./MyPracticeScreen";
import MyPracticeResult from "./MyPracticeResult";
import {
  StudentBankPanel,
  StudentEmptyState,
  StudentHero,
  StudentStatCard,
  StudentTopbar,
} from "./StudentDashboardChrome";

import "./student-dashboard.css";

const MyPractice = () => {
  const [categories, setCategories] = useState([]);
  const [courses, setCourses] = useState([]);
  const [subjects, setSubjects] = useState([]);
  const [levels, setLevels] = useState([]);
  const [form, setForm] = useState({
    category: "",
    course: "",
    subject: "",
    level: "",
    questionCount: 10,
  });
  const [loading, setLoading] = useState(false);
  const [examOpen, setExamOpen] = useState(false);
  const [practiceExam, setPracticeExam] = useState(null);
  const [resultOpen, setResultOpen] = useState(false);
  const [submissionId, setSubmissionId] = useState(null);
  const [message, setMessage] = useState("");

  useEffect(() => {
    fetch("/api/admin/course-categories")
      .then((response) => response.json())
      .then((data) => setCategories(Array.isArray(data) ? data : []))
      .catch(() => setCategories([]));

    fetch("/api/admin/difficulty-levels")
      .then((response) => response.json())
      .then((data) => setLevels(Array.isArray(data) ? data : []))
      .catch(() => setLevels([]));
  }, []);

  useEffect(() => {
    if (!form.category) {
      setCourses([]);
      setForm((current) => ({ ...current, course: "", subject: "" }));
      return;
    }

    fetch(`/api/admin/courses?category_id=${form.category}`)
      .then((response) => response.json())
      .then((data) => setCourses(Array.isArray(data) ? data : []))
      .catch(() => setCourses([]));
  }, [form.category]);

  useEffect(() => {
    if (!form.course) {
      setSubjects([]);
      setForm((current) => ({ ...current, subject: "" }));
      return;
    }

    fetch(`/api/admin/subjects?course_id=${form.course}`)
      .then((response) => response.json())
      .then((data) => setSubjects(Array.isArray(data) ? data : []))
      .catch(() => setSubjects([]));
  }, [form.course]);

  const handleChange = (name, value) => {
    if (name === "category") {
      setForm((current) => ({ ...current, category: value, course: "", subject: "" }));
      return;
    }
    if (name === "course") {
      setForm((current) => ({ ...current, course: value, subject: "" }));
      return;
    }
    setForm((current) => ({ ...current, [name]: value }));
  };

  const handleGenerate = async () => {
    setMessage("");
    setLoading(true);

    const payload = {
      category_id: form.category,
      course_id: form.course,
      subject_id: form.subject,
      level_id: form.level,
      questionCount: form.questionCount,
      student_id: JSON.parse(localStorage.getItem("user") || "{}")?.id,
    };

    sessionStorage.setItem(
      "practice_form",
      JSON.stringify({
        category: form.category,
        course: form.course,
        subject: form.subject,
        questionCount: form.questionCount,
      })
    );

    try {
      const response = await fetch("/api/student/mypractice/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = await response.json();

      if (data && data.exam) {
        setPracticeExam(data.exam);
        setExamOpen(true);
        return;
      }

      setMessage(data?.message || "No questions found for the selected criteria. Try different options.");
    } catch (error) {
      setMessage("Unable to generate practice test right now.");
    } finally {
      setLoading(false);
    }
  };

  const handlePracticeSubmit = (submission_id) => {
    setExamOpen(false);
    setSubmissionId(submission_id);
    setResultOpen(true);
  };

  return (
    <DashboardLayout bgColor="transparent">
      <main className="student-page">
        <StudentTopbar title="Practice Zone" />

        <StudentHero
          kicker="Personalized practice builder"
          title="Build a focused practice test for the exact topic you need."
          description="Choose category, course, subject, difficulty, and question count. The portal creates a timed practice set and opens it without leaving your dashboard."
          primary={{ label: loading ? "Generating..." : "Generate Test", icon: "play_circle", onClick: handleGenerate }}
          secondary={{ label: "View Results", onClick: () => window.location.assign("/student/myresults") }}
          metrics={[
            { value: form.questionCount, label: "Questions selected" },
            { value: categories.length, label: "Categories" },
            { value: levels.length, label: "Difficulty levels" },
          ]}
        />

        <section className="student-grid-4 student-section" aria-label="Practice highlights">
          <StudentStatCard icon="quiz" label="Practice Sets" value="50+" detail="Chapter and subject tests" tone="blue" />
          <StudentStatCard icon="trending_up" label="Improvement" value="+15%" detail="Build by reviewing errors" tone="teal" />
          <StudentStatCard icon="timer" label="Exam Timing" value="Live" detail="Practice under pressure" tone="amber" />
          <StudentStatCard icon="psychology" label="Smart Focus" value="Targeted" detail="Pick weak topics first" tone="coral" />
        </section>

        <section className="student-main-grid student-section">
          <article className="student-card">
            <div className="student-card-head">
              <div>
                <span className="student-overline">Create practice</span>
                <h3>Practice test setup</h3>
              </div>
            </div>

            <div className="student-form-grid">
              <div className="student-form-control">
                <CustomDropdown
                  label="Category"
                  options={[{ value: "", label: "Select Category" }, ...categories.map((item) => ({ value: item.category_id, label: item.category_name }))]}
                  value={form.category}
                  onChange={(value) => handleChange("category", value)}
                  style={{ width: "100%" }}
                />
              </div>

              <div className="student-form-control">
                <CustomDropdown
                  label="Course"
                  options={[{ value: "", label: "Select Course" }, ...courses.map((item) => ({ value: item.course_id, label: item.course_name }))]}
                  value={form.course}
                  onChange={(value) => handleChange("course", value)}
                  style={{ width: "100%" }}
                  disabled={!form.category}
                />
                {form.category && courses.length === 0 && <p className="student-form-note">No courses available for this category.</p>}
              </div>

              <div className="student-form-control">
                <CustomDropdown
                  label="Subject"
                  options={[{ value: "", label: "Select Subject" }, ...subjects.map((item) => ({ value: item.subject_id, label: item.subject_name }))]}
                  value={form.subject}
                  onChange={(value) => handleChange("subject", value)}
                  style={{ width: "100%" }}
                  disabled={!form.course}
                />
              </div>

              <div className="student-form-control">
                <CustomDropdown
                  label="Difficulty"
                  options={[{ value: "", label: "Select Level" }, ...levels.map((item) => ({ value: item.level_id, label: item.level_name }))]}
                  value={form.level}
                  onChange={(value) => handleChange("level", value)}
                  style={{ width: "100%" }}
                />
              </div>

              <div className="student-form-field" style={{ gridColumn: "1 / -1" }}>
                <label htmlFor="practice-question-count">Number of questions</label>
                <input
                  id="practice-question-count"
                  name="questionCount"
                  type="number"
                  min="1"
                  max="100"
                  value={form.questionCount}
                  onChange={(event) => handleChange("questionCount", event.target.value)}
                />
              </div>
            </div>

            {message && <p className="student-form-note">{message}</p>}

            <div className="student-inline-actions" style={{ marginTop: 18 }}>
              <button type="button" className="student-primary-button" onClick={handleGenerate} disabled={loading}>
                {loading ? "Generating..." : "Start Practice Test"}
                <span className="material-icons-round">arrow_forward</span>
              </button>
            </div>
          </article>

          <aside className="student-card">
            <div className="student-card-head">
              <div>
                <span className="student-overline">Practice strategy</span>
                <h3>Daily focus plan</h3>
              </div>
            </div>
            <div className="student-tips-list">
              <span><span className="material-icons-round">filter_1</span> Start with one weak chapter.</span>
              <span><span className="material-icons-round">timer</span> Use timed sets for exam rhythm.</span>
              <span><span className="material-icons-round">fact_check</span> Review wrong answers immediately.</span>
              <span><span className="material-icons-round">trending_up</span> Repeat the topic until accuracy improves.</span>
            </div>
          </aside>
        </section>

        <StudentBankPanel onTileClick={handleGenerate} />

        {categories.length === 0 && (
          <StudentEmptyState
            icon="auto_stories"
            title="Practice content is loading"
            text="If this stays empty, check whether categories and courses have been created by the admin."
          />
        )}

        {examOpen && (
          <div className="student-overlay-frame">
            <div className="student-overlay-inner">
              <MyPracticeScreen
                exam={practiceExam}
                onClose={() => {
                  setExamOpen(false);
                  setPracticeExam(null);
                }}
                onSubmit={handlePracticeSubmit}
              />
            </div>
          </div>
        )}

        {resultOpen && submissionId && (
          <div className="student-overlay-frame">
            <div className="student-overlay-inner">
              <MyPracticeResult
                submissionId={submissionId}
                onClose={() => {
                  setResultOpen(false);
                  setSubmissionId(null);
                }}
              />
            </div>
          </div>
        )}
      </main>
    </DashboardLayout>
  );
};

export default MyPractice;
