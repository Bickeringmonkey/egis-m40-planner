import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import api from "../services/api";

function VrsReport() {
  const [summary, setSummary] = useState({
    cat1: 0,
    cat21: 0,
    cat22: 0,
    cat23: 0,
    completedThisMonth: 0,
    ncrs: 0,
  });

  const [jobs, setJobs] = useState([]);
  const [categoryFilter, setCategoryFilter] = useState("");
  const [ncrOnly, setNcrOnly] = useState(false);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");

  useEffect(() => {
    loadVrsReport();
  }, []);

  const loadVrsReport = async () => {
    try {
      setLoading(true);
      setMessage("");

      const res = await api.get("/vrs-report");

      setSummary(
        res.data?.summary || {
          cat1: 0,
          cat21: 0,
          cat22: 0,
          cat23: 0,
          completedThisMonth: 0,
          ncrs: 0,
        }
      );

      setJobs(res.data?.jobs || []);
    } catch (err) {
      console.error("Failed to load VRS report:", err);
      setMessage(err.response?.data?.error || "Failed to load VRS report.");
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (value) => {
    if (!value) return "—";
    return new Date(value).toLocaleDateString("en-GB");
  };

  const yesNo = (value) => (Number(value) === 1 ? "Yes" : "No");

  const calculateOverdueDays = (job) => {
    if (Number(job.is_ncr) !== 1 || !job.run_over_date) return 0;

    const runOver = new Date(job.run_over_date);
    const today = new Date();

    runOver.setHours(0, 0, 0, 0);
    today.setHours(0, 0, 0, 0);

    return Math.max(
      Math.floor((today - runOver) / (1000 * 60 * 60 * 24)),
      0
    );
  };

  const filteredJobs = useMemo(() => {
    return jobs.filter((job) => {
      if (categoryFilter && job.category !== categoryFilter) return false;
      if (ncrOnly && Number(job.is_ncr) !== 1) return false;
      return true;
    });
  }, [jobs, categoryFilter, ncrOnly]);

  const clearFilters = () => {
    setCategoryFilter("");
    setNcrOnly(false);
  };

  return (
    <div className="vrs-report-page">
      <div className="list-page-header">
        <div>
          <h1 className="page-title">VRS Report</h1>
          <p className="page-subtitle">
            Live VRS repair log, category totals, completion and NCR tracking.
          </p>
        </div>

        <div className="detail-actions">
          <button type="button" className="detail-btn" onClick={loadVrsReport}>
            Refresh
          </button>
          <Link to="/jobs/vrs/new" className="detail-btn">
            Add Barrier Job
          </Link>

          <Link to="/jobs" className="detail-btn detail-btn-secondary">
            Back to Jobs
          </Link>
        </div>
      </div>

      {message && <p className="form-message">{message}</p>}

      <div className="vrs-kpi-grid">
        <button
          type="button"
          className="vrs-kpi-card vrs-kpi-red"
          onClick={() => {
            setCategoryFilter("CAT 1");
            setNcrOnly(false);
          }}
        >
          <span>CAT 1</span>
          <strong>{summary.cat1}</strong>
        </button>

        <button
          type="button"
          className="vrs-kpi-card vrs-kpi-orange"
          onClick={() => {
            setCategoryFilter("CAT 2.1");
            setNcrOnly(false);
          }}
        >
          <span>CAT 2.1</span>
          <strong>{summary.cat21}</strong>
        </button>

        <button
          type="button"
          className="vrs-kpi-card vrs-kpi-yellow"
          onClick={() => {
            setCategoryFilter("CAT 2.2");
            setNcrOnly(false);
          }}
        >
          <span>CAT 2.2</span>
          <strong>{summary.cat22}</strong>
        </button>

        <button
          type="button"
          className="vrs-kpi-card vrs-kpi-blue"
          onClick={() => {
            setCategoryFilter("CAT 2.3");
            setNcrOnly(false);
          }}
        >
          <span>CAT 2.3</span>
          <strong>{summary.cat23}</strong>
        </button>

        <button
          type="button"
          className="vrs-kpi-card vrs-kpi-green"
          onClick={clearFilters}
        >
          <span>Completed This Month</span>
          <strong>{summary.completedThisMonth}</strong>
        </button>

        <button
          type="button"
          className="vrs-kpi-card vrs-kpi-dark"
          onClick={() => {
            setCategoryFilter("");
            setNcrOnly(true);
          }}
        >
          <span>NCRs / Overdue</span>
          <strong>{summary.ncrs}</strong>
        </button>
      </div>

      <div className="filter-card filter-card-compact">
        <div className="filter-grid-compact">
          <div className="form-group">
            <label>Category</label>
            <select
              value={categoryFilter}
              onChange={(e) => setCategoryFilter(e.target.value)}
            >
              <option value="">All Categories</option>
              <option value="CAT 1">CAT 1</option>
              <option value="CAT 2.1">CAT 2.1</option>
              <option value="CAT 2.2">CAT 2.2</option>
              <option value="CAT 2.3">CAT 2.3</option>
              <option value="NFA">NFA</option>
            </select>
          </div>

          <label className="vrs-filter-check">
            <input
              type="checkbox"
              checked={ncrOnly}
              onChange={(e) => setNcrOnly(e.target.checked)}
            />
            NCRs only
          </label>

          <div className="vrs-quick-filter-row">
            <button type="button" onClick={() => setCategoryFilter("CAT 1")}>
              CAT 1
            </button>
            <button type="button" onClick={() => setCategoryFilter("CAT 2.1")}>
              CAT 2.1
            </button>
            <button type="button" onClick={() => setCategoryFilter("CAT 2.2")}>
              CAT 2.2
            </button>
            <button type="button" onClick={() => setCategoryFilter("CAT 2.3")}>
              CAT 2.3
            </button>
            <button type="button" onClick={clearFilters}>
              Clear
            </button>
          </div>
        </div>
      </div>

      {loading && <p>Loading VRS report...</p>}

      {!loading && filteredJobs.length === 0 && (
        <div className="detail-card">
          <h2>No VRS jobs found</h2>
          <p>No VRS jobs match the current filters.</p>
        </div>
      )}

      {!loading && filteredJobs.length > 0 && (
        <div className="table-wrapper">
          <table className="enhanced-table vrs-report-table">
            <thead>
              <tr>
                <th>CAT</th>
                <th>Job</th>
                <th>WO</th>
                <th>Incident</th>
                <th>Date In</th>
                <th>Programmed</th>
                <th>Repair Date</th>
                <th>Run Over</th>
                <th>Overdue</th>
                <th>MP</th>
                <th>A/B</th>
                <th>Closure</th>
                <th>Duration</th>
                <th>Ops</th>
                <th>Diagnosis</th>
                <th>Concrete</th>
                <th>Coring</th>
                <th>Push Test</th>
                <th>CAT Scan</th>
                <th>Permit</th>
                <th>AMM12</th>
                <th>NCR</th>
                <th>Subcontractor</th>
                <th>Contact</th>
                <th>Comments</th>
              </tr>
            </thead>

            <tbody>
              {filteredJobs.map((job) => {
                const overdueDays = calculateOverdueDays(job);

                return (
                  <tr
                    key={job.job_id}
                    className={Number(job.is_ncr) === 1 ? "vrs-row-ncr" : ""}
                  >
                    <td>
                      <span
                        className={`vrs-cat-badge ${
                          job.category ? "" : "vrs-cat-empty"
                        }`}
                      >
                        {job.category || "—"}
                      </span>
                    </td>

                    <td>
                      <Link
                        to={`/jobs/${job.job_id}`}
                        className="table-link-strong"
                      >
                        {job.job_number}
                      </Link>
                    </td>

                    <td>{job.work_order || "—"}</td>
                    <td>{job.incident_number || "—"}</td>
                    <td>{formatDate(job.date_in)}</td>
                    <td>{formatDate(job.programmed_date || job.planned_date)}</td>
                    <td>{formatDate(job.repair_date)}</td>
                    <td>{formatDate(job.run_over_date)}</td>
                    <td>
                      {overdueDays > 0 ? (
                        <span className="vrs-overdue-pill">
                          {overdueDays}d
                        </span>
                      ) : (
                        "—"
                      )}
                    </td>
                    <td>{job.marker_post || job.location || "—"}</td>
                    <td>{job.carriageway_side || "—"}</td>
                    <td>
                    {job.closure_id ? (
                        <Link to={`/closures/${job.closure_id}`} className="table-link-strong">
                        {job.closure_ref || "View Closure"}
                        </Link>
                    ) : (
                        <Link to={`/jobs/${job.job_id}/edit`} className="vrs-link-closure-btn">
                        Link Closure
                        </Link>
                    )}
                    </td>
                    <td>{job.estimated_duration || "—"}</td>
                    <td>{job.number_of_ops || "—"}</td>
                    <td>{yesNo(job.diagnosis_complete)}</td>
                    <td>{yesNo(job.concrete_required)}</td>
                    <td>{yesNo(job.coring_required)}</td>
                    <td>{yesNo(job.push_test_required)}</td>
                    <td>{yesNo(job.cat_scan_required)}</td>
                    <td>{yesNo(job.permit_to_dig_required)}</td>
                    <td>{job.amm12_score || "—"}</td>
                    <td>
                      {Number(job.is_ncr) === 1 ? (
                        <span className="vrs-ncr-pill">NCR</span>
                      ) : (
                        "—"
                      )}
                    </td>
                    <td>{job.subcontractor_name || "—"}</td>
                    <td>
                      {job.subcontractor_contact_name || "—"}
                      {job.subcontractor_contact_phone &&
                      job.subcontractor_contact_phone !== "—"
                        ? ` · ${job.subcontractor_contact_phone}`
                        : ""}
                    </td>
                    <td>{job.comments || job.notes || "—"}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

export default VrsReport;