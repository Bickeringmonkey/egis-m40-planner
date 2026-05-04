import { BrowserRouter as Router, Routes, Route, NavLink } from "react-router-dom";
import {
  LayoutDashboard,
  TrafficCone,
  BriefcaseBusiness,
  MoonStar,
  Users,
  LogOut,
  ClipboardList,
  ShieldCheck,
  CheckCircle2,
  FileSpreadsheet,
  Upload,
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
import NightManagerReview from "./pages/NightManagerReview";
import LeadSchedulerReview from "./pages/LeadSchedulerReview";
import Checksheet from "./pages/Checksheet";
import ExcelImport from "./pages/ExcelImport";
import ImportJobs from "./pages/ImportJobs";
import Issues from "./pages/Issues";
import Subcontractors from "./pages/Subcontractors";

import { AuthProvider, useAuth } from "./context/AuthContext";
import ProtectedRoute from "./components/ProtectedRoute";
import "./styles.css";
import egisLogo from "../src/assets/e-logo.svg";

function AppShell() {
  const { user, logout } = useAuth();

  const navGroups = [
    {
      title: "Main",
      items: [
        {
          to: "/",
          label: "Dashboard",
          icon: LayoutDashboard,
          roles: ["admin", "planner", "viewer", "night_manager", "lead_scheduler"],
        },
      ],
    },
    {
      title: "Planning",
      items: [
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
          to: "/work-sheet",
          label: "Work Sheet",
          icon: ClipboardList,
          roles: ["admin", "planner", "viewer", "supervisor", "night_manager", "lead_scheduler"],
        },
        //{
        //  to: "/import-jobs",
        //  label: "Import Jobs",
        //  icon: Upload, // import from lucide-react
        //  roles: ["admin", "planner"],
        //},
      ],
    },
    {
      title: "Completion",
      items: [
        {
          to: "/checksheet",
          label: "Checklist",
          icon: ClipboardList,
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
          to: "/subcontractors",
          label: "Subcontractors",
          icon: Users,
          roles: ["admin", "planner", "viewer", "night_manager", "lead_scheduler"],
        },
      ],
    },
    {
      title: "Admin",
      items: [
        {
          to: "/excel-import",
          label: "Excel Import",
          icon: FileSpreadsheet,
          roles: ["admin", "planner"],
        },
        {
          to: "/admin/users",
          label: "Users",
          icon: Users,
          roles: ["admin"],
        },
      ],
    },
  ];

  const allowedNavGroups = navGroups
    .map((group) => ({
      ...group,
      items: group.items.filter((item) => item.roles.includes(user?.role)),
    }))
    .filter((group) => group.items.length > 0);

  return (
    <div className="app-shell">
      <aside className="sidebar-modern">
        <div className="sidebar-brand">
          <div className="sidebar-brand-mark">
            <img src={egisLogo} alt="Egis Logo" className="worksheet-logo-img" />
          </div>

          <div className="sidebar-brand-text">
            <div className="sidebar-brand-title">M40 Planner</div>
            <div className="sidebar-brand-subtitle">
              {user?.role ? user.role : "Road Operations"}
            </div>
          </div>
        </div>

        <nav className="sidebar-nav">
          {allowedNavGroups.map((group) => (
            <div key={group.title} className="sidebar-group">
              <div className="sidebar-group-title">{group.title}</div>

              {group.items.map((item) => {
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
            </div>
          ))}
        </nav>

        <div className="sidebar-footer">
          <div className="sidebar-footer-card">
            <div className="sidebar-footer-title">{user?.name || "Signed in"}</div>
            <div className="sidebar-footer-text">{user?.email || ""}</div>

            <button
              type="button"
              onClick={logout}
              className="sidebar-logout-btn"
              style={{ marginTop: "12px", width: "100%" }}
            >
              <span style={{ display: "inline-flex", alignItems: "center", gap: "8px" }}>
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
            path="/checksheet"
            element={
              <ProtectedRoute roles={["admin", "supervisor"]}>
                <Checksheet />
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
            path="/subcontractors"
            element={
              <ProtectedRoute roles={["admin", "planner", "viewer", "night_manager", "lead_scheduler"]}>
                <Subcontractors />
              </ProtectedRoute>
            }
          />

          <Route
            path="/excel-import"
            element={
              <ProtectedRoute roles={["admin", "planner"]}>
                <ExcelImport />
              </ProtectedRoute>
            }
          />
          <Route
            path="/import-jobs"
            element={
              <ProtectedRoute roles={["admin", "planner"]}>
                <ImportJobs />
              </ProtectedRoute>
            }
          />
          <Route path="/issues" element={<Issues />} />

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