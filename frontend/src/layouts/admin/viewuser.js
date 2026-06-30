import React, { useEffect, useState } from "react";
import { jsPDF } from "jspdf";
import ArgonBox from "components/ArgonBox";
import ArgonTypography from "components/ArgonTypography";
import ArgonButton from "components/ArgonButton";
import Dialog from "@mui/material/Dialog";
import DialogTitle from "@mui/material/DialogTitle";
import DialogContent from "@mui/material/DialogContent";
import DialogActions from "@mui/material/DialogActions";
import StyledTextField from "components/StyledTextField";
import CustomDropdown from "components/CustomDropdown";
import Snackbar from '@mui/material/Snackbar';
import MuiAlert from '@mui/material/Alert';
import Box from "@mui/material/Box";
import { GetApp as DownloadIcon } from "@mui/icons-material";
import * as XLSX from "xlsx";

function ViewUser() {
  const [users, setUsers] = useState([]);
  const [editUser, setEditUser] = useState(null);
  const [form, setForm] = useState({ name: "", email: "", role: "", status: "" });
  const [searchTerm, setSearchTerm] = useState("");
  const [filterRole, setFilterRole] = useState("");
  const [filterStatus, setFilterStatus] = useState("");
  const [filteredUsers, setFilteredUsers] = useState([]);
  const [snackbarOpen, setSnackbarOpen] = useState(false);

  useEffect(() => {
    fetch("/api/superadmin/viewusers")
      .then(res => res.json())
      .then(data => setUsers(data))
      .catch(() => setUsers([]));
  }, []);

  useEffect(() => {
    // simple client-side filtering + search
    let list = Array.isArray(users) ? users.slice() : [];
    if (searchTerm) {
      const q = searchTerm.toLowerCase();
      list = list.filter(u => (u.name || "").toLowerCase().includes(q) || (u.email || "").toLowerCase().includes(q) || String(u.id).includes(q));
    }
    if (filterRole) {
      list = list.filter(u => (u.role || "") === filterRole);
    }
    if (filterStatus) {
      list = list.filter(u => (u.status || "") === filterStatus);
    }
    setFilteredUsers(list);
  }, [users, searchTerm, filterRole, filterStatus]);

  const downloadPdf = () => {
    const doc = new jsPDF();
    doc.setFontSize(14);
    doc.text("User List", 14, 20);
    const startY = 30;
    const rowHeight = 8;
    doc.setFontSize(10);
    // headers
    doc.text("ID", 14, startY);
    doc.text("Name", 30, startY);
    doc.text("Email", 80, startY);
    doc.text("Role", 140, startY);
    doc.text("Status", 170, startY);
    let y = startY + rowHeight;
    const list = filteredUsers.length ? filteredUsers : users;
    list.forEach(u => {
      if (y > 280) {
        doc.addPage();
        y = 20;
      }
      doc.text(String(u.id || ""), 14, y);
      doc.text(String(u.name || ""), 30, y);
      doc.text(String(u.email || ""), 80, y);
      doc.text(String(u.role || ""), 140, y);
      doc.text(String(u.status || ""), 170, y);
      y += rowHeight;
    });
    doc.save("users.pdf");
  };

  const handleEditClick = (user) => {
    setEditUser(user);
    setForm({
      name: user.name,
      email: user.email,
      role: user.role,
      status: user.status,
    });
  };

  const handleFormChange = (e) => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  const handleSave = async () => {
    await fetch(`/api/superadmin/viewusers/${editUser.id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(form),
    });
    fetch("/api/superadmin/viewusers")
      .then(res => res.json())
      .then(data => setUsers(data));
    setEditUser(null);
    setSnackbarOpen(true);
  };

  const handleSnackbarClose = (event, reason) => {
    if (reason === 'clickaway') return;
    setSnackbarOpen(false);
  };

  const downloadExcelReport = () => {
    const list = filteredUsers.length ? filteredUsers : users;
    const data = list.map(u => ({
      ID: u.id,
      Name: u.name,
      Email: u.email,
      Role: u.role,
      Status: u.status
    }));
    const ws = XLSX.utils.json_to_sheet(data);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Users Report");
    XLSX.writeFile(wb, "admin_users_report.xlsx");
  };

  return (
    <ArgonBox p={{ xs: 2, sm: 3 }} bgcolor="#fff" borderRadius="lg" boxShadow={3}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3, flexWrap: 'wrap', gap: 2 }}>
        <ArgonTypography variant="h5" fontWeight="bold" sx={{ fontSize: { xs: '1.25rem', sm: '1.5rem' } }}>
          User List
        </ArgonTypography>
        <ArgonButton 
          color="success" 
          onClick={downloadExcelReport}
          startIcon={<DownloadIcon />}
          sx={{ minWidth: 150 }}
        >
          Download Report
        </ArgonButton>
      </Box>
      
      {/* Modern Filter Section */}
      <Box sx={{ 
        backgroundColor: '#f8f9fa',
        borderRadius: '12px',
        padding: { xs: 2, sm: 3 },
        mb: 3,
        border: '1px solid #e9ecef',
      }}>
        {/* Search Bar */}
        <Box sx={{ mb: 2 }}>
          <StyledTextField 
            label="Search by name, email, or ID" 
            variant="outlined" 
            fullWidth
            value={searchTerm} 
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Start typing to search..."
            sx={{
              '& .MuiOutlinedInput-root': {
                backgroundColor: '#fff',
              }
            }}
          />
        </Box>

        {/* Filters Row */}
        <Box sx={{ 
          display: 'grid',
          gridTemplateColumns: { xs: '1fr', sm: 'repeat(2, 1fr)', md: 'repeat(4, 1fr)' },
          gap: 2,
          alignItems: 'center',
        }}>
          <CustomDropdown
            options={[
              { value: '', label: 'All Roles' },
              { value: 'superadmin', label: 'Super Admin' },
              { value: 'admin', label: 'Admin' },
              { value: 'teacher', label: 'Teacher' },
              { value: 'student', label: 'Student' },
            ]}
            value={filterRole}
            onChange={val => setFilterRole(val)}
            placeholder="Role"
            label="Role"
            style={{ width: '100%' }}
          />

          <CustomDropdown
            options={[
              { value: '', label: 'All Status' },
              { value: 'active', label: 'Active' },
              { value: 'inactive', label: 'Inactive' },
            ]}
            value={filterStatus}
            onChange={val => setFilterStatus(val)}
            placeholder="Status"
            label="Status"
            style={{ width: '100%' }}
          />

          <ArgonButton 
            color="dark" 
            onClick={() => { setSearchTerm(''); setFilterRole(''); setFilterStatus(''); }}
            sx={{ 
              height: '42px',
              fontWeight: 600,
              textTransform: 'none',
              fontSize: '0.875rem',
              backgroundColor: '#6c757d',
              '&:hover': {
                backgroundColor: '#5a6268',
              }
            }}
          >
            Clear Filters
          </ArgonButton>

          <ArgonButton 
            color="info" 
            onClick={downloadPdf}
            sx={{ 
              height: '42px',
              fontWeight: 600,
              textTransform: 'none',
              fontSize: '0.875rem',
              backgroundColor: '#0dcaf0',
              '&:hover': {
                backgroundColor: '#0bb5d6',
              }
            }}
          >
            Download PDF
          </ArgonButton>
        </Box>
      </Box>
      
      {/* Table Container with Horizontal Scroll */}
      <Box sx={{ 
        overflowX: 'auto',
        '&::-webkit-scrollbar': {
          height: '8px',
        },
        '&::-webkit-scrollbar-thumb': {
          backgroundColor: 'rgba(0,0,0,0.2)',
          borderRadius: '4px',
        },
      }}>
        <table style={{ 
          width: "100%", 
          borderCollapse: "collapse",
          minWidth: "600px",
        }}>
          <thead>
            <tr style={{ background: "#f5f5f5" }}>
              <th style={{ padding: "12px 8px", fontSize: "0.875rem" }}>ID</th>
              <th style={{ padding: "12px 8px", fontSize: "0.875rem" }}>Name</th>
              <th style={{ padding: "12px 8px", fontSize: "0.875rem" }}>Email</th>
              <th style={{ padding: "12px 8px", fontSize: "0.875rem" }}>Role</th>
              <th style={{ padding: "12px 8px", fontSize: "0.875rem" }}>Status</th>
              <th style={{ padding: "12px 8px", fontSize: "0.875rem" }}>Actions</th>
            </tr>
          </thead>
          <tbody>
            {users.length === 0 ? (
              <tr>
                <td colSpan={6} style={{ textAlign: "center", padding: "20px" }}>No users found</td>
              </tr>
            ) : (
              users.map(user => (
                <tr key={user.id} style={{ borderBottom: "1px solid #eee" }}>
                  <td style={{ padding: "12px 8px", fontSize: "0.875rem" }}>{user.id}</td>
                  <td style={{ padding: "12px 8px", fontSize: "0.875rem" }}>{user.name}</td>
                  <td style={{ padding: "12px 8px", fontSize: "0.875rem" }}>{user.email}</td>
                  <td style={{ padding: "12px 8px", fontSize: "0.875rem" }}>{user.role}</td>
                  <td style={{ padding: "12px 8px", fontSize: "0.875rem" }}>{user.status}</td>
                  <td style={{ padding: "12px 8px" }}>
                    <ArgonButton color="info" size="small" onClick={() => handleEditClick(user)}>Edit</ArgonButton>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </Box>

      {/* Material Design Edit Popup */}
      <Dialog 
        open={!!editUser} 
        onClose={() => setEditUser(null)}
        fullWidth
        maxWidth="sm"
        PaperProps={{
          sx: {
            m: { xs: 2, sm: 4 },
            maxWidth: { xs: 'calc(100% - 32px)', sm: 600 },
          }
        }}
      >
        <DialogTitle sx={{ fontSize: { xs: '1.125rem', sm: '1.25rem' } }}>Edit User</DialogTitle>
        <DialogContent>
          <Box component="form" sx={{ mt: 1, minWidth: { xs: '100%', sm: 320 } }}>
            <StyledTextField
              margin="dense"
              label="Name"
              name="name"
              fullWidth
              value={form.name}
              onChange={handleFormChange}
              variant="outlined"
            />
            <StyledTextField
              margin="dense"
              label="Email"
              name="email"
              fullWidth
              value={form.email}
              onChange={handleFormChange}
              variant="outlined"
            />
            <Box sx={{ mt: 1, mb: 1 }}>
              <CustomDropdown
                options={[
                  { value: 'superadmin', label: 'Super Admin' },
                  { value: 'admin', label: 'Admin' },
                  { value: 'teacher', label: 'Teacher' },
                  { value: 'student', label: 'Student' },
                ]}
                value={form.role}
                onChange={val => setForm(f => ({ ...f, role: val }))}
                placeholder="Role"
                label="Role"
                style={{ width: '100%' }}
              />
            </Box>
            <Box sx={{ mt: 1, mb: 1 }}>
              <CustomDropdown
                options={[
                  { value: 'active', label: 'Active' },
                  { value: 'inactive', label: 'Inactive' },
                ]}
                value={form.status}
                onChange={val => setForm(f => ({ ...f, status: val }))}
                placeholder="Status"
                label="Status"
                style={{ width: '100%' }}
              />
            </Box>
          </Box>
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2, gap: 1, flexDirection: { xs: 'column', sm: 'row' } }}>
          <ArgonButton 
            color="success" 
            onClick={handleSave}
            sx={{ width: { xs: '100%', sm: 'auto' }, minWidth: { sm: 100 } }}
          >
            Save
          </ArgonButton>
          <ArgonButton 
            color="error" 
            onClick={() => setEditUser(null)}
            sx={{ width: { xs: '100%', sm: 'auto' }, minWidth: { sm: 100 } }}
          >
            Cancel
          </ArgonButton>
        </DialogActions>
      </Dialog>
    <Snackbar open={snackbarOpen} autoHideDuration={2500} onClose={handleSnackbarClose} anchorOrigin={{ vertical: 'top', horizontal: 'center' }}>
      <MuiAlert onClose={handleSnackbarClose} severity="success" sx={{ width: '100%' }}>
        Edited successfully!
      </MuiAlert>
    </Snackbar>
  </ArgonBox>
  );
}

export default ViewUser;
