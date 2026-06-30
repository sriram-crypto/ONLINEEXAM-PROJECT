import React, { useState } from "react";
import ArgonBox from "components/ArgonBox";
import ArgonTypography from "components/ArgonTypography";
import ArgonButton from "components/ArgonButton";
import { CircularProgress } from "@mui/material";
import * as XLSX from "xlsx";
		// Download Excel template (no is_active column)
		const handleDownloadTemplate = () => {
			const ws = XLSX.utils.aoa_to_sheet([
				["name", "email", "password", "role", "class", "schoolname"]
			]);
			const wb = XLSX.utils.book_new();
			XLSX.utils.book_append_sheet(wb, ws, "UsersTemplate");
			XLSX.writeFile(wb, "school_users_template.xlsx");
		};

function UploadSchoolUsers() {
	const [file, setFile] = useState(null);
	const [uploading, setUploading] = useState(false);
	const [success, setSuccess] = useState("");
	const [error, setError] = useState("");

	const handleFileChange = (e) => {
		setFile(e.target.files[0]);
		setSuccess("");
		setError("");
	};

	const handleUpload = async () => {
		if (!file) {
			setError("Please select a PDF file to upload.");
			return;
		}
		setUploading(true);
		setSuccess("");
		setError("");
		const formData = new FormData();
		formData.append("file", file);
		try {
			const res = await fetch("/api/admin/uploadschoolusers", {
				method: "POST",
				body: formData,
			});
			const data = await res.json();
			if (res.ok && data.success) {
				setSuccess("Users uploaded and saved successfully!");
				setFile(null);
			} else {
				setError(data.error || "Failed to upload users.");
			}
		} catch (err) {
			setError("Error: " + err.message);
		}
		setUploading(false);
	};

	return (
		<ArgonBox width="100%" style={{ display: 'flex', justifyContent: 'center', alignItems: 'flex-start', minHeight: '100vh', background: '#f8f9fa', padding: '32px 0' }}>
			<div style={{ background: '#fff', borderRadius: 18, boxShadow: '0 6px 32px rgba(44,62,80,0.13)', padding: '38px 38px 32px 38px', minWidth: 500, maxWidth: 600, width: '100%' }}>
				<ArgonTypography variant="h4" style={{ fontWeight: 700, color: '#344767', marginBottom: 18, letterSpacing: 0.2, textAlign: 'center' }}>
					Upload School Users
				</ArgonTypography>
				{error && (
					<div style={{ background: '#ffeaea', color: '#d32f2f', borderRadius: 6, padding: '10px 18px', marginBottom: 18, textAlign: 'center', fontWeight: 500, fontSize: 15 }}>{error}</div>
				)}
				{success && (
					<div style={{ background: '#e7fbe7', color: '#388e3c', borderRadius: 6, padding: '10px 18px', marginBottom: 18, textAlign: 'center', fontWeight: 500, fontSize: 15 }}>{success}</div>
				)}
						<div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 24 }}>
							<ArgonButton
								color="success"
								style={{ height: 40, fontWeight: 700, fontSize: 16, borderRadius: 8, padding: '0 28px', letterSpacing: 0.5, marginBottom: 8 }}
								onClick={handleDownloadTemplate}
							>
								⬇️ Download Template
							</ArgonButton>
					<input
						type="file"
						accept=".xlsx,.xls"
						onChange={handleFileChange}
						style={{ marginBottom: 12 }}
						disabled={uploading}
					/>
					<ArgonButton
						color="info"
						style={{ height: 44, fontWeight: 700, fontSize: 17, borderRadius: 8, padding: '0 38px', letterSpacing: 0.5, boxShadow: '0 2px 8px rgba(44,62,80,0.13)', transition: 'box-shadow 0.2s', cursor: 'pointer' }}
						onClick={handleUpload}
						disabled={uploading}
					>
						{uploading ? <CircularProgress size={24} color="inherit" /> : "Upload School Users"}
					</ArgonButton>
				</div>
			</div>
		</ArgonBox>
	);
}

export default UploadSchoolUsers;

