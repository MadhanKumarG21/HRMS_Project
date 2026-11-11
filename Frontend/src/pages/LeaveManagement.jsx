// src/pages/LeaveManagement.jsx
import { useState, useEffect, useCallback, useRef, useMemo, useReducer } from "react";
import { api } from "../services/api.js";
import { useAuth } from "../hooks/useAuth.jsx";
import Icon from "../Components/Icon.jsx";
import Pagination from "../Components/Pagination.jsx";
import RejectLeaveModal from "../Components/leave/RejectLeaveModal.jsx";
import "../styles/LeaveManagement.css";

// ============================================
// ACTION TYPES
// ============================================
const ACTIONS = {
  SET_LOADING: 'SET_LOADING',
  SET_ERROR: 'SET_ERROR',
  SET_LEAVES: 'SET_LEAVES',
  SET_EMPLOYEES: 'SET_EMPLOYEES',
  SET_STATS: 'SET_STATS',
  SET_FILTERS: 'SET_FILTERS',
  RESET_FILTERS: 'RESET_FILTERS',
  SET_MODAL: 'SET_MODAL',
  SET_FORM_DATA: 'SET_FORM_DATA',
  RESET_FORM: 'RESET_FORM',
  SET_EMPLOYEE_SEARCH: 'SET_EMPLOYEE_SEARCH',
  SET_SELECTED_EMPLOYEE: 'SET_SELECTED_EMPLOYEE',
  SET_SHOW_EMPLOYEE_DROPDOWN: 'SET_SHOW_EMPLOYEE_DROPDOWN',
  SET_REJECTING_LEAVE: 'SET_REJECTING_LEAVE',
  CLEAR_ERROR: 'CLEAR_ERROR',
  SET_PAGE: 'SET_PAGE',
  SET_PROCESSING_ID: 'SET_PROCESSING_ID',
};

// ============================================
// INITIAL STATE
// ============================================
const initialState = {
  leaves: [],
  employees: [],
  loading: true,
  error: null,
  stats: { pending: 0, approved: 0, rejected: 0, cancelled: 0 },
  filters: {
    search: "",
    status: "All",
    type: "All",
  },
  modal: {
    isOpen: false,
    formData: {
      userId: "",
      type: "Annual",
      fromDate: "",
      toDate: "",
      reason: "",
    },
  },
  employeeSearch: {
    query: "",
    selected: null,
    showDropdown: false,
  },
  rejectingLeave: null,
  currentPage: 1,
  processingId: null,
};

const PAGE_SIZE = 10;

// Mirrors Backend/Services/leaveAutoReject.js — a Pending request left
// untouched this long gets automatically rejected by the background sweep.
const AUTO_REJECT_WINDOW_MS = 24 * 60 * 60 * 1000; // 24 hours
const AUTO_REJECT_REASON_PREFIX = "Automatically rejected:";

// How much time is left before a Pending leave hits the auto-reject deadline.
// Returns null when not applicable (not Pending, or no createdAt).
const getTimeRemaining = (leave, now) => {
  if (leave.status !== "Pending" || !leave.createdAt) return null;
  const deadline = new Date(leave.createdAt).getTime() + AUTO_REJECT_WINDOW_MS;
  return deadline - now;
};

const formatTimeRemaining = (ms) => {
  if (ms <= 0) return "Overdue";
  const totalMinutes = Math.floor(ms / 60000);
  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;
  if (hours === 0) return `${minutes}m left`;
  return `${hours}h ${minutes}m left`;
};

// ============================================
// REDUCER
// ============================================
const reducer = (state, action) => {
  switch (action.type) {
    case ACTIONS.SET_LOADING:
      return { ...state, loading: action.payload };
    
    case ACTIONS.SET_ERROR:
      return { ...state, error: action.payload };
    
    case ACTIONS.CLEAR_ERROR:
      return { ...state, error: null };
    
    case ACTIONS.SET_LEAVES:
      return { ...state, leaves: action.payload };
    
    case ACTIONS.SET_EMPLOYEES:
      return { ...state, employees: action.payload };
    
    case ACTIONS.SET_STATS:
      return { ...state, stats: action.payload };
    
    case ACTIONS.SET_FILTERS:
      return { 
        ...state, 
        filters: { ...state.filters, ...action.payload },
        currentPage: 1,
      };
    
    case ACTIONS.RESET_FILTERS:
      return { 
        ...state, 
        filters: initialState.filters,
        currentPage: 1,
      };

    case ACTIONS.SET_PAGE:
      return {
        ...state,
        currentPage: action.payload,
      };

    case ACTIONS.SET_PROCESSING_ID:
      return {
        ...state,
        processingId: action.payload,
      };
    
    case ACTIONS.SET_MODAL:
      return { 
        ...state, 
        modal: { ...state.modal, isOpen: action.payload } 
      };
    
    case ACTIONS.SET_FORM_DATA:
      return { 
        ...state, 
        modal: { 
          ...state.modal, 
          formData: { ...state.modal.formData, ...action.payload } 
        } 
      };
    
    case ACTIONS.RESET_FORM:
      return { 
        ...state, 
        modal: { 
          ...state.modal, 
          formData: initialState.modal.formData 
        } 
      };
    
    case ACTIONS.SET_EMPLOYEE_SEARCH:
      return { 
        ...state, 
        employeeSearch: { 
          ...state.employeeSearch, 
          query: action.payload 
        } 
      };
    
    case ACTIONS.SET_SELECTED_EMPLOYEE:
      return { 
        ...state, 
        employeeSearch: { 
          ...state.employeeSearch, 
          selected: action.payload 
        } 
      };
    
    case ACTIONS.SET_SHOW_EMPLOYEE_DROPDOWN:
      return { 
        ...state, 
        employeeSearch: { 
          ...state.employeeSearch, 
          showDropdown: action.payload 
        } 
      };
    
    case ACTIONS.SET_REJECTING_LEAVE:
      return { ...state, rejectingLeave: action.payload };
    
    default:
      return state;
  }
};

// ============================================
// CUSTOM HOOKS
// ============================================
const useClickOutside = (ref, callback) => {
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (ref.current && !ref.current.contains(e.target)) {
        callback();
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [ref, callback]);
};

const useEscapeKey = (callback) => {
  useEffect(() => {
    const handleEscape = (e) => {
      if (e.key === "Escape") {
        callback();
      }
    };
    document.addEventListener("keydown", handleEscape);
    return () => document.removeEventListener("keydown", handleEscape);
  }, [callback]);
};

// The picker's base list is Users, not Employees — not every User has a
// matching Employee record yet in this app (they're created on two separate
// screens), so requiring an Employee profile would silently hide anyone
// without one. Employee data is merged in as enrichment when it exists.
const normalizeEmployees = (rawUsers, rawEmployees) => {
  const users = Array.isArray(rawUsers) ? rawUsers : [];
  const employees = Array.isArray(rawEmployees) ? rawEmployees : [];

  const employeeByUserId = new Map();
  employees.forEach((emp) => {
    const linkedUserId = emp.userId?._id || emp.userId;
    if (linkedUserId) employeeByUserId.set(String(linkedUserId), emp);
  });

  return users
    .filter((user) => user.status !== "Inactive") // disabled login accounts can't have leave applied
    .map((user) => {
      const emp = employeeByUserId.get(String(user._id));
      return {
        id: user._id,
        name: user.name || "Unnamed",
        email: user.email || "",
        employeeId: emp?.employeeId || "",
        department: emp?.department || user.department || "",
        designation: emp?.designation || "",
        // Employee.status (Active/Inactive/On Leave/Terminated) is more precise
        // than User.status; fall back to "Active" when there's no profile yet.
        status: emp?.status || "Active",
      };
    });
};

// ============================================
// MAIN COMPONENT
// ============================================
export default function LeaveManagement() {
  const { user, isAdmin, hasPermission } = useAuth();
  const [state, dispatch] = useReducer(reducer, initialState);
  const employeeSearchRef = useRef(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isProcessingExpired, setIsProcessingExpired] = useState(false);

  // ============================================
  // DERIVED STATE
  // ============================================
  const filteredEmployees = useMemo(() => {
    const { query } = state.employeeSearch;

    // An employee must still be with the company to have leave logged
    // for them. "Terminated" and "Inactive" are hard-blocked; "On Leave"
    // is still allowed (they can still have future leave planned/approved).
    const eligible = state.employees.filter(
      (emp) => emp.status !== "Terminated" && emp.status !== "Inactive"
    );

    if (!query.trim()) return eligible;

    const q = query.toLowerCase().trim();
    // Search across everything the dropdown displays, not just the name,
    // so typing an employee ID, department, or email also finds a match.
    return eligible.filter((emp) =>
      [emp.name, emp.email, emp.employeeId, emp.department, emp.designation]
        .filter(Boolean)
        .some((field) => field.toLowerCase().includes(q))
    );
  }, [state.employees, state.employeeSearch]);

  const filteredLeaves = useMemo(() => {
    const { search, status, type } = state.filters;
    return state.leaves.filter((leave) => {
      const employeeName = leave.userId?.name?.toLowerCase() || "";
      const matchesSearch = employeeName.includes(search.toLowerCase());
      const matchesStatus = status === "All" || leave.status === status;
      const matchesType = type === "All" || leave.type === type;
      return matchesSearch && matchesStatus && matchesType;
    });
  }, [state.leaves, state.filters]);

  const totalPages = useMemo(() => {
    return Math.max(1, Math.ceil(filteredLeaves.length / PAGE_SIZE));
  }, [filteredLeaves.length]);

  // Clamp currentPage if a filter change shrinks the result set below it
  useEffect(() => {
    if (state.currentPage > totalPages) {
      dispatch({ type: ACTIONS.SET_PAGE, payload: totalPages });
    }
  }, [totalPages, state.currentPage]);

  const paginatedLeaves = useMemo(() => {
    const start = (state.currentPage - 1) * PAGE_SIZE;
    return filteredLeaves.slice(start, start + PAGE_SIZE);
  }, [filteredLeaves, state.currentPage]);

  // Ticks once a minute purely to re-render the "auto-rejects in Xh Ym"
  // countdowns — it doesn't refetch anything, just recomputes elapsed time
  // against the same in-memory leave data.
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const tick = setInterval(() => setNow(Date.now()), 60 * 1000);
    return () => clearInterval(tick);
  }, []);

  // ============================================
  // DATA LOADING
  // ============================================
  // Full initial load: leaves + users (base list for the apply-leave picker,
  // since not every user has an Employee profile yet) + employees (to enrich
  // that list with employeeId/department/designation where available) + stats.
  const loadData = useCallback(async (isMountedRef) => {
    try {
      dispatch({ type: ACTIONS.SET_LOADING, payload: true });
      dispatch({ type: ACTIONS.CLEAR_ERROR });

      const [leavesRes, usersRes, employeesRes, statsRes] = await Promise.all([
        api.getLeaves(),
        isAdmin ? api.getUsers() : Promise.resolve({ data: [user] }),
        isAdmin ? api.getEmployees() : Promise.resolve({ data: [] }),
        api.getLeaveStats(),
      ]);

      if (isMountedRef && !isMountedRef.current) return;

      dispatch({ 
        type: ACTIONS.SET_LEAVES, 
        payload: Array.isArray(leavesRes.data) ? leavesRes.data : [] 
      });
      dispatch({
        type: ACTIONS.SET_EMPLOYEES,
        payload: normalizeEmployees(
          Array.isArray(usersRes.data) ? usersRes.data : usersRes,
          employeesRes.data
        ),
      });
      dispatch({ 
        type: ACTIONS.SET_STATS, 
        payload: statsRes || { pending: 0, approved: 0, rejected: 0, cancelled: 0 } 
      });
    } catch (err) {
      if (isMountedRef && !isMountedRef.current) return;
      dispatch({ 
        type: ACTIONS.SET_ERROR, 
        payload: err.message || "Failed to load leave data" 
      });
    } finally {
      if (!isMountedRef || isMountedRef.current) {
        dispatch({ type: ACTIONS.SET_LOADING, payload: false });
      }
    }
  }, [isAdmin, user]);

  // Lightweight refresh after a status change: just leaves + stats, not the full user list
  const refreshLeaves = useCallback(async () => {
    const [leavesRes, statsRes] = await Promise.all([
      api.getLeaves(),
      api.getLeaveStats(),
    ]);
    dispatch({ 
      type: ACTIONS.SET_LEAVES, 
      payload: Array.isArray(leavesRes.data) ? leavesRes.data : [] 
    });
    dispatch({ 
      type: ACTIONS.SET_STATS, 
      payload: statsRes || { pending: 0, approved: 0, rejected: 0, cancelled: 0 } 
    });
  }, []);

  useEffect(() => {
    const isMountedRef = { current: true };
    loadData(isMountedRef);
    return () => {
      isMountedRef.current = false;
    };
  }, [loadData]);

  const handleCloseModal = useCallback(() => {
    if (isSubmitting) return;
    dispatch({ type: ACTIONS.SET_MODAL, payload: false });
    dispatch({ type: ACTIONS.RESET_FORM });
    dispatch({ type: ACTIONS.SET_SELECTED_EMPLOYEE, payload: null });
    dispatch({ type: ACTIONS.SET_EMPLOYEE_SEARCH, payload: "" });
    dispatch({ type: ACTIONS.CLEAR_ERROR });
  }, [isSubmitting]);

  // ============================================
  // SIDE EFFECTS (Click Outside, Escape Key)
  // ============================================
  useClickOutside(employeeSearchRef, () => {
    dispatch({ type: ACTIONS.SET_SHOW_EMPLOYEE_DROPDOWN, payload: false });
  });

  useEscapeKey(() => {
    dispatch({ type: ACTIONS.SET_SHOW_EMPLOYEE_DROPDOWN, payload: false });
    if (state.modal.isOpen) {
      handleCloseModal();
    }
  });

  // ============================================
  // EVENT HANDLERS
  // ============================================
  const handleOpenModal = () => {
    dispatch({ type: ACTIONS.SET_MODAL, payload: true });
    dispatch({ type: ACTIONS.RESET_FORM });
    dispatch({ type: ACTIONS.SET_SELECTED_EMPLOYEE, payload: null });
    dispatch({ type: ACTIONS.SET_EMPLOYEE_SEARCH, payload: "" });
  };

  const handleFormChange = (field, value) => {
    dispatch({ type: ACTIONS.SET_FORM_DATA, payload: { [field]: value } });
  };

  const handleEmployeeSearchChange = (e) => {
    const value = e.target.value;
    dispatch({ type: ACTIONS.SET_EMPLOYEE_SEARCH, payload: value });
    dispatch({ type: ACTIONS.SET_SHOW_EMPLOYEE_DROPDOWN, payload: true });

    if (value === "") {
      dispatch({ type: ACTIONS.SET_SELECTED_EMPLOYEE, payload: null });
      handleFormChange("userId", "");
    }
  };

  const handleSelectEmployee = (employee) => {
    dispatch({ type: ACTIONS.SET_SELECTED_EMPLOYEE, payload: employee });
    dispatch({ type: ACTIONS.SET_EMPLOYEE_SEARCH, payload: employee.name });
    // formData.userId must be the User _id (what Leave.userId references),
    // which normalizeEmployees already mapped onto employee.id.
    handleFormChange("userId", employee.id);
    dispatch({ type: ACTIONS.SET_SHOW_EMPLOYEE_DROPDOWN, payload: false });
  };

  const handleClearEmployeeSelection = () => {
    dispatch({ type: ACTIONS.SET_SELECTED_EMPLOYEE, payload: null });
    dispatch({ type: ACTIONS.SET_EMPLOYEE_SEARCH, payload: "" });
    handleFormChange("userId", "");
    dispatch({ type: ACTIONS.SET_SHOW_EMPLOYEE_DROPDOWN, payload: false });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    // Validation
    if (!state.employeeSearch.selected) {
      dispatch({ 
        type: ACTIONS.SET_ERROR, 
        payload: "Please select an employee" 
      });
      return;
    }

    if (!state.modal.formData.fromDate || !state.modal.formData.toDate) {
      dispatch({ 
        type: ACTIONS.SET_ERROR, 
        payload: "Please select both from and to dates" 
      });
      return;
    }

    // Validate date range
    const fromDate = new Date(state.modal.formData.fromDate);
    const toDate = new Date(state.modal.formData.toDate);
    if (toDate < fromDate) {
      dispatch({ 
        type: ACTIONS.SET_ERROR, 
        payload: "To date cannot be before from date" 
      });
      return;
    }

    setIsSubmitting(true);
    dispatch({ type: ACTIONS.CLEAR_ERROR });

    try {
      await api.createLeave({
        userId: state.employeeSearch.selected.id,
        type: state.modal.formData.type,
        fromDate: state.modal.formData.fromDate,
        toDate: state.modal.formData.toDate,
        reason: state.modal.formData.reason,
      });

      handleCloseModal();
      await refreshLeaves();
    } catch (err) {
      dispatch({ 
        type: ACTIONS.SET_ERROR, 
        payload: err.message || "Failed to create leave request" 
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleStatusUpdate = async (id, status) => {
    // Guard against double-clicks firing two requests for the same row
    if (state.processingId) return;

    dispatch({ type: ACTIONS.SET_PROCESSING_ID, payload: id });
    dispatch({ type: ACTIONS.CLEAR_ERROR });
    try {
      await api.updateLeaveStatus(id, { status });
      await refreshLeaves();
    } catch (err) {
      dispatch({ 
        type: ACTIONS.SET_ERROR, 
        payload: err.message || `Failed to ${status.toLowerCase()} leave request` 
      });
    } finally {
      dispatch({ type: ACTIONS.SET_PROCESSING_ID, payload: null });
    }
  };

  // Note: this re-throws on failure (rather than only dispatching a banner error).
  // RejectLeaveModal awaits this call and only closes itself if it resolves,
  // so swallowing the error here would make the modal close as if the
  // rejection succeeded even when the backend request actually failed.
  const handleRejectConfirm = async (rejectionReason) => {
    await api.updateLeaveStatus(state.rejectingLeave._id, {
      status: "Rejected",
      rejectionReason,
    });
    dispatch({ type: ACTIONS.SET_REJECTING_LEAVE, payload: null });
    await refreshLeaves();
  };

  const handleFilterChange = (key, value) => {
    dispatch({ 
      type: ACTIONS.SET_FILTERS, 
      payload: { [key]: value } 
    });
  };

  const handleResetFilters = () => {
    dispatch({ type: ACTIONS.RESET_FILTERS });
  };

  const handleRetry = () => {
    dispatch({ type: ACTIONS.CLEAR_ERROR });
    loadData();
  };

  // Forces an immediate sweep instead of waiting for the background job's
  // 15-minute interval — mainly useful for testing/verifying the 24h
  // auto-reject feature, or right after nudging the review window.
  const handleProcessExpired = async () => {
    setIsProcessingExpired(true);
    dispatch({ type: ACTIONS.CLEAR_ERROR });
    try {
      const result = await api.processExpiredLeaves();
      await refreshLeaves();
      if (result?.processed) {
        alert(`Auto-rejected ${result.processed} expired leave request(s).`);
      } else {
        alert("No expired leave requests to process right now.");
      }
    } catch (err) {
      dispatch({
        type: ACTIONS.SET_ERROR,
        payload: err.message || "Failed to process expired leave requests",
      });
    } finally {
      setIsProcessingExpired(false);
    }
  };

  // ============================================
  // RENDER HELPERS
  // ============================================
  const getStatusBadge = (status) => {
    const classes = {
      Pending: "status-pending",
      Approved: "status-approved",
      Rejected: "status-rejected",
      Cancelled: "status-cancelled",
    };
    return `status-badge ${classes[status] || "status-pending"}`;
  };

  const formatDate = (dateString) => {
    if (!dateString) return "";
    try {
      return new Date(dateString).toLocaleDateString();
    } catch {
      return dateString;
    }
  };

  const leaveTypes = [
    "Annual",
    "Sick",
    "Casual",
    "Maternity",
    "Paternity",
    "Unpaid",
    "Other"
  ];

  const statusOptions = [
    "All",
    "Pending",
    "Approved",
    "Rejected",
    "Cancelled"
  ];

  // ============================================
  // LOADING STATE
  // ============================================
  if (state.loading) {
    return (
      <div className="loading-spinner">
        <div className="spinner" />
        <p>Loading leave data...</p>
      </div>
    );
  }

  // ============================================
  // RENDER
  // ============================================
  return (
    <div className="leave-page">
      {/* Header */}
      <header className="page-header">
        <div>
          <h1>Leave Management</h1>
          <p className="page-subtitle">
            {state.leaves.length} total requests • 
            {state.stats.pending || 0} pending
          </p>
        </div>
        <div className="header-actions">
          {isAdmin && <button
            hidden={!isAdmin}
            className="btn-secondary"
            onClick={handleProcessExpired}
            disabled={isProcessingExpired}
            title="Immediately sweep for Pending requests past the 24h deadline, instead of waiting for the automatic background check"
          >
            <Icon name="schedule" />
            {isProcessingExpired ? "Checking..." : "Check Overdue Requests"}
          </button>}
          {hasPermission("leave.create") && <button
            className="btn-primary"
            onClick={handleOpenModal}
            disabled={state.employees.length === 0}
          >
            <Icon name="add" /> Apply Leave
          </button>}
        </div>
      </header>

      {/* Error Display */}
      {state.error && (
        <div className="error-message">
          <Icon name="error" />
          <span>{state.error}</span>
          <button onClick={handleRetry} className="error-retry">
            Retry
          </button>
          <button 
            onClick={() => dispatch({ type: ACTIONS.CLEAR_ERROR })}
            className="error-close"
          >
            ✕
          </button>
        </div>
      )}

      {/* Stats Grid */}
      <div className="stats-grid">
        <div className="stat-card pending">
          <span>Pending</span>
          <strong>{state.stats.pending || 0}</strong>
        </div>
        <div className="stat-card approved">
          <span>Approved</span>
          <strong>{state.stats.approved || 0}</strong>
        </div>
        <div className="stat-card rejected">
          <span>Rejected</span>
          <strong>{state.stats.rejected || 0}</strong>
        </div>
        <div className="stat-card cancelled">
          <span>Cancelled</span>
          <strong>{state.stats.cancelled || 0}</strong>
        </div>
      </div>

      {/* Filters */}
    <div className="outer-filter-bar">
      <div className="filter-bar">
        <input
          className="search-input"
          type="text"
          placeholder=" Search employee..."
          value={state.filters.search}
          onChange={(e) => handleFilterChange("search", e.target.value)}
        />

        <select
          value={state.filters.status}
          onChange={(e) => handleFilterChange("status", e.target.value)}
        >
          {statusOptions.map((status) => (
            <option key={status} value={status}>
              {status}
            </option>
          ))}
        </select>

        <select
          value={state.filters.type}
          onChange={(e) => handleFilterChange("type", e.target.value)}
        >
          <option value="All">All Types</option>
          {leaveTypes.map((type) => (
            <option key={type} value={type}>
              {type}
            </option>
          ))}
        </select>

        <button
          className="btn-secondary"
          onClick={handleResetFilters}
          disabled={
            state.filters.search === "" &&
            state.filters.status === "All" &&
            state.filters.type === "All"
          }
        >
          Reset Filters
        </button>
      </div>
</div>
      {/* Table */}
      <div className="table-container">
        <table className="leave-table">
          <thead>
            <tr>
              <th>Employee</th>
              <th>Type</th>
              <th>From</th>
              <th>To</th>
              <th>Reason</th>
              <th>Status</th>
              <th>Deadline</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {paginatedLeaves.length === 0 ? (
              <tr>
                <td colSpan="8" className="text-center">
                  {state.filters.search || state.filters.status !== "All" || state.filters.type !== "All" 
                    ? "No leave requests match the current filters"
                    : "No leave requests found"}
                </td>
              </tr>
            ) : (
              paginatedLeaves.map((leave) => {
                const isProcessing = state.processingId === leave._id;
                const isAutoRejected = leave.rejectionReason?.startsWith(AUTO_REJECT_REASON_PREFIX);
                const remaining = getTimeRemaining(leave, now);
                return (
                  <tr key={leave._id}>
                    <td>{leave.userId?.name || "N/A"}</td>
                    <td>
                      <span className={`leave-type-badge ${leave.type?.toLowerCase() || "other"}`}>
                        {leave.type}
                      </span>
                    </td>
                    <td>{formatDate(leave.fromDate)}</td>
                    <td>{formatDate(leave.toDate)}</td>
                    <td className="leave-reason-cell" title={leave.reason || ""}>
                      {leave.reason?.length > 50 
                        ? `${leave.reason.substring(0, 50)}...` 
                        : leave.reason}
                    </td>
                    <td>
                      <span className={getStatusBadge(leave.status)}>
                        {leave.status}
                      </span>
                      {isAutoRejected && (
                        <span
                          className="auto-rejected-tag"
                          title={leave.rejectionReason}
                        >
                          auto
                        </span>
                      )}
                    </td>
                    <td>
                      {remaining !== null ? (
                        <span
                          className={`deadline-pill ${
                            remaining <= 0
                              ? "overdue"
                              : remaining <= 2 * 60 * 60 * 1000
                              ? "urgent"
                              : ""
                          }`}
                          title="Auto-rejects if no decision is made within 24 hours of submission"
                        >
                          {remaining <= 0 ? "Overdue" : formatTimeRemaining(remaining)}
                        </span>
                      ) : (
                        <span className="deadline-pill na">—</span>
                      )}
                    </td>
                    <td className="actions-cell">
                      {leave.status === "Pending" && (hasPermission("leave.approve") || hasPermission("leave.reject")) && (
                        <>
                          {hasPermission("leave.approve") && (
                          <button
                            className="btn-action approve"
                            onClick={() => handleStatusUpdate(leave._id, "Approved")}
                            disabled={isProcessing}
                            title="Approve leave"
                          >
                            <Icon name="check_circle" />
                          </button>
                          )}
                          {hasPermission("leave.reject") && (
                          <button
                            className="btn-action reject"
                            onClick={() => dispatch({ 
                              type: ACTIONS.SET_REJECTING_LEAVE, 
                              payload: leave 
                            })}
                            disabled={isProcessing}
                            title="Reject leave"
                          >
                            <Icon name="close" />
                          </button>
                          )}
                        </>
                      )}
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      <Pagination
        page={state.currentPage}
        totalPages={totalPages}
        itemCount={filteredLeaves.length}
        pageSize={PAGE_SIZE}
        itemLabel="leave requests"
        onPageChange={(page) => dispatch({ type: ACTIONS.SET_PAGE, payload: page })}
      />

      {/* Apply Leave Modal */}
      {state.modal.isOpen && (
        <div className="modal-overlay" onClick={handleCloseModal}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2>Apply Leave</h2>
              <button
                className="modal-close"
                onClick={handleCloseModal}
                disabled={isSubmitting}
                aria-label="Close modal"
              >
                ✕
              </button>
            </div>
            
            <form onSubmit={handleSubmit}>
              <div className="modal-body">
                {/* Employee Search */}
                <div className="form-group" ref={employeeSearchRef}>
                  <label>
                    Employee <span className="required">*</span>
                  </label>
                  <div className="employee-search-container">
                    <input
                      type="text"
                      className={`employee-search-input ${
                        state.employeeSearch.selected ? "has-selection" : ""
                      }`}
                      placeholder="Search by name, ID, department, or email..."
                      value={state.employeeSearch.query}
                      onChange={handleEmployeeSearchChange}
                      onFocus={() => {
                        if (state.employees.length > 0) {
                          dispatch({ 
                            type: ACTIONS.SET_SHOW_EMPLOYEE_DROPDOWN, 
                            payload: true 
                          });
                        }
                      }}
                      disabled={isSubmitting}
                      autoComplete="off"
                      required
                    />
                    
                    {state.employeeSearch.selected && (
                      <div className="selected-employee-display">
                        <Icon name="check_circle" className="selected-check" />
                        <span>{state.employeeSearch.selected.name}</span>
                        <button
                          type="button"
                          className="clear-selection"
                          onClick={handleClearEmployeeSelection}
                          disabled={isSubmitting}
                          aria-label="Clear selection"
                        >
                          ✕
                        </button>
                      </div>
                    )}

                    {/* Dropdown */}
                    {state.employeeSearch.showDropdown && (
                      <div className="employee-dropdown">
                        {filteredEmployees.length === 0 ? (
                          <div className="employee-dropdown-empty">
                            {state.employees.length === 0
                              ? "No eligible employees found"
                              : state.employeeSearch.query.trim()
                              ? "No employees match that search"
                              : "Type a name, ID, department, or email"}
                          </div>
                        ) : (
                          filteredEmployees.map((employee) => (
                            <div
                              key={employee.id}
                              className={`employee-dropdown-item ${
                                state.employeeSearch.selected?.id === employee.id
                                  ? "selected"
                                  : ""
                              }`}
                              onClick={() => handleSelectEmployee(employee)}
                            >
                              <div className="employee-dropdown-main">
                                <span className="employee-name">{employee.name}</span>
                                <span className="employee-meta">
                                  {[
                                    employee.employeeId && `#${employee.employeeId}`,
                                    employee.designation,
                                    employee.department,
                                  ]
                                    .filter(Boolean)
                                    .join(" · ")}
                                </span>
                                {employee.email && (
                                  <span className="employee-email">{employee.email}</span>
                                )}
                              </div>
                              <span
                                className={`employee-status ${employee.status
                                  ?.toLowerCase()
                                  .replace(/\s+/g, "-") || "active"}`}
                              >
                                {employee.status || "Active"}
                              </span>
                            </div>
                          ))
                        )}
                      </div>
                    )}
                  </div>
                </div>

                {/* Leave Type */}
                <div className="form-group">
                  <label>
                    Leave Type <span className="required">*</span>
                  </label>
                  <select
                    value={state.modal.formData.type}
                    onChange={(e) => handleFormChange("type", e.target.value)}
                    required
                    disabled={isSubmitting}
                  >
                    {leaveTypes.map((type) => (
                      <option key={type} value={type}>
                        {type}
                      </option>
                    ))}
                  </select>
                </div>
                
                {/* Date Range */}
                <div className="form-row">
                  <div className="form-group">
                    <label>
                      From Date <span className="required">*</span>
                    </label>
                    <input
                      type="date"
                      value={state.modal.formData.fromDate}
                      onChange={(e) => handleFormChange("fromDate", e.target.value)}
                      required
                      disabled={isSubmitting}
                      min={new Date().toISOString().split("T")[0]}
                    />
                  </div>
                  <div className="form-group">
                    <label>
                      To Date <span className="required">*</span>
                    </label>
                    <input
                      type="date"
                      value={state.modal.formData.toDate}
                      onChange={(e) => handleFormChange("toDate", e.target.value)}
                      required
                      disabled={isSubmitting}
                      min={state.modal.formData.fromDate || new Date().toISOString().split("T")[0]}
                    />
                  </div>
                </div>
                
                {/* Reason */}
                <div className="form-group">
                  <label>
                    Reason <span className="required">*</span>
                  </label>
                  <textarea
                    value={state.modal.formData.reason}
                    onChange={(e) => handleFormChange("reason", e.target.value)}
                    placeholder="Enter reason for leave..."
                    rows={3}
                    required
                    disabled={isSubmitting}
                    maxLength={500}
                  />
                  <span className="character-count">
                    {state.modal.formData.reason.length}/500
                  </span>
                </div>
              </div>
              
              <div className="modal-footer">
                <button
                  type="button"
                  className="btn-secondary"
                  onClick={handleCloseModal}
                  disabled={isSubmitting}
                >
                  Cancel
                </button>
                <button 
                  type="submit" 
                  className="btn-primary"
                  disabled={isSubmitting || !state.employeeSearch.selected}
                >
                  {isSubmitting ? (
                    <>
                      <span className="spinner-small" />
                      Submitting...
                    </>
                  ) : (
                    "Submit Leave Request"
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Reject Modal */}
      <RejectLeaveModal
        open={!!state.rejectingLeave}
        leave={state.rejectingLeave}
        onClose={() => dispatch({ 
          type: ACTIONS.SET_REJECTING_LEAVE, 
          payload: null 
        })}
        onConfirm={handleRejectConfirm}
      />
    </div>
  );
}