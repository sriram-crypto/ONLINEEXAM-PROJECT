import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";

import DashboardLayout from "examples/LayoutContainers/DashboardLayout";
import {
  StudentEmptyState,
  StudentHero,
  StudentStatCard,
  StudentTopbar,
} from "layouts/student/StudentDashboardChrome";

import "layouts/student/student-dashboard.css";

function readUser() {
  try {
    return JSON.parse(localStorage.getItem("user") || "{}");
  } catch (error) {
    return {};
  }
}

function EnrollStudent() {
  const navigate = useNavigate();
  const [courses, setCourses] = useState([]);
  const [selectedCourses, setSelectedCourses] = useState([]);
  const [enrolledCourses, setEnrolledCourses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [enrolling, setEnrolling] = useState(false);
  const [message, setMessage] = useState("");
  const [successCount, setSuccessCount] = useState(0);
  const user = readUser();
  const studentId = user.id || user.user_id;
  const userName = user.name || localStorage.getItem("name") || "Student";

  useEffect(() => {
    if (!studentId) {
      setLoading(false);
      setMessage("Please sign in as a student to enroll in courses.");
      return;
    }

    const fetchCourses = async () => {
      setLoading(true);
      try {
        const response = await fetch("/api/courses");
        const data = await response.json();
        setCourses(Array.isArray(data.courses) ? data.courses : []);
      } catch (error) {
        setCourses([]);
        setMessage("Unable to load courses right now.");
      } finally {
        setLoading(false);
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
    if (selectedCourses.length === 0 || !studentId) {
      setMessage("Please select at least one course to enroll.");
      return;
    }

    setEnrolling(true);
    setMessage("");
    const courseCount = selectedCourses.length;

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
        setMessage(data.error || "Enrollment failed.");
        return;
      }

      setSuccessCount(courseCount);
      setSelectedCourses([]);
      setEnrolledCourses((current) => Array.from(new Set([...current, ...selectedCourses])));
    } catch (error) {
      setMessage("Unable to enroll right now.");
    } finally {
      setEnrolling(false);
    }
  };

  return (
    <DashboardLayout bgColor="transparent">
      <main className="student-page">
        <StudentTopbar title="Enroll Courses" />

        <StudentHero
          kicker="Course enrollment"
          title={`Choose the learning tracks that fit your next exam, ${userName.split(" ")[0] || "Student"}.`}
          description="Select available courses, review what is already enrolled, and add new preparation tracks to your student portal."
          primary={{ label: enrolling ? "Enrolling..." : "Enroll Selected", icon: "school", onClick: handleEnroll }}
          secondary={{ label: "Back to Student Panel", onClick: () => navigate("/student-panel") }}
          metrics={[
            { value: courses.length, label: "Available courses" },
            { value: enrolledCourses.length, label: "Already enrolled" },
            { value: selectedCourses.length, label: "Selected now" },
          ]}
        />

        {message && <p className="student-form-note student-section">{message}</p>}

        <section className="student-grid-4 student-section">
          <StudentStatCard icon="auto_stories" label="Available" value={courses.length} detail="Course options" tone="blue" />
          <StudentStatCard icon="verified" label="Enrolled" value={enrolledCourses.length} detail="Active tracks" tone="green" />
          <StudentStatCard icon="playlist_add_check" label="Selected" value={selectedCourses.length} detail="Ready to add" tone="teal" />
          <StudentStatCard icon="timer" label="Access" value="Instant" detail="After enrollment" tone="amber" />
        </section>

        <section className="student-card student-section">
          <div className="student-card-head">
            <div>
              <span className="student-overline">Course library</span>
              <h3>Select courses</h3>
            </div>
            <div className="student-inline-actions">
              <button type="button" className="student-action-button" onClick={() => setSelectedCourses([])}>
                Clear
                <span className="material-icons-round">backspace</span>
              </button>
              <button type="button" className="student-primary-button" onClick={handleEnroll} disabled={enrolling || selectedCourses.length === 0}>
                {enrolling ? "Enrolling..." : `Enroll ${selectedCourses.length}`}
                <span className="material-icons-round">arrow_forward</span>
              </button>
            </div>
          </div>

          {loading ? (
            <StudentEmptyState icon="hourglass_top" title="Loading courses" text="Available courses are being prepared." />
          ) : courses.length === 0 ? (
            <StudentEmptyState icon="menu_book" title="No courses available" text="Please contact the administrator to add courses." />
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
                    <span className="student-course-icon material-icons-round">{isEnrolled ? "verified" : "auto_stories"}</span>
                    <span>
                      <strong>{course.course_name}</strong>
                      <p>Duration: {course.course_duration ? `${course.course_duration} months` : "Flexible"}</p>
                      <p>Course ID: #{course.course_id}</p>
                      <em className="student-course-badge">
                        {isEnrolled ? "Already enrolled" : isSelected ? "Selected" : "Tap to select"}
                      </em>
                    </span>
                  </button>
                );
              })}
            </div>
          )}
        </section>

        {successCount > 0 && (
          <div className="student-modal-backdrop" onClick={() => setSuccessCount(0)}>
            <article className="student-modal-card" onClick={(event) => event.stopPropagation()}>
              <header className="student-modal-head">
                <span className="student-overline" style={{ color: "#94f4e9" }}>Enrollment complete</span>
                <h2 style={{ margin: "8px 0 6px" }}>Courses added successfully</h2>
                <p style={{ margin: 0, color: "rgba(255,255,255,0.76)" }}>
                  You enrolled in {successCount} course{successCount === 1 ? "" : "s"}.
                </p>
              </header>
              <div className="student-modal-body">
                <p style={{ color: "#627086", marginTop: 0 }}>
                  These courses are now available from your student dashboard and practice workflows.
                </p>
                <div className="student-inline-actions" style={{ justifyContent: "flex-end" }}>
                  <button type="button" className="student-action-button" onClick={() => setSuccessCount(0)}>
                    Stay Here
                    <span className="material-icons-round">close</span>
                  </button>
                  <button type="button" className="student-primary-button" onClick={() => navigate("/student-panel")}>
                    Go to Student Panel
                    <span className="material-icons-round">arrow_forward</span>
                  </button>
                </div>
              </div>
            </article>
          </div>
        )}
      </main>
    </DashboardLayout>
  );
}

export default EnrollStudent;
