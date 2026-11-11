import { useEffect, useState, useMemo } from "react";
import { api } from "../services/api.js";
import Icon from "../Components/Icon.jsx";
import RoleModal from "../Components/Rolesandpermissions/RoleModal.jsx";
import DeleteRoleModal from "../Components/Rolesandpermissions/DeleteRoleModal.jsx";
import "../styles/RolesPermissions.css";

//  Permission Registry

const ALL_PERMISSIONS = [
  { key: "employees.view", label: "View Employees", category: "Employees" },
  { key: "employees.create", label: "Create Employees", category: "Employees" },
  { key: "employees.update", label: "Update Employees", category: "Employees" },
  { key: "employees.delete", label: "Delete Employees", category: "Employees" },
  { key: "roles.view", label: "View Roles", category: "Roles" },
  { key: "leave.view", label: "View Leaves", category: "Leave" },
  { key: "leave.create", label: "Apply Leave", category: "Leave" },
  { key: "leave.approve", label: "Approve Leave", category: "Leave" },
  { key: "leave.reject", label: "Reject Leave", category: "Leave" },
  { key: "attendance.view", label: "View Attendance", category: "Attendance" },
  { key: "attendance.mark", label: "Mark Attendance", category: "Attendance" },
  { key: "attendance.update", label: "Update Attendance", category: "Attendance" },
  { key: "attendance.delete", label: "Delete Attendance", category: "Attendance" },
  { key: "audit.view", label: "View Audit Logs", category: "Audit" },
  { key: "audit.export", label: "Export Audit Logs", category: "Audit" },
  { key: "reports.view", label: "View Reports", category: "Reports" },
  { key: "reports.export", label: "Export Reports", category: "Reports" },
  { key: "all:access", label: "Full Admin Access", category: "System" },
];

//  Role Helper Mappings

const ROLE_ICON_MAP = {
  Admin: "admin_panel_settings",
  HR: "groups",
  Manager: "supervisor_account",
  Employee: "badge",
};

const ROLE_COLOR_MAP = {
  Admin: "danger",
  HR: "warning",
  Manager: "accent-purple",
  Employee: "primary",
};

const ROLE_TAG_MAP = {
  Admin: "Root",
  HR: "Personnel",
  Manager: "Team Lead",
  Employee: "Default",
};

const RolesAndPermissions = () => {
  //  State
  const [roles, setRoles] = useState([]);
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [permissionFilter, setPermissionFilter] = useState("");
  const [expandedRoleId, setExpandedRoleId] = useState(null);
  const [viewMode, setViewMode] = useState("grid");

  // Modal states
  const [modalOpen, setModalOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [selectedRole, setSelectedRole] = useState(null);

  //  Load Data

  const loadData = async () => {
    try {
      setLoading(true);
      setError(null);

      const [rolesRes, usersRes] = await Promise.all([
        api.getRoles(),
        api.getUsers(),
      ]);

      setRoles(Array.isArray(rolesRes) ? rolesRes : rolesRes.roles || []);
      // api.getUsers() returns { data, total, page, totalPages } — not
      // { users }. Reading the wrong key silently left `users` empty,
      // which made getUserCountForRole() always return 0 and let the
      // Delete Role button stay enabled even when users were assigned
      // (backend correctly rejected those with a 409).
      setUsers(Array.isArray(usersRes) ? usersRes : usersRes.data || []);
    } catch (err) {
      setError(err.message || "Failed to load data");
      console.error("Failed to load roles:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  //  Computed Values

  const getUserCountForRole = (roleName) => {
    return users.filter((u) => u.role === roleName).length;
  };

  const getUsersForRole = (roleName) => {
    return users.filter((u) => u.role === roleName);
  };

  const filteredRoles = useMemo(() => {
    return roles.filter((role) => {
      const nameMatch = role.name
        .toLowerCase()
        .includes(searchTerm.toLowerCase());
      const permMatch = permissionFilter
        ? role.permissions?.some((p) =>
            p.toLowerCase().includes(permissionFilter.toLowerCase()),
          )
        : true;
      return nameMatch && permMatch;
    });
  }, [roles, searchTerm, permissionFilter]);

  const allPermissionKeys = useMemo(() => {
    const keys = new Set();
    roles.forEach((r) => r.permissions?.forEach((p) => keys.add(p)));
    return Array.from(keys).sort();
  }, [roles]);

  //  Handlers

  const handleCreateRole = () => {
    setSelectedRole(null);
    setModalOpen(true);
  };

  const handleEditRole = (role) => {
    setSelectedRole(role);
    setModalOpen(true);
  };

  const handleDeleteRole = (role) => {
    setSelectedRole(role);
    setDeleteOpen(true);
  };

  const handleDuplicateRole = (role) => {
    setSelectedRole({
      ...role,
      _id: undefined,
      name: `${role.name} (copy)`,
    });
    setModalOpen(true);
  };

  const handleRoleSaved = () => {
    setSuccess("Role saved successfully!");
    setTimeout(() => setSuccess(null), 3000);
    loadData();
    setModalOpen(false);
  };

  const handleRoleDeleted = () => {
    setSuccess("Role deleted successfully!");
    setTimeout(() => setSuccess(null), 3000);
    loadData();
    setDeleteOpen(false);
  };

  const toggleExpand = (roleId) => {
    setExpandedRoleId(expandedRoleId === roleId ? null : roleId);
  };

  //  Render Helpers

  const renderPermissionTags = (permissions) => {
    if (!permissions || permissions.length === 0) {
      return <span className="permission-empty">No permissions assigned</span>;
    }
    return permissions.map((perm) => {
      const info = ALL_PERMISSIONS.find((p) => p.key === perm);
      const isAdmin = perm === "all:access";
      return (
        <span
          key={perm}
          className={`permission-tag ${isAdmin ? "tag-admin" : ""}`}
          title={info?.label || perm}
        >
          {info?.label || perm}
        </span>
      );
    });
  };

  //  Export Matrix PDF

  const handleExportMatrix = () => {
    // Simple CSV export for the matrix
    let csv = "Permission";
    roles.forEach((r) => {
      csv += `,${r.name}`;
    });
    csv += "\n";

    ALL_PERMISSIONS.forEach((perm) => {
      csv += perm.label;
      roles.forEach((role) => {
        const has = role.permissions?.includes(perm.key) || false;
        csv += `,${has ? "Yes" : "No"}`;
      });
      csv += "\n";
    });

    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `permission-matrix-${new Date().toISOString().split("T")[0]}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  //  Loading / Error

  if (loading) {
    return (
      <div className="loader-container">
        <div className="spinner"></div>
        <p>Loading roles…</p>
      </div>
    );
  }

  //  Render

  return (
    <main className="roles-main">
      <div className="roles-content">
        {/* Header */}
        <div className="page-header">
          <div>
            <h2 className="page-title">Roles & Permissions</h2>
            <p className="page-subtitle">
              {roles.length} roles · {users.length} users assigned
              {roles.find((r) => r.isDefault) && (
                <span className="default-badge">
                  <Icon name="verified" /> Default:{" "}
                  {roles.find((r) => r.isDefault)?.name}
                </span>
              )}
            </p>
          </div>
          <div className="header-actions">
            <button
              className="btn-outline btn-sm"
              onClick={() => setViewMode(viewMode === "grid" ? "list" : "grid")}
              title="Toggle view"
            >
              <Icon name={viewMode === "grid" ? "view_list" : "view_module"} />
            </button>
            <button className="btn-primary btn-lg" onClick={handleCreateRole}>
              <Icon name="add" />
              Create Role
            </button>
          </div>
        </div>

        {/* Success / Error Messages */}
        {success && (
          <div className="success-message">
            <Icon name="check_circle" /> {success}
          </div>
        )}
        {error && (
          <div className="error-message">
            <Icon name="error" /> {error}
          </div>
        )}

        {/* Stats Cards */}
        <div className="stats-grid roles-stats-grid">
          {roles.map((role) => {
            const count = getUserCountForRole(role.name);
            const isDefault = role.isDefault;
            const iconName = ROLE_ICON_MAP[role.name] || "badge";
            const color = ROLE_COLOR_MAP[role.name] || "primary";
            const tag = ROLE_TAG_MAP[role.name] || "";

            return (
              <div
                key={role._id}
                className={`stat-card role-stat-card color-${color}`}
              >
                <div className="stat-card-header">
                  <div className={`stat-icon-bg bg-${color}`}>
                    <Icon name={iconName} />
                  </div>
                  {isDefault && (
                    <span className="stat-tag tag-default">Default</span>
                  )}
                  {tag && !isDefault && (
                    <span className={`stat-tag tag-${color}`}>{tag}</span>
                  )}
                </div>
                <h3 className="stat-role-name">{role.name}</h3>
                <p className="stat-role-count">
                  {count} Account{count !== 1 ? "s" : ""}
                </p>
                <p className="stat-role-desc">
                  {role.description || "No description"}
                </p>
              </div>
            );
          })}
        </div>

        {/* Filter Bar */}
        <div className="filter-bar">
          <div className="search-input-wrapper">
            <input
              type="text"
              placeholder=" 🔍︎ Search roles…"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="search-input"
            />
          </div>
          <div className="filter-select-wrapper">
            <select
              value={permissionFilter}
              onChange={(e) => setPermissionFilter(e.target.value)}
              className="filter-select"
            >
              <option value="">All permissions</option>
              {allPermissionKeys.map((p) => (
                <option key={p} value={p}>
                  {ALL_PERMISSIONS.find((perm) => perm.key === p)?.label || p}
                </option>
              ))}
            </select>
          </div>
          <button
            className="btn-clear-filters"
            onClick={() => {
              setSearchTerm("");
              setPermissionFilter("");
            }}
          >
            Clear Filters
          </button>
        </div>

        {/* Roles Grid / List */}
        <div className={viewMode === "grid" ? "roles-grid" : "roles-list"}>
          {filteredRoles.length > 0 ? (
            filteredRoles.map((role) => {
              const userCount = getUserCountForRole(role.name);
              const roleUsers = getUsersForRole(role.name);
              const isAdmin = role.permissions?.includes("all:access");
              const isExpanded = expandedRoleId === role._id;

              return (
                <div
                  className={`role-card ${isExpanded ? "expanded" : ""}`}
                  key={role._id || role.name}
                >
                  {/* Card Header */}
                  <div
                    className="role-card-header"
                    onClick={() => toggleExpand(role._id)}
                  >
                    <div className="role-info">
                      <div className={`role-icon ${isAdmin ? "admin" : ""}`}>
                        <Icon
                          name={isAdmin ? "admin_panel_settings" : "badge"}
                        />
                      </div>
                      <div>
                        <h3 className="role-name">{role.name}</h3>
                        <span className="role-meta">
                          {userCount} user{userCount !== 1 ? "s" : ""} assigned
                          {role.isDefault && (
                            <span className="default-tag">Default</span>
                          )}
                        </span>
                      </div>
                    </div>
                    <div
                      className="role-actions"
                      onClick={(e) => e.stopPropagation()}
                    >
                      <button
                        className="btn-action edit"
                        onClick={() => handleEditRole(role)}
                        title="Edit role"
                      >
                        <Icon name="edit" />
                      </button>
                      <button
                        className="btn-action duplicate"
                        onClick={() => handleDuplicateRole(role)}
                        title="Duplicate role"
                      >
                        <Icon name="content_copy" />
                      </button>
                      {!isAdmin && (
                        <button
                          className="btn-action danger"
                          onClick={() => handleDeleteRole(role)}
                          title="Delete role"
                        >
                          <Icon name="delete" />
                        </button>
                      )}
                      <button
                        className={`btn-action expand ${isExpanded ? "active" : ""}`}
                        onClick={() => toggleExpand(role._id)}
                      >
                        <Icon
                          name={isExpanded ? "expand_less" : "expand_more"}
                        />
                      </button>
                    </div>
                  </div>

                  {/* Permissions */}
                  <div className="role-permissions">
                    <p className="permissions-title">Permissions</p>
                    <div className="permission-tags">
                      {renderPermissionTags(role.permissions)}
                    </div>
                  </div>

                  {/* Expanded Details */}
                  {isExpanded && (
                    <div className="role-details">
                      <div className="detail-section">
                        <h4>Description</h4>
                        <p>{role.description || "No description provided."}</p>
                      </div>
                      <div className="detail-section">
                        <h4>Users with this role ({userCount})</h4>
                        {userCount > 0 ? (
                          <ul className="user-list">
                            {roleUsers.slice(0, 5).map((u) => (
                              <li key={u._id}>
                                <span className="user-name">{u.name}</span>
                                <span className="user-email">{u.email}</span>
                              </li>
                            ))}
                            {userCount > 5 && (
                              <li className="more-users">
                                … and {userCount - 5} more
                              </li>
                            )}
                          </ul>
                        ) : (
                          <p className="no-users">
                            No users assigned to this role.
                          </p>
                        )}
                      </div>
                      <div className="detail-section meta">
                        <span>
                          Created:{" "}
                          {role.createdAt
                            ? new Date(role.createdAt).toLocaleDateString()
                            : "N/A"}
                        </span>
                        <span>
                          Updated:{" "}
                          {role.updatedAt
                            ? new Date(role.updatedAt).toLocaleDateString()
                            : "N/A"}
                        </span>
                      </div>
                      {isAdmin && (
                        <div className="role-badge-admin">
                          <Icon name="verified" />
                          Administrator Role — Cannot be deleted
                        </div>
                      )}
                    </div>
                  )}
                </div>
              );
            })
          ) : (
            <div className="empty-state">
              <Icon name="search_off" />
              <p>No roles found matching your filters.</p>
            </div>
          )}
        </div>
      </div>

      {/*  Modals  */}

      <RoleModal
        key={`${modalOpen}-${selectedRole?._id || selectedRole?.name || "new-role"}`}
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        editingRole={selectedRole}
        allPermissions={ALL_PERMISSIONS}
        onRoleSaved={handleRoleSaved}
      />

      <DeleteRoleModal
        open={deleteOpen}
        onClose={() => setDeleteOpen(false)}
        role={selectedRole}
        userCount={selectedRole ? getUserCountForRole(selectedRole.name) : 0}
        onRoleDeleted={handleRoleDeleted}
      />

      {/*  Module Access Matrix  */}

      <div className="matrix-container">
        <div className="matrix-header">
          <h3 className="matrix-title">Module Access Matrix</h3>
          <div className="matrix-actions">
            <button className="btn-outline btn-sm" onClick={handleExportMatrix}>
              Export CSV
            </button>
            <button
              className="btn-outline btn-sm"
              onClick={() => window.print()}
            >
              Print
            </button>
          </div>
        </div>
        <div className="matrix-table-wrapper">
          <table className="matrix-table">
            <thead>
              <tr>
                <th className="matrix-th permission-label-col">PERMISSION</th>
                {roles.map((role) => (
                  <th key={role._id} className="matrix-th text-center">
                    {role.name}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {ALL_PERMISSIONS.map((perm) => (
                <tr key={perm.key} className="matrix-row">
                  <td className="matrix-td permission-label">
                    {perm.label}
                    <span className="perm-key-hint">{perm.key}</span>
                  </td>
                  {roles.map((role) => {
                    const has = role.permissions?.includes(perm.key) || false;
                    return (
                      <td key={role._id} className="matrix-td text-center">
                        <span
                          className={`permission-indicator ${has ? "has" : "no"}`}
                        >
                          {has ? "✓" : "✗"}
                        </span>
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </main>
  );
};

export default RolesAndPermissions;