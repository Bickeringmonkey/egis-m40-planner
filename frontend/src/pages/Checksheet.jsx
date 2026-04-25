import { useEffect, useState } from "react";
import api from "../services/api";

function Checksheet() {
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
      setMessage(err.response?.data?.error || "Failed to load checklist.");
    } finally {
      setLoading(false);
    }
  };

  const updateLocalJob = (jobId, field, value) => {
    setJobs((prev) =>
      prev.map((job) => {
        if (job.id !== jobId) return job;

        const updated = {
          ...job,
          [field]: value,
        };

        if (field === "supervisor_checked" && !value) {
          updated.paperwork_checked = 0;
        }

        return updated;
      })
    );
  };

  const saveSupervisorCheck = async (job) => {
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
      setMessage(err.response?.data?.error || "Failed to save checklist item.");
    }
  };

  const formatDate = (value) => {
    if (!value) return "";
    return new Date(value).toLocaleDateString("en-GB");
  };

  const selectedClosure = closures.find(
    (closure) => String(closure.id) === String(closureId)
  );

  const getRowClass = (job) => {
    if (job.lead_scheduler_checked) return "checksheet-row-complete";
    if (job.night_manager_checked) return "checksheet-row-manager";
    if (job.paperwork_checked) return "checksheet-row-paperwork";
    if (job.supervisor_checked) return "checksheet-row-started";
    return "checksheet-row-pending";
  };

  return (
    <div className="list-page list-page-compact">
      <div className="list-page-header list-page-header-tight">
        <div>
          <h1 className="page-title">Closure Checklist</h1>
          <p className="page-subtitle">
            Tablet-friendly checklist for supervisors to confirm works and paperwork.
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
              Load Checklist
            </button>
          </div>
        </div>
      </div>

      {selectedClosure && (
        <div className="detail-card" style={{ marginBottom: "16px" }}>
          <h2 style={{ marginTop: 0 }}>{selectedClosure.closure_ref}</h2>
          <p>
            <strong>Date:</strong> {formatDate(date)} &nbsp; | &nbsp;
            <strong>Carriageway:</strong>{" "}
            {selectedClosure.carriageway || "N/A"} &nbsp; | &nbsp;
            <strong>Junctions:</strong>{" "}
            {selectedClosure.junctions_between || "N/A"}
          </p>
        </div>
      )}

      {loading && <p>Loading checklist...</p>}

      {!loading && jobs.length === 0 && (
        <div className="detail-card">
          <p>No checklist loaded yet.</p>
        </div>
      )}

      {!loading && jobs.length > 0 && (
        <div className="list-table-card">
          <div className="list-table-header">
            <h2>Checklist Items</h2>
            <span>{jobs.length} jobs</span>
          </div>

          <div className="table-wrapper">
            <table className="enhanced-table">
              <thead>
                <tr>
                  <th>Job</th>
                  <th>Workstream</th>
                  <th>Activity</th>
                  <th>Location</th>
                  <th>Works Complete</th>
                  <th>Paperwork</th>
                  <th>Manager</th>
                  <th>Final</th>
                  <th>Notes</th>
                  <th>Save</th>
                </tr>
              </thead>

              <tbody>
                {jobs.map((job) => (
                  <tr key={job.id} className={getRowClass(job)}>
                    <td>
                      <strong>{job.job_number}</strong>
                      <br />
                      <small>{job.work_order || ""}</small>
                    </td>

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
                        disabled={!job.supervisor_checked}
                        title={
                          !job.supervisor_checked
                            ? "Mark works complete first"
                            : ""
                        }
                        onChange={(e) =>
                          updateLocalJob(
                            job.id,
                            "paperwork_checked",
                            e.target.checked ? 1 : 0
                          )
                        }
                      />
                    </td>

                    <td>{job.night_manager_checked ? "Yes" : "No"}</td>
                    <td>{job.lead_scheduler_checked ? "Yes" : "No"}</td>

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
                        placeholder="Add notes"
                      />
                    </td>

                    <td>
                      <button type="button" onClick={() => saveSupervisorCheck(job)}>
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

export default Checksheet;