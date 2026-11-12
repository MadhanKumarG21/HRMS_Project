import { Suspense, lazy, useState } from "react";
import { Routes, Route, Navigate, Outlet } from "react-router-dom";
import { useAuth } from "./hooks/useAuth.jsx";
import { ModulesProvider } from "./Components/modules/ModulesContext.jsx";
import ModuleGate from "./Components/ModuleGate.jsx";
import Sidebar from "./Components/Sidebar.jsx";
import Topbar from "./Components/Topbar.jsx";
import {
  AuditLogSkeleton,
  AttendanceSkeleton,
  DashboardSkeleton,
  EmployeeDashboardSkeleton,
  EmployeesSkeleton,
  GenericPageSkeleton,
  LeaveSkeleton,
  ModulesSkeleton,
  NotificationSkeleton,
  RecruitmentSkeleton,
  ReportsSkeleton,
  RolesSkeleton,
  SettingsSkeleton,
} from "./Components/common/Skeleton.jsx";
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
  return (
    <Suspense
      fallback={
        isAdmin ? <DashboardSkeleton /> : <EmployeeDashboardSkeleton />
      }
    >
      {isAdmin ? <Dashboard /> : <EmployeeDashboard roleName={roleName} />}
    </Suspense>
  );
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
                  <Suspense fallback={<GenericPageSkeleton />}>
                    <Login />
                  </Suspense>
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
                  <Suspense fallback={<EmployeesSkeleton />}>
                    <ModuleGate moduleKey="employees" permission="employees.view">
                      <Employees />
                    </ModuleGate>
                  </Suspense>
                }
              />
              <Route
                path="notification"
                element={
                  <Suspense fallback={<NotificationSkeleton />}>
                    <ModuleGate moduleKey="notification">
                      <Notification />
                    </ModuleGate>
                  </Suspense>
                }
              />
              <Route
                path="notifications"
                element={
                  <Suspense fallback={<NotificationSkeleton />}>
                    <ModuleGate moduleKey="notification">
                      <Notification />
                    </ModuleGate>
                  </Suspense>
                }
              />
            
              <Route
                path="leave"
                element={
                  <Suspense fallback={<LeaveSkeleton />}>
                    <ModuleGate moduleKey="leave_management" permission="leave.view">
                      <LeaveManagement />
                    </ModuleGate>
                  </Suspense>
                }
              />
              <Route
                path="attendance"
                element={
                  <Suspense fallback={<AttendanceSkeleton />}>
                    <ModuleGate moduleKey="attendance" permission="attendance.view">
                      <Attendance />
                    </ModuleGate>
                  </Suspense>
                }
              />
              <Route
                path="roles"
                element={
                  <Suspense fallback={<RolesSkeleton />}>
                    <ModuleGate moduleKey="roles" adminOnly>
                      <Rolespermissions />
                    </ModuleGate>
                  </Suspense>
                }
              />
              <Route
                path="audit"
                element={
                  <Suspense fallback={<AuditLogSkeleton />}>
                    <ModuleGate moduleKey="audit" permission="audit.view">
                      <AuditLog />
                    </ModuleGate>
                  </Suspense>
                }
              />

              {/* Modules page manages module status itself, so it is not gated */}
              <Route
                path="modules"
                element={
                  <Suspense fallback={<ModulesSkeleton />}>
                    <ModuleGate adminOnly><Modules /></ModuleGate>
                  </Suspense>
                }
              />

              <Route
                path="recruitment"
                element={
                  <Suspense fallback={<RecruitmentSkeleton />}>
                    <ModuleGate moduleKey="recruitment" permission="recruitment.manage">
                      <Recruitment />
                    </ModuleGate>
                  </Suspense>
                }
              />
              <Route
                path="reports"
                element={
                  <Suspense fallback={<ReportsSkeleton />}>
                    <ModuleGate moduleKey="reports" permission="reports.view">
                      <Reports />
                    </ModuleGate>
                  </Suspense>
                }
              />
              <Route
                path="settings"
                element={
                  <Suspense fallback={<SettingsSkeleton />}>
                    <ModuleGate moduleKey="settings" adminOnly>
                      <Settings />
                    </ModuleGate>
                  </Suspense>
                }
              />

              {/* 404 — Catch all unknown routes */}
              <Route path="*" element={<Navigate to="/dashboard" replace />} />
            </Route>
          </Routes>
        </Suspense>

    
  );
}