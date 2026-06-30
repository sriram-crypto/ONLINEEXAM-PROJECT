import React, { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import "./HomePage.css";

const BrandLogo = ({ compact = false }) => (
  <span className="hp-brand" aria-label="ExamPulse">
    <span className="hp-brand-mark" aria-hidden="true">
      <svg viewBox="0 0 48 48" role="img">
        <path className="hp-logo-shield" d="M24 4 40 10v12c0 10.5-6.5 18-16 22C14.5 40 8 32.5 8 22V10L24 4Z" />
        <path className="hp-logo-pulse" d="M14 25h6l3-8 5 16 4-8h5" />
        <path className="hp-logo-check" d="m17 18 5 5 10-11" />
      </svg>
    </span>
    {!compact && (
      <span className="hp-brand-copy">
        <strong>ExamPulse</strong>
        <small>Student Online Exam Portal</small>
      </span>
    )}
  </span>
);

const Icon = ({ name }) => {
  const icons = {
    timer: (
      <>
        <circle cx="12" cy="13" r="8" />
        <path d="M12 9v5l3 2M9 2h6" />
      </>
    ),
    shield: (
      <>
        <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10Z" />
        <path d="m9 12 2 2 4-5" />
      </>
    ),
    chart: (
      <>
        <path d="M3 3v18h18" />
        <path d="m7 15 4-4 3 3 5-7" />
      </>
    ),
    book: (
      <>
        <path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20" />
        <path d="M4 5.5A2.5 2.5 0 0 1 6.5 3H20v18H6.5A2.5 2.5 0 0 1 4 18.5v-13Z" />
        <path d="M8 7h8M8 11h6" />
      </>
    ),
    target: (
      <>
        <circle cx="12" cy="12" r="9" />
        <circle cx="12" cy="12" r="5" />
        <circle cx="12" cy="12" r="1" />
      </>
    ),
    user: (
      <>
        <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
        <circle cx="12" cy="7" r="4" />
      </>
    ),
    teacher: (
      <>
        <path d="M22 10 12 5 2 10l10 5 10-5Z" />
        <path d="M6 12v5c3 2 9 2 12 0v-5" />
      </>
    ),
    upload: (
      <>
        <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
        <path d="m17 8-5-5-5 5M12 3v12" />
      </>
    ),
    lock: (
      <>
        <rect x="4" y="11" width="16" height="10" rx="2" />
        <path d="M8 11V7a4 4 0 0 1 8 0v4" />
      </>
    ),
    arrow: (
      <>
        <path d="M5 12h14" />
        <path d="m13 6 6 6-6 6" />
      </>
    ),
  };

  return (
    <svg className="hp-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      {icons[name]}
    </svg>
  );
};

const HomePage = () => {
  const navigate = useNavigate();
  const [stats, setStats] = useState({
    questions: 0,
    attempts: 0,
    students: 0,
    accuracy: 0,
  });
  const [authMode, setAuthMode] = useState("login");
  const [loginForm, setLoginForm] = useState(() => ({
    email: localStorage.getItem("rememberedEmail") || "",
    password: "",
    remember: localStorage.getItem("rememberMe") === "true",
  }));
  const [registerForm, setRegisterForm] = useState({
    name: "",
    email: "",
    password: "",
    role: "student",
  });
  const [authLoading, setAuthLoading] = useState(false);
  const [authMessage, setAuthMessage] = useState({ type: "", text: "" });

  useEffect(() => {
    const targets = { questions: 10000, attempts: 50000, students: 12000, accuracy: 98 };
    const duration = 1600;
    const start = performance.now();
    let frameId;

    const tick = (time) => {
      const progress = Math.min((time - start) / duration, 1);
      const eased = 1 - Math.pow(1 - progress, 3);
      setStats({
        questions: Math.round(targets.questions * eased),
        attempts: Math.round(targets.attempts * eased),
        students: Math.round(targets.students * eased),
        accuracy: Math.round(targets.accuracy * eased),
      });
      if (progress < 1) frameId = requestAnimationFrame(tick);
    };

    frameId = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frameId);
  }, []);

  const focusAuthPanel = (mode) => {
    setAuthMode(mode);
    setAuthMessage({ type: "", text: "" });
    window.requestAnimationFrame(() => {
      document.getElementById("auth-panel")?.scrollIntoView({
        behavior: "smooth",
        block: "center",
      });
    });
  };

  const handleLoginChange = (event) => {
    const { name, value, checked, type } = event.target;
    setLoginForm((current) => ({
      ...current,
      [name]: type === "checkbox" ? checked : value,
    }));
  };

  const handleRegisterChange = (event) => {
    const { name, value } = event.target;
    setRegisterForm((current) => ({
      ...current,
      [name]: value,
    }));
  };

  const handleLoginSubmit = async (event) => {
    event.preventDefault();
    if (authLoading) return;

    setAuthLoading(true);
    setAuthMessage({ type: "", text: "" });

    try {
      const response = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json; charset=utf-8" },
        body: JSON.stringify({
          email: loginForm.email.trim(),
          password: loginForm.password,
        }),
      });
      const data = await response.json();

      if (response.ok && data.token) {
        localStorage.setItem("token", data.token);
        localStorage.setItem("user", JSON.stringify(data.user || {}));

        if (loginForm.remember) {
          localStorage.setItem("rememberedEmail", loginForm.email.trim());
          localStorage.setItem("rememberMe", "true");
        } else {
          localStorage.removeItem("rememberedEmail");
          localStorage.removeItem("rememberMe");
        }

        navigate("/dashboard", { replace: true });
        return;
      }

      setAuthMessage({
        type: "error",
        text: data.error || data.message || "Invalid email or password.",
      });
    } catch (error) {
      setAuthMessage({
        type: "error",
        text: "Unable to connect to the server. Please try again.",
      });
    } finally {
      setAuthLoading(false);
    }
  };

  const handleRegisterSubmit = async (event) => {
    event.preventDefault();
    if (authLoading) return;

    const payload = {
      name: registerForm.name.trim(),
      email: registerForm.email.trim(),
      password: registerForm.password,
      role: registerForm.role,
    };

    if (!payload.name || !payload.email || !payload.password) {
      setAuthMessage({ type: "error", text: "Please fill in all required fields." });
      return;
    }

    setAuthLoading(true);
    setAuthMessage({ type: "", text: "" });

    try {
      const response = await fetch("/api/auth/signup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      let data = null;
      try {
        data = await response.json();
      } catch (jsonError) {
        data = null;
      }

      if (!response.ok) {
        setAuthMessage({
          type: "error",
          text: (data && (data.message || data.error)) || "Failed to create account.",
        });
        return;
      }

      setAuthMode("login");
      setLoginForm((current) => ({
        ...current,
        email: payload.email,
        password: "",
      }));
      setRegisterForm({
        name: "",
        email: "",
        password: "",
        role: "student",
      });
      setAuthMessage({
        type: "success",
        text: "Account created. Sign in with your new credentials.",
      });
    } catch (error) {
      setAuthMessage({
        type: "error",
        text: "Unable to connect to the server. Please try again.",
      });
    } finally {
      setAuthLoading(false);
    }
  };

  const workflow = [
    {
      title: "Create your profile",
      text: "Students sign in once and see assigned exams, practice choices, and progress in one place.",
      icon: "user",
    },
    {
      title: "Practice by chapter",
      text: "Build focused practice tests by course, subject, chapter, level, and question count.",
      icon: "book",
    },
    {
      title: "Attempt live exams",
      text: "Use a timed exam room with answer status, question palette, autosave cues, and auto-submit.",
      icon: "timer",
    },
    {
      title: "Review your result",
      text: "Understand correct, wrong, answered, skipped, marks, and feedback after every attempt.",
      icon: "chart",
    },
  ];

  const features = [
    {
      title: "Timed exam room",
      text: "Countdown timer, question navigation, review marking, and final submit controls for serious test attempts.",
      icon: "timer",
    },
    {
      title: "Focus protection",
      text: "Fullscreen detection, copy-paste blocking, tab-change warnings, and exam integrity controls.",
      icon: "shield",
    },
    {
      title: "Smart analytics",
      text: "Scores, accuracy, attempted count, improvement trend, and detailed answer feedback.",
      icon: "chart",
    },
    {
      title: "Question bank",
      text: "Organized practice content for MCQ, MSQ, integer, image-based, and chapter-wise preparation.",
      icon: "book",
    },
    {
      title: "Teacher uploads",
      text: "Bulk question upload, image support, generated papers, and exam scheduling for teachers.",
      icon: "upload",
    },
    {
      title: "Secure roles",
      text: "Separate student, teacher, admin, and super admin journeys with clear access boundaries.",
      icon: "lock",
    },
  ];

  const testimonials = [
    {
      quote: "The timed practice mode helped me stop guessing and start managing the exam clock properly.",
      name: "Ananya R.",
      detail: "Class 11 student",
    },
    {
      quote: "Seeing every wrong answer with the correct option made revision much faster before my next mock test.",
      name: "Rahul M.",
      detail: "Engineering aspirant",
    },
    {
      quote: "The chapter-wise practice builder is exactly what I needed for weak topics.",
      name: "Meera S.",
      detail: "Foundation batch student",
    },
  ];

  return (
    <div className="home-page-root">
      <nav className="hp-nav">
        <div className="hp-nav-inner">
          <Link to="/" className="hp-nav-brand">
            <BrandLogo />
          </Link>
          <div className="hp-nav-links">
            <a href="#practice">Practice</a>
            <a href="#exam-room">Exam Room</a>
            <a href="#analytics">Analytics</a>
            <a href="#security">Security</a>
          </div>
          <div className="hp-nav-actions">
            <button type="button" className="hp-btn hp-btn-soft" onClick={() => focusAuthPanel("login")}>Login</button>
            <button type="button" className="hp-btn hp-btn-primary" onClick={() => focusAuthPanel("register")}>Register</button>
          </div>
        </div>
      </nav>

      <main>
        <section className="hp-hero">
          <div className="hp-hero-bg" aria-hidden="true">
            <div className="hp-grid-lines"></div>
            <span className="hp-orbit hp-orbit-one"></span>
            <span className="hp-orbit hp-orbit-two"></span>
            <span className="hp-signal hp-signal-one"></span>
            <span className="hp-signal hp-signal-two"></span>
          </div>

          <div className="hp-container hp-hero-layout">
            <div className="hp-hero-copy">
              <div className="hp-kicker">
                <Icon name="target" />
                Student-first online exams
              </div>
              <h1>
                Learn sharper. Attempt faster. Improve every score with <span>ExamPulse.</span>
              </h1>
              <p>
                ExamPulse is a modern student online exam portal for practice tests, live
                exams, secure exam mode, progress tracking, and instant result analysis.
              </p>
              <div className="hp-hero-actions">
                <button type="button" className="hp-btn hp-btn-primary hp-btn-large" onClick={() => focusAuthPanel("register")}>
                  Start Practicing <Icon name="arrow" />
                </button>
                <button type="button" className="hp-btn hp-btn-glass hp-btn-large" onClick={() => focusAuthPanel("login")}>
                  Student Login
                </button>
              </div>
              <div className="hp-metrics" aria-label="Platform highlights">
                <div>
                  <strong>{stats.questions.toLocaleString()}+</strong>
                  <span>Practice questions</span>
                </div>
                <div>
                  <strong>{stats.attempts.toLocaleString()}+</strong>
                  <span>Student attempts</span>
                </div>
                <div>
                  <strong>{stats.accuracy}%</strong>
                  <span>Result accuracy</span>
                </div>
              </div>
            </div>

            <div className="hp-hero-art" aria-label="Animated online exam interface">
              <div className="hp-auth-card" id="auth-panel">
                <div className="hp-auth-tabs" role="tablist" aria-label="Account access">
                  <button
                    type="button"
                    role="tab"
                    aria-selected={authMode === "login"}
                    className={authMode === "login" ? "active" : ""}
                    onClick={() => focusAuthPanel("login")}
                  >
                    Sign In
                  </button>
                  <button
                    type="button"
                    role="tab"
                    aria-selected={authMode === "register"}
                    className={authMode === "register" ? "active" : ""}
                    onClick={() => focusAuthPanel("register")}
                  >
                    Sign Up
                  </button>
                </div>

                <div className="hp-auth-heading">
                  <span>{authMode === "login" ? "Continue learning" : "Join the portal"}</span>
                  <h2>{authMode === "login" ? "Sign in to ExamPulse" : "Create your ExamPulse account"}</h2>
                  <p>
                    {authMode === "login"
                      ? "Open your dashboard, exams, practice sets, and results from the homepage."
                      : "Register once and start using practice tests, live exams, and progress analytics."}
                  </p>
                </div>

                {authMessage.text && (
                  <div className={`hp-auth-message ${authMessage.type}`} role="status">
                    {authMessage.text}
                  </div>
                )}

                {authMode === "login" ? (
                  <form className="hp-auth-form" onSubmit={handleLoginSubmit} autoComplete="on">
                    <label htmlFor="home-login-email">
                      Email
                      <input
                        id="home-login-email"
                        name="email"
                        type="email"
                        value={loginForm.email}
                        onChange={handleLoginChange}
                        placeholder="student@example.com"
                        required
                      />
                    </label>
                    <label htmlFor="home-login-password">
                      Password
                      <input
                        id="home-login-password"
                        name="password"
                        type="password"
                        value={loginForm.password}
                        onChange={handleLoginChange}
                        placeholder="Enter your password"
                        required
                      />
                    </label>
                    <label className="hp-auth-check" htmlFor="home-remember">
                      <input
                        id="home-remember"
                        name="remember"
                        type="checkbox"
                        checked={loginForm.remember}
                        onChange={handleLoginChange}
                      />
                      Remember my email
                    </label>
                    <button type="submit" className="hp-btn hp-btn-primary hp-auth-submit" disabled={authLoading}>
                      {authLoading ? "Signing in..." : "Sign In"}
                    </button>
                  </form>
                ) : (
                  <form className="hp-auth-form" onSubmit={handleRegisterSubmit} autoComplete="on">
                    <label htmlFor="home-register-name">
                      Full Name
                      <input
                        id="home-register-name"
                        name="name"
                        type="text"
                        value={registerForm.name}
                        onChange={handleRegisterChange}
                        placeholder="Your name"
                        required
                      />
                    </label>
                    <label htmlFor="home-register-email">
                      Email
                      <input
                        id="home-register-email"
                        name="email"
                        type="email"
                        value={registerForm.email}
                        onChange={handleRegisterChange}
                        placeholder="student@example.com"
                        required
                      />
                    </label>
                    <label htmlFor="home-register-password">
                      Password
                      <input
                        id="home-register-password"
                        name="password"
                        type="password"
                        value={registerForm.password}
                        onChange={handleRegisterChange}
                        placeholder="Create a password"
                        required
                      />
                    </label>
                    <label htmlFor="home-register-role">
                      Role
                      <select
                        id="home-register-role"
                        name="role"
                        value={registerForm.role}
                        onChange={handleRegisterChange}
                      >
                        <option value="student">Student</option>
                        <option value="teacher">Teacher</option>
                        <option value="admin">Admin</option>
                        <option value="parent">Parent</option>
                      </select>
                    </label>
                    <button type="submit" className="hp-btn hp-btn-primary hp-auth-submit" disabled={authLoading}>
                      {authLoading ? "Creating account..." : "Create Account"}
                    </button>
                  </form>
                )}

                <p className="hp-auth-switch">
                  {authMode === "login" ? "New to ExamPulse?" : "Already registered?"}
                  <button type="button" onClick={() => focusAuthPanel(authMode === "login" ? "register" : "login")}>
                    {authMode === "login" ? "Create an account" : "Sign in instead"}
                  </button>
                </p>
              </div>

              <div className="hp-student-scene">
                <div className="hp-student-head"></div>
                <div className="hp-student-body"></div>
                <div className="hp-student-arm hp-arm-left"></div>
                <div className="hp-student-arm hp-arm-right"></div>
                <div className="hp-laptop">
                  <div className="hp-laptop-screen">
                    <div className="hp-screen-top">
                      <span></span>
                      <span></span>
                      <span></span>
                    </div>
                    <div className="hp-question-skeleton">
                      <i></i>
                      <i></i>
                      <b></b>
                      <b className="active"></b>
                      <b></b>
                    </div>
                  </div>
                  <div className="hp-laptop-base"></div>
                </div>
                <div className="hp-pencil"></div>
              </div>

              <div className="hp-dashboard-card hp-card-timer">
                <div className="hp-ring"><span>24:18</span></div>
                <div>
                  <strong>Live Timer</strong>
                  <p>Auto-submit ready</p>
                </div>
              </div>
              <div className="hp-dashboard-card hp-card-score">
                <strong>92%</strong>
                <p>Mock test score</p>
                <div className="hp-mini-bars"><span></span><span></span><span></span><span></span></div>
              </div>
              <div className="hp-dashboard-card hp-card-focus">
                <strong>Focus Mode</strong>
                <p>Fullscreen and tab switch checks</p>
                <div className="hp-focus-meter"><span></span></div>
              </div>
            </div>
          </div>
        </section>

        <section className="hp-section hp-section-light" id="practice">
          <div className="hp-container">
            <div className="hp-section-head">
              <div className="hp-label"><Icon name="book" /> How students move through ExamPulse</div>
              <h2>A complete path from practice to performance.</h2>
              <p>Each part of the portal is designed around what students actually do before, during, and after exams.</p>
            </div>
            <div className="hp-workflow">
              {workflow.map((item, index) => (
                <article className="hp-workflow-card" key={item.title}>
                  <span className="hp-step">{String(index + 1).padStart(2, "0")}</span>
                  <div className="hp-feature-icon"><Icon name={item.icon} /></div>
                  <h3>{item.title}</h3>
                  <p>{item.text}</p>
                </article>
              ))}
            </div>
          </div>
        </section>

        <section className="hp-section" id="exam-room">
          <div className="hp-container hp-exam-grid">
            <div className="hp-exam-preview">
              <div className="hp-exam-window">
                <div className="hp-exam-head">
                  <strong>Mathematics Live Test</strong>
                  <span>LIVE</span>
                </div>
                <div className="hp-exam-body">
                  <div className="hp-exam-question">
                    <div className="hp-question-meta">
                      <span>Question 12 of 40</span>
                      <span>+4 / -1</span>
                    </div>
                    <div className="hp-line hp-line-long"></div>
                    <div className="hp-line hp-line-short"></div>
                    <div className="hp-options">
                      <span></span>
                      <span className="selected"></span>
                      <span></span>
                      <span></span>
                    </div>
                  </div>
                  <div className="hp-question-map">
                    {["done", "done", "done", "flag", "done", "", "done", "", "current", "", "", ""].map((status, index) => (
                      <span className={status} key={index}>{index + 1}</span>
                    ))}
                  </div>
                </div>
                <div className="hp-exam-foot">
                  <button type="button">Mark Review</button>
                  <button type="button" className="submit">Submit Exam</button>
                </div>
              </div>
            </div>

            <div className="hp-section-copy">
              <div className="hp-label"><Icon name="timer" /> Animated exam room</div>
              <h2>Serious tests deserve a focused interface.</h2>
              <p>
                Students get a clean question area, timer, answer palette, review state,
                and final submission flow. The interface feels active without distracting
                from the exam.
              </p>
              <div className="hp-check-list">
                <span><Icon name="shield" /> Fullscreen and focus warnings</span>
                <span><Icon name="timer" /> Auto-submit on time expiry</span>
                <span><Icon name="lock" /> Copy-paste protection cues</span>
              </div>
            </div>
          </div>
        </section>

        <section className="hp-section hp-section-light" id="analytics">
          <div className="hp-container hp-analytics-grid">
            <div className="hp-section-copy">
              <div className="hp-label"><Icon name="chart" /> Result analytics</div>
              <h2>Turn every attempt into a study plan.</h2>
              <p>
                Result screens should do more than show marks. ExamPulse highlights
                answered, skipped, correct, wrong, total score, and feedback so students
                know what to revise next.
              </p>
              <div className="hp-stat-row">
                <div><strong>{stats.students.toLocaleString()}+</strong><span>Active learners</span></div>
                <div><strong>4x</strong><span>Faster revision</span></div>
              </div>
            </div>
            <div className="hp-analytics-board">
              <div className="hp-board-head">
                <h3>Performance Trend</h3>
                <span>+18%</span>
              </div>
              <div className="hp-score-cards">
                <div><span>Accuracy</span><strong>86%</strong></div>
                <div><span>Answered</span><strong>38</strong></div>
                <div><span>Rank</span><strong>12</strong></div>
              </div>
              <div className="hp-chart">
                <svg viewBox="0 0 520 180" preserveAspectRatio="none">
                  <path className="hp-chart-area" d="M0 138 C70 104 120 118 178 82 C236 46 286 88 344 50 C402 20 462 42 520 18 L520 180 L0 180 Z" />
                  <path className="hp-chart-line" d="M0 138 C70 104 120 118 178 82 C236 46 286 88 344 50 C402 20 462 42 520 18" />
                  <circle cx="178" cy="82" r="8" />
                  <circle cx="344" cy="50" r="8" />
                  <circle cx="520" cy="18" r="8" />
                </svg>
              </div>
            </div>
          </div>
        </section>

        <section className="hp-section hp-question-bank">
          <div className="hp-container">
            <div className="hp-section-head hp-section-head-dark">
              <div className="hp-label"><Icon name="target" /> Animated question bank</div>
              <h2>Practice content that feels alive and easy to explore.</h2>
              <p>Use visual categories for mock tests, chapter practice, timed sets, worksheets, and answer review.</p>
            </div>
            <div className="hp-bank-stage">
              {[0, 1, 2].map((row) => (
                <div className={`hp-bank-lane hp-lane-${row + 1}`} key={row}>
                  {[
                    ["Physics MCQ", "Motion and forces", "target"],
                    ["Math Practice", "Algebra foundations", "book"],
                    ["Timed Tests", "Exam simulation", "timer"],
                    ["Answer Review", "Correct feedback", "chart"],
                    ["Secure Mode", "Focused attempt", "shield"],
                    ["Worksheets", "Teacher assigned", "teacher"],
                  ].map((tile, index) => (
                    <div className="hp-bank-tile" key={`${row}-${index}`}>
                      <Icon name={tile[2]} />
                      <div>
                        <strong>{tile[0]}</strong>
                        <span>{tile[1]}</span>
                      </div>
                    </div>
                  ))}
                </div>
              ))}
            </div>
          </div>
        </section>

        <section className="hp-section hp-section-light" id="security">
          <div className="hp-container">
            <div className="hp-section-head">
              <div className="hp-label"><Icon name="shield" /> Portal features</div>
              <h2>Everything needed for an online exam portal.</h2>
              <p>ExamPulse supports student practice, live exams, teacher workflows, admin control, and secure result review.</p>
            </div>
            <div className="hp-features-grid">
              {features.map((feature) => (
                <article className="hp-feature-card" key={feature.title}>
                  <div className="hp-feature-icon"><Icon name={feature.icon} /></div>
                  <h3>{feature.title}</h3>
                  <p>{feature.text}</p>
                </article>
              ))}
            </div>
          </div>
        </section>

        <section className="hp-section hp-testimonials">
          <div className="hp-container">
            <div className="hp-section-head">
              <div className="hp-label"><Icon name="user" /> Student voices</div>
              <h2>Designed for students who want clarity.</h2>
            </div>
            <div className="hp-testimonial-grid">
              {testimonials.map((item) => (
                <article className="hp-testimonial-card" key={item.name}>
                  <p>"{item.quote}"</p>
                  <div>
                    <strong>{item.name}</strong>
                    <span>{item.detail}</span>
                  </div>
                </article>
              ))}
            </div>
          </div>
        </section>

        <section className="hp-cta">
          <div className="hp-container hp-cta-inner">
            <div>
              <BrandLogo compact />
              <h2>Ready to make exam preparation feel focused and modern?</h2>
              <p>Join ExamPulse and give students a better way to practice, attempt, and improve.</p>
            </div>
            <div className="hp-cta-actions">
              <button type="button" className="hp-btn hp-btn-primary hp-btn-large" onClick={() => focusAuthPanel("register")}>
                Create Account <Icon name="arrow" />
              </button>
              <Link to="/dashboard" className="hp-btn hp-btn-glass hp-btn-large">Open Dashboard</Link>
            </div>
          </div>
        </section>
      </main>

      <footer className="hp-footer">
        <div className="hp-container hp-footer-inner">
          <div>
            <BrandLogo />
            <p>ExamPulse helps students prepare for online exams with practice tests, secure exam mode, and meaningful analytics.</p>
          </div>
          <div className="hp-footer-links">
            <a href="#practice">Practice</a>
            <a href="#exam-room">Exam Room</a>
            <a href="#analytics">Analytics</a>
            <button type="button" onClick={() => focusAuthPanel("login")}>Login</button>
          </div>
        </div>
        <div className="hp-footer-bottom">2026 ExamPulse. All rights reserved.</div>
      </footer>
    </div>
  );
};

export default HomePage;
