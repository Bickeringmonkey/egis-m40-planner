import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import api from "../services/api";

function NightWorks() {
  const [startDate, setStartDate] = useState("2026-04-27");
  const [endDate, setEndDate] = useState("2026-04-27");
  const [closureId, setClosureId] = useState("");
  const [closures, setClosures] = useState([]);
  const [nightWorks, setNightWorks] = useState([]);
  const [loading, setLoading] = useState(false);
  const [savingJobId, setSavingJobId] = useState(null);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");

  const effectiveEndDate = endDate || startDate;

  useEffect(() => {
    fetchClosures();
    fetchNightWorks("2026-04-27", "2026-04-27", "");
  }, []);

  const fetchClosures = async () => {
    try {
      const response = await api.get("/closures");
      setClosures(response.data || []);
    } catch (err) {
      console.error("Error fetching closures:", err);
    }
  };

  const fetchNightWorks = async (
    selectedStartDate,
    selectedEndDate,
    selectedClosureId
  ) => {
    try {
      setLoading(true);
      setError("");
      setMessage("");

      let url = `/nightworks?startDate=${selectedStartDate}&endDate=${selectedEndDate}`;

      if (selectedClosureId) {
        url += `&closureId=${selectedClosureId}`;
      }

      const response = await api.get(url);
      setNightWorks(response.data || []);
    } catch (err) {
      console.error("Error fetching night works:", err);
      setError("Failed to load night works.");
    } finally {
      setLoading(false);
    }
  };

  const updateSupervisor = async (jobId, supervisorStatus) => {
    try {
      setSavingJobId(jobId);
      setMessage("");

      await api.put(`/jobs/${jobId}/supervisor`, {
        status: supervisorStatus,
      });

      setNightWorks((prev) =>
        prev.map((job) =>
          job.id === jobId
            ? {
                ...job,
                supervisor_status: supervisorStatus,
                supervisor_updated_at: new Date().toISOString(),
              }
            : job
        )
      );

      setMessage("Supervisor update saved.");
    } catch (err) {
      console.error("Supervisor update failed:", err);
      setError(err.response?.data?.error || "Failed to update supervisor status.");
    } finally {
      setSavingJobId(null);
    }
  };

  const handleLoad = () => {
    if (!startDate) {
      setError("Please select a start date.");
      return;
    }

    fetchNightWorks(startDate, effectiveEndDate, closureId);
  };

  const formatDate = (dateString) => {
    if (!dateString) return "";
    return new Date(dateString).toLocaleDateString("en-GB");
  };

  const formatDateRange = () => {
    if (!startDate) return "";

    if (!effectiveEndDate || startDate === effectiveEndDate) {
      return formatDate(startDate);
    }

    return `${formatDate(startDate)} - ${formatDate(effectiveEndDate)}`;
  };

  const getStatusClass = (status) => {
    if (!status) return "status-badge";

    const clean = status.toLowerCase().trim();

    if (clean === "planned") return "status-badge status-planned";
    if (clean === "complete" || clean === "completed") {
      return "status-badge status-complete";
    }
    if (clean === "cancelled" || clean === "canceled") {
      return "status-badge status-cancelled";
    }

    return "status-badge";
  };

  const getSupervisorStatusClass = (status) => {
    const clean = String(status || "not_started").toLowerCase().trim();

    if (clean === "complete") return "supervisor-status supervisor-status-complete";
    if (clean === "issue") return "supervisor-status supervisor-status-issue";

    return "supervisor-status supervisor-status-not-started";
  };

  const getSupervisorStatusLabel = (status) => {
    const clean = String(status || "not_started").toLowerCase().trim();

    if (clean === "complete") return "Done";
    if (clean === "issue") return "Issue";

    return "Not Started";
  };

  const getSupervisorRowClass = (status) => {
    const clean = String(status || "not_started").toLowerCase().trim();

    if (clean === "complete") return "nightworks-row-supervisor-complete";
    if (clean === "issue") return "nightworks-row-supervisor-issue";

    return "";
  };

  const getClosureDateLabel = (closure) => {
    const closureStart = closure.start_date || closure.closure_date;
    const closureEnd = closure.end_date || closure.closure_date;

    if (!closureStart && !closureEnd) return "";

    if (closureStart === closureEnd || !closureEnd) {
      return formatDate(closureStart);
    }

    return `${formatDate(closureStart)} - ${formatDate(closureEnd)}`;
  };

  const groupedNightWorks = useMemo(() => {
    const groups = {};

    nightWorks.forEach((job) => {
      const key = `${job.closure_id}`;

      if (!groups[key]) {
        groups[key] = {
          closure_id: job.closure_id,
          closure_ref: job.closure_ref,
          closure_date: job.closure_date,
          start_date: job.start_date,
          end_date: job.end_date,
          carriageway: job.carriageway,
          closure_type: job.closure_type,
          nems_number: job.nems_number,
          junctions_between: job.junctions_between,
          lane_configuration: job.lane_configuration,
          jobs: [],
        };
      }

      groups[key].jobs.push(job);
    });

    return Object.values(groups).map((group) => ({
      ...group,
      jobs: group.jobs.sort((a, b) => {
        const aMp = Number(a.start_mp ?? 999999);
        const bMp = Number(b.start_mp ?? 999999);

        if (aMp !== bMp) return aMp - bMp;

        const aEnd = Number(a.end_mp ?? 999999);
        const bEnd = Number(b.end_mp ?? 999999);

        if (aEnd !== bEnd) return aEnd - bEnd;

        return String(a.job_number || "").localeCompare(
          String(b.job_number || "")
        );
      }),
    }));
  }, [nightWorks]);

  const totalJobs = nightWorks.length;
  const totalClosures = groupedNightWorks.length;

  const supervisorComplete = nightWorks.filter(
    (job) => job.supervisor_status === "complete"
  ).length;

  const supervisorIssues = nightWorks.filter(
    (job) => job.supervisor_status === "issue"
  ).length;

  const supervisorNotStarted = nightWorks.filter(
    (job) => !job.supervisor_status || job.supervisor_status === "not_started"
  ).length;

  return (
    <div className="nightworks-page">
      <div className="print-hide" style={{ marginBottom: "16px" }}>
        <h1 className="page-title">Night Works</h1>
        <p className="page-subtitle">View all works for a selected date range.</p>

        <div className="nightworks-summary" style={{ marginBottom: "20px" }}>
          <div className="stat-card">
            <h3>Selected Range</h3>
            <p style={{ fontSize: "22px" }}>{formatDateRange()}</p>
          </div>

          <div className="stat-card">
            <h3>Closures</h3>
            <p>{totalClosures}</p>
          </div>

          <div className="stat-card">
            <h3>Total Jobs</h3>
            <p>{totalJobs}</p>
          </div>

          <div className="stat-card">
            <h3>Supervisor Done</h3>
            <p>{supervisorComplete}</p>
          </div>

          <div className="stat-card">
            <h3>Issues</h3>
            <p>{supervisorIssues}</p>
          </div>

          <div className="stat-card">
            <h3>Not Started</h3>
            <p>{supervisorNotStarted}</p>
          </div>
        </div>

        <div className="nightworks-print-action">
          <Link to="/nightworks-print" className="detail-btn nightworks-print-link">
            Open Print View
          </Link>
        </div>

        <div className="card">
          <div className="nightworks-filters">
            <div className="form-group">
              <label htmlFor="nightworks-start-date">Start Date</label>
              <input
                id="nightworks-start-date"
                type="date"
                value={startDate}
                onChange={(e) => {
                  setStartDate(e.target.value);
                  if (!endDate) setEndDate(e.target.value);
                }}
              />
            </div>

            <div className="form-group">
              <label htmlFor="nightworks-end-date">End Date</label>
              <input
                id="nightworks-end-date"
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
              />
            </div>

            <div className="form-group">
              <label htmlFor="nightworks-closure">Closure</label>
              <select
                id="nightworks-closure"
                value={closureId}
                onChange={(e) => setClosureId(e.target.value)}
              >
                <option value="">All Closures</option>
                {closures.map((closure) => (
                  <option key={closure.id} value={closure.id}>
                    {closure.closure_ref} - {getClosureDateLabel(closure)}
                  </option>
                ))}
              </select>
            </div>

            <div className="filter-actions">
              <button onClick={handleLoad}>Load Night Works</button>
            </div>
          </div>
        </div>
      </div>

      {message && <p className="form-message">{message}</p>}
      {loading && <p>Loading night works...</p>}
      {error && <p className="form-message">{error}</p>}

      {!loading && !error && groupedNightWorks.length === 0 && (
        <div className="card">
          <p>No jobs found for this selection.</p>
        </div>
      )}

      {!loading &&
        !error &&
        groupedNightWorks.map((group) => (
          <div key={group.closure_id} className="closure-group">
            <div className="closure-group-header">
              <div>
                <h2>
                  <Link to={`/closures/${group.closure_id}`}>
                    {group.closure_ref}
                  </Link>
                </h2>

                <p>
                  {getClosureDateLabel(group)} · Carriageway {group.carriageway} ·{" "}
                  {group.closure_type || "Closure"}
                </p>

                <p>
                  NEMS: {group.nems_number || "None"} · Junctions:{" "}
                  {group.junctions_between || "None"} · Lane:{" "}
                  {group.lane_configuration || "None"}
                </p>
              </div>

              <div className="closure-group-count">
                {group.jobs.length} job{group.jobs.length !== 1 ? "s" : ""}
              </div>
            </div>

            <div className="table-wrapper">
              <table className="nightworks-table">
                <thead>
                  <tr>
                    <th>Planned Date</th>
                    <th>Job Number</th>
                    <th>Work Order</th>
                    <th>Activity</th>
                    <th>Location</th>
                    <th>Workstream</th>
                    <th>Description</th>
                    <th>Status</th>
                    <th>Supervisor</th>
                    <th>Actions</th>
                  </tr>
                </thead>

                <tbody>
                  {group.jobs.map((job) => (
                    <tr
                      key={job.id}
                      className={getSupervisorRowClass(job.supervisor_status)}
                    >
                      <td>{formatDate(job.planned_date)}</td>

                      <td>
                        <Link to={`/jobs/${job.id}`}>{job.job_number}</Link>
                      </td>

                      <td>{job.work_order || ""}</td>
                      <td>{job.activity || job.title || ""}</td>
                      <td>{job.location || ""}</td>
                      <td>{job.workstream}</td>
                      <td>{job.description || ""}</td>

                      <td>
                        <span className={getStatusClass(job.status)}>
                          {job.status}
                        </span>
                      </td>

                      <td>
                        <span className={getSupervisorStatusClass(job.supervisor_status)}>
                          {getSupervisorStatusLabel(job.supervisor_status)}
                        </span>
                      </td>

                      <td>
                        <div className="supervisor-actions">
                          <button
                            type="button"
                            className="btn-complete"
                            disabled={savingJobId === job.id}
                            onClick={() => updateSupervisor(job.id, "complete")}
                          >
                            Done
                          </button>

                          <button
                            type="button"
                            className="btn-issue"
                            disabled={savingJobId === job.id}
                            onClick={() => updateSupervisor(job.id, "issue")}
                          >
                            Issue
                          </button>

                          <button
                            type="button"
                            className="btn-reset"
                            disabled={savingJobId === job.id}
                            onClick={() => updateSupervisor(job.id, "not_started")}
                          >
                            Reset
                          </button>
                        </div>
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

export default NightWorks;