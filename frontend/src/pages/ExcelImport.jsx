import { useMemo, useState } from "react";
import * as XLSX from "xlsx";

function ExcelImport() {
  const [rows, setRows] = useState([]);
  const [headers, setHeaders] = useState([]);
  const [message, setMessage] = useState("");
  const [defaultClosureId, setDefaultClosureId] = useState("");
  const [defaultWorkstreamId, setDefaultWorkstreamId] = useState("");
  const [defaultCreatedBy, setDefaultCreatedBy] = useState("1");

  const cleanSqlText = (value) => {
    if (value === null || value === undefined || value === "") return "";
    return String(value).replace(/'/g, "''").replace(/\r?\n|\r/g, " ").trim();
  };

  const getValue = (row, possibleNames) => {
    const keys = Object.keys(row);

    for (const name of possibleNames) {
      const foundKey = keys.find(
        (key) => key.trim().toLowerCase() === name.trim().toLowerCase()
      );

      if (foundKey) return row[foundKey];
    }

    return "";
  };

  const formatDateForSql = (value) => {
    if (!value) return null;

    if (typeof value === "number") {
      const parsed = XLSX.SSF.parse_date_code(value);
      if (!parsed) return null;

      const yyyy = parsed.y;
      const mm = String(parsed.m).padStart(2, "0");
      const dd = String(parsed.d).padStart(2, "0");

      return `${yyyy}-${mm}-${dd}`;
    }

    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return null;

    return date.toISOString().split("T")[0];
  };

  const formatMp = (value) => {
    if (value === null || value === undefined || value === "") return "NULL";

    const text = String(value).trim();

    if (!text) return "NULL";

    const converted = text.replace("/", ".");

    const number = Number(converted);

    if (Number.isNaN(number)) return "NULL";

    return number;
  };

  const handleFileUpload = async (event) => {
    const file = event.target.files?.[0];

    if (!file) return;

    try {
      setMessage("");

      const data = await file.arrayBuffer();
      const workbook = XLSX.read(data);
      const firstSheetName = workbook.SheetNames[0];
      const worksheet = workbook.Sheets[firstSheetName];

      const jsonRows = XLSX.utils.sheet_to_json(worksheet, {
        defval: "",
        raw: true,
      });

      if (!jsonRows.length) {
        setRows([]);
        setHeaders([]);
        setMessage("No rows found in this spreadsheet.");
        return;
      }

      setRows(jsonRows);
      setHeaders(Object.keys(jsonRows[0] || {}));
      setMessage(`Loaded ${jsonRows.length} row(s) from ${firstSheetName}.`);
    } catch (err) {
      console.error(err);
      setMessage("Failed to read Excel file.");
    }
  };

  const generatedSql = useMemo(() => {
    if (!rows.length) return "";

    return rows
      .map((row, index) => {
        const rowNumber = index + 1;

        const jobNumber =
          getValue(row, ["job_number", "Job Number", "Job No", "Job"]) ||
          `SRMD${String(rowNumber).padStart(5, "0")}`;

        const title = getValue(row, ["title", "Title"]) || "Defects";

        const closureId =
          getValue(row, ["closure_id", "Closure ID"]) || defaultClosureId;

        const workstreamId =
          getValue(row, ["workstream_id", "Workstream ID"]) ||
          defaultWorkstreamId;

        const startMp = getValue(row, [
          "start_mp",
          "Start MP",
          "Start",
          "From MP",
        ]);

        const endMp = getValue(row, ["end_mp", "End MP", "End", "To MP"]);

        const status = getValue(row, ["status", "Status"]) || "Planned";

        const plannedDateValue = getValue(row, [
          "planned_date",
          "Planned Date",
          "Date",
        ]);

        const plannedDate = formatDateForSql(plannedDateValue);

        const workOrder = getValue(row, [
          "work_order",
          "Work Order",
          "WO",
          "Order",
        ]);

        const activity = getValue(row, ["activity", "Activity"]) || "";

        const location = getValue(row, ["location", "Location"]) || "";

        const description =
          getValue(row, ["description", "Description", "Defect"]) || "";

        const activityCode =
          getValue(row, ["activity_code", "Activity Code"]) || "";

        const notes = getValue(row, ["notes", "Notes"]) || "";

        const createdBy =
          getValue(row, ["created_by", "Created By"]) || defaultCreatedBy || 1;

        if (!closureId || !workstreamId) {
          return `-- Row ${rowNumber} skipped: missing closure_id or workstream_id`;
        }

        return `INSERT INTO jobs (
  job_number,
  title,
  closure_id,
  workstream_id,
  start_mp,
  end_mp,
  status,
  planned_date,
  notes,
  created_at,
  work_order,
  activity,
  location,
  description,
  activity_code,
  created_by
) VALUES (
  '${cleanSqlText(jobNumber)}',
  '${cleanSqlText(title)}',
  ${closureId},
  ${workstreamId},
  ${formatMp(startMp)},
  ${formatMp(endMp)},
  '${cleanSqlText(status)}',
  ${plannedDate ? `'${plannedDate}'` : "NULL"},
  ${notes ? `'${cleanSqlText(notes)}'` : "NULL"},
  NOW(),
  ${workOrder ? `'${cleanSqlText(workOrder)}'` : "NULL"},
  ${activity ? `'${cleanSqlText(activity)}'` : "NULL"},
  ${location ? `'${cleanSqlText(location)}'` : "NULL"},
  ${description ? `'${cleanSqlText(description)}'` : "NULL"},
  ${activityCode ? `'${cleanSqlText(activityCode)}'` : "NULL"},
  ${createdBy}
);`;
      })
      .join("\n\n");
  }, [rows, defaultClosureId, defaultWorkstreamId, defaultCreatedBy]);

  const copySql = async () => {
    if (!generatedSql) {
      setMessage("No SQL to copy.");
      return;
    }

    try {
      await navigator.clipboard.writeText(generatedSql);
      setMessage("SQL copied to clipboard.");
    } catch (err) {
      console.error(err);
      setMessage("Could not copy SQL. Please select and copy manually.");
    }
  };

  const downloadSql = () => {
    if (!generatedSql) {
      setMessage("No SQL to download.");
      return;
    }

    const blob = new Blob([generatedSql], {
      type: "text/sql;charset=utf-8",
    });

    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");

    link.href = url;
    link.download = "jobs-import.sql";
    link.click();

    URL.revokeObjectURL(url);
  };

  return (
    <div className="list-page list-page-compact">
      <div className="list-page-header list-page-header-tight">
        <div>
          <h1 className="page-title">Excel to SQL Import</h1>
          <p className="page-subtitle">
            Upload an Excel file, preview the rows, then generate SQL for the jobs table.
          </p>
        </div>
      </div>

      {message && <p className="form-message">{message}</p>}

      <div className="filter-card filter-card-compact">
        <div className="detail-form-grid">
          <div className="form-group">
            <label>Excel File</label>
            <input
              type="file"
              accept=".xlsx,.xls,.csv"
              onChange={handleFileUpload}
            />
          </div>

          <div className="form-group">
            <label>Default Closure ID</label>
            <input
              type="number"
              value={defaultClosureId}
              onChange={(e) => setDefaultClosureId(e.target.value)}
              placeholder="e.g. 10"
            />
          </div>

          <div className="form-group">
            <label>Default Workstream ID</label>
            <input
              type="number"
              value={defaultWorkstreamId}
              onChange={(e) => setDefaultWorkstreamId(e.target.value)}
              placeholder="e.g. 1"
            />
          </div>

          <div className="form-group">
            <label>Default Created By</label>
            <input
              type="number"
              value={defaultCreatedBy}
              onChange={(e) => setDefaultCreatedBy(e.target.value)}
            />
          </div>
        </div>

        <div className="detail-form-actions">
          <button type="button" className="detail-btn" onClick={copySql}>
            Copy SQL
          </button>

          <button
            type="button"
            className="detail-btn detail-btn-secondary"
            onClick={downloadSql}
          >
            Download SQL
          </button>
        </div>
      </div>

      {headers.length > 0 && (
        <div className="detail-card" style={{ marginBottom: "20px" }}>
          <h2 style={{ marginTop: 0 }}>Detected Columns</h2>
          <p>{headers.join(", ")}</p>
        </div>
      )}

      {rows.length > 0 && (
        <div className="list-table-card" style={{ marginBottom: "20px" }}>
          <div className="list-table-header">
            <h2>Preview</h2>
            <span>{rows.length} row(s)</span>
          </div>

          <div className="table-wrapper">
            <table className="enhanced-table">
              <thead>
                <tr>
                  {headers.map((header) => (
                    <th key={header}>{header}</th>
                  ))}
                </tr>
              </thead>

              <tbody>
                {rows.slice(0, 10).map((row, rowIndex) => (
                  <tr key={rowIndex}>
                    {headers.map((header) => (
                      <td key={header}>{String(row[header] ?? "")}</td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {rows.length > 10 && (
            <p style={{ padding: "0 16px 16px" }}>
              Showing first 10 rows only.
            </p>
          )}
        </div>
      )}

      <div className="list-table-card">
        <div className="list-table-header">
          <h2>Generated SQL</h2>
          <span>{rows.length ? `${rows.length} possible statement(s)` : "No file loaded"}</span>
        </div>

        <textarea
          value={generatedSql}
          readOnly
          style={{
            width: "100%",
            minHeight: "420px",
            border: "none",
            padding: "16px",
            fontFamily: "Consolas, monospace",
            fontSize: "13px",
            resize: "vertical",
            boxSizing: "border-box",
          }}
          placeholder="Generated SQL will appear here..."
        />
      </div>
    </div>
  );
}

export default ExcelImport;