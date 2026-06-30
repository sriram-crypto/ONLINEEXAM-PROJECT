import React, { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";

import DashboardLayout from "examples/LayoutContainers/DashboardLayout";
import { useArgonController, setMiniSidenav } from "context";

import "./dashboard.css";

const defaultStudentTrend = [
  { label: "Mon", score: 58 },
  { label: "Tue", score: 72 },
  { label: "Wed", score: 64 },
  { label: "Thu", score: 86 },
  { label: "Fri", score: 78 },
  { label: "Sat", score: 92 },
];

const adminTrend = [
  { label: "Setup", score: 72 },
  { label: "Users", score: 88 },
  { label: "Exams", score: 76 },
  { label: "Access", score: 94 },
  { label: "Reports", score: 82 },
  { label: "Plans", score: 90 },
];

const teacherTrend = [
  { label: "Mon", score: 64 },
  { label: "Tue", score: 78 },
  { label: "Wed", score: 82 },
  { label: "Thu", score: 70 },
  { label: "Fri", score: 88 },
  { label: "Sat", score: 92 },
];

const readStoredUser = () => {
  try {
    return JSON.parse(localStorage.getItem("user") || "null");
  } catch (error) {
    return null;
  }
};

const getRoleRoute = (role) => {
  switch ((role || "").toLowerCase()) {
    case "admin":
      return "/admin-panel";
    case "teacher":
      return "/teacher-panel";
    case "parent":
      return "/parent-panel";
    case "superadmin":
      return "/super-admin-panel";
    case "student":
    default:
      return "/student-panel";
  }
};

const getRoleLabel = (role) => {
  if (role === "superadmin") return "Super Admin";
  return role ? role.charAt(0).toUpperCase() + role.slice(1) : "Student";
};

const makeTile = (title, detail, icon, path) => ({ title, detail, icon, path });

const getDashboardConfig = ({ role, firstName, examsTaken, averageScore, bestScore, trend }) => {
  const roleLabel = getRoleLabel(role);

  const studentConfig = {
    modeClass: "student-mode",
    overline: "ExamPulse dashboard",
    title: "Student exam command center",
    searchPlaceholder: "Search exams, courses, results",
    profilePath: "/student/profile",
    heroPill: "Live preparation workspace",
    heroPillIcon: "bolt",
    heroTitle: `Welcome back, ${firstName}. Your next score starts here.`,
    heroDescription:
      "Practice smarter, enter live exams faster, and turn every result into a clear revision plan from one focused dashboard.",
    primaryAction: { label: "Start Practice", path: "/student/mypractice" },
    secondaryAction: { label: "View Exams", path: "/student/myexam" },
    metrics: [
      { value: String(examsTaken || 12), label: "Exam attempts" },
      { value: `${averageScore || 86}%`, label: "Average score" },
      { value: `${bestScore || 94}%`, label: "Best result" },
    ],
    visual: {
      aria: "Animated student online exam illustration",
      cardOneValue: "Q12",
      cardOneLabel: "Marked",
      cardTwoValue: "24:18",
      cardTwoLabel: "Timer",
    },
    stats: [
      {
        label: "Role Dashboard",
        value: "Student",
        detail: "Open your student panel",
        icon: "dashboard_customize",
        tone: "blue",
        path: "/student-panel",
      },
      {
        label: "Practice Tests",
        value: "50+",
        detail: "Chapter and subject sets",
        icon: "quiz",
        tone: "teal",
        path: "/student/mypractice",
      },
      {
        label: "Exams Taken",
        value: String(examsTaken),
        detail: examsTaken ? "Synced from your results" : "Start your first exam",
        icon: "assignment_turned_in",
        tone: "green",
        path: "/student/myresults",
      },
      {
        label: "Average Score",
        value: `${averageScore}%`,
        detail: bestScore ? `Best score ${bestScore}%` : "Build your score trend",
        icon: "trending_up",
        tone: "amber",
        path: "/student/myresults",
      },
    ],
    chart: {
      overline: "Performance trend",
      title: "Recent score movement",
      button: "Open Results",
      path: "/student/myresults",
      aria: "Animated score trend chart",
      trend,
    },
    focus: {
      overline: "Focus meter",
      title: "Exam readiness",
      score: averageScore || 86,
      items: [
        { label: "Fullscreen checks ready", color: "green" },
        { label: "Timer auto-submit active", color: "amber" },
        { label: "Results synced after exam", color: "blue" },
      ],
    },
    actions: [
      { label: "Start Practice", detail: "Build a chapter-wise test", icon: "play_circle", path: "/student/mypractice" },
      { label: "My Exams", detail: "Attempt assigned exams", icon: "fact_check", path: "/student/myexam" },
      { label: "Results", detail: "Review score and answers", icon: "bar_chart", path: "/student/myresults" },
      { label: "Enroll Courses", detail: "Add learning tracks", icon: "school", path: "/enroll-student" },
    ],
    lowerPrimary: {
      overline: "Upcoming exams",
      title: "Next attempts",
      button: "See All",
      path: "/student/myexam",
      items: [
        { title: "Mathematics Mock Test", meta: "40 questions", time: "Today, 6:00 PM", tone: "blue", icon: "event_note" },
        { title: "Physics Chapter Practice", meta: "Motion and laws", time: "Tomorrow", tone: "teal", icon: "event_note" },
        { title: "Full Syllabus Revision", meta: "3 hour exam", time: "Friday", tone: "amber", icon: "event_note" },
      ],
    },
    lowerSecondary: {
      overline: "Subject focus",
      title: "Preparation balance",
      rows: [
        { name: "Mathematics", value: 84, color: "blue", suffix: "ready" },
        { name: "Physics", value: 72, color: "teal", suffix: "ready" },
        { name: "Chemistry", value: 68, color: "amber", suffix: "ready" },
        { name: "Reasoning", value: 79, color: "coral", suffix: "ready" },
      ],
    },
    bank: {
      title: "Animated question bank",
      subtitle: "Practice sets moving through your preparation queue",
      aria: "Animated question bank",
      tiles: [
        makeTile("Algebra", "25 questions", "functions", "/student/mypractice"),
        makeTile("Mechanics", "18 questions", "science", "/student/mypractice"),
        makeTile("Organic", "32 questions", "biotech", "/student/mypractice"),
        makeTile("Mock Test", "Timed set", "timer", "/student/mypractice"),
        makeTile("Results", "Review answers", "analytics", "/student/myresults"),
        makeTile("Security", "Focus mode", "verified_user", "/student/myexam"),
      ],
    },
    footer: "Focused practice, live exam control, and result analytics for students.",
  };

  if (role === "superadmin") {
    return {
      modeClass: "superadmin-mode",
      overline: "ExamPulse super admin",
      title: "Platform control command center",
      searchPlaceholder: "Search users, setup, reports, packages",
      profilePath: "/super-admin-panel",
      heroPill: "Secure platform workspace",
      heroPillIcon: "admin_panel_settings",
      heroTitle: `Welcome back, ${firstName}. Manage the whole exam portal.`,
      heroDescription:
        "Control academic setup, user access, exam activation, approvals, and paid packages from one role-aware super admin dashboard.",
      primaryAction: { label: "Open Setup", path: "/super-admin-panel?view=setup" },
      secondaryAction: { label: "Review Users", path: "/super-admin-panel?view=view" },
      metrics: [
        { value: "7", label: "Control menus" },
        { value: "4", label: "Role groups" },
        { value: "24/7", label: "Access monitoring" },
      ],
      visual: {
        aria: "Animated super admin portal control illustration",
        cardOneValue: "Roles",
        cardOneLabel: "Managed",
        cardTwoValue: "Access",
        cardTwoLabel: "Guarded",
      },
      stats: [
        {
          label: "Super Admin",
          value: "Control Room",
          detail: "Open all platform menus",
          icon: "admin_panel_settings",
          tone: "blue",
          path: "/super-admin-panel",
        },
        {
          label: "Academic Setup",
          value: "Courses",
          detail: "Categories, subjects, chapters",
          icon: "schema",
          tone: "teal",
          path: "/super-admin-panel?view=setup",
        },
        {
          label: "User Access",
          value: "Approve",
          detail: "Review and activate accounts",
          icon: "manage_accounts",
          tone: "green",
          path: "/super-admin-panel?view=user-approvals",
        },
        {
          label: "Packages",
          value: "Plans",
          detail: "Manage paid exam bundles",
          icon: "inventory_2",
          tone: "amber",
          path: "/super-admin-panel?view=packages",
        },
      ],
      chart: {
        overline: "Operations trend",
        title: "Platform activity movement",
        button: "Open Reports",
        path: "/super-admin-panel?view=exam-report",
        aria: "Animated super admin activity chart",
        trend: adminTrend,
      },
      focus: {
        overline: "Control meter",
        title: "Admin readiness",
        score: 91,
        items: [
          { label: "Setup data structured", color: "green" },
          { label: "User access controls active", color: "amber" },
          { label: "Exam activation ready", color: "blue" },
        ],
      },
      actions: [
        { label: "Setup", detail: "Create categories, courses, subjects", icon: "settings", path: "/super-admin-panel?view=setup" },
        { label: "Edit Setup", detail: "Maintain academic structure", icon: "edit_note", path: "/super-admin-panel?view=edit-delete-setup" },
        { label: "View Users", detail: "Search roles and statuses", icon: "groups", path: "/super-admin-panel?view=view" },
        { label: "Activate Users", detail: "Enable or block portal access", icon: "toggle_on", path: "/super-admin-panel?view=activate" },
        { label: "Exam Reports", detail: "Control exam visibility", icon: "assignment", path: "/super-admin-panel?view=exam-report" },
        { label: "Packages", detail: "Build exam bundles", icon: "inventory_2", path: "/super-admin-panel?view=packages" },
        { label: "Approvals", detail: "Grant requested access", icon: "verified_user", path: "/super-admin-panel?view=user-approvals" },
      ],
      lowerPrimary: {
        overline: "Operations queue",
        title: "Next controls",
        button: "Panel",
        path: "/super-admin-panel",
        items: [
          { title: "Review user approvals", meta: "Students, teachers, admins", time: "Access desk", tone: "blue", icon: "verified_user" },
          { title: "Check exam activation", meta: "Open or pause scheduled exams", time: "Reports", tone: "teal", icon: "assignment" },
          { title: "Refresh packages", meta: "Pricing and exam bundles", time: "Commerce", tone: "amber", icon: "inventory_2" },
        ],
      },
      lowerSecondary: {
        overline: "Management areas",
        title: "Platform balance",
        rows: [
          { name: "Academic setup", value: 92, color: "blue", suffix: "ready" },
          { name: "Users", value: 86, color: "teal", suffix: "organized" },
          { name: "Exam controls", value: 78, color: "amber", suffix: "synced" },
          { name: "Packages", value: 74, color: "coral", suffix: "active" },
        ],
      },
      bank: {
        title: "Animated admin control board",
        subtitle: "All super admin menus are ready from one screen",
        aria: "Animated super admin menu board",
        tiles: [
          makeTile("Setup", "Academic structure", "settings", "/super-admin-panel?view=setup"),
          makeTile("Users", "Role directory", "groups", "/super-admin-panel?view=view"),
          makeTile("Activation", "Account access", "toggle_on", "/super-admin-panel?view=activate"),
          makeTile("Reports", "Exam control", "assignment", "/super-admin-panel?view=exam-report"),
          makeTile("Packages", "Paid bundles", "inventory_2", "/super-admin-panel?view=packages"),
          makeTile("Approvals", "Grant requests", "verified_user", "/super-admin-panel?view=user-approvals"),
          makeTile("Edit Setup", "Clean old data", "edit_note", "/super-admin-panel?view=edit-delete-setup"),
        ],
      },
      footer: "Role-aware control for setup, users, exams, approvals, and packages.",
    };
  }

  if (role === "teacher") {
    return {
      ...studentConfig,
      modeClass: "teacher-mode",
      overline: "ExamPulse teacher",
      title: "Teacher exam operations",
      searchPlaceholder: "Search exams, students, results",
      profilePath: "/teacher-panel",
      heroPill: "Teaching workspace",
      heroPillIcon: "school",
      heroTitle: `Welcome back, ${firstName}. Guide every exam attempt.`,
      heroDescription:
        "Review students, monitor exam activity, and keep learning progress moving through your teacher panel.",
      primaryAction: { label: "Manage Exams", path: "/teacher-panel?view=manage" },
      secondaryAction: { label: "View Reports", path: "/teacher-panel?view=submissions" },
      metrics: [
        { value: "12", label: "Assigned batches" },
        { value: "86%", label: "Class readiness" },
        { value: "32", label: "Pending reviews" },
      ],
      visual: {
        aria: "Animated teacher exam workspace illustration",
        cardOneValue: "Papers",
        cardOneLabel: "Ready",
        cardTwoValue: "Reports",
        cardTwoLabel: "Live",
      },
      stats: [
        {
          label: "Teacher Panel",
          value: roleLabel,
          detail: "Open teaching controls",
          icon: "school",
          tone: "blue",
          path: "/teacher-panel",
        },
        {
          label: "Exam Sets",
          value: "Live",
          detail: "Manage assigned exams",
          icon: "assignment",
          tone: "teal",
          path: "/teacher-panel?view=manage",
        },
        {
          label: "Worksheets",
          value: "Practice",
          detail: "Create learning material",
          icon: "description",
          tone: "green",
          path: "/teacher-panel?view=worksheets",
        },
        {
          label: "Submissions",
          value: "Reports",
          detail: "Review student attempts",
          icon: "bar_chart",
          tone: "amber",
          path: "/teacher-panel?view=submissions",
        },
      ],
      chart: {
        overline: "Class trend",
        title: "Learning movement",
        button: "Open Panel",
        path: "/teacher-panel?view=manage",
        aria: "Animated teacher class trend chart",
        trend: teacherTrend,
      },
      actions: [
        { label: "Manage Exams", detail: "Create and assign tests", icon: "assignment", path: "/teacher-panel?view=manage" },
        { label: "Add Questions", detail: "Build the question bank", icon: "add_circle", path: "/teacher-panel?view=add-question" },
        { label: "Worksheets", detail: "Create practice material", icon: "description", path: "/teacher-panel?view=worksheets" },
        { label: "Question Paper", detail: "Generate exam papers", icon: "post_add", path: "/teacher-panel?view=question-paper" },
        { label: "Submissions", detail: "Review class performance", icon: "bar_chart", path: "/teacher-panel?view=submissions" },
      ],
      lowerPrimary: {
        overline: "Teaching queue",
        title: "Next teacher actions",
        button: "Open",
        path: "/teacher-panel?view=manage",
        items: [
          { title: "Review exam setup", meta: "Question rules and timing", time: "Manage", tone: "blue", icon: "assignment" },
          { title: "Build worksheet set", meta: "Practice material for class", time: "Worksheets", tone: "teal", icon: "description" },
          { title: "Check submissions", meta: "Attempt reports and scores", time: "Reports", tone: "amber", icon: "bar_chart" },
        ],
      },
      lowerSecondary: {
        overline: "Teaching focus",
        title: "Class preparation balance",
        rows: [
          { name: "Exam setup", value: 88, color: "blue", suffix: "ready" },
          { name: "Question bank", value: 82, color: "teal", suffix: "built" },
          { name: "Worksheets", value: 76, color: "amber", suffix: "active" },
          { name: "Reports", value: 84, color: "coral", suffix: "synced" },
        ],
      },
      bank: {
        title: "Animated teacher tool board",
        subtitle: "Teaching tools moving through your exam workflow",
        aria: "Animated teacher tool board",
        tiles: [
          makeTile("Manage Exams", "Exam control", "assignment", "/teacher-panel?view=manage"),
          makeTile("Add Questions", "Question bank", "add_circle", "/teacher-panel?view=add-question"),
          makeTile("Worksheets", "Practice sets", "description", "/teacher-panel?view=worksheets"),
          makeTile("Paper Builder", "Generate papers", "post_add", "/teacher-panel?view=question-paper"),
          makeTile("Submissions", "Class reports", "bar_chart", "/teacher-panel?view=submissions"),
        ],
      },
      footer: "Teaching controls, exam review, and class progress in one focused dashboard.",
    };
  }

  if (role === "admin") {
    return {
      ...studentConfig,
      modeClass: "admin-mode",
      overline: "ExamPulse admin",
      title: "Admin operations dashboard",
      searchPlaceholder: "Search users, courses, operations",
      profilePath: "/admin-panel",
      heroPill: "Institute operations",
      heroPillIcon: "manage_accounts",
      heroTitle: `Welcome back, ${firstName}. Keep the exam portal organized.`,
      heroDescription:
        "Manage question content, school user uploads, user records, and institute exam activity from your admin panel.",
      primaryAction: { label: "Add Question", path: "/admin-panel?view=add-question" },
      secondaryAction: { label: "Manage Exams", path: "/admin-panel?view=exams" },
      metrics: [
        { value: "18", label: "Active courses" },
        { value: "64", label: "Student records" },
        { value: "9", label: "Open tasks" },
      ],
      visual: {
        aria: "Animated admin operations workspace illustration",
        cardOneValue: "Users",
        cardOneLabel: "Bulk",
        cardTwoValue: "Exams",
        cardTwoLabel: "Live",
      },
      stats: [
        {
          label: "Admin Panel",
          value: roleLabel,
          detail: "Open institute controls",
          icon: "manage_accounts",
          tone: "blue",
          path: "/admin-panel",
        },
        {
          label: "Questions",
          value: "Create",
          detail: "Build exam content",
          icon: "add_circle",
          tone: "teal",
          path: "/admin-panel?view=add-question",
        },
        {
          label: "Bulk Users",
          value: "Upload",
          detail: "Import school records",
          icon: "upload_file",
          tone: "green",
          path: "/admin-panel?view=bulk-users",
        },
        {
          label: "Manage Exams",
          value: "Control",
          detail: "Create and monitor exams",
          icon: "assignment",
          tone: "amber",
          path: "/admin-panel?view=exams",
        },
      ],
      chart: {
        overline: "Operations trend",
        title: "Institute activity",
        button: "Open Panel",
        path: "/admin-panel?view=exams",
        aria: "Animated admin activity chart",
        trend: adminTrend,
      },
      actions: [
        { label: "Add Question", detail: "Create exam content", icon: "add_circle", path: "/admin-panel?view=add-question" },
        { label: "Bulk Users", detail: "Upload school users", icon: "upload_file", path: "/admin-panel?view=bulk-users" },
        { label: "View Users", detail: "Review portal records", icon: "groups", path: "/admin-panel?view=users" },
        { label: "Manage Exams", detail: "Control exam workflows", icon: "assignment", path: "/admin-panel?view=exams" },
      ],
      lowerPrimary: {
        overline: "Admin queue",
        title: "Next admin actions",
        button: "Open",
        path: "/admin-panel?view=exams",
        items: [
          { title: "Add new questions", meta: "Build exam-ready content", time: "Question bank", tone: "blue", icon: "add_circle" },
          { title: "Upload school users", meta: "Bulk import records", time: "Users", tone: "teal", icon: "upload_file" },
          { title: "Review exam setup", meta: "Manage assignments and timing", time: "Exams", tone: "amber", icon: "assignment" },
        ],
      },
      lowerSecondary: {
        overline: "Admin focus",
        title: "Operations balance",
        rows: [
          { name: "Question bank", value: 88, color: "blue", suffix: "ready" },
          { name: "User records", value: 82, color: "teal", suffix: "organized" },
          { name: "Bulk uploads", value: 74, color: "amber", suffix: "active" },
          { name: "Exam workflows", value: 86, color: "coral", suffix: "synced" },
        ],
      },
      bank: {
        title: "Animated admin tool board",
        subtitle: "Admin tools moving through your institute workflow",
        aria: "Animated admin tool board",
        tiles: [
          makeTile("Add Question", "Question bank", "add_circle", "/admin-panel?view=add-question"),
          makeTile("Bulk Users", "School uploads", "upload_file", "/admin-panel?view=bulk-users"),
          makeTile("View Users", "User records", "groups", "/admin-panel?view=users"),
          makeTile("Manage Exams", "Exam control", "assignment", "/admin-panel?view=exams"),
        ],
      },
      footer: "Institute question banks, user records, and exam activity for administrators.",
    };
  }

  if (role === "parent") {
    return {
      ...studentConfig,
      modeClass: "parent-mode",
      overline: "ExamPulse parent",
      title: "Parent result dashboard",
      searchPlaceholder: "Search ward results, meetings, feedback",
      profilePath: "/parent-panel",
      heroPill: "Family progress workspace",
      heroPillIcon: "family_restroom",
      heroTitle: `Welcome back, ${firstName}. Follow every important result clearly.`,
      heroDescription:
        "Review linked ward scores, track exam-wise progress, and request feedback meetings from one parent panel.",
      primaryAction: { label: "Open Parent Panel", path: "/parent-panel" },
      secondaryAction: { label: "Schedule Feedback", path: "/parent-panel" },
      metrics: [
        { value: "Verified", label: "Ward access" },
        { value: "Exam-wise", label: "Result review" },
        { value: "Queued", label: "Feedback calls" },
      ],
      visual: {
        aria: "Animated parent result review workspace illustration",
        cardOneValue: "Wards",
        cardOneLabel: "Linked",
        cardTwoValue: "Calls",
        cardTwoLabel: "Ready",
      },
      stats: [
        {
          label: "Parent Panel",
          value: "Results",
          detail: "Open ward overview",
          icon: "family_restroom",
          tone: "blue",
          path: "/parent-panel",
        },
        {
          label: "Exam History",
          value: "Review",
          detail: "Cumulative and exam-wise scores",
          icon: "bar_chart",
          tone: "teal",
          path: "/parent-panel",
        },
        {
          label: "Meetings",
          value: "Request",
          detail: "Schedule feedback calls",
          icon: "event_available",
          tone: "green",
          path: "/parent-panel",
        },
        {
          label: "Notifications",
          value: "Queue",
          detail: "Email, WhatsApp, or SMS ready",
          icon: "notifications_active",
          tone: "amber",
          path: "/parent-panel",
        },
      ],
      chart: {
        overline: "Ward performance",
        title: "Recent result movement",
        button: "Open Panel",
        path: "/parent-panel",
        aria: "Animated parent result trend chart",
        trend: teacherTrend,
      },
      actions: [
        { label: "Link Ward", detail: "Request student verification", icon: "person_add", path: "/parent-panel" },
        { label: "View Results", detail: "Check exam-wise scores", icon: "bar_chart", path: "/parent-panel" },
        { label: "Feedback Call", detail: "Request academic discussion", icon: "event_available", path: "/parent-panel" },
        { label: "Notifications", detail: "Queue result updates", icon: "notifications_active", path: "/parent-panel" },
      ],
      lowerPrimary: {
        overline: "Parent queue",
        title: "Next parent actions",
        button: "Open",
        path: "/parent-panel",
        items: [
          { title: "Verify ward link", meta: "Connect to a student account", time: "Parent panel", tone: "blue", icon: "person_add" },
          { title: "Review latest result", meta: "Exam-wise score and attempts", time: "Results", tone: "teal", icon: "bar_chart" },
          { title: "Request feedback", meta: "Schedule a call", time: "Meetings", tone: "amber", icon: "event_available" },
        ],
      },
      lowerSecondary: {
        overline: "Parent focus",
        title: "Support balance",
        rows: [
          { name: "Result review", value: 88, color: "blue", suffix: "ready" },
          { name: "Ward links", value: 70, color: "teal", suffix: "verified" },
          { name: "Feedback calls", value: 62, color: "amber", suffix: "queued" },
          { name: "Notifications", value: 76, color: "coral", suffix: "ready" },
        ],
      },
      bank: {
        title: "Animated parent support board",
        subtitle: "Result review, ward access, and feedback requests in one path",
        aria: "Animated parent support board",
        tiles: [
          makeTile("Ward Link", "Verify student", "person_add", "/parent-panel"),
          makeTile("Results", "Exam-wise review", "bar_chart", "/parent-panel"),
          makeTile("Meeting", "Feedback call", "event_available", "/parent-panel"),
          makeTile("Notification", "Result update", "notifications_active", "/parent-panel"),
        ],
      },
      footer: "Parent visibility for ward results, history, and feedback coordination.",
    };
  }

  return studentConfig;
};

function Default() {
  const navigate = useNavigate();
  const [controller, dispatch] = useArgonController();
  const { miniSidenav } = controller;
  const [currentUser, setCurrentUser] = useState(() => readStoredUser());
  const [results, setResults] = useState([]);

  useEffect(() => {
    setCurrentUser(readStoredUser());
  }, []);

  const role = (currentUser?.role || "student").toLowerCase();
  const studentId = currentUser?.user_id || currentUser?.id || 0;

  useEffect(() => {
    if (role !== "student" || !studentId) {
      setResults([]);
      return;
    }

    fetch(`/api/student/myexam/results?student_id=${studentId}`)
      .then(async (response) => {
        if (!response.ok) return { results: [] };
        try {
          return await response.json();
        } catch (error) {
          return { results: [] };
        }
      })
      .then((data) => setResults(Array.isArray(data.results) ? data.results : []))
      .catch(() => setResults([]));
  }, [role, studentId]);

  const userName = currentUser?.name || getRoleLabel(role);
  const firstName = userName.split(" ")[0] || getRoleLabel(role);

  const scores = useMemo(
    () =>
      results.map((result) => {
        const value = result.final_score ?? result.score ?? 0;
        return Number.isNaN(Number(value)) ? 0 : Number(value);
      }),
    [results]
  );

  const examsTaken = results.length;
  const averageScore = scores.length
    ? Math.round(scores.reduce((total, score) => total + score, 0) / scores.length)
    : 0;
  const bestScore = scores.length ? Math.max(...scores) : 0;
  const trend = scores.length
    ? scores.slice(-6).map((score, index) => ({ label: `T${index + 1}`, score: Math.min(100, score) }))
    : defaultStudentTrend;

  const config = getDashboardConfig({ role, firstName, examsTaken, averageScore, bestScore, trend });

  const handleNavigate = (path) => {
    if (path === "/cart" && !localStorage.getItem("token")) {
      navigate("/");
      return;
    }
    navigate(path || getRoleRoute(role));
  };

  return (
    <DashboardLayout bgColor="transparent">
      <div className={`exam-dashboard-page ${config.modeClass}`}>
        <header className="exam-dashboard-topbar">
          <div className="exam-dashboard-title">
            <button
              type="button"
              className="exam-icon-button"
              aria-label="Toggle sidebar"
              onClick={() => setMiniSidenav(dispatch, !miniSidenav)}
            >
              <span className="material-icons-round">menu</span>
            </button>
            <div>
              <span className="exam-overline">{config.overline}</span>
              <h1>{config.title}</h1>
            </div>
          </div>

          <div className="exam-dashboard-tools">
            <label className="exam-search" htmlFor="dashboard-search">
              <span className="material-icons-round">search</span>
              <input id="dashboard-search" type="search" placeholder={config.searchPlaceholder} />
            </label>
            <button type="button" className="exam-icon-button" aria-label="Notifications">
              <span className="material-icons-round">notifications</span>
            </button>
            <button type="button" className="exam-profile-chip" onClick={() => handleNavigate(config.profilePath)}>
              <span>{firstName.charAt(0).toUpperCase()}</span>
              <strong>{firstName}</strong>
            </button>
          </div>
        </header>

        <section className="exam-hero-panel">
          <div className="exam-hero-grid" aria-hidden="true" />
          <div className="exam-hero-copy">
            <span className="exam-status-pill">
              <span className="material-icons-round">{config.heroPillIcon}</span>
              {config.heroPill}
            </span>
            <h2>{config.heroTitle}</h2>
            <p>{config.heroDescription}</p>
            <div className="exam-hero-actions">
              <button
                type="button"
                className="exam-primary-action"
                onClick={() => handleNavigate(config.primaryAction.path)}
              >
                {config.primaryAction.label}
                <span className="material-icons-round">arrow_forward</span>
              </button>
              <button
                type="button"
                className="exam-secondary-action"
                onClick={() => handleNavigate(config.secondaryAction.path)}
              >
                {config.secondaryAction.label}
              </button>
            </div>
            <div className="exam-hero-metrics" aria-label={`${getRoleLabel(role)} dashboard highlights`}>
              {config.metrics.map((metric) => (
                <div key={metric.label}>
                  <strong>{metric.value}</strong>
                  <span>{metric.label}</span>
                </div>
              ))}
            </div>
          </div>

          <div className="exam-hero-visual" aria-label={config.visual.aria}>
            <div className="exam-floating-card exam-floating-card-one">
              <span>{config.visual.cardOneValue}</span>
              <strong>{config.visual.cardOneLabel}</strong>
            </div>
            <div className="exam-floating-card exam-floating-card-two">
              <span>{config.visual.cardTwoValue}</span>
              <strong>{config.visual.cardTwoLabel}</strong>
            </div>
            {role !== "student" ? (
              <div className="exam-admin-art">
                <div className="exam-admin-console">
                  <div className="exam-admin-console-top">
                    <span />
                    <span />
                    <span />
                  </div>
                  <div className="exam-admin-console-body">
                    <i />
                    <i />
                    <b />
                    <b />
                    <b />
                  </div>
                </div>
                <div className="exam-admin-shield">
                  <span className="material-icons-round">admin_panel_settings</span>
                </div>
                <div className="exam-admin-rail">
                  <span />
                  <span />
                  <span />
                </div>
              </div>
            ) : (
              <div className="exam-student-art">
                <div className="exam-student-head" />
                <div className="exam-student-body" />
                <div className="exam-student-arm exam-student-arm-left" />
                <div className="exam-student-arm exam-student-arm-right" />
                <div className="exam-laptop">
                  <div className="exam-laptop-screen">
                    <div className="exam-screen-bar">
                      <span />
                      <span />
                      <span />
                    </div>
                    <div className="exam-screen-question">
                      <i />
                      <i />
                      <b />
                      <b className="selected" />
                      <b />
                    </div>
                  </div>
                  <div className="exam-laptop-base" />
                </div>
                <div className="exam-pencil" />
              </div>
            )}
          </div>
        </section>

        <section className="exam-stat-grid" aria-label="Dashboard shortcuts">
          {config.stats.map((item) => (
            <button
              type="button"
              className={`exam-stat-card ${item.tone}`}
              key={item.label}
              onClick={() => handleNavigate(item.path)}
            >
              <span className="exam-stat-icon material-icons-round">{item.icon}</span>
              <span className="exam-stat-content">
                <small>{item.label}</small>
                <strong>{item.value}</strong>
                <em>{item.detail}</em>
              </span>
            </button>
          ))}
        </section>

        <section className="exam-dashboard-grid">
          <article className="exam-panel exam-panel-large exam-performance-panel">
            <div className="exam-panel-head">
              <div>
                <span className="exam-overline">{config.chart.overline}</span>
                <h3>{config.chart.title}</h3>
              </div>
              <button type="button" onClick={() => handleNavigate(config.chart.path)}>
                {config.chart.button}
                <span className="material-icons-round">chevron_right</span>
              </button>
            </div>
            <div className="exam-line-chart" aria-label={config.chart.aria}>
              <svg viewBox="0 0 640 240" preserveAspectRatio="none">
                <path
                  className="exam-chart-fill"
                  d="M0 190 C70 130 120 156 180 102 C245 44 300 118 356 74 C420 24 482 88 536 52 C590 18 620 36 640 28 L640 240 L0 240 Z"
                />
                <path
                  className="exam-chart-line"
                  d="M0 190 C70 130 120 156 180 102 C245 44 300 118 356 74 C420 24 482 88 536 52 C590 18 620 36 640 28"
                />
              </svg>
              <div className="exam-chart-bars">
                {config.chart.trend.map((point) => (
                  <span key={point.label}>
                    <i style={{ height: `${Math.max(18, point.score)}%` }} />
                    <em>{point.label}</em>
                  </span>
                ))}
              </div>
            </div>
          </article>

          <article className="exam-panel exam-focus-panel">
            <div className="exam-panel-head compact">
              <div>
                <span className="exam-overline">{config.focus.overline}</span>
                <h3>{config.focus.title}</h3>
              </div>
            </div>
            <div className="exam-readiness-ring" style={{ "--score": `${config.focus.score}%` }}>
              <span>{config.focus.score}%</span>
            </div>
            <div className="exam-focus-list">
              {config.focus.items.map((item) => (
                <span key={item.label}>
                  <i className={item.color} /> {item.label}
                </span>
              ))}
            </div>
          </article>
        </section>

        <section className="exam-action-grid">
          {config.actions.map((action) => (
            <button
              type="button"
              className="exam-action-card"
              key={action.label}
              onClick={() => handleNavigate(action.path)}
            >
              <span className="material-icons-round">{action.icon}</span>
              <strong>{action.label}</strong>
              <small>{action.detail}</small>
            </button>
          ))}
        </section>

        <section className="exam-lower-grid">
          <article className="exam-panel">
            <div className="exam-panel-head compact">
              <div>
                <span className="exam-overline">{config.lowerPrimary.overline}</span>
                <h3>{config.lowerPrimary.title}</h3>
              </div>
              <button type="button" onClick={() => handleNavigate(config.lowerPrimary.path)}>
                {config.lowerPrimary.button}
              </button>
            </div>
            <div className="exam-upcoming-list">
              {config.lowerPrimary.items.map((item) => (
                <button
                  type="button"
                  className={`exam-upcoming-item ${item.tone}`}
                  key={item.title}
                  onClick={() => handleNavigate(config.lowerPrimary.path)}
                >
                  <span className="material-icons-round">{item.icon}</span>
                  <strong>{item.title}</strong>
                  <small>{item.meta}</small>
                  <em>{item.time}</em>
                </button>
              ))}
            </div>
          </article>

          <article className="exam-panel">
            <div className="exam-panel-head compact">
              <div>
                <span className="exam-overline">{config.lowerSecondary.overline}</span>
                <h3>{config.lowerSecondary.title}</h3>
              </div>
            </div>
            <div className="exam-subject-list">
              {config.lowerSecondary.rows.map((row) => (
                <div className="exam-subject-row" key={row.name}>
                  <div>
                    <strong>{row.name}</strong>
                    <span>
                      {row.value}% {row.suffix}
                    </span>
                  </div>
                  <div className="exam-progress-track">
                    <i className={row.color} style={{ width: `${row.value}%` }} />
                  </div>
                </div>
              ))}
            </div>
          </article>
        </section>

        <section className="exam-bank-panel" aria-label={config.bank.aria}>
          <div className="exam-bank-head">
            <span className="material-icons-round">auto_stories</span>
            <div>
              <strong>{config.bank.title}</strong>
              <small>{config.bank.subtitle}</small>
            </div>
          </div>
          <div className="exam-bank-marquee">
            {[0, 1].map((lane) => (
              <div className="exam-bank-track" key={lane}>
                {config.bank.tiles.map((tile) => (
                  <button
                    type="button"
                    className="exam-bank-tile"
                    key={`${lane}-${tile.title}`}
                    onClick={() => handleNavigate(tile.path)}
                  >
                    <span className="material-icons-round">{tile.icon}</span>
                    <strong>{tile.title}</strong>
                    <small>{tile.detail}</small>
                  </button>
                ))}
              </div>
            ))}
          </div>
        </section>

        <footer className="exam-dashboard-footer">
          <span>ExamPulse</span>
          <p>{config.footer}</p>
        </footer>
      </div>
    </DashboardLayout>
  );
}

export default Default;
