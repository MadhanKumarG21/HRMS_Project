import { NavLink, useNavigate } from "react-router-dom";
import { useAuth } from "../hooks/useAuth.jsx";
import { useModules } from "./modules/ModulesContext.jsx";
import Icon from "./Icon.jsx";
import "../styles/sidebar.css";

const NAV_ITEMS = [
  { to: "/dashboard", icon: "dashboard", label: "Dashboard", moduleKey: "dashboard" },
  { to: "/employees", icon: "groups", label: "Employees", moduleKey: "employees" },
  { to: "/leave", icon: "event_repeat", label: "Leave Management", moduleKey: "leave_management" },
  { to: "/attendance", icon: "online_prediction", label: "Attendance", moduleKey: "attendance" },
  { to: "/notifications", icon: "notifications", label: "Notifications", moduleKey: "notification" },
  { to: "/roles", icon: "lock_open", label: "Roles & Permissions", moduleKey: "roles" },
  { to: "/audit", icon: "assignment", label: "Audit Logs", moduleKey: "audit" },
  { to: "/modules", icon: "extension", label: "Modules" },
  { to: "/reports", icon: "bar_chart", label: "Reports", moduleKey: "reports" },
  { to: "/recruitment", icon: "person_add", label: "Recruitment", moduleKey: "recruitment" },
  { to: "/settings", icon: "settings", label: "Settings", moduleKey: "settings" },
];

export default function Sidebar({ mobileOpen = false, onMobileClose = () => {} }) {
  const { logout, hasPermission, isAdmin, roleName } = useAuth();
  const { isModuleActive } = useModules();
  const navigate = useNavigate();

  const permissionForPath = {
    "/employees": "employees.view",
    "/leave": "leave.view",
    "/attendance": "attendance.view",
    "/roles": "admin",
    "/audit": "audit.view",
    "/reports": "reports.view",
    "/recruitment": "recruitment.manage",
    "/settings": "admin",
    "/modules": "admin",
  };
  const visibleNavItems = NAV_ITEMS.filter((item) => {
    if (item.moduleKey && !isModuleActive(item.moduleKey)) return false;
    if (item.to === "/dashboard") {
      return isModuleActive("dashboard");
    }
    const permission = permissionForPath[item.to];
    if (permission === "admin") return isAdmin;
    if (permission) return hasPermission(permission);
    return true;
  });

  const handleLogout = async () => {
    onMobileClose();
    await logout();
    navigate("/login");
  };

  return (
    <>
      <div
        className={`mobile-sidebar-backdrop${mobileOpen ? " show" : ""}`}
        onClick={onMobileClose}
        aria-hidden="true"
      />

      <aside
        id="primary-sidebar"
        className={`sidebar${mobileOpen ? " mobile-open" : ""}`}
        aria-label="Main navigation"
      >
        <div className="sidebar-brand">
          <div className="sidebar-brand-content">
            <strong>TechNova HRMS</strong>
            <span>{roleName || "Workspace"}</span>
          </div>
          <button
            type="button"
            className="mobile-sidebar-close"
            onClick={onMobileClose}
            aria-label="Close navigation menu"
          >
            <Icon name="close" />
          </button>
        </div>

        <nav className="sidebar-nav">
          {visibleNavItems.map(({ to, icon, label }) => (
            <NavLink
              key={to}
              to={to}
              className={({ isActive }) =>
                `nav-item${isActive ? " active" : ""}`
              }
              onClick={onMobileClose}
            >
              <span className="nav-item-icon">
                <Icon name={icon} />
              </span>
              <span>{label}</span>
            </NavLink>
          ))}
        </nav>

        <div className="sidebar-footer">
          <div className="sidebar-status">
            <span className="status-dot" />
            <div className="status-content">
              <span className="status-title">System</span>
              <span className="status-value">Operational</span>
            </div>
          </div>
          <button
            type="button"
            className="sidebar-logout"
            onClick={handleLogout}
          >
            <span className="sidebar-logout-icon">
              <Icon name="logout" />
            </span>
            <span>Logout</span>
          </button>
        </div>
      </aside>
    </>
  );
}