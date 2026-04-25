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
  const [error, setError] = useState("");

  const effectiveEndDate = endDate || startDate;

  useEffect(() => {
    fetchClosures();
    fetchNightWorks("2026-04-27", "2026-04-27", "");
  }, []);

  const fetchClosures = async () => {
    try {
      const response = await api.get("/closures");
      setClosures(response.data);
    } catch (err) {
      console.error("Error fetching closures:", err);
    }
  };

  const fetchNightWorks = async (selectedStartDate, selectedEndDate, selectedClosureId) => {
    try {
      setLoading(true);
      setError("");

      let url = `/nightworks?startDate=${selectedStartDate}&endDate=${selectedEndDate}`;

      if (selectedClosureId) {
        url += `&closureId=${selectedClosureId}`;
      }

      const response = await api.get(url);
      setNightWorks(response.data);
    } catch (err) {
      console.error("Error fetching night works:", err);
      setError("Failed to load night works.");
    } finally {
      setLoading(false);
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
    const clean = status.toLowerCase();
    if (clean === "planned") return "status-badge status-planned";
    if (clean === "complete") return "status-badge status-complete";
    if (clean === "cancelled") return "status-badge status-cancelled";
    return "status-badge";
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

    return Object.values(groups);
  }, [nightWorks]);

  const totalJobs = nightWorks.length;
  const totalClosures = groupedNightWorks.length;

  return (
    <div className="nightworks-page">
      <div className="print-hide" style={{ marginBottom: "16px" }}>
        <h1 className="page-title">Night Works</h1>
        <p className="page-subtitle">View all works for a selected date range.</p>

        <div className="dashboard-grid" style={{ marginBottom: "20px" }}>
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
        </div>

        <Link to="/nightworks-print">
          <button type="button">Open Print View</button>
        </Link>

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

      {loading && <p>Loading night works...</p>}
      {error && <p>{error}</p>}

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
                  <Link to={`/closures/${group.closure_id}`}>{group.closure_ref}</Link>
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
                  </tr>
                </thead>

                <tbody>
                  {group.jobs.map((job) => (
                    <tr key={job.id}>
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
                        <span className={getStatusClass(job.status)}>{job.status}</span>
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