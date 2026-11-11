// frontend/src/Pages/Employees.jsx
import { useState, useEffect, useCallback, useMemo } from "react";
import { useSearchParams } from "react-router-dom";
import { useAuth } from "../hooks/useAuth.jsx";
import { api } from "../services/api.js";
import Icon from "../Components/Icon.jsx";
import Pagination from "../Components/Pagination.jsx";
import EmployeeModal from "../Components/usermagement/EmployeeModal.jsx";
import EmployeeDetailModal from "../Components/usermagement/EmployeeDetailModal.jsx";
import "../styles/Employees.css";

export default function Employees() {
  const { hasPermission, isAdmin } = useAuth();
  const [searchParams, setSearchParams] = useSearchParams();
  const initialSearch = searchParams.get("search") || "";
  const selectedEmployeeId = searchParams.get("employeeId");
  const [employees, setEmployees] = useState([]);
  const [roles, setRoles] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [stats, setStats] = useState({});
  const [showModal, setShowModal] = useState(false);
  const [editingEmployee, setEditingEmployee] = useState(null);

  // Detail (view) modal state — separate from the create/edit modal above.
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [viewingEmployee, setViewingEmployee] = useState(null);

  const [search, setSearch] = useState(initialSearch);
  const [departmentFilter, setDepartmentFilter] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const[roleFilter,setRoleFilter]=useState("");
  const [currentPage, setCurrentPage] = useState(1);

  const employeesPerPage = 10;

  const loadData = useCallback(async () => {
    try {
      setLoading(true);
      setError("");
      
      const [employeesResult, rolesResult, statsResult] = await Promise.allSettled([
        // Explicit high limit — api.getEmployees() previously silently
        // ignored any params (see api.js), so this page always got the
        // backend's default 50-record page with no way to ask for more.
        // Newly created employees, whose auto-generated IDs sort to the
        // end, could fall past that cutoff and never load at all even
        // though the total count (a separate, unfiltered query) was
        // already correct.
        api.getEmployees({ limit: 1000 }).catch(() => api.getUsers()),
        isAdmin ? api.getRoles() : Promise.resolve([{ _id: "employee-role", name: "Employee" }]),
        api.getEmployeeStats(),
      ]);

      if (employeesResult.status === "rejected") {
        throw employeesResult.reason;
      }

      const employeesRes = employeesResult.value;
      const rolesRes = rolesResult.status === "fulfilled" ? rolesResult.value : [];
      const statsRes = statsResult.status === "fulfilled" ? statsResult.value : null;


      // Handle different response formats
      let employeeList = (Array.isArray(employeesRes)
        ? employeesRes 
        : employeesRes?.data || employeesRes?.users || [])
        .slice()
        .sort((first, second) =>
          String(first.employeeId || "").localeCompare(
            String(second.employeeId || ""),
            undefined,
            { numeric: true },
          ),
        );

      if (employeeList.length === 0) {
        const usersRes = await api.getUsers();
        employeeList = (Array.isArray(usersRes)
          ? usersRes
          : usersRes?.data || usersRes?.users || [])
          .slice()
          .sort((first, second) =>
            String(first.employeeId || "").localeCompare(
              String(second.employeeId || ""),
              undefined,
              { numeric: true },
            ),
          );
      }
      
      const rolesList = Array.isArray(rolesRes) 
        ? rolesRes 
        : rolesRes?.data || rolesRes?.roles || [];

      setEmployees(employeeList);
      setCurrentPage(1);
      setRoles(rolesList);
      setStats(statsRes || { total: 0, active: 0, inactive: 0, onLeave: 0, terminated: 0 });
    } catch (err) {
      console.error("Failed to load employee list:", err);
      setError(err.message || "Failed to load employees");
    } finally {
      setLoading(false);
    }
  }, [isAdmin]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  useEffect(() => {
    setSearch(initialSearch);
    setCurrentPage(1);
  }, [initialSearch]);

  useEffect(() => {
    if (!selectedEmployeeId) return undefined;

    let cancelled = false;
    setError("");

    api.getEmployee(selectedEmployeeId)
      .then((response) => {
        const employee = response?.employee || response?.user || response?.data || response;
        const employeeId = employee?._id || employee?.id;

        if (!employeeId || String(employeeId) !== selectedEmployeeId) {
          throw new Error("The requested employee record could not be verified.");
        }

        if (!cancelled) {
          setViewingEmployee(employee);
          setShowDetailModal(true);
        }
      })
      .catch((err) => {
        if (!cancelled) {
          setError(err.message || "Failed to load the selected employee.");
        }
      });

    return () => {
      cancelled = true;
    };
  }, [selectedEmployeeId]);

  const handleDelete = async (id, role) => {
    if (!id) {
      setError("Cannot delete: Invalid ID.");
      return;
    }
    if (role === "admin") {
      setError("Cannot delete an admin user.");
      return;
    }
    if (!window.confirm("Are you sure you want to delete this employee? This will completely remove their account and HR record.")) {
      return;
    }
    try {
      await api.deleteEmployee(id);
      await loadData();
    } catch (err) {
      setError(err.message || "Failed to delete employee");
    }
  };

  const handleEdit = (employee) => {
    setEditingEmployee(employee);
    setShowModal(true);
  };

  // Opens the read-only detail modal — triggered by clicking an employee's name.
  const handleView = (employee) => {
    setViewingEmployee(employee);
    setShowDetailModal(true);
  };

  const closeDetailModal = () => {
    setShowDetailModal(false);
    setViewingEmployee(null);
    setSearchParams((current) => {
      const next = new URLSearchParams(current);
      next.delete("employeeId");
      return next;
    }, { replace: true });
  };

  const getStatusBadge = (status) => {
    const classes = {
      Active: "status-active",
      Inactive: "status-inactive",
      "On Leave": "status-leave",
      Terminated: "status-terminated",
    };
    return `status-badge ${classes[status] || "status-active"}`;
  };

  const departmentOptions = useMemo(() => {
    const set = new Set(
      employees.map((emp) => emp.department).filter(Boolean)
    );
    return [...set].sort();
  }, [employees]);

  const statusOptions = ["Active", "Inactive", "On Leave", "Terminated"];

const filteredEmployees = employees.filter((emp) => {
  const keyword = search.toLowerCase();

  const matchesSearch =
    emp.name?.toLowerCase().includes(keyword) ||
    emp.email?.toLowerCase().includes(keyword) ||
    emp.employeeId?.toLowerCase().includes(keyword) ||
    emp.department?.toLowerCase().includes(keyword) ||
    emp.designation?.toLowerCase().includes(keyword) ||
    emp.role?.toLowerCase().includes(keyword) ||
    emp.status?.toLowerCase().includes(keyword);

  const matchesDepartment =
    !departmentFilter || emp.department === departmentFilter;

  const matchesStatus =
    !statusFilter || emp.status === statusFilter;

  const matchesRole =
    !roleFilter || emp.role === roleFilter;

  return (
    matchesSearch &&
    matchesDepartment &&
    matchesStatus &&
    matchesRole
  );
});

  const indexOfLastEmployee = currentPage * employeesPerPage;
  const indexOfFirstEmployee = indexOfLastEmployee - employeesPerPage;
  const currentEmployees = filteredEmployees.slice(
    indexOfFirstEmployee,
    indexOfLastEmployee
  );

  const totalPages = Math.ceil(filteredEmployees.length / employeesPerPage);

const clearFilters = () => {
  setSearch("");
  setDepartmentFilter("");
  setStatusFilter("");
  setRoleFilter("");
  setCurrentPage(1);
};

  const hasActiveFilters = search || departmentFilter || statusFilter;

  return (
    <div className="employees-page">
      <header className="page-header">
        <div>
          <h1>Employees</h1>
          <p className="page-subtitle">{employees.length} total users/employees registered</p>
        </div>
        {hasPermission("employees.create") && <button
          className="btn-primary"
          onClick={() => {
            setEditingEmployee(null);
            setShowModal(true);
          }}
        >
          <Icon name="person_add" /> Add Employee
        </button>}
      </header>

      {error && <div className="error-message">{error}</div>}

      {/* Stats */}
      <div className="stats-grid">
        <div className="stat-card">
          <span>Total Registered</span>
          <strong>{stats.total || 0}</strong>
        </div>
        <div className="stat-card">
          <span>Active</span>
          <strong>{stats.active || 0}</strong>
        </div>
        <div className="stat-card">
          <span>On Leave</span>
          <strong>{stats.onLeave || 0}</strong>
        </div>
        <div className="stat-card">
          <span>Inactive</span>
          <strong>{stats.inactive || 0}</strong>
        </div>
        <div className="stat-card">
          <span>Terminated</span>
          <strong>{stats.terminated || 0}</strong>
        </div>
      </div>

      {/* Filters */}
      <div className="filters-bar">
        <input
          type="text"
          placeholder=" 🔍︎ Search name, email, ID..."
          value={search}
          onChange={(e) => { setSearch(e.target.value); setCurrentPage(1); }}
        />

        <select
          value={departmentFilter}
          onChange={(e) => { setDepartmentFilter(e.target.value); setCurrentPage(1); }}
        >
          <option value="">All Departments</option>
          {departmentOptions.map((dept) => (
            <option key={dept} value={dept}>
              {dept}
            </option>
          ))}
        </select>

        <select
          value={statusFilter}
          onChange={(e) => { setStatusFilter(e.target.value); setCurrentPage(1); }}
        >
          <option value="">All Statuses</option>
          {statusOptions.map((status) => (
            <option key={status} value={status}>
              {status}
            </option>
          ))}
        </select>

        <select
  value={roleFilter}
  onChange={(e) => {
    setRoleFilter(e.target.value);
    setCurrentPage(1);
  }}
>
  <option value="">All Roles</option>

  {roles.map((role) => (
    <option key={role._id} value={role.name}>
      {role.name}
    </option>
  ))}
</select>

      

        {hasActiveFilters && (
          <button
            type="button"
            className="btn-secondary"
            onClick={clearFilters}
          >
            Clear filters
          </button>
        )}
      </div>

      {/* Table */}
      <div className="table-container">
        <table className="employees-table">
          <thead>
            <tr>
              <th>ID</th>
              <th>Name</th>
              <th>Email</th>
              <th>Department</th>
              <th>Designation</th>
              <th>Role</th>
              <th>Status</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan="8" className="text-center">
                  Loading employee database...
                </td>
              </tr>
            ) : filteredEmployees.length === 0 ? (
              <tr>
                <td colSpan="8" className="text-center">
                  No records match search criteria.
                </td>
              </tr>
            ) : (
              currentEmployees.map((emp, index) => {
                const empId = emp._id || emp.id;
                return (
                  <tr key={empId || index}>
                    <td>
                      <strong>{emp.employeeId || "PENDING"}</strong>
                    </td>
                    <td>
                      {/* Clicking the name opens the read-only detail modal,
                          the same way "Add Employee" opens the create modal. */}
                      <button
                        type="button"
                        className="link-button"
                        onClick={() => handleView(emp)}
                        style={{
                          background: "none",
                          border: "none",
                          padding: 0,
                          color: "#3182ce",
                          fontWeight: 600,
                          cursor: "pointer",
                          textDecoration: "none",
                        }}
                        onMouseEnter={(e) => (e.currentTarget.style.textDecoration = "underline")}
                        onMouseLeave={(e) => (e.currentTarget.style.textDecoration = "none")}
                      >
                        {emp.name}
                      </button>
                    </td>
                    <td>{emp.email}</td>
                    <td>{emp.department}</td>
                    <td>{emp.designation || "N/A"}</td>
                    <td>{emp.role}</td>
                    <td>
                      <span className={getStatusBadge(emp.status)}>
                        {emp.status}
                      </span>
                    </td>
                    <td>
                      {hasPermission("employees.update") && <button
                        className="btn-action edit"
                        onClick={() => handleEdit(emp)}
                      >
                        <Icon name="edit" />
                      </button>}
                      {hasPermission("employees.delete") && <button
                        className="btn-action danger"
                        onClick={() => handleDelete(empId,emp.role)}
                      >
                        <Icon name="delete" />
                      </button>}
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
        
        <Pagination
          page={currentPage}
          totalPages={totalPages}
          itemCount={filteredEmployees.length}
          pageSize={employeesPerPage}
          itemLabel="employees"
          onPageChange={setCurrentPage}
        />
      </div>

      {/* Create/Edit Modal */}
      <EmployeeModal
        open={showModal}
        onClose={() => setShowModal(false)}
        roles={isAdmin ? roles : roles.filter((role) => role.name === "Employee")}
        editingEmployee={editingEmployee}
        onSaved={loadData}
      />

      {/* Read-only Detail (View) Modal */}
      <EmployeeDetailModal
        open={showDetailModal}
        onClose={closeDetailModal}
        employee={viewingEmployee}
        onEdit={isAdmin || hasPermission("employees.update") ? handleEdit : undefined}
      />
    </div>
  );
}