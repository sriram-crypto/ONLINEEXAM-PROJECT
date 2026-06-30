import React from "react";

import { StudentHero } from "./StudentDashboardChrome";
import "./student-dashboard.css";

const StudentPanelHeader = () => (
  <StudentHero
    kicker="Live exam room"
    title="Enter active exams, track scheduled tests, and review completed attempts."
    description="This page keeps assigned exams organized by status, with a secure in-page runner ready for timed attempts."
    metrics={[
      { value: "Live", label: "Exam room" },
      { value: "Timed", label: "Attempt mode" },
      { value: "Secure", label: "Focus tools" },
    ]}
  />
);

export default StudentPanelHeader;
