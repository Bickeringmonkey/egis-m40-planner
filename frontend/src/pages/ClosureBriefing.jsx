import { useEffect, useMemo, useState } from "react";
import { Link, useParams } from "react-router-dom";
import api from "../services/api";

function ClosureBriefing() {
  const { id } = useParams();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [saveMessage, setSaveMessage] = useState("");

  const [briefingForm, setBriefingForm] = useState({
    emergency: "",
    sequence: "",
    generalNotes: "",
  });

  const emergencyTemplates = {
    standard: `In the event of an accident, incident, near miss, or emergency, make the area safe where possible, notify supervision immediately, and follow the agreed incident escalation procedure.
Emergency services should be contacted where required and all relevant details recorded.
All incidents must be reported to the relevant supervisor and escalated in accordance with company procedure.`,
    traffic: `In the event of a live lane or traffic management related incident, stop works where safe to do so, make the area safe, and notify supervision immediately.
Do not place operatives at risk by attempting to recover materials or equipment from unsafe areas.
Emergency services and traffic management support are to be contacted where required, with all relevant details recorded and escalated.`,
    injury: `In the event of an injury, make the area safe, provide first aid where competent to do so, and notify supervision immediately.
Emergency services should be contacted where required and the location made clear using closure reference, junctions, and marker posts where possible.
All details of the injured party, persons involved, and circumstances must be recorded and escalated.`,
  };

  const sequenceTemplates = {
    standard: `Traffic management to be installed in accordance with the approved closure details.
All operatives are to attend the briefing before commencement of works.
Works are to be completed within the booked extents and in line with the approved method of working.
Any issues, clashes, defects outside scope, or safety concerns must be reported immediately to supervision.`,
    totalClosure: `Traffic management is to be installed in accordance with the approved total closure details and checked before works commence.
All operatives must attend the briefing and confirm the work area, extents, and access arrangements.
Works are to be completed within the booked closure extents only.
Any additional defects, third-party clashes, access issues, or safety concerns must be escalated immediately to supervision before proceeding.`,
    collaborative: `Traffic management is to be installed and controlled in accordance with the approved closure arrangement and any agreed collaborative working plan.
All parties must attend the briefing and confirm individual work areas, responsibilities, and communication routes.
Works are to be coordinated to avoid conflict within the closure extents.
Any clashes, delays, access issues, or changes to the agreed sequence must be escalated immediately to supervision.`,
  };

  const notesTemplates = {
    standard: `All teams are to remain within the approved closure extents and work to the agreed programme.
Any change to scope, delay, defect outside scope, or access issue must be communicated to supervision immediately.`,
    weather: `Weather conditions are to be monitored throughout the shift.
If conditions become unsuitable for traffic management or safe completion of works, activities are to be reviewed and escalated to supervision immediately.`,
    housekeeping: `All materials, plant, and waste are to be controlled throughout the shift.
The site is to be left safe and clear on completion, with no debris, redundant material, or unsecured equipment remaining within the work area.`,
  };

  useEffect(() => {
    loadBriefing();
  }, [id]);

  const loadBriefing = async () => {
    try {
      setLoading(true);
      setError("");
      setSaveMessage("");

      const response = await api.get(`/closures/${id}/briefing`);
      setData(response.data);
      setBriefingForm({
        emergency: response.data.briefing?.emergency || "",
        sequence: response.data.briefing?.sequence || "",
        generalNotes: response.data.briefing?.generalNotes || "",
      });
    } catch (err) {
      console.error("Error loading briefing:", err);
      setError("Failed to load briefing.");
    } finally {
      setLoading(false);
    }
  };

  const handlePrint = () => {
    window.print();
  };

  const handleChange = (e) => {
    setBriefingForm((prev) => ({
      ...prev,
      [e.target.name]: e.target.value,
    }));
  };

  const handleSave = async () => {
    try {
      setSaveMessage("");
      await api.put(`/closures/${id}/briefing`, briefingForm);
      setSaveMessage("Briefing saved successfully.");
    } catch (err) {
      console.error("Error saving briefing:", err);
      setSaveMessage("Failed to save briefing.");
    }
  };

  const applyTemplate = (field, value) => {
    if (!value) return;
    setBriefingForm((prev) => ({
      ...prev,
      [field]: value,
    }));
  };

  const formatDate = (dateString) => {
    if (!dateString) return "";
    return new Date(dateString).toLocaleDateString("en-GB");
  };

  const formatTime = (timeString) => {
    if (!timeString) return "N/A";
    return String(timeString).slice(0, 5);
  };

  const requirementsRows = useMemo(() => {
    if (!data?.jobs?.length) {
      return [
        {
          key: "briefing",
          item: "Briefing attendance",
          instruction:
            "All operatives must attend the briefing before commencement of works and confirm understanding of the activity, work area, and site controls.",
          equipment: "Briefing sheet / RAMS",
        },
        {
          key: "tm",
          item: "Traffic management compliance",
          instruction:
            "Traffic management must be installed, maintained, and removed in accordance with the approved closure details, cone times, and site controls.",
          equipment: "Approved TM layout",
        },
        {
          key: "reporting",
          item: "Reporting and escalation",
          instruction:
            "Any safety issue, defect outside scope, plant problem, delayed install, or third-party conflict must be reported immediately to supervision.",
          equipment: "Phone / radio",
        },
      ];
    }

    const rows = [];
    const added = new Set();

    const addRow = (key, item, instruction, equipment) => {
      if (added.has(key)) return;
      added.add(key);
      rows.push({ key, item, instruction, equipment });
    };

    const norm = (value) => (value || "").toLowerCase();

    const allText = data.jobs.map((job) =>
      [norm(job.workstream), norm(job.activity), norm(job.description), norm(job.location)].join(" ")
    );

    const hasKeyword = (keywords) =>
      allText.some((text) => keywords.some((k) => text.includes(k)));

    const hasWorkstream = (keywords) =>
      data.jobs.some((job) => keywords.some((k) => norm(job.workstream).includes(k)));

    addRow(
      "briefing",
      "Briefing attendance",
      "All operatives must attend the briefing before commencement of works and confirm understanding of the activity, work area, and site controls.",
      "Briefing sheet / RAMS"
    );

    addRow(
      "tm",
      "Traffic management compliance",
      "Traffic management must be installed, maintained, and removed in accordance with the approved closure details, cone times, and site controls.",
      "Approved TM layout"
    );

    if (hasWorkstream(["structure"])) {
      addRow(
        "structures",
        "Structures works",
        "Structures activities must remain within the booked extents and be completed in accordance with the approved method statement, access requirements, and any structural constraints.",
        "Relevant plant / hand tools"
      );
    }

    if (hasWorkstream(["vrs", "barrier"])) {
      addRow(
        "vrs",
        "VRS repairs",
        "Barrier repairs are to be completed in accordance with approved repair methods, ensuring damaged elements are removed safely and all materials are controlled.",
        "VRS repair kit / tools"
      );
    }

    if (hasKeyword(["drain", "gully", "jet", "interceptor", "catchpit", "cctv"])) {
      addRow(
        "drainage",
        "Drainage activities",
        "Drainage activities must ensure safe access, suitable waste handling, and reporting of any blocked assets, structural damage, or defects identified during cleansing, jetting, or survey works.",
        "Jetting / cleansing / CCTV equipment"
      );
    }

    if (hasKeyword(["lining", "road marking", "thermoplastic", "stud"])) {
      addRow(
        "lining",
        "Lining works",
        "Lining works are to be completed within the booked extents using the correct material and application process, ensuring the work area remains protected at all times.",
        "Lining plant / materials"
      );
    }

    if (hasWorkstream(["awn"]) || hasKeyword(["sign", "warning sign"])) {
      addRow(
        "awn",
        "AWN / signage works",
        "Any advanced warning or signage activity must be installed, checked, and removed in accordance with approved layouts and relevant standards.",
        "Signs / fixings / layout"
      );
    }

    if (hasKeyword(["vegetation", "grass", "tree", "hedge", "ecology", "landscape"])) {
      addRow(
        "landscape",
        "Landscape / ecology works",
        "Landscape and ecology activities must be completed in accordance with environmental controls, with any protected species or unexpected issues escalated immediately.",
        "Relevant PPE / tools"
      );
    }

    if (hasKeyword(["pothole", "carriageway defect", "patch", "surfacing", "tarmac", "asphalt"])) {
      addRow(
        "carriageway",
        "Carriageway repairs",
        "Carriageway repair works must be completed within the permitted extents, with materials laid and finished in accordance with the approved repair method and site controls.",
        "Repair materials / plant / hand tools"
      );
    }

    if (hasKeyword(["lighting", "electrical", "cable", "column"])) {
      addRow(
        "lighting",
        "Lighting / electrical works",
        "Lighting or electrical works must be completed using the approved isolation, access, and reinstatement procedures, with any defects or damage reported immediately.",
        "Electrical tools / access equipment"
      );
    }

    if (hasKeyword(["litter", "sweep", "debris", "clearance", "clean"])) {
      addRow(
        "cleaning",
        "Clearance / cleaning works",
        "Cleaning or clearance activities must ensure safe collection, handling, and disposal of debris, with the carriageway and verge left safe on completion.",
        "Sweep / clearance tools"
      );
    }

    addRow(
      "housekeeping",
      "Housekeeping",
      "The site must be left safe and clear on completion, with all debris, redundant materials, and surplus equipment removed from the carriageway, verge, and work area.",
      "General tools / waste handling"
    );

    addRow(
      "reporting",
      "Reporting and escalation",
      "Any safety issue, defect outside scope, plant problem, delayed install, or third-party conflict must be reported immediately to supervision.",
      "Phone / radio"
    );

    return rows;
  }, [data]);

  const signInRows = Array.from({ length: 30 }, (_, index) => ({ id: index + 1 }));

  if (loading) return <p>Loading briefing...</p>;
  if (error) return <p>{error}</p>;
  if (!data) return <p>No briefing found.</p>;

  const { closure, jobs, slipRoads } = data;

  const taskSummary =
    jobs.length > 0
      ? jobs.map((job) => job.activity || job.description || job.job_number).join(", ")
      : "No activities recorded";

  const locationSummary = [
    closure.junctions_between,
    closure.carriageway ? `Carriageway ${closure.carriageway}` : "",
    closure.start_mp != null && closure.end_mp != null ? `MP ${closure.start_mp} to ${closure.end_mp}` : "",
  ]
    .filter(Boolean)
    .join(" | ");

  return (
    <div className="briefing-page briefing-page-v2">
      <div className="detail-topbar print-hide">
        <Link to={`/closures/${id}`} className="back-link detail-back-link">
          ← Back to Closure Detail
        </Link>

        <div className="detail-actions">
          <button type="button" className="detail-btn detail-btn-secondary" onClick={handleSave}>
            Save Briefing
          </button>

          <button type="button" className="detail-btn" onClick={handlePrint}>
            Print Briefing
          </button>
        </div>
      </div>

      <div className="briefing-header">
        <div>
          <h1 className="page-title">Night Works Briefing</h1>
          <p className="page-subtitle">
            Structured operational briefing for closure {closure.closure_ref}
          </p>
        </div>
      </div>

      <div className="briefing-print-meta">
        <div><strong>Date Printed:</strong> {new Date().toLocaleString("en-GB")}</div>
        <div><strong>Closure Ref:</strong> {closure.closure_ref}</div>
      </div>

      {saveMessage && <p className="form-message print-hide">{saveMessage}</p>}

      <div className="briefing-sheet">
        <section className="briefing-band">
          <div className="briefing-band-title">Header Details</div>
          <div className="briefing-sheet-grid briefing-sheet-grid-3">
            <div className="briefing-sheet-cell">
              <div className="briefing-sheet-label">Date</div>
              <div className="briefing-sheet-value">{formatDate(closure.closure_date)}</div>
            </div>
            <div className="briefing-sheet-cell">
              <div className="briefing-sheet-label">Location</div>
              <div className="briefing-sheet-value">{locationSummary || "N/A"}</div>
            </div>
            <div className="briefing-sheet-cell">
              <div className="briefing-sheet-label">Task</div>
              <div className="briefing-sheet-value">{taskSummary}</div>
            </div>
          </div>
        </section>

        <section className="briefing-band">
          <div className="briefing-band-title">Operational Details</div>
          <div className="briefing-sheet-grid briefing-sheet-grid-4">
            <div className="briefing-sheet-cell">
              <div className="briefing-sheet-label">Depot</div>
              <div className="briefing-sheet-value">{closure.depot || "N/A"}</div>
            </div>
            <div className="briefing-sheet-cell">
              <div className="briefing-sheet-label">Duty Manager</div>
              <div className="briefing-sheet-value">{closure.duty_manager || "N/A"}</div>
            </div>
            <div className="briefing-sheet-cell">
              <div className="briefing-sheet-label">Night Supervisor</div>
              <div className="briefing-sheet-value">{closure.night_supervisor || "N/A"}</div>
            </div>
            <div className="briefing-sheet-cell">
              <div className="briefing-sheet-label">Briefing Time</div>
              <div className="briefing-sheet-value">{formatTime(closure.briefing_time)}</div>
            </div>
            <div className="briefing-sheet-cell briefing-sheet-cell-span-2">
              <div className="briefing-sheet-label">Welfare Location</div>
              <div className="briefing-sheet-value">{closure.welfare_location || "N/A"}</div>
            </div>
            <div className="briefing-sheet-cell briefing-sheet-cell-span-2">
              <div className="briefing-sheet-label">Nearest Hospital</div>
              <div className="briefing-sheet-value">{closure.nearest_hospital || "N/A"}</div>
            </div>
          </div>
        </section>

        <section className="briefing-band">
          <div className="briefing-band-title">Traffic Management</div>
          <div className="briefing-sheet-grid briefing-sheet-grid-4">
            <div className="briefing-sheet-cell">
              <div className="briefing-sheet-label">Closure Ref</div>
              <div className="briefing-sheet-value">{closure.closure_ref || "N/A"}</div>
            </div>
            <div className="briefing-sheet-cell">
              <div className="briefing-sheet-label">NEMS</div>
              <div className="briefing-sheet-value">{closure.nems_number || "N/A"}</div>
            </div>
            <div className="briefing-sheet-cell">
              <div className="briefing-sheet-label">Closure Type</div>
              <div className="briefing-sheet-value">{closure.closure_type || "N/A"}</div>
            </div>
            <div className="briefing-sheet-cell">
              <div className="briefing-sheet-label">Carriageway</div>
              <div className="briefing-sheet-value">{closure.carriageway || "N/A"}</div>
            </div>

            <div className="briefing-sheet-cell">
              <div className="briefing-sheet-label">Junctions Between</div>
              <div className="briefing-sheet-value">{closure.junctions_between || "N/A"}</div>
            </div>
            <div className="briefing-sheet-cell">
              <div className="briefing-sheet-label">Lane Configuration</div>
              <div className="briefing-sheet-value">{closure.lane_configuration || "N/A"}</div>
            </div>
            <div className="briefing-sheet-cell">
              <div className="briefing-sheet-label">Start MP</div>
              <div className="briefing-sheet-value">{closure.start_mp ?? "N/A"}</div>
            </div>
            <div className="briefing-sheet-cell">
              <div className="briefing-sheet-label">End MP</div>
              <div className="briefing-sheet-value">{closure.end_mp ?? "N/A"}</div>
            </div>

            <div className="briefing-sheet-cell">
              <div className="briefing-sheet-label">Cone On Time</div>
              <div className="briefing-sheet-value">{formatTime(closure.cone_on_time)}</div>
            </div>
            <div className="briefing-sheet-cell">
              <div className="briefing-sheet-label">Cone Off Time</div>
              <div className="briefing-sheet-value">{formatTime(closure.cone_off_time)}</div>
            </div>
            <div className="briefing-sheet-cell">
              <div className="briefing-sheet-label">TM Install Time</div>
              <div className="briefing-sheet-value">{formatTime(closure.tm_install_time)}</div>
            </div>
            <div className="briefing-sheet-cell">
              <div className="briefing-sheet-label">TM Clear Time</div>
              <div className="briefing-sheet-value">{formatTime(closure.tm_clear_time)}</div>
            </div>

            <div className="briefing-sheet-cell briefing-sheet-cell-span-2">
              <div className="briefing-sheet-label">Slip Roads</div>
              <div className="briefing-sheet-value">
                {slipRoads.length ? slipRoads.join(", ") : "None"}
              </div>
            </div>
          </div>
        </section>

        <section className="briefing-band">
          <div className="briefing-band-title">Emergency Procedure</div>
          <div className="briefing-template-row print-hide">
            <label>Template</label>
            <select onChange={(e) => applyTemplate("emergency", e.target.value)} defaultValue="">
              <option value="">Select template</option>
              <option value={emergencyTemplates.standard}>Standard Emergency</option>
              <option value={emergencyTemplates.traffic}>Traffic Management Incident</option>
              <option value={emergencyTemplates.injury}>Injury / Medical Incident</option>
            </select>
          </div>
          <textarea
            className="briefing-edit-box briefing-edit-box-large"
            name="emergency"
            value={briefingForm.emergency}
            onChange={handleChange}
          />
        </section>

        <section className="briefing-band">
          <div className="briefing-band-title">Sequence and Method of Working</div>
          <div className="briefing-template-row print-hide">
            <label>Template</label>
            <select onChange={(e) => applyTemplate("sequence", e.target.value)} defaultValue="">
              <option value="">Select template</option>
              <option value={sequenceTemplates.standard}>Standard Sequence</option>
              <option value={sequenceTemplates.totalClosure}>Total Closure Works</option>
              <option value={sequenceTemplates.collaborative}>Collaborative Working</option>
            </select>
          </div>
          <textarea
            className="briefing-edit-box briefing-edit-box-large"
            name="sequence"
            value={briefingForm.sequence}
            onChange={handleChange}
          />
        </section>

        <section className="briefing-band">
          <div className="briefing-band-title">Requirements / Instructions</div>
          <div className="table-wrapper">
            <table className="enhanced-table briefing-table briefing-requirements-table">
              <thead>
                <tr>
                  <th>Item</th>
                  <th>Instruction / Requirement</th>
                  <th>Plant / Equipment / Reference</th>
                </tr>
              </thead>
              <tbody>
                {requirementsRows.map((row) => (
                  <tr key={row.key}>
                    <td>{row.item}</td>
                    <td>{row.instruction}</td>
                    <td>{row.equipment}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>

        <section className="briefing-band">
          <div className="briefing-band-title">Planned Activities</div>

          <div className="table-wrapper">
            <table className="enhanced-table briefing-table briefing-table-tight">
              <thead>
                <tr>
                  <th>Job No</th>
                  <th>Work Order</th>
                  <th>Activity</th>
                  <th>Code</th>
                  <th>Location</th>
                  <th>Workstream</th>
                  <th>Description</th>
                  <th>Notes</th>
                </tr>
              </thead>
              <tbody>
                {jobs.length > 0 ? (
                  jobs.map((job) => (
                    <tr key={job.id}>
                      <td>{job.job_number || ""}</td>
                      <td>{job.work_order || ""}</td>
                      <td>{job.activity || ""}</td>
                      <td>{job.activity_code || ""}</td>
                      <td>{job.location || ""}</td>
                      <td>{job.workstream || ""}</td>
                      <td>{job.description || ""}</td>
                      <td>{job.notes || ""}</td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan="8">No jobs recorded for this closure.</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </section>

        <section className="briefing-band">
          <div className="briefing-band-title">General Notes</div>
          <div className="briefing-template-row print-hide">
            <label>Template</label>
            <select onChange={(e) => applyTemplate("generalNotes", e.target.value)} defaultValue="">
              <option value="">Select template</option>
              <option value={notesTemplates.standard}>Standard Notes</option>
              <option value={notesTemplates.weather}>Weather Monitoring</option>
              <option value={notesTemplates.housekeeping}>Housekeeping / Handover</option>
            </select>
          </div>
          <textarea
            className="briefing-edit-box"
            name="generalNotes"
            value={briefingForm.generalNotes}
            onChange={handleChange}
          />
        </section>

        <section className="briefing-band briefing-signoff-band">
          <div className="briefing-band-title">Briefing Sign-In Sheet</div>
          <div className="briefing-signoff-note">
            Operatives signing below confirm that they have attended and read the briefing.
          </div>

          <div className="table-wrapper">
            <table className="enhanced-table briefing-signoff-table briefing-signoff-table-30">
              <thead>
                <tr>
                  <th>Name</th>
                  <th>Company</th>
                  <th>Role</th>
                  <th>Signature</th>
                  <th>Time</th>
                </tr>
              </thead>
              <tbody>
                {signInRows.map((row) => (
                  <tr key={row.id}>
                    <td>&nbsp;</td>
                    <td>&nbsp;</td>
                    <td>&nbsp;</td>
                    <td>&nbsp;</td>
                    <td>&nbsp;</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>

        <div className="briefing-footer-note">
          Generated from M40 Planner briefing module.
        </div>
      </div>
    </div>
  );
}

export default ClosureBriefing;