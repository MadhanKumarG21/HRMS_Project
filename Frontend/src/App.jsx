import { Suspense, lazy, useState } from "react";
import { Routes, Route, Navigate, Outlet } from "react-router-dom";
import { useAuth } from "./hooks/useAuth.jsx";
import { ModulesProvider } from "./Components/modules/ModulesContext.jsx";
import ModuleGate from "./Components/ModuleGate.jsx";
import Sidebar from "./Components/Sidebar.jsx";
import Topbar from "./Components/Topbar.jsx";
import "./styles/layout.css";

// ─── Lazy-loaded page components ──────────────────────────────────
// Each page is loaded on demand, reducing the initial bundle size.
const Login = lazy(() => import("./pages/Login.jsx"));
const Dashboard = lazy(() => import("./pages/Dashboard.jsx"));
const Modules = lazy(() => import("./pages/Modules.jsx"));
const Rolespermissions = lazy(() => import("./pages/RolesAndPermissions.jsx"));
const AuditLog = lazy(() => import("./pages/AuditLog.jsx"));
const Recruitment = lazy(() => import("./pages/Recruitment.jsx"));
const Employees = lazy(() => import("./pages/Employees.jsx"));
const LeaveManagement = lazy(() => import("./pages/LeaveManagement.jsx"));
const Attendance = lazy(() => import("./pages/Attendance.jsx"));
const Reports = lazy(() => import("./pages/Reports.jsx"));
const Settings = lazy(() => import("./pages/Settings.jsx"));
const Notification = lazy(() => import("./pages/Notification.jsx"));  
const EmployeeDashboard = lazy(() => import("./pages/EmployeeDashboard.jsx"));

/**
 * LoadingScreen — Shown while the auth session is being verified
 * or while a lazy-loaded page chunk is being fetched.
 */
function LoadingScreen() {
  return (
    <div className="loading-screen">
      <div className="spinner" />
      <p>Loading...</p>
    </div>
  );
}

function RoleDashboard() {
  const { isAdmin, roleName } = useAuth();
  if (isAdmin) return <Dashboard />;
  return <EmployeeDashboard roleName={roleName} />;
}

function ProtectedRoute({ children }) {
  const { isAuthenticated, loading } = useAuth();

  if (loading) return <LoadingScreen />;
  if (!isAuthenticated) return <Navigate to="/login" replace />;
  return children;
}

function GuestRoute({ children }) {
  const { isAuthenticated, loading } = useAuth();

  if (loading) return <LoadingScreen />;
  if (isAuthenticated) return <Navigate to="/dashboard" replace />;
  return children;
}

import { GenericPageSkeleton } from "./Components/common/Skeleton.jsx";

// App Shell Layout — wraps the sidebar, topbar, and outlet for authenticated pages.
function AppShell() {
  const [mobileNavOpen, setMobileNavOpen] = useState(false);

  return (
     <ModulesProvider>
    <div className="shell">
      <Sidebar
        mobileOpen={mobileNavOpen}
        onMobileClose={() => setMobileNavOpen(false)}
      />
      <div className="main">
        <Topbar
          mobileNavOpen={mobileNavOpen}
          onMenuClick={() => setMobileNavOpen(true)}
        />
        <main className="main-content">
          <Suspense fallback={<GenericPageSkeleton />}>
            <Outlet />
          </Suspense>
        </main>
      </div>
    </div>
    </ModulesProvider>
  );
}

export default function App() {
  return (
   
     
        <Suspense fallback={<LoadingScreen />}>
          <Routes>
            {/* Login Route — accessible only to guests */}
            <Route
              path="/login"
              element={
                <GuestRoute>
                  <Login />
                </GuestRoute>
              }
            />

            {/* Protected Routes — require authentication */}
            <Route
              path="/"
              element={
                <ProtectedRoute>
                  <AppShell />
                </ProtectedRoute>
              }
            >
              {/* Index Route — redirect to dashboard */}
              <Route index element={<Navigate to="/dashboard" replace />} />

              {/* Main Pages — each gated by its module's active/suspended status */}
              <Route
                path="dashboard"
                element={
                  <ModuleGate moduleKey="dashboard">
                    <RoleDashboard />
                  </ModuleGate>
                }
              />
              
              <Route
                path="employees"
                element={
                  <ModuleGate moduleKey="employees" permission="employees.view">
                    <Employees />
                  </ModuleGate>
                }
              />
              <Route
                path="notification"
                element={
                  <ModuleGate moduleKey="notification">
                    <Notification />
                  </ModuleGate>
                }
              />
              <Route
                path="notifications"
                element={
                  <ModuleGate moduleKey="notification">
                    <Notification />
                  </ModuleGate>
                }
              />
            
              <Route
                path="leave"
                element={
                  <ModuleGate moduleKey="leave_management" permission="leave.view">
                    <LeaveManagement />
                  </ModuleGate>
                }
              />
              <Route
                path="attendance"
                element={
                  <ModuleGate moduleKey="attendance" permission="attendance.view">
                    <Attendance />
                  </ModuleGate>
                }
              />
              <Route
                path="roles"
                element={
                  <ModuleGate moduleKey="roles" adminOnly>
                    <Rolespermissions />
                  </ModuleGate>
                }
              />
              <Route
                path="audit"
                element={
                  <ModuleGate moduleKey="audit" permission="audit.view">
                    <AuditLog />
                  </ModuleGate>
                }
              />

              {/* Modules page manages module status itself, so it is not gated */}
              <Route path="modules" element={<ModuleGate adminOnly><Modules /></ModuleGate>} />

              <Route
                path="recruitment"
                element={
                  <ModuleGate moduleKey="recruitment" permission="recruitment.manage">
                    <Recruitment />
                  </ModuleGate>
                }
              />
              <Route
                path="reports"
                element={
                  <ModuleGate moduleKey="reports" permission="reports.view">
                    <Reports />
                  </ModuleGate>
                }
              />
              <Route
                path="settings"
                element={
                  <ModuleGate moduleKey="settings" adminOnly>
                    <Settings />
                  </ModuleGate>
                }
              />

              {/* 404 — Catch all unknown routes */}
              <Route path="*" element={<Navigate to="/dashboard" replace />} />
            </Route>
          </Routes>
        </Suspense>

    
  );
}