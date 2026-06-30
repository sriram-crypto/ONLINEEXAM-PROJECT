import React, { useCallback, useEffect, useMemo, useState } from "react";

const pageSizeOptions = [10, 25, 50, 100];

const valueToText = (value) => {
  if (value === null || value === undefined) return "";
  if (typeof value === "object") return JSON.stringify(value, null, 2);
  return String(value);
};

const cellToText = (value) => {
  if (value === null || value === undefined || value === "") return "NULL";
  if (typeof value === "object") return JSON.stringify(value);
  return String(value);
};

const csvEscape = (value) => {
  const text = cellToText(value);
  return /[",\n]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text;
};

const isLongField = (column) =>
  ["text", "mediumtext", "longtext", "json"].includes(column.data_type) ||
  Number(column.max_length || 0) > 240;

const isNumberField = (column) =>
  ["tinyint", "smallint", "mediumint", "int", "bigint", "decimal", "float", "double"].includes(column.data_type);

const buildKey = (row, primaryKey) =>
  primaryKey.reduce((acc, columnName) => {
    acc[columnName] = row[columnName];
    return acc;
  }, {});

function DatabaseTables() {
  const [tables, setTables] = useState([]);
  const [selectedTable, setSelectedTable] = useState("");
  const [tableSearch, setTableSearch] = useState("");
  const [tableData, setTableData] = useState(null);
  const [rowSearch, setRowSearch] = useState("");
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(25);
  const [sort, setSort] = useState("");
  const [order, setOrder] = useState("desc");
  const [loadingTables, setLoadingTables] = useState(false);
  const [loadingRows, setLoadingRows] = useState(false);
  const [message, setMessage] = useState("");
  const [editorMode, setEditorMode] = useState("");
  const [editingRow, setEditingRow] = useState(null);
  const [draft, setDraft] = useState({});
  const [refreshKey, setRefreshKey] = useState(0);

  const loadTables = useCallback(async () => {
    setLoadingTables(true);
    setMessage("");
    try {
      const response = await fetch("/api/superadmin/db-tables");
      const data = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(data.error || "Unable to load database tables.");
      const nextTables = Array.isArray(data.tables) ? data.tables : [];
      setTables(nextTables);
      setSelectedTable((current) => current || nextTables[0]?.table_name || "");
    } catch (error) {
      setMessage(error.message || "Unable to load database tables.");
      setTables([]);
    } finally {
      setLoadingTables(false);
    }
  }, []);

  const loadRows = useCallback(async () => {
    if (!selectedTable) return;
    setLoadingRows(true);
    setMessage("");
    try {
      const params = new URLSearchParams({
        page: String(page),
        pageSize: String(pageSize),
        search: rowSearch,
        sort,
        order,
      });
      const response = await fetch(`/api/superadmin/db-tables/${encodeURIComponent(selectedTable)}?${params}`);
      const data = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(data.error || data.details || "Unable to load rows.");
      setTableData(data);
      if (!sort && data.primary_key?.[0]) setSort(data.primary_key[0]);
    } catch (error) {
      setMessage(error.message || "Unable to load rows.");
      setTableData(null);
    } finally {
      setLoadingRows(false);
    }
  }, [selectedTable, page, pageSize, rowSearch, sort, order]);

  useEffect(() => {
    loadTables();
  }, [loadTables]);

  useEffect(() => {
    loadRows();
  }, [loadRows, refreshKey]);

  const filteredTables = useMemo(() => {
    const term = tableSearch.trim().toLowerCase();
    if (!term) return tables;
    return tables.filter((table) =>
      `${table.table_name} ${table.group} ${table.primary_key?.join(" ")}`.toLowerCase().includes(term)
    );
  }, [tableSearch, tables]);

  const columns = tableData?.columns || [];
  const rows = tableData?.rows || [];
  const primaryKey = tableData?.primary_key || [];
  const selectedMeta = tableData?.table || tables.find((table) => table.table_name === selectedTable);
  const canWrite = Boolean(selectedMeta?.mutation_allowed);
  const canEditRows = canWrite && primaryKey.length > 0;
  const editableColumns = columns.filter((column) => column.editable && (editorMode !== "edit" || column.key !== "PRI"));
  const totalPages = tableData?.pagination?.totalPages || 1;

  const selectTable = (tableName) => {
    setSelectedTable(tableName);
    setPage(1);
    setSort("");
    setOrder("desc");
    setRowSearch("");
    setEditorMode("");
    setEditingRow(null);
    setDraft({});
  };

  const toggleSort = (columnName) => {
    setPage(1);
    setSort((current) => {
      if (current === columnName) {
        setOrder((currentOrder) => (currentOrder === "asc" ? "desc" : "asc"));
        return current;
      }
      setOrder("asc");
      return columnName;
    });
  };

  const startAdd = () => {
    const initialDraft = columns.reduce((acc, column) => {
      if (column.editable) acc[column.column_name] = "";
      return acc;
    }, {});
    setEditorMode("add");
    setEditingRow(null);
    setDraft(initialDraft);
  };

  const startEdit = (row) => {
    const nextDraft = columns.reduce((acc, column) => {
      if (column.editable && column.key !== "PRI") acc[column.column_name] = valueToText(row[column.column_name]);
      return acc;
    }, {});
    setEditorMode("edit");
    setEditingRow(row);
    setDraft(nextDraft);
  };

  const closeEditor = () => {
    setEditorMode("");
    setEditingRow(null);
    setDraft({});
  };

  const saveDraft = async (event) => {
    event.preventDefault();
    setMessage("");
    try {
      const isEdit = editorMode === "edit";
      const response = await fetch(`/api/superadmin/db-tables/${encodeURIComponent(selectedTable)}`, {
        method: isEdit ? "PUT" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          key: isEdit ? buildKey(editingRow, primaryKey) : undefined,
          record: draft,
        }),
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(data.error || data.details || "Unable to save row.");
      setMessage(isEdit ? "Row updated successfully." : "Row added successfully.");
      closeEditor();
      setRefreshKey((current) => current + 1);
      loadTables();
    } catch (error) {
      setMessage(error.message || "Unable to save row.");
    }
  };

  const deleteRow = async (row) => {
    const confirmed = window.confirm(`Delete this row from ${selectedTable}?`);
    if (!confirmed) return;

    setMessage("");
    try {
      const response = await fetch(`/api/superadmin/db-tables/${encodeURIComponent(selectedTable)}`, {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ key: buildKey(row, primaryKey) }),
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(data.error || data.details || "Unable to delete row.");
      setMessage("Row deleted successfully.");
      setRefreshKey((current) => current + 1);
      loadTables();
    } catch (error) {
      setMessage(error.message || "Unable to delete row.");
    }
  };

  const exportRows = () => {
    if (!rows.length || !columns.length) return;
    const header = columns.map((column) => csvEscape(column.column_name)).join(",");
    const body = rows
      .map((row) => columns.map((column) => csvEscape(row[column.column_name])).join(","))
      .join("\n");
    const blob = new Blob([`${header}\n${body}`], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = `${selectedTable}_page_${page}.csv`;
    anchor.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="sa-current-tool">
      <section className="sa-tool-hero">
        <div>
          <span className="sa-tool-kicker">Database coverage</span>
          <h2>Use every table from the ExamPulse database.</h2>
          <p>
            Superadmins can inspect all {tables.length || 55} live tables from the dump-backed schema, search rows,
            export visible data, and maintain editable tables from one controlled screen.
          </p>
        </div>
        <div className="sa-tool-actions">
          <button type="button" className="sa-button secondary" onClick={loadTables}>
            <span className="material-icons-round">refresh</span>
            Refresh
          </button>
          <button type="button" className="sa-button primary" onClick={startAdd} disabled={!selectedTable || !canWrite}>
            <span className="material-icons-round">add</span>
            Add Row
          </button>
        </div>
      </section>

      {message && <div className="sa-inline-message">{message}</div>}

      <section className="sa-db-shell">
        <aside className="sa-db-sidebar">
          <label className="sa-db-search">
            <span className="material-icons-round">search</span>
            <input
              type="search"
              placeholder="Search tables"
              value={tableSearch}
              onChange={(event) => setTableSearch(event.target.value)}
            />
          </label>
          <div className="sa-db-list">
            {loadingTables ? (
              <div className="sa-db-empty">Loading tables...</div>
            ) : (
              filteredTables.map((table) => (
                <button
                  type="button"
                  className={`sa-db-table-button ${selectedTable === table.table_name ? "active" : ""}`}
                  key={table.table_name}
                  onClick={() => selectTable(table.table_name)}
                >
                  <strong>{table.table_name}</strong>
                  <span>{table.group}</span>
                  <em>{table.column_count} columns | {table.row_count_estimate} rows</em>
                </button>
              ))
            )}
          </div>
        </aside>

        <div className="sa-db-main">
          <div className="sa-db-toolbar">
            <div>
              <span className="sa-tool-kicker">{selectedMeta?.group || "Table"}</span>
              <h3>{selectedTable || "Select a table"}</h3>
              <p>
                Primary key: {primaryKey.length ? primaryKey.join(", ") : "No primary key"}
                {!canWrite ? " | Read-only log/audit table" : ""}
              </p>
            </div>
            <div className="sa-db-actions">
              <label className="sa-table-search">
                <span className="material-icons-round">manage_search</span>
                <input
                  type="search"
                  placeholder="Search rows"
                  value={rowSearch}
                  onChange={(event) => {
                    setRowSearch(event.target.value);
                    setPage(1);
                  }}
                />
              </label>
              <button type="button" className="sa-button secondary" onClick={exportRows} disabled={!rows.length}>
                <span className="material-icons-round">ios_share</span>
                Export
              </button>
            </div>
          </div>

          <div className="sa-db-meta-grid">
            <article><strong>{tables.length}</strong><span>Total tables</span></article>
            <article><strong>{columns.length}</strong><span>Columns in view</span></article>
            <article><strong>{tableData?.pagination?.total || 0}</strong><span>Matched rows</span></article>
            <article><strong>{canEditRows ? "Ready" : canWrite ? "Insert only" : "Read only"}</strong><span>Mutation mode</span></article>
          </div>

          {editorMode && (
            <form className="sa-db-editor" onSubmit={saveDraft}>
              <div className="sa-db-editor-head">
                <div>
                  <span className="sa-tool-kicker">{editorMode === "edit" ? "Edit row" : "Add row"}</span>
                  <h3>{selectedTable}</h3>
                </div>
                <button type="button" className="sa-button secondary" onClick={closeEditor}>Close</button>
              </div>
              <div className="sa-db-form-grid">
                {editableColumns.map((column) => (
                  <label className={`sa-db-field ${isLongField(column) ? "wide" : ""}`} key={column.column_name}>
                    <span>
                      {column.column_name}
                      <em>{column.column_type}{column.nullable ? " | nullable" : ""}</em>
                    </span>
                    {isLongField(column) ? (
                      <textarea
                        value={draft[column.column_name] ?? ""}
                        onChange={(event) => setDraft((current) => ({ ...current, [column.column_name]: event.target.value }))}
                      />
                    ) : (
                      <input
                        type={isNumberField(column) ? "number" : "text"}
                        value={draft[column.column_name] ?? ""}
                        onChange={(event) => setDraft((current) => ({ ...current, [column.column_name]: event.target.value }))}
                      />
                    )}
                  </label>
                ))}
              </div>
              <button type="submit" className="sa-button primary wide">Save Row</button>
            </form>
          )}

          <div className="sa-db-table-wrap">
            <table className="sa-db-table">
              <thead>
                <tr>
                  {canEditRows && <th>Actions</th>}
                  {columns.map((column) => (
                    <th key={column.column_name}>
                      <button type="button" onClick={() => toggleSort(column.column_name)}>
                        {column.column_name}
                        {sort === column.column_name && (
                          <span className="material-icons-round">{order === "asc" ? "arrow_upward" : "arrow_downward"}</span>
                        )}
                      </button>
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {loadingRows ? (
                  <tr><td className="sa-empty-cell" colSpan={columns.length + 1}>Loading rows...</td></tr>
                ) : rows.length === 0 ? (
                  <tr><td className="sa-empty-cell" colSpan={columns.length + 1}>No rows found.</td></tr>
                ) : (
                  rows.map((row, rowIndex) => (
                    <tr key={`${selectedTable}-${rowIndex}`}>
                      {canEditRows && (
                        <td>
                          <div className="sa-db-row-actions">
                            <button type="button" className="sa-button secondary" onClick={() => startEdit(row)}>Edit</button>
                            <button type="button" className="sa-button danger" onClick={() => deleteRow(row)}>Delete</button>
                          </div>
                        </td>
                      )}
                      {columns.map((column) => (
                        <td key={`${rowIndex}-${column.column_name}`} title={cellToText(row[column.column_name])}>
                          {cellToText(row[column.column_name])}
                        </td>
                      ))}
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          <div className="sa-db-pagination">
            <button type="button" className="sa-button secondary" onClick={() => setPage((current) => Math.max(1, current - 1))} disabled={page <= 1}>
              Previous
            </button>
            <span>Page {page} of {totalPages}</span>
            <button type="button" className="sa-button secondary" onClick={() => setPage((current) => Math.min(totalPages, current + 1))} disabled={page >= totalPages}>
              Next
            </button>
            <select value={pageSize} onChange={(event) => { setPageSize(Number(event.target.value)); setPage(1); }}>
              {pageSizeOptions.map((option) => <option value={option} key={option}>{option} rows</option>)}
            </select>
          </div>
        </div>
      </section>
    </div>
  );
}

export default DatabaseTables;
