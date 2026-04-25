import { useEffect, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import api from "../services/api";
import { statusOptions } from "../constants/statusOptions";

function EditClosure() {
  const { id } = useParams();
  const navigate = useNavigate();

  const [form, setForm] = useState({
    closure_ref: "",
    closure_date: "",
    start_date: "",
    end_date: "",
    carriageway: "",
    start_mp: "",
    end_mp: "",
    closure_type: "",
    status: "",
    notes: "",
    nems_number: "",
    junctions_between: "",
    lane_configuration: "",
    cone_on_time: "",
    cone_off_time: "",
    briefing_time: "",
    duty_manager: "",
    night_supervisor: "",
    depot: "",
    welfare_location: "",
    nearest_hospital: "",
    tm_install_time: "",
    tm_clear_time: "",
    slip_roads: ["", "", "", "", "", ""],
  });

  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState("");

  useEffect(() => {
    loadClosure();
  }, [id]);

  const toInputDate = (value) => {
    if (!value) return "";
    return new Date(value).toISOString().split("T")[0];
  };

  const loadClosure = async () => {
    try {
      setLoading(true);
      setMessage("");

      const response = await api.get(`/closures/${id}`);
      const closure = response.data.closure;
      const slipRoads = response.data.slip_roads || [];

      const slipRoadNames = slipRoads.map((sr) => sr.slip_road_name);
      while (slipRoadNames.length < 6) slipRoadNames.push("");

      const closureDate = toInputDate(closure.closure_date);
      const startDate = toInputDate(closure.start_date || closure.closure_date);
      const endDate = toInputDate(closure.end_date || closure.start_date || closure.closure_date);

      setForm({
        closure_ref: closure.closure_ref || "",
        closure_date: closureDate || startDate,
        start_date: startDate,
        end_date: endDate,
        carriageway: closure.carriageway || "",
        start_mp: closure.start_mp || "",
        end_mp: closure.end_mp || "",
        closure_type: closure.closure_type || "",
        status: closure.status || "Planned",
        notes: closure.notes || "",
        nems_number: closure.nems_number || "",
        junctions_between: closure.junctions_between || "",
        lane_configuration: closure.lane_configuration || "",
        cone_on_time: closure.cone_on_time ? closure.cone_on_time.slice(0, 5) : "",
        cone_off_time: closure.cone_off_time ? closure.cone_off_time.slice(0, 5) : "",
        briefing_time: closure.briefing_time ? closure.briefing_time.slice(0, 5) : "",
        duty_manager: closure.duty_manager || "",
        night_supervisor: closure.night_supervisor || "",
        depot: closure.depot || "",
        welfare_location: closure.welfare_location || "",
        nearest_hospital: closure.nearest_hospital || "",
        tm_install_time: closure.tm_install_time ? closure.tm_install_time.slice(0, 5) : "",
        tm_clear_time: closure.tm_clear_time ? closure.tm_clear_time.slice(0, 5) : "",
        slip_roads: slipRoadNames.slice(0, 6),
      });
    } catch (err) {
      console.error("Error loading closure:", err);
      setMessage("Failed to load closure.");
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (e) => {
    const { name, value } = e.target;

    setForm((prev) => {
      const updated = {
        ...prev,
        [name]: value,
      };

      if (name === "start_date" && !prev.closure_date) {
        updated.closure_date = value;
      }

      if (name === "start_date" && !prev.end_date) {
        updated.end_date = value;
      }

      return updated;
    });
  };

  const handleSlipRoadChange = (index, value) => {
    const updatedSlipRoads = [...form.slip_roads];
    updatedSlipRoads[index] = value;

    setForm({
      ...form,
      slip_roads: updatedSlipRoads,
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setMessage("");

    const payload = {
      ...form,
      closure_date: form.closure_date || form.start_date,
      start_date: form.start_date || form.closure_date,
      end_date: form.end_date || form.start_date || form.closure_date,
    };

    if (!payload.closure_ref || !payload.start_date || !payload.end_date) {
      setMessage("Please complete the closure ref, start date and end date.");
      return;
    }

    if (payload.end_date < payload.start_date) {
      setMessage("End date cannot be before start date.");
      return;
    }

    try {
      await api.put(`/closures/${id}`, payload);
      setMessage("Closure updated successfully.");
      setTimeout(() => navigate(`/closures/${id}`), 700);
    } catch (err) {
      console.error("Error updating closure:", err);
      setMessage("Failed to update closure.");
    }
  };

  if (loading) return <p>Loading edit form...</p>;

  return (
    <div className="job-detail-page">
      <div className="detail-topbar">
        <Link to={`/closures/${id}`} className="back-link detail-back-link">
          ← Back to Closure Detail
        </Link>

        <div className="detail-actions">
          <button
            type="button"
            className="detail-btn detail-btn-secondary"
            onClick={() => navigate(`/closures/${id}`)}
          >
            Cancel
          </button>
        </div>
      </div>

      <h1 className="page-title">Edit Closure</h1>
      <p className="page-subtitle">Update the details for this closure.</p>

      <div className="detail-divider" />

      <div className="detail-card detail-main-card">
        <form onSubmit={handleSubmit}>
          <div className="form-section-title">Core Information</div>

          <div className="detail-form-grid">
            <div className="form-group">
              <label>Closure Ref *</label>
              <input
                type="text"
                name="closure_ref"
                value={form.closure_ref}
                onChange={handleChange}
              />
            </div>

            <div className="form-group">
              <label>Start Date *</label>
              <input
                type="date"
                name="start_date"
                value={form.start_date}
                onChange={handleChange}
              />
            </div>

            <div className="form-group">
              <label>End Date *</label>
              <input
                type="date"
                name="end_date"
                value={form.end_date}
                onChange={handleChange}
              />
            </div>

            <div className="form-group">
              <label>Primary Closure Date</label>
              <input
                type="date"
                name="closure_date"
                value={form.closure_date}
                onChange={handleChange}
              />
            </div>

            <div className="form-group">
              <label>NEMS Number</label>
              <input
                type="text"
                name="nems_number"
                value={form.nems_number}
                onChange={handleChange}
              />
            </div>

            <div className="form-group">
              <label>Junctions Between</label>
              <input
                type="text"
                name="junctions_between"
                value={form.junctions_between}
                onChange={handleChange}
              />
            </div>

            <div className="form-group">
              <label>Carriageway</label>
              <input
                type="text"
                name="carriageway"
                value={form.carriageway}
                onChange={handleChange}
              />
            </div>

            <div className="form-group">
              <label>Lane Configuration</label>
              <select
                name="lane_configuration"
                value={form.lane_configuration}
                onChange={handleChange}
              >
                <option value="">Select lane</option>
                <option value="L1">L1</option>
                <option value="L1/2">L1/2</option>
                <option value="L2">L2</option>
                <option value="L3/2">L3/2</option>
                <option value="L3">L3</option>
                <option value="L4/3">L4/3</option>
                <option value="L4">L4</option>
                <option value="HS">HS</option>
              </select>
            </div>

            <div className="form-group">
              <label>Closure Type</label>
              <input
                type="text"
                name="closure_type"
                value={form.closure_type}
                onChange={handleChange}
              />
            </div>

            <div className="form-group">
              <label>Status</label>
              <select name="status" value={form.status} onChange={handleChange}>
                {statusOptions.map((status) => (
                  <option key={status} value={status}>
                    {status}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="form-section-title">Location & Timings</div>

          <div className="detail-form-grid">
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
              <label>Cone On Time</label>
              <input
                type="time"
                name="cone_on_time"
                value={form.cone_on_time}
                onChange={handleChange}
              />
            </div>

            <div className="form-group">
              <label>Cone Off Time</label>
              <input
                type="time"
                name="cone_off_time"
                value={form.cone_off_time}
                onChange={handleChange}
              />
            </div>

            <div className="form-group">
              <label>TM Install Time</label>
              <input
                type="time"
                name="tm_install_time"
                value={form.tm_install_time}
                onChange={handleChange}
              />
            </div>

            <div className="form-group">
              <label>TM Clear Time</label>
              <input
                type="time"
                name="tm_clear_time"
                value={form.tm_clear_time}
                onChange={handleChange}
              />
            </div>

            <div className="form-group">
              <label>Briefing Time</label>
              <input
                type="time"
                name="briefing_time"
                value={form.briefing_time}
                onChange={handleChange}
              />
            </div>

            <div className="form-group">
              <label>Depot</label>
              <input
                type="text"
                name="depot"
                value={form.depot}
                onChange={handleChange}
              />
            </div>
          </div>

          <div className="form-section-title">Operational Contacts</div>

          <div className="detail-form-grid">
            <div className="form-group">
              <label>Duty Manager</label>
              <input
                type="text"
                name="duty_manager"
                value={form.duty_manager}
                onChange={handleChange}
              />
            </div>

            <div className="form-group">
              <label>Night Supervisor</label>
              <input
                type="text"
                name="night_supervisor"
                value={form.night_supervisor}
                onChange={handleChange}
              />
            </div>

            <div className="form-group full-span">
              <label>Welfare Location</label>
              <input
                type="text"
                name="welfare_location"
                value={form.welfare_location}
                onChange={handleChange}
              />
            </div>

            <div className="form-group full-span">
              <label>Nearest Hospital</label>
              <input
                type="text"
                name="nearest_hospital"
                value={form.nearest_hospital}
                onChange={handleChange}
              />
            </div>
          </div>

          <div className="form-section-title">Slip Roads</div>

          <div className="detail-form-grid">
            {form.slip_roads.map((slipRoad, index) => (
              <div className="form-group" key={index}>
                <label>Slip Road {index + 1}</label>
                <input
                  type="text"
                  value={slipRoad}
                  onChange={(e) =>
                    handleSlipRoadChange(index, e.target.value)
                  }
                />
              </div>
            ))}
          </div>

          <div className="form-section-title">Additional Details</div>

          <div className="detail-form-grid single-column">
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
              onClick={() => navigate(`/closures/${id}`)}
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

export default EditClosure;