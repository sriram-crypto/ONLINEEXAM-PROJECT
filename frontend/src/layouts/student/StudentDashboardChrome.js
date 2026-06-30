import React, { useMemo } from "react";
import { useNavigate } from "react-router-dom";

import { useArgonController, setMiniSidenav } from "context";

const readUser = () => {
  try {
    return JSON.parse(localStorage.getItem("user") || "{}");
  } catch (error) {
    return {};
  }
};

export function StudentTopbar({ title, eyebrow = "ExamPulse student portal", search = "Search exams, courses, results" }) {
  const navigate = useNavigate();
  const [controller, dispatch] = useArgonController();
  const { miniSidenav } = controller;
  const user = useMemo(readUser, []);
  const name = user.name || user.student_name || localStorage.getItem("student_name") || "Student";
  const firstName = name.split(" ")[0] || "Student";

  return (
    <header className="student-topbar">
      <div className="student-page-title">
        <button
          type="button"
          className="student-icon-button"
          aria-label="Toggle sidebar"
          onClick={() => setMiniSidenav(dispatch, !miniSidenav)}
        >
          <span className="material-icons-round">menu</span>
        </button>
        <div>
          <span className="student-overline">{eyebrow}</span>
          <h1>{title}</h1>
        </div>
      </div>

      <div className="student-top-actions">
        <label className="student-search">
          <span className="material-icons-round">search</span>
          <input type="search" placeholder={search} />
        </label>
        <button type="button" className="student-icon-button" aria-label="Notifications">
          <span className="material-icons-round">notifications</span>
        </button>
        <button type="button" className="student-profile-chip" onClick={() => navigate("/student/profile")}>
          <span>{firstName.charAt(0).toUpperCase()}</span>
          <strong>{firstName}</strong>
        </button>
      </div>
    </header>
  );
}

export function StudentArt() {
  return (
    <>
      <div className="student-floating-card student-floating-one">
        <span>Q12</span>
        <strong>Marked</strong>
      </div>
      <div className="student-floating-card student-floating-two">
        <span>24:18</span>
        <strong>Timer</strong>
      </div>
      <div className="student-art">
        <div className="student-art-head" />
        <div className="student-art-body" />
        <div className="student-art-arm student-art-arm-left" />
        <div className="student-art-arm student-art-arm-right" />
        <div className="student-laptop">
          <div className="student-laptop-screen">
            <div className="student-screen-bar">
              <span />
              <span />
              <span />
            </div>
            <div className="student-screen-question">
              <i />
              <i />
              <b />
              <b className="selected" />
              <b />
            </div>
          </div>
          <div className="student-laptop-base" />
        </div>
        <div className="student-pencil" />
      </div>
    </>
  );
}

export function StudentHero({ kicker, title, description, primary, secondary, metrics = [] }) {
  return (
    <section className="student-hero">
      <div className="student-hero-grid" aria-hidden="true" />
      <div className="student-hero-copy">
        <span className="student-status-pill">
          <span className="material-icons-round">bolt</span>
          {kicker}
        </span>
        <h2>{title}</h2>
        <p>{description}</p>
        {(primary || secondary) && (
          <div className="student-hero-actions">
            {primary && (
              <button type="button" className="student-primary-button" onClick={primary.onClick}>
                {primary.label}
                <span className="material-icons-round">{primary.icon || "arrow_forward"}</span>
              </button>
            )}
            {secondary && (
              <button type="button" className="student-secondary-button" onClick={secondary.onClick}>
                {secondary.label}
              </button>
            )}
          </div>
        )}
        {metrics.length > 0 && (
          <div className="student-hero-metrics">
            {metrics.map((metric) => (
              <div key={metric.label}>
                <strong>{metric.value}</strong>
                <span>{metric.label}</span>
              </div>
            ))}
          </div>
        )}
      </div>
      <div className="student-hero-visual" aria-label="Animated online exam student illustration">
        <StudentArt />
      </div>
    </section>
  );
}

export function StudentStatCard({ icon, label, value, detail, tone = "blue" }) {
  return (
    <article className={`student-stat-card ${tone}`}>
      <span className="material-icons-round">{icon}</span>
      <div>
        <small>{label}</small>
        <strong>{value}</strong>
        <em>{detail}</em>
      </div>
    </article>
  );
}

export function StudentEmptyState({ icon = "inbox", title, text }) {
  return (
    <div className="student-empty-state">
      <div>
        <span className="material-icons-round">{icon}</span>
        <h3>{title}</h3>
        <p>{text}</p>
      </div>
    </div>
  );
}

export function StudentBankPanel({ onTileClick }) {
  const tiles = [
    ["Algebra", "25 questions", "functions"],
    ["Mechanics", "18 questions", "science"],
    ["Organic", "32 questions", "biotech"],
    ["Mock Test", "Timed set", "timer"],
    ["Results", "Review answers", "analytics"],
    ["Security", "Focus mode", "verified_user"],
  ];

  return (
    <section className="student-bank-panel student-section" aria-label="Animated question bank">
      <div className="student-bank-head">
        <span className="material-icons-round">auto_stories</span>
        <div>
          <strong>Animated question bank</strong>
          <small>Practice sets moving through your preparation queue</small>
        </div>
      </div>
      <div className="student-bank-marquee">
        {[0, 1].map((lane) => (
          <div className="student-bank-track" key={lane}>
            {tiles.map((tile) => (
              <button type="button" className="student-bank-tile" key={`${lane}-${tile[0]}`} onClick={onTileClick}>
                <span className="material-icons-round">{tile[2]}</span>
                <strong>{tile[0]}</strong>
                <small>{tile[1]}</small>
              </button>
            ))}
          </div>
        ))}
      </div>
    </section>
  );
}
