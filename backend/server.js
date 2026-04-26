const express = require("express");
const cors = require("cors");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
require("dotenv").config();

const db = require("./db/db");
const auth = require("./middleware/auth");
const requireRole = require("./middleware/requireRole");

const app = express();
const PORT = process.env.PORT || 5000;
const JWT_SECRET = process.env.JWT_SECRET || "dev_secret_change_me";

app.use(cors());
app.use(express.json());

// -----------------------------
// Helpers
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

  if (
  ![
    "admin",
    "planner",
    "viewer",
    "supervisor",
    "night_manager",
    "lead_scheduler",
  ].includes(role)
) {
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

  if (
  ![
    "admin",
    "planner",
    "viewer",
    "supervisor",
    "night_manager",
    "lead_scheduler",
  ].includes(role)
) {
    return res.status(400).json({ error: "Invalid role" });
  }

  const activeValue = is_active ? 1 : 0;

  if (password && password.trim() !== "") {
    try {
      const passwordHash = await bcrypt.hash(password, 10);

      const sql = `
        UPDATE users
        SET
          name = ?,
          email = ?,
          role = ?,
          is_active = ?,
          password_hash = ?
        WHERE id = ?
      `;

      db.query(sql, [name, email, role, activeValue, passwordHash, userId], (err, result) => {
        if (err) {
          console.error("Error updating user with password:", err);
          return res.status(500).json({ error: "Failed to update user" });
        }

        if (result.affectedRows === 0) {
          return res.status(404).json({ error: "User not found" });
        }

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
    SET
      name = ?,
      email = ?,
      role = ?,
      is_active = ?
    WHERE id = ?
  `;

  db.query(sql, [name, email, role, activeValue, userId], (err, result) => {
    if (err) {
      console.error("Error updating user:", err);
      return res.status(500).json({ error: "Failed to update user" });
    }

    if (result.affectedRows === 0) {
      return res.status(404).json({ error: "User not found" });
    }

    res.json({ message: "User updated successfully" });
  });
});

// -----------------------------
// Protected routes below
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

app.get("/api/dashboard/overview", auth, (req, res) => {
  const dashboardSql = `
    SELECT
      COUNT(*) AS totalJobs,

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
    GROUP BY workstreams.name
    ORDER BY workstreams.name
  `;

  const upcomingJobsSql = `
    SELECT
      jobs.id,
      jobs.job_number,
      jobs.activity,
      jobs.title,
      jobs.planned_date,
      jobs.status,
      closures.closure_ref
    FROM jobs
    LEFT JOIN closures ON jobs.closure_id = closures.id
    WHERE jobs.planned_date IS NOT NULL
    ORDER BY jobs.planned_date ASC, jobs.job_number ASC
    LIMIT 5
  `;

  db.query(dashboardSql, (err1, dashboardRes) => {
    if (err1) {
      console.error("Dashboard summary error:", err1);
      return res.status(500).json({ error: "Failed to fetch dashboard data" });
    }

    db.query(workstreamCompletionSql, (err2, workstreamRes) => {
      if (err2) {
        console.error("Dashboard workstream error:", err2);
        return res.status(500).json({ error: "Failed to fetch dashboard data" });
      }

      db.query(monthlyWorkstreamCompletionSql, (err3, monthlyWorkstreamRes) => {
        if (err3) {
          console.error("Dashboard monthly workstream error:", err3);
          return res.status(500).json({ error: "Failed to fetch dashboard data" });
        }

        db.query(upcomingJobsSql, (err4, upcomingJobsRes) => {
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
            summary: {
              totalJobs,
              completedJobs: Number(summary.completedJobs || 0),
              plannedJobs: Number(summary.plannedJobs || 0),
              cancelledJobs: Number(summary.cancelledJobs || 0),

              overallCompletePercent: totalJobs
                ? Number(((finalCompleteJobs / totalJobs) * 100).toFixed(1))
                : 0,

              monthlyCompletePercent: monthlyTotalJobs
                ? Number(((monthlyCompleteJobs / monthlyTotalJobs) * 100).toFixed(1))
                : 0,

              paperworkCheckedPercent: totalJobs
                ? Number(((paperworkCheckedJobs / totalJobs) * 100).toFixed(1))
                : 0,

              finalSignoffPercent: totalJobs
                ? Number(((finalCompleteJobs / totalJobs) * 100).toFixed(1))
                : 0,

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
                completePercent: total
                  ? Number(((complete / total) * 100).toFixed(1))
                  : 0,
                paperworkPercent: total
                  ? Number(((paperwork / total) * 100).toFixed(1))
                  : 0,
              };
            }),

            monthlyWorkstreamCompletion: monthlyWorkstreamRes.map((row) => {
              const total = Number(row.totalJobs || 0);
              const complete = Number(row.completeJobs || 0);

              return {
                workstream: row.workstream,
                totalJobs: total,
                completeJobs: complete,
                completePercent: total
                  ? Number(((complete / total) * 100).toFixed(1))
                  : 0,
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
    SELECT 
      jobs.id,
      jobs.job_number,
      jobs.title,
      jobs.work_order,
      jobs.activity,
      jobs.location,
      jobs.description,
      jobs.activity_code,
      jobs.start_mp,
      jobs.end_mp,
      jobs.status,
      jobs.planned_date,
      workstreams.name AS workstream
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
    closure_ref,
    closure_date,
    start_date,
    end_date,
    carriageway,
    start_mp,
    end_mp,
    closure_type,
    status,
    notes,
    nems_number,
    junctions_between,
    lane_configuration,
    cone_on_time,
    cone_off_time,
    briefing_time,
    duty_manager,
    night_supervisor,
    depot,
    welfare_location,
    nearest_hospital,
    tm_install_time,
    tm_clear_time,
    slip_roads = [],
  } = req.body;

  const dates = normaliseClosureDates(closure_date, start_date, end_date);

  const closureSql = `
    INSERT INTO closures (
      closure_ref,
      closure_date,
      start_date,
      end_date,
      carriageway,
      start_mp,
      end_mp,
      closure_type,
      status,
      notes,
      nems_number,
      junctions_between,
      lane_configuration,
      cone_on_time,
      cone_off_time,
      briefing_time,
      duty_manager,
      night_supervisor,
      depot,
      welfare_location,
      nearest_hospital,
      tm_install_time,
      tm_clear_time
    )
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `;

  db.query(
    closureSql,
    [
      closure_ref,
      dates.closure_date,
      dates.start_date,
      dates.end_date,
      carriageway || null,
      start_mp || null,
      end_mp || null,
      closure_type || null,
      status || null,
      notes || null,
      nems_number || null,
      junctions_between || null,
      lane_configuration || null,
      cone_on_time || null,
      cone_off_time || null,
      briefing_time || null,
      duty_manager || null,
      night_supervisor || null,
      depot || null,
      welfare_location || null,
      nearest_hospital || null,
      tm_install_time || null,
      tm_clear_time || null,
    ],
    (err, result) => {
      if (err) {
        console.error("Closure insert error:", err);
        return res.status(500).json({ error: "Insert failed" });
      }

      const closureId = result.insertId;
      const cleanedSlipRoads = slip_roads.map((sr) => (sr || "").trim()).filter(Boolean);

      if (cleanedSlipRoads.length === 0) {
        return res.json({ message: "Closure created", id: closureId });
      }

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
    closure_ref,
    closure_date,
    start_date,
    end_date,
    carriageway,
    start_mp,
    end_mp,
    closure_type,
    status,
    notes,
    nems_number,
    junctions_between,
    lane_configuration,
    cone_on_time,
    cone_off_time,
    briefing_time,
    duty_manager,
    night_supervisor,
    depot,
    welfare_location,
    nearest_hospital,
    tm_install_time,
    tm_clear_time,
    slip_roads = [],
  } = req.body;

  const dates = normaliseClosureDates(closure_date, start_date, end_date);

  const updateSql = `
    UPDATE closures
    SET
      closure_ref = ?,
      closure_date = ?,
      start_date = ?,
      end_date = ?,
      carriageway = ?,
      start_mp = ?,
      end_mp = ?,
      closure_type = ?,
      status = ?,
      notes = ?,
      nems_number = ?,
      junctions_between = ?,
      lane_configuration = ?,
      cone_on_time = ?,
      cone_off_time = ?,
      briefing_time = ?,
      duty_manager = ?,
      night_supervisor = ?,
      depot = ?,
      welfare_location = ?,
      nearest_hospital = ?,
      tm_install_time = ?,
      tm_clear_time = ?
    WHERE id = ?
  `;

  db.query(
    updateSql,
    [
      closure_ref,
      dates.closure_date,
      dates.start_date,
      dates.end_date,
      carriageway || null,
      start_mp || null,
      end_mp || null,
      closure_type || null,
      status || null,
      notes || null,
      nems_number || null,
      junctions_between || null,
      lane_configuration || null,
      cone_on_time || null,
      cone_off_time || null,
      briefing_time || null,
      duty_manager || null,
      night_supervisor || null,
      depot || null,
      welfare_location || null,
      nearest_hospital || null,
      tm_install_time || null,
      tm_clear_time || null,
      closureId,
    ],
    (err) => {
      if (err) {
        console.error("Closure update error:", err);
        return res.status(500).json({ error: "Failed to update closure" });
      }

      db.query(`DELETE FROM closure_slip_roads WHERE closure_id = ?`, [closureId], (deleteErr) => {
        if (deleteErr) return res.status(500).json({ error: "Closure updated but slip roads cleanup failed" });

        const cleanedSlipRoads = slip_roads.map((sr) => (sr || "").trim()).filter(Boolean);

        if (cleanedSlipRoads.length === 0) {
          return res.json({ message: "Closure updated successfully" });
        }

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
    SELECT 
      jobs.id,
      jobs.job_number,
      jobs.title,
      jobs.work_order,
      jobs.activity,
      jobs.location,
      jobs.description,
      jobs.activity_code,
      jobs.closure_id,
      jobs.start_mp,
      jobs.end_mp,
      jobs.status,
      jobs.planned_date,
      closures.closure_ref,
      closures.closure_date,
      closures.start_date,
      closures.end_date,
      workstreams.name AS workstream
    FROM jobs
    LEFT JOIN closures ON jobs.closure_id = closures.id
    LEFT JOIN workstreams ON jobs.workstream_id = workstreams.id
    ORDER BY jobs.planned_date, jobs.job_number
  `;

  db.query(sql, (err, results) => {
    if (err) return res.status(500).json({ error: "Database query failed" });
    res.json(results);
  });
});

app.get("/api/jobs/by-range", auth, (req, res) => {
  const { startDate, endDate } = req.query;

  if (!startDate || !endDate) {
    return res.status(400).json({ error: "Start date and end date are required" });
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
      jobs.activity_code,
      jobs.closure_id,
      jobs.start_mp,
      jobs.end_mp,
      jobs.status,
      jobs.planned_date,
      closures.closure_ref,
      closures.closure_date,
      closures.start_date,
      closures.end_date,
      workstreams.name AS workstream
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
    SELECT 
      jobs.id,
      jobs.job_number,
      jobs.title,
      jobs.work_order,
      jobs.activity,
      jobs.location,
      jobs.description,
      jobs.activity_code,
      jobs.start_mp,
      jobs.end_mp,
      jobs.status,
      jobs.planned_date,
      jobs.notes,
      jobs.closure_id,
      jobs.workstream_id,
      closures.closure_ref,
      closures.closure_date,
      closures.start_date,
      closures.end_date,
      closures.carriageway,
      workstreams.name AS workstream
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
    start_mp,
    end_mp,
    status,
    planned_date,
    notes,
  } = req.body;

  const sql = `
    INSERT INTO jobs (
      job_number,
      title,
      work_order,
      activity,
      location,
      description,
      activity_code,
      closure_id,
      workstream_id,
      start_mp,
      end_mp,
      status,
      planned_date,
      notes
    )
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
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
      start_mp || null,
      end_mp || null,
      status || null,
      planned_date || null,
      notes || null,
    ],
    (err, result) => {
      if (err) return res.status(500).json({ error: "Insert failed" });
      res.json({ message: "Job created", id: result.insertId });
    }
  );
});

app.put("/api/jobs/:id", auth, requireRole("admin", "planner"), (req, res) => {
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
    start_mp,
    end_mp,
    status,
    planned_date,
    notes,
  } = req.body;

  const sql = `
    UPDATE jobs
    SET
      job_number = ?,
      title = ?,
      work_order = ?,
      activity = ?,
      location = ?,
      description = ?,
      activity_code = ?,
      closure_id = ?,
      workstream_id = ?,
      start_mp = ?,
      end_mp = ?,
      status = ?,
      planned_date = ?,
      notes = ?
    WHERE id = ?
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
      start_mp || null,
      end_mp || null,
      status || null,
      planned_date || null,
      notes || null,
      req.params.id,
    ],
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

// -----------------------------
// Night works
// -----------------------------
app.get("/api/nightworks", auth, (req, res) => {
  const { date, startDate, endDate, closureId } = req.query;

  const rangeStart = startDate || date;
  const rangeEnd = endDate || date;

  if (!rangeStart || !rangeEnd) {
    return res.status(400).json({ error: "Date range is required" });
  }

  let sql = `
    SELECT 
      jobs.id,
      jobs.job_number,
      jobs.title,
      jobs.work_order,
      jobs.activity,
      jobs.location,
      jobs.description,
      jobs.activity_code,
      jobs.start_mp,
      jobs.end_mp,
      jobs.status,
      jobs.planned_date,
      jobs.closure_id,
      closures.closure_ref,
      closures.closure_date,
      closures.start_date,
      closures.end_date,
      closures.carriageway,
      closures.closure_type,
      closures.nems_number,
      closures.junctions_between,
      closures.lane_configuration,
      workstreams.name AS workstream
    FROM jobs
    INNER JOIN closures ON jobs.closure_id = closures.id
    INNER JOIN workstreams ON jobs.workstream_id = workstreams.id
    WHERE jobs.planned_date BETWEEN ? AND ?
      AND COALESCE(closures.start_date, closures.closure_date) <= ?
      AND COALESCE(closures.end_date, closures.closure_date) >= ?
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
    SELECT
      jobs.id,
      jobs.job_number,
      jobs.work_order,
      jobs.activity,
      jobs.location,
      jobs.description,
      jobs.activity_code,
      jobs.start_mp,
      jobs.end_mp,
      jobs.status,
      jobs.planned_date,
      jobs.notes,
      workstreams.name AS workstream
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
            emergency:
              closure.briefing_emergency && closure.briefing_emergency.trim() !== ""
                ? closure.briefing_emergency
                : defaultEmergency,
            sequence:
              closure.briefing_sequence && closure.briefing_sequence.trim() !== ""
                ? closure.briefing_sequence
                : defaultSequence,
            generalNotes:
              closure.briefing_general_notes && closure.briefing_general_notes.trim() !== ""
                ? closure.briefing_general_notes
                : defaultGeneralNotes,
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
    SET
      briefing_emergency = ?,
      briefing_sequence = ?,
      briefing_general_notes = ?
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
    SELECT
      jobs.id,
      jobs.job_number,
      jobs.work_order,
      jobs.activity,
      jobs.activity_code,
      jobs.location,
      jobs.description,
      jobs.start_mp,
      jobs.end_mp,
      jobs.status,
      jobs.notes,
      jobs.planned_date,
      workstreams.name AS workstream,
      closures.closure_ref,
      closures.closure_date,
      closures.start_date,
      closures.end_date,
      closures.carriageway,
      closures.junctions_between,
      closures.lane_configuration,
      closures.nems_number
    FROM jobs
    LEFT JOIN closures ON jobs.closure_id = closures.id
    LEFT JOIN workstreams ON jobs.workstream_id = workstreams.id
    WHERE jobs.planned_date BETWEEN ? AND ?
      AND jobs.workstream_id = ?
      AND COALESCE(closures.start_date, closures.closure_date) <= ?
      AND COALESCE(closures.end_date, closures.closure_date) >= ?
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

    if (!date || !closureId) {
      return res.status(400).json({ error: "Date and closure are required" });
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
        jobs.activity_code,
        jobs.start_mp,
        jobs.end_mp,
        jobs.status,
        jobs.planned_date,
        jobs.notes,
        jobs.supervisor_checked,
        jobs.supervisor_checked_by,
        jobs.supervisor_checked_at,
        jobs.paperwork_checked,
        jobs.paperwork_checked_by,
        jobs.paperwork_checked_at,
        jobs.night_manager_checked,
        jobs.night_manager_checked_by,
        jobs.night_manager_checked_at,
        jobs.lead_scheduler_checked,
        jobs.lead_scheduler_checked_by,
        jobs.lead_scheduler_checked_at,
        jobs.completion_notes,
        workstreams.name AS workstream,
        closures.closure_ref,
        closures.carriageway,
        closures.junctions_between,
        closures.lane_configuration,
        closures.nems_number
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

app.put(
  "/api/jobs/:id/supervisor-check",
  auth,
  requireRole("admin", "supervisor"),
  (req, res) => {
    const jobId = req.params.id;
    const { supervisor_checked, paperwork_checked, completion_notes } = req.body;

    if (paperwork_checked && !supervisor_checked) {
      return res.status(400).json({
        error: "Works must be marked complete before paperwork can be checked.",
      });
    }

    const sql = `
      UPDATE jobs
      SET
        supervisor_checked = ?,
        supervisor_checked_by = ?,
        supervisor_checked_at = CASE WHEN ? = 1 THEN NOW() ELSE NULL END,
        paperwork_checked = ?,
        paperwork_checked_by = ?,
        paperwork_checked_at = CASE WHEN ? = 1 THEN NOW() ELSE NULL END,
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
        completion_notes || null,
        jobId,
      ],
      (err, result) => {
        if (err) {
          console.error("Supervisor check error:", err);
          return res.status(500).json({ error: "Failed to save supervisor check" });
        }

        if (result.affectedRows === 0) {
          return res.status(404).json({ error: "Job not found" });
        }

        res.json({ message: "Supervisor check saved" });
      }
    );
  }
);

app.put(
  "/api/jobs/:id/night-manager-check",
  auth,
  requireRole("admin", "night_manager"),
  (req, res) => {
    const jobId = req.params.id;
    const { night_manager_checked } = req.body;

    db.query(
      `SELECT paperwork_checked FROM jobs WHERE id = ?`,
      [jobId],
      (checkErr, checkResults) => {
        if (checkErr) {
          console.error("Night manager pre-check error:", checkErr);
          return res.status(500).json({ error: "Failed to check job status" });
        }

        if (checkResults.length === 0) {
          return res.status(404).json({ error: "Job not found" });
        }

        const job = checkResults[0];

        if (night_manager_checked && !job.paperwork_checked) {
          return res.status(400).json({
            error: "Paperwork must be checked first.",
          });
        }

        const sql = `
          UPDATE jobs
          SET
            night_manager_checked = ?,
            night_manager_checked_by = ?,
            night_manager_checked_at = CASE WHEN ? = 1 THEN NOW() ELSE NULL END
          WHERE id = ?
        `;

        db.query(
          sql,
          [
            night_manager_checked ? 1 : 0,
            night_manager_checked ? req.user.id : null,
            night_manager_checked ? 1 : 0,
            jobId,
          ],
          (err, result) => {
            if (err) {
              console.error("Night manager check error:", err);
              return res.status(500).json({
                error: "Failed to save night manager check",
              });
            }

            if (result.affectedRows === 0) {
              return res.status(404).json({ error: "Job not found" });
            }

            res.json({ message: "Night manager check saved" });
          }
        );
      }
    );
  }
);

app.put(
  "/api/jobs/:id/lead-scheduler-check",
  auth,
  requireRole("admin", "lead_scheduler"),
  (req, res) => {
    const jobId = req.params.id;
    const { lead_scheduler_checked } = req.body;

    db.query(
      `SELECT night_manager_checked FROM jobs WHERE id = ?`,
      [jobId],
      (checkErr, checkResults) => {
        if (checkErr) {
          console.error("Lead scheduler pre-check error:", checkErr);
          return res.status(500).json({ error: "Failed to check job status" });
        }

        if (checkResults.length === 0) {
          return res.status(404).json({ error: "Job not found" });
        }

        const job = checkResults[0];

        if (lead_scheduler_checked && !job.night_manager_checked) {
          return res.status(400).json({
            error: "Manager check must be completed first.",
          });
        }

        const sql = `
          UPDATE jobs
          SET
            lead_scheduler_checked = ?,
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
              return res.status(500).json({
                error: "Failed to save lead scheduler check",
              });
            }

            if (result.affectedRows === 0) {
              return res.status(404).json({ error: "Job not found" });
            }

            res.json({ message: "Lead scheduler check saved" });
          }
        );
      }
    );
  }
);
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});