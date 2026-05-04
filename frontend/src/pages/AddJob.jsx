import { useEffect, useMemo, useState } from "react";
import api from "../services/api";
import { statusOptions } from "../constants/statusOptions";

function AddJob() {
  const emptyForm = {
    job_number: "",
    title: "",
    work_order: "",
    activity: "",
    location: "",
    description: "",
    activity_code: "",
    closure_id: "",
    workstream_id: "",
    subcontractor_id: "",
    subcontractor_contact_id: "",
    start_mp: "",
    end_mp: "",
    status: "Planned",
    planned_date: "",
    notes: "",
  };

  const emptyVrsForm = {
    category: "",
    incident_number: "",
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
  };

  const [form, setForm] = useState(emptyForm);
  const [vrsForm, setVrsForm] = useState(emptyVrsForm);

  const [closures, setClosures] = useState([]);
  const [workstreams, setWorkstreams] = useState([]);
  const [subcontractors, setSubcontractors] = useState([]);
  const [contacts, setContacts] = useState([]);

  const [message, setMessage] = useState("");
  const [messageType, setMessageType] = useState("");

  useEffect(() => {
    fetchClosures();
    fetchWorkstreams();
    fetchSubcontractors();
  }, []);

  const selectedWorkstream = useMemo(
    () => workstreams.find((w) => String(w.id) === String(form.workstream_id)),
    [workstreams, form.workstream_id]
  );

  const isVrsJob = String(selectedWorkstream?.name || "")
    .toLowerCase()
    .includes("vrs");

  const fetchClosures = async () => {
    try {
      const response = await api.get("/closures");
      setClosures(response.data || []);
    } catch (err) {
      console.error("Error loading closures:", err);
      setMessage("Failed to load closures.");
      setMessageType("error");
    }
  };

  const fetchWorkstreams = async () => {
    try {
      const response = await api.get("/workstreams");
      setWorkstreams(response.data || []);
    } catch (err) {
      console.error("Error loading workstreams:", err);
      setMessage("Failed to load workstreams.");
      setMessageType("error");
    }
  };

  const fetchSubcontractors = async () => {
    try {
      const response = await api.get("/subcontractors");
      setSubcontractors(response.data || []);
    } catch (err) {
      console.error("Error loading subcontractors:", err);
      setMessage("Failed to load subcontractors.");
      setMessageType("error");
    }
  };

  const fetchContacts = async (subcontractorId) => {
    if (!subcontractorId) {
      setContacts([]);
      return;
    }

    try {
      const response = await api.get(`/subcontractors/${subcontractorId}/contacts`);
      setContacts(response.data || []);
    } catch (err) {
      console.error("Error loading subcontractor contacts:", err);
      setContacts([]);
      setMessage("Failed to load subcontractor contacts.");
      setMessageType("error");
    }
  };

  const activeSubcontractors = useMemo(
    () => subcontractors.filter((sub) => Number(sub.is_active) === 1),
    [subcontractors]
  );

  const activeContacts = useMemo(
    () => contacts.filter((contact) => Number(contact.is_active) === 1),
    [contacts]
  );

  const handleChange = (e) => {
    const { name, value } = e.target;

    if (name === "subcontractor_id") {
      setForm((prev) => ({
        ...prev,
        subcontractor_id: value,
        subcontractor_contact_id: "",
      }));

      fetchContacts(value);
      return;
    }

    setForm((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  const handleVrsChange = (e) => {
    const { name, value, type, checked } = e.target;

    setVrsForm((prev) => ({
      ...prev,
      [name]: type === "checkbox" ? checked : value,
    }));
  };

  const resetForm = () => {
    setForm(emptyForm);
    setVrsForm(emptyVrsForm);
    setContacts([]);
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
      const jobRes = await api.post("/jobs", {
        ...form,
        subcontractor_id: form.subcontractor_id || null,
        subcontractor_contact_id: form.subcontractor_contact_id || null,
      });

      const jobId = jobRes.data?.id;

      if (isVrsJob && jobId) {
        await api.post(`/jobs/${jobId}/vrs`, {
          ...vrsForm,
          number_of_ops: vrsForm.number_of_ops || null,
          amm12_score: vrsForm.amm12_score || null,
        });
      }

      setMessage(
        isVrsJob
          ? "VRS job created successfully."
          : "Job created successfully."
      );
      setMessageType("success");
      resetForm();
    } catch (err) {
      console.error("Error creating job:", err);
      setMessage(err.response?.data?.error || "Error creating job.");
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
              <label htmlFor="subcontractor_id">Subcontractor</label>
              <select
                id="subcontractor_id"
                name="subcontractor_id"
                value={form.subcontractor_id}
                onChange={handleChange}
              >
                <option value="">No subcontractor</option>
                {activeSubcontractors.map((subcontractor) => (
                  <option key={subcontractor.id} value={subcontractor.id}>
                    {subcontractor.company_name}
                  </option>
                ))}
              </select>
            </div>

            <div className="form-group">
              <label htmlFor="subcontractor_contact_id">Subcontractor Contact</label>
              <select
                id="subcontractor_contact_id"
                name="subcontractor_contact_id"
                value={form.subcontractor_contact_id}
                onChange={handleChange}
                disabled={!form.subcontractor_id}
              >
                <option value="">
                  {form.subcontractor_id ? "Select a contact" : "Select subcontractor first"}
                </option>
                {activeContacts.map((contact) => (
                  <option key={contact.id} value={contact.id}>
                    {contact.contact_name}
                    {contact.phone ? ` - ${contact.phone}` : ""}
                    {contact.is_primary ? " (Primary)" : ""}
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

          {isVrsJob && (
            <div className="vrs-form-section">
              <h2>VRS Details</h2>
              <p>
                Complete the VRS repair requirements from the diagnosis sheet.
              </p>

              <div className="form-grid">
                <div className="form-group">
                  <label>Category</label>
                  <select
                    name="category"
                    value={vrsForm.category}
                    onChange={handleVrsChange}
                  >
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
                  <input
                    type="text"
                    name="incident_number"
                    value={vrsForm.incident_number}
                    onChange={handleVrsChange}
                  />
                </div>

                <div className="form-group">
                  <label>Marker Post</label>
                  <input
                    type="text"
                    name="marker_post"
                    value={vrsForm.marker_post}
                    onChange={handleVrsChange}
                    placeholder="Example: 102/3"
                  />
                </div>

                <div className="form-group">
                  <label>A or B</label>
                  <select
                    name="carriageway_side"
                    value={vrsForm.carriageway_side}
                    onChange={handleVrsChange}
                  >
                    <option value="">Select</option>
                    <option value="A">A</option>
                    <option value="B">B</option>
                    <option value="Both">Both</option>
                  </select>
                </div>

                <div className="form-group">
                  <label>Closure Type</label>
                  <input
                    type="text"
                    name="closure_type"
                    value={vrsForm.closure_type}
                    onChange={handleVrsChange}
                    placeholder="Example: L3/2 A L3 B"
                  />
                </div>

                <div className="form-group">
                  <label>No. of Ops</label>
                  <input
                    type="number"
                    name="number_of_ops"
                    value={vrsForm.number_of_ops}
                    onChange={handleVrsChange}
                  />
                </div>

                <div className="form-group">
                  <label>Estimated Duration</label>
                  <input
                    type="text"
                    name="estimated_duration"
                    value={vrsForm.estimated_duration}
                    onChange={handleVrsChange}
                    placeholder="Example: 2-3 hours"
                  />
                </div>

                <div className="form-group">
                  <label>AMM12 Score</label>
                  <input
                    type="number"
                    name="amm12_score"
                    value={vrsForm.amm12_score}
                    onChange={handleVrsChange}
                  />
                </div>

                <div className="form-group full-width">
                  <label>Posts Required</label>
                  <textarea
                    name="posts_required"
                    value={vrsForm.posts_required}
                    onChange={handleVrsChange}
                    placeholder="Example: 12x TCB, 8x CR Long, 4x New Spec"
                  />
                </div>

                <div className="form-group full-width">
                  <label>Beams Required</label>
                  <textarea
                    name="beams_required"
                    value={vrsForm.beams_required}
                    onChange={handleVrsChange}
                  />
                </div>

                <div className="form-group full-width">
                  <label>Other Components Required</label>
                  <textarea
                    name="components_required"
                    value={vrsForm.components_required}
                    onChange={handleVrsChange}
                  />
                </div>

                <div className="vrs-checklist-panel full-width">
  <div className="vrs-checklist-header">
    <h3>VRS Requirements Checklist</h3>
    <p>Tick what is required from the diagnosis sheet.</p>
  </div>

  <div className="vrs-checklist-section">
    <h4>Diagnosis Status</h4>

    <div className="vrs-checklist-grid">
      {[
        ["diagnosis_required", "Diagnosis Required"],
        ["diagnosis_complete", "Diagnosis Complete"],
      ].map(([name, label]) => (
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

  <div className="vrs-checklist-section">
    <h4>Repair Requirements</h4>

    <div className="vrs-checklist-grid">
      {[
        ["concrete_required", "Concrete"],
        ["coring_required", "Coring"],
        ["push_test_required", "Push Test"],
        ["excavation_required", "Excavation"],
        ["cat_scan_required", "CAT Scan"],
        ["permit_to_dig_required", "Permit to Dig"],
        ["cold_patch_required", "Cold Patch"],
        ["nc_required", "NC Required"],
      ].map(([name, label]) => (
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
</div>

                <div className="form-group full-width">
                  <label>VRS Comments</label>
                  <textarea
                    name="comments"
                    value={vrsForm.comments}
                    onChange={handleVrsChange}
                    placeholder="Example: 3 posts have been replaced with long driven. Possible dig out required."
                  />
                </div>

                <div className="form-group full-width">
                  <label>VRS Notes</label>
                  <textarea
                    name="notes"
                    value={vrsForm.notes}
                    onChange={handleVrsChange}
                  />
                </div>
              </div>
            </div>
          )}

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