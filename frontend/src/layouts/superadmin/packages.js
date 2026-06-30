import React, { useEffect, useMemo, useState } from "react";
import * as XLSX from "xlsx";

const emptyForm = { package_name: "", amount: "", description: "", exam_id: "" };

const formatDateTime = (value) => {
  if (!value) return "Not set";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "Not set";
  return date.toLocaleString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
};

function Packages() {
  const [packages, setPackages] = useState([]);
  const [exams, setExams] = useState([]);
  const [form, setForm] = useState(emptyForm);
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [search, setSearch] = useState("");

  const loadData = async ({ keepMessage = false } = {}) => {
    setLoading(true);
    if (!keepMessage) setMessage("");
    try {
      const [packagesRes, examsRes] = await Promise.all([
        fetch("/api/superadmin/packages"),
        fetch("/api/superadmin/packages/exams"),
      ]);
      const packagesData = await packagesRes.json().catch(() => []);
      const examsData = await examsRes.json().catch(() => []);
      if (!packagesRes.ok) throw new Error(packagesData.error || "Failed to load packages");
      if (!examsRes.ok) throw new Error(examsData.error || "Failed to load exams");
      setPackages(Array.isArray(packagesData) ? packagesData : []);
      setExams(Array.isArray(examsData) ? examsData : []);
    } catch (error) {
      setMessage(error.message || "Unable to load packages.");
      setPackages([]);
      setExams([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const selectedExam = useMemo(
    () => exams.find((exam) => String(exam.exam_id) === String(form.exam_id)),
    [exams, form.exam_id]
  );

  const filteredPackages = useMemo(() => {
    const term = search.trim().toLowerCase();
    if (!term) return packages;
    return packages.filter((pkg) =>
      `${pkg.package_name || ""} ${pkg.exam_name || ""} ${pkg.description || ""}`.toLowerCase().includes(term)
    );
  }, [packages, search]);

  const handleChange = (event) => {
    const { name, value } = event.target;
    setForm((current) => ({ ...current, [name]: value }));
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    setSaving(true);
    setMessage("");
    try {
      const response = await fetch("/api/superadmin/packages", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(data.error || "Failed to create package");
      setForm(emptyForm);
      await loadData({ keepMessage: true });
      setMessage("Package created and linked to the selected exam.");
    } catch (error) {
      setMessage(error.message || "Unable to create package.");
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (pkg) => {
    const ok = window.confirm(`Delete package "${pkg.package_name}"? The linked exam will become available for a new package.`);
    if (!ok) return;

    setMessage("");
    try {
      const response = await fetch(`/api/superadmin/packages/${pkg.package_id}`, { method: "DELETE" });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(data.error || "Failed to delete package");
      await loadData({ keepMessage: true });
      setMessage("Package deleted.");
    } catch (error) {
      setMessage(error.message || "Unable to delete package.");
    }
  };

  const downloadExcelReport = () => {
    const rows = filteredPackages.map((pkg) => ({
      "Package ID": pkg.package_id,
      "Package Name": pkg.package_name,
      Amount: pkg.amount,
      Currency: pkg.currency || "INR",
      Description: pkg.description || "",
      "Exam ID": pkg.exam_id || "",
      "Exam Name": pkg.exam_name || "",
      "Exam Status": pkg.exam_status || "",
      "Created At": pkg.created_at ? new Date(pkg.created_at).toLocaleDateString("en-IN") : "",
    }));
    const sheet = XLSX.utils.json_to_sheet(rows);
    const book = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(book, sheet, "Packages");
    XLSX.writeFile(book, "packages_report.xlsx");
  };

  return (
    <div className="sa-current-tool">
      <section className="sa-tool-hero">
        <div>
          <span className="sa-tool-kicker">Package builder</span>
          <h2>One package for one current exam</h2>
          <p>Only active or scheduled exams that are not already packaged are available for selection.</p>
        </div>
        <div className="sa-tool-actions">
          <button type="button" className="sa-button secondary" onClick={loadData} disabled={loading}>
            <span className="material-icons-round">sync</span>
            Refresh
          </button>
          <button type="button" className="sa-button primary" onClick={downloadExcelReport} disabled={!filteredPackages.length}>
            <span className="material-icons-round">download</span>
            Export
          </button>
        </div>
      </section>

      <section className="sa-metric-row" aria-label="Package counts">
        <article><strong>{packages.length}</strong><span>Total packages</span></article>
        <article><strong>{exams.length}</strong><span>Available exams</span></article>
        <article><strong>{packages.filter((pkg) => pkg.exam_id).length}</strong><span>Linked exams</span></article>
        <article><strong>{packages.filter((pkg) => pkg.status === "active" || !pkg.status).length}</strong><span>Active plans</span></article>
      </section>

      {message && <div className="sa-inline-message">{message}</div>}

      <section className="sa-form-layout">
        <form className="sa-package-form" onSubmit={handleSubmit}>
          <div className="sa-table-title">
            <div>
              <span className="sa-tool-kicker">Create package</span>
              <h3>Package details</h3>
            </div>
          </div>

          <div className="sa-form-grid">
            <label>
              <span>Package name</span>
              <input
                name="package_name"
                value={form.package_name}
                onChange={handleChange}
                placeholder="SAT Mock Test Package"
                required
              />
            </label>
            <label>
              <span>Amount</span>
              <input
                type="number"
                min="0"
                step="0.01"
                name="amount"
                value={form.amount}
                onChange={handleChange}
                placeholder="499"
                required
              />
            </label>
            <label className="span-2">
              <span>Select current exam</span>
              <select name="exam_id" value={form.exam_id} onChange={handleChange} required>
                <option value="">Choose one active or scheduled exam</option>
                {exams.map((exam) => (
                  <option value={exam.exam_id} key={exam.exam_id}>
                    {exam.title} / {exam.course_name || "Course"} / {exam.status}
                  </option>
                ))}
              </select>
            </label>
            <label className="span-2">
              <span>Description</span>
              <textarea
                name="description"
                value={form.description}
                onChange={handleChange}
                placeholder="Short package description for students"
                rows={3}
              />
            </label>
          </div>

          {selectedExam && (
            <div className="sa-selected-exam">
              <span className={`sa-status-pill ${selectedExam.status}`}>{selectedExam.status}</span>
              <strong>{selectedExam.title}</strong>
              <small>{formatDateTime(selectedExam.start_time)} to {formatDateTime(selectedExam.end_time)}</small>
            </div>
          )}

          {exams.length === 0 && (
            <div className="sa-inline-message">
              No unpackaged active or scheduled exams are available right now.
            </div>
          )}

          <button type="submit" className="sa-button primary wide" disabled={saving || exams.length === 0}>
            <span className="material-icons-round">inventory_2</span>
            {saving ? "Creating..." : "Create Package"}
          </button>
        </form>

        <aside className="sa-package-note">
          <span className="material-icons-round">verified</span>
          <strong>Package rule</strong>
          <p>Each exam can be linked to only one package. Delete an old package if you need to make its exam available again.</p>
        </aside>
      </section>

      <section className="sa-table-shell">
        <div className="sa-table-title">
          <div>
            <span className="sa-tool-kicker">Package list</span>
            <h3>{loading ? "Loading packages" : `Showing ${filteredPackages.length} packages`}</h3>
          </div>
          <label className="sa-table-search">
            <span className="material-icons-round">search</span>
            <input type="search" value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search packages" />
          </label>
        </div>

        <div className="sa-table-scroll">
          <table className="sa-data-table">
            <thead>
              <tr>
                <th>Package</th>
                <th>Amount</th>
                <th>Linked Exam</th>
                <th>Status</th>
                <th>Created</th>
                <th>Action</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={6} className="sa-empty-cell">Loading packages...</td></tr>
              ) : filteredPackages.length === 0 ? (
                <tr><td colSpan={6} className="sa-empty-cell">No packages found.</td></tr>
              ) : (
                filteredPackages.map((pkg) => (
                  <tr key={pkg.package_id}>
                    <td>
                      <strong>{pkg.package_name}</strong>
                      <small>{pkg.description || "No description"}</small>
                    </td>
                    <td>
                      <strong>{pkg.currency || "INR"} {Number(pkg.amount || 0).toFixed(2)}</strong>
                    </td>
                    <td>
                      <strong>{pkg.exam_name || "No exam linked"}</strong>
                      <small>{pkg.exam_id ? `Exam ID #${pkg.exam_id}` : "Unmapped"}</small>
                    </td>
                    <td>
                      <span className={`sa-status-pill ${pkg.exam_status || pkg.status || "scheduled"}`}>
                        {pkg.exam_status || pkg.status || "active"}
                      </span>
                    </td>
                    <td>{pkg.created_at ? new Date(pkg.created_at).toLocaleDateString("en-IN") : "Not set"}</td>
                    <td>
                      <button type="button" className="sa-button danger" onClick={() => handleDelete(pkg)}>
                        <span className="material-icons-round">delete</span>
                        Delete
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}

export default Packages;
