import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import api from "../services/api";
import logo from "../assets/egis-logo.png";

function NightWorksPrint() {
  const [date, setDate] = useState("2026-04-27");
  const [closureId, setClosureId] = useState("");
  const [closures, setClosures] = useState([]);
  const [nightWorks, setNightWorks] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const generatedAt = new Date();

  useEffect(() => {
    fetchClosures();
    fetchNightWorks("2026-04-27", "");
  }, []);

  const fetchClosures = async () => {
    try {
      const response = await api.get("/closures");
      setClosures(response.data);
    } catch (err) {
      console.error("Error fetching closures:", err);
    }
  };

  const fetchNightWorks = async (selectedDate, selectedClosureId) => {
    try {
      setLoading(true);
      setError("");

      let url = `/nightworks?date=${selectedDate}`;
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
    fetchNightWorks(date, closureId);
  };

  const handlePrint = () => {
    window.print();
  };

  const formatDate = (dateString) => {
    if (!dateString) return "";
    return new Date(dateString).toLocaleDateString("en-GB");
  };

  const formatDateTime = (dateObj) => {
    return dateObj.toLocaleString("en-GB", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  const getStatusClass = (status) => {
    if (!status) return "status-badge";
    const clean = status.toLowerCase();
    if (clean === "planned") return "status-badge status-planned";
    if (clean === "complete") return "status-badge status-complete";
    if (clean === "cancelled") return "status-badge status-cancelled";
    return "status-badge";
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

  const workstreamTotals = useMemo(() => {
    const totals = {};

    nightWorks.forEach((job) => {
      const workstream = job.workstream || "Unknown";
      totals[workstream] = (totals[workstream] || 0) + 1;
    });

    return Object.entries(totals)
      .sort((a, b) => a[0].localeCompare(b[0]))
      .map(([name, count]) => ({
        name,
        count,
      }));
  }, [nightWorks]);

  const totalJobs = nightWorks.length;
  const totalClosures = groupedNightWorks.length;

  return (
    <div className="nightworks-page print-page">
      <div className="print-hide">
        <div
          style={{
            display: "flex",
            gap: "12px",
            marginBottom: "16px",
            flexWrap: "wrap",
          }}
        >
          <Link to="/nightworks" className="back-link">
            ← Back to Night Works
          </Link>
          <button type="button" onClick={handlePrint}>
            Print / Save PDF
          </button>
        </div>

        <h1 className="page-title">Night Works Print View</h1>
        <p className="page-subtitle">
          Compact operational version for printing or export.
        </p>

        <div className="card">
          <div className="nightworks-filters">
            <div className="form-group">
              <label htmlFor="print-date">Select Date</label>
              <input
                id="print-date"
                type="date"
                value={date}
                onChange={(e) => setDate(e.target.value)}
              />
            </div>

            <div className="form-group">
              <label htmlFor="print-closure">Closure</label>
              <select
                id="print-closure"
                value={closureId}
                onChange={(e) => setClosureId(e.target.value)}
              >
                <option value="">All Closures</option>
                {closures.map((closure) => (
                  <option key={closure.id} value={closure.id}>
                    {closure.closure_ref} - {formatDate(closure.closure_date)}
                  </option>
                ))}
              </select>
            </div>

            <div className="filter-actions">
              <button onClick={handleLoad}>Load Print View</button>
            </div>
          </div>
        </div>
      </div>

      <div className="print-header">
        <div className="print-brand-row">
          <img src={logo} alt="Egis Road Operations" className="print-logo" />

          <div className="print-brand-text">
            <h1>M40 Night Works Programme</h1>
            <p>Operational Planning Output</p>
          </div>
        </div>

        <div className="print-meta-grid">
          <div>
            <strong>Date:</strong> {formatDate(date)}
          </div>
          <div>
            <strong>Generated:</strong> {formatDateTime(generatedAt)}
          </div>
          <div>
            <strong>Closures:</strong> {totalClosures}
          </div>
          <div>
            <strong>Total Jobs:</strong> {totalJobs}
          </div>
        </div>
      </div>

      {!loading && !error && (
        <>
          <div
            className="dashboard-grid print-hide"
            style={{ marginBottom: "20px" }}
          >
            <div className="stat-card">
              <h3>Closures</h3>
              <p>{totalClosures}</p>
            </div>

            <div className="stat-card">
              <h3>Total Jobs</h3>
              <p>{totalJobs}</p>
            </div>
          </div>

          {workstreamTotals.length > 0 && (
            <div className="card print-workstream-card">
              <h2 style={{ marginTop: 0 }}>Workstream Totals</h2>
              <div className="dashboard-grid" style={{ marginBottom: 0 }}>
                {workstreamTotals.map((item) => (
                  <div key={item.name} className="stat-card">
                    <h3>{item.name}</h3>
                    <p>{item.count}</p>
                  </div>
                ))}
              </div>
            </div>
          )}
        </>
      )}

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
          <div key={group.closure_id} className="print-closure-block">
            <div className="print-closure-meta">
              <h2>{group.closure_ref}</h2>
              <p>
                {formatDate(group.closure_date)} | {group.carriageway} |{" "}
                {group.closure_type || "Closure"}
              </p>
              <p>
                NEMS: {group.nems_number || "None"} | Junctions:{" "}
                {group.junctions_between || "None"} | Lane:{" "}
                {group.lane_configuration || "None"}
              </p>
            </div>

            <div className="table-wrapper">
              <table className="print-table">
                <thead>
                  <tr>
                    <th>Job No</th>
                    <th>Work Order</th>
                    <th>Activity</th>
                    <th>Location</th>
                    <th>Workstream</th>
                    <th>Status</th>
                  </tr>
                </thead>
                <tbody>
                  {group.jobs.map((job) => (
                    <tr key={job.id}>
                      <td>{job.job_number}</td>
                      <td>{job.work_order || ""}</td>
                      <td>{job.activity || job.title || ""}</td>
                      <td>{job.location || ""}</td>
                      <td>{job.workstream}</td>
                      <td>
                        <span className={getStatusClass(job.status)}>
                          {job.status}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        ))}

      <div className="print-footer">
        <div>Generated from M40 Planner</div>
        <div>Night Works Programme</div>
      </div>
    </div>
  );
}

export default NightWorksPrint;