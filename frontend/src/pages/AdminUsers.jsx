import { useEffect, useState } from "react";
import api from "../services/api";

const roleOptions = [
  "admin",
  "planner",
  "viewer",
  "supervisor",
  "night_manager",
  "lead_scheduler",
];

function AdminUsers() {
  const [users, setUsers] = useState([]);
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);

  const [newUser, setNewUser] = useState({
    name: "",
    email: "",
    password: "",
    role: "viewer",
  });

  useEffect(() => {
    loadUsers();
  }, []);

  const loadUsers = async () => {
    try {
      setLoading(true);
      setMessage("");

      const res = await api.get("/users");

      if (Array.isArray(res.data)) {
        setUsers(
          res.data.map((user) => ({
            ...user,
            password: "",
          }))
        );
      } else {
        console.error("Unexpected /users response:", res.data);
        setUsers([]);
        setMessage("Users endpoint returned unexpected data.");
      }
    } catch (err) {
      console.error("Failed to load users:", err);
      setUsers([]);
      setMessage(err.response?.data?.error || "Failed to load users.");
    } finally {
      setLoading(false);
    }
  };

  const handleNewUserChange = (e) => {
    setNewUser((prev) => ({
      ...prev,
      [e.target.name]: e.target.value,
    }));
  };

  const createUser = async (e) => {
    e.preventDefault();
    setMessage("");

    try {
      await api.post("/users", newUser);

      setNewUser({
        name: "",
        email: "",
        password: "",
        role: "viewer",
      });

      setMessage("User created successfully.");
      loadUsers();
    } catch (err) {
      console.error("Failed to create user:", err);
      setMessage(err.response?.data?.error || "Failed to create user.");
    }
  };

  const handleExistingChange = (id, field, value) => {
    setUsers((prev) =>
      prev.map((user) =>
        user.id === id
          ? {
              ...user,
              [field]: value,
            }
          : user
      )
    );
  };

  const updateUser = async (user) => {
    try {
      setMessage("");

      await api.put(`/users/${user.id}`, {
        name: user.name,
        email: user.email,
        role: user.role,
        is_active: !!user.is_active,
        password: user.password || "",
      });

      setMessage("User updated successfully.");
      loadUsers();
    } catch (err) {
      console.error("Failed to update user:", err);
      setMessage(err.response?.data?.error || "Failed to update user.");
    }
  };

  return (
    <div className="list-page list-page-compact">
      <div className="list-page-header list-page-header-tight">
        <div>
          <h1 className="page-title">User Management</h1>
          <p className="page-subtitle">Admin-only user and role management.</p>
        </div>
      </div>

      {message && <p className="form-message">{message}</p>}

      <div className="detail-card detail-main-card" style={{ marginBottom: "20px" }}>
        <h2 style={{ marginTop: 0 }}>Create User</h2>

        <form onSubmit={createUser}>
          <div className="detail-form-grid">
            <div className="form-group">
              <label>Name</label>
              <input
                name="name"
                value={newUser.name}
                onChange={handleNewUserChange}
              />
            </div>

            <div className="form-group">
              <label>Email</label>
              <input
                name="email"
                type="email"
                value={newUser.email}
                onChange={handleNewUserChange}
              />
            </div>

            <div className="form-group">
              <label>Password</label>
              <input
                name="password"
                type="password"
                value={newUser.password}
                onChange={handleNewUserChange}
              />
            </div>

            <div className="form-group">
              <label>Role</label>
              <select
                name="role"
                value={newUser.role}
                onChange={handleNewUserChange}
              >
                {roleOptions.map((role) => (
                  <option key={role} value={role}>
                    {role}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="detail-form-actions">
            <button type="submit" className="detail-btn">
              Create User
            </button>
          </div>
        </form>
      </div>

      <div className="list-table-card">
        <div className="list-table-header">
          <h2>Users</h2>
          <span>{loading ? "Loading..." : `${users.length} users`}</span>
        </div>

        <div className="table-wrapper">
          <table className="enhanced-table">
            <thead>
              <tr>
                <th>Name</th>
                <th>Email</th>
                <th>Role</th>
                <th>Active</th>
                <th>Reset Password</th>
                <th>Action</th>
              </tr>
            </thead>

            <tbody>
              {!loading && users.length === 0 ? (
                <tr>
                  <td colSpan="6">No users found.</td>
                </tr>
              ) : (
                users.map((user) => (
                  <tr key={user.id}>
                    <td>
                      <input
                        value={user.name || ""}
                        onChange={(e) =>
                          handleExistingChange(user.id, "name", e.target.value)
                        }
                      />
                    </td>

                    <td>
                      <input
                        value={user.email || ""}
                        onChange={(e) =>
                          handleExistingChange(user.id, "email", e.target.value)
                        }
                      />
                    </td>

                    <td>
                      <select
                        value={user.role || "viewer"}
                        onChange={(e) =>
                          handleExistingChange(user.id, "role", e.target.value)
                        }
                      >
                        {roleOptions.map((role) => (
                          <option key={role} value={role}>
                            {role}
                          </option>
                        ))}
                      </select>
                    </td>

                    <td>
                      <input
                        type="checkbox"
                        checked={!!user.is_active}
                        onChange={(e) =>
                          handleExistingChange(
                            user.id,
                            "is_active",
                            e.target.checked
                          )
                        }
                      />
                    </td>

                    <td>
                      <input
                        type="password"
                        placeholder="Leave blank"
                        value={user.password || ""}
                        onChange={(e) =>
                          handleExistingChange(user.id, "password", e.target.value)
                        }
                      />
                    </td>

                    <td>
                      <button type="button" onClick={() => updateUser(user)}>
                        Save
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

export default AdminUsers;