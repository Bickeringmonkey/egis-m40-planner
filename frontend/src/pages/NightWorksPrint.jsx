import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import api from "../services/api";
import logo from "../assets/egis-logo.png";

function NightWorksPrint() {
  const [startDate, setStartDate] = useState("2026-04-27");
  const [endDate, setEndDate] = useState("2026-04-27");
  const [closureId, setClosureId] = useState("");
  const [closures, setClosures] = useState([]);
  const [nightWorks, setNightWorks] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const generatedAt = new Date();
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

  const handlePrint = () => {
    window.print();
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

  const formatDateTime = (dateObj) => {
    return dateObj.toLocaleString("en-GB", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
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

  const workstreamTotals = useMemo(() => {
    const totals = {};

    nightWorks.forEach((job) => {
      const workstream = job.workstream || "Unknown";
      totals[workstream] = (totals[workstream] || 0) + 1;
    });

    return Object.entries(totals)
      .sort((a, b) => a[0].localeCompare(b[0]))
      .map(([name, count]) => ({ name, count }));
  }, [nightWorks]);

  const totalJobs = nightWorks.length;
  const totalClosures = groupedNightWorks.length;

  return (
    <div className="nightworks-print-page">
      <div className="print-hide nightworks-control-card">
  <div className="nightworks-control-top">
    <div>
      <Link to="/nightworks" className="back-link">
        ← Back to Night Works
      </Link>

      <h1 className="page-title">Night Works Print View</h1>
      <p className="page-subtitle">
        Compact operational version for printing or export.
      </p>
    </div>

    <button
      type="button"
      className="primary-action-btn"
      onClick={handlePrint}
    >
      Print / Save PDF
    </button>
  </div>

  <div className="nightworks-filter-row">
    <div className="form-group">
      <label htmlFor="print-start-date">Start Date</label>
      <input
        id="print-start-date"
        type="date"
        value={startDate}
        onChange={(e) => {
          setStartDate(e.target.value);
          if (!endDate) setEndDate(e.target.value);
        }}
      />
    </div>

    <div className="form-group">
      <label htmlFor="print-end-date">End Date</label>
      <input
        id="print-end-date"
        type="date"
        value={endDate}
        onChange={(e) => setEndDate(e.target.value)}
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
            {closure.closure_ref} - {getClosureDateLabel(closure)}
          </option>
        ))}
      </select>
    </div>

    <div className="filter-actions">
      <button
        type="button"
        className="detail-btn"
        onClick={handleLoad}
      >
        Load Print View
      </button>
    </div>
  </div>
</div>

       
      <div className="nightworks-print-sheet">
        <div className="nightworks-print-header">
          <div className="nightworks-print-brand">
            <img src={logo} alt="Egis Road Operations" />
          </div>

          <div className="nightworks-print-title">
            <h1>M40 Night Works Programme</h1>
            <p>Operational Planning Output</p>
          </div>
        </div>

        <div className="nightworks-print-meta">
          <div><strong>Date Range:</strong> {formatDateRange()}</div>
          <div><strong>Generated:</strong> {formatDateTime(generatedAt)}</div>
          <div><strong>Closures:</strong> {totalClosures}</div>
          <div><strong>Total Jobs:</strong> {totalJobs}</div>
          <div className="nightworks-print-workstreams">
            <strong>Workstreams:</strong>{" "}
            {workstreamTotals.length
              ? workstreamTotals.map((item) => `${item.name} (${item.count})`).join(", ")
              : "None"}
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
            <div key={group.closure_id} className="nightworks-closure-print-card">
              <div className="nightworks-closure-print-header">
                <div>
                  <h2>{group.closure_ref}</h2>
                  <p>
                    {getClosureDateLabel(group)} | {group.carriageway} | {group.closure_type || "Closure"}
                  </p>
                </div>

                <div>
                  <p>
                    <strong>NEMS:</strong> {group.nems_number || "None"} |{" "}
                    <strong>Junctions:</strong> {group.junctions_between || "None"} |{" "}
                    <strong>Lane:</strong> {group.lane_configuration || "None"}
                  </p>
                </div>
              </div>

              <table className="nightworks-print-table">
                <thead>
                  <tr>
                    <th>Date</th>
                    <th>Job No</th>
                    <th>WO</th>
                    <th>Activity</th>
                    <th>Location</th>
                    <th>Start MP</th>
                    <th>End MP</th>
                    <th>Description</th>
                    <th>Status</th>
                  </tr>
                </thead>

                <tbody>
                  {group.jobs.map((job) => (
                    <tr key={job.id}>
                      <td>{formatDate(job.planned_date)}</td>
                      <td>{job.job_number}</td>
                      <td>{job.work_order || ""}</td>
                      <td>{job.activity || job.title || ""}</td>
                      <td>{job.location || ""}</td>
                      <td>{job.start_mp || ""}</td>
                      <td>{job.end_mp || ""}</td>
                      <td>{job.description || ""}</td>
                      <td>
                        <span className={getStatusClass(job.status)}>{job.status}</span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ))}

        <div className="nightworks-print-footer">
          <div>Generated from M40 Planner</div>
          <div>Night Works Programme</div>
        </div>
      </div>
    </div>
  );
}

export default NightWorksPrint;
