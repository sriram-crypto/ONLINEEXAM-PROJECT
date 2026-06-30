const express = require("express");
const router = express.Router();
const db = require("../../config/db");
const PDFDocument = require("pdfkit");
const multer = require("multer");
const upload = multer();

const queryAsync = (sql, params = []) =>
  new Promise((resolve, reject) => {
    db.query(sql, params, (err, results = []) => {
      if (err) reject(err);
      else resolve(results);
    });
  });

const formatDate = (value) => {
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

const cleanText = (value, fallback = "") =>
  String(value || fallback)
    .replace(/\s+/g, " ")
    .trim();

const sanitizeFilename = (value) =>
  cleanText(value, "questionpaper")
    .replace(/[^\w\s-]/g, "")
    .replace(/\s+/g, "_")
    .slice(0, 80) || "questionpaper";

const getExamDateExpression = async () => {
  const columns = await queryAsync("SHOW COLUMNS FROM exams");
  const fields = new Set(columns.map((column) => column.Field));
  if (fields.has("created_at")) return "e.created_at";
  if (fields.has("created_date")) return "e.created_date";
  return "e.exam_date";
};

router.get("/exams", async (_req, res) => {
  try {
    const createdExpr = await getExamDateExpression();
    const sql = `
      SELECT
        e.*,
        ${createdExpr} AS created_date,
        (
          SELECT COUNT(*)
          FROM exam_question_mapping eqm
          WHERE eqm.exam_id = e.exam_id
        ) AS question_count,
        (
          SELECT GROUP_CONCAT(DISTINCT s.subject_name ORDER BY s.subject_name SEPARATOR ', ')
          FROM exam_subjects es
          LEFT JOIN subjects s ON s.subject_id = es.subject_id
          WHERE es.exam_id = e.exam_id
        ) AS subject_names
      FROM exams e
      ORDER BY ${createdExpr} DESC, e.exam_id DESC
    `;
    const results = await queryAsync(sql);
    res.json(results);
  } catch (err) {
    console.error("Error fetching exams:", err);
    res.status(500).json({ error: "Database error" });
  }
});

const getExamQuestions = async (exam) => {
  const mappedSql = `
    SELECT
      qa.id,
      qa.question_text,
      qa.option1,
      qa.option2,
      qa.option3,
      qa.option4,
      qa.answer,
      qt.type_name,
      eqm.section,
      eqm.order_no,
      eqm.marks,
      eqm.negative_marks
    FROM exam_question_mapping eqm
    JOIN questions_answers qa ON qa.id = eqm.question_id
    LEFT JOIN question_types qt ON qt.question_type_id = qa.question_type_id
    WHERE eqm.exam_id = ?
    ORDER BY COALESCE(eqm.section, ''), eqm.order_no, qa.id
  `;
  const mapped = await queryAsync(mappedSql, [exam.exam_id]);
  if (mapped.length) return mapped;

  const fallbackSql = `
    SELECT qa.id, qa.question_text, qa.option1, qa.option2, qa.option3, qa.option4, qa.answer,
           qt.type_name, 1 AS marks, 0 AS negative_marks
    FROM questions_answers qa
    LEFT JOIN question_types qt ON qt.question_type_id = qa.question_type_id
    WHERE qa.course_id = ?
    ORDER BY qa.id DESC
    LIMIT 100
  `;
  return queryAsync(fallbackSql, [exam.course_id]);
};

router.post("/generate/:exam_id", upload.single("logo"), async (req, res) => {
  try {
    const examId = req.params.exam_id;
    const schoolName = cleanText(req.body.schoolName);
    const logoFile = req.file;

    const examRows = await queryAsync("SELECT * FROM exams WHERE exam_id = ?", [examId]);
    if (!examRows.length) return res.status(404).json({ error: "Exam not found" });

    const exam = examRows[0];
    const questions = await getExamQuestions(exam);
    const title = cleanText(exam.title, `Exam ${examId}`);
    const pdfSchoolName = schoolName || cleanText(exam.schoolname, "School / College");
    const filename = `${sanitizeFilename(title)}_question_paper.pdf`;

    res.setHeader("Content-Type", "application/pdf");
    res.setHeader("Content-Disposition", `attachment; filename="${filename}"`);

    const doc = new PDFDocument({
      size: "A4",
      margin: 42,
      info: {
        Title: `${title} Question Paper`,
        Subject: "Offline exam question paper",
        Creator: "ExamPulse Teacher Panel",
      },
    });

    doc.pipe(res);

    const pageWidth = doc.page.width;
    const pageHeight = doc.page.height;
    const margin = doc.page.margins.left;
    const contentWidth = pageWidth - margin * 2;
    let pageNumber = 1;

    const addFooter = () => {
      const footerY = pageHeight - 30;
      doc
        .save()
        .font("Helvetica")
        .fontSize(8)
        .fillColor("#6b7280")
        .text("Use: To conduct the exams offline", margin, footerY, { width: contentWidth / 2 })
        .text(`Page ${pageNumber}`, margin, footerY, { width: contentWidth, align: "right" })
        .restore();
    };

    const addPage = () => {
      addFooter();
      doc.addPage();
      pageNumber += 1;
    };

    const ensureSpace = (heightNeeded) => {
      if (doc.y + heightNeeded <= pageHeight - 54) return;
      addPage();
      doc.y = margin;
    };

    const drawHeader = () => {
      doc.save();
      doc.rect(0, 0, pageWidth, 92).fill("#12233e");
      doc.fillColor("#ffffff").font("Helvetica-Bold").fontSize(17);

      const logoSize = 42;
      let textX = margin;
      if (logoFile && logoFile.mimetype && logoFile.mimetype.startsWith("image/")) {
        try {
          doc.image(logoFile.buffer, margin, 24, { fit: [logoSize, logoSize] });
          textX = margin + logoSize + 14;
        } catch (error) {
          textX = margin;
        }
      }

      doc.text(pdfSchoolName, textX, 25, { width: pageWidth - textX - margin });
      doc
        .font("Helvetica")
        .fontSize(9.5)
        .fillColor("#c9d7ef")
        .text("Offline examination question paper", textX, 50, { width: pageWidth - textX - margin })
        .text("Use: To conduct the exams offline", textX, 64, { width: pageWidth - textX - margin });
      doc.restore();

      doc.y = 112;
      doc
        .fillColor("#172033")
        .font("Helvetica-Bold")
        .fontSize(18)
        .text("Question Paper", margin, doc.y, { width: contentWidth, align: "center" });
      doc.moveDown(0.35);
      doc.fontSize(14).text(title, margin, doc.y, { width: contentWidth, align: "center" });
      doc.moveDown(0.8);

      const detailY = doc.y;
      const detailWidth = (contentWidth - 18) / 3;
      const detailItems = [
        ["Date", formatDate(exam.exam_date || exam.start_time)],
        ["Duration", exam.duration ? `${exam.duration} minutes` : "Not set"],
        ["Questions", String(questions.length)],
      ];

      detailItems.forEach(([label, value], index) => {
        const x = margin + index * (detailWidth + 9);
        doc
          .roundedRect(x, detailY, detailWidth, 38, 6)
          .fillAndStroke("#f6f9fc", "#d9e2ef")
          .fillColor("#647087")
          .font("Helvetica-Bold")
          .fontSize(8)
          .text(label.toUpperCase(), x + 9, detailY + 8, { width: detailWidth - 18 })
          .fillColor("#172033")
          .fontSize(10)
          .text(value, x + 9, detailY + 20, { width: detailWidth - 18, ellipsis: true });
      });

      doc.y = detailY + 52;
      const studentBoxY = doc.y;
      doc
        .roundedRect(margin, studentBoxY, contentWidth, 48, 6)
        .strokeColor("#d9e2ef")
        .lineWidth(1)
        .stroke();
      doc
        .fillColor("#172033")
        .font("Helvetica")
        .fontSize(10)
        .text("Name: ________________________________", margin + 12, studentBoxY + 11)
        .text("Class: __________________", margin + 12, studentBoxY + 29)
        .text("Roll No: __________________", pageWidth / 2 + 12, studentBoxY + 11)
        .text("Signature: _______________", pageWidth / 2 + 12, studentBoxY + 29);
      doc.y = studentBoxY + 68;
    };

    const drawQuestion = (question, index) => {
      const options = [
        question.option1 ? `A. ${cleanText(question.option1)}` : "",
        question.option2 ? `B. ${cleanText(question.option2)}` : "",
        question.option3 ? `C. ${cleanText(question.option3)}` : "",
        question.option4 ? `D. ${cleanText(question.option4)}` : "",
      ].filter(Boolean);

      doc.font("Helvetica-Bold").fontSize(10.7);
      const questionHeight = doc.heightOfString(cleanText(question.question_text, "Question text missing"), {
        width: contentWidth - 34,
      });
      doc.font("Helvetica").fontSize(9.7);
      const optionsHeight = options.reduce(
        (total, option) => total + doc.heightOfString(option, { width: contentWidth - 46 }) + 4,
        0
      );
      ensureSpace(Math.max(42, questionHeight + optionsHeight + 24));

      const startY = doc.y;
      doc
        .font("Helvetica-Bold")
        .fontSize(10.7)
        .fillColor("#172033")
        .text(`${index + 1}.`, margin, startY, { width: 24 })
        .text(cleanText(question.question_text, "Question text missing"), margin + 28, startY, {
          width: contentWidth - 90,
        });

      const marksText = `${Number(question.marks || 1)} mark${Number(question.marks || 1) === 1 ? "" : "s"}`;
      doc
        .font("Helvetica")
        .fontSize(8.4)
        .fillColor("#647087")
        .text(marksText, pageWidth - margin - 58, startY + 2, { width: 58, align: "right" });

      doc.y = Math.max(doc.y, startY + questionHeight) + 7;
      doc.font("Helvetica").fontSize(9.7).fillColor("#334155");
      options.forEach((option) => {
        ensureSpace(doc.heightOfString(option, { width: contentWidth - 46 }) + 7);
        doc.text(option, margin + 28, doc.y, { width: contentWidth - 46 });
        doc.moveDown(0.28);
      });

      doc
        .moveTo(margin + 28, doc.y + 3)
        .lineTo(pageWidth - margin, doc.y + 3)
        .strokeColor("#e5ebf3")
        .lineWidth(0.6)
        .stroke();
      doc.y += 13;
    };

    drawHeader();

    if (!questions.length) {
      doc
        .font("Helvetica-Bold")
        .fontSize(12)
        .fillColor("#c2415b")
        .text("No questions are mapped to this exam yet.", margin, doc.y, { width: contentWidth, align: "center" });
    } else {
      questions.forEach((question, index) => drawQuestion(question, index));
    }

    addFooter();
    doc.end();
  } catch (err) {
    console.error("Question paper generation error:", err);
    if (!res.headersSent) {
      res.status(500).json({ error: "Error generating question paper" });
    } else {
      res.end();
    }
  }
});

module.exports = router;
