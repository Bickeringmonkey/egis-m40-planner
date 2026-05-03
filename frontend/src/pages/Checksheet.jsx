import { useEffect, useMemo, useState } from "react";
import api from "../services/api";

const OFFLINE_QUEUE_KEY = "m40_offline_checksheet_jobs";

function Checksheet() {
  const today = new Date().toISOString().split("T")[0];

  const [date, setDate] = useState(today);
  const [closures, setClosures] = useState([]);
  const [closureId, setClosureId] = useState("");
  const [jobs, setJobs] = useState([]);
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);

  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [offlineCount, setOfflineCount] = useState(0);

  useEffect(() => {
    loadClosures();
    refreshOfflineCount();
  }, []);

  useEffect(() => {
    const goOnline = () => setIsOnline(true);
    const goOffline = () => setIsOnline(false);

    window.addEventListener("online", goOnline);
    window.addEventListener("offline", goOffline);

    return () => {
      window.removeEventListener("online", goOnline);
      window.removeEventListener("offline", goOffline);
    };
  }, []);

  useEffect(() => {
    if (isOnline) {
      syncOfflineData();
    }
  }, [isOnline]);

  const getOfflineQueue = () => {
    return JSON.parse(localStorage.getItem(OFFLINE_QUEUE_KEY) || "[]");
  };

  const setOfflineQueue = (items) => {
    localStorage.setItem(OFFLINE_QUEUE_KEY, JSON.stringify(items));
    setOfflineCount(items.length);
  };

  const refreshOfflineCount = () => {
    setOfflineCount(getOfflineQueue().length);
  };

  const saveOffline = (job) => {
    const existing = getOfflineQueue();
    const updated = existing.filter((item) => item.id !== job.id);

    updated.push({
      id: job.id,
      job_number: job.job_number,
      supervisor_checked: !!job.supervisor_checked,
      paperwork_checked: !!job.paperwork_checked,
      issue_flagged: !!job.issue_flagged,
      completion_notes: job.completion_notes || "",
      saved_at: new Date().toISOString(),
    });

    setOfflineQueue(updated);
  };

  const syncOfflineData = async () => {
    const offlineJobs = getOfflineQueue();

    if (!offlineJobs.length || !navigator.onLine) return;

    try {
      for (const job of offlineJobs) {
        await api.put(`/jobs/${job.id}/supervisor-check`, {
          supervisor_checked: !!job.supervisor_checked,
          paperwork_checked: !!job.paperwork_checked,
          issue_flagged: !!job.issue_flagged,
          completion_notes: job.completion_notes || "",
        });
      }

      setOfflineQueue([]);
      setMessage("Offline checklist data synced.");

      if (date && closureId) {
        loadJobs();
      }
    } catch (err) {
      console.error("Offline sync failed:", err);
      refreshOfflineCount();
      setMessage("Sync failed. Offline data is still saved on this device.");
    }
  };

  const loadClosures = async () => {
    try {
      const res = await api.get("/closures");
      setClosures(res.data || []);
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

    if (!navigator.onLine) {
      setIsOnline(false);
      setMessage(
        "Offline — cannot load a new checklist. Existing loaded items can still be saved offline."
      );
      return;
    }

    try {
      setLoading(true);
      setMessage("");

      const res = await api.get(
        `/checksheet/jobs?date=${date}&closureId=${closureId}`
      );

      setJobs(res.data || []);
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
    const currentlyOnline = navigator.onLine;

    if (!currentlyOnline) {
      saveOffline(job);
      setIsOnline(false);
      refreshOfflineCount();
      setMessage(`Saved offline: ${job.job_number}. Will sync when signal returns.`);
      return;
    }

    try {
      setMessage("");

      await api.put(`/jobs/${job.id}/supervisor-check`, {
        supervisor_checked: !!job.supervisor_checked,
        paperwork_checked: !!job.paperwork_checked,
        issue_flagged: !!job.issue_flagged,
        completion_notes: job.completion_notes || "",
      });

      setMessage(`Saved ${job.job_number}.`);
      loadJobs();
    } catch (err) {
      console.error(err);

      saveOffline(job);
      refreshOfflineCount();
      setIsOnline(false);

      setMessage(`No signal. Saved offline: ${job.job_number}.`);
    }
  };

  const saveAll = async () => {
    const currentlyOnline = navigator.onLine;

    if (!currentlyOnline) {
      jobs.forEach((job) => saveOffline(job));
      setIsOnline(false);
      refreshOfflineCount();
      setMessage("All checklist items saved offline. They will sync when signal returns.");
      return;
    }

    try {
      setLoading(true);
      setMessage("");

      for (const job of jobs) {
        await api.put(`/jobs/${job.id}/supervisor-check`, {
          supervisor_checked: !!job.supervisor_checked,
          paperwork_checked: !!job.paperwork_checked,
          issue_flagged: !!job.issue_flagged,
          completion_notes: job.completion_notes || "",
        });
      }

      setMessage("All checklist items saved.");
      loadJobs();
    } catch (err) {
      console.error(err);

      jobs.forEach((job) => saveOffline(job));
      refreshOfflineCount();
      setIsOnline(false);

      setMessage("No signal. All checklist items saved offline.");
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (value) => {
    if (!value) return "";
    return new Date(value).toLocaleDateString("en-GB");
  };

  const selectedClosure = closures.find(
    (closure) => String(closure.id) === String(closureId)
  );

  const progress = useMemo(() => {
    const total = jobs.length;
    const worksComplete = jobs.filter((job) => job.supervisor_checked).length;
    const paperworkComplete = jobs.filter((job) => job.paperwork_checked).length;
    const issues = jobs.filter((job) => job.issue_flagged).length;

    return {
      total,
      worksComplete,
      paperworkComplete,
      issues,
      worksPercent: total ? Math.round((worksComplete / total) * 100) : 0,
      paperworkPercent: total ? Math.round((paperworkComplete / total) * 100) : 0,
    };
  }, [jobs]);

  const getJobStatusLabel = (job) => {
    if (job.issue_flagged) return "Issue flagged";
    if (job.lead_scheduler_checked) return "Final complete";
    if (job.night_manager_checked) return "Manager checked";
    if (job.paperwork_checked) return "Paperwork checked";
    if (job.supervisor_checked) return "Works complete";
    return "Pending";
  };

  const getJobStatusClass = (job) => {
    if (job.issue_flagged) return "mobile-check-status issue";
    if (job.lead_scheduler_checked) return "mobile-check-status complete";
    if (job.night_manager_checked) return "mobile-check-status manager";
    if (job.paperwork_checked) return "mobile-check-status paperwork";
    if (job.supervisor_checked) return "mobile-check-status started";
    return "mobile-check-status pending";
  };

  return (
    <div className="mobile-check-page">
      <div className="mobile-check-header">
        <div>
          <h1>Closure Checklist</h1>
          <p>Supervisor sign-off for works, issues and paperwork.</p>
        </div>
      </div>

      <div className={`mobile-check-message ${isOnline ? "" : "offline"}`}>
        {isOnline ? "Online" : "Offline mode"}
        {offlineCount > 0 && (
          <>
            {" "}· {offlineCount} item{offlineCount !== 1 ? "s" : ""} waiting to sync
            <button
              type="button"
              className="mobile-check-inline-sync"
              onClick={syncOfflineData}
              disabled={!isOnline}
            >
              Sync Now
            </button>
          </>
        )}
      </div>

      {message && <div className="mobile-check-message">{message}</div>}

      <div className="mobile-check-filters">
        <div className="mobile-check-field">
          <label>Date</label>
          <input
            type="date"
            value={date}
            onChange={(e) => setDate(e.target.value)}
          />
        </div>

        <div className="mobile-check-field">
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

        <button
          type="button"
          className="mobile-check-primary-btn"
          onClick={loadJobs}
        >
          Load Checklist
        </button>
      </div>

      {selectedClosure && (
        <div className="mobile-check-closure-card">
          <h2>{selectedClosure.closure_ref}</h2>
          <p>
            {formatDate(date)} · {selectedClosure.carriageway || "N/A"} ·{" "}
            {selectedClosure.junctions_between || "N/A"}
          </p>
        </div>
      )}

      {jobs.length > 0 && (
        <div className="mobile-check-progress mobile-check-progress-issues">
          <div>
            <span>Works</span>
            <strong>
              {progress.worksComplete}/{progress.total} ({progress.worksPercent}%)
            </strong>
          </div>

          <div>
            <span>Paperwork</span>
            <strong>
              {progress.paperworkComplete}/{progress.total} ({progress.paperworkPercent}%)
            </strong>
          </div>

          <div className={progress.issues > 0 ? "mobile-check-progress-risk" : ""}>
            <span>Issues</span>
            <strong>{progress.issues}</strong>
          </div>

          <button
            type="button"
            className="mobile-check-save-all-btn"
            onClick={saveAll}
            disabled={loading}
          >
            Save All
          </button>
        </div>
      )}

      {loading && <p>Loading checklist...</p>}

      {!loading && jobs.length === 0 && (
        <div className="mobile-check-empty">No checklist loaded yet.</div>
      )}

      {!loading && jobs.length > 0 && (
        <div className="mobile-check-list">
          {jobs.map((job) => (
            <div
              key={job.id}
              className={`mobile-check-card ${job.issue_flagged ? "mobile-check-card-issue" : ""}`}
            >
              <div className="mobile-check-card-top">
                <div>
                  <h2>{job.job_number}</h2>
                  <p>{job.work_order || "No work order"}</p>
                </div>

                <span className={getJobStatusClass(job)}>
                  {getJobStatusLabel(job)}
                </span>
              </div>

              <div className="mobile-check-details">
                <div>
                  <span>Workstream</span>
                  <strong>{job.workstream || "N/A"}</strong>
                </div>

                <div>
                  <span>Activity</span>
                  <strong>{job.activity || job.title || "N/A"}</strong>
                </div>

                <div>
                  <span>Location</span>
                  <strong>{job.location || "N/A"}</strong>
                </div>
              </div>

              <div className="mobile-check-toggles">
                <label className="mobile-check-toggle">
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
                  <span>Works Complete</span>
                </label>

                <label
                  className={`mobile-check-toggle ${
                    !job.supervisor_checked ? "disabled" : ""
                  }`}
                >
                  <input
                    type="checkbox"
                    checked={!!job.paperwork_checked}
                    disabled={!job.supervisor_checked}
                    onChange={(e) =>
                      updateLocalJob(
                        job.id,
                        "paperwork_checked",
                        e.target.checked ? 1 : 0
                      )
                    }
                  />
                  <span>Paperwork Checked</span>
                </label>

                <label className="mobile-check-toggle issue">
                  <input
                    type="checkbox"
                    checked={!!job.issue_flagged}
                    onChange={(e) =>
                      updateLocalJob(
                        job.id,
                        "issue_flagged",
                        e.target.checked ? 1 : 0
                      )
                    }
                  />
                  <span>Issue / Could Not Complete</span>
                </label>
              </div>

              <div className="mobile-check-review-row">
                <div>
                  <span>Manager</span>
                  <strong>{job.night_manager_checked ? "Yes" : "No"}</strong>
                </div>

                <div>
                  <span>Final</span>
                  <strong>{job.lead_scheduler_checked ? "Yes" : "No"}</strong>
                </div>
              </div>

              <div className="mobile-check-notes">
                <label>Notes</label>
                <textarea
                  value={job.completion_notes || ""}
                  onChange={(e) =>
                    updateLocalJob(job.id, "completion_notes", e.target.value)
                  }
                  placeholder="Add notes, issues, missing paperwork, photos required..."
                />
              </div>

              <button
                type="button"
                className="mobile-check-save-btn"
                onClick={() => saveSupervisorCheck(job)}
              >
                Save Item
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export default Checksheet;