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

  const createSubcontractor = async (e) => {
    e.preventDefault();

    if (!companyName.trim()) {
      setMessage("Subcontractor name is required.");
      return;
    }

    try {
      await api.post("/subcontractors", {
        company_name: companyName,
        notes: companyNotes,
      });

      setCompanyName("");
      setCompanyNotes("");
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
      await api.post(`/subcontractors/${selectedSubcontractor.id}/contacts`, {
        contact_name: contactName,
        phone: contactPhone,
        email: contactEmail,
        role: contactRole,
        is_primary: contactPrimary,
      });

      setContactName("");
      setContactPhone("");
      setContactEmail("");
      setContactRole("");
      setContactPrimary(false);

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
    <div className="subs-page">
      <div className="subs-hero">
        <div>
          <h1>Subcontractors</h1>
          <p>Manage subcontractor companies and key contacts for M40 closures.</p>
        </div>

        <Link to="/dashboard" className="subs-back-btn">
          Back to Dashboard
        </Link>
      </div>

      {message && <div className="subs-message">{message}</div>}

      <div className="subs-top-grid">
        <section className="subs-panel">
          <div className="subs-panel-header">
            <h2>Add Company</h2>
            <p>Create subcontractor companies once, then reuse them on jobs.</p>
          </div>

          <form onSubmit={createSubcontractor} className="subs-form">
            <label>
              Company name
              <input
                type="text"
                value={companyName}
                onChange={(e) => setCompanyName(e.target.value)}
                placeholder="Example: FM Conways"
              />
            </label>

            <label>
              Notes
              <textarea
                value={companyNotes}
                onChange={(e) => setCompanyNotes(e.target.value)}
                placeholder="Example: Drainage, surfacing, VRS, specialist works..."
                rows="4"
              />
            </label>

            <button type="submit">Add Company</button>
          </form>
        </section>

        <section className="subs-panel">
          <div className="subs-panel-header">
            <h2>Companies</h2>
            <p>Select a company to manage contacts.</p>
          </div>

          {loading && <p className="subs-muted">Loading subcontractors...</p>}

          {!loading && activeSubcontractors.length === 0 && (
            <div className="subs-empty">No subcontractors added yet.</div>
          )}

          <div className="subs-company-list">
            {activeSubcontractors.map((sub) => (
              <button
                key={sub.id}
                type="button"
                onClick={() => loadContacts(sub)}
                className={
                  selectedSubcontractor?.id === sub.id
                    ? "subs-company-card active"
                    : "subs-company-card"
                }
              >
                <div>
                  <strong>{sub.company_name}</strong>
                  <span>{sub.notes || "No notes added"}</span>
                </div>
                <em>View contacts</em>
              </button>
            ))}
          </div>
        </section>
      </div>

      <section className="subs-panel subs-contacts-panel">
        <div className="subs-panel-header subs-contacts-header">
          <div>
            <h2>Contacts</h2>
            <p>
              {selectedSubcontractor
                ? `Contacts for ${selectedSubcontractor.company_name}`
                : "Select a company to add or view contacts."}
            </p>
          </div>

          {selectedSubcontractor && (
            <div className="subs-selected-pill">
              {selectedSubcontractor.company_name}
            </div>
          )}
        </div>

        {!selectedSubcontractor && (
          <div className="subs-empty">
            Pick a subcontractor from the company list above.
          </div>
        )}

        {selectedSubcontractor && (
          <>
            <form onSubmit={addContact} className="subs-contact-form">
              <label>
                Contact name
                <input
                  type="text"
                  value={contactName}
                  onChange={(e) => setContactName(e.target.value)}
                  placeholder="Example: John Smith"
                />
              </label>

              <label>
                Telephone
                <input
                  type="text"
                  value={contactPhone}
                  onChange={(e) => setContactPhone(e.target.value)}
                  placeholder="07..."
                />
              </label>

              <label>
                Email
                <input
                  type="email"
                  value={contactEmail}
                  onChange={(e) => setContactEmail(e.target.value)}
                  placeholder="name@company.co.uk"
                />
              </label>

              <label>
                Role
                <input
                  type="text"
                  value={contactRole}
                  onChange={(e) => setContactRole(e.target.value)}
                  placeholder="Supervisor / Manager"
                />
              </label>

              <label className="subs-checkbox">
                <input
                  type="checkbox"
                  checked={contactPrimary}
                  onChange={(e) => setContactPrimary(e.target.checked)}
                />
                Primary contact
              </label>

              <button type="submit">Add Contact</button>
            </form>

            <div className="subs-contact-list">
              {contactsLoading && <p className="subs-muted">Loading contacts...</p>}

              {!contactsLoading && contacts.length === 0 && (
                <div className="subs-empty">No contacts added yet.</div>
              )}

              {!contactsLoading &&
                contacts.map((contact) => (
                  <div key={contact.id} className="subs-contact-card">
                    <div>
                      <strong>{contact.contact_name}</strong>
                      <span>{contact.role || "No role added"}</span>
                    </div>

                    <div>
                      <span>{contact.phone || "No phone"}</span>
                      <span>{contact.email || "No email"}</span>
                    </div>

                    {contact.is_primary ? (
                      <em className="subs-primary-badge">Primary</em>
                    ) : (
                      <em className="subs-secondary-badge">Contact</em>
                    )}
                  </div>
                ))}
            </div>
          </>
        )}
      </section>
    </div>
  );
}

export default Subcontractors;