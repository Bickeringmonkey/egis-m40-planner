import { useEffect, useState } from "react";
import api from "../services/api";
import { statusOptions } from "../constants/statusOptions";

function AddJob() {
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
    status: "Planned",
    planned_date: "",
    notes: "",
  });

  const [closures, setClosures] = useState([]);
  const [workstreams, setWorkstreams] = useState([]);
  const [message, setMessage] = useState("");
  const [messageType, setMessageType] = useState("");

  useEffect(() => {
    fetchClosures();
    fetchWorkstreams();
  }, []);

  const fetchClosures = async () => {
    try {
      const response = await api.get("/closures");
      setClosures(response.data);
    } catch (err) {
      console.error("Error loading closures:", err);
      setMessage("Failed to load closures.");
      setMessageType("error");
    }
  };

  const fetchWorkstreams = async () => {
    try {
      const response = await api.get("/workstreams");
      setWorkstreams(response.data);
    } catch (err) {
      console.error("Error loading workstreams:", err);
      setMessage("Failed to load workstreams.");
      setMessageType("error");
    }
  };

  const handleChange = (e) => {
    setForm({
      ...form,
      [e.target.name]: e.target.value,
    });
  };

  const resetForm = () => {
    setForm({
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
      status: "Planned",
      planned_date: "",
      notes: "",
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setMessage("");
    setMessageType("");

    if (
      !form.job_number.trim() ||
      !form.closure_id ||
      !form.workstream_id ||
      !form.planned_date
    ) {
      setMessage("Please complete all required fields.");
      setMessageType("error");
      return;
    }

    try {
      await api.post("/jobs", form);
      setMessage("Job created successfully.");
      setMessageType("success");
      resetForm();
    } catch (err) {
      console.error("Error creating job:", err);
      setMessage("Error creating job.");
      setMessageType("error");
    }
  };

  const formatDate = (dateString) => {
    if (!dateString) return "";
    return new Date(dateString).toLocaleDateString("en-GB");
  };

  return (
    <div>
      <h1 className="page-title">Add Job</h1>
      <p className="page-subtitle">Create a new job and assign it to a closure.</p>

      <div className="form-card">
        <form onSubmit={handleSubmit}>
          <div className="form-grid">
            <div className="form-group">
              <label htmlFor="job_number">Job Number *</label>
              <input
                id="job_number"
                type="text"
                name="job_number"
                value={form.job_number}
                onChange={handleChange}
              />
            </div>

            <div className="form-group">
              <label htmlFor="work_order">Work Order</label>
              <input
                id="work_order"
                type="text"
                name="work_order"
                value={form.work_order}
                onChange={handleChange}
              />
            </div>

            <div className="form-group">
              <label htmlFor="activity">Activity</label>
              <input
                id="activity"
                type="text"
                name="activity"
                value={form.activity}
                onChange={handleChange}
              />
            </div>

            <div className="form-group">
              <label htmlFor="activity_code">Activity Code</label>
              <input
                id="activity_code"
                type="text"
                name="activity_code"
                value={form.activity_code}
                onChange={handleChange}
              />
            </div>

            <div className="form-group full-width">
              <label htmlFor="location">Location</label>
              <input
                id="location"
                type="text"
                name="location"
                value={form.location}
                onChange={handleChange}
              />
            </div>

            <div className="form-group">
              <label htmlFor="title">Title</label>
              <input
                id="title"
                type="text"
                name="title"
                value={form.title}
                onChange={handleChange}
              />
            </div>

            <div className="form-group">
              <label htmlFor="closure_id">Closure *</label>
              <select
                id="closure_id"
                name="closure_id"
                value={form.closure_id}
                onChange={handleChange}
              >
                <option value="">Select a closure</option>
                {closures.map((closure) => (
                  <option key={closure.id} value={closure.id}>
                    {closure.closure_ref} - {formatDate(closure.closure_date)}
                  </option>
                ))}
              </select>
            </div>

            <div className="form-group">
              <label htmlFor="workstream_id">Workstream *</label>
              <select
                id="workstream_id"
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

            <div className="form-group">
              <label htmlFor="start_mp">Start MP</label>
              <input
                id="start_mp"
                type="number"
                step="0.01"
                name="start_mp"
                value={form.start_mp}
                onChange={handleChange}
              />
            </div>

            <div className="form-group">
              <label htmlFor="end_mp">End MP</label>
              <input
                id="end_mp"
                type="number"
                step="0.01"
                name="end_mp"
                value={form.end_mp}
                onChange={handleChange}
              />
            </div>

            <div className="form-group">
              <label htmlFor="status">Status</label>
              <select
                id="status"
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

            <div className="form-group">
              <label htmlFor="planned_date">Planned Date *</label>
              <input
                id="planned_date"
                type="date"
                name="planned_date"
                value={form.planned_date}
                onChange={handleChange}
              />
            </div>

            <div className="form-group full-width">
              <label htmlFor="description">Description</label>
              <textarea
                id="description"
                name="description"
                value={form.description}
                onChange={handleChange}
              />
            </div>

            <div className="form-group full-width">
              <label htmlFor="notes">Notes</label>
              <textarea
                id="notes"
                name="notes"
                value={form.notes}
                onChange={handleChange}
              />
            </div>
          </div>

          <div style={{ marginTop: "20px" }}>
            <button type="submit">Create Job</button>
          </div>

          {message && (
            <p
              className="form-message"
              style={{
                color: messageType === "error" ? "#9d2f2f" : "#5a6f14",
              }}
            >
              {message}
            </p>
          )}
        </form>
      </div>
    </div>
  );
}

export default AddJob;