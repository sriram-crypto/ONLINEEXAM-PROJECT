import React, { useEffect, useMemo, useState } from "react";
import { Box, CircularProgress } from "@mui/material";
import StyledTextField from "components/StyledTextField";
import * as XLSX from "xlsx";

const formatDateTime = (value) => {
  if (!value) return "Not set";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return String(value);
  return date.toLocaleString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
};

const getCreatedDate = (exam) =>
  exam.created_at || exam.created_date || exam.createdAt || exam.exam_date || exam.start_time;

const getStatusClass = (status) => String(status || "scheduled").toLowerCase().replace(/\s+/g, "_");

const getFileNameFromHeader = (header, fallback) => {
  const match = /filename="?([^"]+)"?/i.exec(header || "");
  return match?.[1] || fallback;
};

function GenerateQuestionPaper() {
  const [exams, setExams] = useState([]);
  const [message, setMessage] = useState("");
  const [schoolName, setSchoolName] = useState("");
  const [image, setImage] = useState(null);
  const [loading, setLoading] = useState(true);
  const [downloadingId, setDownloadingId] = useState(null);

  const fetchExams = () => {
    setLoading(true);
    fetch("/api/teacher/generatequestionpaper/exams")
      .then((res) => res.json())
      .then((data) => {
        setExams(Array.isArray(data) ? data : []);
        setLoading(false);
      })
      .catch(() => {
        setExams([]);
        setLoading(false);
      });
  };

  useEffect(() => {
    fetchExams();
  }, []);

  const stats = useMemo(() => {
    const scheduled = exams.filter((exam) => getStatusClass(exam.status) === "scheduled").length;
    const questions = exams.reduce((total, exam) => total + Number(exam.question_count || 0), 0);
    return { total: exams.length, scheduled, questions };
  }, [exams]);

  const handleGenerate = async (examId) => {
    const formData = new FormData();
    formData.append("schoolName", schoolName);
    if (image) formData.append("logo", image);

    setMessage("");
    setDownloadingId(examId);
    try {
      const res = await fetch(`/api/teacher/generatequestionpaper/generate/${examId}`, {
        method: "POST",
        body: formData,
      });
      if (!res.ok) {
        const text = await res.text();
        throw new Error(text || "Error generating question paper.");
      }

      const blob = await res.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = getFileNameFromHeader(res.headers.get("content-disposition"), `questionpaper_exam_${examId}.pdf`);
      document.body.appendChild(a);
      a.click();
      a.remove();
      window.URL.revokeObjectURL(url);
      setMessage("A4 question paper downloaded for offline exam use.");
    } catch (error) {
      setMessage(error.message || "Error generating question paper.");
    } finally {
      setDownloadingId(null);
    }
  };

  const downloadExcelReport = () => {
    if (!exams.length) return;
    const data = exams.map((exam) => ({
      "Exam ID": exam.exam_id,
      Title: exam.title,
      "Created Date": formatDateTime(getCreatedDate(exam)),
      "Exam Date": formatDateTime(exam.exam_date || exam.start_time),
      Duration: exam.duration ? `${exam.duration} min` : "",
      Status: exam.status,
      Subjects: exam.subject_names || "",
      Questions: exam.question_count || 0,
    }));
    const ws = XLSX.utils.json_to_sheet(data);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Exams");
    XLSX.writeFile(wb, "question_paper_exams_report.xlsx");
  };

  return (
    <Box className="teacher-tool teacher-tool-paper" sx={{ p: 0 }}>
      <section className="teacher-tool-hero">
        <div>
          <span className="teacher-tool-kicker">
            <span className="material-icons-round">post_add</span>
            Offline question papers
          </span>
          <h2>Download A4 question papers for every exam.</h2>
          <p>
            Every exam is listed with its created date, schedule, question count, and a direct PDF
            download button for conducting exams offline.
          </p>
        </div>
        <div className="teacher-tool-actions">
          <button type="button" className="teacher-action-button secondary" onClick={fetchExams}>
            <span className="material-icons-round">refresh</span>
            Refresh
          </button>
          <button type="button" className="teacher-action-button success" onClick={downloadExcelReport} disabled={!exams.length}>
            <span className="material-icons-round">download</span>
            Report
          </button>
        </div>
      </section>

      <div className="teacher-tool-stat-strip">
        <article>
          <strong>{stats.total}</strong>
          <span>Total exams</span>
        </article>
        <article>
          <strong>{stats.scheduled}</strong>
          <span>Scheduled exams</span>
        </article>
        <article>
          <strong>{stats.questions}</strong>
          <span>Mapped questions</span>
        </article>
        <article>
          <strong>A4</strong>
          <span>PDF format</span>
        </article>
      </div>

      <section className="teacher-tool-filter-card">
        <div className="teacher-section-heading">
          <span className="teacher-tool-kicker">Paper header</span>
          <h2>School Details</h2>
          <p>These values appear at the top of the downloaded PDF.</p>
        </div>
        <div className="teacher-filter-grid two">
          <label>
            <span>School/College Name</span>
            <StyledTextField
              type="text"
              value={schoolName}
              onChange={(event) => setSchoolName(event.target.value)}
              placeholder="Enter school/college name"
              fullWidth
              size="small"
            />
          </label>
          <label className="teacher-file-input">
            <span>Upload Logo</span>
            <input type="file" accept="image/*" onChange={(event) => setImage(event.target.files?.[0] || null)} />
          </label>
        </div>
      </section>

      <section className="teacher-table-shell">
        <div className="teacher-table-title">
          <div>
            <span className="teacher-tool-kicker">All exams</span>
            <h3>Generate Question Paper</h3>
          </div>
          {message && <span className="teacher-result-count">{message}</span>}
        </div>

        {loading ? (
          <Box display="flex" justifyContent="center" alignItems="center" minHeight={140}>
            <CircularProgress />
          </Box>
        ) : exams.length ? (
          <div className="teacher-table-scroll">
            <table className="teacher-data-table">
              <thead>
                <tr>
                  <th>Exam</th>
                  <th>Created Date</th>
                  <th>Exam Date</th>
                  <th>Duration</th>
                  <th>Questions</th>
                  <th>Status</th>
                  <th>Download</th>
                </tr>
              </thead>
              <tbody>
                {exams.map((exam) => (
                  <tr key={exam.exam_id}>
                    <td>
                      <strong>{exam.title || `Exam #${exam.exam_id}`}</strong>
                      <small>{exam.subject_names || `Course ID ${exam.course_id || "N/A"}`}</small>
                    </td>
                    <td>{formatDateTime(getCreatedDate(exam))}</td>
                    <td>{formatDateTime(exam.exam_date || exam.start_time)}</td>
                    <td>{exam.duration ? `${exam.duration} min` : "Not set"}</td>
                    <td>{exam.question_count || 0}</td>
                    <td>
                      <span className={`teacher-status-pill ${getStatusClass(exam.status)}`}>
                        {exam.status || "scheduled"}
                      </span>
                    </td>
                    <td>
                      <button
                        type="button"
                        className="teacher-action-button warning"
                        onClick={() => handleGenerate(exam.exam_id)}
                        disabled={downloadingId === exam.exam_id}
                      >
                        <span className="material-icons-round">picture_as_pdf</span>
                        {downloadingId === exam.exam_id ? "Preparing" : "Generate PDF"}
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="teacher-empty-state">No exams found.</div>
        )}
      </section>
    </Box>
  );
}

export default GenerateQuestionPaper;
