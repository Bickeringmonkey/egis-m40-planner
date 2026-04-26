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

  // -----------------------------
  // INIT
  // -----------------------------
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

  // -----------------------------
  // OFFLINE STORAGE
  // -----------------------------
  const getOfflineQueue = () =>
    JSON.parse(localStorage.getItem(OFFLINE_QUEUE_KEY) || "[]");

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
          supervisor_checked: job.supervisor_checked,
          paperwork_checked: job.paperwork_checked,
          completion_notes: job.completion_notes,
        });
      }

      setOfflineQueue([]);
      setMessage("Offline data synced successfully.");

      if (date && closureId) loadJobs();
    } catch (err) {
      console.error(err);
      setMessage("Sync failed. Data still saved on device.");
    }
  };

  // -----------------------------
  // DATA LOAD
  // -----------------------------
  const loadClosures = async () => {
    try {
      const res = await api.get("/closures");
      setClosures(res.data || []);
    } catch {
      setMessage("Failed to load closures.");
    }
  };

  const loadJobs = async () => {
    if (!date || !closureId) {
      setMessage("Select date and closure.");
      return;
    }

    if (!navigator.onLine) {
      setMessage("Offline — cannot load new checklist.");
      return;
    }

    try {
      setLoading(true);
      setMessage("");

      const res = await api.get(
        `/checksheet/jobs?date=${date}&closureId=${closureId}`
      );

      setJobs(res.data || []);
    } catch {
      setMessage("Failed to load checklist.");
    } finally {
      setLoading(false);
    }
  };

  // -----------------------------
  // UPDATE JOB LOCALLY
  // -----------------------------
  const updateLocalJob = (jobId, field, value) => {
    setJobs((prev) =>
      prev.map((job) => {
        if (job.id !== jobId) return job;

        const updated = { ...job, [field]: value };

        if (field === "supervisor_checked" && !value) {
          updated.paperwork_checked = 0;
        }

        return updated;
      })
    );
  };

  // -----------------------------
  // SAVE SINGLE
  // -----------------------------
  const saveSupervisorCheck = async (job) => {
    const online = navigator.onLine;

    if (!online) {
      saveOffline(job);
      setIsOnline(false);
      setMessage(`Saved offline: ${job.job_number}`);
      return;
    }

    try {
      await api.put(`/jobs/${job.id}/supervisor-check`, {
        supervisor_checked: !!job.supervisor_checked,
        paperwork_checked: !!job.paperwork_checked,
        completion_notes: job.completion_notes || "",
      });

      setMessage(`Saved ${job.job_number}`);
      loadJobs();
    } catch {
      saveOffline(job);
      setMessage(`No signal — saved offline: ${job.job_number}`);
    }
  };

  // -----------------------------
  // SAVE ALL
  // -----------------------------
  const saveAll = async () => {
    const online = navigator.onLine;

    if (!online) {
      jobs.forEach(saveOffline);
      setIsOnline(false);
      setMessage("All items saved offline.");
      return;
    }

    try {
      setLoading(true);

      for (const job of jobs) {
        await api.put(`/jobs/${job.id}/supervisor-check`, {
          supervisor_checked: !!job.supervisor_checked,
          paperwork_checked: !!job.paperwork_checked,
          completion_notes: job.completion_notes || "",
        });
      }

      setMessage("All items saved.");
      loadJobs();
    } catch {
      jobs.forEach(saveOffline);
      setMessage("Connection lost — saved offline.");
    } finally {
      setLoading(false);
    }
  };

  // -----------------------------
  // UI HELPERS
  // -----------------------------
  const selectedClosure = closures.find(
    (c) => String(c.id) === String(closureId)
  );

  const progress = useMemo(() => {
    const total = jobs.length;
    const works = jobs.filter((j) => j.supervisor_checked).length;
    const paperwork = jobs.filter((j) => j.paperwork_checked).length;

    return {
      total,
      works,
      paperwork,
      worksPct: total ? Math.round((works / total) * 100) : 0,
      paperworkPct: total ? Math.round((paperwork / total) * 100) : 0,
    };
  }, [jobs]);

  // -----------------------------
  // RENDER
  // -----------------------------
  return (
    <div className="mobile-check-page">
      <h1>Closure Checklist</h1>

      <div className={`mobile-check-message ${isOnline ? "" : "offline"}`}>
        {isOnline ? "Online" : "Offline"}
        {offlineCount > 0 && ` · ${offlineCount} pending`}
      </div>

      {message && <div className="mobile-check-message">{message}</div>}

      <div>
        <input type="date" value={date} onChange={(e) => setDate(e.target.value)} />

        <select value={closureId} onChange={(e) => setClosureId(e.target.value)}>
          <option value="">Select closure</option>
          {closures.map((c) => (
            <option key={c.id} value={c.id}>
              {c.closure_ref}
            </option>
          ))}
        </select>

        <button onClick={loadJobs}>Load</button>
      </div>

      {selectedClosure && <h2>{selectedClosure.closure_ref}</h2>}

      {jobs.length > 0 && (
        <div>
          <p>
            Works: {progress.works}/{progress.total} ({progress.worksPct}%)
          </p>
          <p>
            Paperwork: {progress.paperwork}/{progress.total} ({progress.paperworkPct}%)
          </p>

          <button onClick={saveAll}>Save All</button>
        </div>
      )}

      {jobs.map((job) => (
        <div key={job.id}>
          <h3>{job.job_number}</h3>

          <label>
            <input
              type="checkbox"
              checked={!!job.supervisor_checked}
              onChange={(e) =>
                updateLocalJob(job.id, "supervisor_checked", e.target.checked)
              }
            />
            Works Complete
          </label>

          <label>
            <input
              type="checkbox"
              checked={!!job.paperwork_checked}
              disabled={!job.supervisor_checked}
              onChange={(e) =>
                updateLocalJob(job.id, "paperwork_checked", e.target.checked)
              }
            />
            Paperwork
          </label>

          <textarea
            value={job.completion_notes || ""}
            onChange={(e) =>
              updateLocalJob(job.id, "completion_notes", e.target.value)
            }
          />

          <button onClick={() => saveSupervisorCheck(job)}>Save</button>
        </div>
      ))}
    </div>
  );
}

export default Checksheet;