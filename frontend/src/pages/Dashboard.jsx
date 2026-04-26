import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import api from "../services/api";

function Dashboard() {
  const today = new Date().toISOString().split("T")[0];

  const [data, setData] = useState({
    summary: {
      totalJobs: 0,
      overallCompletePercent: 0,
      monthlyCompletePercent: 0,
      paperworkCheckedPercent: 0,
      finalSignoffPercent: 0,
      monthlyTotalJobs: 0,
      monthlyCompleteJobs: 0,
    },
    completionWorkflow: {
      awaitingSupervisor: 0,
      awaitingPaperwork: 0,
      awaitingManager: 0,
      awaitingFinal: 0,
      complete: 0,
    },
    workstreamCompletion: [],
    monthlyWorkstreamCompletion: [],
    upcomingJobs: [],
  });

  const [closures, setClosures] = useState([]);
  const [selectedDate, setSelectedDate] = useState("");
  const [selectedClosureId, setSelectedClosureId] = useState("");

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const todayLabel = useMemo(() => {
    return new Date().toLocaleDateString("en-GB", {
      day: "numeric",
      month: "long",
      year: "numeric",
      weekday: "long",
    });
  }, []);

  useEffect(() => {
    fetchClosures();
    fetchDashboard();
  }, []);

  const fetchClosures = async () => {
    try {
      const response = await api.get("/closures");
      setClosures(response.data || []);
    } catch (err) {
      console.error("Error fetching closures:", err);
    }
  };

  const fetchDashboard = async (date = selectedDate, closureId = selectedClosureId) => {
    try {
      setLoading(true);
      setError("");

      const params = new URLSearchParams();

      if (date) params.append("date", date);
      if (closureId) params.append("closureId", closureId);

      const queryString = params.toString();
      const url = queryString
        ? `/dashboard/overview?${queryString}`
        : "/dashboard/overview";

      const response = await api.get(url);

      setData((prev) => ({
        ...prev,
        ...response.data,
        summary: {
          ...prev.summary,
          ...(response.data.summary || {}),
        },
        completionWorkflow: {
          ...prev.completionWorkflow,
          ...(response.data.completionWorkflow || {}),
        },
        workstreamCompletion: response.data.workstreamCompletion || [],
        monthlyWorkstreamCompletion:
          response.data.monthlyWorkstreamCompletion || [],
        upcomingJobs: response.data.upcomingJobs || [],
      }));
    } catch (err) {
      console.error("Error fetching dashboard:", err);
      setError("Failed to load dashboard.");
    } finally {
      setLoading(false);
    }
  };

  const handleLoad = () => {
    fetchDashboard(selectedDate, selectedClosureId);
  };

  const clearFilters = () => {
    setSelectedDate("");
    setSelectedClosureId("");
    fetchDashboard("", "");
  };

  const loadToday = () => {
    setSelectedDate(today);
    setSelectedClosureId("");
    fetchDashboard(today, "");
  };

  const formatDate = (dateString) => {
    if (!dateString) return "";
    return new Date(dateString).toLocaleDateString("en-GB");
  };

  const percent = (value) => `${Number(value || 0).toFixed(1)}%`;

  const getStatusClass = (status) => {
    if (!status) return "status-badge";
    const clean = status.toLowerCase();

    if (clean === "planned") return "status-badge status-planned";
    if (clean === "complete") return "status-badge status-complete";
    if (clean === "cancelled") return "status-badge status-cancelled";

    return "status-badge";
  };

  const summary = data.summary || {};
  const workflow = data.completionWorkflow || {};

  const selectedClosure = closures.find(
    (closure) => String(closure.id) === String(selectedClosureId)
  );

  const dashboardScopeLabel = selectedDate || selectedClosureId
    ? `${selectedDate ? formatDate(selectedDate) : "All dates"}${
        selectedClosure ? ` · ${selectedClosure.closure_ref}` : ""
      }`
    : "All jobs";

  return (
    <div className="dashboard-modern">
      <div className="dashboard-topbar">
        <div>
          <h1 className="dashboard-title-modern">Dashboard</h1>
          <p className="dashboard-subtitle-modern">
            Completion, paperwork and sign-off overview.
          </p>
        </div>

        <div className="dashboard-date-card">
          <div className="dashboard-date-icon">📅</div>
          <div>{todayLabel}</div>
        </div>
      </div>

      <div className="filter-card filter-card-compact" style={{ marginBottom: "22px" }}>
        <div className="filter-grid-compact">
          <div className="form-group">
            <label>Dashboard Date</label>
            <input
              type="date"
              value={selectedDate}
              onChange={(e) => setSelectedDate(e.target.value)}
            />
          </div>

          <div className="form-group">
            <label>Closure</label>
            <select
              value={selectedClosureId}
              onChange={(e) => setSelectedClosureId(e.target.value)}
            >
              <option value="">All Closures</option>
              {closures.map((closure) => (
                <option key={closure.id} value={closure.id}>
                  {closure.closure_ref}
                </option>
              ))}
            </select>
          </div>

          <div className="filter-actions-inline">
            <button
              type="button"
              className="detail-btn"
              onClick={handleLoad}
            >
              Load Dashboard
            </button>

            <button
              type="button"
              className="detail-btn detail-btn-secondary"
              onClick={loadToday}
            >
              Today
            </button>

            <button
              type="button"
              className="detail-btn detail-btn-secondary"
              onClick={clearFilters}
            >
              Clear
            </button>
          </div>
        </div>

        <p style={{ marginBottom: 0 }}>
          <strong>Current view:</strong> {dashboardScopeLabel}
        </p>
      </div>

      {error && <p>{error}</p>}
      {loading && <p>Loading dashboard...</p>}

      {!loading && !error && (
        <>
          <div className="dashboard-kpi-grid">
            <div className="dashboard-kpi-card">
              <div className="dashboard-kpi-icon icon-green">%</div>
              <div className="dashboard-kpi-body">
                <div className="dashboard-kpi-label">Overall Complete</div>
                <div className="dashboard-kpi-value">
                  {percent(summary.overallCompletePercent)}
                </div>
                <div className="dashboard-kpi-meta">
                  {summary.finalCompleteJobs || 0} of {summary.totalJobs || 0} jobs
                </div>
              </div>
            </div>

            <div className="dashboard-kpi-card">
              <div className="dashboard-kpi-icon icon-blue">📆</div>
              <div className="dashboard-kpi-body">
                <div className="dashboard-kpi-label">This Month Complete</div>
                <div className="dashboard-kpi-value">
                  {percent(summary.monthlyCompletePercent)}
                </div>
                <div className="dashboard-kpi-meta">
                  {summary.monthlyCompleteJobs || 0} of{" "}
                  {summary.monthlyTotalJobs || 0} this month
                </div>
              </div>
            </div>

            <div className="dashboard-kpi-card">
              <div className="dashboard-kpi-icon icon-yellow">🧾</div>
              <div className="dashboard-kpi-body">
                <div className="dashboard-kpi-label">Paperwork Checked</div>
                <div className="dashboard-kpi-value">
                  {percent(summary.paperworkCheckedPercent)}
                </div>
                <div className="dashboard-kpi-meta">
                  {summary.paperworkCheckedJobs || 0} of{" "}
                  {summary.totalJobs || 0} jobs
                </div>
              </div>
            </div>

            <div className="dashboard-kpi-card">
              <div className="dashboard-kpi-icon icon-purple">✅</div>
              <div className="dashboard-kpi-body">
                <div className="dashboard-kpi-label">Final Sign-Off</div>
                <div className="dashboard-kpi-value">
                  {percent(summary.finalSignoffPercent)}
                </div>
                <div className="dashboard-kpi-meta">
                  Lead scheduler completion
                </div>
              </div>
            </div>
          </div>

          <div className="dashboard-panel" style={{ marginBottom: "22px" }}>
            <div className="dashboard-panel-header">
              <div>
                <h2>Completion Workflow</h2>
                <p>Where jobs currently sit in the sign-off chain</p>
              </div>
            </div>

            <div className="dashboard-kpi-grid">
              <div className="dashboard-kpi-card">
                <div className="dashboard-kpi-body">
                  <div className="dashboard-kpi-label">Awaiting Supervisor</div>
                  <div className="dashboard-kpi-value">
                    {workflow.awaitingSupervisor || 0}
                  </div>
                </div>
              </div>

              <div className="dashboard-kpi-card">
                <div className="dashboard-kpi-body">
                  <div className="dashboard-kpi-label">Awaiting Paperwork</div>
                  <div className="dashboard-kpi-value">
                    {workflow.awaitingPaperwork || 0}
                  </div>
                </div>
              </div>

              <div className="dashboard-kpi-card">
                <div className="dashboard-kpi-body">
                  <div className="dashboard-kpi-label">Awaiting Manager</div>
                  <div className="dashboard-kpi-value">
                    {workflow.awaitingManager || 0}
                  </div>
                </div>
              </div>

              <div className="dashboard-kpi-card">
                <div className="dashboard-kpi-body">
                  <div className="dashboard-kpi-label">Awaiting Final</div>
                  <div className="dashboard-kpi-value">
                    {workflow.awaitingFinal || 0}
                  </div>
                </div>
              </div>

              <div className="dashboard-kpi-card">
                <div className="dashboard-kpi-body">
                  <div className="dashboard-kpi-label">Fully Complete</div>
                  <div className="dashboard-kpi-value">
                    {workflow.complete || 0}
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div className="dashboard-panel" style={{ marginBottom: "22px" }}>
            <div className="dashboard-panel-header">
              <div>
                <h2>% Complete by Workstream</h2>
                <p>Completion and paperwork progress for the current dashboard view</p>
              </div>
            </div>

            <div className="table-wrapper">
              <table className="enhanced-table dashboard-table">
                <thead>
                  <tr>
                    <th>Workstream</th>
                    <th>Total Jobs</th>
                    <th>Complete</th>
                    <th>% Complete</th>
                    <th>Paperwork %</th>
                    <th>Manager Checked</th>
                  </tr>
                </thead>

                <tbody>
                  {data.workstreamCompletion.length > 0 ? (
                    data.workstreamCompletion.map((row) => (
                      <tr key={row.workstream}>
                        <td>{row.workstream}</td>
                        <td>{row.totalJobs}</td>
                        <td>{row.completeJobs}</td>
                        <td>
                          <strong>{percent(row.completePercent)}</strong>
                        </td>
                        <td>{percent(row.paperworkPercent)}</td>
                        <td>{row.managerCheckedJobs || 0}</td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan="6">No workstream data found.</td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>

          <div className="dashboard-bottom-grid">
            <div className="dashboard-panel">
              <div className="dashboard-panel-header">
                <div>
                  <h2>This Month by Workstream</h2>
                  <p>Current month completion split</p>
                </div>
              </div>

              <div className="table-wrapper">
                <table className="enhanced-table dashboard-table">
                  <thead>
                    <tr>
                      <th>Workstream</th>
                      <th>Total</th>
                      <th>Complete</th>
                      <th>% Complete</th>
                    </tr>
                  </thead>

                  <tbody>
                    {data.monthlyWorkstreamCompletion.length > 0 ? (
                      data.monthlyWorkstreamCompletion.map((row) => (
                        <tr key={row.workstream}>
                          <td>{row.workstream}</td>
                          <td>{row.totalJobs}</td>
                          <td>{row.completeJobs}</td>
                          <td>
                            <strong>{percent(row.completePercent)}</strong>
                          </td>
                        </tr>
                      ))
                    ) : (
                      <tr>
                        <td colSpan="4">No jobs found for this month.</td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>

            <div className="dashboard-panel">
              <div className="dashboard-panel-header">
                <div>
                  <h2>Upcoming Jobs</h2>
                  <p>Next 5 jobs for the current dashboard view</p>
                </div>
                <Link to="/jobs" className="dashboard-panel-link">
                  View all jobs
                </Link>
              </div>

              <div className="table-wrapper">
                <table className="enhanced-table dashboard-table">
                  <thead>
                    <tr>
                      <th>Job Number</th>
                      <th>Activity</th>
                      <th>Closure</th>
                      <th>Date</th>
                      <th>Status</th>
                    </tr>
                  </thead>

                  <tbody>
                    {data.upcomingJobs.length > 0 ? (
                      data.upcomingJobs.map((job) => (
                        <tr key={job.id}>
                          <td>
                            <Link
                              to={`/jobs/${job.id}`}
                              className="table-link-strong"
                            >
                              {job.job_number}
                            </Link>
                          </td>
                          <td>{job.activity || job.title || ""}</td>
                          <td>{job.closure_ref || ""}</td>
                          <td>{formatDate(job.planned_date)}</td>
                          <td>
                            <span className={getStatusClass(job.status)}>
                              {job.status}
                            </span>
                          </td>
                        </tr>
                      ))
                    ) : (
                      <tr>
                        <td colSpan="5">No upcoming jobs found.</td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
}

export default Dashboard;