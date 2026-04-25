import { BrowserRouter as Router, Routes, Route, NavLink } from "react-router-dom";
import {
  LayoutDashboard,
  TrafficCone,
  BriefcaseBusiness,
  MoonStar,
  FilePlus2,
  ClipboardPlus,
  Users,
  LogOut,
  ClipboardList,
  ClipboardCheck,
  ShieldCheck,
  CheckCircle2,
} from "lucide-react";

import Dashboard from "./pages/Dashboard";
import Closures from "./pages/Closures";
import ClosureDetail from "./pages/ClosureDetail";
import AddClosure from "./pages/AddClosure";
import EditClosure from "./pages/EditClosure";
import ClosureBriefing from "./pages/ClosureBriefing";
import Jobs from "./pages/Jobs";
import JobDetail from "./pages/JobDetail";
import AddJob from "./pages/AddJob";
import EditJob from "./pages/EditJob";
import NightWorks from "./pages/NightWorks";
import NightWorksPrint from "./pages/NightWorksPrint";
import Login from "./pages/Login";
import AdminUsers from "./pages/AdminUsers";
import WorkSheet from "./pages/WorkSheet";
import SupervisorCheckSheet from "./pages/SupervisorCheckSheet";
import NightManagerReview from "./pages/NightManagerReview";
import LeadSchedulerReview from "./pages/LeadSchedulerReview";

import { AuthProvider, useAuth } from "./context/AuthContext";
import ProtectedRoute from "./components/ProtectedRoute";
import "./styles.css";
import egisLogo from "../src/assets/e-logo.svg";

function AppShell() {
  const { user, logout } = useAuth();

  const navItems = [
    {
      to: "/",
      label: "Dashboard",
      icon: LayoutDashboard,
      roles: ["admin", "planner", "viewer", "night_manager", "lead_scheduler"],
    },
    {
      to: "/closures",
      label: "Closures",
      icon: TrafficCone,
      roles: ["admin", "planner", "viewer", "supervisor", "night_manager", "lead_scheduler"],
    },
    {
      to: "/jobs",
      label: "Jobs",
      icon: BriefcaseBusiness,
      roles: ["admin", "planner", "viewer", "night_manager", "lead_scheduler"],
    },
    {
      to: "/nightworks",
      label: "Night Works",
      icon: MoonStar,
      roles: ["admin", "planner", "viewer", "supervisor", "night_manager", "lead_scheduler"],
    },
    {
      to: "/supervisor-checksheet",
      label: "Supervisor Checks",
      icon: ClipboardCheck,
      roles: ["admin", "supervisor"],
    },
    {
      to: "/night-manager-review",
      label: "Manager Review",
      icon: ShieldCheck,
      roles: ["admin", "night_manager"],
    },
    {
      to: "/lead-scheduler-review",
      label: "Final Completion",
      icon: CheckCircle2,
      roles: ["admin", "lead_scheduler"],
    },
    {
      to: "/add-closure",
      label: "Add Closure",
      icon: FilePlus2,
      roles: ["admin", "planner"],
    },
    {
      to: "/add-job",
      label: "Add Job",
      icon: ClipboardPlus,
      roles: ["admin", "planner"],
    },
    {
      to: "/work-sheet",
      label: "Work Sheet",
      icon: ClipboardList,
      roles: ["admin", "planner", "viewer", "supervisor", "night_manager", "lead_scheduler"],
    },
    {
      to: "/admin/users",
      label: "Users",
      icon: Users,
      roles: ["admin"],
    },
  ];

  const allowedNavItems = navItems.filter((item) =>
    item.roles.includes(user?.role)
  );

  return (
    <div className="app-shell">
      <aside className="sidebar-modern">
        <div className="sidebar-brand">
          <div className="sidebar-brand-mark">
            <img
              src={egisLogo}
              alt="Egis Logo"
              className="worksheet-logo-img"
            />
          </div>

          <div className="sidebar-brand-text">
            <div className="sidebar-brand-title">M40 Planner</div>
            <div className="sidebar-brand-subtitle">
              {user?.role ? `${user.role}` : "Road Operations"}
            </div>
          </div>
        </div>

        <nav className="sidebar-nav">
          {allowedNavItems.map((item) => {
            const Icon = item.icon;

            return (
              <NavLink
                key={item.to}
                to={item.to}
                end={item.to === "/"}
                className={({ isActive }) =>
                  `sidebar-link ${isActive ? "active" : ""}`
                }
              >
                <span className="sidebar-link-icon">
                  <Icon size={18} strokeWidth={2.2} />
                </span>
                <span className="sidebar-link-label">{item.label}</span>
              </NavLink>
            );
          })}
        </nav>

        <div className="sidebar-footer">
          <div className="sidebar-footer-card">
            <div className="sidebar-footer-title">
              {user?.name || "Signed in"}
            </div>
            <div className="sidebar-footer-text">{user?.email || ""}</div>

            <button
              type="button"
              onClick={logout}
              className="sidebar-logout-btn"
              style={{ marginTop: "12px", width: "100%" }}
            >
              <span
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  gap: "8px",
                }}
              >
                <LogOut size={16} />
                Sign Out
              </span>
            </button>
          </div>
        </div>
      </aside>

      <main className="main-content-modern">
        <Routes>
          <Route
            path="/"
            element={
              <ProtectedRoute roles={["admin", "planner", "viewer", "night_manager", "lead_scheduler"]}>
                <Dashboard />
              </ProtectedRoute>
            }
          />

          <Route
            path="/closures"
            element={
              <ProtectedRoute roles={["admin", "planner", "viewer", "supervisor", "night_manager", "lead_scheduler"]}>
                <Closures />
              </ProtectedRoute>
            }
          />

          <Route
            path="/closures/:id"
            element={
              <ProtectedRoute roles={["admin", "planner", "viewer", "supervisor", "night_manager", "lead_scheduler"]}>
                <ClosureDetail />
              </ProtectedRoute>
            }
          />

          <Route
            path="/closures/:id/edit"
            element={
              <ProtectedRoute roles={["admin", "planner"]}>
                <EditClosure />
              </ProtectedRoute>
            }
          />

          <Route
            path="/closures/:id/briefing"
            element={
              <ProtectedRoute roles={["admin", "planner", "viewer", "supervisor", "night_manager", "lead_scheduler"]}>
                <ClosureBriefing />
              </ProtectedRoute>
            }
          />

          <Route
            path="/add-closure"
            element={
              <ProtectedRoute roles={["admin", "planner"]}>
                <AddClosure />
              </ProtectedRoute>
            }
          />

          <Route
            path="/jobs"
            element={
              <ProtectedRoute roles={["admin", "planner", "viewer", "night_manager", "lead_scheduler"]}>
                <Jobs />
              </ProtectedRoute>
            }
          />

          <Route
            path="/jobs/:id"
            element={
              <ProtectedRoute roles={["admin", "planner", "viewer", "night_manager", "lead_scheduler"]}>
                <JobDetail />
              </ProtectedRoute>
            }
          />

          <Route
            path="/jobs/:id/edit"
            element={
              <ProtectedRoute roles={["admin", "planner"]}>
                <EditJob />
              </ProtectedRoute>
            }
          />

          <Route
            path="/add-job"
            element={
              <ProtectedRoute roles={["admin", "planner"]}>
                <AddJob />
              </ProtectedRoute>
            }
          />

          <Route
            path="/nightworks"
            element={
              <ProtectedRoute roles={["admin", "planner", "viewer", "supervisor", "night_manager", "lead_scheduler"]}>
                <NightWorks />
              </ProtectedRoute>
            }
          />

          <Route
            path="/nightworks-print"
            element={
              <ProtectedRoute roles={["admin", "planner", "viewer", "supervisor", "night_manager", "lead_scheduler"]}>
                <NightWorksPrint />
              </ProtectedRoute>
            }
          />

          <Route
            path="/work-sheet"
            element={
              <ProtectedRoute roles={["admin", "planner", "viewer", "supervisor", "night_manager", "lead_scheduler"]}>
                <WorkSheet />
              </ProtectedRoute>
            }
          />

          <Route
            path="/supervisor-checksheet"
            element={
              <ProtectedRoute roles={["admin", "supervisor"]}>
                <SupervisorCheckSheet />
              </ProtectedRoute>
            }
          />

          <Route
            path="/night-manager-review"
            element={
              <ProtectedRoute roles={["admin", "night_manager"]}>
                <NightManagerReview />
              </ProtectedRoute>
            }
          />

          <Route
            path="/lead-scheduler-review"
            element={
              <ProtectedRoute roles={["admin", "lead_scheduler"]}>
                <LeadSchedulerReview />
              </ProtectedRoute>
            }
          />

          <Route
            path="/admin/users"
            element={
              <ProtectedRoute roles={["admin"]}>
                <AdminUsers />
              </ProtectedRoute>
            }
          />
        </Routes>
      </main>
    </div>
  );
}

function App() {
  return (
    <AuthProvider>
      <Router>
        <Routes>
          <Route path="/login" element={<Login />} />
          <Route path="/*" element={<AppShell />} />
        </Routes>
      </Router>
    </AuthProvider>
  );
}

export default App;