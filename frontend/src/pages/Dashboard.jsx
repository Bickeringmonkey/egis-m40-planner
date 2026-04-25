import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import api from "../services/api";
import {
  PieChart,
  Pie,
  Cell,
  ResponsiveContainer,
  Tooltip,
} from "recharts";

function Dashboard() {
  const [data, setData] = useState({
    summary: {
      totalJobs: 0,
      completedJobs: 0,
      plannedJobs: 0,
      cancelledJobs: 0,
    },
    jobsByStatus: [],
    jobsByWorkstream: [],
    upcomingJobs: [],
    recentClosures: [],
    completionWorkflow: {
      total: 0,
      awaitingSupervisor: 0,
      awaitingPaperwork: 0,
      awaitingManager: 0,
      awaitingFinal: 0,
      complete: 0,
    },
  });

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
    fetchDashboard();
  }, []);

  const fetchDashboard = async () => {
    try {
      setLoading(true);
      setError("");
      const response = await api.get("/dashboard/overview");

      setData((prev) => ({
        ...prev,
        ...response.data,
        completionWorkflow:
          response.data.completionWorkflow || prev.completionWorkflow,
      }));
    } catch (err) {
      console.error("Error fetching dashboard:", err);
      setError("Failed to load dashboard.");
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (dateString) => {
    if (!dateString) return "";
    return new Date(dateString).toLocaleDateString("en-GB");
  };

  const getStatusClass = (status) => {
    if (!status) return "status-badge";
    const clean = status.toLowerCase();

    if (clean === "planned") return "status-badge status-planned";
    if (clean === "complete") return "status-badge status-complete";
    if (clean === "cancelled") return "status-badge status-cancelled";

    return "status-badge";
  };

  const totalJobs = data.summary.totalJobs || 0;
  const completedPct = totalJobs
    ? ((data.summary.completedJobs / totalJobs) * 100).toFixed(1)
    : "0.0";
  const plannedPct = totalJobs
    ? ((data.summary.plannedJobs / totalJobs) * 100).toFixed(1)
    : "0.0";
  const cancelledPct = totalJobs
    ? ((data.summary.cancelledJobs / totalJobs) * 100).toFixed(1)
    : "0.0";

  const workflow = data.completionWorkflow || {};
  const workflowTotal = Number(workflow.total || 0);
  const workflowComplete = Number(workflow.complete || 0);
  const workflowPct = workflowTotal
    ? ((workflowComplete / workflowTotal) * 100).toFixed(1)
    : "0.0";

  const STATUS_COLORS = ["#6f9ae3", "#74b96f", "#f0bb32", "#b07ad9", "#a8a8a8"];
  const WORKSTREAM_COLORS = [
    "#1f5fa7",
    "#2ca7b8",
    "#73ba63",
    "#f0bb32",
    "#aa72d1",
    "#b3b3b3",
  ];

  return (
    <div className="dashboard-modern">
      <div className="dashboard-topbar">
        <div>
          <h1 className="dashboard-title-modern">Dashboard</h1>
          <p className="dashboard-subtitle-modern">
            Welcome back. Here’s what’s happening in your M40 planning system.
          </p>
        </div>

        <div className="dashboard-date-card">
          <div className="dashboard-date-icon">📅</div>
          <div>{todayLabel}</div>
        </div>
      </div>

      {error && <p>{error}</p>}
      {loading && <p>Loading dashboard...</p>}

      {!loading && !error && (
        <>
          <div className="dashboard-kpi-grid">
            <div className="dashboard-kpi-card">
              <div className="dashboard-kpi-icon icon-blue">📁</div>
              <div className="dashboard-kpi-body">
                <div className="dashboard-kpi-label">Total Jobs</div>
                <div className="dashboard-kpi-value">{data.summary.totalJobs}</div>
                <div className="dashboard-kpi-meta">All time</div>
              </div>
            </div>

            <div className="dashboard-kpi-card">
              <div className="dashboard-kpi-icon icon-green">✓</div>
              <div className="dashboard-kpi-body">
                <div className="dashboard-kpi-label">Completed Jobs</div>
                <div className="dashboard-kpi-value">{data.summary.completedJobs}</div>
                <div className="dashboard-kpi-meta">{completedPct}% of total</div>
              </div>
            </div>

            <div className="dashboard-kpi-card">
              <div className="dashboard-kpi-icon icon-yellow">◔</div>
              <div className="dashboard-kpi-body">
                <div className="dashboard-kpi-label">Planned Jobs</div>
                <div className="dashboard-kpi-value">{data.summary.plannedJobs}</div>
                <div className="dashboard-kpi-meta">{plannedPct}% of total</div>
              </div>
            </div>

            <div className="dashboard-kpi-card">
              <div className="dashboard-kpi-icon icon-purple">✕</div>
              <div className="dashboard-kpi-body">
                <div className="dashboard-kpi-label">Cancelled Jobs</div>
                <div className="dashboard-kpi-value">{data.summary.cancelledJobs}</div>
                <div className="dashboard-kpi-meta">{cancelledPct}% of total</div>
              </div>
            </div>
          </div>

          <div className="dashboard-panel" style={{ marginBottom: "22px" }}>
            <div className="dashboard-panel-header">
              <div>
                <h2>Completion Workflow</h2>
                <p>Operational sign-off progress across all jobs</p>
              </div>
              <strong>{workflowPct}% complete</strong>
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

          <div className="dashboard-chart-grid">
            <div className="dashboard-panel">
              <div className="dashboard-panel-header">
                <div>
                  <h2>Jobs by Status</h2>
                  <p>Breakdown of all jobs by current status</p>
                </div>
              </div>

              <div className="dashboard-chart-content">
                <div className="dashboard-chart-wrap">
                  <ResponsiveContainer width="100%" height={260}>
                    <PieChart>
                      <Pie
                        data={data.jobsByStatus}
                        dataKey="value"
                        nameKey="name"
                        innerRadius={55}
                        outerRadius={92}
                        paddingAngle={2}
                      >
                        {data.jobsByStatus.map((entry, index) => (
                          <Cell
                            key={`status-${entry.name}`}
                            fill={STATUS_COLORS[index % STATUS_COLORS.length]}
                          />
                        ))}
                      </Pie>
                      <Tooltip />
                    </PieChart>
                  </ResponsiveContainer>
                </div>

                <div className="dashboard-legend-list">
                  {data.jobsByStatus.map((item, index) => (
                    <div key={item.name} className="dashboard-legend-item">
                      <div className="dashboard-legend-left">
                        <span
                          className="dashboard-legend-dot"
                          style={{
                            backgroundColor:
                              STATUS_COLORS[index % STATUS_COLORS.length],
                          }}
                        />
                        <span>{item.name}</span>
                      </div>
                      <div className="dashboard-legend-value">{item.value}</div>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            <div className="dashboard-panel">
              <div className="dashboard-panel-header">
                <div>
                  <h2>Jobs by Workstream</h2>
                  <p>Distribution of jobs across workstreams</p>
                </div>
              </div>

              <div className="dashboard-chart-content">
                <div className="dashboard-chart-wrap">
                  <ResponsiveContainer width="100%" height={260}>
                    <PieChart>
                      <Pie
                        data={data.jobsByWorkstream}
                        dataKey="value"
                        nameKey="name"
                        innerRadius={55}
                        outerRadius={92}
                        paddingAngle={2}
                      >
                        {data.jobsByWorkstream.map((entry, index) => (
                          <Cell
                            key={`ws-${entry.name}`}
                            fill={
                              WORKSTREAM_COLORS[index % WORKSTREAM_COLORS.length]
                            }
                          />
                        ))}
                      </Pie>
                      <Tooltip />
                    </PieChart>
                  </ResponsiveContainer>
                </div>

                <div className="dashboard-legend-list">
                  {data.jobsByWorkstream.map((item, index) => (
                    <div key={item.name} className="dashboard-legend-item">
                      <div className="dashboard-legend-left">
                        <span
                          className="dashboard-legend-dot"
                          style={{
                            backgroundColor:
                              WORKSTREAM_COLORS[index % WORKSTREAM_COLORS.length],
                          }}
                        />
                        <span>{item.name}</span>
                      </div>
                      <div className="dashboard-legend-value">{item.value}</div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>

          <div className="dashboard-bottom-grid">
            <div className="dashboard-panel">
              <div className="dashboard-panel-header">
                <div>
                  <h2>Upcoming Jobs</h2>
                  <p>Next 5 scheduled jobs</p>
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
                            <Link to={`/jobs/${job.id}`} className="table-link-strong">
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

            <div className="dashboard-panel">
              <div className="dashboard-panel-header">
                <div>
                  <h2>Recent Closures</h2>
                  <p>Latest 5 closure records</p>
                </div>
                <Link to="/closures" className="dashboard-panel-link">
                  View all closures
                </Link>
              </div>

              <div className="table-wrapper">
                <table className="enhanced-table dashboard-table">
                  <thead>
                    <tr>
                      <th>Closure Ref</th>
                      <th>Date</th>
                      <th>Carriageway</th>
                      <th>Type</th>
                      <th>Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {data.recentClosures.length > 0 ? (
                      data.recentClosures.map((closure) => (
                        <tr key={closure.id}>
                          <td>
                            <Link
                              to={`/closures/${closure.id}`}
                              className="table-link-strong"
                            >
                              {closure.closure_ref}
                            </Link>
                          </td>
                          <td>{formatDate(closure.closure_date)}</td>
                          <td>{closure.carriageway || ""}</td>
                          <td>{closure.closure_type || ""}</td>
                          <td>
                            <span className={getStatusClass(closure.status)}>
                              {closure.status}
                            </span>
                          </td>
                        </tr>
                      ))
                    ) : (
                      <tr>
                        <td colSpan="5">No recent closures found.</td>
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