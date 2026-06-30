import DashboardLayout from "examples/LayoutContainers/DashboardLayout";
import React, { useEffect, useState, useMemo } from 'react';
import DashboardNavbar from "examples/Navbars/DashboardNavbar";
import { useSearchParams } from 'react-router-dom';
import { Card, Grid, Box, Typography, Divider, LinearProgress, Avatar } from '@mui/material';
import PieChart from 'examples/Charts/PieChart';
import CircularProgress from '@mui/material/CircularProgress';
import "./student-dashboard.css";

export default function MyPracticeResult({ submissionId: submissionIdProp, examId: examIdProp, studentId: studentIdProp, onClose }) {
  const [searchParams] = useSearchParams();
  const submissionId = submissionIdProp || searchParams.get('submission_id') || searchParams.get('submissionId');
  const examId = examIdProp || searchParams.get('exam_id');
  const studentId = studentIdProp || searchParams.get('student_id');
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  // Get student info
  const studentInfo = useMemo(() => {
    try {
      const user = JSON.parse(localStorage.getItem('user') || '{}');
      return {
        name: user.name || user.student_name || 'Student',
        class: user.class_name || user.class || 'Class 10',
        rollNumber: user.roll_number || '01',
        photo: user.photo || null,
        school: user.school_name || ''
      };
    } catch (e) {
      return { name: 'Student', class: 'Class 10', rollNumber: '01', photo: null, school: '' };
    }
  }, []);

  useEffect(() => {
    async function load() {
      try {
        const stored = submissionId ? sessionStorage.getItem(`practice_result_${submissionId}`) : null;
        if (stored) {
          setData(JSON.parse(stored));
          setLoading(false);
          return;
        }
      } catch (e) {}
      
      const params = new URLSearchParams();
      if (submissionId) params.set('submission_id', submissionId);
      if (examId) params.set('exam_id', examId);
      if (studentId) params.set('student_id', studentId);
      
      const res = await fetch(`/api/student/mypractice/result?${params.toString()}`);
      if (!res.ok) {
        setData({ error: 'Failed to load result' });
        setLoading(false);
        return;
      }
      const json = await res.json();
      setData(json);
      setLoading(false);
    }
    load();
  }, [submissionId, examId, studentId]);

  // Calculate percentage
  const percentage = data?.result?.total_marks && data?.result?.total_marks > 0 
    ? Math.round((data.result.correct_count / (data.result.correct_count + data.result.wrong_count + data.result.not_attempted_count)) * 100)
    : 0;

  // Get performance badge
  const getPerformanceBadge = (pct) => {
    if (pct >= 90) return { label: 'Excellent', emoji: '🎯', color: '#10b981' };
    if (pct >= 75) return { label: 'Very Good', emoji: '⭐', color: '#3b82f6' };
    if (pct >= 60) return { label: 'Good', emoji: '👍', color: '#f59e0b' };
    if (pct >= 40) return { label: 'Fair', emoji: '💪', color: '#8b5cf6' };
    return { label: 'Needs Improvement', emoji: '🌱', color: '#ef4444' };
  };

  const badge = getPerformanceBadge(percentage);

  // Get grade
  const getGrade = (pct) => {
    if (pct >= 90) return { grade: 'A', color: '#10b981' };
    if (pct >= 80) return { grade: 'B', color: '#3b82f6' };
    if (pct >= 70) return { grade: 'C', color: '#f59e0b' };
    if (pct >= 60) return { grade: 'D', color: '#8b5cf6' };
    return { grade: 'E', color: '#ef4444' };
  };

  const grade = getGrade(percentage);

  // Question distribution pie chart
  const questionDistData = useMemo(() => {
    if (!data?.result) return null;
    return {
      labels: ['Correct', 'Wrong', 'Not Attempted'],
      datasets: {
        label: 'Question Distribution',
        data: [
          data.result.correct_count || 0,
          data.result.wrong_count || 0,
          data.result.not_attempted_count || 0
        ],
        backgroundColors: ['#10b981', '#ef4444', '#94a3b8'],
      }
    };
  }, [data]);

  // Performance breakdown pie chart
  const performanceData = useMemo(() => {
    if (!data?.result) return null;
    return {
      labels: ['Attempted', 'Not Attempted'],
      datasets: {
        label: 'Attempt Status',
        data: [
          (data.result.attempted_count || 0),
          (data.result.not_attempted_count || 0)
        ],
        backgroundColors: ['#667eea', '#94a3b8'],
      }
    };
  }, [data]);

  if (loading) return (
    <DashboardLayout>
      <DashboardNavbar/>
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '60vh' }}>
        <CircularProgress />
      </Box>
    </DashboardLayout>
  );

  if (data?.error) return (
    <DashboardLayout>
      <DashboardNavbar/>
      <Box sx={{ p: 4, textAlign: 'center' }}>
        <Typography variant="h5" color="error" sx={{ mb: 2 }}>❌ Error Loading Result</Typography>
        <Typography>{data.error}</Typography>
      </Box>
    </DashboardLayout>
  );

  const result = data?.result || {};
  const feedback = data?.feedback || [];

  return (
    <DashboardLayout>
      <DashboardNavbar />
      <Box sx={{ p: 3 }}>
        {onClose && (
          <Box sx={{ display: 'flex', justifyContent: 'flex-end', mb: 2 }}>
            <button type="button" className="student-secondary-button" onClick={onClose}>Close</button>
          </Box>
        )}
        {/* Header Card with School Info */}
        <Card sx={{ mb: 3, borderRadius: '20px', overflow: 'hidden' }}>
          <Box
            sx={{
              background: 'linear-gradient(135deg, #f59e0b 0%, #d97706 100%)',
              p: 3,
              textAlign: 'center',
            }}
          >
            {studentInfo.school && (
              <Typography sx={{ color: '#fff', fontWeight: 700, fontSize: '20px' }}>
                {studentInfo.school}
              </Typography>
            )}
            <Typography sx={{ color: 'rgba(255,255,255,0.8)', fontSize: '12px' }}>
              Practice Exam Result
            </Typography>
          </Box>
          
          <Box sx={{ p: 3 }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 3, mb: 3 }}>
              <Avatar
                src={studentInfo.photo}
                sx={{
                  width: 70,
                  height: 70,
                  borderRadius: '12px',
                  boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
                  border: '3px solid #f59e0b',
                }}
              >
                {studentInfo.name.charAt(0)}
              </Avatar>
              <Box>
                <Typography sx={{ fontWeight: 700, fontSize: '18px', color: '#1a202c' }}>
                  {studentInfo.name}
                </Typography>
                <Typography sx={{ color: '#718096', fontSize: '14px' }}>
                  Class: {studentInfo.class} | Roll No: {studentInfo.rollNumber}
                </Typography>
                <Typography sx={{ color: '#718096', fontSize: '14px' }}>
                  Practice Exam
                </Typography>
              </Box>
            </Box>

            <Divider sx={{ mb: 3 }} />

            <Grid container spacing={3}>
              <Grid item xs={12} md={8}>
                {/* Score Cards */}
                <Box sx={{ display: 'flex', gap: 2, flexWrap: 'wrap', mb: 3 }}>
                  <Box sx={{ flex: 1, minWidth: '120px', p: 2, background: '#f3f4f6', borderRadius: 2, textAlign: 'center' }}>
                    <Typography sx={{ fontSize: '12px', color: '#666', mb: 1 }}>Total Marks</Typography>
                    <Typography sx={{ fontSize: '24px', fontWeight: 700, color: '#1a202c' }}>
                      {result.total_marks ?? 0}
                    </Typography>
                  </Box>
                  <Box sx={{ flex: 1, minWidth: '120px', p: 2, background: '#ecfdf5', borderRadius: 2, textAlign: 'center' }}>
                    <Typography sx={{ fontSize: '12px', color: '#666', mb: 1 }}>Correct</Typography>
                    <Typography sx={{ fontSize: '24px', fontWeight: 700, color: '#059669' }}>
                      {result.correct_count || 0}
                    </Typography>
                  </Box>
                  <Box sx={{ flex: 1, minWidth: '120px', p: 2, background: '#fff1f2', borderRadius: 2, textAlign: 'center' }}>
                    <Typography sx={{ fontSize: '12px', color: '#666', mb: 1 }}>Wrong</Typography>
                    <Typography sx={{ fontSize: '24px', fontWeight: 700, color: '#dc2626' }}>
                      {result.wrong_count || 0}
                    </Typography>
                  </Box>
                  <Box sx={{ flex: 1, minWidth: '120px', p: 2, background: '#fef3c7', borderRadius: 2, textAlign: 'center' }}>
                    <Typography sx={{ fontSize: '12px', color: '#666', mb: 1 }}>Not Attempted</Typography>
                    <Typography sx={{ fontSize: '24px', fontWeight: 700, color: '#d97706' }}>
                      {result.not_attempted_count || 0}
                    </Typography>
                  </Box>
                </Box>

                {/* Attempt Summary */}
                <Box sx={{ p: 2, background: '#f8fafc', borderRadius: 2, mb: 3 }}>
                  <Typography variant="subtitle2" sx={{ fontWeight: 700, mb: 2 }}>
                    📊 Attempt Summary
                  </Typography>
                  <Box sx={{ mb: 2 }}>
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 0.5 }}>
                      <Typography sx={{ fontWeight: 600 }}>Attempt Rate</Typography>
                      <Typography sx={{ fontWeight: 700 }}>
                        {result.attempted_count || 0} / {(result.attempted_count || 0) + (result.not_attempted_count || 0)}
                      </Typography>
                    </Box>
                    <LinearProgress
                      variant="determinate"
                      value={((result.attempted_count || 0) / ((result.attempted_count || 0) + (result.not_attempted_count || 0))) * 100 || 0}
                      sx={{
                        height: '10px',
                        borderRadius: '5px',
                        backgroundColor: '#e2e8f0',
                        '& .MuiLinearProgress-bar': {
                          borderRadius: '5px',
                          backgroundColor: '#667eea',
                        },
                      }}
                    />
                  </Box>
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <Typography sx={{ fontWeight: 600 }}>Accuracy</Typography>
                    <Typography sx={{ fontWeight: 700, color: '#059669' }}>
                      {percentage}%
                    </Typography>
                  </Box>
                </Box>

                {/* Questions */}
                {Array.isArray(feedback) && feedback.length > 0 && (
                  <Box>
                    <Typography variant="subtitle2" sx={{ fontWeight: 700, mb: 2 }}>
                      ❓ Questions & Answers ({feedback.length})
                    </Typography>
                    <Grid container spacing={2}>
                      {feedback.map((q, idx) => (
                        <Grid item xs={12} md={6} key={q.question_id || idx}>
                          <Card sx={{ p: 2, borderLeft: `4px solid ${q.is_correct ? '#10b981' : '#ef4444'}` }}>
                            <Typography sx={{ fontWeight: 700, mb: 2 }}>
                              Q{idx + 1}: {q.question_text?.substring(0, 100)}{q.question_text?.length > 100 ? '...' : ''}
                            </Typography>
                            {q.question_image && (
                              <Box sx={{ mb: 2 }}>
                                <img src={q.question_image} alt="Question" style={{ maxWidth: '100%', maxHeight: 200, borderRadius: 4 }} />
                              </Box>
                            )}
                            <Box sx={{ mb: 2 }}>
                              {[
                                { text: q.option1, image: q.option1_image },
                                { text: q.option2, image: q.option2_image },
                                { text: q.option3, image: q.option3_image },
                                { text: q.option4, image: q.option4_image }
                              ].filter(opt => opt.text || opt.image).map((opt, i) => {
                                const normalize = s => String(s || '').replace(/\s+/g, '').toLowerCase();
                                const studentAnswer = normalize(q.student_answer);
                                const correctAnswer = normalize(q.correct_answer);
                                const optionValue = normalize(opt.text);
                                const isStudent = optionValue === studentAnswer;
                                const isCorrect = optionValue === correctAnswer;
                                const bg = isCorrect ? '#ecfdf5' : (isStudent && !isCorrect ? '#fff1f2' : '#fff');
                                const color = isCorrect ? '#065f46' : (isStudent && !isCorrect ? '#9f1239' : '#111');
                                return (
                                  <Box
                                    key={i}
                                    sx={{
                                      p: 1.5,
                                      mb: 1,
                                      background: bg,
                                      border: isCorrect ? '1px solid #10b981' : (isStudent && !isCorrect ? '1px solid #fda4af' : '1px solid #e6e6e6'),
                                      borderRadius: 1,
                                      color,
                                    }}
                                  >
                                    <strong>{String.fromCharCode(65 + i)}.</strong> {opt.text}
                                    {isStudent && <span style={{ marginLeft: 10, fontSize: 12, color: '#6b7280' }}>(your)</span>}
                                    {isCorrect && <span style={{ marginLeft: 10, fontSize: 12, color: '#059669' }}>✓ correct</span>}
                                    {opt.image && (
                                      <Box sx={{ mt: 1 }}>
                                        <img src={opt.image} alt={`Option ${String.fromCharCode(65+i)}`} style={{ maxWidth: '100%', maxHeight: 150, borderRadius: 4 }} />
                                      </Box>
                                    )}
                                  </Box>
                                );
                              })}
                              {q.answer_image && (
                                <Box sx={{ mt: 2, p: 1.5, background: '#f3f4f6', borderRadius: 1 }}>
                                  <Typography sx={{ fontSize: 12, color: '#666', mb: 1 }}>
                                    Answer Image:
                                  </Typography>
                                  <img src={q.answer_image} alt="Answer" style={{ maxWidth: '100%', maxHeight: 150, borderRadius: 4 }} />
                                </Box>
                              )}
                            </Box>
                            <Box sx={{ p: 1.5, background: '#f3f4f6', borderRadius: 1 }}>
                              <Typography sx={{ fontSize: 12, color: '#666' }}>
                                Marks: <strong>{q.marks_obtained}</strong>
                              </Typography>
                            </Box>
                          </Card>
                        </Grid>
                      ))}
                    </Grid>
                  </Box>
                )}
              </Grid>

              {/* Right Side - Charts & Final Grade */}
              <Grid item xs={12} md={4}>
                <Box sx={{ textAlign: 'center', mb: 3 }}>
                  <Box
                    sx={{
                      width: '120px',
                      height: '120px',
                      borderRadius: '50%',
                      background: `conic-gradient(${badge.color} ${percentage * 3.6}deg, #e2e8f0 0deg)`,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      margin: '0 auto',
                      mb: 2,
                    }}
                  >
                    <Box
                      sx={{
                        width: '90px',
                        height: '90px',
                        borderRadius: '50%',
                        background: '#fff',
                        display: 'flex',
                        flexDirection: 'column',
                        alignItems: 'center',
                        justifyContent: 'center',
                      }}
                    >
                      <Typography sx={{ fontSize: '28px', fontWeight: 800, color: badge.color }}>
                        {percentage}%
                      </Typography>
                      <Typography sx={{ fontSize: '10px', color: '#666' }}>Score</Typography>
                    </Box>
                  </Box>
                  <Typography sx={{ fontSize: '24px', mb: 1 }}>{badge.emoji}</Typography>
                  <Typography sx={{ fontWeight: 700, color: badge.color, textTransform: 'uppercase' }}>
                    {badge.label}
                  </Typography>
                  <Typography sx={{ fontSize: '12px', color: '#666', mt: 1 }}>Grade: <strong style={{ color: grade.color }}>{grade.grade}</strong></Typography>
                </Box>

                {/* Question Distribution Pie Chart */}
                {questionDistData && (
                  <Box sx={{ mb: 3 }}>
                    <Typography variant="subtitle2" sx={{ fontWeight: 700, mb: 1, textAlign: 'center' }}>
                      📊 Answer Distribution
                    </Typography>
                    <Box sx={{ height: '150px' }}>
                      <PieChart
                        chart={{
                          labels: questionDistData.labels,
                          datasets: questionDistData.datasets
                        }}
                        height="140px"
                      />
                    </Box>
                    <Box sx={{ display: 'flex', justifyContent: 'center', gap: 1, mt: 1, flexWrap: 'wrap' }}>
                      {['#10b981', '#ef4444', '#94a3b8'].map((color, i) => (
                        <Box key={i} sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                          <Box sx={{ width: '8px', height: '8px', borderRadius: '2px', background: color }} />
                          <Typography sx={{ fontSize: '10px', color: '#666' }}>{questionDistData.labels[i]}</Typography>
                        </Box>
                      ))}
                    </Box>
                  </Box>
                )}

                {/* Attempt Status Pie Chart */}
                {performanceData && (
                  <Box>
                    <Typography variant="subtitle2" sx={{ fontWeight: 700, mb: 1, textAlign: 'center' }}>
                      ⏱️ Attempt Status
                    </Typography>
                    <Box sx={{ height: '150px' }}>
                      <PieChart
                        chart={{
                          labels: performanceData.labels,
                          datasets: performanceData.datasets
                        }}
                        height="140px"
                      />
                    </Box>
                  </Box>
                )}
              </Grid>
            </Grid>
          </Box>
        </Card>
      </Box>
    </DashboardLayout>
  );
}
