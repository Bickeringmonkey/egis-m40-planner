import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import api from "../services/api";

function Closures() {
  const [closures, setClosures] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const [filters, setFilters] = useState({
    status: "",
    carriageway: "",
    date: "",
    search: "",
  });

  useEffect(() => {
    fetchClosures();
  }, []);

  const fetchClosures = async () => {
    try {
      setLoading(true);
      setError("");
      const response = await api.get("/closures");
      setClosures(response.data);
    } catch (err) {
      console.error("Error fetching closures:", err);
      setError("Failed to load closures.");
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (dateString) => {
    if (!dateString) return "";
    return new Date(dateString).toLocaleDateString("en-GB");
  };

  const normaliseDate = (dateString) => {
    if (!dateString) return "";
    return new Date(dateString).toISOString().split("T")[0];
  };

  const getClosureStartDate = (closure) =>
    closure.start_date || closure.closure_date || "";

  const getClosureEndDate = (closure) =>
    closure.end_date || closure.start_date || closure.closure_date || "";

  const formatClosureDateRange = (closure) => {
    const start = getClosureStartDate(closure);
    const end = getClosureEndDate(closure);

    if (!start && !end) return "";
    if (!end || normaliseDate(start) === normaliseDate(end)) {
      return formatDate(start);
    }

    return `${formatDate(start)} - ${formatDate(end)}`;
  };

  const dateFallsWithinClosure = (closure, selectedDate) => {
    if (!selectedDate) return true;

    const start = normaliseDate(getClosureStartDate(closure));
    const end = normaliseDate(getClosureEndDate(closure));

    if (!start && !end) return false;

    return selectedDate >= start && selectedDate <= end;
  };

  const getStatusClass = (status) => {
    if (!status) return "status-badge";
    const clean = status.toLowerCase();

    if (clean === "planned") return "status-badge status-planned";
    if (clean === "complete") return "status-badge status-complete";
    if (clean === "cancelled") return "status-badge status-cancelled";

    return "status-badge";
  };

  const handleFilterChange = (e) => {
    setFilters((prev) => ({
      ...prev,
      [e.target.name]: e.target.value,
    }));
  };

  const clearFilters = () => {
    setFilters({
      status: "",
      carriageway: "",
      date: "",
      search: "",
    });
  };

  const filteredClosures = useMemo(() => {
    const searchText = filters.search.trim().toLowerCase();

    return closures.filter((closure) => {
      const matchesStatus =
        !filters.status || closure.status === filters.status;

      const matchesCarriageway =
        !filters.carriageway || closure.carriageway === filters.carriageway;

      const matchesDate = dateFallsWithinClosure(closure, filters.date);

      const matchesSearch =
        !searchText ||
        (closure.closure_ref || "").toLowerCase().includes(searchText) ||
        (closure.closure_type || "").toLowerCase().includes(searchText) ||
        (closure.notes || "").toLowerCase().includes(searchText) ||
        (closure.carriageway || "").toLowerCase().includes(searchText) ||
        (closure.nems_number || "").toLowerCase().includes(searchText) ||
        (closure.junctions_between || "").toLowerCase().includes(searchText) ||
        (closure.lane_configuration || "").toLowerCase().includes(searchText);

      return matchesStatus && matchesCarriageway && matchesDate && matchesSearch;
    });
  }, [closures, filters]);

  const uniqueCarriageways = [
    ...new Set(closures.map((closure) => closure.carriageway).filter(Boolean)),
  ];

  return (
    <div className="list-page list-page-compact">
      <div className="list-page-header list-page-header-tight">
        <div>
          <h1 className="page-title">Closures</h1>
          <p className="page-subtitle">
            View and manage all closures currently in the system.
          </p>
        </div>

        <div className="list-page-stats">
          <Link to="/add-closure">
            <button type="button" className="detail-btn">
              Add Closure
            </button>
          </Link>

          <div className="mini-stat">
            <span className="mini-stat-label">Total</span>
            <span className="mini-stat-value">{closures.length}</span>
          </div>

          <div className="mini-stat">
            <span className="mini-stat-label">Showing</span>
            <span className="mini-stat-value">{filteredClosures.length}</span>
          </div>
        </div>
      </div>

      <div className="filter-card filter-card-compact">
        <div className="filter-grid-top-single">
          <div className="form-group">
            <label>Search</label>
            <input
              type="text"
              name="search"
              placeholder="Search by closure ref, NEMS, junctions, lane config or notes"
              value={filters.search}
              onChange={handleFilterChange}
            />
          </div>
        </div>

        <div className="filter-grid-compact">
          <div className="form-group">
            <label>Status</label>
            <select
              name="status"
              value={filters.status}
              onChange={handleFilterChange}
            >
              <option value="">All Statuses</option>
              <option value="Planned">Planned</option>
              <option value="Complete">Complete</option>
              <option value="Cancelled">Cancelled</option>
            </select>
          </div>

          <div className="form-group">
            <label>Carriageway</label>
            <select
              name="carriageway"
              value={filters.carriageway}
              onChange={handleFilterChange}
            >
              <option value="">All Carriageways</option>
              {uniqueCarriageways.map((carriageway) => (
                <option key={carriageway} value={carriageway}>
                  {carriageway}
                </option>
              ))}
            </select>
          </div>

          <div className="form-group">
            <label>Date Within Closure</label>
            <input
              type="date"
              name="date"
              value={filters.date}
              onChange={handleFilterChange}
            />
          </div>

          <div className="filter-actions-inline">
            <button
              type="button"
              className="detail-btn detail-btn-secondary"
              onClick={clearFilters}
            >
              Clear Filters
            </button>
          </div>
        </div>
      </div>

      {loading && <p>Loading closures...</p>}
      {error && <p>{error}</p>}

      {!loading && !error && (
        <div className="list-table-card">
          <div className="list-table-header">
            <h2>Closures List</h2>
            <span>
              {filteredClosures.length} result
              {filteredClosures.length !== 1 ? "s" : ""}
            </span>
          </div>

          <div className="table-wrapper">
            <table className="enhanced-table closures-table">
              <thead>
                <tr>
                  <th>Closure Ref</th>
                  <th>Date Range</th>
                  <th>NEMS</th>
                  <th>Junctions</th>
                  <th>Cway</th>
                  <th>Lane</th>
                  <th>Start MP</th>
                  <th>End MP</th>
                  <th>Type</th>
                  <th>Status</th>
                </tr>
              </thead>

              <tbody>
                {filteredClosures.length > 0 ? (
                  filteredClosures.map((closure) => (
                    <tr key={closure.id}>
                      <td>
                        <Link
                          to={`/closures/${closure.id}`}
                          className="table-link-strong"
                        >
                          {closure.closure_ref}
                        </Link>
                      </td>

                      <td>{formatClosureDateRange(closure)}</td>
                      <td>{closure.nems_number || ""}</td>
                      <td>{closure.junctions_between || ""}</td>
                      <td>{closure.carriageway || ""}</td>
                      <td>{closure.lane_configuration || ""}</td>
                      <td>{closure.start_mp ?? ""}</td>
                      <td>{closure.end_mp ?? ""}</td>
                      <td>{closure.closure_type || ""}</td>

                      <td>
                        <span className={getStatusClass(closure.status)}>
                          {closure.status}
                        </span>
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan="10">No closures found.</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}

export default Closures;