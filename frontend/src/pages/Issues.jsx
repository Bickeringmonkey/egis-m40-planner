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

  const handlePrint = () => window.print();

  const handleLoad = () => {
    loadIssues(date, closureId);
  };

  const loadToday = () => {
    setDate(today);
    loadIssues(today, closureId);
  };

  const clearFilters = () => {
    setDate("");
    setClosureId("");
    loadIssues("", "");
  };

  const formatDate = (value) => {
    if (!value) return "";
    return new Date(value).toLocaleDateString("en-GB");
  };

  const getIssueAgeDays = (job) => {
    if (job.issue_age_days !== undefined && job.issue_age_days !== null) {
      return Number(job.issue_age_days || 0);
    }

    const baseDate = job.issue_created_at || job.planned_date;
    if (!baseDate) return 0;

    const issueDate = new Date(baseDate);
    const now = new Date();

    issueDate.setHours(0, 0, 0, 0);
    now.setHours(0, 0, 0, 0);

    return Math.max(
      Math.floor((now - issueDate) / (1000 * 60 * 60 * 24)),
      0
    );
  };

  const getEscalationStatus = (job) => {
    if (job.escalation_status) return job.escalation_status;

    const days = getIssueAgeDays(job);
    if (days >= 4) return "red";
    if (days >= 2) return "amber";
    return "green";
  };

  const getAgeLabel = (days) => {
    if (days === 0) return "Today";
    if (days === 1) return "1 day open";
    return `${days} days open`;
  };

  const getAgeClass = (job) => {
    const status = getEscalationStatus(job);
    if (status === "red") return "issue-age issue-age-red";
    if (status === "amber") return "issue-age issue-age-amber";
    return "issue-age issue-age-green";
  };

  const getEscalationLabel = (job) => {
    const status = getEscalationStatus(job);
    if (status === "red") return "Critical";
    if (status === "amber") return "Warning";
    return "Open";
  };

  const getEscalationClass = (job) => {
    const status = getEscalationStatus(job);
    if (status === "red") return "issue-escalation issue-escalation-red";
    if (status === "amber") return "issue-escalation issue-escalation-amber";
    return "issue-escalation issue-escalation-green";
  };

  const getSeverityClass = (severity) => {
    const clean = String(severity || "low").toLowerCase();
    if (clean === "high") return "issue-severity issue-severity-high";
    if (clean === "medium") return "issue-severity issue-severity-medium";
    return "issue-severity issue-severity-low";
  };

  const getSeverityLabel = (severity) => {
    const clean = String(severity || "low").toLowerCase();
    if (clean === "high") return "High";
    if (clean === "medium") return "Medium";
    return "Low";
  };

  const getTypeLabel = (type) => {
    const clean = String(type || "other").toLowerCase();

    const labels = {
      access: "Access",
      incomplete: "Incomplete",
      safety: "Safety",
      paperwork: "Paperwork",
      other: "Other",
    };

    return labels[clean] || clean.charAt(0).toUpperCase() + clean.slice(1);
  };

  const getReasonClass = (reason) => {
    const clean = String(reason || "").toLowerCase();

    if (clean.includes("paperwork")) return "issue-reason issue-reason-paperwork";
    if (clean.includes("works")) return "issue-reason issue-reason-works";
    if (clean.includes("supervisor")) return "issue-reason issue-reason-supervisor";

    return "issue-reason";
  };

  const groupedIssues = useMemo(() => {
    const groups = {};

    const sortedIssues = [...issues].sort((a, b) => {
      const priority = { red: 1, amber: 2, green: 3 };

      const statusA = getEscalationStatus(a);
      const statusB = getEscalationStatus(b);

      if (priority[statusA] !== priority[statusB]) {
        return priority[statusA] - priority[statusB];
      }

      const ageA = getIssueAgeDays(a);
      const ageB = getIssueAgeDays(b);

      if (ageA !== ageB) return ageB - ageA;

      const mpA = Number(a.start_mp ?? 999999);
      const mpB = Number(b.start_mp ?? 999999);

      if (mpA !== mpB) return mpA - mpB;

      return String(a.job_number || "").localeCompare(
        String(b.job_number || "")
      );
    });

    sortedIssues.forEach((issue) => {
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

    return Object.values(groups);
  }, [issues]);

  const issueStats = useMemo(() => {
    const byWorkstream = {};
    const byClosure = {};

    let red = 0;
    let amber = 0;
    let highSeverity = 0;

    issues.forEach((issue) => {
      const workstream = issue.workstream || "Unknown";
      const closure = issue.closure_ref || "No closure";
      const status = getEscalationStatus(issue);
      const severity = String(issue.issue_severity || "low").toLowerCase();

      byWorkstream[workstream] = (byWorkstream[workstream] || 0) + 1;
      byClosure[closure] = (byClosure[closure] || 0) + 1;

      if (status === "red") red += 1;
      if (status === "amber") amber += 1;
      if (severity === "high") highSeverity += 1;
    });

    const topWorkstream =
      Object.entries(byWorkstream).sort((a, b) => b[1] - a[1])[0] || null;

    const topClosure =
      Object.entries(byClosure).sort((a, b) => b[1] - a[1])[0] || null;

    return {
      red,
      amber,
      highSeverity,
      topWorkstream,
      topClosure,
    };
  }, [issues]);

  const selectedClosure = closures.find(
    (closure) => String(closure.id) === String(closureId)
  );

  const oldestIssueDays = issues.length
    ? Math.max(...issues.map((issue) => getIssueAgeDays(issue)))
    : 0;

  const scopeLabel =
    date || closureId
      ? `${date ? formatDate(date) : "All dates"}${
          selectedClosure ? ` · ${selectedClosure.closure_ref}` : ""
        }`
      : "All open issues";

  return (
    <div className="issues-page">
      <div className="list-page-header print-hide">
        <div>
          <h1 className="page-title">Issues</h1>
          <p className="page-subtitle">
            Open operational issues, severity, ageing and escalation.
          </p>
        </div>

        <div className="detail-actions">
          <button type="button" className="detail-btn" onClick={handlePrint}>
            Print Issues Report
          </button>

          <Link to="/dashboard" className="detail-btn detail-btn-secondary">
            Back to Dashboard
          </Link>
        </div>
      </div>

      <div className="issues-print-header">
        <h1>M40 Open Issues Report</h1>
        <p>{scopeLabel}</p>
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
          <div className="dashboard-kpi-icon icon-red">🔥</div>
          <div className="dashboard-kpi-body">
            <div className="dashboard-kpi-label">Critical</div>
            <div className="dashboard-kpi-value">{issueStats.red}</div>
            <div className="dashboard-kpi-meta">Open 4+ days</div>
          </div>
        </div>

        <div className="dashboard-kpi-card">
          <div className="dashboard-kpi-icon icon-yellow">⏱</div>
          <div className="dashboard-kpi-body">
            <div className="dashboard-kpi-label">Warnings</div>
            <div className="dashboard-kpi-value">{issueStats.amber}</div>
            <div className="dashboard-kpi-meta">Open 2+ days</div>
          </div>
        </div>

        <div className="dashboard-kpi-card">
          <div className="dashboard-kpi-icon icon-blue">🚧</div>
          <div className="dashboard-kpi-body">
            <div className="dashboard-kpi-label">Affected Closures</div>
            <div className="dashboard-kpi-value">{groupedIssues.length}</div>
            <div className="dashboard-kpi-meta">
              Oldest: {oldestIssueDays} day{oldestIssueDays !== 1 ? "s" : ""}
            </div>
          </div>
        </div>
      </div>

      {issues.length > 0 && (
        <div className="issues-insight-card print-hide">
          <div>
            <span>Top workstream</span>
            <strong>
              {issueStats.topWorkstream
                ? `${issueStats.topWorkstream[0]} (${issueStats.topWorkstream[1]})`
                : "N/A"}
            </strong>
          </div>

          <div>
            <span>Top closure</span>
            <strong>
              {issueStats.topClosure
                ? `${issueStats.topClosure[0]} (${issueStats.topClosure[1]})`
                : "N/A"}
            </strong>
          </div>

          <div>
            <span>Action focus</span>
            <strong>
              {issueStats.red > 0
                ? "Critical issues need chasing"
                : issueStats.amber > 0
                ? "Warnings need watching"
                : "No escalated issues"}
            </strong>
          </div>

          <div>
            <span>High severity</span>
            <strong>{issueStats.highSeverity}</strong>
          </div>
        </div>
      )}

      <div className="filter-card filter-card-compact print-hide">
        <div className="filter-grid-compact">
          <div className="form-group">
            <label>Date</label>
            <input
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
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
          <strong>Current view:</strong> {scopeLabel}
        </p>
      </div>

      {message && <p className="form-message">{message}</p>}
      {loading && <p>Loading issues...</p>}

      {!loading && groupedIssues.length === 0 && (
        <div className="detail-card issues-empty-card">
          <h2>No open issues found</h2>
          <p>No issues to chase for this view.</p>
        </div>
      )}

      {!loading &&
        groupedIssues.map((group) => (
          <div
            key={group.closure_id || group.closure_ref}
            className="issues-group"
          >
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

            <div className="issues-print-list">
              {group.jobs.map((job) => {
                const ageDays = getIssueAgeDays(job);
                const reason =
                  job.issue_reason_label || job.issue_reason || "Issue flagged";

                return (
                  <div key={`print-${job.id}`} className="issue-print-card">
                    <div className="issue-print-top">
                      <strong>{job.job_number}</strong>
                      <span>{formatDate(job.planned_date)}</span>
                      <span>{getAgeLabel(ageDays)}</span>
                      <span>{getEscalationLabel(job)}</span>
                      <span>{getSeverityLabel(job.issue_severity)}</span>
                    </div>

                    <div className="issue-print-body">
                      <p>
                        <strong>Workstream:</strong> {job.workstream || "N/A"}
                      </p>
                      <p>
                        <strong>Type:</strong> {getTypeLabel(job.issue_type)}
                      </p>
                      <p>
                        <strong>Reason:</strong> {reason}
                      </p>
                      <p>
                        <strong>Location:</strong> {job.location || "N/A"}
                      </p>
                      <p>
                        <strong>MP:</strong> {job.start_mp || ""}{" "}
                        {job.end_mp ? `- ${job.end_mp}` : ""}
                      </p>
                      <p>
                        <strong>Description:</strong>{" "}
                        {job.description || job.activity || job.title || ""}
                      </p>
                      <p className="issue-print-notes">
                        <strong>Notes:</strong>{" "}
                        {job.completion_notes || "No notes added."}
                      </p>
                    </div>
                  </div>
                );
              })}
            </div>

            <div className="table-wrapper">
              <table className="enhanced-table issues-table">
                <thead>
                  <tr>
                    <th>Date</th>
                    <th>Age</th>
                    <th>Escalation</th>
                    <th>Severity</th>
                    <th>Type</th>
                    <th>Reason</th>
                    <th>Job No</th>
                    <th>Workstream</th>
                    <th>Location</th>
                    <th>MP</th>
                    <th>Description</th>
                    <th>Supervisor Notes</th>
                    <th className="print-hide">Action</th>
                  </tr>
                </thead>

                <tbody>
                  {group.jobs.map((job) => {
                    const ageDays = getIssueAgeDays(job);
                    const escalationStatus = getEscalationStatus(job);

                    const reason =
                      job.issue_reason_label ||
                      job.issue_reason ||
                      "Issue flagged";

                    return (
                      <tr
                        key={job.id}
                        className={
                          escalationStatus === "red"
                            ? "issue-table-row issue-table-row-escalated"
                            : "issue-table-row"
                        }
                      >
                        <td>{formatDate(job.planned_date)}</td>

                        <td>
                          <span className={getAgeClass(job)}>
                            {getAgeLabel(ageDays)}
                          </span>
                        </td>

                        <td>
                          <span className={getEscalationClass(job)}>
                            {getEscalationLabel(job)}
                          </span>
                        </td>

                        <td>
                          <span className={getSeverityClass(job.issue_severity)}>
                            {getSeverityLabel(job.issue_severity)}
                          </span>
                        </td>

                        <td>{getTypeLabel(job.issue_type)}</td>

                        <td>
                          <span className={getReasonClass(reason)}>
                            {reason}
                          </span>

                          {escalationStatus === "red" && (
                            <div className="issue-escalated-label">
                              Escalated
                            </div>
                          )}
                        </td>

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
                          {job.start_mp || ""}{" "}
                          {job.end_mp ? `- ${job.end_mp}` : ""}
                        </td>

                        <td>{job.description || job.activity || job.title || ""}</td>

                        <td className="issues-notes">
                          {job.completion_notes || "No notes added."}
                        </td>

                        <td className="print-hide">
                          <button
                            type="button"
                            className="detail-btn detail-btn-secondary issues-resolve-btn"
                            onClick={() => resolveIssue(job.id)}
                          >
                            Resolve
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        ))}
    </div>
  );
}

export default Issues;