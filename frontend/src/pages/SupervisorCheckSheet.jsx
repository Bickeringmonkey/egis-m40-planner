import { useEffect, useState } from "react";
import api from "../services/api";

function SupervisorCheckSheet() {
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
        job.id === jobId
          ? {
              ...job,
              [field]: value,
            }
          : job
      )
    );
  };

  const saveJob = async (job) => {
    try {
      setMessage("");

      await api.put(`/jobs/${job.id}/supervisor-check`, {
        supervisor_checked: !!job.supervisor_checked,
        paperwork_checked: !!job.paperwork_checked,
        completion_notes: job.completion_notes || "",
      });

      setMessage(`Saved ${job.job_number}.`);
      loadJobs();
    } catch (err) {
      console.error(err);
      setMessage(err.response?.data?.error || "Failed to save job.");
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
          <h1 className="page-title">Supervisor Check Sheet</h1>
          <p className="page-subtitle">
            Check completed works and confirm paperwork has been reviewed.
          </p>
        </div>
      </div>

      {message && <p className="form-message">{message}</p>}

      <div className="filter-card filter-card-compact">
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
              <option value="">Select closure</option>
              {closures.map((closure) => (
                <option key={closure.id} value={closure.id}>
                  {closure.closure_ref}
                </option>
              ))}
            </select>
          </div>

          <div className="filter-actions-inline">
            <button
              type="button"
              className="detail-btn detail-btn-secondary"
              onClick={loadJobs}
            >
              Load Check Sheet
            </button>
          </div>
        </div>
      </div>

      {selectedClosure && (
        <div className="detail-card" style={{ marginBottom: "16px" }}>
          <h2 style={{ marginTop: 0 }}>{selectedClosure.closure_ref}</h2>
          <p>
            <strong>Date:</strong> {formatDate(date)} &nbsp; | &nbsp;
            <strong>Carriageway:</strong> {selectedClosure.carriageway || "N/A"}{" "}
            &nbsp; | &nbsp;
            <strong>Junctions:</strong>{" "}
            {selectedClosure.junctions_between || "N/A"}
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
            <h2>Jobs to Check</h2>
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
                  <th>Location</th>
                  <th>Works Complete</th>
                  <th>Paperwork Checked</th>
                  <th>Notes</th>
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
                    <td>{job.location || ""}</td>

                    <td>
                      <input
                        type="checkbox"
                        checked={!!job.supervisor_checked}
                        onChange={(e) =>
                          updateLocalJob(
                            job.id,
                            "supervisor_checked",
                            e.target.checked ? 1 : 0
                          )
                        }
                      />
                    </td>

                    <td>
                      <input
                        type="checkbox"
                        checked={!!job.paperwork_checked}
                        onChange={(e) =>
                          updateLocalJob(
                            job.id,
                            "paperwork_checked",
                            e.target.checked ? 1 : 0
                          )
                        }
                      />
                    </td>

                    <td>
                      <input
                        type="text"
                        value={job.completion_notes || ""}
                        onChange={(e) =>
                          updateLocalJob(
                            job.id,
                            "completion_notes",
                            e.target.value
                          )
                        }
                        placeholder="Add note"
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

export default SupervisorCheckSheet;