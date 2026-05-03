import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import api from "../services/api";

function Issues() {
  const today = new Date().toISOString().split("T")[0];

  const [date, setDate] = useState("");
  const [closureId, setClosureId] = useState("");
  const [closures, setClosures] = useState([]);
  const [issues, setIssues] = useState([]);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");
  const [showTodayOnly, setShowTodayOnly] = useState(false);

  useEffect(() => {
    loadClosures();
    loadIssues();
  }, []);

  const loadClosures = async () => {
    try {
      const res = await api.get("/closures");
      setClosures(res.data || []);
    } catch (err) {
      console.error("Failed to load closures:", err);
    }
  };

  const loadIssues = async (
    selectedDate = date,
    selectedClosureId = closureId
  ) => {
    try {
      setLoading(true);
      setMessage("");

      const params = new URLSearchParams();

      if (selectedDate) params.append("date", selectedDate);
      if (selectedClosureId) params.append("closureId", selectedClosureId);

      const queryString = params.toString();
      const url = queryString ? `/issues?${queryString}` : "/issues";

      const res = await api.get(url);
      setIssues(res.data || []);
    } catch (err) {
      console.error("Failed to load issues:", err);
      setMessage(err.response?.data?.error || "Failed to load issues.");
    } finally {
      setLoading(false);
    }
  };

  const resolveIssue = async (jobId) => {
    const confirmed = window.confirm(
      "Mark this issue as resolved? It will disappear from this page."
    );

    if (!confirmed) return;

    try {
      setMessage("");

      await api.put(`/jobs/${jobId}/resolve-issue`);

      setIssues((prev) => prev.filter((issue) => issue.id !== jobId));
      setMessage("Issue resolved.");
    } catch (err) {
      console.error("Failed to resolve issue:", err);
      setMessage(err.response?.data?.error || "Failed to resolve issue.");
    }
  };

  const handleLoad = () => {
    loadIssues(date, closureId);
  };

  const loadToday = () => {
    setDate(today);
    setShowTodayOnly(true);
    loadIssues(today, closureId);
  };

  const clearFilters = () => {
    setDate("");
    setClosureId("");
    setShowTodayOnly(false);
    loadIssues("", "");
  };

  const formatDate = (value) => {
    if (!value) return "";
    return new Date(value).toLocaleDateString("en-GB");
  };

  const groupedIssues = useMemo(() => {
    const groups = {};

    issues.forEach((issue) => {
      const key = issue.closure_id || "unknown";

      if (!groups[key]) {
        groups[key] = {
          closure_id: issue.closure_id,
          closure_ref: issue.closure_ref || "No closure",
          carriageway: issue.carriageway,
          junctions_between: issue.junctions_between,
          lane_configuration: issue.lane_configuration,
          nems_number: issue.nems_number,
          jobs: [],
        };
      }

      groups[key].jobs.push(issue);
    });

    return Object.values(groups).map((group) => ({
      ...group,
      jobs: group.jobs.sort((a, b) => {
        const aMp = Number(a.start_mp ?? 999999);
        const bMp = Number(b.start_mp ?? 999999);

        if (aMp !== bMp) return aMp - bMp;

        return String(a.job_number || "").localeCompare(
          String(b.job_number || "")
        );
      }),
    }));
  }, [issues]);

  const selectedClosure = closures.find(
    (closure) => String(closure.id) === String(closureId)
  );

  const scopeLabel =
    date || closureId
      ? `${date ? formatDate(date) : "All dates"}${
          selectedClosure ? ` · ${selectedClosure.closure_ref}` : ""
        }`
      : "All open issues";

  return (
    <div className="issues-page">
      <div className="list-page-header">
        <div>
          <h1 className="page-title">Issues</h1>
          <p className="page-subtitle">
            Open supervisor issues flagged from the closure checklist.
          </p>
        </div>

        <Link to="/dashboard" className="detail-btn detail-btn-secondary">
          Back to Dashboard
        </Link>
      </div>

      <div className="dashboard-kpi-grid issues-kpi-grid">
        <div className="dashboard-kpi-card dashboard-kpi-card-danger">
          <div className="dashboard-kpi-icon icon-red">⚠️</div>
          <div className="dashboard-kpi-body">
            <div className="dashboard-kpi-label">Open Issues</div>
            <div className="dashboard-kpi-value">{issues.length}</div>
            <div className="dashboard-kpi-meta">{scopeLabel}</div>
          </div>
        </div>

        <div className="dashboard-kpi-card">
          <div className="dashboard-kpi-icon icon-blue">🚧</div>
          <div className="dashboard-kpi-body">
            <div className="dashboard-kpi-label">Affected Closures</div>
            <div className="dashboard-kpi-value">{groupedIssues.length}</div>
            <div className="dashboard-kpi-meta">Grouped by closure</div>
          </div>
        </div>
      </div>

      <div className="filter-card filter-card-compact">
        <div className="filter-grid-compact">
          <div className="form-group">
            <label>Date</label>
            <input
              type="date"
              value={date}
              onChange={(e) => {
                setDate(e.target.value);
                setShowTodayOnly(false);
              }}
            />
          </div>

          <div className="form-group">
            <label>Closure</label>
            <select
              value={closureId}
              onChange={(e) => setClosureId(e.target.value)}
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
            <button type="button" className="detail-btn" onClick={handleLoad}>
              Load Issues
            </button>

            <button
              type="button"
              className={
                showTodayOnly
                  ? "detail-btn"
                  : "detail-btn detail-btn-secondary"
              }
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
          <strong>Current view:</strong> {scopeLabel}
        </p>
      </div>

      {message && <p className="form-message">{message}</p>}
      {loading && <p>Loading issues...</p>}

      {!loading && groupedIssues.length === 0 && (
        <div className="detail-card issues-empty-card">
          <h2>No open issues found</h2>
          <p>
            Nothing to chase in this view. Dangerous sentence, but we’ll take it.
          </p>
        </div>
      )}

      {!loading &&
        groupedIssues.map((group) => (
          <div key={group.closure_id || group.closure_ref} className="issues-group">
            <div className="closure-group-header issues-group-header">
              <div>
                <h2>
                  {group.closure_id ? (
                    <Link to={`/closures/${group.closure_id}`}>
                      {group.closure_ref}
                    </Link>
                  ) : (
                    group.closure_ref
                  )}
                </h2>

                <p>
                  Carriageway {group.carriageway || "N/A"} · Junctions{" "}
                  {group.junctions_between || "N/A"} · Lane{" "}
                  {group.lane_configuration || "N/A"}
                </p>

                <p>NEMS: {group.nems_number || "None"}</p>
              </div>

              <div className="closure-group-count issue-count-pill">
                {group.jobs.length} issue{group.jobs.length !== 1 ? "s" : ""}
              </div>
            </div>

            <div className="table-wrapper">
              <table className="enhanced-table issues-table">
                <thead>
                  <tr>
                    <th>Date</th>
                    <th>Job No</th>
                    <th>Workstream</th>
                    <th>Location</th>
                    <th>MP</th>
                    <th>Description</th>
                    <th>Supervisor Notes</th>
                    <th>Action</th>
                  </tr>
                </thead>

                <tbody>
                  {group.jobs.map((job) => (
                    <tr key={job.id} className="issue-table-row">
                      <td>{formatDate(job.planned_date)}</td>

                      <td>
                        <Link
                          to={`/jobs/${job.id}`}
                          className="table-link-strong"
                        >
                          {job.job_number}
                        </Link>
                        <div className="issues-work-order">
                          {job.work_order || ""}
                        </div>
                      </td>

                      <td>{job.workstream || "N/A"}</td>
                      <td>{job.location || "N/A"}</td>
                      <td>
                        {job.start_mp || ""} {job.end_mp ? `- ${job.end_mp}` : ""}
                      </td>
                      <td>{job.description || job.activity || job.title || ""}</td>
                      <td className="issues-notes">
                        {job.completion_notes || "No notes added."}
                      </td>

                      <td>
                        <button
                          type="button"
                          className="detail-btn detail-btn-secondary issues-resolve-btn"
                          onClick={() => resolveIssue(job.id)}
                        >
                          Resolve
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        ))}
    </div>
  );
}

export default Issues;