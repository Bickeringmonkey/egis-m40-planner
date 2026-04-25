import { useEffect, useState } from "react";
import api from "../services/api";
import egisLogo from "../assets/e-logo.svg";

function WorkSheet() {
  const today = new Date().toISOString().split("T")[0];

  const [startDate, setStartDate] = useState(today);
  const [endDate, setEndDate] = useState(today);
  const [workstreamId, setWorkstreamId] = useState("");
  const [workstreams, setWorkstreams] = useState([]);
  const [jobs, setJobs] = useState([]);
  const [message, setMessage] = useState("");

  const effectiveEndDate = endDate || startDate;

  useEffect(() => {
    loadWorkstreams();
  }, []);

  const loadWorkstreams = async () => {
    try {
      const res = await api.get("/workstreams");
      setWorkstreams(res.data);
    } catch (err) {
      console.error("Failed to load workstreams:", err);
      setMessage("Failed to load workstreams.");
    }
  };

  const loadWorksheet = async () => {
    setMessage("");

    if (!startDate || !workstreamId) {
      setMessage("Please select a start date and workstream.");
      return;
    }

    try {
      const res = await api.get(
        `/work-sheet?startDate=${startDate}&endDate=${effectiveEndDate}&workstreamId=${workstreamId}`
      );
      setJobs(res.data);
    } catch (err) {
      console.error("Failed to load worksheet:", err);
      setMessage(err.response?.data?.error || "Failed to load worksheet.");
    }
  };

  const printWorksheet = () => {
    window.print();
  };

  const formatDate = (value) => {
    if (!value) return "";
    return new Date(value).toLocaleDateString("en-GB");
  };

  const formatDateRange = () => {
    if (!startDate) return "";

    if (!effectiveEndDate || startDate === effectiveEndDate) {
      return formatDate(startDate);
    }

    return `${formatDate(startDate)} - ${formatDate(effectiveEndDate)}`;
  };

  const selectedWorkstream =
    workstreams.find((w) => String(w.id) === String(workstreamId))?.name || "";

  return (
    <div className="worksheet-page">
      <div className="worksheet-actions print-hide">
        <div>
          <h1 className="page-title">Work Sheet</h1>
          <p className="page-subtitle">
            Select a date range and workstream to create a printable worksheet.
          </p>
        </div>

        <button type="button" className="detail-btn" onClick={printWorksheet}>
          Print Work Sheet
        </button>
      </div>

      <div className="filter-card filter-card-compact print-hide">
        <div className="filter-grid-compact">
          <div className="form-group">
            <label>Start Date</label>
            <input
              type="date"
              value={startDate}
              onChange={(e) => {
                setStartDate(e.target.value);
                if (!endDate) setEndDate(e.target.value);
              }}
            />
          </div>

          <div className="form-group">
            <label>End Date</label>
            <input
              type="date"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
            />
          </div>

          <div className="form-group">
            <label>Workstream</label>
            <select
              value={workstreamId}
              onChange={(e) => setWorkstreamId(e.target.value)}
            >
              <option value="">Select workstream</option>
              {workstreams.map((workstream) => (
                <option key={workstream.id} value={workstream.id}>
                  {workstream.name}
                </option>
              ))}
            </select>
          </div>

          <div className="filter-actions-inline">
            <button
              type="button"
              className="detail-btn detail-btn-secondary"
              onClick={loadWorksheet}
            >
              Load Work Sheet
            </button>
          </div>
        </div>
      </div>

      {message && <p className="form-message print-hide">{message}</p>}

      <div className="worksheet-print-area">
        <div className="worksheet-header worksheet-branded-header">
          <div className="worksheet-brand">
            <div className="worksheet-logo-mark">
              <img
                src={egisLogo}
                alt="Egis Logo"
                className="worksheet-logo-img"
              />
            </div>

            <div>
              <div className="worksheet-brand-title">M40 Planner</div>
              <div className="worksheet-brand-subtitle">
                Egis Road Operations
              </div>
            </div>
          </div>

          <div className="worksheet-title-block">
            <h1>Work Sheet</h1>
            <p>
              <strong>Date Range:</strong> {formatDateRange()} &nbsp; | &nbsp;
              <strong>Workstream:</strong>{" "}
              {selectedWorkstream || "Not selected"}
            </p>
          </div>

          <div className="worksheet-count">
            {jobs.length} job{jobs.length !== 1 ? "s" : ""}
          </div>
        </div>

        <div className="worksheet-card">
          <table className="enhanced-table worksheet-table">
            <thead>
              <tr>
                <th>Planned Date</th>
                <th>Closure</th>
                <th>Job No</th>
                <th>Work Order</th>
                <th>Activity</th>
                <th>Location</th>
                <th>Start MP</th>
                <th>End MP</th>
                <th>Description</th>
                <th>Status</th>
              </tr>
            </thead>

            <tbody>
              {jobs.length > 0 ? (
                jobs.map((job) => (
                  <tr key={job.id}>
                    <td className="col-date">{formatDate(job.planned_date)}</td>
                    <td className="col-closure">{job.closure_ref || ""}</td>
                    <td className="col-jobno">{job.job_number || ""}</td>
                    <td className="col-workorder">{job.work_order || ""}</td>
                    <td className="col-activity">{job.activity || ""}</td>
                    <td className="col-location">{job.location || ""}</td>
                    <td className="col-startmp">{job.start_mp ?? ""}</td>
                    <td className="col-endmp">{job.end_mp ?? ""}</td>
                    <td className="description">{job.description || ""}</td>
                    <td className="col-status">{job.status || ""}</td>
                  </tr>
                ))
              ) : (
                <tr className="no-data-row">
                  <td colSpan={10}>
                    No jobs found for this date range and workstream.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        <div className="worksheet-signoff">
          <h2>Supervisor Sign-Off</h2>

          <table className="worksheet-signoff-table">
            <tbody>
              <tr>
                <td>Supervisor Name</td>
                <td></td>
                <td>Signature</td>
                <td></td>
                <td>Time</td>
                <td></td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

export default WorkSheet;