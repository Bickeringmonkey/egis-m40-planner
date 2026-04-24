import { useEffect, useState } from "react";
import { useParams, Link, useNavigate } from "react-router-dom";
import api from "../services/api";

function JobDetail() {
  const { id } = useParams();
  const navigate = useNavigate();

  const [job, setJob] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [deleteMessage, setDeleteMessage] = useState("");

  useEffect(() => {
    fetchJobDetail();
  }, [id]);

  const fetchJobDetail = async () => {
    try {
      setLoading(true);
      setError("");
      const response = await api.get(`/jobs/${id}`);
      setJob(response.data);
    } catch (err) {
      console.error("Error fetching job details:", err);
      setError("Failed to load job details.");
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async () => {
    const confirmed = window.confirm(
      "Are you sure you want to delete this job? This cannot be undone."
    );

    if (!confirmed) return;

    try {
      await api.delete(`/jobs/${id}`);
      navigate("/jobs");
    } catch (err) {
      console.error("Error deleting job:", err);
      setDeleteMessage("Failed to delete job.");
    }
  };

  const formatDate = (dateString) => {
    if (!dateString) return "";
    return new Date(dateString).toLocaleDateString("en-GB");
  };

  const getStatusClass = (status) => {
    if (!status) return "status-badge";
    const clean = status.toLowerCase();
    if (clean === "planned") return "status-badge status-planned";
    if (clean === "complete") return "status-badge status-complete";
    if (clean === "cancelled") return "status-badge status-cancelled";
    return "status-badge";
  };

  const detailsLeft = [
    { label: "Job Number", value: job?.job_number || "None" },
    { label: "Work Order", value: job?.work_order || "None" },
    { label: "Activity", value: job?.activity || "None" },
    { label: "Activity Code", value: job?.activity_code || "None" },
    { label: "Location", value: job?.location || "None" },
    { label: "Title", value: job?.title || "None" },
  ];

  const detailsRight = [
    { label: "Description", value: job?.description || "None" },
    { label: "Workstream", value: job?.workstream || "None" },
    { label: "Planned Date", value: formatDate(job?.planned_date) || "None" },
    { label: "Start MP", value: job?.start_mp ?? "None" },
    { label: "End MP", value: job?.end_mp ?? "None" },
    {
      label: "Status",
      value: (
        <span className={getStatusClass(job?.status)}>
          {job?.status || "None"}
        </span>
      ),
    },
    { label: "Notes", value: job?.notes || "None" },
  ];

  if (loading) return <p>Loading job details...</p>;
  if (error) return <p>{error}</p>;
  if (!job) return <p>No job found.</p>;

  return (
    <div className="job-detail-page">
      <div className="detail-topbar">
        <Link to="/jobs" className="back-link detail-back-link">
          ← Back to Jobs
        </Link>

        <div className="detail-actions">
          <Link to={`/jobs/${id}/edit`}>
            <button type="button" className="detail-btn detail-btn-secondary">
              Edit Job
            </button>
          </Link>

          <button
            type="button"
            onClick={handleDelete}
            className="detail-btn detail-btn-danger"
          >
            Delete Job
          </button>
        </div>
      </div>

      <h1 className="page-title">Job Detail</h1>
      <p className="page-subtitle">View detailed information about this job.</p>

      <div className="detail-divider" />

      <div className="detail-card detail-main-card">
        <div className="detail-grid-two">
          <div className="detail-column">
            {detailsLeft.map((item) => (
              <div key={item.label} className="detail-row">
                <div className="detail-label">{item.label}</div>
                <div className="detail-value">{item.value}</div>
              </div>
            ))}
          </div>

          <div className="detail-column">
            {detailsRight.map((item) => (
              <div key={item.label} className="detail-row">
                <div className="detail-label">{item.label}</div>
                <div className="detail-value">{item.value}</div>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="detail-card linked-card">
        <div className="linked-card-header">
          <div className="linked-card-icon">↗</div>
          <h2>Linked Closure</h2>
        </div>

        <div className="detail-divider subtle" />

        <div className="linked-grid">
          <div className="linked-item">
            <div className="linked-label">Closure Ref</div>
            <div className="linked-value">
              {job.closure_id ? (
                <Link to={`/closures/${job.closure_id}`}>{job.closure_ref}</Link>
              ) : (
                "None"
              )}
            </div>
          </div>

          <div className="linked-item">
            <div className="linked-label">Closure Date</div>
            <div className="linked-value">{formatDate(job.closure_date) || "None"}</div>
          </div>

          <div className="linked-item">
            <div className="linked-label">Carriageway</div>
            <div className="linked-value">{job.carriageway || "None"}</div>
          </div>
        </div>

        <div className="linked-note">
          This job is linked to the closure above.
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

export default JobDetail;