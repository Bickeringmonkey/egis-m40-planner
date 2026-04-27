import { useMemo, useState } from "react";
import * as XLSX from "xlsx";
import api from "../services/api";

function ExcelImport() {
  const [fileName, setFileName] = useState("");
  const [rows, setRows] = useState([]);
  const [preview, setPreview] = useState([]);
  const [summary, setSummary] = useState(null);
  const [mode, setMode] = useState("upsert");
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);

  const requiredHeaders = [
    "job_number",
    "activity",
    "location",
    "description",
    "start_mp",
    "end_mp",
    "status",
    "planned_date",
    "closure_ref",
    "workstream",
  ];

  const normaliseDate = (value) => {
    if (!value) return "";

    if (typeof value === "number") {
      const parsed = XLSX.SSF.parse_date_code(value);
      if (!parsed) return "";

      return `${parsed.y}-${String(parsed.m).padStart(2, "0")}-${String(
        parsed.d
      ).padStart(2, "0")}`;
    }

    const text = String(value).trim();

    if (/^\d{4}-\d{2}-\d{2}$/.test(text)) return text;

    const date = new Date(text);
    if (Number.isNaN(date.getTime())) return text;

    return date.toISOString().split("T")[0];
  };

  const cleanRow = (row) => ({
    job_number: row.job_number || row["Job Number"] || row["Job No"] || "",
    title: row.title || row.Title || "",
    work_order: row.work_order || row["Work Order"] || row.WO || "",
    activity: row.activity || row.Activity || "",
    location: row.location || row.Location || "",
    description: row.description || row.Description || "",
    activity_code: row.activity_code || row["Activity Code"] || "",
    start_mp: row.start_mp || row["Start MP"] || row.Start || "",
    end_mp: row.end_mp || row["End MP"] || row.End || "",
    status: row.status || row.Status || "Planned",
    planned_date: normaliseDate(row.planned_date || row["Planned Date"] || row.Date || ""),
    closure_ref: row.closure_ref || row["Closure Ref"] || row.Closure || "",
    workstream: row.workstream || row.Workstream || "",
    notes: row.notes || row.Notes || "",
  });

  const readExcelFile = async (file) => {
    try {
      setLoading(true);
      setMessage("");
      setFileName(file.name);
      setPreview([]);
      setSummary(null);

      const data = await file.arrayBuffer();
      const workbook = XLSX.read(data);
      const firstSheetName = workbook.SheetNames[0];
      const sheet = workbook.Sheets[firstSheetName];

      const json = XLSX.utils.sheet_to_json(sheet, {
        defval: "",
        raw: true,
      });

      const cleaned = json.map(cleanRow);
      setRows(cleaned);

      if (!cleaned.length) {
        setMessage("No rows found in the spreadsheet.");
        return;
      }

      setMessage(`Loaded ${cleaned.length} row(s) from ${firstSheetName}. Now run Preview.`);
    } catch (err) {
      console.error(err);
      setMessage("Failed to read Excel file.");
    } finally {
      setLoading(false);
    }
  };

  const handleFileInput = (event) => {
    const file = event.target.files?.[0];
    if (file) readExcelFile(file);
  };

  const handleDrop = (event) => {
    event.preventDefault();
    const file = event.dataTransfer.files?.[0];
    if (file) readExcelFile(file);
  };

  const runPreview = async () => {
    if (!rows.length) {
      setMessage("Upload an Excel file first.");
      return;
    }

    try {
      setLoading(true);
      setMessage("");

      const res = await api.post("/jobs/import/preview", {
        jobs: rows,
        mode,
      });

      setSummary(res.data.summary);
      setPreview(res.data.preview || []);
      setMessage("Preview complete.");
    } catch (err) {
      console.error(err);
      setMessage(err.response?.data?.error || "Preview failed.");
    } finally {
      setLoading(false);
    }
  };

  const commitImport = async () => {
    if (!rows.length) {
      setMessage("Upload an Excel file first.");
      return;
    }

    if (summary?.errors > 0) {
      setMessage("Fix preview errors before importing.");
      return;
    }

    const confirmed = window.confirm(
      `Import jobs now?\n\nInserts: ${summary?.inserts || 0}\nUpdates: ${
        summary?.updates || 0
      }`
    );

    if (!confirmed) return;

    try {
      setLoading(true);
      setMessage("");

      const res = await api.post("/jobs/import/commit", {
        jobs: rows,
        mode,
      });

      setMessage(
        `Import completed. Inserted: ${res.data.inserted || 0}. Updated: ${
          res.data.updated || 0
        }.`
      );

      await runPreview();
    } catch (err) {
      console.error(err);

      if (err.response?.data?.details) {
        setMessage(
          err.response.data.details
            .map((item) => `Row ${item.rowNumber}: ${item.errors.join(", ")}`)
            .join("\n")
        );
      } else {
        setMessage(err.response?.data?.error || "Import failed.");
      }
    } finally {
      setLoading(false);
    }
  };

  const duplicateCount = useMemo(() => {
    const seen = new Set();
    let count = 0;

    rows.forEach((row) => {
      const key = String(row.job_number || "").trim().toLowerCase();
      if (!key) return;
      if (seen.has(key)) count += 1;
      seen.add(key);
    });

    return count;
  }, [rows]);

  const missingHeaders = useMemo(() => {
    if (!rows.length) return [];
    const available = Object.keys(rows[0] || {}).map((key) => key.toLowerCase());
    return requiredHeaders.filter((header) => !available.includes(header.toLowerCase()));
  }, [rows]);

  const getActionClass = (action) => {
    if (action === "insert") return "status-badge status-planned";
    if (action === "update") return "status-badge status-complete";
    if (action === "error") return "status-badge status-cancelled";
    return "status-badge";
  };

  return (
    <div className="list-page list-page-compact">
      <div className="list-page-header list-page-header-tight">
        <div>
          <h1 className="page-title">Excel Import</h1>
          <p className="page-subtitle">
            Drag in an Excel file, preview inserts/updates, then import safely.
          </p>
        </div>
      </div>

      {message && <pre className="form-message" style={{ whiteSpace: "pre-wrap" }}>{message}</pre>}

      <div className="filter-card filter-card-compact">
        <div
          onDrop={handleDrop}
          onDragOver={(event) => event.preventDefault()}
          style={{
            border: "2px dashed #abc022",
            borderRadius: "18px",
            padding: "28px",
            textAlign: "center",
            background: "#f8fafc",
            marginBottom: "18px",
          }}
        >
          <h2 style={{ marginTop: 0 }}>Drop Excel file here</h2>
          <p>Accepted: .xlsx, .xls, .csv</p>

          <input
            type="file"
            accept=".xlsx,.xls,.csv"
            onChange={handleFileInput}
          />

          {fileName && <p><strong>Selected:</strong> {fileName}</p>}
        </div>

        <div className="detail-form-grid">
          <div className="form-group">
            <label>Import Mode</label>
            <select value={mode} onChange={(e) => setMode(e.target.value)}>
              <option value="upsert">Insert new and update existing</option>
              <option value="insert_only">Insert only - block duplicates</option>
              <option value="update_existing">Update existing only</option>
            </select>
          </div>

          <div className="form-group">
            <label>Rows Loaded</label>
            <input value={rows.length} readOnly />
          </div>

          <div className="form-group">
            <label>Duplicate Job Numbers in File</label>
            <input value={duplicateCount} readOnly />
          </div>
        </div>

        <div className="detail-form-actions">
          <button
            type="button"
            className="detail-btn detail-btn-secondary"
            onClick={runPreview}
            disabled={loading || !rows.length}
          >
            Preview Import
          </button>

          <button
            type="button"
            className="detail-btn"
            onClick={commitImport}
            disabled={loading || !rows.length || !summary || summary.errors > 0}
          >
            Commit Import
          </button>
        </div>
      </div>

      {missingHeaders.length > 0 && (
        <div className="detail-card" style={{ marginBottom: "20px" }}>
          <h2 style={{ marginTop: 0 }}>Header Check</h2>
          <p>
            Missing expected headers: <strong>{missingHeaders.join(", ")}</strong>
          </p>
          <p>
            The importer can still work with some alternative names, but best
            practice is to use the standard headers.
          </p>
        </div>
      )}

      {summary && (
        <div className="dashboard-kpi-grid" style={{ marginBottom: "20px" }}>
          <div className="dashboard-kpi-card">
            <div className="dashboard-kpi-body">
              <div className="dashboard-kpi-label">Rows</div>
              <div className="dashboard-kpi-value">{summary.totalRows}</div>
            </div>
          </div>

          <div className="dashboard-kpi-card">
            <div className="dashboard-kpi-body">
              <div className="dashboard-kpi-label">Inserts</div>
              <div className="dashboard-kpi-value">{summary.inserts}</div>
            </div>
          </div>

          <div className="dashboard-kpi-card">
            <div className="dashboard-kpi-body">
              <div className="dashboard-kpi-label">Updates</div>
              <div className="dashboard-kpi-value">{summary.updates}</div>
            </div>
          </div>

          <div className="dashboard-kpi-card">
            <div className="dashboard-kpi-body">
              <div className="dashboard-kpi-label">Errors</div>
              <div className="dashboard-kpi-value">{summary.errors}</div>
            </div>
          </div>
        </div>
      )}

      {preview.length > 0 && (
        <div className="list-table-card">
          <div className="list-table-header">
            <h2>Import Preview</h2>
            <span>{preview.length} row(s)</span>
          </div>

          <div className="table-wrapper">
            <table className="enhanced-table">
              <thead>
                <tr>
                  <th>Row</th>
                  <th>Action</th>
                  <th>Job Number</th>
                  <th>Closure Ref</th>
                  <th>Workstream</th>
                  <th>Activity</th>
                  <th>Planned Date</th>
                  <th>Issues</th>
                </tr>
              </thead>

              <tbody>
                {preview.map((row) => (
                  <tr key={`${row.rowNumber}-${row.job.job_number}`}>
                    <td>{row.rowNumber}</td>
                    <td>
                      <span className={getActionClass(row.action)}>
                        {row.action}
                      </span>
                    </td>
                    <td>{row.job.job_number}</td>
                    <td>{row.job.closure_ref}</td>
                    <td>{row.job.workstream}</td>
                    <td>{row.job.activity}</td>
                    <td>{row.job.planned_date}</td>
                    <td>
                      {row.errors?.length ? row.errors.join(", ") : ""}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      <div className="detail-card" style={{ marginTop: "20px" }}>
        <h2 style={{ marginTop: "10px", marginLeft: "20px" }}>Recommended Excel Headers</h2>
        <p>
          <div className="excel-headers">
  {[
    "job_number",
    "title",
    "work_order",
    "activity",
    "location",
    "description",
    "activity_code",
    "start_mp",
    "end_mp",
    "status",
    "planned_date",
    "closure_ref",
    "workstream",
    "notes"
  ].map((header) => (
    <span key={header} className="header-tag">
      {header}
    </span>
  ))}
</div>
        </p>
      </div>
    </div>
  );
}

export default ExcelImport;