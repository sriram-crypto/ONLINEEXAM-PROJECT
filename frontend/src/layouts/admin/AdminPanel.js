import React, { useEffect, useMemo, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";

import DashboardLayout from "examples/LayoutContainers/DashboardLayout";
import { useArgonController, setMiniSidenav } from "context";

import AddQuestion from "./AddQuestion";
import UploadSchoolUsers from "./uploadschoolusers";
import ViewUsers from "./viewuser";
import ManageExams from "./manageexams";
import ParentRequestReview from "../shared/ParentRequestReview";
import StudentAnalytics from "../shared/StudentAnalytics";

import "../role-panel.css";

const adminOptions = [
  {
    id: "add-question",
    label: "Add Question",
    eyebrow: "Question bank",
    description: "Create MCQ and exam-ready question content.",
    icon: "add_circle",
  },
  {
    id: "bulk-users",
    label: "Bulk Users",
    eyebrow: "School uploads",
    description: "Upload student or school users in batches.",
    icon: "upload_file",
  },
  {
    id: "users",
    label: "View Users",
    eyebrow: "User directory",
    description: "Review and manage institute user records.",
    icon: "groups",
  },
  {
    id: "exams",
    label: "Manage Exams",
    eyebrow: "Exam operations",
    description: "Create, assign, update, and monitor exams.",
    icon: "assignment",
  },
  {
    id: "parent-requests",
    label: "Parent Requests",
    eyebrow: "Ward verification",
    description: "Approve parent ward links and meeting requests.",
    icon: "family_restroom",
  },
  {
    id: "student-analytics",
    label: "Student Analytics",
    eyebrow: "ML insights",
    description: "Find weak students, weak subjects, risk, and exam trends.",
    icon: "insights",
  },
];

const overviewOption = {
  id: "overview",
  label: "Overview",
  eyebrow: "Admin workspace",
  description: "Choose an admin tool to begin.",
  icon: "dashboard_customize",
};

const adminStats = [
  { label: "Tools", value: "6", detail: "Questions, users, exams, parents, analytics", icon: "widgets" },
  { label: "Question Bank", value: "Ready", detail: "Create exam content", icon: "quiz" },
  { label: "Users", value: "Bulk", detail: "Upload and review records", icon: "groups" },
  { label: "Exams", value: "Control", detail: "Manage exam workflows", icon: "rule" },
];

const getStoredUserName = () => {
  try {
    const user = JSON.parse(localStorage.getItem("user") || "null");
    return user?.name || "Admin";
  } catch (error) {
    return "Admin";
  }
};

function AdminPanel() {
  const navigate = useNavigate();
  const location = useLocation();
  const [controller, dispatch] = useArgonController();
  const { miniSidenav } = controller;
  const [adminOption, setAdminOption] = useState("overview");
  const userName = getStoredUserName();
  const firstName = userName.split(" ")[0] || "Admin";

  const requestedOption = useMemo(() => {
    const option = new URLSearchParams(location.search).get("view") || "overview";
    return adminOptions.some((item) => item.id === option) ? option : "overview";
  }, [location.search]);

  useEffect(() => {
    setAdminOption(requestedOption);
  }, [requestedOption]);

  const selectedOption =
    adminOption === "overview"
      ? overviewOption
      : adminOptions.find((option) => option.id === adminOption) || overviewOption;

  const handleOptionClick = (optionId) => {
    setAdminOption(optionId);
    if (optionId === "overview") {
      navigate("/admin-panel");
      return;
    }
    navigate(`/admin-panel?view=${optionId}`);
  };

  const renderAdminContent = () => {
    switch (adminOption) {
      case "add-question":
        return <AddQuestion />;
      case "bulk-users":
        return <UploadSchoolUsers />;
      case "users":
        return <ViewUsers />;
      case "exams":
        return <ManageExams />;
      case "parent-requests":
        return <ParentRequestReview actor="admin" />;
      case "student-analytics":
        return <StudentAnalytics actor="admin" />;
      case "overview":
      default:
        return (
          <div className="role-panel-overview-grid">
            {adminOptions.map((option) => (
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
      <div className="role-panel-page admin-panel-page">
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
              <span>ExamPulse admin</span>
              <h1>Institute operations panel</h1>
            </div>
          </div>

          <div className="role-panel-tools">
            <label className="role-panel-search" htmlFor="admin-search">
              <span className="material-icons-round">search</span>
              <input id="admin-search" type="search" placeholder="Search questions, users, exams" />
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
              <span className="material-icons-round">manage_accounts</span>
              Admin workspace
            </span>
            <h2>Run question banks, users, and exams from one sharp console.</h2>
            <p>
              Add questions, upload school users, review user records, and manage exam workflows
              without jumping between disconnected screens.
            </p>
            <div className="role-panel-hero-actions">
              <button type="button" onClick={() => handleOptionClick("add-question")}>
                Add Question
                <span className="material-icons-round">arrow_forward</span>
              </button>
              <button type="button" onClick={() => handleOptionClick("exams")}>
                Manage Exams
              </button>
            </div>
          </div>

          <div className="role-panel-hero-visual" aria-label="Animated admin tools illustration">
            <div className="role-panel-floating-card one">
              <span>Users</span>
              <strong>Bulk</strong>
            </div>
            <div className="role-panel-floating-card two">
              <span>Exams</span>
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

        <section className="role-panel-stat-grid" aria-label="Admin highlights">
          {adminStats.map((stat) => (
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

        <section className="role-panel-menu-strip" aria-label="Admin menu shortcuts">
          <button
            type="button"
            className={adminOption === "overview" ? "active" : ""}
            onClick={() => handleOptionClick("overview")}
          >
            <span className="material-icons-round">{overviewOption.icon}</span>
            <strong>{overviewOption.label}</strong>
          </button>
          {adminOptions.map((option) => (
            <button
              type="button"
              className={adminOption === option.id ? "active" : ""}
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
          <div className="role-panel-tool-body">{renderAdminContent()}</div>
        </section>
      </div>
    </DashboardLayout>
  );
}

export default AdminPanel;
