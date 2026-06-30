const express = require("express");
const router = express.Router();
const db = require("../../config/db");

const MAX_PAGE_SIZE = 100;
const STRING_TYPES = new Set([
  "char",
  "varchar",
  "tinytext",
  "text",
  "mediumtext",
  "longtext",
  "enum",
  "set",
  "json",
]);
const NUMBER_TYPES = new Set([
  "tinyint",
  "smallint",
  "mediumint",
  "int",
  "bigint",
  "decimal",
  "float",
  "double",
  "bit",
]);
const DATE_TYPES = new Set(["date", "datetime", "timestamp", "time", "year"]);
const WRITE_PROTECTED_TABLES = new Set(["audit_logs", "attempt_events", "ml_prediction_logs", "notification_logs"]);

const query = (sql, params = []) => db.promise().query(sql, params).then(([rows]) => rows);

const asInt = (value, fallback, min, max) => {
  const parsed = Number.parseInt(value, 10);
  if (!Number.isFinite(parsed)) return fallback;
  return Math.min(Math.max(parsed, min), max);
};

const quoteId = (name) => {
  if (!/^[A-Za-z0-9_]+$/.test(String(name || ""))) {
    const err = new Error("Invalid database identifier");
    err.status = 400;
    throw err;
  }
  return `\`${String(name).replace(/`/g, "``")}\``;
};

const tableGroup = (tableName) => {
  if (/question|passage|tag|asset|coding/i.test(tableName)) return "Question Bank";
  if (/exam|attempt|submission|evaluation/i.test(tableName)) return "Exam Engine";
  if (/student|parent|user|institution|enrollment/i.test(tableName)) return "People";
  if (/package|access|payment/i.test(tableName)) return "Access";
  if (/worksheet|practice/i.test(tableName)) return "Practice";
  if (/analytics|audit|log|notification|ml/i.test(tableName)) return "Intelligence";
  if (/course|subject|chapter|board|level|model|category/i.test(tableName)) return "Academic Setup";
  return "General";
};

const normalizeColumn = (column) => ({
  column_name: column.COLUMN_NAME,
  data_type: column.DATA_TYPE,
  column_type: column.COLUMN_TYPE,
  nullable: column.IS_NULLABLE === "YES",
  default_value: column.COLUMN_DEFAULT,
  extra: column.EXTRA || "",
  key: column.COLUMN_KEY || "",
  ordinal_position: column.ORDINAL_POSITION,
  max_length: column.CHARACTER_MAXIMUM_LENGTH,
  editable: !/auto_increment|generated/i.test(column.EXTRA || ""),
});

const getColumns = async (tableName) => {
  const rows = await query(
    `SELECT COLUMN_NAME, DATA_TYPE, COLUMN_TYPE, IS_NULLABLE, COLUMN_DEFAULT, EXTRA, COLUMN_KEY,
            ORDINAL_POSITION, CHARACTER_MAXIMUM_LENGTH
       FROM information_schema.COLUMNS
      WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = ?
      ORDER BY ORDINAL_POSITION`,
    [tableName]
  );
  if (!rows.length) {
    const err = new Error("Table not found");
    err.status = 404;
    throw err;
  }
  return rows.map(normalizeColumn);
};

const getTableMeta = async (tableName) => {
  const rows = await query(
    `SELECT TABLE_NAME, TABLE_ROWS, CREATE_TIME, UPDATE_TIME, TABLE_COMMENT
       FROM information_schema.TABLES
      WHERE TABLE_SCHEMA = DATABASE() AND TABLE_TYPE = 'BASE TABLE' AND TABLE_NAME = ?`,
    [tableName]
  );
  if (!rows.length) {
    const err = new Error("Table not found");
    err.status = 404;
    throw err;
  }
  return rows[0];
};

const buildSearch = (columns, search) => {
  const term = String(search || "").trim();
  if (!term) return { clause: "", params: [] };

  const searchable = columns.filter((column) => STRING_TYPES.has(column.data_type));
  if (!searchable.length) return { clause: "", params: [] };

  return {
    clause: `WHERE (${searchable.map((column) => `CAST(${quoteId(column.column_name)} AS CHAR) LIKE ?`).join(" OR ")})`,
    params: searchable.map(() => `%${term}%`),
  };
};

const sanitizeValue = (value, column) => {
  if (value === undefined) return undefined;
  if (value === "" && (column.nullable || NUMBER_TYPES.has(column.data_type) || DATE_TYPES.has(column.data_type))) {
    return null;
  }
  if (value === null) return null;

  if (NUMBER_TYPES.has(column.data_type)) {
    const numberValue = Number(value);
    return Number.isFinite(numberValue) ? numberValue : null;
  }

  if (column.data_type === "json") {
    if (typeof value === "object") return JSON.stringify(value);
    const text = String(value || "").trim();
    if (!text) return column.nullable ? null : "{}";
    try {
      return JSON.stringify(JSON.parse(text));
    } catch (_err) {
      return text;
    }
  }

  return value;
};

const normalizeRecord = (record = {}, columns = [], options = {}) => {
  const includePrimary = Boolean(options.includePrimary);
  const fields = [];
  const values = [];

  columns.forEach((column) => {
    if (!Object.prototype.hasOwnProperty.call(record, column.column_name)) return;
    if (!column.editable) return;
    if (!includePrimary && column.key === "PRI") return;

    const value = sanitizeValue(record[column.column_name], column);
    if (value === undefined) return;
    fields.push(column.column_name);
    values.push(value);
  });

  return { fields, values };
};

const normalizeKey = (key = {}, columns = []) => {
  const primaryColumns = columns.filter((column) => column.key === "PRI");
  if (!primaryColumns.length) {
    const err = new Error("This table has no primary key, so row mutation is disabled.");
    err.status = 400;
    throw err;
  }

  const parts = [];
  const values = [];
  primaryColumns.forEach((column) => {
    if (!Object.prototype.hasOwnProperty.call(key, column.column_name)) {
      const err = new Error(`Missing primary key value: ${column.column_name}`);
      err.status = 400;
      throw err;
    }
    parts.push(`${quoteId(column.column_name)} = ?`);
    values.push(sanitizeValue(key[column.column_name], column));
  });

  return { where: parts.join(" AND "), values };
};

const mutationAllowed = (tableName) => !WRITE_PROTECTED_TABLES.has(tableName);

router.get("/", async (_req, res) => {
  try {
    const tables = await query(
      `SELECT t.TABLE_NAME, COALESCE(t.TABLE_ROWS, 0) AS row_count_estimate,
              t.CREATE_TIME, t.UPDATE_TIME, t.TABLE_COMMENT,
              COUNT(c.COLUMN_NAME) AS column_count,
              GROUP_CONCAT(CASE WHEN c.COLUMN_KEY = 'PRI' THEN c.COLUMN_NAME END ORDER BY c.ORDINAL_POSITION) AS primary_key
         FROM information_schema.TABLES t
    LEFT JOIN information_schema.COLUMNS c
           ON c.TABLE_SCHEMA = t.TABLE_SCHEMA AND c.TABLE_NAME = t.TABLE_NAME
        WHERE t.TABLE_SCHEMA = DATABASE() AND t.TABLE_TYPE = 'BASE TABLE'
     GROUP BY t.TABLE_NAME, t.TABLE_ROWS, t.CREATE_TIME, t.UPDATE_TIME, t.TABLE_COMMENT
     ORDER BY t.TABLE_NAME`
    );

    res.json({
      tables: tables.map((table) => ({
        table_name: table.TABLE_NAME,
        row_count_estimate: Number(table.row_count_estimate || 0),
        column_count: Number(table.column_count || 0),
        primary_key: table.primary_key ? String(table.primary_key).split(",") : [],
        table_comment: table.TABLE_COMMENT || "",
        create_time: table.CREATE_TIME,
        update_time: table.UPDATE_TIME,
        group: tableGroup(table.TABLE_NAME),
        mutation_allowed: mutationAllowed(table.TABLE_NAME),
      })),
    });
  } catch (err) {
    res.status(500).json({ error: "Failed to load database tables", details: err.message });
  }
});

router.get("/:table", async (req, res) => {
  try {
    const tableName = req.params.table;
    const page = asInt(req.query.page, 1, 1, 100000);
    const pageSize = asInt(req.query.pageSize, 25, 5, MAX_PAGE_SIZE);
    const sort = String(req.query.sort || "");
    const order = String(req.query.order || "desc").toLowerCase() === "asc" ? "ASC" : "DESC";
    const columns = await getColumns(tableName);
    const meta = await getTableMeta(tableName);
    const search = buildSearch(columns, req.query.search);
    const safeSort = columns.some((column) => column.column_name === sort)
      ? sort
      : columns.find((column) => column.key === "PRI")?.column_name || columns[0].column_name;

    const tableId = quoteId(tableName);
    const totalRows = await query(`SELECT COUNT(*) AS total FROM ${tableId} ${search.clause}`, search.params);
    const offset = (page - 1) * pageSize;
    const rows = await query(
      `SELECT * FROM ${tableId} ${search.clause} ORDER BY ${quoteId(safeSort)} ${order} LIMIT ${pageSize} OFFSET ${offset}`,
      search.params
    );

    res.json({
      table: {
        table_name: meta.TABLE_NAME,
        row_count_estimate: Number(meta.TABLE_ROWS || 0),
        table_comment: meta.TABLE_COMMENT || "",
        create_time: meta.CREATE_TIME,
        update_time: meta.UPDATE_TIME,
        group: tableGroup(meta.TABLE_NAME),
        mutation_allowed: mutationAllowed(meta.TABLE_NAME),
      },
      columns,
      primary_key: columns.filter((column) => column.key === "PRI").map((column) => column.column_name),
      rows,
      pagination: {
        page,
        pageSize,
        total: Number(totalRows[0]?.total || 0),
        totalPages: Math.max(1, Math.ceil(Number(totalRows[0]?.total || 0) / pageSize)),
      },
    });
  } catch (err) {
    res.status(err.status || 500).json({ error: "Failed to load table data", details: err.message });
  }
});

router.post("/:table", async (req, res) => {
  try {
    const tableName = req.params.table;
    if (!mutationAllowed(tableName)) {
      return res.status(403).json({ error: "This log/audit table is read-only in the UI." });
    }

    const columns = await getColumns(tableName);
    const { fields, values } = normalizeRecord(req.body.record || req.body, columns, { includePrimary: true });
    if (!fields.length) return res.status(400).json({ error: "No insertable fields were provided." });

    const sql = `INSERT INTO ${quoteId(tableName)} (${fields.map(quoteId).join(", ")}) VALUES (${fields.map(() => "?").join(", ")})`;
    const result = await db.promise().execute(sql, values).then(([rows]) => rows);
    res.status(201).json({ success: true, insertId: result.insertId || null });
  } catch (err) {
    res.status(err.status || 500).json({ error: "Failed to insert row", details: err.message });
  }
});

router.put("/:table", async (req, res) => {
  try {
    const tableName = req.params.table;
    if (!mutationAllowed(tableName)) {
      return res.status(403).json({ error: "This log/audit table is read-only in the UI." });
    }

    const columns = await getColumns(tableName);
    const { where, values: keyValues } = normalizeKey(req.body.key || {}, columns);
    const { fields, values } = normalizeRecord(req.body.record || {}, columns, { includePrimary: false });
    if (!fields.length) return res.status(400).json({ error: "No editable fields were provided." });

    const assignments = fields.map((field) => `${quoteId(field)} = ?`).join(", ");
    await db.promise().execute(`UPDATE ${quoteId(tableName)} SET ${assignments} WHERE ${where}`, [...values, ...keyValues]);
    res.json({ success: true });
  } catch (err) {
    res.status(err.status || 500).json({ error: "Failed to update row", details: err.message });
  }
});

router.delete("/:table", async (req, res) => {
  try {
    const tableName = req.params.table;
    if (!mutationAllowed(tableName)) {
      return res.status(403).json({ error: "This log/audit table is read-only in the UI." });
    }

    const columns = await getColumns(tableName);
    const { where, values } = normalizeKey(req.body.key || {}, columns);
    await db.promise().execute(`DELETE FROM ${quoteId(tableName)} WHERE ${where}`, values);
    res.json({ success: true });
  } catch (err) {
    res.status(err.status || 500).json({ error: "Failed to delete row", details: err.message });
  }
});

module.exports = router;
