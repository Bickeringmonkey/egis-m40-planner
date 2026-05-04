import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import api from "../services/api";

function Subcontractors() {
  const [subcontractors, setSubcontractors] = useState([]);
  const [selectedSubcontractor, setSelectedSubcontractor] = useState(null);
  const [contacts, setContacts] = useState([]);

  const [companyName, setCompanyName] = useState("");
  const [companyNotes, setCompanyNotes] = useState("");

  const [contactName, setContactName] = useState("");
  const [contactPhone, setContactPhone] = useState("");
  const [contactEmail, setContactEmail] = useState("");
  const [contactRole, setContactRole] = useState("");
  const [contactPrimary, setContactPrimary] = useState(false);

  const [loading, setLoading] = useState(false);
  const [contactsLoading, setContactsLoading] = useState(false);
  const [message, setMessage] = useState("");

  useEffect(() => {
    loadSubcontractors();
  }, []);

  const loadSubcontractors = async () => {
    try {
      setLoading(true);
      setMessage("");

      const res = await api.get("/subcontractors");
      setSubcontractors(res.data || []);
    } catch (err) {
      console.error("Failed to load subcontractors:", err);
      setMessage(err.response?.data?.error || "Failed to load subcontractors.");
    } finally {
      setLoading(false);
    }
  };

  const loadContacts = async (subcontractor) => {
    try {
      setSelectedSubcontractor(subcontractor);
      setContactsLoading(true);
      setMessage("");

      const res = await api.get(`/subcontractors/${subcontractor.id}/contacts`);
      setContacts(res.data || []);
    } catch (err) {
      console.error("Failed to load contacts:", err);
      setMessage(err.response?.data?.error || "Failed to load contacts.");
    } finally {
      setContactsLoading(false);
    }
  };

  const resetCompanyForm = () => {
    setCompanyName("");
    setCompanyNotes("");
  };

  const resetContactForm = () => {
    setContactName("");
    setContactPhone("");
    setContactEmail("");
    setContactRole("");
    setContactPrimary(false);
  };

  const createSubcontractor = async (e) => {
    e.preventDefault();

    if (!companyName.trim()) {
      setMessage("Subcontractor name is required.");
      return;
    }

    try {
      setMessage("");

      await api.post("/subcontractors", {
        company_name: companyName,
        notes: companyNotes,
      });

      resetCompanyForm();
      await loadSubcontractors();
      setMessage("Subcontractor added.");
    } catch (err) {
      console.error("Failed to create subcontractor:", err);
      setMessage(err.response?.data?.error || "Failed to create subcontractor.");
    }
  };

  const addContact = async (e) => {
    e.preventDefault();

    if (!selectedSubcontractor) {
      setMessage("Select a subcontractor first.");
      return;
    }

    if (!contactName.trim()) {
      setMessage("Contact name is required.");
      return;
    }

    try {
      setMessage("");

      await api.post(`/subcontractors/${selectedSubcontractor.id}/contacts`, {
        contact_name: contactName,
        phone: contactPhone,
        email: contactEmail,
        role: contactRole,
        is_primary: contactPrimary,
      });

      resetContactForm();
      await loadContacts(selectedSubcontractor);
      setMessage("Contact added.");
    } catch (err) {
      console.error("Failed to add contact:", err);
      setMessage(err.response?.data?.error || "Failed to add contact.");
    }
  };

  const activeSubcontractors = subcontractors.filter(
    (sub) => Number(sub.is_active) === 1
  );

  return (
    <div className="subcontractors-page">
      <div className="list-page-header">
        <div>
          <h1 className="page-title">Subcontractors</h1>
          <p className="page-subtitle">
            Manage subcontractor companies and contacts for M40 closures.
          </p>
        </div>

        <div className="detail-actions">
          <Link to="/dashboard" className="detail-btn detail-btn-secondary">
            Back to Dashboard
          </Link>
        </div>
      </div>

      {message && <p className="form-message">{message}</p>}

      <div className="subcontractor-layout">
        <div className="detail-card">
          <h2>Add Subcontractor</h2>

          <form onSubmit={createSubcontractor}>
            <div className="form-group">
              <label>Subcontractor Name</label>
              <input
                type="text"
                value={companyName}
                onChange={(e) => setCompanyName(e.target.value)}
                placeholder="Example: ABC Drainage Ltd"
              />
            </div>

            <div className="form-group">
              <label>Notes</label>
              <textarea
                value={companyNotes}
                onChange={(e) => setCompanyNotes(e.target.value)}
                placeholder="Optional notes about this subcontractor"
                rows="3"
              />
            </div>

            <button type="submit" className="detail-btn">
              Add Subcontractor
            </button>
          </form>
        </div>

        <div className="detail-card">
          <h2>Subcontractor List</h2>

          {loading && <p>Loading subcontractors...</p>}

          {!loading && activeSubcontractors.length === 0 && (
            <p>No subcontractors added yet.</p>
          )}

          <div className="subcontractor-list">
            {activeSubcontractors.map((sub) => (
              <button
                type="button"
                key={sub.id}
                className={
                  selectedSubcontractor?.id === sub.id
                    ? "subcontractor-list-item subcontractor-list-item-active"
                    : "subcontractor-list-item"
                }
                onClick={() => loadContacts(sub)}
              >
                <strong>{sub.company_name}</strong>
                {sub.notes && <span>{sub.notes}</span>}
              </button>
            ))}
          </div>
        </div>

        <div className="detail-card subcontractor-contacts-card">
          <h2>
            Contacts{" "}
            {selectedSubcontractor
              ? `- ${selectedSubcontractor.company_name}`
              : ""}
          </h2>

          {!selectedSubcontractor && (
            <p>Select a subcontractor to view or add contacts.</p>
          )}

          {selectedSubcontractor && (
            <>
              <form onSubmit={addContact} className="contact-form-grid">
                <div className="form-group">
                  <label>Contact Name</label>
                  <input
                    type="text"
                    value={contactName}
                    onChange={(e) => setContactName(e.target.value)}
                    placeholder="Example: John Smith"
                  />
                </div>

                <div className="form-group">
                  <label>Telephone</label>
                  <input
                    type="text"
                    value={contactPhone}
                    onChange={(e) => setContactPhone(e.target.value)}
                    placeholder="07..."
                  />
                </div>

                <div className="form-group">
                  <label>Email</label>
                  <input
                    type="email"
                    value={contactEmail}
                    onChange={(e) => setContactEmail(e.target.value)}
                    placeholder="name@company.co.uk"
                  />
                </div>

                <div className="form-group">
                  <label>Role</label>
                  <input
                    type="text"
                    value={contactRole}
                    onChange={(e) => setContactRole(e.target.value)}
                    placeholder="Supervisor / Planner / Manager"
                  />
                </div>

                <label className="checkbox-row">
                  <input
                    type="checkbox"
                    checked={contactPrimary}
                    onChange={(e) => setContactPrimary(e.target.checked)}
                  />
                  Primary contact
                </label>

                <button type="submit" className="detail-btn">
                  Add Contact
                </button>
              </form>

              <hr />

              {contactsLoading && <p>Loading contacts...</p>}

              {!contactsLoading && contacts.length === 0 && (
                <p>No contacts added for this subcontractor yet.</p>
              )}

              {!contactsLoading && contacts.length > 0 && (
                <div className="table-wrapper">
                  <table className="enhanced-table">
                    <thead>
                      <tr>
                        <th>Name</th>
                        <th>Role</th>
                        <th>Telephone</th>
                        <th>Email</th>
                        <th>Primary</th>
                      </tr>
                    </thead>

                    <tbody>
                      {contacts.map((contact) => (
                        <tr key={contact.id}>
                          <td>{contact.contact_name}</td>
                          <td>{contact.role || "N/A"}</td>
                          <td>{contact.phone || "N/A"}</td>
                          <td>{contact.email || "N/A"}</td>
                          <td>{contact.is_primary ? "Yes" : "No"}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}

export default Subcontractors;