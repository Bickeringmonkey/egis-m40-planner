import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import api from "../services/api";
import logo from "../assets/egis-logo.png";

const defaultColumns = {
  date: false,
  jobNo: true,
  workOrder: true,
  activity: false,
  location: true,
  startMp: true,
  endMp: true,
  description: true,
  status: false,
};

const columnPresets = {
  supervisor: {
    date: false,
    jobNo: true,
    workOrder: false,
    activity: false,
    location: true,
    startMp: true,
    endMp: true,
    description: true,
    status: false,
  },
  commercial: {
    date: true,
    jobNo: true,
    workOrder: true,
    activity: true,
    location: false,
    startMp: false,
    endMp: false,
    description: false,
    status: true,
  },
  full: {
    date: true,
    jobNo: true,
    workOrder: true,
    activity: true,
    location: true,
    startMp: true,
    endMp: true,
    description: true,
    status: true,
  },
};

function NightWorksPrint() {
  const [startDate, setStartDate] = useState("2026-04-27");
  const [endDate, setEndDate] = useState("2026-04-27");
  const [closureId, setClosureId] = useState("");
  const [closures, setClosures] = useState([]);
  const [nightWorks, setNightWorks] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [printMode, setPrintMode] = useState("supervisor");
  const [hideCompleted, setHideCompleted] = useState(true);

  const [visibleColumns, setVisibleColumns] = useState(() => {
    const saved = localStorage.getItem("nightworksPrintColumns");

    if (saved) {
      try {
        return { ...defaultColumns, ...JSON.parse(saved) };
      } catch {
        return defaultColumns;
      }
    }

    return defaultColumns;
  });

  const generatedAt = new Date();
  const effectiveEndDate = endDate || startDate;
  const showSupervisorChecks = printMode === "supervisor";

  const columnOptions = [
    { key: "date", label: "Date" },
    { key: "jobNo", label: "Job No" },
    { key: "workOrder", label: "WO" },
    { key: "activity", label: "Activity" },
    { key: "location", label: "Location" },
    { key: "startMp", label: "Start MP" },
    { key: "endMp", label: "End MP" },
    { key: "description", label: "Description" },
    { key: "status", label: "Status" },
  ];

  useEffect(() => {
    fetchClosures();
    fetchNightWorks("2026-04-27", "2026-04-27", "");
  }, []);

  useEffect(() => {
    localStorage.setItem(
      "nightworksPrintColumns",
      JSON.stringify(visibleColumns)
    );
  }, [visibleColumns]);

  const fetchClosures = async () => {
    try {
      const response = await api.get("/closures");
      setClosures(response.data);
    } catch (err) {
      console.error("Error fetching closures:", err);
    }
  };

  const fetchNightWorks = async (
    selectedStartDate,
    selectedEndDate,
    selectedClosureId
  ) => {
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

  const toggleColumn = (key) => {
    setVisibleColumns((prev) => ({
      ...prev,
      [key]: !prev[key],
    }));
  };

  const applyPreset = (presetName) => {
    setPrintMode(presetName);
    setVisibleColumns(columnPresets[presetName]);
  };

  const resetColumns = () => {
    setPrintMode("supervisor");
    setVisibleColumns(defaultColumns);
  };

  const selectedColumnCount =
    Object.values(visibleColumns).filter(Boolean).length;

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

  const getCleanStatus = (status) => {
    return String(status || "").toLowerCase().trim();
  };

  const isCompletedOrCancelled = (job) => {
    const status = getCleanStatus(job.status);

    return (
      status === "complete" ||
      status === "completed" ||
      status === "cancelled" ||
      status === "canceled"
    );
  };

  const isRiskJob = (job) => {
    const status = getCleanStatus(job.status);

    const searchableText = [
      job.priority,
      job.risk,
      job.notes,
      job.description,
      job.title,
      job.activity,
    ]
      .filter(Boolean)
      .join(" ")
      .toLowerCase();

    const hasRiskText =
      searchableText.includes("high risk") ||
      searchableText.includes("urgent") ||
      searchableText.includes("critical") ||
      searchableText.includes("priority") ||
      searchableText.includes("must do") ||
      searchableText.includes("safety");

    const todayOnly = new Date();
    todayOnly.setHours(0, 0, 0, 0);

    const plannedDate = job.planned_date ? new Date(job.planned_date) : null;

    if (plannedDate) {
      plannedDate.setHours(0, 0, 0, 0);
    }

    const isOverdue =
      plannedDate &&
      plannedDate < todayOnly &&
      !isCompletedOrCancelled(job);

    return (
      hasRiskText ||
      isOverdue ||
      status === "high risk" ||
      status === "urgent" ||
      status === "critical"
    );
  };

  const getJobRowClass = (job) => {
    if (isCompletedOrCancelled(job)) return "nightworks-row-muted";
    if (isRiskJob(job)) return "nightworks-row-risk";
    return "";
  };

  const getStatusClass = (status) => {
    const clean = getCleanStatus(status);

    if (!clean) return "status-badge";
    if (clean === "planned") return "status-badge status-planned";
    if (clean === "complete" || clean === "completed") {
      return "status-badge status-complete";
    }
    if (clean === "cancelled" || clean === "canceled") {
      return "status-badge status-cancelled";
    }

    return "status-badge";
  };

  const visibleNightWorks = useMemo(() => {
    if (!hideCompleted) return nightWorks;
    return nightWorks.filter((job) => !isCompletedOrCancelled(job));
  }, [nightWorks, hideCompleted]);

  const groupedNightWorks = useMemo(() => {
    const groups = {};

    visibleNightWorks.forEach((job) => {
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

    return Object.values(groups)
      .map((group) => ({
        ...group,
        jobs: group.jobs.sort((a, b) => {
          const aMp = Number(a.start_mp ?? 999999);
          const bMp = Number(b.start_mp ?? 999999);

          if (aMp !== bMp) return aMp - bMp;

          const aEnd = Number(a.end_mp ?? 999999);
          const bEnd = Number(b.end_mp ?? 999999);

          if (aEnd !== bEnd) return aEnd - bEnd;

          return String(a.job_number || "").localeCompare(
            String(b.job_number || "")
          );
        }),
      }))
      .filter((group) => group.jobs.length > 0);
  }, [visibleNightWorks]);

  const workstreamTotals = useMemo(() => {
    const totals = {};

    visibleNightWorks.forEach((job) => {
      const workstream = job.workstream || "Unknown";
      totals[workstream] = (totals[workstream] || 0) + 1;
    });

    return Object.entries(totals)
      .sort((a, b) => a[0].localeCompare(b[0]))
      .map(([name, count]) => ({ name, count }));
  }, [visibleNightWorks]);

  const totalJobs = visibleNightWorks.length;
  const totalClosures = groupedNightWorks.length;
  const hiddenJobs = nightWorks.length - visibleNightWorks.length;
  const riskJobCount = visibleNightWorks.filter(isRiskJob).length;

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
            <button type="button" className="detail-btn" onClick={handleLoad}>
              Load Print View
            </button>
          </div>
        </div>

        <div className="nightworks-toggle-row">
          <label className="nightworks-toggle">
            <input
              type="checkbox"
              checked={hideCompleted}
              onChange={() => setHideCompleted((prev) => !prev)}
            />
            <span>Hide Completed / Cancelled Jobs</span>
          </label>

          {hideCompleted && hiddenJobs > 0 && (
            <span className="nightworks-hidden-count">
              {hiddenJobs} hidden
            </span>
          )}

          {riskJobCount > 0 && (
            <span className="nightworks-risk-count">
              {riskJobCount} risk / priority
            </span>
          )}
        </div>

        <div className="nightworks-column-picker">
          <div>
            <strong>Print Mode</strong>
            <p>
              Choose the type of output you need. Column choices are saved
              automatically.
            </p>
          </div>

          <div className="nightworks-mode-toggle">
            <button
              type="button"
              className={
                printMode === "supervisor"
                  ? "nightworks-mode-btn active"
                  : "nightworks-mode-btn"
              }
              onClick={() => applyPreset("supervisor")}
            >
              Night Delivery Sheet
            </button>

            <button
              type="button"
              className={
                printMode === "full"
                  ? "nightworks-mode-btn active"
                  : "nightworks-mode-btn"
              }
              onClick={() => applyPreset("full")}
            >
              Full Planning View
            </button>
          </div>

          <div className="nightworks-column-presets">
            <button
              type="button"
              className="detail-btn detail-btn-secondary"
              onClick={() => applyPreset("commercial")}
            >
              Commercial View
            </button>

            <button
              type="button"
              className="detail-btn detail-btn-secondary"
              onClick={resetColumns}
            >
              Reset
            </button>
          </div>

          {selectedColumnCount > 7 && (
            <div className="nightworks-column-warning">
              You have selected a lot of columns. Print may be tight on A4.
            </div>
          )}

          <div className="nightworks-column-options">
            {columnOptions.map((column) => (
              <label key={column.key} className="nightworks-column-option">
                <input
                  type="checkbox"
                  checked={visibleColumns[column.key]}
                  onChange={() => toggleColumn(column.key)}
                />
                <span>{column.label}</span>
              </label>
            ))}
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
          <div>
            <strong>Date Range:</strong> {formatDateRange()}
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
          <div>
            <strong>Risk / Priority:</strong> {riskJobCount}
          </div>
          {hideCompleted && hiddenJobs > 0 && (
            <div>
              <strong>Hidden:</strong> {hiddenJobs} completed/cancelled
            </div>
          )}
          <div className="nightworks-print-workstreams">
            <strong>Workstreams:</strong>{" "}
            {workstreamTotals.length
              ? workstreamTotals
                  .map((item) => `${item.name} (${item.count})`)
                  .join(", ")
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
                    {getClosureDateLabel(group)} | {group.carriageway} |{" "}
                    {group.closure_type || "Closure"}
                  </p>
                </div>

                <div>
                  <p>
                    <strong>NEMS:</strong> {group.nems_number || "None"} |{" "}
                    <strong>Junctions:</strong>{" "}
                    {group.junctions_between || "None"} |{" "}
                    <strong>Lane:</strong> {group.lane_configuration || "None"}
                  </p>
                </div>
              </div>

              <table className="nightworks-print-table">
                <thead>
                  <tr>
                    {visibleColumns.date && <th>Date</th>}
                    {visibleColumns.jobNo && <th>Job No</th>}
                    {visibleColumns.workOrder && <th>WO</th>}
                    {visibleColumns.activity && <th>Activity</th>}
                    {visibleColumns.location && <th>Location</th>}
                    {visibleColumns.startMp && <th>Start MP</th>}
                    {visibleColumns.endMp && <th>End MP</th>}
                    {visibleColumns.description && <th>Description</th>}
                    {showSupervisorChecks && <th>Done</th>}
                    {showSupervisorChecks && <th>Issue</th>}
                    {showSupervisorChecks && <th>N/S</th>}
                    {visibleColumns.status && <th>Status</th>}
                  </tr>
                </thead>

                <tbody>
                  {group.jobs.map((job) => (
                    <tr key={job.id} className={getJobRowClass(job)}>
                      {visibleColumns.date && (
                        <td>{formatDate(job.planned_date)}</td>
                      )}
                      {visibleColumns.jobNo && <td>{job.job_number}</td>}
                      {visibleColumns.workOrder && (
                        <td>{job.work_order || ""}</td>
                      )}
                      {visibleColumns.activity && (
                        <td>{job.activity || job.title || ""}</td>
                      )}
                      {visibleColumns.location && <td>{job.location || ""}</td>}
                      {visibleColumns.startMp && <td>{job.start_mp || ""}</td>}
                      {visibleColumns.endMp && <td>{job.end_mp || ""}</td>}
                      {visibleColumns.description && (
                        <td>{job.description || ""}</td>
                      )}
                      {showSupervisorChecks && (
                        <td className="supervisor-check-box"></td>
                      )}
                      {showSupervisorChecks && (
                        <td className="supervisor-check-box"></td>
                      )}
                      {showSupervisorChecks && (
                        <td className="supervisor-check-box"></td>
                      )}
                      {visibleColumns.status && (
                        <td>
                          <span className={getStatusClass(job.status)}>
                            {job.status}
                          </span>
                        </td>
                      )}
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