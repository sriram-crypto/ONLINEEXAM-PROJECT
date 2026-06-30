const pptxgen = require("pptxgenjs");
const fs = require("fs");
const path = require("path");

const OUT = "C:/onlineexam/outputs/manual-20260528-ramya/presentations/mtech-conference/output/ExamPulse-MTech-Conference-Presentation.pptx";
const ASSET = "C:/onlineexam/outputs/manual-20260528-ramya/presentations/mtech-conference/assets";

const pptx = new pptxgen();
pptx.layout = "LAYOUT_WIDE";
pptx.author = "Nimmalapudi Sri Satya Ramya";
pptx.subject = "M.Tech Project Conference Presentation";
pptx.title = "A Secure, Scalable Hybrid Examination Framework";
pptx.company = "VSM College of Engineering";
pptx.lang = "en-US";
pptx.theme = {
  headFontFace: "Aptos Display",
  bodyFontFace: "Aptos",
  lang: "en-US",
};
pptx.defineLayout({ name: "CUSTOM_WIDE", width: 13.333, height: 7.5 });
pptx.layout = "CUSTOM_WIDE";

const C = {
  ink: "0E1726",
  ink2: "152235",
  blue: "2563EB",
  cyan: "12B5CB",
  green: "16A34A",
  orange: "F97316",
  purple: "7C3AED",
  red: "DC2626",
  paper: "F8FAFC",
  line: "D8E0EA",
  muted: "64748B",
  white: "FFFFFF",
};

function addBg(slide, dark = false) {
  slide.background = { color: dark ? C.ink : C.paper };
  if (dark) {
    slide.addShape(pptx.ShapeType.rect, { x: 0, y: 0, w: 13.333, h: 7.5, fill: { color: C.ink }, line: { color: C.ink } });
    slide.addShape(pptx.ShapeType.arc, { x: 9.15, y: -1.4, w: 5.8, h: 5.8, adjustPoint: 0.15, rotate: 20, line: { color: "214161", transparency: 38, width: 1.1 } });
    slide.addShape(pptx.ShapeType.arc, { x: -1.7, y: 4.95, w: 4.1, h: 4.1, adjustPoint: 0.18, rotate: -25, line: { color: "1D3B53", transparency: 45, width: 1 } });
  } else {
    slide.addShape(pptx.ShapeType.rect, { x: 0, y: 0, w: 13.333, h: 7.5, fill: { color: C.paper }, line: { color: C.paper } });
    slide.addShape(pptx.ShapeType.rect, { x: 0, y: 0, w: 0.12, h: 7.5, fill: { color: C.blue }, line: { color: C.blue } });
  }
}

function footer(slide, n, dark = false) {
  slide.addText("ExamPulse | Hybrid Digital + Offline Assessment Framework", {
    x: 0.55, y: 7.05, w: 7.6, h: 0.18,
    fontFace: "Aptos", fontSize: 7.5, color: dark ? "B8C7D9" : C.muted, margin: 0,
  });
  slide.addText(String(n).padStart(2, "0"), {
    x: 12.42, y: 6.92, w: 0.38, h: 0.26, align: "right",
    fontFace: "Aptos", fontSize: 8.5, bold: true, color: dark ? C.white : C.ink, margin: 0,
  });
}

function title(slide, kicker, claim, n, dark = false) {
  const tc = dark ? C.white : C.ink;
  slide.addShape(pptx.ShapeType.rect, { x: 0.55, y: 0.48, w: 0.16, h: 0.16, fill: { color: C.cyan }, line: { color: C.cyan } });
  slide.addText(kicker.toUpperCase(), { x: 0.8, y: 0.43, w: 4.2, h: 0.24, fontSize: 8.5, bold: true, color: dark ? "A8DADC" : C.blue, charSpace: 1.2, margin: 0 });
  slide.addText(claim, { x: 0.55, y: 0.78, w: 8.7, h: 0.8, fontFace: "Aptos Display", fontSize: 25, bold: true, color: tc, margin: 0.02, breakLine: false, fit: "shrink" });
  footer(slide, n, dark);
}

function pill(slide, text, x, y, w, color, dark = false) {
  slide.addShape(pptx.ShapeType.roundRect, { x, y, w, h: 0.34, rectRadius: 0.06, fill: { color, transparency: dark ? 5 : 0 }, line: { color, transparency: 100 } });
  slide.addText(text, { x: x + 0.1, y: y + 0.075, w: w - 0.2, h: 0.13, align: "center", fontSize: 8.5, bold: true, color: C.white, margin: 0 });
}

function card(slide, x, y, w, h, head, body, accent, icon) {
  slide.addShape(pptx.ShapeType.roundRect, { x, y, w, h, rectRadius: 0.055, fill: { color: C.white }, line: { color: C.line, width: 1 } });
  slide.addShape(pptx.ShapeType.rect, { x, y, w: 0.07, h, fill: { color: accent }, line: { color: accent } });
  slide.addText(icon || "", { x: x + 0.22, y: y + 0.18, w: 0.34, h: 0.28, fontSize: 16, color: accent, bold: true, margin: 0 });
  slide.addText(head, { x: x + 0.62, y: y + 0.18, w: w - 0.82, h: 0.22, fontSize: 12.5, bold: true, color: C.ink, margin: 0, fit: "shrink" });
  slide.addText(body, { x: x + 0.62, y: y + 0.53, w: w - 0.82, h: h - 0.68, fontSize: 9.7, color: "334155", breakLine: false, fit: "shrink", valign: "top", margin: 0.02 });
}

function metric(slide, value, label, x, y, w, color) {
  slide.addShape(pptx.ShapeType.roundRect, { x, y, w, h: 1.0, rectRadius: 0.06, fill: { color }, line: { color, transparency: 100 } });
  slide.addText(value, { x: x + 0.18, y: y + 0.17, w: w - 0.36, h: 0.32, fontSize: 22, bold: true, color: C.white, margin: 0 });
  slide.addText(label, { x: x + 0.18, y: y + 0.58, w: w - 0.36, h: 0.24, fontSize: 8.5, color: "EAF3FF", bold: true, margin: 0, fit: "shrink" });
}

function imageFrame(slide, file, x, y, w, h) {
  slide.addShape(pptx.ShapeType.roundRect, { x: x - 0.04, y: y - 0.04, w: w + 0.08, h: h + 0.08, rectRadius: 0.04, fill: { color: C.white }, line: { color: C.line, width: 1 } });
  slide.addImage({ path: path.join(ASSET, file), x, y, w, h, sizing: { type: "contain", x, y, w, h } });
}

function bulletList(slide, items, x, y, w, h, color = C.ink, size = 13) {
  const runs = items.flatMap((t, i) => [{ text: t, options: { bullet: { type: "bullet" }, breakLine: i < items.length - 1 } }]);
  slide.addText(runs, { x, y, w, h, fontSize: size, color, fit: "shrink", margin: 0.03, breakLine: false, paraSpaceAfterPt: 7 });
}

// 1 Cover
{
  const s = pptx.addSlide(); addBg(s, true);
  s.addText("A Secure, Scalable Hybrid Examination Framework", { x: 0.65, y: 0.72, w: 8.7, h: 1.25, fontFace: "Aptos Display", fontSize: 36, bold: true, color: C.white, fit: "shrink", margin: 0 });
  s.addText("For Seamless Digital and Offline Assessments", { x: 0.68, y: 2.02, w: 7.7, h: 0.42, fontSize: 18, color: "CBE6F8", margin: 0 });
  pill(s, "M.Tech Conference Presentation", 0.68, 2.74, 2.55, C.blue, true);
  pill(s, "Computer Science and Engineering", 3.42, 2.74, 2.85, C.cyan, true);
  s.addShape(pptx.ShapeType.roundRect, { x: 8.85, y: 0.9, w: 3.65, h: 5.35, rectRadius: 0.06, fill: { color: "10243A" }, line: { color: "2C4B66" } });
  metric(s, "React", "responsive frontend", 9.15, 1.28, 1.4, C.blue);
  metric(s, "Node", "Express API layer", 10.78, 1.28, 1.4, C.cyan);
  metric(s, "MySQL", "secure persistence", 9.15, 2.58, 1.4, C.green);
  metric(s, "ML", "answer analysis", 10.78, 2.58, 1.4, C.orange);
  s.addText("Presented by", { x: 0.68, y: 5.08, w: 1.4, h: 0.2, fontSize: 9, color: "9DB1C7", bold: true, margin: 0 });
  s.addText("Nimmalapudi Sri Satya Ramya  |  243B1D5811", { x: 0.68, y: 5.36, w: 4.6, h: 0.26, fontSize: 13.5, color: C.white, bold: true, margin: 0 });
  s.addText("Guide: M. V Ramana, Ph.D.  |  VSM College of Engineering", { x: 0.68, y: 5.74, w: 5.55, h: 0.22, fontSize: 10.5, color: "C8D7E7", margin: 0 });
  footer(s, 1, true);
}

// 2 Contents
{
  const s = pptx.addSlide(); addBg(s);
  title(s, "Contents", "The presentation follows the project report index.", 2);
  const entries = [
    ["Abstract", "01"], ["Introduction", "02"], ["Literature Survey", "03"], ["System Requirement & Analysis", "04"], ["System Design", "05"],
    ["Implementations", "06"], ["Sample Code", "07"], ["Testing", "08"], ["Screenshots", "09"], ["Conclusion and Future Scope", "10"], ["References and Bibliography", "11"],
  ];
  entries.forEach((e, i) => {
    const col = i < 6 ? 0 : 1, row = i % 6;
    const x = col ? 7.0 : 0.85, y = 1.85 + row * 0.67;
    s.addShape(pptx.ShapeType.ellipse, { x, y: y + 0.02, w: 0.34, h: 0.34, fill: { color: i % 3 === 0 ? C.blue : i % 3 === 1 ? C.cyan : C.orange }, line: { color: C.paper } });
    s.addText(e[1], { x: x + 0.03, y: y + 0.1, w: 0.27, h: 0.12, fontSize: 6.4, bold: true, color: C.white, align: "center", margin: 0 });
    s.addText(e[0], { x: x + 0.52, y, w: 4.9, h: 0.36, fontSize: 15, bold: true, color: C.ink, margin: 0 });
    s.addShape(pptx.ShapeType.line, { x: x + 0.52, y: y + 0.47, w: 4.95, h: 0, line: { color: C.line, width: 0.8 } });
  });
}

// 3 Abstract
{
  const s = pptx.addSlide(); addBg(s);
  title(s, "Abstract", "ExamPulse unifies secure online exams with offline worksheet workflows.", 3);
  metric(s, "Hybrid", "online tests + downloadable worksheets", 0.8, 1.78, 2.5, C.blue);
  metric(s, "Role-based", "super admin, admin, teacher, student, parent", 3.55, 1.78, 2.5, C.cyan);
  metric(s, "Automated", "evaluation, analytics, instant result reports", 6.3, 1.78, 2.5, C.green);
  metric(s, "Scalable", "React, Express, MySQL, JWT, PDF/XLSX flows", 9.05, 1.78, 2.5, C.orange);
  card(s, 0.85, 3.35, 3.75, 1.45, "Problem", "Traditional exam processes are hard to scale, difficult to monitor, and depend heavily on physical classrooms.", C.red, "!");
  card(s, 4.8, 3.35, 3.75, 1.45, "Solution", "A web platform manages exam setup, question banks, schedules, submissions, reports, and offline preparation.", C.blue, ">");
  card(s, 8.75, 3.35, 3.75, 1.45, "Outcome", "The system reduces manual effort while keeping assessment delivery flexible, secure, and institution-ready.", C.green, "+");
}

// 4 Introduction
{
  const s = pptx.addSlide(); addBg(s);
  title(s, "Introduction", "The framework keeps assessment continuity across online and offline scenarios.", 4);
  s.addText("ExamPulse operating loop", { x: 0.85, y: 1.72, w: 3.8, h: 0.28, fontSize: 13, bold: true, color: C.ink, margin: 0 });
  const steps = [
    ["Authenticate", "JWT login and role access"],
    ["Create", "Question bank, exams, schedules"],
    ["Attempt", "Online exam or PDF worksheet"],
    ["Evaluate", "Objective + subjective scoring"],
    ["Report", "Results, analytics, exports"],
  ];
  steps.forEach((st, i) => {
    const x = 0.85 + i * 2.45;
    s.addShape(pptx.ShapeType.roundRect, { x, y: 2.25, w: 1.9, h: 1.15, rectRadius: 0.08, fill: { color: i % 2 ? "E9FBFF" : "EEF4FF" }, line: { color: i % 2 ? C.cyan : C.blue, width: 1.2 } });
    s.addText(String(i + 1), { x: x + 0.15, y: 2.43, w: 0.32, h: 0.25, fontSize: 15, bold: true, color: i % 2 ? C.cyan : C.blue, margin: 0 });
    s.addText(st[0], { x: x + 0.52, y: 2.42, w: 1.15, h: 0.22, fontSize: 11.8, bold: true, color: C.ink, margin: 0 });
    s.addText(st[1], { x: x + 0.22, y: 2.84, w: 1.48, h: 0.3, fontSize: 8.5, color: "475569", align: "center", margin: 0.02, fit: "shrink" });
    if (i < steps.length - 1) s.addShape(pptx.ShapeType.chevron, { x: x + 1.98, y: 2.62, w: 0.28, h: 0.26, fill: { color: C.line }, line: { color: C.line } });
  });
  bulletList(s, [
    "Designed for institutions that need exam delivery beyond a single classroom or device.",
    "Supports students, teachers, administrators, super administrators, and parents.",
    "Balances operational control with student-facing usability and fast result access.",
  ], 1.0, 4.28, 5.6, 1.45, C.ink, 13);
  card(s, 7.3, 4.15, 4.75, 1.55, "Core promise", "A single framework can manage setup, access, assessment, offline practice, analysis, and reporting without splitting the workflow across tools.", C.purple, "*");
}

// 5 Literature Survey
{
  const s = pptx.addSlide(); addBg(s);
  title(s, "Literature Survey", "Existing systems solve parts of exam delivery, but hybrid continuity remains the gap.", 5);
  const rows = [
    ["Traditional classroom exams", "High trust and familiarity", "Manual scheduling, paper handling, delayed results"],
    ["Generic online test portals", "Remote access and auto-evaluation", "Limited offline worksheet support and institution-specific control"],
    ["LMS quiz modules", "Integrated with course content", "Often weaker in role governance, reports, and admin approval flows"],
    ["ExamPulse direction", "Hybrid exam + worksheet + analytics workflow", "Built for institutional control and scalable modules"],
  ];
  s.addShape(pptx.ShapeType.roundRect, { x: 0.85, y: 1.75, w: 11.75, h: 4.3, rectRadius: 0.04, fill: { color: C.white }, line: { color: C.line } });
  ["Approach", "Strength", "Limitation / Gap"].forEach((h, i) => s.addText(h, { x: [1.1, 4.2, 7.55][i], y: 2.03, w: [2.6, 2.9, 4.5][i], h: 0.24, fontSize: 10.5, bold: true, color: C.blue, margin: 0 }));
  rows.forEach((r, i) => {
    const y = 2.55 + i * 0.78;
    s.addShape(pptx.ShapeType.line, { x: 1.08, y: y - 0.18, w: 10.95, h: 0, line: { color: "E2E8F0", width: 0.7 } });
    s.addText(r[0], { x: 1.1, y, w: 2.6, h: 0.38, fontSize: 10.5, bold: true, color: C.ink, margin: 0, fit: "shrink" });
    s.addText(r[1], { x: 4.2, y, w: 2.75, h: 0.38, fontSize: 9.7, color: "334155", margin: 0, fit: "shrink" });
    s.addText(r[2], { x: 7.55, y, w: 4.15, h: 0.38, fontSize: 9.7, color: "334155", margin: 0, fit: "shrink" });
  });
}

// 6 System Requirement & Analysis
{
  const s = pptx.addSlide(); addBg(s);
  title(s, "System Requirement & Analysis", "The requirements center on secure access, modular control, and exam reliability.", 6);
  card(s, 0.85, 1.72, 3.45, 1.3, "Functional requirements", "Authentication, question banks, exam scheduling, online attempts, PDF worksheets, results, reports, parent-teacher requests.", C.blue, "F");
  card(s, 4.95, 1.72, 3.45, 1.3, "Non-functional requirements", "Performance under concurrent users, browser compatibility, maintainability, scalability, data security.", C.cyan, "N");
  card(s, 9.05, 1.72, 3.45, 1.3, "Feasibility", "Uses readily available web technologies with a modular API and database-backed persistence model.", C.green, "V");
  const reqs = [
    ["Hardware", "Standard user devices, server host, stable network"],
    ["Software", "React.js, Node.js, Express.js, MySQL, JWT, PDF/XLSX tooling"],
    ["Security", "Login validation, role-based routes, protected exam/result operations"],
    ["Scale", "Module separation enables future course, user, and exam growth"],
  ];
  reqs.forEach((r, i) => {
    const x = 1.05 + (i % 2) * 5.75, y = 3.7 + Math.floor(i / 2) * 0.9;
    s.addShape(pptx.ShapeType.roundRect, { x, y, w: 4.95, h: 0.62, rectRadius: 0.04, fill: { color: C.white }, line: { color: C.line } });
    s.addText(r[0], { x: x + 0.22, y: y + 0.15, w: 1.15, h: 0.17, fontSize: 10, bold: true, color: [C.blue, C.cyan, C.orange, C.green][i], margin: 0 });
    s.addText(r[1], { x: x + 1.5, y: y + 0.13, w: 3.1, h: 0.18, fontSize: 8.9, color: "334155", margin: 0, fit: "shrink" });
  });
}

// 7 System Design
{
  const s = pptx.addSlide(); addBg(s);
  title(s, "System Design", "A three-tier design separates presentation, business logic, and persistent data.", 7);
  imageFrame(s, "system-architecture.jpg", 0.72, 1.7, 7.4, 4.25);
  card(s, 8.55, 1.85, 3.65, 0.92, "Presentation layer", "React + MUI delivers dashboards, exam pages, forms, and role-specific navigation.", C.blue, "1");
  card(s, 8.55, 3.0, 3.65, 0.92, "Application layer", "Express routes handle auth, setup, users, exams, worksheets, analytics, and ML scoring.", C.cyan, "2");
  card(s, 8.55, 4.15, 3.65, 0.92, "Data layer", "MySQL stores users, exams, questions, submissions, results, access, and reports.", C.green, "3");
}

// 8 Implementations
{
  const s = pptx.addSlide(); addBg(s);
  title(s, "Implementations", "Implementation is organized around role-specific modules and reusable backend routes.", 8);
  const lanes = [
    ["Super Admin", "setup, approvals, packages, activation, reports", C.purple],
    ["Admin / Teacher", "questions, exams, users, worksheets, question paper generation", C.blue],
    ["Student", "practice, scheduled exams, profile, submissions, results", C.cyan],
    ["Parent", "relationship details, meeting requests, review flows", C.orange],
  ];
  lanes.forEach((l, i) => {
    const y = 1.82 + i * 0.86;
    s.addShape(pptx.ShapeType.roundRect, { x: 0.95, y, w: 11.2, h: 0.62, rectRadius: 0.05, fill: { color: C.white }, line: { color: C.line } });
    s.addShape(pptx.ShapeType.roundRect, { x: 1.15, y: y + 0.12, w: 1.72, h: 0.38, rectRadius: 0.04, fill: { color: l[2] }, line: { color: l[2] } });
    s.addText(l[0], { x: 1.25, y: y + 0.215, w: 1.5, h: 0.12, align: "center", fontSize: 8.2, bold: true, color: C.white, margin: 0, fit: "shrink" });
    s.addText(l[1], { x: 3.22, y: y + 0.18, w: 7.95, h: 0.16, fontSize: 10.7, color: C.ink, margin: 0, fit: "shrink" });
  });
  card(s, 1.0, 5.55, 3.45, 0.72, "Frontend", "React 18, MUI dashboard components, Axios API integration.", C.blue, "");
  card(s, 4.95, 5.55, 3.45, 0.72, "Backend", "Express 5 routes with MySQL, JWT, multer, PDFKit, XLSX.", C.cyan, "");
  card(s, 8.9, 5.55, 3.1, 0.72, "Analytics / ML", "Similarity, coverage, length adequacy and scoring helpers.", C.green, "");
}

// 9 Sample Code
{
  const s = pptx.addSlide(); addBg(s, true);
  title(s, "Sample Code", "The backend composes focused API routes into one examination service.", 9, true);
  s.addShape(pptx.ShapeType.roundRect, { x: 0.85, y: 1.82, w: 6.1, h: 4.55, rectRadius: 0.05, fill: { color: "07111F" }, line: { color: "21324A" } });
  const code = [
    "app.use('/api/auth', require('./routes/authRoutes'));",
    "app.use('/api/student/myexam', studentMyexamRouter);",
    "app.use('/api/analytics', require('./routes/analyticsRoutes'));",
    "app.use('/api/ml', require('./routes/mlRoutes'));",
    "app.use('/api/admin/manageexams', require('./routes/admin/manageexams'));",
    "app.use('/api/teacher/generatequestionpaper',",
    "  require('./routes/teacher/generatequestionpaper'));",
  ].join("\n");
  s.addText(code, { x: 1.12, y: 2.1, w: 5.55, h: 3.7, fontFace: "Cascadia Mono", fontSize: 10.2, color: "D7E7FF", margin: 0.05, fit: "shrink", breakLine: false });
  card(s, 7.45, 1.95, 4.35, 1.05, "Route-level separation", "Each role or feature area owns its own route module, making the platform easier to extend and debug.", C.cyan, "A");
  card(s, 7.45, 3.3, 4.35, 1.05, "ML scoring service", "Subjective answer quality is estimated through text similarity, key term coverage, and length adequacy.", C.green, "B");
  card(s, 7.45, 4.65, 4.35, 1.05, "Offline support", "Teachers can generate downloadable worksheets and question papers for offline exams.", C.orange, "C");
}

// 10 Testing
{
  const s = pptx.addSlide(); addBg(s);
  title(s, "Testing", "Testing validates login, exam flow, role permissions, reporting, and worksheet generation.", 10);
  const tests = [
    ["Unit testing", "Route handlers, helpers, validation logic"],
    ["Integration testing", "Frontend requests to backend APIs and MySQL operations"],
    ["Functional testing", "Login, exam creation, question add/edit, submission, result view"],
    ["Security testing", "Unauthorized access, role checks, protected routes"],
    ["Usability testing", "Dashboard navigation, exam attempt flow, result readability"],
  ];
  tests.forEach((t, i) => {
    const x = 0.95 + (i % 3) * 3.95, y = 1.86 + Math.floor(i / 3) * 1.55;
    card(s, x, y, 3.25, 1.05, t[0], t[1], [C.blue, C.cyan, C.green, C.orange, C.purple][i], String(i + 1));
  });
  s.addShape(pptx.ShapeType.roundRect, { x: 1.0, y: 5.32, w: 11.1, h: 0.7, rectRadius: 0.05, fill: { color: "E8F6FF" }, line: { color: "BCE7F5" } });
  s.addText("Expected test outcome: stable role-based access, correct exam lifecycle, accurate result generation, and reliable downloadable offline papers.", { x: 1.35, y: 5.53, w: 10.3, h: 0.16, fontSize: 11.2, bold: true, color: C.ink, margin: 0, fit: "shrink" });
}

// 11 Screenshots
{
  const s = pptx.addSlide(); addBg(s);
  title(s, "Screenshots", "The implemented UI supports both administrative control and student-facing workflows.", 11);
  imageFrame(s, "super-admin-approvals.jpg", 0.75, 1.75, 5.75, 2.25);
  imageFrame(s, "admin-panel-overview.jpg", 6.82, 1.75, 5.75, 2.25);
  imageFrame(s, "add-question.jpg", 0.75, 4.28, 5.75, 1.82);
  imageFrame(s, "student-profile.jpg", 6.82, 4.28, 5.75, 1.82);
  s.addText("Super Admin approvals", { x: 0.85, y: 4.03, w: 3, h: 0.16, fontSize: 8.5, bold: true, color: C.muted, margin: 0 });
  s.addText("Admin panel overview", { x: 6.92, y: 4.03, w: 3, h: 0.16, fontSize: 8.5, bold: true, color: C.muted, margin: 0 });
}

// 12 Conclusion and Future Scope
{
  const s = pptx.addSlide(); addBg(s);
  title(s, "Conclusion and Future Scope", "The framework delivers a usable foundation for secure, hybrid institutional assessment.", 12);
  card(s, 0.85, 1.85, 5.4, 1.3, "Conclusion", "ExamPulse brings exam setup, access control, online attempts, offline worksheets, evaluation, and reports into a single workflow.", C.green, "✓");
  card(s, 0.85, 3.45, 5.4, 1.3, "Project value", "The platform reduces manual exam effort while improving continuity, speed of result access, and administrative visibility.", C.blue, "+");
  const future = [
    ["AI proctoring", "Face/behavior monitoring and malpractice alerts"],
    ["Adaptive tests", "Difficulty adjusted using student performance"],
    ["Mobile app", "Dedicated Android/iOS interface for students and parents"],
    ["Cloud scale", "Containerized deployment, backups, and monitoring"],
  ];
  future.forEach((f, i) => {
    const y = 1.75 + i * 0.84;
    s.addShape(pptx.ShapeType.roundRect, { x: 7.05, y, w: 4.75, h: 0.58, rectRadius: 0.04, fill: { color: C.white }, line: { color: C.line } });
    s.addText(f[0], { x: 7.28, y: y + 0.12, w: 1.55, h: 0.15, fontSize: 9.8, bold: true, color: [C.purple, C.orange, C.cyan, C.green][i], margin: 0 });
    s.addText(f[1], { x: 9.05, y: y + 0.12, w: 2.5, h: 0.15, fontSize: 8.7, color: "334155", margin: 0, fit: "shrink" });
  });
}

// 13 References
{
  const s = pptx.addSlide(); addBg(s, true);
  title(s, "References and Bibliography", "The work builds on standard web engineering, database, and assessment-management practices.", 13, true);
  bulletList(s, [
    "Project report: A Secure, Scalable Hybrid Examination Framework For Seamless Digital and Offline Assessments.",
    "React.js and Material UI documentation for the frontend dashboard implementation.",
    "Express.js, Node.js, JWT, MySQL, PDFKit, and XLSX documentation for backend services and exports.",
    "Software engineering references for requirements analysis, UML design, testing methodology, and maintainable modular architecture.",
  ], 0.95, 1.85, 8.9, 2.15, "DDEBFA", 13);
  s.addShape(pptx.ShapeType.line, { x: 0.95, y: 4.62, w: 4.2, h: 0, line: { color: C.cyan, width: 1.3 } });
  s.addText("Thank you", { x: 0.95, y: 4.95, w: 4.6, h: 0.5, fontFace: "Aptos Display", fontSize: 30, bold: true, color: C.white, margin: 0 });
  s.addText("Questions and discussion", { x: 0.98, y: 5.55, w: 3.2, h: 0.24, fontSize: 13, color: "B9D6ED", margin: 0 });
  s.addShape(pptx.ShapeType.roundRect, { x: 8.25, y: 1.62, w: 3.75, h: 3.5, rectRadius: 0.06, fill: { color: "10243A" }, line: { color: "2C4B66" } });
  ["Secure", "Scalable", "Hybrid", "Assessment-ready"].forEach((v, i) => metric(s, v, ["authentication", "modular API", "online + offline", "reports + analytics"][i], 8.55 + (i % 2) * 1.65, 1.95 + Math.floor(i / 2) * 1.28, 1.35, [C.blue, C.green, C.orange, C.cyan][i]));
}

fs.mkdirSync(path.dirname(OUT), { recursive: true });
pptx.writeFile({ fileName: OUT });
