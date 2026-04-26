import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import api from "../services/api";

function Jobs() {
  const [jobs, setJobs] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const [filters, setFilters] = useState({
    status: "",
    workstream: "",
    date: "",
    search: "",
  });

  useEffect(() => {
    fetchJobs();
  }, []);

  const fetchJobs = async () => {
    try {
      setLoading(true);
      setError("");
      const response = await api.get("/jobs");
      setJobs(response.data);
    } catch (err) {
      console.error("Error fetching jobs:", err);
      setError("Failed to load jobs.");
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
      workstream: "",
      date: "",
      search: "",
    });
  };

  const filteredJobs = useMemo(() => {
    const searchText = filters.search.trim().toLowerCase();

    return jobs.filter((job) => {
      const matchesStatus = !filters.status || job.status === filters.status;
      const matchesWorkstream =
        !filters.workstream || job.workstream === filters.workstream;
      const matchesDate =
        !filters.date || normaliseDate(job.planned_date) === filters.date;

      const matchesSearch =
        !searchText ||
        (job.job_number || "").toLowerCase().includes(searchText) ||
        (job.title || "").toLowerCase().includes(searchText) ||
        (job.workstream || "").toLowerCase().includes(searchText) ||
        (job.closure_ref || "").toLowerCase().includes(searchText) ||
        (job.work_order || "").toLowerCase().includes(searchText) ||
        (job.activity || "").toLowerCase().includes(searchText) ||
        (job.location || "").toLowerCase().includes(searchText) ||
        (job.description || "").toLowerCase().includes(searchText) ||
        (job.activity_code || "").toLowerCase().includes(searchText);

      return matchesStatus && matchesWorkstream && matchesDate && matchesSearch;
    });
  }, [jobs, filters]);

  const uniqueWorkstreams = [
    ...new Set(jobs.map((job) => job.workstream).filter(Boolean)),
  ];

  return (
    <div className="list-page list-page-compact">
      <div className="list-page-header list-page-header-tight">
        <div>
          <h1 className="page-title">Jobs</h1>
          <p className="page-subtitle">
            View and manage all jobs currently in the system.
          </p>
        </div>

        <div className="list-page-stats">
          <Link to="/add-job">
            <button type="button" className="detail-btn">
              Add Job
            </button>
          </Link>

          <div className="mini-stat">
            <span className="mini-stat-label">Total</span>
            <span className="mini-stat-value">{jobs.length}</span>
          </div>

          <div className="mini-stat">
            <span className="mini-stat-label">Showing</span>
            <span className="mini-stat-value">{filteredJobs.length}</span>
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
              placeholder="Search by job, work order, activity, location, description or closure"
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
            <label>Workstream</label>
            <select
              name="workstream"
              value={filters.workstream}
              onChange={handleFilterChange}
            >
              <option value="">All Workstreams</option>
              {uniqueWorkstreams.map((workstream) => (
                <option key={workstream} value={workstream}>
                  {workstream}
                </option>
              ))}
            </select>
          </div>

          <div className="form-group">
            <label>Planned Date</label>
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

      {loading && <p>Loading jobs...</p>}
      {error && <p>{error}</p>}

      {!loading && !error && (
        <div className="list-table-card">
          <div className="list-table-header">
            <h2>Jobs List</h2>
            <span>
              {filteredJobs.length} result
              {filteredJobs.length !== 1 ? "s" : ""}
            </span>
          </div>

          <div className="table-wrapper">
            <table className="enhanced-table jobs-table">
              <thead>
                <tr>
                  <th>Job Number</th>
                  <th>Work Order</th>
                  <th>Activity</th>
                  <th>Location</th>
                  <th>Closure Ref</th>
                  <th>Date</th>
                  <th>Status</th>
                </tr>
              </thead>

              <tbody>
                {filteredJobs.length > 0 ? (
                  filteredJobs.map((job) => (
                    <tr key={job.id}>
                      <td>
                        <Link
                          to={`/jobs/${job.id}`}
                          className="table-link-strong"
                        >
                          {job.job_number}
                        </Link>
                      </td>

                      <td>{job.work_order || ""}</td>
                      <td>{job.activity || job.title || ""}</td>
                      <td>{job.location || ""}</td>

                      <td>
                        {job.closure_ref ? (
                          <Link to={`/closures/${job.closure_id}`}>
                            {job.closure_ref}
                          </Link>
                        ) : (
                          ""
                        )}
                      </td>

                      <td>{formatDate(job.planned_date)}</td>

                      <td>
                        <span className={getStatusClass(job.status)}>
                          {job.status}
                        </span>
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan="7">No jobs found.</td>
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

export default Jobs;