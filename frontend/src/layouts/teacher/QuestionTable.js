
import React, { useEffect, useMemo, useState } from "react";
import MenuItem from '@mui/material/MenuItem';
import FormControl from '@mui/material/FormControl';
import InputLabel from '@mui/material/InputLabel';
import Select from '@mui/material/Select';
import PropTypes from "prop-types";
import { DataGrid } from '@mui/x-data-grid';
import ArgonButton from "../../components/ArgonButton";
import Dialog from '@mui/material/Dialog';
import DialogTitle from '@mui/material/DialogTitle';
import DialogContent from '@mui/material/DialogContent';
import DialogActions from '@mui/material/DialogActions';
import StyledTextField from 'components/StyledTextField';
import CustomDropdown from 'components/CustomDropdown';
import { GetApp as DownloadIcon, Search as SearchIcon, Clear as ClearIcon } from '@mui/icons-material';
import * as XLSX from 'xlsx';
import { Grid, Tab, Tabs, Typography, Card, CardContent, Box, TextField, InputAdornment, IconButton } from '@mui/material';

function QuestionTable({ reloadFlag }) {
  // ------- filters -------
  const [levelFilter, setLevelFilter] = useState('');
  const [appliedLevel, setAppliedLevel] = useState('');
  const [questionTypeFilter, setQuestionTypeFilter] = useState('');
  const [appliedQuestionType, setAppliedQuestionType] = useState('');

  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(false);

  const [allSubjects, setAllSubjects] = useState([]);
  const [allCourses, setAllCourses] = useState([]);
  const [allQuestionTypes, setAllQuestionTypes] = useState([]);
  const [levels, setLevels] = useState({});

  const [courseFilter, setCourseFilter] = useState('');
  const [subjectFilter, setSubjectFilter] = useState('');
  const [appliedCourse, setAppliedCourse] = useState('');
  const [appliedSubject, setAppliedSubject] = useState('');

  // Chapter filter
  const [chapterFilter, setChapterFilter] = useState('');
  const [appliedChapter, setAppliedChapter] = useState('');
  const [chaptersForSubject, setChaptersForSubject] = useState([]);

  // ------- global search -------
  const [searchText, setSearchText] = useState('');
  const [semanticRows, setSemanticRows] = useState(null);
  const [semanticLoading, setSemanticLoading] = useState(false);

  // ------- pagination (MUI X v5) -------
  const [pageSize, setPageSize] = useState(10);

  // ------- edit dialog -------
  const [editOpen, setEditOpen] = useState(false);
  const [editRow, setEditRow] = useState(null);
  const [editTabValue, setEditTabValue] = useState(0);
  const [editLoading, setEditLoading] = useState(false);
  const [uploadingImage, setUploadingImage] = useState('');

  // chapters in edit dialog
  const [editChapters, setEditChapters] = useState([]);

  const fetchCategoriesSubjectsCourses = async () => {
    try {
      const subjectsRes = await fetch('/api/admin/subjects-all');
      const subjectsJson = await subjectsRes.json();
      setAllSubjects(Array.isArray(subjectsJson) ? subjectsJson : []);
    } catch (e) {
      console.error('Error fetching subjects:', e);
      setAllSubjects([]);
    }

    try {
      const coursesRes = await fetch('/api/admin/courses-all');
      const coursesJson = await coursesRes.json();
      setAllCourses(Array.isArray(coursesJson) ? coursesJson : []);
    } catch (e) {
      console.error('Error fetching courses:', e);
      setAllCourses([]);
    }
  };

  const fetchLevels = async () => {
    try {
      const levelsRes = await fetch("/api/admin/difficulty-levels");
      const levelsData = await levelsRes.json();
      const map = {};
      if (Array.isArray(levelsData)) {
        levelsData.forEach(l => { map[l.level_id] = l.level_name; });
      }
      setLevels(map);
    } catch (e) {
      console.error('Error fetching levels:', e);
      setLevels({});
    }
  };

  const fetchQuestionTypes = async () => {
    try {
      const response = await fetch('/api/admin/question-types');
      const data = await response.json();
      if (Array.isArray(data)) setAllQuestionTypes(data);
    } catch (error) {
      console.error('Error fetching question types:', error);
    }
  };

  const fetchQuestions = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/admin/questions");
      const data = await res.json();
      setRows(Array.isArray(data) ? data : []);
    } catch (err) {
      setRows([]);
    }
    setLoading(false);
  };

  // fetch chapters utility
  const fetchChapters = async (subjectId) => {
    if (!subjectId) return [];
    try {
      const res = await fetch(`/api/admin/chapters?subject_id=${subjectId}`);
      const data = await res.json();
      return Array.isArray(data) ? data : [];
    } catch (e) {
      console.error('Error fetching chapters:', e);
      return [];
    }
  };

  // top SUBJECT filter -> chapters for filters
  useEffect(() => {
    (async () => {
      if (subjectFilter) {
        const list = await fetchChapters(subjectFilter);
        setChaptersForSubject(list);
      } else {
        setChaptersForSubject([]);
      }
      setChapterFilter('');
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [subjectFilter]);

  // edit subject -> chapters in edit dialog
  useEffect(() => {
    (async () => {
      const sid = editRow?.subject_id;
      if (sid) {
        const list = await fetchChapters(sid);
        setEditChapters(list);
      } else {
        setEditChapters([]);
      }
    })();
  }, [editRow?.subject_id]);

  useEffect(() => {
    (async () => {
      await fetchLevels();
      await fetchQuestionTypes();
      await fetchQuestions();
      await fetchCategoriesSubjectsCourses();
    })();
    // eslint-disable-next-line
  }, [reloadFlag]);

  const handleDelete = async (id) => {
    if (!window.confirm("Delete this question?")) return;
    await fetch(`/api/admin/questions/${id}`, { method: "DELETE" });
    fetchQuestions();
  };

  const handleEditOpen = async (row) => {
    setEditLoading(true);
    try {
      const res = await fetch(`/api/admin/questions/${row.id}`);
      if (res.ok) {
        const data = await res.json();
        setEditRow(data);
      } else {
        setEditRow({ id: row.id });
      }
    } catch (e) {
      console.error('Error fetching question:', e);
      setEditRow({ id: row.id });
    } finally {
      setEditLoading(false);
    }
    setEditOpen(true);
    setEditTabValue(0);
  };

  const handleEditClose = () => {
    setEditOpen(false);
    setEditRow(null);
    setEditTabValue(0);
  };

  const handleEditChange = (e) => {
    const { name, value } = e.target;
    setEditRow((prev) => ({ ...prev, [name]: value }));
  };

  const handleEditTabChange = (_e, newValue) => setEditTabValue(newValue);

  const handleImageUpload = async (e, fieldName) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      alert('Please select a valid image file');
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      alert('Image size should be less than 5MB');
      return;
    }

    setUploadingImage(fieldName);
    try {
      const formData = new FormData();
      formData.append('image', file);

      const response = await fetch('/api/admin/upload-image', {
        method: 'POST',
        body: formData,
      });
      const result = await response.json();

      if (result.success) {
        setEditRow(prev => ({ ...prev, [fieldName]: result.imageUrl }));
        alert('Image uploaded successfully');
      } else {
        alert(result.error || 'Image upload failed');
      }
    } catch (error) {
      console.error('Image upload error:', error);
      alert('Image upload failed: ' + error.message);
    } finally {
      setUploadingImage('');
    }
  };

  const handleRemoveImage = (fieldName) => {
    setEditRow(prev => ({ ...prev, [fieldName]: '' }));
  };

  const renderImageField = (fieldName, label) => {
    const isUploading = uploadingImage === fieldName;
    const hasImage = editRow && editRow[fieldName];

    return (
      <Box sx={{ border: '1px solid #e0e0e0', borderRadius: '4px', p: 2, mb: 2, backgroundColor: '#fafafa' }}>
        <Typography variant="body2" sx={{ mb: 2, fontWeight: 600, color: '#344767' }}>{label}</Typography>
        {hasImage ? (
          <Box>
            <Box sx={{ display: 'flex', alignItems: 'flex-start', gap: 2, mb: 2 }}>
              <Box sx={{ cursor: 'pointer' }} onClick={() => window.open(`http://localhost:5000${editRow[fieldName]}`, '_blank')}>
                <img
                  src={`http://localhost:5000${editRow[fieldName]}`}
                  alt={label}
                  style={{ width: '100px', height: '100px', borderRadius: '4px', objectFit: 'cover', border: '2px solid #1976d2' }}
                  title="Click to view full size"
                />
              </Box>
              <Box sx={{ flex: 1 }}>
                <Typography variant="caption" sx={{ display: 'block', mb: 2, wordBreak: 'break-all', color: '#666' }}>
                  {editRow[fieldName]}
                </Typography>
                <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
                  <input accept="image/*" style={{ display: 'none' }} id={`upload-${fieldName}`} type="file"
                         onChange={(e) => handleImageUpload(e, fieldName)} disabled={isUploading} />
                  <label htmlFor={`upload-${fieldName}`}>
                    <ArgonButton component="span" color={isUploading ? "secondary" : "warning"} disabled={isUploading} size="small">
                      {isUploading ? 'Uploading...' : '✏️ Edit'}
                    </ArgonButton>
                  </label>
                  <ArgonButton color="error" size="small" onClick={() => handleRemoveImage(fieldName)}>
                    🗑️ Delete
                  </ArgonButton>
                </Box>
              </Box>
            </Box>
          </Box>
        ) : (
          <Box>
            <input accept="image/*" style={{ display: 'none' }} id={`upload-${fieldName}`} type="file"
                   onChange={(e) => handleImageUpload(e, fieldName)} disabled={isUploading} />
            <label htmlFor={`upload-${fieldName}`}>
              <ArgonButton component="span" color={isUploading ? "secondary" : "success"} disabled={isUploading} size="small" sx={{ mb: 1 }}>
                {isUploading ? 'Uploading...' : '+ Upload Image'}
              </ArgonButton>
            </label>
            <Typography variant="caption" sx={{ display: 'block', color: '#999', mt: 1 }}>
              No image uploaded yet
            </Typography>
          </Box>
        )}
      </Box>
    );
  };

  const handleEditSave = async () => {
    if (!editRow.course_id || !editRow.subject_id || !editRow.level_id || !editRow.question_type_id) {
      alert('Please fill all required fields (Course, Subject, Level, Question Type)');
      return;
    }
    setEditLoading(true);
    try {
      const updateData = {
        course_id: editRow.course_id,
        subject_id: editRow.subject_id,
        chapter_id: editRow.chapter_id || null,
        level_id: editRow.level_id,
        question_type_id: editRow.question_type_id,
        question_text: editRow.question_text || '',
        option1: editRow.option1 || null,
        option2: editRow.option2 || null,
        option3: editRow.option3 || null,
        option4: editRow.option4 || null,
        answer: editRow.answer || '',
        class: editRow.class || null,
        schoolname: editRow.schoolname || '',
        question_image: editRow.question_image || null,
        option1_image: editRow.option1_image || null,
        option2_image: editRow.option2_image || null,
        option3_image: editRow.option3_image || null,
        option4_image: editRow.option4_image || null,
        answer_image: editRow.answer_image || null
      };

      const response = await fetch(`/api/admin/questions/${editRow.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updateData),
      });

      if (response.ok) {
        alert('Question updated successfully!');
        setEditOpen(false);
        setEditRow(null);
        fetchQuestions();
      } else {
        const errorData = await response.json().catch(() => ({}));
        alert('Error updating question: ' + (errorData.error || 'Unknown error'));
      }
    } catch (error) {
      console.error('Update error:', error);
      alert('Error updating question: ' + error.message);
    } finally {
      setEditLoading(false);
    }
  };

  // duplicate detector
  const duplicateQuestionTexts = useMemo(() => {
    const textCount = {};
    (Array.isArray(rows) ? rows : []).forEach(row => {
      const text = (row.question_text || '').trim();
      if (text) textCount[text] = (textCount[text] || 0) + 1;
    });
    return textCount;
  }, [rows]);

  const columns = [
    { field: 'id', headerName: 'ID', width: 70 },
    {
      field: 'question_text',
      headerName: 'Question',
      width: 250,
      renderCell: (params) => {
        const text = (params.row.question_text || '').trim();
        const isDuplicate = (duplicateQuestionTexts[text] || 0) > 1;
        return (
          <span style={{ color: isDuplicate ? 'red' : undefined, fontWeight: isDuplicate ? 600 : undefined }}>
            {params.row.question_text}
          </span>
        );
      }
    },
    {
      field: 'question_image',
      headerName: 'Q.Image',
      width: 100,
      renderCell: (params) =>
        params.row.question_image ? (
          <img
            src={`http://localhost:5000${params.row.question_image}`}
            alt="Question"
            style={{ width: '40px', height: '30px', objectFit: 'cover', cursor: 'pointer' }}
            onClick={() => window.open(`http://localhost:5000${params.row.question_image}`, '_blank')}
            title="Click to view full size"
          />
        ) : '-'
    },
    {
      field: 'option1', headerName: 'Option1', width: 120,
      renderCell: (p) =>
        p.row.type === 'Image-Based' && !p.row.option1 && p.row.option1_image ? 'Image Option' : p.row.option1 || '-'
    },
    {
      field: 'option1_image', headerName: 'Opt1 Img', width: 80,
      renderCell: (p) =>
        p.row.option1_image ? (
          <img
            src={`http://localhost:5000${p.row.option1_image}`}
            alt="Option 1"
            style={{ width: '30px', height: '25px', objectFit: 'cover', cursor: 'pointer' }}
            onClick={() => window.open(`http://localhost:5000${p.row.option1_image}`, '_blank')}
            title="Click to view full size"
          />
        ) : '-'
    },
    {
      field: 'option2', headerName: 'Option2', width: 120,
      renderCell: (p) =>
        p.row.type === 'Image-Based' && !p.row.option2 && p.row.option2_image ? 'Image Option' : p.row.option2 || '-'
    },
    {
      field: 'option2_image', headerName: 'Opt2 Img', width: 80,
      renderCell: (p) =>
        p.row.option2_image ? (
          <img
            src={`http://localhost:5000${p.row.option2_image}`}
            alt="Option 2"
            style={{ width: '30px', height: '25px', objectFit: 'cover', cursor: 'pointer' }}
            onClick={() => window.open(`http://localhost:5000${p.row.option2_image}`, '_blank')}
            title="Click to view full size"
          />
        ) : '-'
    },
    {
      field: 'option3', headerName: 'Option3', width: 120,
      renderCell: (p) =>
        p.row.type === 'Image-Based' && !p.row.option3 && p.row.option3_image ? 'Image Option' : p.row.option3 || '-'
    },
    {
      field: 'option3_image', headerName: 'Opt3 Img', width: 80,
      renderCell: (p) =>
        p.row.option3_image ? (
          <img
            src={`http://localhost:5000${p.row.option3_image}`}
            alt="Option 3"
            style={{ width: '30px', height: '25px', objectFit: 'cover', cursor: 'pointer' }}
            onClick={() => window.open(`http://localhost:5000${p.row.option3_image}`, '_blank')}
            title="Click to view full size"
          />
        ) : '-'
    },
    {
      field: 'option4', headerName: 'Option4', width: 120,
      renderCell: (p) =>
        p.row.type === 'Image-Based' && !p.row.option4 && p.row.option4_image ? 'Image Option' : p.row.option4 || '-'
    },
    {
      field: 'option4_image', headerName: 'Opt4 Img', width: 80,
      renderCell: (p) =>
        p.row.option4_image ? (
          <img
            src={`http://localhost:5000${p.row.option4_image}`}
            alt="Option 4"
            style={{ width: '30px', height: '25px', objectFit: 'cover', cursor: 'pointer' }}
            onClick={() => window.open(`http://localhost:5000${p.row.option4_image}`, '_blank')}
            title="Click to view full size"
          />
        ) : '-'
    },
    { field: 'answer', headerName: 'Answer', width: 120 },
    { field: 'type', headerName: 'Type', width: 100 },
    {
      field: 'level_id',
      headerName: 'Level',
      width: 120,
      valueGetter: (params) => levels[params.row.level_id] || params.row.level_id,
    },
    { field: 'subject_name', headerName: 'Subject', width: 160 },
    { field: 'course_name', headerName: 'Course', width: 160 },
    {
      field: 'actions',
      headerName: 'Actions',
      width: 180,
      renderCell: (params) => (
        <>
          <ArgonButton color="info" size="small" style={{ marginRight: 8 }} onClick={() => handleEditOpen(params.row)}>
            Edit
          </ArgonButton>
          <ArgonButton color="error" size="small" onClick={() => handleDelete(params.row.id)}>
            Delete
          </ArgonButton>
        </>
      ),
    },
  ];

  // top filtered rows
  const filteredRows = (Array.isArray(rows) ? rows : []).filter(row => {
    const toStr = (v) => (v === null || v === undefined ? '' : String(v));
    let subjectMatch = true;
    let courseMatch = true;
    let levelMatch = true;
    let questionTypeMatch = true;
    let chapterMatch = true;

    if (appliedSubject) subjectMatch = toStr(row.subject_id) === toStr(appliedSubject) || toStr(row.subject_name) === toStr(appliedSubject);
    if (appliedCourse) courseMatch = toStr(row.course_id) === toStr(appliedCourse) || toStr(row.course_name) === toStr(appliedCourse);
    if (appliedLevel) levelMatch = toStr(row.level_id) === toStr(appliedLevel) || toStr(levels[row.level_id]) === toStr(appliedLevel);
    if (appliedQuestionType) questionTypeMatch = toStr(row.question_type_id) === toStr(appliedQuestionType) || toStr(row.type) === toStr(appliedQuestionType);
    if (appliedChapter) chapterMatch = toStr(row.chapter_id) === toStr(appliedChapter) || toStr(row.chapter_name) === toStr(appliedChapter);

    return subjectMatch && courseMatch && levelMatch && questionTypeMatch && chapterMatch;
  });

  // global search on filtered rows
  const searchedRows = useMemo(() => {
    const q = searchText.trim().toLowerCase();
    if (!q) return filteredRows;
    return filteredRows.filter(r => {
      const bag = [
        r.question_text, r.option1, r.option2, r.option3, r.option4,
        r.answer, r.subject_name, r.course_name, r.type, r.chapter_name,
        levels[r.level_id]
      ]
        .filter(Boolean)
        .join(' ')
        .toLowerCase();
      return bag.includes(q);
    });
  }, [filteredRows, searchText, levels]);

  const runSemanticSearch = async () => {
    const query = searchText.trim();
    if (!query) return;
    setSemanticLoading(true);
    try {
      const response = await fetch('/api/ml/search-questions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          query,
          course_id: appliedCourse || courseFilter || undefined,
          subject_id: appliedSubject || subjectFilter || undefined,
          chapter_id: appliedChapter || chapterFilter || undefined,
          level_id: appliedLevel || levelFilter || undefined,
          question_type_id: appliedQuestionType || questionTypeFilter || undefined,
          top_k: 80,
        }),
      });
      const data = await response.json();
      const ranked = Array.isArray(data.results)
        ? data.results.map((row) => ({
            ...row,
            id: row.id || row.question_id,
            type: row.type || row.type_name,
          }))
        : [];
      setSemanticRows(ranked);
    } catch (error) {
      setSemanticRows([]);
    } finally {
      setSemanticLoading(false);
    }
  };

  const displayRows = semanticRows || searchedRows;

  const downloadExcelReport = () => {
    const data = displayRows.map(q => ([
      q.question_text || '',
      q.option1 || '',
      q.option2 || '',
      q.option3 || '',
      q.option4 || '',
      q.answer || '',
      q.class || '',
      q.schoolname || '',
      q.question_image || '',
      q.option1_image || '',
      q.option2_image || '',
      q.option3_image || '',
      q.option4_image || '',
      q.answer_image || ''
    ]));
    const header = [
      'question_text',
      'option1',
      'option2',
      'option3',
      'option4',
      'answer',
      'class',
      'schoolname',
      'question_image',
      'option1_image',
      'option2_image',
      'option3_image',
      'option4_image',
      'answer_image'
    ];
    const ws = XLSX.utils.aoa_to_sheet([header, ...data]);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Questions Report");
    XLSX.writeFile(wb, "questions_report.xlsx");
  };

  return (
    <>
      {/* Filters row */}
      <div style={{ display: 'flex', gap: 16, marginBottom: 16, alignItems: 'center', flexWrap: 'wrap' }}>
        <FormControl style={{ minWidth: 180 }} size="small">
          <CustomDropdown
            label="Course"
            options={[{ value: '', label: 'All' }, ...allCourses.map(c => ({ value: c.course_id, label: c.course_name }))]}
            value={courseFilter}
            onChange={setCourseFilter}
            placeholder="Select Course"
            style={{ minWidth: 180 }}
          />
        </FormControl>

        <FormControl style={{ minWidth: 180 }} size="small">
          <CustomDropdown
            label="Subject"
            options={[{ value: '', label: 'All' }, ...allSubjects
              .filter(s => !courseFilter || String(s.course_id) === String(courseFilter))
              .map(s => ({ value: s.subject_id, label: s.subject_name }))]}
            value={subjectFilter}
            onChange={setSubjectFilter}
            placeholder="Select Subject"
            style={{ minWidth: 180 }}
          />
        </FormControl>

        <FormControl style={{ minWidth: 180 }} size="small">
          <CustomDropdown
            label="Chapter"
            options={[{ value: '', label: 'All' }, ...chaptersForSubject.map(ch => ({ value: ch.chapter_id, label: ch.chapter_name }))]}
            value={chapterFilter}
            onChange={setChapterFilter}
            placeholder="Select Chapter"
            style={{ minWidth: 180 }}
          />
        </FormControl>

        <FormControl style={{ minWidth: 180 }} size="small">
          <CustomDropdown
            label="Level"
            options={[{ value: '', label: 'All' }, ...Object.entries(levels).map(([id, name]) => ({ value: id, label: name }))]}
            value={levelFilter}
            onChange={setLevelFilter}
            placeholder="Select Level"
            style={{ minWidth: 180 }}
          />
        </FormControl>

        <FormControl style={{ minWidth: 180 }} size="small">
          <CustomDropdown
            label="Question Type"
            options={[{ value: '', label: 'All' }, ...allQuestionTypes.map(qt => ({ value: qt.question_type_id, label: qt.type_name }))]}
            value={questionTypeFilter}
            onChange={setQuestionTypeFilter}
            placeholder="Select Question Type"
            style={{ minWidth: 180 }}
          />
        </FormControl>

        <ArgonButton
          color="info"
          style={{ height: 40 }}
          onClick={() => {
            setAppliedCourse(courseFilter);
            setAppliedSubject(subjectFilter);
            setAppliedLevel(levelFilter);
            setAppliedQuestionType(questionTypeFilter);
            setAppliedChapter(chapterFilter);
          }}
        >
          Get Report
        </ArgonButton>

        <ArgonButton color="success" style={{ height: 40 }} onClick={downloadExcelReport} startIcon={<DownloadIcon />}>
          Download Report
        </ArgonButton>
      </div>

      {/* Global Search Bar */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 }}>
        <TextField
          fullWidth
          size="small"
          label="Search All Questions"
          value={searchText}
          onChange={(e) => {
            setSearchText(e.target.value);
            setSemanticRows(null);
          }}
          onKeyDown={(event) => {
            if (event.key === 'Enter') {
              event.preventDefault();
              runSemanticSearch();
            }
          }}
          InputProps={{
            startAdornment: (
              <InputAdornment position="start">
                <SearchIcon fontSize="small" />
              </InputAdornment>
            ),
            endAdornment: searchText ? (
              <InputAdornment position="end">
                <IconButton aria-label="clear search" size="small" onClick={() => setSearchText('')}>
                  <ClearIcon fontSize="small" />
                </IconButton>
              </InputAdornment>
            ) : null
          }}
        />
        <ArgonButton color="info" style={{ height: 40, whiteSpace: 'nowrap' }} onClick={runSemanticSearch} disabled={semanticLoading || !searchText.trim()}>
          {semanticLoading ? 'Searching...' : 'Semantic Search'}
        </ArgonButton>
        {semanticRows && (
          <ArgonButton color="secondary" style={{ height: 40 }} onClick={() => setSemanticRows(null)}>
            Clear AI
          </ArgonButton>
        )}
        <Typography variant="body2" sx={{ whiteSpace: 'nowrap' }}>
          {displayRows.length} result{displayRows.length !== 1 ? 's' : ''}
        </Typography>
      </div>

      <div style={{ width: '100%', marginTop: 8 }}>
        <DataGrid
          autoHeight
          rows={displayRows}
          columns={columns}
          loading={loading}
          disableSelectionOnClick
          pageSize={pageSize}
          onPageSizeChange={(newSize) => setPageSize(newSize)}
          rowsPerPageOptions={[5, 10, 20, 50, 100]}
          componentsProps={{ pagination: { labelRowsPerPage: 'Rows per page' } }}
          sx={{
            '& .MuiTablePagination-toolbar': { paddingLeft: '8px', paddingRight: '8px' },
            '& .MuiTablePagination-displayedRows': { margin: 0 },
            '& .MuiTablePagination-actions': { marginRight: '8px' },
          }}
        />
      </div>

      {/* Edit dialog */}
      <Dialog open={editOpen} onClose={handleEditClose} maxWidth="md" fullWidth>
        <DialogTitle sx={{ bgcolor: '#1976d2', color: '#fff', fontWeight: 600 }}>
          Edit Question #{editRow?.id}
        </DialogTitle>
        <DialogContent sx={{ mt: 2 }}>
          {editLoading ? (
            <Typography>Loading question details...</Typography>
          ) : editRow ? (
            <>
              <Tabs value={editTabValue} onChange={handleEditTabChange} sx={{ mb: 2 }}>
                <Tab label="Category & Classification" />
                <Tab label="Question & Options" />
                <Tab label="Answer & Additional Info" />
              </Tabs>

              {editTabValue === 0 && (
                <Card>
                  <CardContent>
                    <Grid container spacing={2}>
                      <Grid item xs={12} md={6}>
                        <FormControl fullWidth required>
                          <InputLabel id="edit-course-label">Course</InputLabel>
                          <Select
                            labelId="edit-course-label"
                            name="course_id"
                            value={editRow.course_id || ''}
                            onChange={handleEditChange}
                            required
                            label="Course"
                          >
                            {allCourses.length ? (
                              allCourses.map(c => (
                                <MenuItem key={c.course_id} value={c.course_id}>{c.course_name}</MenuItem>
                              ))
                            ) : (
                              <MenuItem value="">No courses available</MenuItem>
                            )}
                          </Select>
                        </FormControl>
                      </Grid>

                      <Grid item xs={12} md={6}>
                        <FormControl fullWidth required>
                          <InputLabel id="edit-subject-label">Subject</InputLabel>
                          <Select
                            labelId="edit-subject-label"
                            name="subject_id"
                            value={editRow.subject_id || ''}
                            onChange={handleEditChange}
                            required
                            label="Subject"
                          >
                            {allSubjects
                              .filter(s => !editRow.course_id || String(s.course_id) === String(editRow.course_id))
                              .map(s => (
                                <MenuItem key={s.subject_id} value={s.subject_id}>{s.subject_name}</MenuItem>
                              ))}
                          </Select>
                        </FormControl>
                      </Grid>

                      <Grid item xs={12} md={6}>
                        <FormControl fullWidth>
                          <InputLabel id="edit-chapter-label">Chapter</InputLabel>
                          <Select
                            labelId="edit-chapter-label"
                            name="chapter_id"
                            value={editRow.chapter_id || ''}
                            onChange={handleEditChange}
                            label="Chapter"
                          >
                            {editChapters.length ? (
                              editChapters.map(ch => (
                                <MenuItem key={ch.chapter_id} value={ch.chapter_id}>{ch.chapter_name}</MenuItem>
                              ))
                            ) : (
                              <MenuItem value="">No chapters available</MenuItem>
                            )}
                          </Select>
                        </FormControl>
                      </Grid>

                      <Grid item xs={12} md={6}>
                        <FormControl fullWidth required>
                          <InputLabel id="edit-level-label">Difficulty Level</InputLabel>
                          <Select
                            labelId="edit-level-label"
                            name="level_id"
                            value={editRow.level_id || ''}
                            onChange={handleEditChange}
                            required
                            label="Difficulty Level"
                          >
                            {Object.entries(levels).length ? (
                              Object.entries(levels).map(([id, name]) => (
                                <MenuItem key={id} value={parseInt(id, 10)}>{name}</MenuItem>
                              ))
                            ) : (
                              <MenuItem value="">No levels available</MenuItem>
                            )}
                          </Select>
                        </FormControl>
                      </Grid>

                      <Grid item xs={12} md={6}>
                        <FormControl fullWidth required>
                          <InputLabel id="edit-question-type-label">Question Type</InputLabel>
                          <Select
                            labelId="edit-question-type-label"
                            name="question_type_id"
                            value={editRow.question_type_id || ''}
                            onChange={handleEditChange}
                            required
                            label="Question Type"
                          >
                            {allQuestionTypes.length ? (
                              allQuestionTypes.map(qt => (
                                <MenuItem key={qt.question_type_id} value={qt.question_type_id}>{qt.type_name}</MenuItem>
                              ))
                            ) : (
                              <MenuItem value="">No question types available</MenuItem>
                            )}
                          </Select>
                        </FormControl>
                      </Grid>

                      <Grid item xs={12} md={6}>
                        <StyledTextField label="Class" name="class" value={editRow.class || ''} onChange={handleEditChange} fullWidth />
                      </Grid>
                      <Grid item xs={12} md={6}>
                        <StyledTextField label="School Name" name="schoolname" value={editRow.schoolname || ''} onChange={handleEditChange} fullWidth />
                      </Grid>
                    </Grid>
                  </CardContent>
                </Card>
              )}

              {editTabValue === 1 && (
                <Card>
                  <CardContent>
                    <Grid container spacing={2}>
                      <Grid item xs={12}>
                        <StyledTextField
                          label="Question Text"
                          name="question_text"
                          value={editRow.question_text || ''}
                          onChange={handleEditChange}
                          fullWidth
                          multiline
                          rows={3}
                        />
                      </Grid>

                      <Grid item xs={12}>
                        {renderImageField('question_image', 'Question Image')}
                      </Grid>

                      <Grid item xs={12} md={6}>
                        <StyledTextField label="Option 1" name="option1" value={editRow.option1 || ''} onChange={handleEditChange} fullWidth />
                      </Grid>
                      <Grid item xs={12} md={6}>
                        {renderImageField('option1_image', 'Option 1 Image')}
                      </Grid>

                      <Grid item xs={12} md={6}>
                        <StyledTextField label="Option 2" name="option2" value={editRow.option2 || ''} onChange={handleEditChange} fullWidth />
                      </Grid>
                      <Grid item xs={12} md={6}>
                        {renderImageField('option2_image', 'Option 2 Image')}
                      </Grid>

                      <Grid item xs={12} md={6}>
                        <StyledTextField label="Option 3" name="option3" value={editRow.option3 || ''} onChange={handleEditChange} fullWidth />
                      </Grid>
                      <Grid item xs={12} md={6}>
                        {renderImageField('option3_image', 'Option 3 Image')}
                      </Grid>

                      <Grid item xs={12} md={6}>
                        <StyledTextField label="Option 4" name="option4" value={editRow.option4 || ''} onChange={handleEditChange} fullWidth />
                      </Grid>
                      <Grid item xs={12} md={6}>
                        {renderImageField('option4_image', 'Option 4 Image')}
                      </Grid>
                    </Grid>
                  </CardContent>
                </Card>
              )}

              {editTabValue === 2 && (
                <Card>
                  <CardContent>
                    <Grid container spacing={2}>
                      <Grid item xs={12}>
                        <StyledTextField
                          label="Correct Answer"
                          name="answer"
                          value={editRow.answer || ''}
                          onChange={handleEditChange}
                          fullWidth
                          multiline
                          rows={2}
                        />
                      </Grid>
                      <Grid item xs={12}>
                        {renderImageField('answer_image', 'Answer Image')}
                      </Grid>
                    </Grid>
                  </CardContent>
                </Card>
              )}
            </>
          ) : (
            <Typography>Error loading question details</Typography>
          )}
        </DialogContent>
        <DialogActions sx={{ p: 2, gap: 1 }}>
          <ArgonButton color="secondary" onClick={handleEditClose} disabled={editLoading}>
            Cancel
          </ArgonButton>
          <ArgonButton color="success" onClick={handleEditSave} disabled={editLoading}>
            {editLoading ? 'Saving...' : 'Save Changes'}
          </ArgonButton>
        </DialogActions>
      </Dialog>
    </>
  );
}

QuestionTable.propTypes = {
  reloadFlag: PropTypes.bool.isRequired,
};

export default QuestionTable;

