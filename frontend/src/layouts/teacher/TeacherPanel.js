import React, { useEffect, useMemo, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";

import DashboardLayout from "examples/LayoutContainers/DashboardLayout";
import { useArgonController, setMiniSidenav } from "context";

import ManageExams from "./manageexams";
import AddQuestion from "./AddQuestion";
import Worksheets from "./worksheets";
import GenerateQuestionPaper from "./generatequestionpaper";
import SubmissionReport from "./submissionreport";
import ParentRequestReview from "../shared/ParentRequestReview";
import StudentAnalytics from "../shared/StudentAnalytics";

import "../role-panel.css";

const teacherOptions = [
  {
    id: "manage",
    label: "Manage Exams",
    eyebrow: "Exam control",
    description: "Create, edit, assign, and monitor teacher exams.",
    icon: "assignment",
  },
  {
    id: "add-question",
    label: "Add Questions",
    eyebrow: "Question bank",
    description: "Build reusable questions for future exams.",
    icon: "add_circle",
  },
  {
    id: "worksheets",
    label: "Worksheets",
    eyebrow: "Practice material",
    description: "Generate worksheet sets for class practice.",
    icon: "description",
  },
  {
    id: "question-paper",
    label: "Question Paper",
    eyebrow: "Paper builder",
    description: "Generate structured exam papers quickly.",
    icon: "post_add",
  },
  {
    id: "submissions",
    label: "Submissions",
    eyebrow: "Student reports",
    description: "Review submissions and class performance.",
    icon: "bar_chart",
  },
  {
    id: "parent-requests",
    label: "Parent Requests",
    eyebrow: "Family connect",
    description: "Approve ward links and schedule parent feedback meetings.",
    icon: "family_restroom",
  },
  {
    id: "student-analytics",
    label: "Student Analytics",
    eyebrow: "ML insights",
    description: "Detect weak students, weak subjects, and exam trends.",
    icon: "insights",
  },
];

const overviewOption = {
  id: "overview",
  label: "Overview",
  eyebrow: "Teacher workspace",
  description: "Choose a teaching tool to begin.",
  icon: "dashboard_customize",
};

const teacherStats = [
  { label: "Tools", value: "7", detail: "Exams, questions, papers, parents, analytics", icon: "widgets" },
  { label: "Question Bank", value: "Build", detail: "Add reusable questions", icon: "quiz" },
  { label: "Worksheets", value: "Practice", detail: "Prepare learning material", icon: "description" },
  { label: "Reports", value: "Review", detail: "Track submissions", icon: "analytics" },
];

const getStoredUserName = () => {
  try {
    const user = JSON.parse(localStorage.getItem("user") || "null");
    return user?.name || "Teacher";
  } catch (error) {
    return "Teacher";
  }
};

function TeacherPanel() {
  const navigate = useNavigate();
  const location = useLocation();
  const [controller, dispatch] = useArgonController();
  const { miniSidenav } = controller;
  const [teacherOption, setTeacherOption] = useState("overview");
  const userName = getStoredUserName();
  const firstName = userName.split(" ")[0] || "Teacher";

  const requestedOption = useMemo(() => {
    const option = new URLSearchParams(location.search).get("view") || "overview";
    return teacherOptions.some((item) => item.id === option) ? option : "overview";
  }, [location.search]);

  useEffect(() => {
    setTeacherOption(requestedOption);
  }, [requestedOption]);

  const selectedOption =
    teacherOption === "overview"
      ? overviewOption
      : teacherOptions.find((option) => option.id === teacherOption) || overviewOption;

  const handleOptionClick = (optionId) => {
    setTeacherOption(optionId);
    if (optionId === "overview") {
      navigate("/teacher-panel");
      return;
    }
    navigate(`/teacher-panel?view=${optionId}`);
  };

  const renderTeacherContent = () => {
    switch (teacherOption) {
      case "manage":
        return <ManageExams />;
      case "add-question":
        return <AddQuestion />;
      case "worksheets":
        return <Worksheets />;
      case "question-paper":
        return <GenerateQuestionPaper />;
      case "submissions":
        return <SubmissionReport />;
      case "parent-requests":
        return <ParentRequestReview actor="teacher" />;
      case "student-analytics":
        return <StudentAnalytics actor="teacher" />;
      case "overview":
      default:
        return (
          <div className="role-panel-overview-grid">
            {teacherOptions.map((option) => (
              <button
                type="button"
                className="role-panel-overview-card"
                key={option.id}
                onClick={() => handleOptionClick(option.id)}
              >
                <span className="material-icons-round">{option.icon}</span>
                <small>{option.eyebrow}</small>
                <strong>{option.label}</strong>
                <em>{option.description}</em>
              </button>
            ))}
          </div>
        );
    }
  };

  return (
    <DashboardLayout bgColor="transparent">
      <div className="role-panel-page teacher-panel-page">
        <header className="role-panel-topbar">
          <div className="role-panel-title">
            <button
              type="button"
              className="role-panel-icon-button"
              aria-label="Toggle sidebar"
              onClick={() => setMiniSidenav(dispatch, !miniSidenav)}
            >
              <span className="material-icons-round">menu</span>
            </button>
            <div>
              <span>ExamPulse teacher</span>
              <h1>Teaching command panel</h1>
            </div>
          </div>

          <div className="role-panel-tools">
            <label className="role-panel-search" htmlFor="teacher-search">
              <span className="material-icons-round">search</span>
              <input id="teacher-search" type="search" placeholder="Search exams, worksheets, reports" />
            </label>
            <button type="button" className="role-panel-profile-chip" onClick={() => handleOptionClick("overview")}>
              <span>{firstName.charAt(0).toUpperCase()}</span>
              <strong>{firstName}</strong>
            </button>
          </div>
        </header>

        <section className="role-panel-hero">
          <div className="role-panel-hero-grid" aria-hidden="true" />
          <div className="role-panel-hero-copy">
            <span className="role-panel-pill">
              <span className="material-icons-round">school</span>
              Teacher workspace
            </span>
            <h2>Create exams, build practice, and review submissions in one flow.</h2>
            <p>
              Manage exams, add questions, create worksheets, generate papers, and review student
              submissions from a focused teaching surface.
            </p>
            <div className="role-panel-hero-actions">
              <button type="button" onClick={() => handleOptionClick("manage")}>
                Manage Exams
                <span className="material-icons-round">arrow_forward</span>
              </button>
              <button type="button" onClick={() => handleOptionClick("submissions")}>
                View Reports
              </button>
            </div>
          </div>

          <div className="role-panel-hero-visual" aria-label="Animated teacher tools illustration">
            <div className="role-panel-floating-card one">
              <span>Papers</span>
              <strong>Fast</strong>
            </div>
            <div className="role-panel-floating-card two">
              <span>Scores</span>
              <strong>Live</strong>
            </div>
            <div className="role-panel-console">
              <div className="role-panel-console-top">
                <span />
                <span />
                <span />
              </div>
              <div className="role-panel-console-body">
                <i />
                <i />
                <b />
                <b />
                <b />
              </div>
            </div>
          </div>
        </section>

        <section className="role-panel-stat-grid" aria-label="Teacher highlights">
          {teacherStats.map((stat) => (
            <div className="role-panel-stat-card" key={stat.label}>
              <span className="material-icons-round">{stat.icon}</span>
              <div>
                <small>{stat.label}</small>
                <strong>{stat.value}</strong>
                <em>{stat.detail}</em>
              </div>
            </div>
          ))}
        </section>

        <section className="role-panel-menu-strip" aria-label="Teacher menu shortcuts">
          <button
            type="button"
            className={teacherOption === "overview" ? "active" : ""}
            onClick={() => handleOptionClick("overview")}
          >
            <span className="material-icons-round">{overviewOption.icon}</span>
            <strong>{overviewOption.label}</strong>
          </button>
          {teacherOptions.map((option) => (
            <button
              type="button"
              className={teacherOption === option.id ? "active" : ""}
              key={option.id}
              onClick={() => handleOptionClick(option.id)}
            >
              <span className="material-icons-round">{option.icon}</span>
              <strong>{option.label}</strong>
            </button>
          ))}
        </section>

        <section className="role-panel-workspace">
          <div className="role-panel-workspace-head">
            <span className="material-icons-round">{selectedOption.icon}</span>
            <div>
              <small>{selectedOption.eyebrow}</small>
              <h3>{selectedOption.label}</h3>
              <p>{selectedOption.description}</p>
            </div>
          </div>
          <div className="role-panel-tool-body">{renderTeacherContent()}</div>
        </section>
      </div>
    </DashboardLayout>
  );
}

export default TeacherPanel;
