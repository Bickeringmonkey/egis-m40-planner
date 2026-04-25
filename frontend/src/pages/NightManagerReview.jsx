import { useEffect, useState } from "react";
import api from "../services/api";

function NightManagerReview() {
  const today = new Date().toISOString().split("T")[0];

  const [date, setDate] = useState(today);
  const [closures, setClosures] = useState([]);
  const [closureId, setClosureId] = useState("");
  const [jobs, setJobs] = useState([]);
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    loadClosures();
  }, []);

  const loadClosures = async () => {
    try {
      const res = await api.get("/closures");
      setClosures(res.data);
    } catch (err) {
      console.error(err);
      setMessage("Failed to load closures.");
    }
  };

  const loadJobs = async () => {
    if (!date || !closureId) {
      setMessage("Please select a date and closure.");
      return;
    }

    try {
      setLoading(true);
      setMessage("");

      const res = await api.get(
        `/checksheet/jobs?date=${date}&closureId=${closureId}`
      );

      setJobs(res.data);
    } catch (err) {
      console.error(err);
      setMessage(err.response?.data?.error || "Failed to load jobs.");
    } finally {
      setLoading(false);
    }
  };

  const updateLocalJob = (jobId, field, value) => {
    setJobs((prev) =>
      prev.map((job) =>
        job.id === jobId ? { ...job, [field]: value } : job
      )
    );
  };

  const saveJob = async (job) => {
    try {
      setMessage("");

      await api.put(`/jobs/${job.id}/night-manager-check`, {
        night_manager_checked: !!job.night_manager_checked,
      });

      setMessage(`Manager review saved for ${job.job_number}.`);
      loadJobs();
    } catch (err) {
      console.error(err);
      setMessage(err.response?.data?.error || "Failed to save manager review.");
    }
  };

  const formatDate = (value) => {
    if (!value) return "";
    return new Date(value).toLocaleDateString("en-GB");
  };

  const selectedClosure = closures.find(
    (closure) => String(closure.id) === String(closureId)
  );

  return (
    <div className="list-page list-page-compact">
      <div className="list-page-header list-page-header-tight">
        <div>
          <h1 className="page-title">Night Works Manager Review</h1>
          <p className="page-subtitle">
            Review supervisor checks and confirm works are ready for final scheduler completion.
          </p>
        </div>
      </div>

      {message && <p className="form-message">{message}</p>}

      <div className="filter-card filter-card-compact">
        <div className="filter-grid-compact">
          <div className="form-group">
            <label>Date</label>
            <input type="date" value={date} onChange={(e) => setDate(e.target.value)} />
          </div>

          <div className="form-group">
            <label>Closure</label>
            <select value={closureId} onChange={(e) => setClosureId(e.target.value)}>
              <option value="">Select closure</option>
              {closures.map((closure) => (
                <option key={closure.id} value={closure.id}>
                  {closure.closure_ref}
                </option>
              ))}
            </select>
          </div>

          <div className="filter-actions-inline">
            <button type="button" className="detail-btn detail-btn-secondary" onClick={loadJobs}>
              Load Review
            </button>
          </div>
        </div>
      </div>

      {selectedClosure && (
        <div className="detail-card" style={{ marginBottom: "16px" }}>
          <h2 style={{ marginTop: 0 }}>{selectedClosure.closure_ref}</h2>
          <p>
            <strong>Date:</strong> {formatDate(date)} &nbsp; | &nbsp;
            <strong>Carriageway:</strong> {selectedClosure.carriageway || "N/A"} &nbsp; | &nbsp;
            <strong>Junctions:</strong> {selectedClosure.junctions_between || "N/A"}
          </p>
        </div>
      )}

      {loading && <p>Loading jobs...</p>}

      {!loading && jobs.length === 0 && (
        <div className="detail-card">
          <p>No jobs loaded yet.</p>
        </div>
      )}

      {!loading && jobs.length > 0 && (
        <div className="list-table-card">
          <div className="list-table-header">
            <h2>Jobs for Manager Review</h2>
            <span>{jobs.length} jobs</span>
          </div>

          <div className="table-wrapper">
            <table className="enhanced-table">
              <thead>
                <tr>
                  <th>Job No</th>
                  <th>Work Order</th>
                  <th>Workstream</th>
                  <th>Activity</th>
                  <th>Supervisor Complete</th>
                  <th>Paperwork Checked</th>
                  <th>Supervisor Notes</th>
                  <th>Manager Checked</th>
                  <th>Save</th>
                </tr>
              </thead>

              <tbody>
                {jobs.map((job) => (
                  <tr key={job.id}>
                    <td>{job.job_number}</td>
                    <td>{job.work_order || ""}</td>
                    <td>{job.workstream || ""}</td>
                    <td>{job.activity || job.title || ""}</td>
                    <td>{job.supervisor_checked ? "Yes" : "No"}</td>
                    <td>{job.paperwork_checked ? "Yes" : "No"}</td>
                    <td>{job.completion_notes || ""}</td>

                    <td>
                      <input
                        type="checkbox"
                        checked={!!job.night_manager_checked}
                        disabled={!job.paperwork_checked}
                        title={!job.paperwork_checked ? "Paperwork must be checked first" : ""}
                        onChange={(e) =>
                          updateLocalJob(job.id, "night_manager_checked", e.target.checked ? 1 : 0)
                        }
                      />
                    </td>

                    <td>
                      <button type="button" onClick={() => saveJob(job)}>
                        Save
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}

export default NightManagerReview;