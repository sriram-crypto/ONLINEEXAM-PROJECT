const express = require('express');
const path = require('path');
const cors = require('cors');
const app = express();
// Global request logger for debugging
app.use((req, res, next) => {
  console.log(`[${req.method}] ${req.originalUrl}`);
  next();
});

// allow cross-origin requests (images don't normally need CORS, but helpful while debugging)
app.use(cors());
app.use(express.json({ limit: '100mb' }));               // parse application/json
app.use(express.urlencoded({ extended: true, limit: '100mb' })); // parse application/x-www-form-urlencoded

// serve uploads
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));



const studentMypracticeRouter = require('./routes/student/mypractice');
app.use('/api/student/mypractice', studentMypracticeRouter);

const studentMyexamRouter = require('./routes/student/myexam');
app.use('/api/student/myexam', studentMyexamRouter);

// Practice result route
const practiceResultRouter = require('./routes/student/practiceResult');
app.use('/api/student', practiceResultRouter);

// Scheduled exam result route
const examResultRouter = require('./routes/student/examResult');
app.use('/api/student', examResultRouter);

// Student results display route (new, not in myexam)
const studentResultsRouter = require('./routes/student/results');
app.use('/api/student/results', studentResultsRouter);
// Mount your routes here 👇
app.use('/api/auth', require('./routes/authRoutes'));
app.use('/api/parent', require('./routes/parent/parentRoutes'));
app.use('/api/parent-requests', require('./routes/parent/parentRequestReviewRoutes'));
app.use('/api/analytics', require('./routes/analyticsRoutes'));
app.use('/api/ml', require('./routes/mlRoutes'));
app.use('/api/admin', require('./routes/admin/userRoutes'));
app.use('/api/admin', require('./routes/admin/addQuestion'));
app.use('/api/admin/uploadschoolusers', require('./routes/admin/uploadschoolusers'));
app.use('/api/admin', require('./routes/admin/viewusers'))
app.use('/api/superadmin', require('./routes/superadmin/setup'));
app.use('/api/superadmin', require('./routes/superadmin/editdeletesetup'));
app.use('/api/superadmin', require('./routes/superadmin/viewusers'));
app.use('/api/superadmin', require('./routes/superadmin/activateOrDeactivateUsers'));
app.use('/api/superadmin/activateOrDeactivateExams', require('./routes/superadmin/activateOrDeactivateExams'));
app.use('/api/superadmin/giveaccess', require('./routes/superadmin/giveaccess'));
app.use('/api/superadmin/packages', require('./routes/superadmin/packages'));
app.use('/api/superadmin/db-tables', require('./routes/superadmin/dbTables'));
app.use('/api/teacher/manageexams', require('./routes/teacher/manageexams'));
app.use('/api/teacher/addquestion', require('./routes/teacher/addQuestion'));
app.use('/api/worksheet', require('./routes/teacher/worksheets'));
app.use('/api/teacher/worksheets', require('./routes/teacher/worksheets'));
app.use('/api/teacher/generatequestionpaper', require('./routes/teacher/generatequestionpaper'));
app.use('/api/teacher/submissionreport', require('./routes/teacher/submissionreport'));
app.use('/api/student', require('./routes/studentRoutes'));
app.use('/api/admin/manageexams', require('./routes/admin/manageexams'));
app.use('/api/admin/questions', require('./routes/admin/QuestionTable'));
app.use('/api', require('./routes/enrollmentRoutes'));

// Start the server
const PORT = process.env.PORT || 3002;
const HOST = '127.0.0.1';   // CHANGE THIS

app.listen(PORT, HOST, () => {
  console.log(`Server running on http://${HOST}:${PORT}`);
}); 

