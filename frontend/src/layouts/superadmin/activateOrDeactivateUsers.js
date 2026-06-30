import React, { useCallback, useEffect, useMemo, useState } from "react";
import * as XLSX from "xlsx";

const extractRoles = (data) => [...new Set(data.map((user) => user.role).filter(Boolean))].sort();

function ActivateOrDeactivateUsers() {
  const [users, setUsers] = useState([]);
  const [filteredUsers, setFilteredUsers] = useState([]);
  const [filters, setFilters] = useState({ role: "", status: "" });
  const [roles, setRoles] = useState([]);
  const [updatingId, setUpdatingId] = useState(null);

  const fetchUsers = useCallback(() => {
    fetch("/api/superadmin/activate-or-deactivate/users")
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
    return { total: users.length, active, inactive };
  }, [users]);

  const handleFilterChange = (field, value) => {
    setFilters((prev) => ({ ...prev, [field]: value }));
  };

  const handleClearFilters = () => {
    setFilters({ role: "", status: "" });
  };

  const updateStatus = async (id, status) => {
    setUpdatingId(id);
    await fetch(`/api/superadmin/activate-or-deactivate/user/${id}/status`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status }),
    });
    fetchUsers();
    setUpdatingId(null);
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
    XLSX.writeFile(wb, "activate_deactivate_users_report.xlsx");
  };

  const hasActiveFilters = Object.values(filters).some(Boolean);

  return (
    <div className="sa-current-tool">
      <section className="sa-tool-hero">
        <div>
          <span className="sa-tool-kicker">Active users</span>
          <h2>Activate or deactivate accounts with a clearer control table.</h2>
          <p>Filter by role and status, then switch access state from the action column.</p>
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
          <strong>{filteredUsers.length}</strong>
          <span>Visible rows</span>
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
            <span className="sa-tool-kicker">Access records</span>
            <h3>Showing {filteredUsers.length} of {users.length}</h3>
          </div>
        </div>
        <div className="sa-table-scroll">
          <table className="sa-data-table">
            <thead>
              <tr>
                <th>ID</th>
                <th>User</th>
                <th>Email</th>
                <th>Role</th>
                <th>Status</th>
                <th>Action</th>
              </tr>
            </thead>
            <tbody>
              {filteredUsers.length ? (
                filteredUsers.map((user) => (
                  <tr key={user.id} className={user.status === "active" ? "live-row" : ""}>
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
                      {user.status === "active" ? (
                        <button
                          type="button"
                          className="sa-button danger"
                          onClick={() => updateStatus(user.id, "inactive")}
                          disabled={updatingId === user.id}
                        >
                          <span className="material-icons-round">toggle_off</span>
                          Deactivate
                        </button>
                      ) : (
                        <button
                          type="button"
                          className="sa-button primary"
                          onClick={() => updateStatus(user.id, "active")}
                          disabled={updatingId === user.id}
                        >
                          <span className="material-icons-round">toggle_on</span>
                          Activate
                        </button>
                      )}
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
    </div>
  );
}

export default ActivateOrDeactivateUsers;
