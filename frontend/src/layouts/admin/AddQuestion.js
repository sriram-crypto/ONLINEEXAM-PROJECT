import React, { useState, useEffect } from 'react';
import {
  Box, Paper, Typography,
  Button, Alert, Grid, Card, CardContent, IconButton, Avatar, Tabs, Tab
} from '@mui/material';
import StyledTextField from 'components/StyledTextField';
import CustomDropdown from 'components/CustomDropdown';
import {
  Save as SaveIcon, 
  Clear as ClearIcon, 
  CloudUpload as UploadIcon,
  Image as ImageIcon,
  Delete as DeleteIcon,
  GetApp as DownloadIcon
} from '@mui/icons-material';
import QuestionTable from './QuestionTable';
import MLQuestionAssistant from 'components/MLQuestionAssistant';

const AddQuestion = () => {
    // State for Excel upload (missing from previous refactor)
    const [excelForm, setExcelForm] = useState({
      category: '',
      course: '',
      subject: '',
      chapter: '',
      level_id: '',
      type: ''
    });
  // State for tab management
  const [tabValue, setTabValue] = useState(0);

  // State for manual question addition
  const [manualForm, setManualForm] = useState({
    category: '',
    course: '',
    subject: '',
    chapter: '',
    level_id: '',
    type: '',
    question_text: '',
    question_image: '',
    option1: '',
    option1_image: '',
    option2: '',
    option2_image: '',
    option3: '',
    option3_image: '',
    option4: '',
    option4_image: '',
    answer: '',
    answer_image: '',
    class: '',
    schoolname: ''
  });

  // Common dropdown data
  const [categories, setCategories] = useState([]);
  const [courses, setCourses] = useState([]);
  const [subjects, setSubjects] = useState([]);
  const [chapters, setChapters] = useState([]);
  const [levels, setLevels] = useState([]);
  const [questionTypes, setQuestionTypes] = useState([]);

  // UI state
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [uploadingImage, setUploadingImage] = useState('');
  const [file, setFile] = useState(null);

  // Load initial data
  useEffect(() => {
    fetchCategories();
    fetchLevels();
    fetchQuestionTypes();
  }, []);
  // State to trigger reload of QuestionTable
  const [reloadFlag, setReloadFlag] = useState(false);

  // Fetch functions (existing)
  const fetchCategories = async () => {
    try {
      const response = await fetch('/api/admin/course-categories');
      const data = await response.json();
      setCategories(data);
    } catch (error) {
      console.error('Error fetching categories:', error);
    }
  };

  const fetchCourses = async (categoryId) => {
    try {
      const response = await fetch(`/api/admin/courses?category_id=${categoryId}`);
      const data = await response.json();
      setCourses(data);
    } catch (error) {
      console.error('Error fetching courses:', error);
    }
  };

  const fetchSubjects = async (courseId) => {
    try {
      const response = await fetch(`/api/admin/subjects?course_id=${courseId}`);
      const data = await response.json();
      setSubjects(data);
    } catch (error) {
      console.error('Error fetching subjects:', error);
    }
  };

  const fetchChapters = async (subjectId) => {
    try {
      const response = await fetch(`/api/admin/chapters?subject_id=${subjectId}`);
      const result = await response.json();
      if (Array.isArray(result)) {
        setChapters(result);
      } else if (result.success && result.chapters) {
        setChapters(result.chapters);
      }
    } catch (error) {
      console.error('Error fetching chapters:', error);
    }
  };

  const fetchLevels = async () => {
    try {
      const response = await fetch('/api/admin/difficulty-levels');
      const data = await response.json();
      setLevels(data);
    } catch (error) {
      console.error('Error fetching levels:', error);
    }
  };

  const fetchQuestionTypes = async () => {
    try {
      const response = await fetch('/api/admin/question-types');
      const data = await response.json();
      setQuestionTypes(data);
    } catch (error) {
      console.error('Error fetching question types:', error);
    }
  };

  // Handle tab change
  const handleTabChange = (event, newValue) => {
    setTabValue(newValue);
    setError('');
    setSuccess('');
  };

  // Handle Excel form changes
  const handleExcelFormChange = (e) => {
    const { name, value } = e.target;
    
    if (name === 'category') {
      setExcelForm(prev => ({ ...prev, [name]: value, course: '', subject: '', chapter: '' }));
      setCourses([]);
      setSubjects([]);
      setChapters([]);
      if (value) fetchCourses(value);
    } else if (name === 'course') {
      setExcelForm(prev => ({ ...prev, [name]: value, subject: '', chapter: '' }));
      setSubjects([]);
      setChapters([]);
      if (value) fetchSubjects(value);
    } else if (name === 'subject') {
      setExcelForm(prev => ({ ...prev, [name]: value, chapter: '' }));
      setChapters([]);
      if (value) fetchChapters(value);
    } else {
      setExcelForm(prev => ({ ...prev, [name]: value }));
    }
  };

  // Handle manual form changes
  const handleManualFormChange = (e) => {
    const { name, value } = e.target;
    
    if (name === 'category') {
      setManualForm(prev => ({ ...prev, [name]: value, course: '', subject: '', chapter: '' }));
      setCourses([]);
      setSubjects([]);
      setChapters([]);
      if (value) fetchCourses(value);
    } else if (name === 'course') {
      setManualForm(prev => ({ ...prev, [name]: value, subject: '', chapter: '' }));
      setSubjects([]);
      setChapters([]);
      if (value) fetchSubjects(value);
    } else if (name === 'subject') {
      setManualForm(prev => ({ ...prev, [name]: value, chapter: '' }));
      setChapters([]);
      if (value) fetchChapters(value);
    } else {
      setManualForm(prev => ({ ...prev, [name]: value }));
    }
  };

  // Handle image upload for manual questions
  const handleImageUpload = async (e, fieldName) => {
    const file = e.target.files[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      setError('Please select a valid image file');
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      setError('Image size should be less than 5MB');
      return;
    }

    setUploadingImage(fieldName);
    setError('');

    try {
      const formData = new FormData();
      formData.append('image', file);

      const response = await fetch('/api/admin/upload-image', {
        method: 'POST',
        body: formData,
      });

      const result = await response.json();

      if (result.success) {
        setManualForm(prev => ({ ...prev, [fieldName]: result.imageUrl }));
        setSuccess('Image uploaded successfully');
      } else {
        setError(result.error || 'Image upload failed');
      }
    } catch (error) {
      console.error('Image upload error:', error);
        setReloadFlag(flag => !flag); // trigger reload
      setError('Image upload failed: ' + error.message);
    } finally {
      setUploadingImage('');
    }
  };

  // Handle image removal
  const handleRemoveImage = (fieldName) => {
    setManualForm(prev => ({ ...prev, [fieldName]: '' }));
  };

  // Handle Excel file upload (existing functionality)
  const handleExcelUpload = async (e) => {
    e.preventDefault();
    
    if (!file) {
      setError('Please select an Excel file');
      return;
    }

    if (!excelForm.category || !excelForm.course || !excelForm.subject || !excelForm.level_id || !excelForm.type) {
      setError('Please fill all required fields');
      return;
    }

    setLoading(true);
    setError('');
    setSuccess('');

    try {
      const formData = new FormData();
      formData.append('file', file);
      formData.append('category_id', excelForm.category);
      formData.append('course_id', excelForm.course);
      formData.append('subject_id', excelForm.subject);
      formData.append('chapter_id', excelForm.chapter || '');
      formData.append('level_id', excelForm.level_id);
      formData.append('type', excelForm.type);

      const response = await fetch('/api/admin/upload-questions', {
        method: 'POST',
        body: formData,
      });

      const result = await response.json();

      if (result.success) {
        setSuccess(result.message);
        setFile(null);
      } else {
        setError(result.error || 'Upload failed');
      }
    } catch (error) {
      console.error('Upload error:', error);
      setError('Upload failed: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  // Handle manual question submission
  const handleManualSubmit = async (e) => {
    e.preventDefault();
    
    if (!manualForm.category || !manualForm.course || !manualForm.subject || !manualForm.level_id || !manualForm.type) {
      setError('Please fill all required fields');
      return;
    }
    // Validate that parsed values are valid numbers
    const parsedCourse = parseInt(manualForm.course);
    const parsedCategory = parseInt(manualForm.category);
    const parsedSubject = parseInt(manualForm.subject);
    const parsedLevel = parseInt(manualForm.level_id);
    const parsedType = parseInt(manualForm.type);
    if ([parsedCourse, parsedCategory, parsedSubject, parsedLevel, parsedType].some(val => isNaN(val))) {
      setError('Please select valid values for all dropdowns.');
      return;
    }

  /*   if (selectedQuestionType && (selectedQuestionType.type_name === 'MCQ' || selectedQuestionType.type_name === 'MSQ')) {
      // Check if option1 has either text or image
      const hasOption1 = manualForm.option1 || manualForm.option1_image;
      const hasOption2 = manualForm.option2 || manualForm.option2_image;
      const hasAnswer = manualForm.answer || manualForm.answer_image;
      
      if (!hasOption1 || !hasOption2 || !hasAnswer) {
        setError('For MCQ/MSQ questions, please provide at least 2 options (text or image) and an answer');
        return;
      }
    }
 */
    setLoading(true);
    setError('');
    setSuccess('');

    try {
      const questionData = {
        category_id: parseInt(manualForm.category),
        course_id: parseInt(manualForm.course),
        subject_id: parseInt(manualForm.subject),
        chapter_id: manualForm.chapter ? parseInt(manualForm.chapter) : null,
        level_id: parseInt(manualForm.level_id),
        question_type_id: parseInt(manualForm.type),
        question_text: manualForm.question_text,
        question_image: manualForm.question_image || null,
        option1: manualForm.option1 || null,
        option1_image: manualForm.option1_image || null,
        option2: manualForm.option2 || null,
        option2_image: manualForm.option2_image || null,
        option3: manualForm.option3 || null,
        option3_image: manualForm.option3_image || null,
        option4: manualForm.option4 || null,
        option4_image: manualForm.option4_image || null,
        answer: manualForm.answer,
        answer_image: manualForm.answer_image || null,
        class: manualForm.class || null,
        schoolname: manualForm.schoolname || ''
      };

      const response = await fetch('/api/admin/add-manual-question', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(questionData),
      });

      const result = await response.json();

      if (result.success) {
        setSuccess('Question added successfully!');
        // Reset manual form
        setManualForm({
          category: '',
          course: '',
          subject: '',
          chapter: '',
          level_id: '',
          type: '',
          question_text: '',
          question_image: '',
          option1: '',
          option1_image: '',
          option2: '',
          option2_image: '',
          option3: '',
          option3_image: '',
          option4: '',
          option4_image: '',
          answer: '',
          answer_image: '',
          class: '',
          schoolname: ''
        });
        setCourses([]);
        setSubjects([]);
        setChapters([]);
      } else {
        setError(result.error || 'Failed to add question');
      }
    } catch (error) {
      console.error('Submit error:', error);
      setError('Failed to add question: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  // Handle manual form reset
  const handleManualReset = () => {
    setManualForm({
      category: '',
      course: '',
      subject: '',
      chapter: '',
      level_id: '',
      type: '',
      question_text: '',
      question_image: '',
      option1: '',
      option1_image: '',
      option2: '',
      option2_image: '',
      option3: '',
      option3_image: '',
      option4: '',
      option4_image: '',
      answer: '',
      answer_image: '',
      class: '',
      schoolname: ''
    });
    setCourses([]);
    setSubjects([]);
    setChapters([]);
    setError('');
    setSuccess('');
  };

  // Download format file (existing functionality)
  const handleDownloadFormat = async (type = 'basic') => {
    const url = `/api/admin/download-format?type=${type}`;
    try {
      const response = await fetch(url, {
        method: 'GET',
        headers: {
          // Accept Excel file
          'Accept': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
        }
      });
      if (!response.ok) {
        throw new Error('Failed to download format file');
      }
      const blob = await response.blob();
      const downloadUrl = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = downloadUrl;
      link.download = type === 'comprehensive' ? 'Comprehensive_Question_Format.xlsx' : 'Question_Format.xlsx';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(downloadUrl);
    } catch (error) {
      alert('Error downloading format file. Please try again.');
      console.error(error);
    }
  };

  // Render image upload field
  const renderImageUpload = (fieldName, label) => {
    const isUploading = uploadingImage === fieldName;
    const hasImage = manualForm[fieldName];

    return (
      <Box>
        <Typography variant="body2" sx={{ mb: 1, fontWeight: 500 }}>
          {label}
        </Typography>
        
        {hasImage ? (
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <Avatar
              src={`http://localhost:5000${manualForm[fieldName]}`}
              sx={{ width: 50, height: 50 }}
              variant="rounded"
            >
              <ImageIcon />
            </Avatar>
            <Typography variant="body2" sx={{ flex: 1, fontSize: '0.8rem' }}>
              {manualForm[fieldName]}
            </Typography>
            <IconButton 
              size="small" 
              color="error" 
              onClick={() => handleRemoveImage(fieldName)}
            >
              <DeleteIcon />
            </IconButton>
          </Box>
        ) : (
          <Box>
            <input
              accept="image/*"
              style={{ display: 'none' }}
              id={`upload-${fieldName}`}
              type="file"
              onChange={(e) => handleImageUpload(e, fieldName)}
              disabled={isUploading}
            />
            <label htmlFor={`upload-${fieldName}`}>
              <Button
                variant="contained"
                component="span"
                startIcon={isUploading ? null : <UploadIcon sx={{ color: '#fff' }} />}
                disabled={isUploading}
                size="small"
                fullWidth
                sx={{
                  bgcolor: '#0288d1',
                  color: '#ffffff',
                  fontWeight: 600,
                  textTransform: 'none',
                  '& .MuiButton-startIcon': {
                    color: '#ffffff'
                  },
                  '&:hover': {
                    bgcolor: '#0277bd',
                    color: '#ffffff'
                  },
                  '&:disabled': {
                    bgcolor: '#e0e0e0',
                    color: '#9e9e9e'
                  }
                }}
              >
                {isUploading ? 'Uploading...' : 'Upload Image'}
              </Button>
            </label>
          </Box>
        )}
      </Box>
    );
  };

  return (
    <Box sx={{ p: 3 }}>
      <Paper sx={{ p: 3 }}>
        <Typography variant="h4" gutterBottom align="center" color="primary">
          Add Questions
        </Typography>

        {/* Tab Navigation */}
        <Tabs value={tabValue} onChange={handleTabChange} centered sx={{ mb: 3 }}>
          <Tab label="📄 Excel Upload" />
          <Tab label="✏️ Manual Entry" />
        </Tabs>

        {error && (
          <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError('')}>
            {error}
          </Alert>
        )}

        {success && (
          <Alert severity="success" sx={{ mb: 2 }} onClose={() => setSuccess('')}>
            {success}
          </Alert>
        )}

        {/* Excel Upload Tab */}
        {tabValue === 0 && (
          <Box>
            {/* Download Format Button */}
            <Box sx={{ mb: 3, textAlign: 'center' }}>
              <Typography variant="h6" gutterBottom sx={{ fontWeight: 600, color: '#344767' }}>
                Download Excel Format
              </Typography>
              <Button
                variant="contained"
                startIcon={<DownloadIcon sx={{ color: '#fff' }} />}
                onClick={() => handleDownloadFormat('basic')}
                sx={{ 
                  bgcolor: '#1976d2',
                  color: '#ffffff',
                  fontWeight: 600,
                  fontSize: { xs: '0.875rem', sm: '1rem' },
                  px: { xs: 2, sm: 3 },
                  py: 1.5,
                  boxShadow: 2,
                  textTransform: 'none',
                  '& .MuiButton-startIcon': {
                    color: '#ffffff'
                  },
                  '&:hover': { 
                    bgcolor: '#1565c0',
                    boxShadow: 3,
                    color: '#ffffff'
                  }
                }}
              >
                Download Format
              </Button>
            </Box>

            {/* Excel Form */}
            <Box component="form" onSubmit={handleExcelUpload}>
              <Grid container spacing={2} sx={{ mb: 3 }}>
                <Grid item xs={12} md={4} sx={{ overflow: 'visible' }}>
                  <CustomDropdown
                    label="Category *"
                    options={categories.map(cat => ({ value: cat.category_id, label: cat.category_name }))}
                    value={excelForm.category}
                    onChange={val => handleExcelFormChange({ target: { name: 'category', value: val } })}
                    placeholder="Select Category"
                  />
                </Grid>

                <Grid item xs={12} md={4} sx={{ overflow: 'visible' }}>
                  <CustomDropdown
                    label="Course *"
                    options={courses.map(course => ({ value: course.course_id, label: course.course_name }))}
                    value={excelForm.course}
                    onChange={val => handleExcelFormChange({ target: { name: 'course', value: val } })}
                    placeholder="Select Course"
                    disabled={!excelForm.category}
                  />
                </Grid>

                <Grid item xs={12} md={4} sx={{ overflow: 'visible' }}>
                  <CustomDropdown
                    label="Subject *"
                    options={subjects.map(subject => ({ value: subject.subject_id, label: subject.subject_name }))}
                    value={excelForm.subject}
                    onChange={val => handleExcelFormChange({ target: { name: 'subject', value: val } })}
                    placeholder="Select Subject"
                    disabled={!excelForm.course}
                  />
                </Grid>

                <Grid item xs={12} md={4} sx={{ overflow: 'visible' }}>
                  <CustomDropdown
                    label="Chapter"
                    options={chapters.map(chapter => ({ value: chapter.chapter_id, label: chapter.chapter_name }))}
                    value={excelForm.chapter}
                    onChange={val => handleExcelFormChange({ target: { name: 'chapter', value: val } })}
                    placeholder="Select Chapter"
                    disabled={!excelForm.subject}
                  />
                </Grid>

                <Grid item xs={12} md={4} sx={{ overflow: 'visible' }}>
                  <CustomDropdown
                    label="Difficulty Level *"
                    options={levels.map(level => ({ value: level.level_id, label: level.level_name }))}
                    value={excelForm.level_id}
                    onChange={val => handleExcelFormChange({ target: { name: 'level_id', value: val } })}
                    placeholder="Select Difficulty Level"
                  />
                </Grid>

                <Grid item xs={12} md={4} sx={{ overflow: 'visible' }}>
                  <CustomDropdown
                    label="Question Type *"
                    options={questionTypes.map(type => ({ value: type.question_type_id, label: type.type_name }))}
                    value={excelForm.type}
                    onChange={val => handleExcelFormChange({ target: { name: 'type', value: val } })}
                    placeholder="Select Question Type"
                  />
                </Grid>
              </Grid>

              {/* File Upload */}
              <Box sx={{ mb: 3 }}>
                <input
                  accept=".xlsx,.xls"
                  style={{ display: 'none' }}
                  id="excel-file-input"
                  type="file"
                  onChange={(e) => setFile(e.target.files[0])}
                />
                <label htmlFor="excel-file-input">
                  <Button 
                    variant="contained" 
                    component="span" 
                    startIcon={<UploadIcon sx={{ color: '#fff' }} />}
                    sx={{
                      bgcolor: '#2e7d32',
                      color: '#ffffff',
                      fontWeight: 600,
                      textTransform: 'none',
                      '& .MuiButton-startIcon': {
                        color: '#ffffff'
                      },
                      '&:hover': {
                        bgcolor: '#1b5e20',
                        color: '#ffffff'
                      }
                    }}
                  >
                    Choose Excel File
                  </Button>
                </label>
                {file && (
                  <Typography variant="body2" sx={{ mt: 1 }}>
                    Selected: {file.name}
                  </Typography>
                )}
              </Box>

              {/* Submit Button */}
              <Button
                type="submit"
                variant="contained"
                disabled={loading}
                size="large"
                startIcon={<UploadIcon sx={{ color: '#fff' }} />}
                sx={{
                  bgcolor: '#1976d2',
                  color: '#ffffff',
                  fontWeight: 600,
                  textTransform: 'none',
                  '& .MuiButton-startIcon': {
                    color: '#ffffff'
                  },
                  '&:hover': {
                    bgcolor: '#1565c0',
                    color: '#ffffff'
                  },
                  '&:disabled': {
                    bgcolor: '#e0e0e0',
                    color: '#9e9e9e'
                  }
                }}
              >
                {loading ? 'Uploading...' : 'Upload Questions'}
              </Button>
            </Box>
          </Box>
        )}

        {/* Manual Entry Tab */}
        {tabValue === 1 && (
          <Box component="form" onSubmit={handleManualSubmit}>
            {/* Category, Course, Subject Selection */}
            <Card sx={{ mb: 3 }}>
              <CardContent sx={{ overflow: 'visible' }}>
                <Typography variant="h6" gutterBottom color="primary">
                  Question Category & Classification
                </Typography>
                <Grid container spacing={2} sx={{ overflow: 'visible' }}>
                  <Grid item xs={12} md={4} sx={{ overflow: 'visible' }}>
                    <CustomDropdown
                      label="Category *"
                      options={categories.map(cat => ({ value: cat.category_id, label: cat.category_name }))}
                      value={manualForm.category}
                      onChange={val => handleManualFormChange({ target: { name: 'category', value: val } })}
                      placeholder="Select Category"
                      required
                    />
                  </Grid>

                  <Grid item xs={12} md={4} sx={{ overflow: 'visible' }}>
                    <CustomDropdown
                      label="Course *"
                      options={courses.map(course => ({ value: course.course_id, label: course.course_name }))}
                      value={manualForm.course}
                      onChange={val => handleManualFormChange({ target: { name: 'course', value: val } })}
                      placeholder="Select Course"
                      disabled={!manualForm.category}
                      required
                    />
                  </Grid>

                  <Grid item xs={12} md={4} sx={{ overflow: 'visible' }}>
                    <CustomDropdown
                      label="Subject *"
                      options={subjects.map(subject => ({ value: subject.subject_id, label: subject.subject_name }))}
                      value={manualForm.subject}
                      onChange={val => handleManualFormChange({ target: { name: 'subject', value: val } })}
                      placeholder="Select Subject"
                      disabled={!manualForm.course}
                      required
                    />
                  </Grid>

                  <Grid item xs={12} md={4} sx={{ overflow: 'visible' }}>
                    <CustomDropdown
                      label="Chapter"
                      options={chapters.map(chapter => ({ value: chapter.chapter_id, label: chapter.chapter_name }))}
                      value={manualForm.chapter}
                      onChange={val => handleManualFormChange({ target: { name: 'chapter', value: val } })}
                      placeholder="Select Chapter"
                      disabled={!manualForm.subject}
                    />
                  </Grid>

                  <Grid item xs={12} md={4} sx={{ overflow: 'visible' }}>
                    <CustomDropdown
                      label="Difficulty Level *"
                      options={levels.map(level => ({ value: level.level_id, label: level.level_name }))}
                      value={manualForm.level_id}
                      onChange={val => handleManualFormChange({ target: { name: 'level_id', value: val } })}
                      placeholder="Select Difficulty Level"
                      required
                    />
                  </Grid>

                  <Grid item xs={12} md={4} sx={{ overflow: 'visible' }}>
                    <CustomDropdown
                      label="Question Type *"
                      options={questionTypes.map(type => ({ value: type.question_type_id, label: type.type_name }))}
                      value={manualForm.type}
                      onChange={val => handleManualFormChange({ target: { name: 'type', value: val } })}
                      placeholder="Select Question Type"
                      required
                    />
                  </Grid>
                </Grid>
              </CardContent>
            </Card>

            {/* Question Text and Image */}
            <Card sx={{ mb: 3 }}>
              <CardContent>
                <Typography variant="h6" gutterBottom color="primary">
                  Question Details
                </Typography>
                <Grid container spacing={2}>
                  <Grid item xs={12} md={8}>
                    <StyledTextField
                      name="question_text"
                      label="Question Text"
                      value={manualForm.question_text}
                      onChange={handleManualFormChange}
                      fullWidth
                      multiline
                      rows={3}
                      placeholder="Enter your question here..."
                    />
                  </Grid>
                  <Grid item xs={12} md={4}>
                    {renderImageUpload('question_image', 'Question Image')}
                  </Grid>
                </Grid>
                <MLQuestionAssistant
                  form={manualForm}
                  levels={levels}
                  questionTypes={questionTypes}
                  subjects={subjects}
                  chapters={chapters}
                  onApplyField={(name, value) => handleManualFormChange({ target: { name, value } })}
                />
              </CardContent>
            </Card>

            {/* Options */}
            <Card sx={{ mb: 3 }}>
              <CardContent>
                <Typography variant="h6" gutterBottom color="primary">
                  Answer Options
                </Typography>
                <Grid container spacing={2}>
                  {[1, 2, 3, 4].map((optionNum) => (
                    <React.Fragment key={optionNum}>
                      <Grid item xs={12} md={6}>
                        <StyledTextField
                          name={`option${optionNum}`}
                          label={`Option ${optionNum}`}
                          value={manualForm[`option${optionNum}`]}
                          onChange={handleManualFormChange}
                          fullWidth
                          placeholder={`Enter option ${optionNum}...`}
                        />
                      </Grid>
                      <Grid item xs={12} md={6}>
                        {renderImageUpload(`option${optionNum}_image`, `Option ${optionNum} Image`)}
                      </Grid>
                    </React.Fragment>
                  ))}
                </Grid>
              </CardContent>
            </Card>

            {/* Answer */}
            <Card sx={{ mb: 3 }}>
              <CardContent>
                <Typography variant="h6" gutterBottom color="primary">
                  Correct Answers
                </Typography>
                <Grid container spacing={2}>
                  <Grid item xs={12} md={6}>
                    <StyledTextField
                      name="answer"
                      label="Answer "
                      value={manualForm["answer"]}
                      onChange={handleManualFormChange}
                      fullWidth
                      placeholder="Enter answer 1..."
                    />
                  </Grid>
                  <Grid item xs={12} md={6}>
                    {renderImageUpload("answer_image", "Answer Image")}
                  </Grid>
                </Grid>
              </CardContent>
            </Card>

            {/* Additional Information */}
            <Card sx={{ mb: 3 }}>
              <CardContent>
                <Typography variant="h6" gutterBottom color="primary">
                  Additional Information (Optional)
                </Typography>
                <Grid container spacing={2}>
                  <Grid item xs={12} md={6}>
                    <StyledTextField
                      name="class"
                      label="Class"
                      value={manualForm.class}
                      onChange={handleManualFormChange}
                      fullWidth
                      placeholder="e.g., 12"
                    />
                  </Grid>
                  <Grid item xs={12} md={6}>
                    <StyledTextField
                      name="schoolname"
                      label="School Name"
                      value={manualForm.schoolname}
                      onChange={handleManualFormChange}
                      fullWidth
                      placeholder="Enter school name..."
                    />
                  </Grid>
                </Grid>
              </CardContent>
            </Card>

            {/* Action Buttons */}
            <Box sx={{ display: 'flex', gap: 2, justifyContent: 'center', mt: 3, flexWrap: 'wrap' }}>
              <Button
                type="button"
                variant="contained"
                startIcon={<ClearIcon sx={{ color: '#fff' }} />}
                onClick={handleManualReset}
                disabled={loading}
                size="large"
                sx={{
                  bgcolor: '#d32f2f',
                  color: '#ffffff',
                  fontWeight: 600,
                  textTransform: 'none',
                  '& .MuiButton-startIcon': {
                    color: '#ffffff'
                  },
                  '&:hover': {
                    bgcolor: '#c62828',
                    color: '#ffffff'
                  },
                  '&:disabled': {
                    bgcolor: '#e0e0e0',
                    color: '#9e9e9e'
                  }
                }}
              >
                Clear Form
              </Button>
              <Button
                type="submit"
                variant="contained"
                startIcon={<SaveIcon sx={{ color: '#fff' }} />}
                disabled={loading || questionTypes.length === 0}
                size="large"
                sx={{
                  bgcolor: '#2e7d32',
                  color: '#ffffff',
                  fontWeight: 600,
                  textTransform: 'none',
                  '& .MuiButton-startIcon': {
                    color: '#ffffff'
                  },
                  '&:hover': {
                    bgcolor: '#1b5e20',
                    color: '#ffffff'
                  },
                  '&:disabled': {
                    bgcolor: '#e0e0e0',
                    color: '#9e9e9e'
                  }
                }}
              >
                {loading ? 'Adding Question...' : 'Add Question'}
              </Button>
            </Box>
          </Box>
        )}

        {/* Instructions removed as requested */}
      </Paper>
      {/* Render the QuestionTable below the add question form */}
      <Box sx={{ mt: 4 }}>
        <Typography variant="h5" gutterBottom color="primary">All Questions</Typography>
        <QuestionTable reloadFlag={reloadFlag} />
      </Box>
    </Box>
  );
}


export default AddQuestion;
