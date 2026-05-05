import { useEffect, useState } from "react";
import { useNavigate, useParams, Link } from "react-router-dom";
import api from "../services/api";
import { statusOptions } from "../constants/statusOptions";

function EditJob() {
  const { id } = useParams();
  const navigate = useNavigate();

  const [form, setForm] = useState({
    job_number: "",
    title: "",
    work_order: "",
    activity: "",
    location: "",
    description: "",
    activity_code: "",
    closure_id: "",
    workstream_id: "",
    start_mp: "",
    end_mp: "",
    status: "",
    planned_date: "",
    notes: "",
  });

  const [closures, setClosures] = useState([]);
  const [workstreams, setWorkstreams] = useState([]);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState("");

  useEffect(() => {
    loadPageData();
  }, [id]);

  const loadPageData = async () => {
    try {
      setLoading(true);
      setMessage("");

      const [jobRes, closuresRes, workstreamsRes] = await Promise.all([
        api.get(`/jobs/${id}`),
        api.get("/closures"),
        api.get("/workstreams"),
      ]);

      const job = jobRes.data;

      setForm({
        job_number: job.job_number || "",
        title: job.title || "",
        work_order: job.work_order || "",
        activity: job.activity || "",
        location: job.location || "",
        description: job.description || "",
        activity_code: job.activity_code || "",
        closure_id: job.closure_id || "",
        workstream_id: job.workstream_id || "",
        start_mp: job.start_mp || "",
        end_mp: job.end_mp || "",
        status: job.status || "Planned",
        planned_date: job.planned_date
          ? new Date(job.planned_date).toISOString().split("T")[0]
          : "",
        notes: job.notes || "",
      });

      setClosures(closuresRes.data || []);
      setWorkstreams(workstreamsRes.data || []);
    } catch (err) {
      console.error("Error loading edit job page:", err);
      setMessage("Failed to load job data.");
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (e) => {
    setForm({
      ...form,
      [e.target.name]: e.target.value,
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setMessage("");

    if (!form.job_number || !form.workstream_id || !form.planned_date) {
      setMessage("Please complete job number, workstream and planned date.");
      return;
    }

    try {
      await api.put(`/jobs/${id}`, {
        ...form,
        closure_id: form.closure_id || null,
      });

      setMessage("Job updated successfully.");

      setTimeout(() => {
        navigate(`/jobs/${id}`);
      }, 700);
    } catch (err) {
      console.error("Error updating job:", err);
      setMessage(err.response?.data?.error || "Failed to update job.");
    }
  };

  const formatDate = (dateString) => {
    if (!dateString) return "";
    return new Date(dateString).toLocaleDateString("en-GB");
  };

  if (loading) {
    return <p>Loading edit form...</p>;
  }

  return (
    <div className="job-detail-page">
      <div className="detail-topbar">
        <Link to={`/jobs/${id}`} className="back-link detail-back-link">
          ← Back to Job Detail
        </Link>

        <div className="detail-actions">
          <button
            type="button"
            className="detail-btn detail-btn-secondary"
            onClick={() => navigate(`/jobs/${id}`)}
          >
            Cancel
          </button>
        </div>
      </div>

      <h1 className="page-title">Edit Job</h1>
      <p className="page-subtitle">
        Update this job. A closure can be linked now or added later.
      </p>

      <div className="detail-divider" />

      <div className="detail-card detail-main-card">
        <form onSubmit={handleSubmit}>
          <div className="form-section-title">Core Information</div>

          <div className="detail-form-grid">
            <div className="form-group">
              <label>Job Number *</label>
              <input
                type="text"
                name="job_number"
                value={form.job_number}
                onChange={handleChange}
              />
            </div>

            <div className="form-group">
              <label>Work Order</label>
              <input
                type="text"
                name="work_order"
                value={form.work_order}
                onChange={handleChange}
              />
            </div>

            <div className="form-group">
              <label>Activity</label>
              <input
                type="text"
                name="activity"
                value={form.activity}
                onChange={handleChange}
              />
            </div>

            <div className="form-group">
              <label>Activity Code</label>
              <input
                type="text"
                name="activity_code"
                value={form.activity_code}
                onChange={handleChange}
              />
            </div>

            <div className="form-group full-span">
              <label>Location</label>
              <input
                type="text"
                name="location"
                value={form.location}
                onChange={handleChange}
              />
            </div>

            <div className="form-group">
              <label>Title</label>
              <input
                type="text"
                name="title"
                value={form.title}
                onChange={handleChange}
              />
            </div>

            <div className="form-group">
              <label>Workstream *</label>
              <select
                name="workstream_id"
                value={form.workstream_id}
                onChange={handleChange}
              >
                <option value="">Select a workstream</option>
                {workstreams.map((workstream) => (
                  <option key={workstream.id} value={workstream.id}>
                    {workstream.name}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="form-section-title">Planning</div>

          <div className="detail-form-grid">
            <div className="form-group">
              <label>Closure</label>
              <select
                name="closure_id"
                value={form.closure_id}
                onChange={handleChange}
              >
                <option value="">No closure assigned yet</option>
                {closures.map((closure) => (
                  <option key={closure.id} value={closure.id}>
                    {closure.closure_ref} - {formatDate(closure.closure_date)}
                  </option>
                ))}
              </select>
            </div>

            <div className="form-group">
              <label>Planned Date *</label>
              <input
                type="date"
                name="planned_date"
                value={form.planned_date}
                onChange={handleChange}
              />
            </div>

            <div className="form-group">
              <label>Start MP</label>
              <input
                type="number"
                step="0.01"
                name="start_mp"
                value={form.start_mp}
                onChange={handleChange}
              />
            </div>

            <div className="form-group">
              <label>End MP</label>
              <input
                type="number"
                step="0.01"
                name="end_mp"
                value={form.end_mp}
                onChange={handleChange}
              />
            </div>

            <div className="form-group">
              <label>Status</label>
              <select
                name="status"
                value={form.status}
                onChange={handleChange}
              >
                {statusOptions.map((status) => (
                  <option key={status} value={status}>
                    {status}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="form-section-title">Additional Details</div>

          <div className="detail-form-grid single-column">
            <div className="form-group">
              <label>Description</label>
              <textarea
                name="description"
                value={form.description}
                onChange={handleChange}
              />
            </div>

            <div className="form-group">
              <label>Notes</label>
              <textarea
                name="notes"
                value={form.notes}
                onChange={handleChange}
              />
            </div>
          </div>

          <div className="detail-form-actions">
            <button type="submit" className="detail-btn">
              Save Changes
            </button>

            <button
              type="button"
              className="detail-btn detail-btn-secondary"
              onClick={() => navigate(`/jobs/${id}`)}
            >
              Cancel
            </button>
          </div>

          {message && <p className="form-message">{message}</p>}
        </form>
      </div>
    </div>
  );
}

export default EditJob;