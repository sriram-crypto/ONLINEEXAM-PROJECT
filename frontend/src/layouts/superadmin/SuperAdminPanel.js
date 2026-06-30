import React, { useEffect, useMemo, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";

import DashboardLayout from "examples/LayoutContainers/DashboardLayout";
import { useArgonController, setMiniSidenav } from "context";

import Setup from "./setup";
import EditDeleteSetup from "./editdeletesetup";
import ViewUser from "./viewuser";
import ActivateOrDeactivateUsers from "./activateOrDeactivateUsers";
import ActivateOrDeactivateExams from "./activateOrDeactivateExams";
import GiveAccess from "./giveaccess";
import Packages from "./packages";
import DatabaseTables from "./DatabaseTables";

import "./superadmin-dashboard.css";

const adminOptions = [
  {
    id: "setup",
    label: "Setup",
    eyebrow: "Academic structure",
    description: "Create categories, courses, subjects, and chapters.",
    icon: "settings",
  },
  {
    id: "edit-delete-setup",
    label: "Edit Setup",
    eyebrow: "Data maintenance",
    description: "Update or remove old academic setup data.",
    icon: "edit_note",
  },
  {
    id: "view",
    label: "View Users",
    eyebrow: "Role directory",
    description: "Search, filter, export, and edit portal users.",
    icon: "groups",
  },
  {
    id: "activate",
    label: "Activate Users",
    eyebrow: "Account control",
    description: "Enable, disable, and protect user access.",
    icon: "toggle_on",
  },
  {
    id: "exam-report",
    label: "Exam Reports",
    eyebrow: "Exam activation",
    description: "Review exam status and control availability.",
    icon: "assignment",
  },
  {
    id: "packages",
    label: "Packages",
    eyebrow: "Paid bundles",
    description: "Create packages and connect exams to plans.",
    icon: "inventory_2",
  },
  {
    id: "user-approvals",
    label: "Approvals",
    eyebrow: "Access requests",
    description: "Grant requested access to courses and exams.",
    icon: "verified_user",
  },
  {
    id: "database",
    label: "DB Tables",
    eyebrow: "Full schema",
    description: "Search, inspect, export, and maintain every live database table.",
    icon: "storage",
  },
];

const overviewOption = {
  id: "overview",
  label: "Overview",
  eyebrow: "Control center",
  description: "Choose a super admin workspace to begin.",
  icon: "dashboard_customize",
};

const adminStats = [
  { label: "Menus", value: "8", detail: "Setup, users, reports, DB tables", icon: "widgets" },
  { label: "Roles", value: "4", detail: "Student, teacher, admin, super admin", icon: "badge" },
  { label: "Access", value: "Secure", detail: "Activation and approvals ready", icon: "lock" },
  { label: "Commerce", value: "Plans", detail: "Package controls connected", icon: "payments" },
];

const getStoredUserName = () => {
  try {
    const user = JSON.parse(localStorage.getItem("user") || "null");
    return user?.name || "Super Admin";
  } catch (error) {
    return "Super Admin";
  }
};

function SuperAdminPanel() {
  const navigate = useNavigate();
  const location = useLocation();
  const [controller, dispatch] = useArgonController();
  const { miniSidenav } = controller;
  const [adminOption, setAdminOption] = useState("overview");
  const userName = getStoredUserName();
  const firstName = userName.split(" ")[0] || "Super";

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
      navigate("/super-admin-panel");
      return;
    }
    navigate(`/super-admin-panel?view=${optionId}`);
  };

  const renderAdminContent = () => {
    switch (adminOption) {
      case "setup":
        return <Setup />;
      case "edit-delete-setup":
        return <EditDeleteSetup />;
      case "view":
        return <ViewUser />;
      case "activate":
        return <ActivateOrDeactivateUsers />;
      case "exam-report":
        return <ActivateOrDeactivateExams />;
      case "user-approvals":
        return <GiveAccess />;
      case "packages":
        return <Packages />;
      case "database":
        return <DatabaseTables />;
      case "overview":
      default:
        return (
          <div className="superadmin-overview-grid">
            {adminOptions.map((option) => (
              <button
                type="button"
                className="superadmin-overview-card"
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
      <div className="superadmin-page">
        <header className="superadmin-topbar">
          <div className="superadmin-title">
            <button
              type="button"
              className="superadmin-icon-button"
              aria-label="Toggle sidebar"
              onClick={() => setMiniSidenav(dispatch, !miniSidenav)}
            >
              <span className="material-icons-round">menu</span>
            </button>
            <div>
              <span>ExamPulse super admin</span>
              <h1>Platform control center</h1>
            </div>
          </div>
          <div className="superadmin-tools">
            <label className="superadmin-search" htmlFor="superadmin-search">
              <span className="material-icons-round">search</span>
              <input id="superadmin-search" type="search" placeholder="Search setup, users, reports, packages" />
            </label>
            <button type="button" className="superadmin-profile-chip" onClick={() => handleOptionClick("overview")}>
              <span>{firstName.charAt(0).toUpperCase()}</span>
              <strong>{firstName}</strong>
            </button>
          </div>
        </header>

        <section className="superadmin-hero">
          <div className="superadmin-hero-grid" aria-hidden="true" />
          <div className="superadmin-hero-copy">
            <span className="superadmin-pill">
              <span className="material-icons-round">admin_panel_settings</span>
              Role-specific super admin workspace
            </span>
            <h2>Platform control room for every exam operation.</h2>
            <p>
              Manage setup, users, activations, exam reports, approvals, and packages through one
              connected super admin experience.
            </p>
            <div className="superadmin-hero-actions">
              <button type="button" onClick={() => handleOptionClick("setup")}>
                Start With Setup
                <span className="material-icons-round">arrow_forward</span>
              </button>
              <button type="button" onClick={() => handleOptionClick("view")}>
                View Users
              </button>
            </div>
          </div>
          <div className="superadmin-hero-visual" aria-label="Animated admin dashboard illustration">
            <div className="superadmin-orbit-card one">
              <span>Roles</span>
              <strong>4</strong>
            </div>
            <div className="superadmin-orbit-card two">
              <span>Menus</span>
              <strong>8</strong>
            </div>
            <div className="superadmin-console">
              <div className="superadmin-console-top">
                <span />
                <span />
                <span />
              </div>
              <div className="superadmin-console-body">
                <i />
                <i />
                <b />
                <b />
                <b />
              </div>
            </div>
          </div>
        </section>

        <section className="superadmin-stat-grid" aria-label="Super admin highlights">
          {adminStats.map((stat) => (
            <div className="superadmin-stat-card" key={stat.label}>
              <span className="material-icons-round">{stat.icon}</span>
              <div>
                <small>{stat.label}</small>
                <strong>{stat.value}</strong>
                <em>{stat.detail}</em>
              </div>
            </div>
          ))}
        </section>

        <section className="superadmin-menu-strip" aria-label="Super admin menu shortcuts">
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

        <section className="superadmin-workspace">
          <div className="superadmin-workspace-head">
            <span className="material-icons-round">{selectedOption.icon}</span>
            <div>
              <small>{selectedOption.eyebrow}</small>
              <h3>{selectedOption.label}</h3>
              <p>{selectedOption.description}</p>
            </div>
          </div>
          <div className="superadmin-tool-body">{renderAdminContent()}</div>
        </section>
      </div>
    </DashboardLayout>
  );
}

export default SuperAdminPanel;
