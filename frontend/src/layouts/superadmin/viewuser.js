import CustomDropdown from "components/CustomDropdown";
import React, { useCallback, useEffect, useMemo, useState } from "react";
import StyledTextField from "components/StyledTextField";
import Dialog from "@mui/material/Dialog";
import DialogTitle from "@mui/material/DialogTitle";
import DialogContent from "@mui/material/DialogContent";
import DialogActions from "@mui/material/DialogActions";
import FormControl from "@mui/material/FormControl";
import * as XLSX from "xlsx";

const extractRoles = (data) => [...new Set(data.map((user) => user.role).filter(Boolean))].sort();

function ViewUser() {
  const [users, setUsers] = useState([]);
  const [filteredUsers, setFilteredUsers] = useState([]);
  const [editUser, setEditUser] = useState(null);
  const [form, setForm] = useState({ name: "", email: "", role: "", status: "" });
  const [filters, setFilters] = useState({ role: "", status: "" });
  const [roles, setRoles] = useState([]);

  const fetchUsers = useCallback(() => {
    fetch("/api/superadmin/viewusers")
      .then((res) => res.json())
      .then((data) => {
        const safeData = Array.isArray(data) ? data : [];
        setUsers(safeData);
        setFilteredUsers(safeData);
        setRoles(extractRoles(safeData));
      })
      .catch(() => {
        setUsers([]);
        setFilteredUsers([]);
      });
  }, []);

  useEffect(() => {
    fetchUsers();
  }, [fetchUsers]);

  useEffect(() => {
    let filtered = [...users];
    if (filters.role) filtered = filtered.filter((user) => user.role === filters.role);
    if (filters.status) filtered = filtered.filter((user) => user.status === filters.status);
    setFilteredUsers(filtered);
  }, [filters, users]);

  const stats = useMemo(() => {
    const active = users.filter((user) => user.status === "active").length;
    const inactive = users.filter((user) => user.status === "inactive").length;
    return { total: users.length, active, inactive, roles: roles.length };
  }, [users, roles]);

  const handleFilterChange = (field, value) => {
    setFilters((prev) => ({ ...prev, [field]: value }));
  };

  const handleClearFilters = () => {
    setFilters({ role: "", status: "" });
  };

  const handleEditClick = (user) => {
    setEditUser(user);
    setForm({
      name: user.name || "",
      email: user.email || "",
      role: user.role || "",
      status: user.status || "",
    });
  };

  const handleFormChange = (event) => {
    setForm({ ...form, [event.target.name]: event.target.value });
  };

  const handleSave = async () => {
    await fetch(`/api/superadmin/viewusers/${editUser.id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(form),
    });
    fetchUsers();
    setEditUser(null);
  };

  const downloadExcelReport = () => {
    const data = filteredUsers.map((user) => ({
      ID: user.id,
      Name: user.name,
      Email: user.email,
      Role: user.role,
      Status: user.status,
    }));
    const ws = XLSX.utils.json_to_sheet(data);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Users Report");
    XLSX.writeFile(wb, "users_report.xlsx");
  };

  const hasActiveFilters = Object.values(filters).some(Boolean);

  return (
    <div className="sa-current-tool">
      <section className="sa-tool-hero">
        <div>
          <span className="sa-tool-kicker">User directory</span>
          <h2>View, filter, export, and edit portal users.</h2>
          <p>Review every role from one table and keep user records tidy from the super admin panel.</p>
        </div>
        <div className="sa-tool-actions">
          <button type="button" className="sa-button secondary" onClick={fetchUsers}>
            <span className="material-icons-round">refresh</span>
            Refresh
          </button>
          <button type="button" className="sa-button primary" onClick={downloadExcelReport} disabled={!filteredUsers.length}>
            <span className="material-icons-round">download</span>
            Download Report
          </button>
        </div>
      </section>

      <div className="sa-metric-row">
        <article>
          <strong>{stats.total}</strong>
          <span>Total users</span>
        </article>
        <article>
          <strong>{stats.active}</strong>
          <span>Active users</span>
        </article>
        <article>
          <strong>{stats.inactive}</strong>
          <span>Inactive users</span>
        </article>
        <article>
          <strong>{stats.roles}</strong>
          <span>Roles found</span>
        </article>
      </div>

      <section className="sa-filter-panel">
        <label>
          <span>Role</span>
          <select value={filters.role} onChange={(event) => handleFilterChange("role", event.target.value)}>
            <option value="">All Roles</option>
            {roles.map((role) => (
              <option key={role} value={role}>
                {role}
              </option>
            ))}
          </select>
        </label>
        <label>
          <span>Status</span>
          <select value={filters.status} onChange={(event) => handleFilterChange("status", event.target.value)}>
            <option value="">All Status</option>
            <option value="active">Active</option>
            <option value="inactive">Inactive</option>
          </select>
        </label>
        <button type="button" className="sa-button secondary" onClick={handleClearFilters} disabled={!hasActiveFilters}>
          <span className="material-icons-round">clear</span>
          Clear
        </button>
      </section>

      <section className="sa-table-shell">
        <div className="sa-table-title">
          <div>
            <span className="sa-tool-kicker">User records</span>
            <h3>Showing {filteredUsers.length} of {users.length}</h3>
          </div>
        </div>
        <div className="sa-table-scroll">
          <table className="sa-data-table">
            <thead>
              <tr>
                <th>ID</th>
                <th>Name</th>
                <th>Email</th>
                <th>Role</th>
                <th>Status</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredUsers.length ? (
                filteredUsers.map((user) => (
                  <tr key={user.id}>
                    <td>{user.id}</td>
                    <td>
                      <strong>{user.name}</strong>
                      <small>{user.role}</small>
                    </td>
                    <td>{user.email}</td>
                    <td>{user.role}</td>
                    <td>
                      <span className={`sa-status-pill ${user.status}`}>{user.status}</span>
                    </td>
                    <td>
                      <button type="button" className="sa-button secondary" onClick={() => handleEditClick(user)}>
                        <span className="material-icons-round">edit</span>
                        Edit
                      </button>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td className="sa-empty-cell" colSpan={6}>
                    {users.length === 0 ? "No users found" : "No users match the selected filters"}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </section>

      <Dialog open={!!editUser} onClose={() => setEditUser(null)} maxWidth="sm" fullWidth>
        <DialogTitle sx={{ fontWeight: 800 }}>Edit User</DialogTitle>
        <DialogContent>
          <div className="sa-form-grid" style={{ marginTop: 12 }}>
            <label className="span-2">
              <span>Name</span>
              <StyledTextField name="name" fullWidth value={form.name} onChange={handleFormChange} variant="outlined" />
            </label>
            <label className="span-2">
              <span>Email</span>
              <StyledTextField name="email" fullWidth value={form.email} onChange={handleFormChange} variant="outlined" />
            </label>
            <FormControl fullWidth>
              <CustomDropdown
                label="Role"
                options={[
                  { value: "superadmin", label: "Super Admin" },
                  { value: "admin", label: "Admin" },
                  { value: "teacher", label: "Teacher" },
                  { value: "student", label: "Student" },
                ]}
                value={form.role}
                onChange={(value) => handleFormChange({ target: { name: "role", value } })}
                placeholder="Select Role"
                style={{ width: "100%" }}
              />
            </FormControl>
            <FormControl fullWidth>
              <CustomDropdown
                label="Status"
                options={[
                  { value: "active", label: "Active" },
                  { value: "inactive", label: "Inactive" },
                ]}
                value={form.status}
                onChange={(value) => handleFormChange({ target: { name: "status", value } })}
                placeholder="Select Status"
                style={{ width: "100%" }}
              />
            </FormControl>
          </div>
        </DialogContent>
        <DialogActions sx={{ p: 3, gap: 1 }}>
          <button type="button" className="sa-button secondary" onClick={() => setEditUser(null)}>
            Cancel
          </button>
          <button type="button" className="sa-button primary" onClick={handleSave}>
            Save
          </button>
        </DialogActions>
      </Dialog>
    </div>
  );
}

export default ViewUser;
