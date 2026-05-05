const express = require("express");
const cors = require("cors");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const multer = require("multer");
const XLSX = require("xlsx");
require("dotenv").config();

const db = require("./db/db");
const auth = require("./middleware/auth");
const requireRole = require("./middleware/requireRole");

const app = express();
const PORT = process.env.PORT || 5000;
const JWT_SECRET = process.env.JWT_SECRET || "dev_secret_change_me";

const upload = multer({ storage: multer.memoryStorage() });

app.use(cors());
app.use(express.json({ limit: "25mb" }));

// -----------------------------
// Excel Validation Helpers
// Updated: 27 April 2026
// -----------------------------
const REQUIRED_HEADERS = [
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
  "notes",
];

function normaliseHeader(value) {
  return String(value || "")
    .trim()
    .toLowerCase()
    .replace(/\s+/g, "_");
}

function excelDateToJSDate(value) {
  if (!value) return null;

  if (value instanceof Date) {
    return value.toISOString().slice(0, 10);
  }

  if (typeof value === "number") {
    const date = XLSX.SSF.parse_date_code(value);
    if (!date) return null;

    return `${date.y}-${String(date.m).padStart(2, "0")}-${String(date.d).padStart(2, "0")}`;
  }

  const parsed = new Date(value);
  if (isNaN(parsed.getTime())) return null;

  return parsed.toISOString().slice(0, 10);
}

// -----------------------------
// General Helpers
// -----------------------------
function signToken(user) {
  return jwt.sign(
    {
      id: user.id,
      email: user.email,
      role: user.role,
      name: user.name,
    },
    JWT_SECRET,
    { expiresIn: "12h" }
  );
}

function normaliseClosureDates(closure_date, start_date, end_date) {
  const finalStartDate = start_date || closure_date || null;
  const finalEndDate = end_date || start_date || closure_date || null;
  const finalClosureDate = closure_date || finalStartDate || null;

  return {
    closure_date: finalClosureDate,
    start_date: finalStartDate,
    end_date: finalEndDate,
  };
}
function getIssueReason(job) {
  const notes = String(job.completion_notes || "").trim();

  if (job.issue_reason) return job.issue_reason;
  if (job.issue_flagged && notes) return "Supervisor flagged issue";
  if (!job.supervisor_checked) return "Works not completed";
  if (job.supervisor_checked && !job.paperwork_checked) return "Paperwork missing";

  return "Issue flagged";
}

// -----------------------------
// Excel Upload Validation
// -----------------------------
app.post(
  "/api/import-jobs/validate",
  auth,
  requireRole("admin"),
  upload.single("file"),
  async (req, res) => {
    try {
      if (!req.file) {
        return res.status(400).json({
          valid: false,
          errors: ["No file uploaded."],
        });
      }

      const workbook = XLSX.read(req.file.buffer, {
        type: "buffer",
        cellDates: true,
      });

      const sheetName = workbook.SheetNames[0];
      const sheet = workbook.Sheets[sheetName];

      if (!sheet) {
        return res.status(400).json({
          valid: false,
          errors: ["The Excel file does not contain a readable sheet."],
        });
      }

      const rows = XLSX.utils.sheet_to_json(sheet, {
        defval: "",
        raw: false,
      });

      if (!rows.length) {
        return res.status(400).json({
          valid: false,
          errors: ["The Excel sheet is empty."],
        });
      }

      const originalHeaders = Object.keys(rows[0]);
      const normalisedHeaders = originalHeaders.map(normaliseHeader);

      const missingHeaders = REQUIRED_HEADERS.filter(
        (header) => !normalisedHeaders.includes(header)
      );

      const errors = [];
      const warnings = [];

      if (missingHeaders.length > 0) {
        errors.push(`Missing required headers: ${missingHeaders.join(", ")}`);
      }

      const headerMap = {};
      originalHeaders.forEach((header) => {
        headerMap[normaliseHeader(header)] = header;
      });

      const seenJobNumbers = new Set();

      rows.forEach((row, index) => {
        const excelRowNumber = index + 2;
        const getValue = (field) => row[headerMap[field]];

        const jobNumber = String(getValue("job_number") || "").trim();
        const title = String(getValue("title") || "").trim();
        const plannedDate = getValue("planned_date");
        const closureRef = String(getValue("closure_ref") || "").trim();
        const workstream = String(getValue("workstream") || "").trim();
        const startMp = getValue("start_mp");
        const endMp = getValue("end_mp");

        if (!jobNumber) errors.push(`Row ${excelRowNumber}: job_number is missing.`);
        if (!title) errors.push(`Row ${excelRowNumber}: title is missing.`);
        if (!plannedDate || !excelDateToJSDate(plannedDate)) {
          errors.push(`Row ${excelRowNumber}: planned_date is missing or invalid.`);
        }
        if (!closureRef) errors.push(`Row ${excelRowNumber}: closure_ref is missing.`);
        if (!workstream) errors.push(`Row ${excelRowNumber}: workstream is missing.`);

        if (jobNumber) {
          const key = jobNumber.toLowerCase();
          if (seenJobNumbers.has(key)) {
            errors.push(`Row ${excelRowNumber}: duplicate job_number in this Excel file: ${jobNumber}.`);
          }
          seenJobNumbers.add(key);
        }

        if (startMp !== "" && isNaN(Number(startMp))) {
          errors.push(`Row ${excelRowNumber}: start_mp must be a number.`);
        }

        if (endMp !== "" && isNaN(Number(endMp))) {
          errors.push(`Row ${excelRowNumber}: end_mp must be a number.`);
        }

        if (startMp !== "" && endMp !== "" && Number(startMp) > Number(endMp)) {
          warnings.push(`Row ${excelRowNumber}: start_mp is greater than end_mp.`);
        }
      });

      return res.json({
        valid: errors.length === 0,
        totalRows: rows.length,
        errors,
        warnings,
        headersFound: normalisedHeaders,
      });
    } catch (error) {
      console.error("Excel validation error:", error);
      return res.status(500).json({
        valid: false,
        errors: ["Server error while validating Excel file."],
      });
    }
  }
);

// -----------------------------
// Public routes
// -----------------------------
app.get("/api/health", (req, res) => {
  res.json({ ok: true, message: "Backend is running" });
});

app.post("/api/auth/login", (req, res) => {
  const { email, password } = req.body;

  if (!email || !password) {
    return res.status(400).json({ error: "Email and password are required" });
  }

  const sql = `
    SELECT id, name, email, password_hash, role, is_active
    FROM users
    WHERE email = ?
    LIMIT 1
  `;

  db.query(sql, [email], async (err, results) => {
    if (err) {
      console.error("Login query error:", err);
      return res.status(500).json({ error: "Login failed" });
    }

    if (results.length === 0) {
      return res.status(401).json({ error: "Invalid email or password" });
    }

    const user = results[0];

    if (!user.is_active) {
      return res.status(403).json({ error: "User account is inactive" });
    }

    const passwordOk = await bcrypt.compare(password, user.password_hash);

    if (!passwordOk) {
      return res.status(401).json({ error: "Invalid email or password" });
    }

    const token = signToken(user);

    res.json({
      token,
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
      },
    });
  });
});

app.get("/api/auth/me", auth, (req, res) => {
  const sql = `
    SELECT id, name, email, role, is_active, created_at
    FROM users
    WHERE id = ?
    LIMIT 1
  `;

  db.query(sql, [req.user.id], (err, results) => {
    if (err) {
      console.error("Auth me query error:", err);
      return res.status(500).json({ error: "Failed to load user" });
    }

    if (results.length === 0) {
      return res.status(404).json({ error: "User not found" });
    }

    const user = results[0];

    if (!user.is_active) {
      return res.status(403).json({ error: "User account is inactive" });
    }

    res.json(user);
  });
});

// -----------------------------
// Admin user management
// -----------------------------
app.get("/api/users", auth, requireRole("admin"), (req, res) => {
  const sql = `
    SELECT id, name, email, role, is_active, created_at
    FROM users
    ORDER BY created_at DESC
  `;

  db.query(sql, (err, results) => {
    if (err) {
      console.error("Error fetching users:", err);
      return res.status(500).json({ error: "Failed to fetch users" });
    }

    res.json(results);
  });
});

app.post("/api/users", auth, requireRole("admin"), async (req, res) => {
  const { name, email, password, role } = req.body;

  if (!name || !email || !password || !role) {
    return res.status(400).json({ error: "Name, email, password, and role are required" });
  }

  if (!["admin", "planner", "viewer", "supervisor", "night_manager", "lead_scheduler"].includes(role)) {
    return res.status(400).json({ error: "Invalid role" });
  }

  try {
    const passwordHash = await bcrypt.hash(password, 10);

    const sql = `
      INSERT INTO users (name, email, password_hash, role, is_active)
      VALUES (?, ?, ?, ?, 1)
    `;

    db.query(sql, [name, email, passwordHash, role], (err, result) => {
      if (err) {
        console.error("Error creating user:", err);
        return res.status(500).json({ error: "Failed to create user" });
      }

      res.json({ message: "User created successfully", id: result.insertId });
    });
  } catch (err) {
    console.error("Password hash error:", err);
    return res.status(500).json({ error: "Failed to create user" });
  }
});

app.put("/api/users/:id", auth, requireRole("admin"), async (req, res) => {
  const userId = req.params.id;
  const { name, email, role, is_active, password } = req.body;

  if (!name || !email || !role) {
    return res.status(400).json({ error: "Name, email, and role are required" });
  }

  if (!["admin", "planner", "viewer", "supervisor", "night_manager", "lead_scheduler"].includes(role)) {
    return res.status(400).json({ error: "Invalid role" });
  }

  const activeValue = is_active ? 1 : 0;

  if (password && password.trim() !== "") {
    try {
      const passwordHash = await bcrypt.hash(password, 10);

      const sql = `
        UPDATE users
        SET name = ?, email = ?, role = ?, is_active = ?, password_hash = ?
        WHERE id = ?
      `;

      db.query(sql, [name, email, role, activeValue, passwordHash, userId], (err, result) => {
        if (err) {
          console.error("Error updating user with password:", err);
          return res.status(500).json({ error: "Failed to update user" });
        }

        if (result.affectedRows === 0) return res.status(404).json({ error: "User not found" });
        res.json({ message: "User updated successfully" });
      });
    } catch (err) {
      console.error("Password hash error:", err);
      return res.status(500).json({ error: "Failed to update user" });
    }

    return;
  }

  const sql = `
    UPDATE users
    SET name = ?, email = ?, role = ?, is_active = ?
    WHERE id = ?
  `;

  db.query(sql, [name, email, role, activeValue, userId], (err, result) => {
    if (err) {
      console.error("Error updating user:", err);
      return res.status(500).json({ error: "Failed to update user" });
    }

    if (result.affectedRows === 0) return res.status(404).json({ error: "User not found" });
    res.json({ message: "User updated successfully" });
  });
});

// -----------------------------
// Workstreams
// -----------------------------
app.get("/api/workstreams", auth, (req, res) => {
  const sql = "SELECT * FROM workstreams ORDER BY name";

  db.query(sql, (err, results) => {
    if (err) {
      console.error("Error fetching workstreams:", err);
      return res.status(500).json({ error: "Database query failed" });
    }

    res.json(results);
  });
});

// -----------------------------
// Dashboard
// -----------------------------
app.get("/api/dashboard/overview", auth, (req, res) => {
  const { date, closureId } = req.query;

  const filters = [];
  const params = [];

  if (date) {
    filters.push("jobs.planned_date = ?");
    params.push(date);
  }

  if (closureId) {
    filters.push("jobs.closure_id = ?");
    params.push(closureId);
  }

  const whereClause = filters.length > 0 ? `WHERE ${filters.join(" AND ")}` : "";

  const dashboardSql = `
    SELECT
      COUNT(*) AS totalJobs,
      COALESCE(SUM(CASE WHEN issue_flagged = 1 THEN 1 ELSE 0 END), 0) AS issueJobs,
      COALESCE(SUM(CASE WHEN LOWER(status) = 'complete' THEN 1 ELSE 0 END), 0) AS completedJobs,
      COALESCE(SUM(CASE WHEN LOWER(status) = 'planned' THEN 1 ELSE 0 END), 0) AS plannedJobs,
      COALESCE(SUM(CASE WHEN LOWER(status) = 'cancelled' THEN 1 ELSE 0 END), 0) AS cancelledJobs,
      COALESCE(SUM(CASE WHEN lead_scheduler_checked = 1 THEN 1 ELSE 0 END), 0) AS finalCompleteJobs,
      COALESCE(SUM(CASE WHEN paperwork_checked = 1 THEN 1 ELSE 0 END), 0) AS paperworkCheckedJobs,
      COALESCE(SUM(CASE WHEN supervisor_checked = 0 THEN 1 ELSE 0 END), 0) AS awaitingSupervisor,
      COALESCE(SUM(CASE WHEN supervisor_checked = 1 AND paperwork_checked = 0 THEN 1 ELSE 0 END), 0) AS awaitingPaperwork,
      COALESCE(SUM(CASE WHEN paperwork_checked = 1 AND night_manager_checked = 0 THEN 1 ELSE 0 END), 0) AS awaitingManager,
      COALESCE(SUM(CASE WHEN night_manager_checked = 1 AND lead_scheduler_checked = 0 THEN 1 ELSE 0 END), 0) AS awaitingFinal,
      COALESCE(SUM(CASE 
        WHEN planned_date >= DATE_FORMAT(CURDATE(), '%Y-%m-01')
         AND planned_date < DATE_ADD(DATE_FORMAT(CURDATE(), '%Y-%m-01'), INTERVAL 1 MONTH)
        THEN 1 ELSE 0 END), 0) AS monthlyTotalJobs,
      COALESCE(SUM(CASE 
        WHEN planned_date >= DATE_FORMAT(CURDATE(), '%Y-%m-01')
         AND planned_date < DATE_ADD(DATE_FORMAT(CURDATE(), '%Y-%m-01'), INTERVAL 1 MONTH)
         AND lead_scheduler_checked = 1
        THEN 1 ELSE 0 END), 0) AS monthlyCompleteJobs
    FROM jobs
    ${whereClause}
  `;

  const workstreamCompletionSql = `
    SELECT
      COALESCE(workstreams.name, 'Unknown') AS workstream,
      COUNT(jobs.id) AS totalJobs,
      COALESCE(SUM(CASE WHEN jobs.lead_scheduler_checked = 1 THEN 1 ELSE 0 END), 0) AS completeJobs,
      COALESCE(SUM(CASE WHEN jobs.paperwork_checked = 1 THEN 1 ELSE 0 END), 0) AS paperworkCheckedJobs,
      COALESCE(SUM(CASE WHEN jobs.supervisor_checked = 1 THEN 1 ELSE 0 END), 0) AS supervisorCheckedJobs,
      COALESCE(SUM(CASE WHEN jobs.night_manager_checked = 1 THEN 1 ELSE 0 END), 0) AS managerCheckedJobs
    FROM jobs
    LEFT JOIN workstreams ON jobs.workstream_id = workstreams.id
    ${whereClause}
    GROUP BY workstreams.name
    ORDER BY workstreams.name
  `;

  const monthlyWorkstreamCompletionSql = `
    SELECT
      COALESCE(workstreams.name, 'Unknown') AS workstream,
      COUNT(jobs.id) AS totalJobs,
      COALESCE(SUM(CASE WHEN jobs.lead_scheduler_checked = 1 THEN 1 ELSE 0 END), 0) AS completeJobs
    FROM jobs
    LEFT JOIN workstreams ON jobs.workstream_id = workstreams.id
    WHERE jobs.planned_date >= DATE_FORMAT(CURDATE(), '%Y-%m-01')
      AND jobs.planned_date < DATE_ADD(DATE_FORMAT(CURDATE(), '%Y-%m-01'), INTERVAL 1 MONTH)
      ${date ? "AND jobs.planned_date = ?" : ""}
      ${closureId ? "AND jobs.closure_id = ?" : ""}
    GROUP BY workstreams.name
    ORDER BY workstreams.name
  `;

  const upcomingJobsSql = `
    SELECT jobs.id, jobs.job_number, jobs.activity, jobs.title, jobs.planned_date, jobs.status, closures.closure_ref
    FROM jobs
    LEFT JOIN closures ON jobs.closure_id = closures.id
    ${whereClause}
    ORDER BY jobs.planned_date ASC, jobs.job_number ASC
    LIMIT 5
  `;

  db.query(dashboardSql, params, (err1, dashboardRes) => {
    if (err1) {
      console.error("Dashboard summary error:", err1);
      return res.status(500).json({ error: "Failed to fetch dashboard data" });
    }

    db.query(workstreamCompletionSql, params, (err2, workstreamRes) => {
      if (err2) {
        console.error("Dashboard workstream error:", err2);
        return res.status(500).json({ error: "Failed to fetch dashboard data" });
      }

      db.query(monthlyWorkstreamCompletionSql, params, (err3, monthlyWorkstreamRes) => {
        if (err3) {
          console.error("Dashboard monthly workstream error:", err3);
          return res.status(500).json({ error: "Failed to fetch dashboard data" });
        }

        db.query(upcomingJobsSql, params, (err4, upcomingJobsRes) => {
          if (err4) {
            console.error("Dashboard upcoming jobs error:", err4);
            return res.status(500).json({ error: "Failed to fetch dashboard data" });
          }

          const summary = dashboardRes[0] || {};
          const totalJobs = Number(summary.totalJobs || 0);
          const finalCompleteJobs = Number(summary.finalCompleteJobs || 0);
          const paperworkCheckedJobs = Number(summary.paperworkCheckedJobs || 0);
          const monthlyTotalJobs = Number(summary.monthlyTotalJobs || 0);
          const monthlyCompleteJobs = Number(summary.monthlyCompleteJobs || 0);
          

          res.json({
            filters: { date: date || null, closureId: closureId || null },
            summary: {
              totalJobs,
              issueJobs: Number(summary.issueJobs || 0),
              completedJobs: Number(summary.completedJobs || 0),
              plannedJobs: Number(summary.plannedJobs || 0),
              cancelledJobs: Number(summary.cancelledJobs || 0),
              overallCompletePercent: totalJobs ? Number(((finalCompleteJobs / totalJobs) * 100).toFixed(1)) : 0,
              monthlyCompletePercent: monthlyTotalJobs ? Number(((monthlyCompleteJobs / monthlyTotalJobs) * 100).toFixed(1)) : 0,
              paperworkCheckedPercent: totalJobs ? Number(((paperworkCheckedJobs / totalJobs) * 100).toFixed(1)) : 0,
              finalSignoffPercent: totalJobs ? Number(((finalCompleteJobs / totalJobs) * 100).toFixed(1)) : 0,
              monthlyTotalJobs,
              monthlyCompleteJobs,
              finalCompleteJobs,
              paperworkCheckedJobs,
            },
            completionWorkflow: {
              total: totalJobs,
              awaitingSupervisor: Number(summary.awaitingSupervisor || 0),
              awaitingPaperwork: Number(summary.awaitingPaperwork || 0),
              awaitingManager: Number(summary.awaitingManager || 0),
              awaitingFinal: Number(summary.awaitingFinal || 0),
              complete: finalCompleteJobs,
            },
            workstreamCompletion: workstreamRes.map((row) => {
              const total = Number(row.totalJobs || 0);
              const complete = Number(row.completeJobs || 0);
              const paperwork = Number(row.paperworkCheckedJobs || 0);
              return {
                workstream: row.workstream,
                totalJobs: total,
                completeJobs: complete,
                paperworkCheckedJobs: paperwork,
                supervisorCheckedJobs: Number(row.supervisorCheckedJobs || 0),
                managerCheckedJobs: Number(row.managerCheckedJobs || 0),
                completePercent: total ? Number(((complete / total) * 100).toFixed(1)) : 0,
                paperworkPercent: total ? Number(((paperwork / total) * 100).toFixed(1)) : 0,
              };
            }),
            monthlyWorkstreamCompletion: monthlyWorkstreamRes.map((row) => {
              const total = Number(row.totalJobs || 0);
              const complete = Number(row.completeJobs || 0);
              return {
                workstream: row.workstream,
                totalJobs: total,
                completeJobs: complete,
                completePercent: total ? Number(((complete / total) * 100).toFixed(1)) : 0,
              };
            }),
            upcomingJobs: upcomingJobsRes,
          });
        });
      });
    });
  });
});

// -----------------------------
// Closures
// -----------------------------
app.get("/api/closures", auth, (req, res) => {
  const sql = `
    SELECT *
    FROM closures
    ORDER BY COALESCE(start_date, closure_date), closure_ref
  `;

  db.query(sql, (err, results) => {
    if (err) return res.status(500).json({ error: "Database query failed" });
    res.json(results);
  });
});

app.get("/api/closures/by-range", auth, (req, res) => {
  const { startDate, endDate } = req.query;

  if (!startDate || !endDate) {
    return res.status(400).json({ error: "Start date and end date are required" });
  }

  const sql = `
    SELECT *
    FROM closures
    WHERE COALESCE(start_date, closure_date) <= ?
      AND COALESCE(end_date, closure_date) >= ?
    ORDER BY COALESCE(start_date, closure_date), closure_ref
  `;

  db.query(sql, [endDate, startDate], (err, results) => {
    if (err) {
      console.error("Error fetching closures by range:", err);
      return res.status(500).json({ error: "Failed to fetch closures" });
    }

    res.json(results);
  });
});

app.get("/api/closures/:id", auth, (req, res) => {
  const closureId = req.params.id;

  const closureSql = `SELECT * FROM closures WHERE id = ?`;

  const jobsSql = `
    SELECT jobs.id, jobs.job_number, jobs.title, jobs.work_order, jobs.activity, jobs.location,
           jobs.description, jobs.activity_code, jobs.start_mp, jobs.end_mp, jobs.status,
           jobs.planned_date, workstreams.name AS workstream
    FROM jobs
    LEFT JOIN workstreams ON jobs.workstream_id = workstreams.id
    WHERE jobs.closure_id = ?
    ORDER BY jobs.planned_date, jobs.start_mp
  `;

  const slipRoadsSql = `
    SELECT id, slip_road_name, notes
    FROM closure_slip_roads
    WHERE closure_id = ?
    ORDER BY id
  `;

  db.query(closureSql, [closureId], (closureErr, closureResults) => {
    if (closureErr) return res.status(500).json({ error: "Failed to fetch closure" });
    if (closureResults.length === 0) return res.status(404).json({ error: "Closure not found" });

    db.query(jobsSql, [closureId], (jobsErr, jobsResults) => {
      if (jobsErr) return res.status(500).json({ error: "Failed to fetch closure jobs" });

      db.query(slipRoadsSql, [closureId], (slipErr, slipRoadResults) => {
        if (slipErr) return res.status(500).json({ error: "Failed to fetch slip roads" });

        res.json({
          closure: closureResults[0],
          jobs: jobsResults,
          slip_roads: slipRoadResults,
        });
      });
    });
  });
});

app.post("/api/closures", auth, requireRole("admin", "planner"), (req, res) => {
  const {
    closure_ref, closure_date, start_date, end_date, carriageway, start_mp, end_mp,
    closure_type, status, notes, nems_number, junctions_between, lane_configuration,
    cone_on_time, cone_off_time, briefing_time, duty_manager, night_supervisor,
    depot, welfare_location, nearest_hospital, tm_install_time, tm_clear_time,
    slip_roads = [],
  } = req.body;

  const dates = normaliseClosureDates(closure_date, start_date, end_date);

  const closureSql = `
    INSERT INTO closures (
      closure_ref, closure_date, start_date, end_date, carriageway, start_mp, end_mp,
      closure_type, status, notes, nems_number, junctions_between, lane_configuration,
      cone_on_time, cone_off_time, briefing_time, duty_manager, night_supervisor,
      depot, welfare_location, nearest_hospital, tm_install_time, tm_clear_time
    )
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `;

  db.query(
    closureSql,
    [
      closure_ref, dates.closure_date, dates.start_date, dates.end_date, carriageway || null,
      start_mp || null, end_mp || null, closure_type || null, status || null, notes || null,
      nems_number || null, junctions_between || null, lane_configuration || null,
      cone_on_time || null, cone_off_time || null, briefing_time || null, duty_manager || null,
      night_supervisor || null, depot || null, welfare_location || null, nearest_hospital || null,
      tm_install_time || null, tm_clear_time || null,
    ],
    (err, result) => {
      if (err) {
        console.error("Closure insert error:", err);
        return res.status(500).json({ error: "Insert failed" });
      }

      const closureId = result.insertId;
      const cleanedSlipRoads = slip_roads.map((sr) => (sr || "").trim()).filter(Boolean);

      if (cleanedSlipRoads.length === 0) return res.json({ message: "Closure created", id: closureId });

      const slipRoadValues = cleanedSlipRoads.map((name) => [closureId, name, null]);

      db.query(
        `INSERT INTO closure_slip_roads (closure_id, slip_road_name, notes) VALUES ?`,
        [slipRoadValues],
        (slipErr) => {
          if (slipErr) return res.status(500).json({ error: "Closure created but slip roads failed" });
          res.json({ message: "Closure created", id: closureId });
        }
      );
    }
  );
});

app.put("/api/closures/:id", auth, requireRole("admin", "planner"), (req, res) => {
  const closureId = req.params.id;

  const {
    closure_ref, closure_date, start_date, end_date, carriageway, start_mp, end_mp,
    closure_type, status, notes, nems_number, junctions_between, lane_configuration,
    cone_on_time, cone_off_time, briefing_time, duty_manager, night_supervisor,
    depot, welfare_location, nearest_hospital, tm_install_time, tm_clear_time,
    slip_roads = [],
  } = req.body;

  const dates = normaliseClosureDates(closure_date, start_date, end_date);

  const updateSql = `
    UPDATE closures
    SET closure_ref = ?, closure_date = ?, start_date = ?, end_date = ?, carriageway = ?,
        start_mp = ?, end_mp = ?, closure_type = ?, status = ?, notes = ?, nems_number = ?,
        junctions_between = ?, lane_configuration = ?, cone_on_time = ?, cone_off_time = ?,
        briefing_time = ?, duty_manager = ?, night_supervisor = ?, depot = ?, welfare_location = ?,
        nearest_hospital = ?, tm_install_time = ?, tm_clear_time = ?
    WHERE id = ?
  `;

  db.query(
    updateSql,
    [
      closure_ref, dates.closure_date, dates.start_date, dates.end_date, carriageway || null,
      start_mp || null, end_mp || null, closure_type || null, status || null, notes || null,
      nems_number || null, junctions_between || null, lane_configuration || null,
      cone_on_time || null, cone_off_time || null, briefing_time || null, duty_manager || null,
      night_supervisor || null, depot || null, welfare_location || null, nearest_hospital || null,
      tm_install_time || null, tm_clear_time || null, closureId,
    ],
    (err) => {
      if (err) {
        console.error("Closure update error:", err);
        return res.status(500).json({ error: "Failed to update closure" });
      }

      db.query(`DELETE FROM closure_slip_roads WHERE closure_id = ?`, [closureId], (deleteErr) => {
        if (deleteErr) return res.status(500).json({ error: "Closure updated but slip roads cleanup failed" });

        const cleanedSlipRoads = slip_roads.map((sr) => (sr || "").trim()).filter(Boolean);
        if (cleanedSlipRoads.length === 0) return res.json({ message: "Closure updated successfully" });

        const slipRoadValues = cleanedSlipRoads.map((name) => [closureId, name, null]);

        db.query(
          `INSERT INTO closure_slip_roads (closure_id, slip_road_name, notes) VALUES ?`,
          [slipRoadValues],
          (insertErr) => {
            if (insertErr) return res.status(500).json({ error: "Closure updated but slip roads insert failed" });
            res.json({ message: "Closure updated successfully" });
          }
        );
      });
    }
  );
});

app.delete("/api/closures/:id", auth, requireRole("admin", "planner"), (req, res) => {
  const closureId = req.params.id;

  db.query(`SELECT COUNT(*) AS jobCount FROM jobs WHERE closure_id = ?`, [closureId], (checkErr, checkResults) => {
    if (checkErr) return res.status(500).json({ error: "Failed to check linked jobs" });

    if (checkResults[0].jobCount > 0) {
      return res.status(400).json({ error: "Cannot delete closure because it still has linked jobs." });
    }

    db.query(`DELETE FROM closures WHERE id = ?`, [closureId], (deleteErr, deleteResult) => {
      if (deleteErr) return res.status(500).json({ error: "Failed to delete closure" });
      if (deleteResult.affectedRows === 0) return res.status(404).json({ error: "Closure not found" });
      res.json({ message: "Closure deleted successfully" });
    });
  });
});

// -----------------------------
// Jobs
// -----------------------------
app.get("/api/jobs", auth, (req, res) => {
  const sql = `
   SELECT jobs.id, jobs.job_number, jobs.title, jobs.work_order, jobs.activity, jobs.location,
       jobs.description, jobs.activity_code, jobs.closure_id, jobs.start_mp, jobs.end_mp,
       jobs.status, jobs.planned_date, closures.closure_ref, closures.closure_date,
       closures.start_date, closures.end_date, workstreams.name AS workstream,
       COALESCE(subcontractors.company_name, '—') AS subcontractor_name,
       COALESCE(subcontractor_contacts.contact_name, '—') AS subcontractor_contact_name,
       COALESCE(subcontractor_contacts.phone, '—') AS subcontractor_contact_phone
FROM jobs
LEFT JOIN closures ON jobs.closure_id = closures.id
LEFT JOIN workstreams ON jobs.workstream_id = workstreams.id
LEFT JOIN subcontractors ON jobs.subcontractor_id = subcontractors.id
LEFT JOIN subcontractor_contacts ON jobs.subcontractor_contact_id = subcontractor_contacts.id
ORDER BY jobs.planned_date, jobs.job_number
  `;

  db.query(sql, (err, results) => {
    if (err) return res.status(500).json({ error: "Database query failed" });
    res.json(results);
  });
});

app.get("/api/jobs/by-range", auth, (req, res) => {
  const { startDate, endDate } = req.query;

  if (!startDate || !endDate) return res.status(400).json({ error: "Start date and end date are required" });

  const sql = `
    SELECT jobs.id, jobs.job_number, jobs.title, jobs.work_order, jobs.activity, jobs.location,
           jobs.description, jobs.activity_code, jobs.closure_id, jobs.start_mp, jobs.end_mp,
           jobs.status, jobs.planned_date, closures.closure_ref, closures.closure_date,
           closures.start_date, closures.end_date, workstreams.name AS workstream
    FROM jobs
    LEFT JOIN closures ON jobs.closure_id = closures.id
    LEFT JOIN workstreams ON jobs.workstream_id = workstreams.id
    WHERE jobs.planned_date BETWEEN ? AND ?
    ORDER BY jobs.planned_date, closures.closure_ref, jobs.start_mp
  `;

  db.query(sql, [startDate, endDate], (err, results) => {
    if (err) {
      console.error("Error fetching jobs by range:", err);
      return res.status(500).json({ error: "Failed to fetch jobs" });
    }

    res.json(results);
  });
});

app.get("/api/jobs/:id", auth, (req, res) => {
  const sql = `
    SELECT jobs.id, jobs.job_number, jobs.title, jobs.work_order, jobs.activity, jobs.location,
           jobs.description, jobs.activity_code, jobs.start_mp, jobs.end_mp, jobs.status,
           jobs.planned_date, jobs.notes, jobs.closure_id, jobs.workstream_id,
           closures.closure_ref, closures.closure_date, closures.start_date, closures.end_date,
           closures.carriageway, workstreams.name AS workstream
    FROM jobs
    LEFT JOIN closures ON jobs.closure_id = closures.id
    LEFT JOIN workstreams ON jobs.workstream_id = workstreams.id
    WHERE jobs.id = ?
  `;

  db.query(sql, [req.params.id], (err, results) => {
    if (err) return res.status(500).json({ error: "Failed to fetch job" });
    if (results.length === 0) return res.status(404).json({ error: "Job not found" });
    res.json(results[0]);
  });
});

app.post("/api/jobs", auth, requireRole("admin", "planner"), (req, res) => {
  const {
    job_number,
    title,
    work_order,
    activity,
    location,
    description,
    activity_code,
    closure_id,
    workstream_id,
    subcontractor_id,
    subcontractor_contact_id,
    start_mp,
    end_mp,
    status,
    planned_date,
    notes,
  } = req.body;

  const sql = `
    INSERT INTO jobs (
      job_number, title, work_order, activity, location, description, activity_code,
      closure_id, workstream_id, subcontractor_id, subcontractor_contact_id,
      start_mp, end_mp, status, planned_date, notes
    )
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `;

  db.query(
    sql,
    [
      job_number,
      title || null,
      work_order || null,
      activity || null,
      location || null,
      description || null,
      activity_code || null,
      closure_id,
      workstream_id,
      subcontractor_id || null,
      subcontractor_contact_id || null,
      start_mp || null,
      end_mp || null,
      status || null,
      planned_date || null,
      notes || null,
    ],
    (err, result) => {
      if (err) {
        console.error("Job insert error:", err);
        return res.status(500).json({ error: "Insert failed" });
      }

      res.json({ message: "Job created", id: result.insertId });
    }
  );
});

app.put("/api/jobs/:id", auth, requireRole("admin", "planner"), (req, res) => {
  const { job_number, title, work_order, activity, location, description, activity_code, closure_id, workstream_id, start_mp, end_mp, status, planned_date, notes } = req.body;

  const sql = `
    UPDATE jobs
    SET job_number = ?, title = ?, work_order = ?, activity = ?, location = ?, description = ?,
        activity_code = ?, closure_id = ?, workstream_id = ?, start_mp = ?, end_mp = ?,
        status = ?, planned_date = ?, notes = ?
    WHERE id = ?
  `;

  db.query(
    sql,
    [job_number, title || null, work_order || null, activity || null, location || null, description || null, activity_code || null, closure_id, workstream_id, start_mp || null, end_mp || null, status || null, planned_date || null, notes || null, req.params.id],
    (err) => {
      if (err) return res.status(500).json({ error: "Failed to update job" });
      res.json({ message: "Job updated successfully" });
    }
  );
});

app.delete("/api/jobs/:id", auth, requireRole("admin", "planner"), (req, res) => {
  db.query(`DELETE FROM jobs WHERE id = ?`, [req.params.id], (err, result) => {
    if (err) return res.status(500).json({ error: "Failed to delete job" });
    if (result.affectedRows === 0) return res.status(404).json({ error: "Job not found" });
    res.json({ message: "Job deleted successfully" });
  });
});
app.get(
  "/api/issues",
  auth,
  requireRole("admin", "planner", "supervisor", "night_manager", "lead_scheduler"),
  (req, res) => {
    const { date, closureId } = req.query;

    const filters = [
      `(
        jobs.issue_flagged = 1
        OR (
          jobs.planned_date < CURDATE()
          AND jobs.lead_scheduler_checked = 0
          AND LOWER(COALESCE(jobs.status, '')) NOT IN ('complete', 'completed', 'cancelled', 'canceled')
        )
        OR (
          jobs.supervisor_checked = 1
          AND jobs.paperwork_checked = 0
          AND LOWER(COALESCE(jobs.status, '')) NOT IN ('complete', 'completed', 'cancelled', 'canceled')
        )
      )`,
    ];

    const params = [];

    if (date) {
      filters.push("jobs.planned_date = ?");
      params.push(date);
    }

    if (closureId) {
      filters.push("jobs.closure_id = ?");
      params.push(closureId);
    }

    const sql = `
      SELECT 
        jobs.id,
        jobs.job_number,
        jobs.title,
        jobs.work_order,
        jobs.activity,
        jobs.location,
        jobs.description,
        jobs.start_mp,
        jobs.end_mp,
        jobs.status,
        jobs.planned_date,
        jobs.completion_notes,
        jobs.issue_flagged,
        jobs.issue_reason,
        jobs.supervisor_checked,
        jobs.paperwork_checked,
        jobs.lead_scheduler_checked,
        jobs.closure_id,

        workstreams.name AS workstream,
        closures.closure_ref,
        closures.carriageway,
        closures.junctions_between,
        closures.lane_configuration,
        closures.nems_number

      FROM jobs
      LEFT JOIN closures ON jobs.closure_id = closures.id
      LEFT JOIN workstreams ON jobs.workstream_id = workstreams.id
      WHERE ${filters.join(" AND ")}
      ORDER BY jobs.planned_date, closures.closure_ref, jobs.start_mp, jobs.job_number
    `;

    db.query(sql, params, (err, results) => {
      if (err) {
        console.error("Issues fetch SQL error:", err);
        return res.status(500).json({
          error: "Failed to fetch issues",
          details: err.message,
          sqlMessage: err.sqlMessage,
        });
      }

      const now = new Date();
      now.setHours(0, 0, 0, 0);

      const mapped = results.map((job) => {
        const planned = job.planned_date ? new Date(job.planned_date) : null;

        if (planned) planned.setHours(0, 0, 0, 0);

        const ageDays = planned
          ? Math.max(Math.floor((now - planned) / (1000 * 60 * 60 * 24)), 0)
          : 0;

        let issueReason = job.issue_reason || "Issue flagged";

        if (
          job.supervisor_checked === 1 &&
          job.paperwork_checked === 0
        ) {
          issueReason = "Paperwork missing";
        }

        if (
          job.issue_flagged !== 1 &&
          job.planned_date &&
          job.lead_scheduler_checked === 0
        ) {
          issueReason = "Works not completed";
        }

        let escalation_status = "green";

        if (ageDays >= 4) {
          escalation_status = "red";
        } else if (ageDays >= 2) {
          escalation_status = "amber";
        }

        return {
          ...job,
          issue_reason_label: issueReason,
          issue_age_days: ageDays,
          escalation_status,
          issue_escalated: escalation_status === "red" ? 1 : 0,
          issue_severity: "low",
          issue_type: "other",
          issue_created_at: null,
        };
      });

      res.json(mapped);
    });
  }
);

app.put(
  "/api/jobs/:id/resolve-issue",
  auth,
  requireRole("admin", "planner", "supervisor", "night_manager", "lead_scheduler"),
  (req, res) => {
    const jobId = req.params.id;

    const sql = `
      UPDATE jobs
      SET issue_flagged = 0,
          issue_reason = NULL,
          issue_resolved_at = NOW(),
          issue_resolved_by = ?
      WHERE id = ?
    `;

    db.query(sql, [req.user.id, jobId], (err, result) => {
      if (err) {
        console.error("Resolve issue error:", err);
        return res.status(500).json({ error: "Failed to resolve issue" });
      }

      if (result.affectedRows === 0) {
        return res.status(404).json({ error: "Job not found" });
      }

      res.json({ message: "Issue resolved" });
    });
  }
);

// -----------------------------
// Smart Excel Job Import
// -----------------------------
function normaliseImportText(value) {
  if (value === null || value === undefined) return "";
  return String(value).trim();
}

function normaliseImportKey(value) {
  return normaliseImportText(value).toLowerCase();
}

function buildImportJobPreview(jobs, mode, closures, workstreams, existingJobs) {
  const closureMap = {};
  const workstreamMap = {};
  const existingJobMap = {};

  closures.forEach((closure) => {
    closureMap[normaliseImportKey(closure.closure_ref)] = closure.id;
  });

  workstreams.forEach((workstream) => {
    workstreamMap[normaliseImportKey(workstream.name)] = workstream.id;
  });

  existingJobs.forEach((job) => {
    existingJobMap[normaliseImportKey(job.job_number)] = job.id;
  });

  return jobs.map((job, index) => {
    const rowNumber = index + 2;
    const jobNumber = normaliseImportText(job.job_number);
    const closureRef = normaliseImportText(job.closure_ref);
    const workstreamName = normaliseImportText(job.workstream);

    const closureId = closureMap[normaliseImportKey(closureRef)];
    const workstreamId = workstreamMap[normaliseImportKey(workstreamName)];
    const existingJobId = existingJobMap[normaliseImportKey(jobNumber)];

    const errors = [];
    if (!jobNumber) errors.push("Missing job_number");
    if (!closureRef) errors.push("Missing closure_ref");
    if (!workstreamName) errors.push("Missing workstream");
    if (closureRef && !closureId) errors.push(`Closure not found: ${closureRef}`);
    if (workstreamName && !workstreamId) errors.push(`Workstream not found: ${workstreamName}`);

    let action = existingJobId ? "update" : "insert";

    if (mode === "insert_only" && existingJobId) {
      action = "error";
      errors.push(`Duplicate job_number already exists: ${jobNumber}`);
    }

    if (mode === "update_existing" && !existingJobId) {
      action = "error";
      errors.push(`Job does not already exist: ${jobNumber}`);
    }

    if (errors.length > 0) action = "error";

    return {
      rowNumber,
      action,
      errors,
      existing_job_id: existingJobId || null,
      closure_id: closureId || null,
      workstream_id: workstreamId || null,
      job: {
        job_number: jobNumber,
        title: normaliseImportText(job.title) || null,
        work_order: normaliseImportText(job.work_order) || null,
        activity: normaliseImportText(job.activity) || null,
        location: normaliseImportText(job.location) || null,
        description: normaliseImportText(job.description) || null,
        activity_code: normaliseImportText(job.activity_code) || null,
        closure_ref: closureRef,
        workstream: workstreamName,
        start_mp: job.start_mp || null,
        end_mp: job.end_mp || null,
        status: normaliseImportText(job.status) || "Planned",
        planned_date: job.planned_date || null,
        notes: normaliseImportText(job.notes) || null,
      },
    };
  });
}

app.post("/api/jobs/import/preview", auth, requireRole("admin", "planner"), (req, res) => {
  const { jobs = [], mode = "upsert" } = req.body;

  if (!Array.isArray(jobs) || jobs.length === 0) return res.status(400).json({ error: "No jobs provided" });

  db.query(`SELECT id, closure_ref FROM closures`, (closureErr, closures) => {
    if (closureErr) {
      console.error("Import preview closure error:", closureErr);
      return res.status(500).json({ error: "Failed to fetch closures" });
    }

    db.query(`SELECT id, name FROM workstreams`, (workstreamErr, workstreams) => {
      if (workstreamErr) {
        console.error("Import preview workstream error:", workstreamErr);
        return res.status(500).json({ error: "Failed to fetch workstreams" });
      }

      db.query(`SELECT id, job_number FROM jobs`, (jobErr, existingJobs) => {
        if (jobErr) {
          console.error("Import preview existing jobs error:", jobErr);
          return res.status(500).json({ error: "Failed to fetch existing jobs" });
        }

        const preview = buildImportJobPreview(jobs, mode, closures, workstreams, existingJobs);

        const summary = {
          totalRows: preview.length,
          inserts: preview.filter((row) => row.action === "insert").length,
          updates: preview.filter((row) => row.action === "update").length,
          errors: preview.filter((row) => row.action === "error").length,
        };

        res.json({ summary, preview });
      });
    });
  });
});

app.post("/api/jobs/import/commit", auth, requireRole("admin", "planner"), (req, res) => {
  const { jobs = [], mode = "upsert" } = req.body;
  const createdBy = req.user.id;

  if (!Array.isArray(jobs) || jobs.length === 0) {
    return res.status(400).json({ error: "No jobs provided" });
  }

  db.query(`SELECT id, closure_ref FROM closures`, (closureErr, closures) => {
    if (closureErr) {
      console.error("Import commit closure error:", closureErr);
      return res.status(500).json({ error: "Failed to fetch closures" });
    }

    db.query(`SELECT id, name FROM workstreams`, (workstreamErr, workstreams) => {
      if (workstreamErr) {
        console.error("Import commit workstream error:", workstreamErr);
        return res.status(500).json({ error: "Failed to fetch workstreams" });
      }

      db.query(`SELECT id, job_number FROM jobs`, (jobErr, existingJobs) => {
        if (jobErr) {
          console.error("Import commit existing jobs error:", jobErr);
          return res.status(500).json({ error: "Failed to fetch existing jobs" });
        }

        const preview = buildImportJobPreview(jobs, mode, closures, workstreams, existingJobs);
        const errorRows = preview.filter((row) => row.action === "error");

        if (errorRows.length > 0) {
          return res.status(400).json({
            error: "Import contains errors",
            details: errorRows.map((row) => ({
              rowNumber: row.rowNumber,
              job_number: row.job.job_number,
              errors: row.errors,
            })),
          });
        }

        let inserted = 0;
        let updated = 0;
        let index = 0;

        const runNext = () => {
          if (index >= preview.length) {
            return res.json({ message: "Import completed", inserted, updated });
          }

          const row = preview[index];
          index += 1;

          const values = [
            row.job.job_number,
            row.job.title,
            row.job.work_order,
            row.job.activity,
            row.job.location,
            row.job.description,
            row.job.activity_code,
            row.closure_id,
            row.workstream_id,
            row.job.start_mp,
            row.job.end_mp,
            row.job.status,
            row.job.planned_date,
            row.job.notes,
          ];

          if (row.action === "insert") {
            const insertSql = `
              INSERT INTO jobs (
                job_number, title, work_order, activity, location, description, activity_code,
                closure_id, workstream_id, start_mp, end_mp, status, planned_date, notes, created_by
              )
              VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            `;

            db.query(insertSql, [...values, createdBy], (insertErr) => {
              if (insertErr) {
                console.error("Import insert error:", insertErr);
                return res.status(500).json({ error: `Insert failed on row ${row.rowNumber}` });
              }

              inserted += 1;
              runNext();
            });
            return;
          }

          if (row.action === "update") {
            const updateSql = `
              UPDATE jobs
              SET job_number = ?, title = ?, work_order = ?, activity = ?, location = ?,
                  description = ?, activity_code = ?, closure_id = ?, workstream_id = ?,
                  start_mp = ?, end_mp = ?, status = ?, planned_date = ?, notes = ?
              WHERE id = ?
            `;

            db.query(updateSql, [...values, row.existing_job_id], (updateErr) => {
              if (updateErr) {
                console.error("Import update error:", updateErr);
                return res.status(500).json({ error: `Update failed on row ${row.rowNumber}` });
              }

              updated += 1;
              runNext();
            });
            return;
          }

          runNext();
        };

        runNext();
      });
    });
  });
});
// -----------------------------
// VRS Job Details
// -----------------------------
app.get("/api/jobs/:id/vrs", auth, (req, res) => {
  const jobId = req.params.id;

  const sql = `
    SELECT *
    FROM vrs_job_details
    WHERE job_id = ?
    LIMIT 1
  `;

  db.query(sql, [jobId], (err, results) => {
    if (err) {
      console.error("Fetch VRS details error:", err);
      return res.status(500).json({ error: "Failed to fetch VRS details" });
    }

    res.json(results[0] || null);
  });
});

app.post(
  "/api/jobs/:id/vrs",
  auth,
  requireRole("admin", "planner"),
  (req, res) => {
    const jobId = req.params.id;

    const {
      category,
      incident_number,
      marker_post,
      carriageway_side,
      closure_type,
      number_of_ops,
      estimated_duration,
      posts_required,
      beams_required,
      components_required,
      diagnosis_required,
      diagnosis_complete,
      concrete_required,
      coring_required,
      push_test_required,
      excavation_required,
      cat_scan_required,
      permit_to_dig_required,
      cold_patch_required,
      amm12_score,
      nc_required,
      comments,
      notes,
    } = req.body;

    const sql = `
      INSERT INTO vrs_job_details (
        job_id,
        category,
        incident_number,
        marker_post,
        carriageway_side,
        closure_type,
        number_of_ops,
        estimated_duration,
        posts_required,
        beams_required,
        components_required,
        diagnosis_required,
        diagnosis_complete,
        concrete_required,
        coring_required,
        push_test_required,
        excavation_required,
        cat_scan_required,
        permit_to_dig_required,
        cold_patch_required,
        amm12_score,
        nc_required,
        comments,
        notes
      )
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      ON DUPLICATE KEY UPDATE
        category = VALUES(category),
        incident_number = VALUES(incident_number),
        marker_post = VALUES(marker_post),
        carriageway_side = VALUES(carriageway_side),
        closure_type = VALUES(closure_type),
        number_of_ops = VALUES(number_of_ops),
        estimated_duration = VALUES(estimated_duration),
        posts_required = VALUES(posts_required),
        beams_required = VALUES(beams_required),
        components_required = VALUES(components_required),
        diagnosis_required = VALUES(diagnosis_required),
        diagnosis_complete = VALUES(diagnosis_complete),
        concrete_required = VALUES(concrete_required),
        coring_required = VALUES(coring_required),
        push_test_required = VALUES(push_test_required),
        excavation_required = VALUES(excavation_required),
        cat_scan_required = VALUES(cat_scan_required),
        permit_to_dig_required = VALUES(permit_to_dig_required),
        cold_patch_required = VALUES(cold_patch_required),
        amm12_score = VALUES(amm12_score),
        nc_required = VALUES(nc_required),
        comments = VALUES(comments),
        notes = VALUES(notes)
    `;

    db.query(
      sql,
      [
        jobId,
        category || null,
        incident_number || null,
        marker_post || null,
        carriageway_side || null,
        closure_type || null,
        number_of_ops || null,
        estimated_duration || null,
        posts_required || null,
        beams_required || null,
        components_required || null,
        diagnosis_required ? 1 : 0,
        diagnosis_complete ? 1 : 0,
        concrete_required ? 1 : 0,
        coring_required ? 1 : 0,
        push_test_required ? 1 : 0,
        excavation_required ? 1 : 0,
        cat_scan_required ? 1 : 0,
        permit_to_dig_required ? 1 : 0,
        cold_patch_required ? 1 : 0,
        amm12_score || null,
        nc_required ? 1 : 0,
        comments || null,
        notes || null,
      ],
      (err) => {
        if (err) {
          console.error("Save VRS details error:", err);
          return res.status(500).json({ error: "Failed to save VRS details" });
        }

        res.json({ message: "VRS details saved" });
      }
    );
  }
);
app.get(
  "/api/vrs-report",
  auth,
  requireRole("admin", "planner", "viewer", "night_manager", "lead_scheduler"),
  (req, res) => {
    const sql = `
      SELECT
        jobs.id AS job_id,
        jobs.job_number,
        jobs.work_order,
        jobs.activity,
        jobs.location,
        jobs.description,
        jobs.status,
        jobs.planned_date,
        jobs.lead_scheduler_checked,

        closures.closure_ref,
        closures.carriageway,
        closures.junctions_between,
        closures.lane_configuration,
        closures.nems_number,

        workstreams.name AS workstream,

        vrs_job_details.category,
        vrs_job_details.incident_number,
        vrs_job_details.marker_post,
        vrs_job_details.carriageway_side,
        vrs_job_details.closure_type,
        vrs_job_details.number_of_ops,
        vrs_job_details.estimated_duration,
        vrs_job_details.posts_required,
        vrs_job_details.beams_required,
        vrs_job_details.components_required,
        vrs_job_details.diagnosis_required,
        vrs_job_details.diagnosis_complete,
        vrs_job_details.concrete_required,
        vrs_job_details.coring_required,
        vrs_job_details.push_test_required,
        vrs_job_details.excavation_required,
        vrs_job_details.cat_scan_required,
        vrs_job_details.permit_to_dig_required,
        vrs_job_details.cold_patch_required,
        vrs_job_details.amm12_score,
        vrs_job_details.nc_required,
        vrs_job_details.comments,
        vrs_job_details.notes,
        vrs_job_details.date_in,
        vrs_job_details.programmed_date,
        vrs_job_details.repair_date,
        vrs_job_details.run_over_date,

        COALESCE(subcontractors.company_name, '—') AS subcontractor_name,
        COALESCE(subcontractor_contacts.contact_name, '—') AS subcontractor_contact_name,
        COALESCE(subcontractor_contacts.phone, '—') AS subcontractor_contact_phone

      FROM vrs_job_details
      INNER JOIN jobs ON vrs_job_details.job_id = jobs.id
      LEFT JOIN closures ON jobs.closure_id = closures.id
      LEFT JOIN workstreams ON jobs.workstream_id = workstreams.id
      LEFT JOIN subcontractors ON jobs.subcontractor_id = subcontractors.id
      LEFT JOIN subcontractor_contacts ON jobs.subcontractor_contact_id = subcontractor_contacts.id
      ORDER BY 
        CASE vrs_job_details.category
          WHEN 'CAT 1' THEN 1
          WHEN 'CAT 2.1' THEN 2
          WHEN 'CAT 2.2' THEN 3
          WHEN 'CAT 2.3' THEN 4
          WHEN 'NFA' THEN 5
          ELSE 6
        END,
        COALESCE(vrs_job_details.run_over_date, jobs.planned_date),
        jobs.job_number
    `;

    db.query(sql, (err, results) => {
      if (err) {
        console.error("VRS report fetch error:", err);
        return res.status(500).json({
          error: "Failed to fetch VRS report",
          details: err.message,
          sqlMessage: err.sqlMessage,
        });
      }

      const now = new Date();
      now.setHours(0, 0, 0, 0);

      const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
      const nextMonthStart = new Date(now.getFullYear(), now.getMonth() + 1, 1);

      const isComplete = (job) =>
        String(job.status || "").toLowerCase() === "complete" ||
        String(job.status || "").toLowerCase() === "completed" ||
        Number(job.lead_scheduler_checked) === 1;

      const mapped = results.map((job) => {
        const runOverDate = job.run_over_date ? new Date(job.run_over_date) : null;
        if (runOverDate) runOverDate.setHours(0, 0, 0, 0);

        const plannedDate = job.planned_date ? new Date(job.planned_date) : null;

        const completedThisMonth =
          isComplete(job) &&
          plannedDate &&
          plannedDate >= monthStart &&
          plannedDate < nextMonthStart;

        const isNcr =
          runOverDate &&
          runOverDate < now &&
          !isComplete(job);

        return {
          ...job,
          is_complete: isComplete(job) ? 1 : 0,
          completed_this_month: completedThisMonth ? 1 : 0,
          is_ncr: isNcr ? 1 : 0,
        };
      });

      const summary = {
        cat1: mapped.filter((j) => j.category === "CAT 1").length,
        cat21: mapped.filter((j) => j.category === "CAT 2.1").length,
        cat22: mapped.filter((j) => j.category === "CAT 2.2").length,
        cat23: mapped.filter((j) => j.category === "CAT 2.3").length,
        completedThisMonth: mapped.filter((j) => j.completed_this_month).length,
        ncrs: mapped.filter((j) => j.is_ncr).length,
      };

      res.json({
        summary,
        jobs: mapped,
      });
    });
  }
);
// -----------------------------
// Subcontractors
// -----------------------------
app.get("/api/subcontractors", auth, (req, res) => {
  const sql = `
    SELECT 
      id,
      company_name,
      notes,
      is_active,
      created_at
    FROM subcontractors
    ORDER BY company_name
  `;

  db.query(sql, (err, results) => {
    if (err) {
      console.error("Fetch subcontractors error:", err);
      return res.status(500).json({ error: "Failed to fetch subcontractors" });
    }

    res.json(results);
  });
});

app.post(
  "/api/subcontractors",
  auth,
  requireRole("admin", "planner"),
  (req, res) => {
    const { company_name, notes } = req.body;

    if (!company_name || !company_name.trim()) {
      return res.status(400).json({ error: "Subcontractor name is required" });
    }

    const sql = `
      INSERT INTO subcontractors (company_name, notes, is_active)
      VALUES (?, ?, 1)
    `;

    db.query(sql, [company_name.trim(), notes || null], (err, result) => {
      if (err) {
        console.error("Create subcontractor error:", err);
        return res.status(500).json({ error: "Failed to create subcontractor" });
      }

      res.json({
        message: "Subcontractor created",
        id: result.insertId,
      });
    });
  }
);

app.put(
  "/api/subcontractors/:id",
  auth,
  requireRole("admin", "planner"),
  (req, res) => {
    const { company_name, notes, is_active } = req.body;

    if (!company_name || !company_name.trim()) {
      return res.status(400).json({ error: "Subcontractor name is required" });
    }

    const sql = `
      UPDATE subcontractors
      SET company_name = ?,
          notes = ?,
          is_active = ?
      WHERE id = ?
    `;

    db.query(
      sql,
      [
        company_name.trim(),
        notes || null,
        is_active ? 1 : 0,
        req.params.id,
      ],
      (err, result) => {
        if (err) {
          console.error("Update subcontractor error:", err);
          return res.status(500).json({ error: "Failed to update subcontractor" });
        }

        if (result.affectedRows === 0) {
          return res.status(404).json({ error: "Subcontractor not found" });
        }

        res.json({ message: "Subcontractor updated" });
      }
    );
  }
);

app.get("/api/subcontractors/:id/contacts", auth, (req, res) => {
  const sql = `
    SELECT 
      id,
      subcontractor_id,
      contact_name,
      phone,
      email,
      role,
      is_primary,
      is_active,
      created_at
    FROM subcontractor_contacts
    WHERE subcontractor_id = ?
    ORDER BY is_primary DESC, contact_name
  `;

  db.query(sql, [req.params.id], (err, results) => {
    if (err) {
      console.error("Fetch subcontractor contacts error:", err);
      return res.status(500).json({ error: "Failed to fetch contacts" });
    }

    res.json(results);
  });
});

app.post(
  "/api/subcontractors/:id/contacts",
  auth,
  requireRole("admin", "planner"),
  (req, res) => {
    const { contact_name, phone, email, role, is_primary } = req.body;
    const subcontractorId = req.params.id;

    if (!contact_name || !contact_name.trim()) {
      return res.status(400).json({ error: "Contact name is required" });
    }

    const insertContact = () => {
      const sql = `
        INSERT INTO subcontractor_contacts (
          subcontractor_id,
          contact_name,
          phone,
          email,
          role,
          is_primary,
          is_active
        )
        VALUES (?, ?, ?, ?, ?, ?, 1)
      `;

      db.query(
        sql,
        [
          subcontractorId,
          contact_name.trim(),
          phone || null,
          email || null,
          role || null,
          is_primary ? 1 : 0,
        ],
        (err, result) => {
          if (err) {
            console.error("Create subcontractor contact error:", err);
            return res.status(500).json({ error: "Failed to create contact" });
          }

          res.json({
            message: "Contact created",
            id: result.insertId,
          });
        }
      );
    };

    if (is_primary) {
      db.query(
        `UPDATE subcontractor_contacts SET is_primary = 0 WHERE subcontractor_id = ?`,
        [subcontractorId],
        (clearErr) => {
          if (clearErr) {
            console.error("Clear primary contact error:", clearErr);
            return res.status(500).json({ error: "Failed to update primary contact" });
          }

          insertContact();
        }
      );
    } else {
      insertContact();
    }
  }
);

app.put(
  "/api/subcontractor-contacts/:id",
  auth,
  requireRole("admin", "planner"),
  (req, res) => {
    const { contact_name, phone, email, role, is_primary, is_active } = req.body;
    const contactId = req.params.id;

    if (!contact_name || !contact_name.trim()) {
      return res.status(400).json({ error: "Contact name is required" });
    }

    db.query(
      `SELECT subcontractor_id FROM subcontractor_contacts WHERE id = ?`,
      [contactId],
      (findErr, findResults) => {
        if (findErr) {
          console.error("Find contact error:", findErr);
          return res.status(500).json({ error: "Failed to find contact" });
        }

        if (findResults.length === 0) {
          return res.status(404).json({ error: "Contact not found" });
        }

        const subcontractorId = findResults[0].subcontractor_id;

        const updateContact = () => {
          const sql = `
            UPDATE subcontractor_contacts
            SET contact_name = ?,
                phone = ?,
                email = ?,
                role = ?,
                is_primary = ?,
                is_active = ?
            WHERE id = ?
          `;

          db.query(
            sql,
            [
              contact_name.trim(),
              phone || null,
              email || null,
              role || null,
              is_primary ? 1 : 0,
              is_active ? 1 : 0,
              contactId,
            ],
            (err, result) => {
              if (err) {
                console.error("Update contact error:", err);
                return res.status(500).json({ error: "Failed to update contact" });
              }

              if (result.affectedRows === 0) {
                return res.status(404).json({ error: "Contact not found" });
              }

              res.json({ message: "Contact updated" });
            }
          );
        };

        if (is_primary) {
          db.query(
            `UPDATE subcontractor_contacts SET is_primary = 0 WHERE subcontractor_id = ?`,
            [subcontractorId],
            (clearErr) => {
              if (clearErr) {
                console.error("Clear primary contact error:", clearErr);
                return res.status(500).json({ error: "Failed to update primary contact" });
              }

              updateContact();
            }
          );
        } else {
          updateContact();
        }
      }
    );
  }
);
// -----------------------------
// Night works
// -----------------------------
app.get("/api/nightworks", auth, (req, res) => {
  const { date, startDate, endDate, closureId } = req.query;

  const rangeStart = startDate || date;
  const rangeEnd = endDate || date;

  if (!rangeStart || !rangeEnd) return res.status(400).json({ error: "Date range is required" });

  let sql = `
    SELECT jobs.id, jobs.job_number, jobs.title, jobs.work_order, jobs.activity, jobs.location,
           jobs.description, jobs.activity_code, jobs.start_mp, jobs.end_mp, jobs.status,
           jobs.planned_date, jobs.closure_id, closures.closure_ref, closures.closure_date,
           closures.start_date, closures.end_date, closures.carriageway, closures.closure_type,
           closures.nems_number, closures.junctions_between, closures.lane_configuration,
           workstreams.name AS workstream
    FROM jobs
    INNER JOIN closures ON jobs.closure_id = closures.id
    INNER JOIN workstreams ON jobs.workstream_id = workstreams.id
    WHERE jobs.planned_date BETWEEN ? AND ?
      AND COALESCE(closures.start_date, closures.closure_date) <= ?
      AND COALESCE(closures.end_date, closures.closure_date) >= ?
      AND LOWER(COALESCE(jobs.status, '')) NOT IN ('complete', 'completed', 'cancelled', 'canceled')
  `;

  const params = [rangeStart, rangeEnd, rangeEnd, rangeStart];

  if (closureId) {
    sql += ` AND closures.id = ?`;
    params.push(closureId);
  }

  sql += ` ORDER BY jobs.planned_date, closures.closure_ref, workstreams.name, jobs.start_mp`;

  db.query(sql, params, (err, results) => {
    if (err) {
      console.error("Error fetching nightworks:", err);
      return res.status(500).json({ error: "Database query failed" });
    }

    res.json(results);
  });
});

// -----------------------------
// Briefings
// -----------------------------
app.get("/api/closures/:id/briefing", auth, (req, res) => {
  const closureId = req.params.id;

  const closureSql = `SELECT * FROM closures WHERE id = ?`;

  const jobsSql = `
    SELECT jobs.id, jobs.job_number, jobs.work_order, jobs.activity, jobs.location,
           jobs.description, jobs.activity_code, jobs.start_mp, jobs.end_mp, jobs.status,
           jobs.planned_date, jobs.notes, workstreams.name AS workstream
    FROM jobs
    LEFT JOIN workstreams ON jobs.workstream_id = workstreams.id
    WHERE jobs.closure_id = ?
    ORDER BY jobs.planned_date, jobs.start_mp, jobs.job_number
  `;

  const slipRoadsSql = `
    SELECT slip_road_name
    FROM closure_slip_roads
    WHERE closure_id = ?
    ORDER BY id
  `;

  db.query(closureSql, [closureId], (closureErr, closureResults) => {
    if (closureErr) return res.status(500).json({ error: "Failed to fetch closure" });
    if (closureResults.length === 0) return res.status(404).json({ error: "Closure not found" });

    const closure = closureResults[0];

    db.query(jobsSql, [closureId], (jobsErr, jobsResults) => {
      if (jobsErr) return res.status(500).json({ error: "Failed to fetch jobs" });

      db.query(slipRoadsSql, [closureId], (slipErr, slipResults) => {
        if (slipErr) return res.status(500).json({ error: "Failed to fetch slip roads" });

        const defaultSequence = `Traffic management to be installed in accordance with the approved closure details.
All operatives are to attend the briefing before commencement of works.
Works are to be completed within the booked extents and in line with the approved method of working.
Any issues, clashes, defects outside scope, or safety concerns must be reported immediately to supervision.`;

        const defaultEmergency = `In the event of an accident, incident, near miss, or emergency, make the area safe where possible, notify supervision immediately, and follow the agreed incident escalation procedure.
Emergency services should be contacted where required and all relevant details recorded.`;

        const defaultGeneralNotes = closure.notes || "No closure-level notes recorded.";

        res.json({
          closure,
          jobs: jobsResults,
          slipRoads: slipResults.map((row) => row.slip_road_name),
          briefing: {
            emergency: closure.briefing_emergency && closure.briefing_emergency.trim() !== "" ? closure.briefing_emergency : defaultEmergency,
            sequence: closure.briefing_sequence && closure.briefing_sequence.trim() !== "" ? closure.briefing_sequence : defaultSequence,
            generalNotes: closure.briefing_general_notes && closure.briefing_general_notes.trim() !== "" ? closure.briefing_general_notes : defaultGeneralNotes,
          },
        });
      });
    });
  });
});

app.put("/api/closures/:id/briefing", auth, requireRole("admin", "planner"), (req, res) => {
  const { emergency, sequence, generalNotes } = req.body;

  const sql = `
    UPDATE closures
    SET briefing_emergency = ?, briefing_sequence = ?, briefing_general_notes = ?
    WHERE id = ?
  `;

  db.query(sql, [emergency || null, sequence || null, generalNotes || null, req.params.id], (err, result) => {
    if (err) return res.status(500).json({ error: "Failed to save briefing" });
    if (result.affectedRows === 0) return res.status(404).json({ error: "Closure not found" });
    res.json({ message: "Briefing saved successfully" });
  });
});

// -----------------------------
// Work Sheet
// -----------------------------
app.get("/api/work-sheet", auth, (req, res) => {
  const { date, startDate, endDate, workstreamId } = req.query;

  const rangeStart = startDate || date;
  const rangeEnd = endDate || date;

  if (!rangeStart || !rangeEnd || !workstreamId) {
    return res.status(400).json({ error: "Date range and workstream are required" });
  }

  const sql = `
    SELECT jobs.id, jobs.job_number, jobs.work_order, jobs.activity, jobs.activity_code,
           jobs.location, jobs.description, jobs.start_mp, jobs.end_mp, jobs.status,
           jobs.notes, jobs.planned_date, workstreams.name AS workstream,
           closures.closure_ref, closures.closure_date, closures.start_date, closures.end_date,
           closures.carriageway, closures.junctions_between, closures.lane_configuration,
           closures.nems_number
    FROM jobs
    LEFT JOIN closures ON jobs.closure_id = closures.id
    LEFT JOIN workstreams ON jobs.workstream_id = workstreams.id
    WHERE jobs.planned_date BETWEEN ? AND ?
      AND jobs.workstream_id = ?
      AND COALESCE(closures.start_date, closures.closure_date) <= ?
      AND COALESCE(closures.end_date, closures.closure_date) >= ?
      AND LOWER(COALESCE(jobs.status, '')) NOT IN ('complete', 'completed', 'cancelled', 'canceled')
    ORDER BY jobs.planned_date, closures.closure_ref, jobs.start_mp, jobs.job_number
  `;

  db.query(sql, [rangeStart, rangeEnd, workstreamId, rangeEnd, rangeStart], (err, results) => {
    if (err) {
      console.error("Error fetching worksheet:", err);
      return res.status(500).json({ error: "Failed to fetch worksheet" });
    }

    res.json(results);
  });
});

// -----------------------------
// Completion Workflow
// -----------------------------
app.get(
  "/api/checksheet/jobs",
  auth,
  requireRole("admin", "planner", "supervisor", "night_manager", "lead_scheduler"),
  (req, res) => {
    const { date, closureId } = req.query;

    if (!date || !closureId) return res.status(400).json({ error: "Date and closure are required" });

    const sql = `
      SELECT jobs.id, jobs.job_number, jobs.title, jobs.work_order, jobs.activity, jobs.location,
             jobs.description, jobs.activity_code, jobs.start_mp, jobs.end_mp, jobs.status,
             jobs.planned_date, jobs.notes, jobs.supervisor_checked, jobs.supervisor_checked_by,
             jobs.supervisor_checked_at, jobs.paperwork_checked, jobs.paperwork_checked_by,
             jobs.paperwork_checked_at, jobs.night_manager_checked, jobs.night_manager_checked_by,
             jobs.night_manager_checked_at, jobs.lead_scheduler_checked, jobs.lead_scheduler_checked_by,
             jobs.lead_scheduler_checked_at, jobs.completion_notes, jobs.issue_flagged, workstreams.name AS workstream,
             closures.closure_ref, closures.carriageway, closures.junctions_between,
             closures.lane_configuration, closures.nems_number
      FROM jobs
      LEFT JOIN closures ON jobs.closure_id = closures.id
      LEFT JOIN workstreams ON jobs.workstream_id = workstreams.id
      WHERE jobs.planned_date = ?
        AND jobs.closure_id = ?
      ORDER BY workstreams.name, jobs.start_mp, jobs.job_number
    `;

    db.query(sql, [date, closureId], (err, results) => {
      if (err) {
        console.error("Error fetching checksheet jobs:", err);
        return res.status(500).json({ error: "Failed to fetch checksheet jobs" });
      }

      res.json(results);
    });
  }
);

app.put("/api/jobs/:id/supervisor-check", auth, requireRole("admin", "supervisor"), (req, res) => {
  const jobId = req.params.id;

  const {
    supervisor_checked,
    paperwork_checked,
    issue_flagged,
    issue_reason,
    issue_severity,
    issue_type,
    completion_notes,
  } = req.body;

  if (paperwork_checked && !supervisor_checked) {
    return res.status(400).json({
      error: "Works must be marked complete before paperwork can be checked.",
    });
  }

  const issueFlag = issue_flagged ? 1 : 0;

  const sql = `
    UPDATE jobs
    SET 
        supervisor_checked = ?,
        supervisor_checked_by = ?,
        supervisor_checked_at = CASE WHEN ? = 1 THEN NOW() ELSE NULL END,

        paperwork_checked = ?,
        paperwork_checked_by = ?,
        paperwork_checked_at = CASE WHEN ? = 1 THEN NOW() ELSE NULL END,

        issue_flagged = ?,
        issue_reason = ?,
        issue_severity = CASE 
          WHEN ? = 1 THEN ?
          ELSE NULL
        END,
        issue_type = CASE 
          WHEN ? = 1 THEN ?
          ELSE NULL
        END,
        issue_created_at = CASE
          WHEN ? = 1 AND issue_created_at IS NULL THEN NOW()
          WHEN ? = 0 THEN NULL
          ELSE issue_created_at
        END,

        completion_notes = ?
    WHERE id = ?
  `;

  db.query(
    sql,
    [
      supervisor_checked ? 1 : 0,
      supervisor_checked ? req.user.id : null,
      supervisor_checked ? 1 : 0,

      paperwork_checked ? 1 : 0,
      paperwork_checked ? req.user.id : null,
      paperwork_checked ? 1 : 0,

      issueFlag,
      issueFlag ? issue_reason || "Supervisor flagged issue" : null,

      issueFlag,
      issue_severity || "low",

      issueFlag,
      issue_type || "other",

      issueFlag,
      issueFlag,

      completion_notes || null,
      jobId,
    ],
    (err, result) => {
      if (err) {
        console.error("Supervisor check error:", err);
       return res.status(500).json({
  error: "Failed to save supervisor check",
  details: err.message,
  sqlMessage: err.sqlMessage,
});
      }

      if (result.affectedRows === 0) {
        return res.status(404).json({ error: "Job not found" });
      }

      res.json({ message: "Supervisor check saved" });
    }
  );
});

app.put("/api/jobs/:id/night-manager-check", auth, requireRole("admin", "night_manager"), (req, res) => {
  const jobId = req.params.id;
  const { night_manager_checked } = req.body;

  db.query(`SELECT paperwork_checked FROM jobs WHERE id = ?`, [jobId], (checkErr, checkResults) => {
    if (checkErr) {
      console.error("Night manager pre-check error:", checkErr);
      return res.status(500).json({ error: "Failed to check job status" });
    }

    if (checkResults.length === 0) return res.status(404).json({ error: "Job not found" });

    const job = checkResults[0];

    if (night_manager_checked && !job.paperwork_checked) {
      return res.status(400).json({ error: "Paperwork must be checked first." });
    }

    const sql = `
      UPDATE jobs
      SET night_manager_checked = ?,
          night_manager_checked_by = ?,
          night_manager_checked_at = CASE WHEN ? = 1 THEN NOW() ELSE NULL END
      WHERE id = ?
    `;

    db.query(sql, [night_manager_checked ? 1 : 0, night_manager_checked ? req.user.id : null, night_manager_checked ? 1 : 0, jobId], (err, result) => {
      if (err) {
        console.error("Night manager check error:", err);
        return res.status(500).json({ error: "Failed to save night manager check" });
      }

      if (result.affectedRows === 0) return res.status(404).json({ error: "Job not found" });
      res.json({ message: "Night manager check saved" });
    });
  });
});

app.put("/api/jobs/:id/lead-scheduler-check", auth, requireRole("admin", "lead_scheduler"), (req, res) => {
  const jobId = req.params.id;
  const { lead_scheduler_checked } = req.body;

  db.query(`SELECT night_manager_checked FROM jobs WHERE id = ?`, [jobId], (checkErr, checkResults) => {
    if (checkErr) {
      console.error("Lead scheduler pre-check error:", checkErr);
      return res.status(500).json({ error: "Failed to check job status" });
    }

    if (checkResults.length === 0) return res.status(404).json({ error: "Job not found" });

    const job = checkResults[0];

    if (lead_scheduler_checked && !job.night_manager_checked) {
      return res.status(400).json({ error: "Manager check must be completed first." });
    }

    const sql = `
      UPDATE jobs
      SET lead_scheduler_checked = ?,
          lead_scheduler_checked_by = ?,
          lead_scheduler_checked_at = CASE WHEN ? = 1 THEN NOW() ELSE NULL END,
          status = CASE WHEN ? = 1 THEN 'Complete' ELSE status END
      WHERE id = ?
    `;

    db.query(
      sql,
      [
        lead_scheduler_checked ? 1 : 0,
        lead_scheduler_checked ? req.user.id : null,
        lead_scheduler_checked ? 1 : 0,
        lead_scheduler_checked ? 1 : 0,
        jobId,
      ],
      (err, result) => {
        if (err) {
          console.error("Lead scheduler check error:", err);
          return res.status(500).json({ error: "Failed to save lead scheduler check" });
        }

        if (result.affectedRows === 0) return res.status(404).json({ error: "Job not found" });
        res.json({ message: "Lead scheduler check saved" });
      }
    );
  });
});


app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
