import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import api from "../services/api";

function VrsBooking() {
  const navigate = useNavigate();

  const [workstreams, setWorkstreams] = useState([]);
  const [message, setMessage] = useState("");

  const [jobForm, setJobForm] = useState({
    job_number: "",
    title: "VRS Barrier Repair",
    work_order: "",
    activity: "VRS",
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

  const [vrsForm, setVrsForm] = useState({
    category: "",
    incident_number: "",
    date_in: "",
    programmed_date: "",
    repair_date: "",
    run_over_date: "",
    marker_post: "",
    carriageway_side: "",
    closure_type: "",
    number_of_ops: "",
    estimated_duration: "",
    posts_required: "",
    beams_required: "",
    components_required: "",
    diagnosis_required: false,
    diagnosis_complete: false,
    concrete_required: false,
    coring_required: false,
    push_test_required: false,
    excavation_required: false,
    cat_scan_required: false,
    permit_to_dig_required: false,
    cold_patch_required: false,
    amm12_score: "",
    nc_required: false,
    comments: "",
    notes: "",
  });

  useEffect(() => {
    loadWorkstreams();
  }, []);

  const loadWorkstreams = async () => {
    try {
      const res = await api.get("/workstreams");
      setWorkstreams(res.data || []);
    } catch (err) {
      console.error(err);
      setMessage("Failed to load workstreams.");
    }
  };

  const vrsWorkstream = useMemo(() => {
    return workstreams.find((w) =>
      String(w.name || "").toLowerCase().includes("vrs")
    );
  }, [workstreams]);

  useEffect(() => {
    if (vrsWorkstream && !jobForm.workstream_id) {
      setJobForm((prev) => ({
        ...prev,
        workstream_id: vrsWorkstream.id,
      }));
    }
  }, [vrsWorkstream]);

  const handleJobChange = (e) => {
    setJobForm({
      ...jobForm,
      [e.target.name]: e.target.value,
    });
  };

  const handleVrsChange = (e) => {
    const { name, value, type, checked } = e.target;

    setVrsForm({
      ...vrsForm,
      [name]: type === "checkbox" ? checked : value,
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setMessage("");

    if (!jobForm.job_number || !jobForm.workstream_id || !jobForm.planned_date) {
      setMessage("Job number, workstream and planned date are required.");
      return;
    }

    try {
      const jobRes = await api.post("/jobs", {
        ...jobForm,
        closure_id: null,
      });

      const jobId = jobRes.data?.id;

      await api.post(`/jobs/${jobId}/vrs`, {
        ...vrsForm,
        number_of_ops: vrsForm.number_of_ops || null,
        amm12_score: vrsForm.amm12_score || null,
      });

      navigate("/jobs/vrs-report");
    } catch (err) {
      console.error(err);
      setMessage(err.response?.data?.error || "Failed to create VRS job.");
    }
  };

  const checkItems = [
    ["diagnosis_required", "Diagnosis Required"],
    ["diagnosis_complete", "Diagnosis Complete"],
    ["concrete_required", "Concrete"],
    ["coring_required", "Coring"],
    ["push_test_required", "Push Test"],
    ["excavation_required", "Excavation"],
    ["cat_scan_required", "CAT Scan"],
    ["permit_to_dig_required", "Permit to Dig"],
    ["cold_patch_required", "Cold Patch"],
    ["nc_required", "NC Required"],
  ];

  return (
    <div>
      <div className="list-page-header">
        <div>
          <h1 className="page-title">Add Barrier Job</h1>
          <p className="page-subtitle">
            Create a VRS/barrier job without needing a closure straight away.
          </p>
        </div>

        <Link to="/jobs/vrs-report" className="detail-btn detail-btn-secondary">
          Back to VRS Report
        </Link>
      </div>

      <div className="form-card">
        <form onSubmit={handleSubmit}>
          <div className="form-section-title">Job Details</div>

          <div className="form-grid">
            <div className="form-group">
              <label>Job Number *</label>
              <input name="job_number" value={jobForm.job_number} onChange={handleJobChange} />
            </div>

            <div className="form-group">
              <label>Work Order</label>
              <input name="work_order" value={jobForm.work_order} onChange={handleJobChange} />
            </div>

            <div className="form-group">
              <label>Planned Date *</label>
              <input type="date" name="planned_date" value={jobForm.planned_date} onChange={handleJobChange} />
            </div>

            <div className="form-group">
              <label>Workstream *</label>
              <select name="workstream_id" value={jobForm.workstream_id} onChange={handleJobChange}>
                <option value="">Select workstream</option>
                {workstreams.map((w) => (
                  <option key={w.id} value={w.id}>{w.name}</option>
                ))}
              </select>
            </div>

            <div className="form-group full-width">
              <label>Location</label>
              <input name="location" value={jobForm.location} onChange={handleJobChange} />
            </div>

            <div className="form-group">
              <label>Start MP</label>
              <input type="number" step="0.01" name="start_mp" value={jobForm.start_mp} onChange={handleJobChange} />
            </div>

            <div className="form-group">
              <label>End MP</label>
              <input type="number" step="0.01" name="end_mp" value={jobForm.end_mp} onChange={handleJobChange} />
            </div>

            <div className="form-group full-width">
              <label>Description</label>
              <textarea name="description" value={jobForm.description} onChange={handleJobChange} />
            </div>
          </div>

          <div className="form-section-title">VRS Dates</div>

          <div className="form-grid">
            <div className="form-group">
              <label>Date In</label>
              <input type="date" name="date_in" value={vrsForm.date_in} onChange={handleVrsChange} />
            </div>

            <div className="form-group">
              <label>Programmed Date</label>
              <input type="date" name="programmed_date" value={vrsForm.programmed_date} onChange={handleVrsChange} />
            </div>

            <div className="form-group">
              <label>Repair Date</label>
              <input type="date" name="repair_date" value={vrsForm.repair_date} onChange={handleVrsChange} />
            </div>

            <div className="form-group">
              <label>Run Over Date</label>
              <input type="date" name="run_over_date" value={vrsForm.run_over_date} onChange={handleVrsChange} />
            </div>
          </div>

          <div className="form-section-title">VRS Repair Details</div>

          <div className="form-grid">
            <div className="form-group">
              <label>Category</label>
              <select name="category" value={vrsForm.category} onChange={handleVrsChange}>
                <option value="">Select category</option>
                <option value="CAT 1">CAT 1</option>
                <option value="CAT 2.1">CAT 2.1</option>
                <option value="CAT 2.2">CAT 2.2</option>
                <option value="CAT 2.3">CAT 2.3</option>
                <option value="NFA">NFA</option>
              </select>
            </div>

            <div className="form-group">
              <label>Incident Number</label>
              <input name="incident_number" value={vrsForm.incident_number} onChange={handleVrsChange} />
            </div>

            <div className="form-group">
              <label>Marker Post</label>
              <input name="marker_post" value={vrsForm.marker_post} onChange={handleVrsChange} />
            </div>

            <div className="form-group">
              <label>A / B</label>
              <select name="carriageway_side" value={vrsForm.carriageway_side} onChange={handleVrsChange}>
                <option value="">Select</option>
                <option value="A">A</option>
                <option value="B">B</option>
                <option value="Both">Both</option>
              </select>
            </div>

            <div className="form-group">
              <label>Closure Type Required</label>
              <input name="closure_type" value={vrsForm.closure_type} onChange={handleVrsChange} />
            </div>

            <div className="form-group">
              <label>No. of Ops</label>
              <input type="number" name="number_of_ops" value={vrsForm.number_of_ops} onChange={handleVrsChange} />
            </div>

            <div className="form-group">
              <label>Estimated Duration</label>
              <input name="estimated_duration" value={vrsForm.estimated_duration} onChange={handleVrsChange} />
            </div>

            <div className="form-group">
              <label>AMM12 Score</label>
              <input type="number" name="amm12_score" value={vrsForm.amm12_score} onChange={handleVrsChange} />
            </div>

            <div className="form-group full-width">
              <label>Posts Required</label>
              <textarea name="posts_required" value={vrsForm.posts_required} onChange={handleVrsChange} />
            </div>

            <div className="form-group full-width">
              <label>Beams Required</label>
              <textarea name="beams_required" value={vrsForm.beams_required} onChange={handleVrsChange} />
            </div>

            <div className="form-group full-width">
              <label>Components Required</label>
              <textarea name="components_required" value={vrsForm.components_required} onChange={handleVrsChange} />
            </div>
          </div>

          <div className="vrs-checklist-panel full-width">
            <div className="vrs-checklist-header">
              <h3>VRS Requirements Checklist</h3>
              <p>Tick what is required from the diagnosis sheet.</p>
            </div>

            <div className="vrs-checklist-grid">
              {checkItems.map(([name, label]) => (
                <label key={name} className="vrs-check-card">
                  <input
                    type="checkbox"
                    name={name}
                    checked={vrsForm[name]}
                    onChange={handleVrsChange}
                  />
                  <span>{label}</span>
                </label>
              ))}
            </div>
          </div>

          <div className="form-grid" style={{ marginTop: "18px" }}>
            <div className="form-group full-width">
              <label>Comments</label>
              <textarea name="comments" value={vrsForm.comments} onChange={handleVrsChange} />
            </div>

            <div className="form-group full-width">
              <label>Notes</label>
              <textarea name="notes" value={vrsForm.notes} onChange={handleVrsChange} />
            </div>
          </div>

          <div style={{ marginTop: "20px" }}>
            <button type="submit">Create Barrier Job</button>
          </div>

          {message && <p className="form-message">{message}</p>}
        </form>
      </div>
    </div>
  );
}

export default VrsBooking;