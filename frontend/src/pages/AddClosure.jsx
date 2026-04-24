import { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import api from "../services/api";
import { statusOptions } from "../constants/statusOptions";

function AddClosure() {
  const navigate = useNavigate();

  const [form, setForm] = useState({
    closure_ref: "",
    closure_date: "",
    carriageway: "",
    start_mp: "",
    end_mp: "",
    closure_type: "",
    status: "Planned",
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

  const [message, setMessage] = useState("");

  const handleChange = (e) => {
    setForm({
      ...form,
      [e.target.name]: e.target.value,
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

    if (!form.closure_ref || !form.closure_date) {
      setMessage("Please complete the required fields.");
      return;
    }

    try {
      const response = await api.post("/closures", form);
      const newId = response?.data?.id;
      setMessage("Closure created successfully.");

      if (newId) {
        setTimeout(() => {
          navigate(`/closures/${newId}`);
        }, 700);
      }
    } catch (err) {
      console.error(err);
      setMessage("Error creating closure.");
    }
  };

  return (
    <div className="job-detail-page">
      <div className="detail-topbar">
        <Link to="/closures" className="back-link detail-back-link">
          ← Back to Closures
        </Link>

        <div className="detail-actions">
          <button
            type="button"
            className="detail-btn detail-btn-secondary"
            onClick={() => navigate("/closures")}
          >
            Cancel
          </button>
        </div>
      </div>

      <h1 className="page-title">Add Closure</h1>
      <p className="page-subtitle">Create a new closure record.</p>

      <div className="detail-divider" />

      <div className="detail-card detail-main-card">
        <form onSubmit={handleSubmit}>
          <div className="form-section-title">Core Information</div>

          <div className="detail-form-grid">
            <div className="form-group">
              <label>Closure Ref *</label>
              <input type="text" name="closure_ref" value={form.closure_ref} onChange={handleChange} />
            </div>

            <div className="form-group">
              <label>Closure Date *</label>
              <input type="date" name="closure_date" value={form.closure_date} onChange={handleChange} />
            </div>

            <div className="form-group">
              <label>NEMS Number</label>
              <input type="text" name="nems_number" value={form.nems_number} onChange={handleChange} />
            </div>

            <div className="form-group">
              <label>Junctions Between</label>
              <input
                type="text"
                name="junctions_between"
                value={form.junctions_between}
                onChange={handleChange}
                placeholder="e.g. J10-J11"
              />
            </div>

            <div className="form-group">
              <label>Carriageway</label>
              <input type="text" name="carriageway" value={form.carriageway} onChange={handleChange} />
            </div>

            <div className="form-group">
              <label>Lane Configuration</label>
              <select name="lane_configuration" value={form.lane_configuration} onChange={handleChange}>
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
              <input type="text" name="closure_type" value={form.closure_type} onChange={handleChange} />
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
              <input type="number" step="0.01" name="start_mp" value={form.start_mp} onChange={handleChange} />
            </div>

            <div className="form-group">
              <label>End MP</label>
              <input type="number" step="0.01" name="end_mp" value={form.end_mp} onChange={handleChange} />
            </div>

            <div className="form-group">
              <label>Cone On Time</label>
              <input type="time" name="cone_on_time" value={form.cone_on_time} onChange={handleChange} />
            </div>

            <div className="form-group">
              <label>Cone Off Time</label>
              <input type="time" name="cone_off_time" value={form.cone_off_time} onChange={handleChange} />
            </div>

            <div className="form-group">
              <label>TM Install Time</label>
              <input type="time" name="tm_install_time" value={form.tm_install_time} onChange={handleChange} />
            </div>

            <div className="form-group">
              <label>TM Clear Time</label>
              <input type="time" name="tm_clear_time" value={form.tm_clear_time} onChange={handleChange} />
            </div>

            <div className="form-group">
              <label>Briefing Time</label>
              <input type="time" name="briefing_time" value={form.briefing_time} onChange={handleChange} />
            </div>

            <div className="form-group">
              <label>Depot</label>
              <input type="text" name="depot" value={form.depot} onChange={handleChange} />
            </div>
          </div>

          <div className="form-section-title">Operational Contacts</div>

          <div className="detail-form-grid">
            <div className="form-group">
              <label>Duty Manager</label>
              <input type="text" name="duty_manager" value={form.duty_manager} onChange={handleChange} />
            </div>

            <div className="form-group">
              <label>Night Supervisor</label>
              <input type="text" name="night_supervisor" value={form.night_supervisor} onChange={handleChange} />
            </div>

            <div className="form-group full-span">
              <label>Welfare Location</label>
              <input type="text" name="welfare_location" value={form.welfare_location} onChange={handleChange} />
            </div>

            <div className="form-group full-span">
              <label>Nearest Hospital</label>
              <input type="text" name="nearest_hospital" value={form.nearest_hospital} onChange={handleChange} />
            </div>
          </div>

          <div className="form-section-title">Slip Roads</div>

          <div className="detail-form-grid">
            {form.slip_roads.map((slipRoad, index) => (
              <div className="form-group" key={index}>
                <label>Slip Road {index + 1}</label>
                <input type="text" value={slipRoad} onChange={(e) => handleSlipRoadChange(index, e.target.value)} />
              </div>
            ))}
          </div>

          <div className="form-section-title">Additional Details</div>

          <div className="detail-form-grid single-column">
            <div className="form-group">
              <label>Notes</label>
              <textarea name="notes" value={form.notes} onChange={handleChange} />
            </div>
          </div>

          <div className="detail-form-actions">
            <button type="submit" className="detail-btn">Create Closure</button>

            <button
              type="button"
              className="detail-btn detail-btn-secondary"
              onClick={() => navigate("/closures")}
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

export default AddClosure;