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

  const filteredJobs = useMemo(() => {
    return jobs.filter((job) => {
      if (categoryFilter && job.category !== categoryFilter) return false;
      if (ncrOnly && Number(job.is_ncr) !== 1) return false;
      return true;
    });
  }, [jobs, categoryFilter, ncrOnly]);

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

          <Link to="/jobs" className="detail-btn detail-btn-secondary">
            Back to Jobs
          </Link>
        </div>
      </div>

      {message && <p className="form-message">{message}</p>}

      <div className="vrs-kpi-grid">
        <div className="vrs-kpi-card vrs-kpi-red">
          <span>CAT 1</span>
          <strong>{summary.cat1}</strong>
        </div>

        <div className="vrs-kpi-card vrs-kpi-orange">
          <span>CAT 2.1</span>
          <strong>{summary.cat21}</strong>
        </div>

        <div className="vrs-kpi-card vrs-kpi-yellow">
          <span>CAT 2.2</span>
          <strong>{summary.cat22}</strong>
        </div>

        <div className="vrs-kpi-card vrs-kpi-blue">
          <span>CAT 2.3</span>
          <strong>{summary.cat23}</strong>
        </div>

        <div className="vrs-kpi-card vrs-kpi-green">
          <span>Completed This Month</span>
          <strong>{summary.completedThisMonth}</strong>
        </div>

        <div className="vrs-kpi-card vrs-kpi-dark">
          <span>NCRs / Overdue</span>
          <strong>{summary.ncrs}</strong>
        </div>
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
              {filteredJobs.map((job) => (
                <tr
                  key={job.job_id}
                  className={Number(job.is_ncr) === 1 ? "vrs-row-ncr" : ""}
                >
                  <td>
                    <span className={`vrs-cat-badge ${job.category ? "" : "vrs-cat-empty"}`}>
                      {job.category || "—"}
                    </span>
                  </td>

                  <td>
                    <Link to={`/jobs/${job.job_id}`} className="table-link-strong">
                      {job.job_number}
                    </Link>
                  </td>

                  <td>{job.work_order || "—"}</td>
                  <td>{job.incident_number || "—"}</td>
                  <td>{formatDate(job.date_in)}</td>
                  <td>{formatDate(job.programmed_date || job.planned_date)}</td>
                  <td>{formatDate(job.repair_date)}</td>
                  <td>{formatDate(job.run_over_date)}</td>
                  <td>{job.marker_post || job.location || "—"}</td>
                  <td>{job.carriageway_side || "—"}</td>
                  <td>{job.closure_ref || "—"}</td>
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
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

export default VrsReport;