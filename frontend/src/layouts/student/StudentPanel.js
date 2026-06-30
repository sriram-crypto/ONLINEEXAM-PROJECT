import React, { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";

import DashboardLayout from "examples/LayoutContainers/DashboardLayout";
import {
  StudentBankPanel,
  StudentHero,
  StudentStatCard,
  StudentTopbar,
  StudentEmptyState,
} from "./StudentDashboardChrome";

import "./student-dashboard.css";

const readUser = () => {
  try {
    return JSON.parse(localStorage.getItem("user") || "{}");
  } catch (error) {
    return {};
  }
};

function StudentPanel() {
  const navigate = useNavigate();
  const [courses, setCourses] = useState([]);
  const [selectedCourses, setSelectedCourses] = useState([]);
  const [enrolledCourses, setEnrolledCourses] = useState([]);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");
  const user = useMemo(readUser, []);
  const studentId = user.id || user.user_id || null;
  const firstName = (user.name || "Student").split(" ")[0] || "Student";

  useEffect(() => {
    if (!studentId) return;

    const fetchCourses = async () => {
      try {
        const response = await fetch("/api/courses");
        const data = await response.json();
        setCourses(Array.isArray(data.courses) ? data.courses : []);
      } catch (error) {
        setCourses([]);
        setMessage("Unable to load courses right now.");
      }
    };

    const fetchEnrolledCourses = async () => {
      try {
        const response = await fetch(`/api/student-enrollments/${studentId}`);
        const data = await response.json();
        const enrolled = Array.isArray(data.enrollments) ? data.enrollments.map((item) => item.course_id) : [];
        setEnrolledCourses(enrolled);
      } catch (error) {
        setEnrolledCourses([]);
      }
    };

    fetchCourses();
    fetchEnrolledCourses();
  }, [studentId]);

  const handleCourseToggle = (courseId) => {
    if (enrolledCourses.includes(courseId)) return;
    setSelectedCourses((current) =>
      current.includes(courseId) ? current.filter((id) => id !== courseId) : [...current, courseId]
    );
  };

  const handleEnroll = async () => {
    if (selectedCourses.length === 0 || !studentId) return;

    setLoading(true);
    setMessage("");
    try {
      const response = await fetch("/api/enroll-student", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          student_id: studentId,
          course_ids: selectedCourses,
        }),
      });
      const data = await response.json();

      if (!response.ok) {
        setMessage(data.error || "Enrollment failed. Please try again.");
        return;
      }

      setMessage("Courses enrolled successfully.");
      setSelectedCourses([]);
      setEnrolledCourses((current) => Array.from(new Set([...current, ...selectedCourses])));
    } catch (error) {
      setMessage("Unable to enroll right now. Please check the server.");
    } finally {
      setLoading(false);
    }
  };

  const actions = [
    {
      label: "View Profile",
      detail: "Edit personal and academic details",
      icon: "person",
      path: "/student/profile",
    },
    {
      label: "My Exams",
      detail: "Join live and scheduled exams",
      icon: "fact_check",
      path: "/student/myexam",
    },
    {
      label: "Results",
      detail: "Review scores and answer feedback",
      icon: "bar_chart",
      path: "/student/myresults",
    },
    {
      label: "Practice",
      detail: "Create chapter-wise practice tests",
      icon: "quiz",
      path: "/student/mypractice",
    },
  ];

  return (
    <DashboardLayout bgColor="transparent">
      <main className="student-page">
        <StudentTopbar title="Student Panel" />

        <StudentHero
          kicker="Student learning hub"
          title={`Welcome back, ${firstName}. Keep your preparation moving.`}
          description="Jump into practice, live exams, enrolled courses, and results from one focused student workspace."
          primary={{ label: "Start Practice", icon: "arrow_forward", onClick: () => navigate("/student/mypractice") }}
          secondary={{ label: "View Exams", onClick: () => navigate("/student/myexam") }}
          metrics={[
            { value: actions.length, label: "Quick routes" },
            { value: enrolledCourses.length, label: "Courses enrolled" },
            { value: selectedCourses.length, label: "Courses selected" },
          ]}
        />

        <section className="student-grid-4 student-section" aria-label="Student shortcuts">
          {actions.map((action) => (
            <button type="button" className="student-action-card" key={action.label} onClick={() => navigate(action.path)}>
              <span className="material-icons-round">{action.icon}</span>
              <strong>{action.label}</strong>
              <small>{action.detail}</small>
            </button>
          ))}
        </section>

        <section className="student-grid-4 student-section" aria-label="Student progress highlights">
          <StudentStatCard icon="assignment_turned_in" label="Completed Exams" value="18" detail="Tracked from exam history" tone="green" />
          <StudentStatCard icon="trending_up" label="Average Score" value="86%" detail="Keep pushing upward" tone="teal" />
          <StudentStatCard icon="timer" label="Focus Time" value="45m" detail="Recommended daily practice" tone="amber" />
          <StudentStatCard icon="verified_user" label="Exam Mode" value="Ready" detail="Secure attempt tools active" tone="coral" />
        </section>

        <section id="student-course-enrollment" className="student-card student-section">
          <div className="student-card-head">
            <div>
              <span className="student-overline">Course enrollment</span>
              <h3>Available courses</h3>
            </div>
            {selectedCourses.length > 0 && (
              <button type="button" className="student-primary-button" onClick={handleEnroll} disabled={loading}>
                {loading ? "Enrolling..." : `Enroll ${selectedCourses.length} course${selectedCourses.length > 1 ? "s" : ""}`}
                <span className="material-icons-round">school</span>
              </button>
            )}
          </div>

          {message && <p className="student-form-note">{message}</p>}

          {courses.length === 0 ? (
            <StudentEmptyState
              icon="menu_book"
              title="No courses available"
              text="Courses will appear here when they are added by your teacher or administrator."
            />
          ) : (
            <div className="student-grid-3">
              {courses.map((course) => {
                const isEnrolled = enrolledCourses.includes(course.course_id);
                const isSelected = selectedCourses.includes(course.course_id);
                return (
                  <button
                    type="button"
                    className={`student-course-card ${isEnrolled ? "enrolled" : ""} ${isSelected ? "selected" : ""}`}
                    key={course.course_id}
                    onClick={() => handleCourseToggle(course.course_id)}
                  >
                    <span className="student-course-icon material-icons-round">auto_stories</span>
                    <span>
                      <strong>{course.course_name}</strong>
                      <p>Duration: {course.course_duration ? `${course.course_duration} months` : "Flexible"}</p>
                      <em className="student-course-badge">
                        {isEnrolled ? "Enrolled" : isSelected ? "Selected" : "Tap to select"}
                      </em>
                    </span>
                  </button>
                );
              })}
            </div>
          )}
        </section>

        <StudentBankPanel onTileClick={() => navigate("/student/mypractice")} />
      </main>
    </DashboardLayout>
  );
}

export default StudentPanel;
