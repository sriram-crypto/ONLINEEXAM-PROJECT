import React, { useEffect, useState } from "react";
import ArgonBox from "components/ArgonBox";
import ArgonTypography from "components/ArgonTypography";
import ArgonButton from "components/ArgonButton";
import DialogActions from "@mui/material/DialogActions";
import TextField from "@mui/material/TextField";
import Dialog from "@mui/material/Dialog";
import DialogTitle from "@mui/material/DialogTitle";
import DialogContent from "@mui/material/DialogContent";
import IconButton from "@mui/material/IconButton";
import MoreVertIcon from "@mui/icons-material/MoreVert";
import Menu from "@mui/material/Menu";
import MenuItem from "@mui/material/MenuItem";

function EditDeleteSetup() {
	// Categories state
	const [categories, setCategories] = useState([]);
	const [loading, setLoading] = useState(true);
	const [error, setError] = useState(null);

	// Courses popup state
	const [open, setOpen] = useState(false);
	const [selectedCategory, setSelectedCategory] = useState(null);
	const [courses, setCourses] = useState([]);
	const [coursesLoading, setCoursesLoading] = useState(false);
	const [coursesError, setCoursesError] = useState(null);

	// Course actions menu state
	const [menuAnchorEl, setMenuAnchorEl] = useState(null);
	const [menuCourseId, setMenuCourseId] = useState(null);

	// Edit course popup state
	const [editDialogOpen, setEditDialogOpen] = useState(false);
	const [editCourseId, setEditCourseId] = useState(null);
	const [editCourseName, setEditCourseName] = useState("");
	const [editCourseLoading, setEditCourseLoading] = useState(false);
	const [editCourseError, setEditCourseError] = useState(null);

	// Subjects popup state
	const [subjectsDialogOpen, setSubjectsDialogOpen] = useState(false);
	const [subjectsLoading, setSubjectsLoading] = useState(false);
	const [subjectsError, setSubjectsError] = useState(null);
	const [subjects, setSubjects] = useState([]);
	const [subjectsCourseName, setSubjectsCourseName] = useState("");

	// Subject actions menu state
	const [subjectsMenuAnchorEl, setSubjectsMenuAnchorEl] = useState(null);
	const [subjectsMenuId, setSubjectsMenuId] = useState(null);

	// Subject edit dialog state
	const [editSubjectDialogOpen, setEditSubjectDialogOpen] = useState(false);
	const [editSubjectId, setEditSubjectId] = useState(null);
	const [editSubjectName, setEditSubjectName] = useState("");
	const [editSubjectLoading, setEditSubjectLoading] = useState(false);
	const [editSubjectError, setEditSubjectError] = useState(null);

	// Chapters popup state
	const [chaptersDialogOpen, setChaptersDialogOpen] = useState(false);
	const [chaptersLoading, setChaptersLoading] = useState(false);
	const [chaptersError, setChaptersError] = useState(null);
	const [chapters, setChapters] = useState([]);
	const [chaptersSubjectName, setChaptersSubjectName] = useState("");
	const [chaptersMenuAnchorEl, setChaptersMenuAnchorEl] = useState(null);
	const [chaptersMenuId, setChaptersMenuId] = useState(null);

	// Edit Chapter dialog state
	const [editChapterDialogOpen, setEditChapterDialogOpen] = useState(false);
	const [editChapterId, setEditChapterId] = useState(null);
	const [editChapterName, setEditChapterName] = useState("");
	const [editChapterLoading, setEditChapterLoading] = useState(false);
	const [editChapterError, setEditChapterError] = useState(null);

	// Load categories on component mount
	useEffect(() => {
		fetch("/api/superadmin/course-categories")
			.then((res) => {
				if (!res.ok) throw new Error("Failed to fetch categories");
				return res.json();
			})
			.then((data) => {
				setCategories(data);
				setLoading(false);
			})
			.catch((err) => {
				setError(err.message);
				setLoading(false);
			});
	}, []);

	// Handler to view courses for a category
	const handleViewCourses = (category) => {
		setSelectedCategory(category);
		setOpen(true);
		setCoursesLoading(true);
		setCoursesError(null);
		fetch(`/api/superadmin/courses/${category.category_id}`)
			.then((res) => {
				if (!res.ok) throw new Error("Failed to fetch courses");
				return res.json();
			})
			.then((data) => {
				setCourses(data);
				setCoursesLoading(false);
			})
			.catch((err) => {
				setCoursesError(err.message);
				setCoursesLoading(false);
			});
	};

	// Course menu handlers
	const handleMenuOpen = (event, courseId) => {
		setMenuAnchorEl(event.currentTarget);
		setMenuCourseId(courseId);
	};

	const handleMenuClose = () => {
		setMenuAnchorEl(null);
		setMenuCourseId(null);
	};

	// Edit course handlers
	const handleEditCourseOpen = (course) => {
		setEditCourseId(course.course_id);
		setEditCourseName(course.course_name);
		setEditDialogOpen(true);
		handleMenuClose();
		setEditCourseError(null);
	};

	const handleEditCourseClose = () => {
		setEditDialogOpen(false);
		setEditCourseId(null);
		setEditCourseName("");
		setEditCourseError(null);
	};

	const handleEditCourseSave = () => {
		if (!editCourseName.trim()) {
			setEditCourseError("Course name cannot be empty");
			return;
		}
		setEditCourseLoading(true);
		setEditCourseError(null);
		fetch(`/api/superadmin/courses/${editCourseId}`, {
			method: "PUT",
			headers: { "Content-Type": "application/json" },
			body: JSON.stringify({ course_name: editCourseName })
		})
			.then((res) => {
				if (!res.ok) throw new Error("Failed to update course name");
				return res.json();
			})
			.then(() => {
				// Update course name in local state
				setCourses((prev) => prev.map((c) => c.course_id === editCourseId ? { ...c, course_name: editCourseName } : c));
				setEditDialogOpen(false);
				setEditCourseLoading(false);
			})
			.catch((err) => {
				setEditCourseError(err.message);
				setEditCourseLoading(false);
			});
	};

	const handleEditSubjectOpen = (subject) => {
		setEditSubjectId(subject.subject_id);
		setEditSubjectName(subject.subject_name);
		setEditSubjectDialogOpen(true);
		setEditSubjectError(null);
	};

	const handleEditSubjectClose = () => {
		setEditSubjectDialogOpen(false);
		setEditSubjectId(null);
		setEditSubjectName("");
		setEditSubjectError(null);
	};

	const handleEditSubjectSave = () => {
		if (!editSubjectName.trim()) {
			setEditSubjectError("Subject name cannot be empty");
			return;
		}
		setEditSubjectLoading(true);
		setEditSubjectError(null);
		fetch(`/api/superadmin/subjects/${editSubjectId}`, {
			method: "PUT",
			headers: { "Content-Type": "application/json" },
			body: JSON.stringify({ subject_name: editSubjectName })
		})
			.then((res) => {
				if (!res.ok) throw new Error("Failed to update subject name");
				return res.json();
			})
			.then(() => {
				setSubjects((prev) => prev.map((subject) => (
					subject.subject_id === editSubjectId ? { ...subject, subject_name: editSubjectName } : subject
				)));
				setEditSubjectLoading(false);
				handleEditSubjectClose();
			})
			.catch((err) => {
				setEditSubjectError(err.message);
				setEditSubjectLoading(false);
			});
	};

	// Delete course handler
	const handleDeleteCourse = (courseId) => {
		if (!window.confirm('Are you sure you want to delete this course?')) return;
		fetch(`/api/superadmin/courses/${courseId}`, {
			method: 'DELETE',
		})
			.then((res) => res.json())
			.then((data) => {
				if (data.success) {
					setCourses((prev) => prev.filter((c) => c.course_id !== courseId));
					handleMenuClose();
				} else {
					alert(data.error || 'Could not delete course.');
					handleMenuClose();
				}
			})
			.catch(() => {
				alert('Could not delete course.');
				handleMenuClose();
			});
	};

	// Handler to view subjects for a course
	const handleViewSubjects = (course) => {
		setSubjectsDialogOpen(true);
		setSubjectsLoading(true);
		setSubjectsError(null);
		setSubjects([]);
		setSubjectsCourseName(course.course_name);
		fetch(`/api/superadmin/courses/${course.course_id}/subjects`)
			.then((res) => {
				if (!res.ok) throw new Error("Failed to fetch subjects");
				return res.json();
			})
			.then((data) => {
				setSubjects(data);
				setSubjectsLoading(false);
			})
			.catch((err) => {
				setSubjectsError(err.message);
				setSubjectsLoading(false);
			});
		handleMenuClose();
	};

	// Handler to view chapters for a subject
	const handleViewChapters = (subject) => {
		setChaptersDialogOpen(true);
		setChaptersLoading(true);
		setChaptersError(null);
		setChapters([]);
		setChaptersSubjectName(subject.subject_name);
		fetch(`/api/superadmin/subjects/${subject.subject_id}/chapters`)
			.then((res) => {
				if (!res.ok) throw new Error("Failed to fetch chapters");
				return res.json();
			})
			.then((data) => {
				setChapters(data);
				setChaptersLoading(false);
			})
			.catch((err) => {
				setChaptersError(err.message);
				setChaptersLoading(false);
			});
	};

	return (
		<ArgonBox py={4}>
			<ArgonTypography variant="h4" mb={2} textAlign="center">
				Edit/Delete Setup
			</ArgonTypography>
			<ArgonTypography variant="body1" mb={4} textAlign="center">
				Below are the course categories. Click "View Course" to see details.
			</ArgonTypography>
			{loading ? (
				<ArgonTypography variant="body2">Loading...</ArgonTypography>
			) : error ? (
				<ArgonTypography color="error" variant="body2">{error}</ArgonTypography>
			) : (
				<ArgonBox mx="auto" maxWidth={700}>
					<table style={{ width: "100%", borderCollapse: "collapse", margin: "0 auto" }}>
						<thead>
							<tr style={{ background: "#f5f5f5" }}>
								<th style={{ padding: "10px", border: "1px solid #ddd" }}>ID</th>
								<th style={{ padding: "10px", border: "1px solid #ddd" }}>Category Name</th>
								<th style={{ padding: "10px", border: "1px solid #ddd" }}>View Course</th>
							</tr>
						</thead>
						<tbody>
							{categories.map((cat) => (
								<tr key={cat.category_id}>
									<td style={{ padding: "10px", border: "1px solid #ddd", textAlign: "center" }}>{cat.category_id}</td>
									<td style={{ padding: "10px", border: "1px solid #ddd", textTransform: "uppercase" }}>{cat.category_name}</td>
									<td style={{ padding: "10px", border: "1px solid #ddd", textAlign: "center" }}>
										<ArgonButton size="small" color="info" onClick={() => handleViewCourses(cat)}>
											View Course
										</ArgonButton>
									</td>
								</tr>
							))}
						</tbody>
					</table>
				</ArgonBox>
			)}

			{/* Courses Popup Dialog */}
			<Dialog open={open} onClose={() => { setOpen(false); setSelectedCategory(null); setCourses([]); }} maxWidth="md" fullWidth>
				<DialogTitle>
					Courses for Category: {selectedCategory?.category_name?.toUpperCase()}
				</DialogTitle>
				<DialogContent>
					{coursesLoading ? (
						<ArgonTypography variant="body2">Loading courses...</ArgonTypography>
					) : coursesError ? (
						<ArgonTypography color="error" variant="body2">{coursesError}</ArgonTypography>
					) : (
						<ArgonBox>
							<table style={{ width: "100%", borderCollapse: "collapse", margin: "0 auto" }}>
								<thead>
									<tr style={{ background: "#f5f5f5" }}>
										<th style={{ padding: "10px", border: "1px solid #ddd" }}>ID</th>
										<th style={{ padding: "10px", border: "1px solid #ddd" }}>Course Name</th>
										<th style={{ padding: "10px", border: "1px solid #ddd" }}>Actions</th>
									</tr>
								</thead>
								<tbody>
									{courses.map((course) => (
										<tr key={course.course_id}>
											<td style={{ padding: "10px", border: "1px solid #ddd", textAlign: "center" }}>{course.course_id}</td>
											<td style={{ padding: "10px", border: "1px solid #ddd", textTransform: "uppercase" }}>{course.course_name}</td>
											<td style={{ padding: "10px", border: "1px solid #ddd", textAlign: "center" }}>
												<IconButton onClick={(e) => handleMenuOpen(e, course.course_id)}>
													<MoreVertIcon />
												</IconButton>
												<Menu
													anchorEl={menuAnchorEl}
													open={menuCourseId === course.course_id}
													onClose={handleMenuClose}
												>
													<MenuItem onClick={() => handleEditCourseOpen(course)}>Edit Course</MenuItem>
													<MenuItem onClick={() => handleDeleteCourse(course.course_id)}>Delete Course</MenuItem>
													<MenuItem onClick={() => handleViewSubjects(course)}>View Subjects</MenuItem>
												</Menu>
											</td>
										</tr>
									))}
								</tbody>
							</table>
						</ArgonBox>
					)}
				</DialogContent>
				<DialogActions>
					<ArgonButton onClick={() => { setOpen(false); setSelectedCategory(null); setCourses([]); }} color="secondary">Close</ArgonButton>
				</DialogActions>
			</Dialog>

			{/* Edit Course Popup */}
			<Dialog open={editDialogOpen} onClose={handleEditCourseClose} maxWidth="xs" fullWidth>
				<DialogTitle>Edit Course Name</DialogTitle>
				<DialogContent>
					<TextField
						label="Course Name"
						value={editCourseName}
						onChange={e => setEditCourseName(e.target.value.toUpperCase())}
						fullWidth
						autoFocus
						margin="normal"
					/>
					{editCourseError && (
						<ArgonTypography color="error" variant="body2">{editCourseError}</ArgonTypography>
					)}
				</DialogContent>
				<DialogActions>
					<ArgonButton onClick={handleEditCourseClose} color="secondary" disabled={editCourseLoading}>
						Close
					</ArgonButton>
					<ArgonButton onClick={handleEditCourseSave} color="success" disabled={editCourseLoading}>
						Save
					</ArgonButton>
				</DialogActions>
			</Dialog>

			{/* Subjects Popup Dialog */}
			<Dialog open={subjectsDialogOpen} onClose={() => setSubjectsDialogOpen(false)} maxWidth="sm" fullWidth>
				<DialogTitle>Subjects for Course: {subjectsCourseName.toUpperCase()}</DialogTitle>
				<DialogContent>
					{subjectsLoading ? (
						<ArgonTypography variant="body2">Loading subjects...</ArgonTypography>
					) : subjectsError ? (
						<ArgonTypography color="error" variant="body2">{subjectsError}</ArgonTypography>
					) : (
						<ArgonBox>
							{subjects.length === 0 ? (
								<ArgonTypography variant="body2">No subjects found for this course.</ArgonTypography>
							) : (
								<table style={{ width: "100%", borderCollapse: "collapse", margin: "0 auto" }}>
									<thead>
										<tr style={{ background: "#f5f5f5" }}>
											<th style={{ padding: "10px", border: "1px solid #ddd" }}>ID</th>
											<th style={{ padding: "10px", border: "1px solid #ddd" }}>Subject Name</th>
												<th style={{ padding: "10px", border: "1px solid #ddd" }}>Actions</th>
										</tr>
									</thead>
									<tbody>
										{subjects.map((subject) => (
											<tr key={subject.subject_id}>
												<td style={{ padding: "10px", border: "1px solid #ddd", textAlign: "center" }}>{subject.subject_id}</td>
												<td style={{ padding: "10px", border: "1px solid #ddd", textTransform: "uppercase" }}>{subject.subject_name}</td>
												<td style={{ padding: "10px", border: "1px solid #ddd", textAlign: "center" }}>
													<IconButton onClick={(e) => { setSubjectsMenuAnchorEl(e.currentTarget); setSubjectsMenuId(subject.subject_id); }}>
														<MoreVertIcon />
													</IconButton>
													<Menu
														anchorEl={subjectsMenuAnchorEl}
														open={subjectsMenuId === subject.subject_id}
														onClose={() => { setSubjectsMenuAnchorEl(null); setSubjectsMenuId(null); }}
													>
														<MenuItem onClick={() => {
															setSubjectsMenuAnchorEl(null);
															setSubjectsMenuId(null);
															handleViewChapters(subject);
														}}>
															View Chapters
														</MenuItem>
														<MenuItem onClick={() => {
															setSubjectsMenuAnchorEl(null);
															setSubjectsMenuId(null);
															handleEditSubjectOpen(subject);
														}}>
															Edit Subject
														</MenuItem>
														<MenuItem onClick={async () => {
															setSubjectsMenuAnchorEl(null);
															setSubjectsMenuId(null);
															if (window.confirm("Are you sure you want to delete this subject?")) {
																try {
																	const res = await fetch(`/api/superadmin/subjects/${subject.subject_id}`, { method: 'DELETE' });
																	const data = await res.json();
																	if (data.success) {
																		setSubjects((prev) => prev.filter((s) => s.subject_id !== subject.subject_id));
																	} else {
																		alert(data.error || 'Could not delete subject.');
																	}
																} catch {
																	alert('Could not delete subject.');
																}
															}
														}}>
															Delete Subject
														</MenuItem>
													</Menu>
												</td>
											</tr>
										))}
									</tbody>
								</table>
							)}
						</ArgonBox>
					)}
				</DialogContent>
				<DialogActions>
					<ArgonButton onClick={() => setSubjectsDialogOpen(false)} color="secondary">Close</ArgonButton>
				</DialogActions>
			</Dialog>

			{/* Edit Subject Dialog */}
			<Dialog open={editSubjectDialogOpen} onClose={handleEditSubjectClose} maxWidth="xs" fullWidth>
				<DialogTitle>Edit Subject Name</DialogTitle>
				<DialogContent>
					<TextField
						label="Subject Name"
						value={editSubjectName}
						onChange={e => setEditSubjectName(e.target.value.toUpperCase())}
						fullWidth
						autoFocus
						margin="normal"
					/>
					{editSubjectError && (
						<ArgonTypography color="error" variant="body2">{editSubjectError}</ArgonTypography>
					)}
				</DialogContent>
				<DialogActions>
					<ArgonButton onClick={handleEditSubjectClose} color="secondary" disabled={editSubjectLoading}>
						Close
					</ArgonButton>
					<ArgonButton onClick={handleEditSubjectSave} color="success" disabled={editSubjectLoading}>
						Save
					</ArgonButton>
				</DialogActions>
			</Dialog>

			{/* Chapters Popup Dialog */}
			<Dialog open={chaptersDialogOpen} onClose={() => setChaptersDialogOpen(false)} maxWidth="sm" fullWidth>
				<DialogTitle>Chapters for Subject: {chaptersSubjectName.toUpperCase()}</DialogTitle>
				<DialogContent>
					{chaptersLoading ? (
						<ArgonTypography variant="body2">Loading chapters...</ArgonTypography>
					) : chaptersError ? (
						<ArgonTypography color="error" variant="body2">{chaptersError}</ArgonTypography>
					) : (
						<ArgonBox>
							{chapters.length === 0 ? (
								<ArgonTypography variant="body2">No chapters found for this subject.</ArgonTypography>
							) : (
								<table style={{ width: "100%", borderCollapse: "collapse", margin: "0 auto" }}>
									<thead>
										<tr style={{ background: "#f5f5f5" }}>
											<th style={{ padding: "10px", border: "1px solid #ddd" }}>ID</th>
											<th style={{ padding: "10px", border: "1px solid #ddd" }}>Chapter Name</th>
											<th style={{ padding: "10px", border: "1px solid #ddd" }}>Actions</th>
										</tr>
									</thead>
									<tbody>
										{chapters.map((chapter) => (
											<tr key={chapter.chapter_id}>
												<td style={{ padding: "10px", border: "1px solid #ddd", textAlign: "center" }}>{chapter.chapter_id}</td>
												<td style={{ padding: "10px", border: "1px solid #ddd", textTransform: "uppercase" }}>{chapter.chapter_name}</td>
												<td style={{ padding: "10px", border: "1px solid #ddd", textAlign: "center" }}>
													<IconButton onClick={(e) => { setChaptersMenuAnchorEl(e.currentTarget); setChaptersMenuId(chapter.chapter_id); }}>
														<MoreVertIcon />
													</IconButton>
													<Menu
														anchorEl={chaptersMenuAnchorEl}
														open={chaptersMenuId === chapter.chapter_id}
														onClose={() => { setChaptersMenuAnchorEl(null); setChaptersMenuId(null); }}
													>
														<MenuItem onClick={() => {
															setChaptersMenuAnchorEl(null);
															setChaptersMenuId(null);
															setEditChapterId(chapter.chapter_id);
															setEditChapterName(chapter.chapter_name);
															setEditChapterDialogOpen(true);
															setEditChapterError(null);
														}}>Edit Chapter</MenuItem>
														<MenuItem onClick={async () => {
															setChaptersMenuAnchorEl(null);
															setChaptersMenuId(null);
															if (window.confirm("Are you sure you want to delete this chapter?")) {
																try {
																	const res = await fetch(`/api/superadmin/chapters/${chapter.chapter_id}`, { method: "DELETE" });
																	const data = await res.json();
																	if (data.success) {
																		setChapters((prev) => prev.filter((c) => c.chapter_id !== chapter.chapter_id));
																	} else {
																		window.alert(data.error || "Could not delete chapter.");
																	}
																} catch (err) {
																	window.alert(err.message || "Could not delete chapter.");
																}
															}
														}}>Delete Chapter</MenuItem>
													</Menu>
												</td>
											</tr>
										))}
									</tbody>
								</table>
							)}
						</ArgonBox>
					)}
				</DialogContent>
				<DialogActions>
					<ArgonButton onClick={() => setChaptersDialogOpen(false)} color="secondary">Close</ArgonButton>
				</DialogActions>
			</Dialog>

			{/* Edit Chapter Dialog */}
			<Dialog open={editChapterDialogOpen} onClose={() => { setEditChapterDialogOpen(false); setEditChapterId(null); setEditChapterName(""); setEditChapterError(null); }} maxWidth="xs" fullWidth>
				<DialogTitle>Edit Chapter Name</DialogTitle>
				<DialogContent>
					<TextField
						label="Chapter Name"
						value={editChapterName}
						onChange={e => setEditChapterName(e.target.value)}
						fullWidth
						autoFocus
						margin="normal"
					/>
					{editChapterError && (
						<ArgonTypography color="error" variant="body2">{editChapterError}</ArgonTypography>
					)}
				</DialogContent>
				<DialogActions>
					<ArgonButton onClick={() => { setEditChapterDialogOpen(false); setEditChapterId(null); setEditChapterName(""); setEditChapterError(null); }} color="secondary" disabled={editChapterLoading}>
						Close
					</ArgonButton>
					<ArgonButton onClick={() => {
						if (!editChapterName.trim()) {
							setEditChapterError("Chapter name cannot be empty");
							return;
						}
						setEditChapterLoading(true);
						setEditChapterError(null);
						fetch(`/api/superadmin/chapters/${editChapterId}`, {
							method: "PUT",
							headers: { "Content-Type": "application/json" },
							body: JSON.stringify({ chapter_name: editChapterName })
						})
							.then((res) => {
								if (!res.ok) throw new Error("Failed to update chapter name");
								return res.json();
							})
							.then(() => {
								// Update chapter name in local state
								setChapters((prev) => prev.map((c) => c.chapter_id === editChapterId ? { ...c, chapter_name: editChapterName } : c));
								setEditChapterDialogOpen(false);
								setEditChapterLoading(false);
							})
							.catch((err) => {
								setEditChapterError(err.message);
								setEditChapterLoading(false);
							});
					}} color="success" disabled={editChapterLoading}>
						Save
					</ArgonButton>
				</DialogActions>
			</Dialog>
		</ArgonBox>
	);
}

export default EditDeleteSetup;
