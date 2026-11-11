import { useState, useEffect, useCallback, useMemo, useRef } from "react";
import { api } from "../services/api.js";
import { useAuth } from "../hooks/useAuth.jsx";
import Icon from "../Components/Icon.jsx";
import MyAttendanceCheckInOut from "../Components/attendance/Myattendancecheckinout.jsx";
import "../styles/Attendance.css";

const getLocalDate = () => {
  const now = new Date();
  const offset = now.getTimezoneOffset();
  const localDate = new Date(now.getTime() - offset * 60000);
  return localDate.toISOString().split("T")[0];
};
const ATTENDANCE_STATUSES = {
  PRESENT: "Present",
  ABSENT: "Absent",
  LATE: "Late",
  HALF_DAY: "Half Day",
  HOLIDAY: "Holiday",
  LEAVE: "Leave",
};

const STATUS_BADGE_CLASSES = {
  [ATTENDANCE_STATUSES.PRESENT]: "status-present",
  [ATTENDANCE_STATUSES.ABSENT]: "status-absent",
  [ATTENDANCE_STATUSES.LATE]: "status-late",
  [ATTENDANCE_STATUSES.HALF_DAY]: "status-halfday",
  [ATTENDANCE_STATUSES.HOLIDAY]: "status-holiday",
  [ATTENDANCE_STATUSES.LEAVE]: "status-leave",
};
const STATUS_OPTIONS = Object.values(ATTENDANCE_STATUSES);
export default function Attendance() {
  const { hasPermission } = useAuth();
  const [attendance, setAttendance] = useState([]);
  const [users, setUsers] = useState([]);
  const [stats, setStats] = useState({
    present: 0,
    absent: 0,
    late: 0,
    halfDay: 0,
  });
  const [loading, setLoading] = useState(true);
  const [editingLoading, setEditingLoading] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [filterDate, setFilterDate] = useState(getLocalDate);
  const [attendanceSearch, setAttendanceSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [showModal, setShowModal] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [formData, setFormData] = useState({
    userId: "",
    date: getLocalDate(),
    checkIn: "",
    checkOut: "",
    status: ATTENDANCE_STATUSES.PRESENT,
  });
  const [employeeSearch, setEmployeeSearch] = useState("");
  const [showEmployeeDropdown, setShowEmployeeDropdown] = useState(false);
  const attendanceDateInitialized = useRef(false);
  const dropdownRef = useRef(null);
  const searchInputRef = useRef(null);
  const filteredUsers = useMemo(() => {
    const searchValue = employeeSearch.trim().toLowerCase();

    if (!searchValue) {
      return users;
    }

    return users.filter((user) =>
      user?.name?.toLowerCase().includes(searchValue),
    );
  }, [users, employeeSearch]);
  const selectedEmployee = useMemo(
    () => users.find((user) => user._id === formData.userId),
    [users, formData.userId],
  );
  const employeeNameMap = useMemo(() => {
    const map = new Map();

    users.forEach((user) => {
      if (user?._id) {
        map.set(String(user._id), user);
      }
    });

    return map;
  }, [users]);

  const resolveEmployeeName = useCallback(
    (record) => {
      if (!record) {
        return "N/A";
      }
      const userRef = record.userId;

      // Populated user object
      if (userRef && typeof userRef === "object") {
        if (userRef.name) {
          return userRef.name;
        }

        if (userRef._id) {
          const matchedUser = employeeNameMap.get(String(userRef._id));

          if (matchedUser?.name) {
            return matchedUser.name;
          }
        }
      }
      // User ID
      const rawUserId = typeof userRef === "string" ? userRef : userRef?._id;

      if (rawUserId) {
        const matchedUser = employeeNameMap.get(String(rawUserId));

        if (matchedUser?.name) {
          return matchedUser.name;
        }
      }

      // Fallback values
      return record.employeeName || record.userName || "N/A";
    },
    [employeeNameMap],
  );

  const filteredAttendance = useMemo(() => {
    const search = attendanceSearch.trim().toLowerCase();

    return attendance.filter((record) => {
      const employeeName = resolveEmployeeName(record).toLowerCase();

      // Employee search
      const matchesEmployee = !search || employeeName.includes(search);

      // Status filter
      const matchesStatus =
        !statusFilter ||
        (statusFilter === ATTENDANCE_STATUSES.LATE
          ? Boolean(record.isLate || record.status === "Late")
          : statusFilter === ATTENDANCE_STATUSES.PRESENT
            ? ["Present", "Late"].includes(record.status)
            : record.status === statusFilter);

      return matchesEmployee && matchesStatus;
    });
  }, [attendance, attendanceSearch, statusFilter, resolveEmployeeName]);

  const loadData = useCallback(async () => {
    try {
      setLoading(true);
      setError("");

      const params = filterDate ? { date: filterDate } : {};

      const [attendanceRes, usersRes, statsRes] = await Promise.all([
        api.getAttendance(params),
        hasPermission("attendance.mark") ? api.getAttendanceUsers() : Promise.resolve({ data: [] }),
        api.getAttendanceStats(params),
      ]);

      const attendanceData = Array.isArray(attendanceRes?.data)
        ? attendanceRes.data
        : Array.isArray(attendanceRes)
          ? attendanceRes
          : [];

      if (!attendanceDateInitialized.current) {
        attendanceDateInitialized.current = true;
        if (
          attendanceRes?.attendanceDate &&
          attendanceRes.attendanceDate !== filterDate
        ) {
          setAttendance([]);
          setFilterDate(attendanceRes.attendanceDate);
          return;
        }
      }

      const usersData = Array.isArray(usersRes?.data)
        ? usersRes.data
        : Array.isArray(usersRes)
          ? usersRes
          : [];

      const statsData =
        statsRes && typeof statsRes === "object"
          ? statsRes
          : {
              present: 0,
              absent: 0,
              late: 0,
              halfDay: 0,
            };

      setAttendance(attendanceData);
      setUsers(usersData);
      setStats(statsData);
    } catch (err) {
      const message = err?.message || "Failed to load attendance records";

      setError(message);

      console.error("Load attendance error:", err);
    } finally {
      setLoading(false);
    }
  }, [filterDate, hasPermission]);

  // INITIAL LOAD + DATE CHANGE
  useEffect(() => {
    loadData();
  }, [loadData]);

  // CLOSE EMPLOYEE DROPDOWN WHEN CLICKING OUTSIDE

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setShowEmployeeDropdown(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);

    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, []);

  // RESET MODAL FORM
  const resetForm = useCallback(() => {
    setFormData({
      userId: "",
      date: getLocalDate(),
      checkIn: "",
      checkOut: "",
      status: ATTENDANCE_STATUSES.PRESENT,
    });

    setEmployeeSearch("");
    setShowEmployeeDropdown(false);
    setEditingId(null);
  }, []);

  // EDIT ATTENDANCE

  const handleEdit = useCallback(async (recordId, isSynthetic = false) => {
    // Synthetic absent rows are generated rows,
    // not actual database attendance records.
    if (isSynthetic) {
      return;
    }

    try {
      setError("");
      setEditingLoading(true);

      const record = await api.getAttendanceById(recordId);

      if (!record) {
        throw new Error("Attendance record not found");
      }

      // Convert database datetime to HH:mm
      const formatTimeForInput = (dateString) => {
        if (!dateString) {
          return "";
        }

        try {
          const date = new Date(dateString);

          if (Number.isNaN(date.getTime())) {
            return "";
          }

          return date.toTimeString().slice(0, 5);
        } catch {
          return "";
        }
      };

      setFormData({
        userId: record.userId?._id || record.userId || "",

        date: record.date
          ? new Date(record.date).toISOString().split("T")[0]
          : getLocalDate(),

        checkIn: formatTimeForInput(record.checkIn),

        checkOut: formatTimeForInput(record.checkOut),

        status: record.status || ATTENDANCE_STATUSES.PRESENT,
      });

      setEmployeeSearch(record.userId?.name || "");

      setEditingId(recordId);
      setShowModal(true);
    } catch (err) {
      const message =
        err?.message || "Failed to load attendance record for editing";

      setError(message);

      console.error("Edit attendance error:", err);
    } finally {
      setEditingLoading(false);
    }
  }, []);

  // CREATE / UPDATE ATTENDANCE

  const handleSubmit = async (e) => {
    e.preventDefault();

    setError("");

    // Employee validation
    if (!formData.userId) {
      setError("Please select an employee.");
      return;
    }

    // Date validation
    if (!formData.date) {
      setError("Please select a date.");
      return;
    }

    // Check-in / checkout validation
    if (formData.checkIn && formData.checkOut) {
      if (formData.checkOut <= formData.checkIn) {
        setError("Check-out time must be later than check-in time.");
        return;
      }
    }

    try {
      setIsSubmitting(true);
      if (editingId) {
        await api.updateAttendance(editingId, formData);
      } else {
        await api.createAttendance(formData);
      }
      setShowModal(false);
      resetForm();
      await loadData();
    } catch (err) {
      const message =
        err?.message ||
        (editingId
          ? "Failed to update attendance"
          : "Failed to mark attendance");
      setError(message);
      console.error("Submit attendance error:", err);
    } finally {
      setIsSubmitting(false);
    }
  };

  // DELETE ATTENDANCE
  const handleDelete = useCallback(
    async (recordId, employeeName) => {
      const confirmed = window.confirm(
        `Are you sure you want to delete the attendance record for ${
          employeeName || "this employee"
        }?`,
      );

      if (!confirmed) {
        return;
      }

      try {
        setError("");
        setLoading(true);

        await api.deleteAttendance(recordId);

        await loadData();
      } catch (err) {
        const message = err?.message || "Failed to delete attendance record";
        setError(message);
        console.error("Delete attendance error:", err);
      } finally {
        setLoading(false);
      }
    },
    [loadData],
  );

  // EMPLOYEE SELECT

  const handleEmployeeSelect = (userId) => {
    setFormData((prev) => ({
      ...prev,
      userId,
    }));

    const employee = users.find((user) => user._id === userId);

    setEmployeeSearch(employee?.name || "");

    setShowEmployeeDropdown(false);
  };

  // EMPLOYEE SEARCH CHANGE

  const handleEmployeeSearchChange = (e) => {
    const value = e.target.value;

    setEmployeeSearch(value);

    // Clear selected employee if
    // search text is changed.
    setFormData((prev) => ({
      ...prev,
      userId: "",
    }));

    setShowEmployeeDropdown(true);
  };
  // CLOSE MODAL
  const handleCloseModal = () => {
    if (isSubmitting) {
      return;
    }

    setShowModal(false);
    resetForm();
  };

  // STATUS BADGE

  const getStatusBadge = (status) => {
    const baseClass = "status-badge";

    const statusClass = STATUS_BADGE_CLASSES[status] || "status-absent";

    return `${baseClass} ${statusClass}`;
  };

  // FORMAT TIME
  const formatTime = (dateString) => {
    if (!dateString) {
      return "-";
    }

    try {
      const date = new Date(dateString);

      if (Number.isNaN(date.getTime())) {
        return "-";
      }

      return date.toLocaleTimeString([], {
        hour: "2-digit",
        minute: "2-digit",
      });
    } catch {
      return "-";
    }
  };

  // FORMAT DATE

  const formatDate = (dateString) => {
    if (!dateString) {
      return "-";
    }

    try {
      const date = new Date(dateString);

      if (Number.isNaN(date.getTime())) {
        return "-";
      }

      return date.toLocaleDateString();
    } catch {
      return "-";
    }
  };

  // CALCULATE WORKING HOURS

  const calculateWorkingHours = (checkIn, checkOut) => {
    if (!checkIn || !checkOut) {
      return 0;
    }

    try {
      const inTime = new Date(checkIn);

      const outTime = new Date(checkOut);

      if (Number.isNaN(inTime.getTime()) || Number.isNaN(outTime.getTime())) {
        return 0;
      }

      const diffMs = outTime - inTime;

      if (diffMs <= 0) {
        return 0;
      }

      return diffMs / (1000 * 60 * 60);
    } catch {
      return 0;
    }
  };
  // LOADING SCREEN

  if (loading) {
    return (
      <div className="attendance-page">
        <div className="loading-spinner">
          <div className="spinner" role="status">
            <span className="sr-only">Loading attendance records...</span>
          </div>

          <p>Loading attendance records...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="attendance-page">
      <header className="page-header">
        <div>
          <h1>Attendance</h1>

          <p className="page-subtitle">
            {filteredAttendance.length} of {attendance.length} records for{" "}
            {filterDate}
          </p>
        </div>

        <div className="header-actions">
          {/* Date filter */}

          <div className="filter-group">
            <label htmlFor="filter-date" className="sr-only">
              Filter by date
            </label>

            <input
              id="filter-date"
              type="date"
              value={filterDate}
              onChange={(e) => setFilterDate(e.target.value)}
              className="date-input"
              aria-label="Filter by date"
            />
          </div>

          {/* Mark attendance */}

          {hasPermission("attendance.mark") && users.length > 0 && <button
            type="button"
            className="btn-primary"
            onClick={() => {
              resetForm();
              setShowModal(true);
            }}
            aria-label="Mark attendance"
          >
            <Icon name="add" />
            Mark Attendance
          </button>}
        </div>
      </header>
      {error && (
        <div className="error-message" role="alert">
          <Icon name="error" />

          <span>{error}</span>

          <button
            type="button"
            className="error-dismiss"
            onClick={() => setError("")}
            aria-label="Dismiss error"
          >
            ×
          </button>
        </div>
      )}
      <MyAttendanceCheckInOut onChanged={loadData} />

      <div className="stats-grid">
        <StatCard label="Present" value={stats.present || 0} />

        <StatCard label="Absent" value={stats.absent || 0} />

        <StatCard label="Late" value={stats.late || 0} />

        <StatCard label="Half Day" value={stats.halfDay || 0} />
      </div>

      <div className="attendance-filters">
        {/* Employee search */}

        <div className="filter-group">
          <label htmlFor="attendance-search" className="sr-only">
            Search employees
          </label>

          <input
            id="attendance-search"
            type="text"
            className="search-input"
            placeholder="Search employees..."
            value={attendanceSearch}
            onChange={(e) => setAttendanceSearch(e.target.value)}
          />
        </div>

        {/* Status filter */}

        <div className="filter-group">
          <label htmlFor="attendance-status-filter" className="sr-only">
            Filter by status
          </label>

          <select
            id="attendance-status-filter"
            className="form-control"
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
          >
            <option value="">All Status</option>

            {STATUS_OPTIONS.map((status) => (
              <option key={status} value={status}>
                {status}
              </option>
            ))}
          </select>
        </div>

        {/* Clear filters */}

        {(attendanceSearch || statusFilter) && (
          <button
            type="button"
            className="btn-secondary"
            onClick={() => {
              setAttendanceSearch("");
              setStatusFilter("");
            }}
          >
            Clear Filters
          </button>
        )}
      </div>
      <div className="table-container">
        <table className="attendance-table">
          <thead>
            <tr>
              <th>Employee</th>
              <th>Date</th>
              <th>Check In</th>
              <th>Check Out</th>
              <th>Working Hours</th>
              <th>Overtime Hours</th>
              <th>Auto Checkout</th>
              <th>Status</th>
              <th>Actions</th>
            </tr>
          </thead>

          <tbody>
            {filteredAttendance.length === 0 ? (
              <tr>
                <td colSpan="9" className="text-center">
                  {attendance.length === 0
                    ? `No attendance records found for ${filterDate}`
                    : "No attendance records match your filters"}
                </td>
              </tr>
            ) : (
              filteredAttendance.map((record) => {
                // Prefer backend-computed
                // working hours.
                const workingHours =
                  record.workingHours ??
                  calculateWorkingHours(record.checkIn, record.checkOut);

                const employeeName = resolveEmployeeName(record);

                const isSyntheticAbsent = Boolean(record.isSyntheticAbsent);

                return (
                  <tr key={record._id}>
                    {/* Employee */}
                    <td>{employeeName}</td>
                    {/* Date */}
                    <td>{formatDate(record.date)}</td>
                    {/* Check In */}
                    <td>{formatTime(record.checkIn)}</td>
                    {/* Check Out */}
                    <td>
                      {formatTime(record.checkOut)}
                      {record.autoCheckedOut && (
                        <span
                          className="tag-auto"
                          style={{
                            marginLeft: "6px",
                            fontSize: "10px",
                            fontWeight: 700,
                            textTransform: "uppercase",
                            letterSpacing: "0.03em",
                            padding: "2px 7px",
                            borderRadius: "9999px",
                            background: "#fee2e2",
                            color: "#991b1b",
                          }}
                          title="Automatically checked out at 5:15 PM"
                        >
                          auto
                        </span>
                      )}
                    </td>

                    <td>{Number(workingHours).toFixed(1)}h</td>
                    <td>
                      {Number(record.overtimeHours) > 0
                        ? `+${Number(record.overtimeHours).toFixed(1)}h`
                        : "—"}
                    </td>
                    <td>
                      {record.autoCheckedOut ? (
                        <span className="attendance-auto-checkout-status">
                          Automatic
                        </span>
                      ) : (
                        "No"
                      )}
                    </td>

                    {/* Status */}

                    <td>
                      <span className={getStatusBadge(record.status)}>
                        {record.status === "Late"
                          ? "Present (Late)"
                          : record.status}
                      </span>
                      {record.isLate && Number(record.lateMinutes) > 0 && (
                        <small className="attendance-late-detail">
                          Late by {record.lateMinutes}m
                        </small>
                      )}
                    </td>

                    {/* Actions */}

                    <td>
                      <div className="action-buttons">
                        {/* Edit */}

                        {hasPermission("attendance.update") && <button
                          type="button"
                          className="btn-action edit"
                          onClick={() =>
                            handleEdit(record._id, isSyntheticAbsent)
                          }
                          aria-label={`Edit attendance for ${employeeName}`}
                          title={
                            isSyntheticAbsent
                              ? "Generated absent row"
                              : "Edit record"
                          }
                          disabled={editingLoading || isSyntheticAbsent}
                        >
                          <Icon name="edit" />
                        </button>}

                        {/* Delete */}

                        {hasPermission("attendance.delete") && <button
                          type="button"
                          className="btn-action delete"
                          onClick={() => {
                            if (!isSyntheticAbsent) {
                              handleDelete(record._id, employeeName);
                            }
                          }}
                          aria-label={`Delete attendance for ${employeeName}`}
                          title={
                            isSyntheticAbsent
                              ? "Generated absent row"
                              : "Delete record"
                          }
                          disabled={isSyntheticAbsent}
                        >
                          <Icon name="delete" />
                        </button>}
                      </div>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {/*ATTENDANCE MODAL*/}

      {showModal && (
        <AttendanceModal
          formData={formData}
          setFormData={setFormData}
          employeeSearch={employeeSearch}
          showEmployeeDropdown={showEmployeeDropdown}
          setShowEmployeeDropdown={setShowEmployeeDropdown}
          filteredUsers={filteredUsers}
          selectedEmployee={selectedEmployee}
          onEmployeeSelect={handleEmployeeSelect}
          onEmployeeSearchChange={handleEmployeeSearchChange}
          onSubmit={handleSubmit}
          onClose={handleCloseModal}
          dropdownRef={dropdownRef}
          searchInputRef={searchInputRef}
          editingId={editingId}
          isSubmitting={isSubmitting}
          editingLoading={editingLoading}
        />
      )}
    </div>
  );
}

// STAT CARD

function StatCard({ label, value }) {
  return (
    <div className="stat-card">
      <span>{label}</span>
      <strong>{value}</strong>
    </div>
  );
}

// ATTENDANCE MODAL

function AttendanceModal({
  formData,
  setFormData,
  employeeSearch,
  showEmployeeDropdown,
  setShowEmployeeDropdown,
  filteredUsers,
  selectedEmployee,
  onEmployeeSelect,
  onEmployeeSearchChange,
  onSubmit,
  onClose,
  dropdownRef,
  searchInputRef,
  editingId,
  isSubmitting,
  editingLoading,
}) {
  const handleFormChange = (field, value) => {
    setFormData((prev) => ({
      ...prev,
      [field]: value,
    }));
  };

  const modalTitle = editingId ? "Edit Attendance Record" : "Mark Attendance";
  const submitButtonText = editingId ? "Update Attendance" : "Save Attendance";
  const submitButtonClass = editingId ? "btn-warning" : "btn-primary";

  return (
    <div
      className="modal-overlay"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-labelledby="modal-title"
    >
      <div
        className="modal"
        onClick={(e) => e.stopPropagation()}
        ref={dropdownRef}
      >
        {/* Header */}

        <div className="modal-header">
          <h2 id="modal-title">{modalTitle}</h2>

          <button
            type="button"
            className="modal-close"
            onClick={onClose}
            aria-label="Close modal"
            disabled={isSubmitting}
          >
            ✕
          </button>
        </div>

        {/* Form */}

        <form onSubmit={onSubmit} noValidate>
          <div className="modal-body">
            {/*EMPLOYEE*/}

            <div className="form-group">
              <label htmlFor="employee-search">
                Employee <span className="required">*</span>
              </label>

              <div className="employee-search-wrapper">
                <input
                  id="employee-search"
                  type="text"
                  ref={searchInputRef}
                  className="employee-search-input"
                  placeholder="Search employee by name..."
                  value={selectedEmployee?.name || employeeSearch}
                  onChange={onEmployeeSearchChange}
                  onFocus={() => setShowEmployeeDropdown(true)}
                  required
                  autoComplete="off"
                  aria-autocomplete="list"
                  aria-expanded={showEmployeeDropdown}
                  aria-controls="employee-dropdown"
                  disabled={isSubmitting || editingLoading}
                />

                {/* Employee dropdown */}

                {showEmployeeDropdown && !formData.userId && (
                  <div
                    id="employee-dropdown"
                    className="employee-dropdown"
                    role="listbox"
                  >
                    {filteredUsers.length === 0 ? (
                      <div className="employee-dropdown-empty" role="option">
                        {employeeSearch.trim()
                          ? "No employees found"
                          : "No employees available"}
                      </div>
                    ) : (
                      filteredUsers.map((user) => (
                        <div
                          key={user._id}
                          className="employee-dropdown-item"
                          onClick={() => onEmployeeSelect(user._id)}
                          onMouseDown={(e) => e.preventDefault()}
                          role="option"
                          tabIndex={0}
                          aria-selected={user._id === formData.userId}
                        >
                          <span className="employee-name">{user.name}</span>

                          {user.email && (
                            <span className="employee-email">{user.email}</span>
                          )}

                          {user.employeeId && (
                            <span className="employee-id">
                              #{user.employeeId}
                            </span>
                          )}
                        </div>
                      ))
                    )}
                  </div>
                )}
              </div>
            </div>

            {/* ==========================================
                DATE
            ========================================== */}

            <div className="form-group">
              <label htmlFor="attendance-date">
                Date <span className="required">*</span>
              </label>

              <input
                id="attendance-date"
                type="date"
                value={formData.date}
                onChange={(e) => handleFormChange("date", e.target.value)}
                required
                disabled={isSubmitting || editingLoading}
              />
            </div>

            <div className="form-row">
              <div className="form-group">
                <label htmlFor="check-in">Check In</label>

                <input
                  id="check-in"
                  type="time"
                  value={formData.checkIn}
                  onChange={(e) => handleFormChange("checkIn", e.target.value)}
                  disabled={isSubmitting || editingLoading}
                />
              </div>

              <div className="form-group">
                <label htmlFor="check-out">Check Out</label>

                <input
                  id="check-out"
                  type="time"
                  value={formData.checkOut}
                  onChange={(e) => handleFormChange("checkOut", e.target.value)}
                  disabled={isSubmitting || editingLoading}
                />
              </div>
            </div>

            <div className="form-group">
              <label htmlFor="attendance-status">
                Status <span className="required">*</span>
              </label>

              <select
                id="attendance-status"
                value={formData.status}
                onChange={(e) => handleFormChange("status", e.target.value)}
                required
                disabled={isSubmitting || editingLoading}
              >
                {STATUS_OPTIONS.map((status) => (
                  <option key={status} value={status}>
                    {status}
                  </option>
                ))}
              </select>
            </div>

            {/* Editing indicator */}

            {editingId && (
              <div className="editing-indicator">
                <Icon name="edit" />

                <span>Editing record #{String(editingId).slice(-6)}</span>
              </div>
            )}

            {/* Loading record */}

            {editingLoading && (
              <div className="editing-loading">
                <span className="spinner-small" />

                <span>Loading attendance record...</span>
              </div>
            )}
          </div>

          {/* Footer */}

          <div className="modal-footer">
            <button
              type="button"
              className="btn-secondary"
              onClick={onClose}
              disabled={isSubmitting || editingLoading}
            >
              Cancel
            </button>

            <button
              type="submit"
              className={submitButtonClass}
              disabled={isSubmitting || editingLoading || !formData.userId}
            >
              {isSubmitting ? (
                <>
                  <span className="spinner-small" />

                  {editingId ? "Updating..." : "Saving..."}
                </>
              ) : (
                submitButtonText
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
