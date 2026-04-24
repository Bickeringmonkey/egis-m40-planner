import { useEffect, useState } from "react";
import { useParams, Link, useNavigate } from "react-router-dom";
import api from "../services/api";

function ClosureDetail() {
  const { id } = useParams();
  const navigate = useNavigate();

  const [closure, setClosure] = useState(null);
  const [jobs, setJobs] = useState([]);
  const [slipRoads, setSlipRoads] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [deleteMessage, setDeleteMessage] = useState("");

  useEffect(() => {
    fetchClosureDetail();
  }, [id]);

  const fetchClosureDetail = async () => {
    try {
      setLoading(true);
      setError("");
      const response = await api.get(`/closures/${id}`);
      setClosure(response.data.closure);
      setJobs(response.data.jobs);
      setSlipRoads(response.data.slip_roads || []);
    } catch (err) {
      console.error("Error fetching closure details:", err);
      setError("Failed to load closure details.");
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async () => {
    const confirmed = window.confirm(
      "Are you sure you want to delete this closure? It can only be deleted if it has no linked jobs."
    );
    if (!confirmed) return;

    try {
      await api.delete(`/closures/${id}`);
      navigate("/closures");
    } catch (err) {
      console.error("Error deleting closure:", err);
      const backendMessage = err.response?.data?.error || "Failed to delete closure.";
      setDeleteMessage(backendMessage);
    }
  };

  const formatDate = (dateString) => {
    if (!dateString) return "";
    return new Date(dateString).toLocaleDateString("en-GB");
  };

  const formatTime = (timeString) => {
    if (!timeString) return "None";
    return String(timeString).slice(0, 5);
  };

  const getStatusClass = (status) => {
    if (!status) return "status-badge";
    const clean = status.toLowerCase();
    if (clean === "planned") return "status-badge status-planned";
    if (clean === "complete") return "status-badge status-complete";
    if (clean === "cancelled") return "status-badge status-cancelled";
    return "status-badge";
  };

  if (loading) return <p>Loading closure details...</p>;
  if (error) return <p>{error}</p>;
  if (!closure) return <p>No closure found.</p>;

  const closureLeft = [
    { label: "Closure Ref", value: closure.closure_ref || "None" },
    { label: "Date", value: formatDate(closure.closure_date) || "None" },
    { label: "NEMS Number", value: closure.nems_number || "None" },
    { label: "Junctions Between", value: closure.junctions_between || "None" },
    { label: "Carriageway", value: closure.carriageway || "None" },
    { label: "Depot", value: closure.depot || "None" },
    { label: "Duty Manager", value: closure.duty_manager || "None" },
    { label: "Night Supervisor", value: closure.night_supervisor || "None" },
  ];

  const closureRight = [
    { label: "Lane Configuration", value: closure.lane_configuration || "None" },
    { label: "Closure Type", value: closure.closure_type || "None" },
    { label: "Start MP", value: closure.start_mp ?? "None" },
    { label: "End MP", value: closure.end_mp ?? "None" },
    { label: "Cone On Time", value: formatTime(closure.cone_on_time) },
    { label: "Cone Off Time", value: formatTime(closure.cone_off_time) },
    { label: "TM Install Time", value: formatTime(closure.tm_install_time) },
    { label: "TM Clear Time", value: formatTime(closure.tm_clear_time) },
    { label: "Briefing Time", value: formatTime(closure.briefing_time) },
    { label: "Welfare Location", value: closure.welfare_location || "None" },
    { label: "Nearest Hospital", value: closure.nearest_hospital || "None" },
    {
      label: "Status",
      value: (
        <span className={getStatusClass(closure.status)}>
          {closure.status || "None"}
        </span>
      ),
    },
    { label: "Notes", value: closure.notes || "None" },
  ];

  return (
    <div className="job-detail-page">
      <div className="detail-topbar">
        <Link to="/closures" className="back-link detail-back-link">
          ← Back to Closures
        </Link>

        <div className="detail-actions">
          <Link to={`/closures/${id}/edit`}>
            <button type="button" className="detail-btn detail-btn-secondary">
              Edit Closure
            </button>
          </Link>

          <Link to={`/closures/${id}/briefing`}>
            <button type="button" className="detail-btn">
              Generate Briefing
            </button>
          </Link>

          <button
            type="button"
            onClick={handleDelete}
            className="detail-btn detail-btn-danger"
          >
            Delete Closure
          </button>
        </div>
      </div>

      <h1 className="page-title">Closure Detail</h1>
      <p className="page-subtitle">View detailed information about this closure.</p>

      <div className="detail-divider" />

      <div className="detail-card detail-main-card">
        <div className="detail-grid-two">
          <div className="detail-column">
            {closureLeft.map((item) => (
              <div key={item.label} className="detail-row">
                <div className="detail-label">{item.label}</div>
                <div className="detail-value">{item.value}</div>
              </div>
            ))}
          </div>

          <div className="detail-column">
            {closureRight.map((item) => (
              <div key={item.label} className="detail-row">
                <div className="detail-label">{item.label}</div>
                <div className="detail-value">{item.value}</div>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="detail-card linked-card" style={{ marginBottom: "24px" }}>
        <div className="linked-card-header">
          <div className="linked-card-icon">⇄</div>
          <h2>Slip Roads</h2>
        </div>

        <div className="detail-divider subtle" />

        {slipRoads.length > 0 ? (
          <div className="slip-road-list">
            {slipRoads.map((slipRoad) => (
              <div key={slipRoad.id} className="slip-road-pill">
                {slipRoad.slip_road_name}
              </div>
            ))}
          </div>
        ) : (
          <div className="linked-note">No slip roads recorded for this closure.</div>
        )}
      </div>

      <div className="detail-card linked-card">
        <div className="linked-card-header">
          <div className="linked-card-icon">≡</div>
          <h2>Jobs in this Closure</h2>
        </div>

        <div className="detail-divider subtle" />

        <div className="table-wrapper">
          <table>
            <thead>
              <tr>
                <th>Job Number</th>
                <th>Work Order</th>
                <th>Activity</th>
                <th>Location</th>
                <th>Workstream</th>
                <th>Planned Date</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              {jobs.length > 0 ? (
                jobs.map((job) => (
                  <tr key={job.id}>
                    <td>
                      <Link to={`/jobs/${job.id}`}>{job.job_number}</Link>
                    </td>
                    <td>{job.work_order || ""}</td>
                    <td>{job.activity || job.title || ""}</td>
                    <td>{job.location || ""}</td>
                    <td>{job.workstream}</td>
                    <td>{formatDate(job.planned_date)}</td>
                    <td>
                      <span className={getStatusClass(job.status)}>
                        {job.status}
                      </span>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan="7">No jobs found for this closure.</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {deleteMessage && (
        <p className="form-message" style={{ color: "#9d2f2f" }}>
          {deleteMessage}
        </p>
      )}
    </div>
  );
}

export default ClosureDetail;