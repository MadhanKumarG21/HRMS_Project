const API_BASE = import.meta.env.VITE_API_URL || "http://localhost:5000/api";

const fetchClient = async (endpoint, options = {}) => {
  const url = `${API_BASE}${endpoint}`;
  const timeoutMs = options.timeoutMs || 600000;
  const requestOptions = { ...options };
  delete requestOptions.timeoutMs;

  // Timeout (10 minutes)
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

  const defaultOptions = {
    credentials: "include",
    signal: controller.signal,
    headers: {},
  };

  const mergedOptions = {
    ...defaultOptions,
    ...requestOptions,
    headers: {
      ...defaultOptions.headers,
      ...(requestOptions.headers || {}),
    },
  };

  // Automatically set JSON content type
  if (mergedOptions.body && !(mergedOptions.body instanceof FormData)) {
    mergedOptions.headers["Content-Type"] = "application/json";
  }

  // Remove Content-Type for FormData
  if (mergedOptions.body instanceof FormData) {
    delete mergedOptions.headers["Content-Type"];
  }

  // Endpoints whose own 401 responses carry a meaningful message
  // (wrong credentials, "not logged in" on initial session check) and
  // must NOT be treated as "session expired" / trigger a redirect.
  const AUTH_EXEMPT_ENDPOINTS = ["/auth/login", "/auth/me"];
  const isAuthExempt = AUTH_EXEMPT_ENDPOINTS.some((e) =>
    endpoint.startsWith(e),
  );

  try {
    const response = await fetch(url, mergedOptions);

    clearTimeout(timeoutId);

    // Session expired (skip for endpoints that report their own 401 reason)
    if (response.status === 401 && !isAuthExempt) {
      localStorage.removeItem("user");

      // Redirect only when the user is not already on login
      if (window.location.pathname !== "/login") {
        window.location.replace("/login");
      }

      throw new Error("Session expired. Please login again.");
    }

    // Blob download
    if (mergedOptions.responseType === "blob") {
      const blob = await response.blob();

      if (!response.ok) {
        const message = await blob.text().catch(() => "");
        throw new Error(message || "Download failed");
      }

      return blob;
    }

    // Read response only once
    const text = await response.text();

    let data = {};

    if (text.trim()) {
      try {
        data = JSON.parse(text);
      } catch (parseError) {
        console.error("[API] Invalid JSON:", text);
        throw new Error("Invalid response from server.", { cause: parseError });
      }
    }

    // Validation Errors
    if (!response.ok) {
      let apiError;

      if (Array.isArray(data.errors)) {
        apiError = new Error(data.message || "Validation failed");
        apiError.errors = data.errors;
      } else {
        apiError = new Error(
          data.message || data.error || `Request failed (${response.status})`,
        );
      }

      apiError.status = response.status;
      throw apiError;
    }

    return data;
  } catch (error) {
    if (error.name === "AbortError") {
      throw new Error("Request timed out. Please try again.", { cause: error });
    }

    if (error instanceof TypeError) {
      throw new Error(
        "Unable to connect to the server. Please check your connection.",
        { cause: error },
      );
    }

    // Expected, non-buggy cases: no/invalid session on an auth-exempt
    // endpoint (e.g. the initial /auth/me check before login, or a wrong
    // password on /auth/login). Don't spam the console for those.
    const isExpectedAuthFailure = isAuthExempt && error.status === 401;

    if (!isExpectedAuthFailure) {
      console.error("[API]", error);
    }

    throw error instanceof Error ? error : new Error("Unknown network error.");
  }
};

// Builds Query Parameters
// Example:buildQuery({page:1,search:"john"}) => ?page=1&search=john
const buildQuery = (params) => {
  if (!params) return "";

  const searchParams = new URLSearchParams();

  Object.entries(params).forEach(([key, value]) => {
    if (value !== undefined && value !== null && value !== "") {
      searchParams.append(key, value);
    }
  });

  const query = searchParams.toString();

  return query ? `?${query}` : "";
};

// AUTH APIs

export const authAPI = {
  // Login User
  login: (email, password) =>
    fetchClient("/auth/login", {
      method: "POST",
      body: JSON.stringify({
        email,
        password,
      }),
    }),

  // Logout User
  logout: () =>
    fetchClient("/auth/logout", {
      method: "POST",
    }),

  // Get Current Logged-in User
  getMe: () => fetchClient("/auth/me"),

  // Change Password
  changePassword: (currentPassword, newPassword, confirmNewPassword) =>
    fetchClient("/auth/change-password", {
      method: "POST",
      body: JSON.stringify({
        currentPassword,
        newPassword,
        confirmNewPassword,
      }),
    }),
};

// USER APIs
export const userAPI = {
  // Get All Users
  getAll: (params) => fetchClient(`/users${buildQuery(params)}`),

  // Get User By ID
  getById: (id) => fetchClient(`/users/${id}`),

  // Create User
  create: (data) =>
    fetchClient("/users/create", {
      method: "POST",
      body: JSON.stringify(data),
    }),

  // Update User
  update: (id, data) =>
    fetchClient(`/users/${id}`, {
      method: "PATCH",
      body: JSON.stringify(data),
    }),

  // Enable / Disable User
  toggleStatus: (id) =>
    fetchClient(`/users/${id}/toggle`, {
      method: "PATCH",
    }),

  // Delete User
  delete: (id) =>
    fetchClient(`/users/${id}`, {
      method: "DELETE",
    }),
};

// REPORT APIs
export const reportAPI = {
  // Available Report Types
  getTypes: () => fetchClient("/reports/types"),

  // Employee Report
  getEmployee: (params) =>
    fetchClient(`/reports/employee${buildQuery(params)}`),

  // Attendance Report
  getAttendance: (params) =>
    fetchClient(`/reports/attendance${buildQuery(params)}`),

  // Leave Report
  getLeave: (params) => fetchClient(`/reports/leave${buildQuery(params)}`),

  // Payroll Report
  getPayroll: (params) => fetchClient(`/reports/payroll${buildQuery(params)}`),
};

// ROLE APIs

export const roleAPI = {
  // Get All Roles
  getAll: () => fetchClient("/roles"),

  // Get Role By ID
  getById: (id) => fetchClient(`/roles/${id}`),

  // Create Role
  create: (data) =>
    fetchClient("/roles", {
      method: "POST",
      body: JSON.stringify(data),
    }),

  // Update Role
  update: (id, data) =>
    fetchClient(`/roles/${id}`, {
      method: "PATCH",
      body: JSON.stringify(data),
    }),

  // Delete Role
  delete: (id) =>
    fetchClient(`/roles/${id}`, {
      method: "DELETE",
    }),
};

// AUDIT APIs
export const auditAPI = {
  // Get Audit Logs
  getLogs: (params) => fetchClient(`/audit-logs${buildQuery(params)}`),

  // Export Audit Logs (Downloads CSV)
  export: async (params) => {
    const blob = await fetchClient(`/audit-logs/export${buildQuery(params)}`, {
      responseType: "blob",
    });

    let filename = "audit-logs.csv";

    // Optional: Try to read filename from response headers in future
    const link = document.createElement("a");

    link.href = URL.createObjectURL(blob);
    link.download = filename;

    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    URL.revokeObjectURL(link.href);

    return {
      success: true,
      filename,
    };
  },
};

// EXPORT AUDIT LOGS RAW
export const exportAuditLogsRaw = (params) =>
  fetchClient(`/audit-logs/export${buildQuery(params)}`, {
    responseType: "blob",
  });

// PASSWORD POLICY API
export const passwordPolicyAPI = {
  // Get Password Policy
  getPolicy: () => fetchClient("/users/password-policy"),
};

// DASHBOARD STATS APIs
export const statsAPI = {
  // Dashboard Statistics
  getDashboard: () => fetchClient("/stats"),
};

// MODULE APIs
export const moduleAPI = {
  // Get All Modules
  getAll: () => fetchClient("/modules"),

  // Get Module By ID
  getById: (id) => fetchClient(`/modules/${id}`),

  // Create Module
  create: (data) =>
    fetchClient("/modules", {
      method: "POST",
      body: JSON.stringify(data),
    }),

  // Enable / Disable Module
  toggle: (id) =>
    fetchClient(`/modules/${id}/toggle`, {
      method: "PATCH",
    }),

  // Delete Module
  delete: (id) =>
    fetchClient(`/modules/${id}`, {
      method: "DELETE",
    }),

  // Module Statistics
  getStats: () => fetchClient("/modules/stats"),

  // Update Module Order
  updateOrder: (modules) =>
    fetchClient("/modules/order", {
      method: "PUT",
      body: JSON.stringify({ modules }),
    }),
};

// NOTIFICATION APIs
export const notificationAPI = {
  // Get All Notifications
  getAll: (params) => fetchClient(`/notifications${buildQuery(params)}`),

  // Lightweight polling endpoint — just the unread count, not full rows
  getUnreadCount: () => fetchClient("/notifications/unread-count"),

  // Create Notification (Admin)
  create: (data) =>
    fetchClient("/notifications", {
      method: "POST",
      body: JSON.stringify(data),
    }),

  // Mark Single Notification as Read
  markAsRead: (id) =>
    fetchClient(`/notifications/${id}/read`, {
      method: "PATCH",
    }),

  // Mark Single Notification as Unread
  markAsUnread: (id) =>
    fetchClient(`/notifications/${id}/unread`, {
      method: "PATCH",
    }),

  // Mark All Notifications as Read
  markAllAsRead: () =>
    fetchClient("/notifications/read-all", {
      method: "PATCH",
    }),

  // Delete Single Notification
  delete: (id) =>
    fetchClient(`/notifications/${id}`, {
      method: "DELETE",
    }),

  // Delete Multiple Notifications
  deleteBatch: (ids) =>
    fetchClient("/notifications/batch-delete", {
      method: "POST",
      body: JSON.stringify({ ids }),
    }),

  // Clear Read Notifications
  clearRead: () =>
    fetchClient("/notifications/clear-read", {
      method: "DELETE",
    }),
};

// INTEGRATIONS APIs
export const integrationsAPI = {
  // Get Integration Status
  getStatus: () => fetchClient("/integrations/status"),
};

// SEARCH APIs

export const searchAPI = {
  // Global Search
  // Example:
  // searchAPI.global("john")
  // searchAPI.global("john", "employee")
  global: (query, type) =>
    fetchClient(
      `/search${buildQuery({
        q: query,
        type,
      })}`,
    ),
};

// BACKUP APIs
export const backupAPI = {
  // Run Manual Backup
  runBackup: () =>
    fetchClient("/backup", {
      method: "POST",
    }),
};

// RECRUITMENT APIs
export const recruitmentAPI = {
  getRequirements: () =>
    fetchClient("/recruitment/requirements"),

  createRequirement: (data) =>
    fetchClient("/recruitment/requirements", {
      method: "POST",
      body: JSON.stringify(data),
    }),

  analyzeCandidate: (formData) =>
    fetchClient("/recruitment/analyze", {
      method: "POST",
      body: formData,
      headers: {}, // Browser automatically sets multipart/form-data boundary
      timeoutMs: 300000,
    }),

  getAnalyses: () =>
    fetchClient("/recruitment/analyses"),

  updateCandidateStatus: (id, status) =>
    fetchClient(`/recruitment/candidates/${id}/status`, {
      method: "PATCH",
      body: JSON.stringify({ status }),
    }),

  deleteCandidate: (id) =>
    fetchClient(`/recruitment/candidates/${id}`, {
      method: "DELETE",
    }),
};


// PROFILE APIs
export const profileAPI = {
  // Get logged-in user's profile
  getMyProfile: () =>
    fetchClient("/profile/me"),

  // Update logged-in user's profile
  updateMyProfile: (data) =>
    fetchClient("/profile/me", {
      method: "PATCH",
      body: JSON.stringify(data),
    }),
};


// EMPLOYEE APIs
export const employeeAPI = {
  // Get All Employees
  // Was `() => fetchClient("/employees")` — silently ignored any params
  // passed to it. Combined with the backend defaulting to a 50-record
  // page, that meant callers had no way to ask for more, so newly created
  // employees (which get the highest, latest-sorting employeeId) became
  // permanently invisible in the Employees page once the org passed 50
  // employees — present in the DB and correctly counted in stats, but
  // never actually fetched into the list to search through.
  getAll: (params) => fetchClient(`/employees${buildQuery(params)}`),

  // Get Employee By ID
  getById: (id) => fetchClient(`/employees/${id}`),

  // Get Employee By User ID
  getByUserId: (userId) => fetchClient(`/employees/user/${userId}`),

  // Create Employee
  create: (data) =>
    fetchClient("/employees", {
      method: "POST",
      body: JSON.stringify(data),
    }),

  // Update Employee
  update: (id, data) =>
    fetchClient(`/employees/${id}`, {
      method: "PUT",
      body: JSON.stringify(data),
    }),

  // Delete Employee
  delete: (id) =>
    fetchClient(`/employees/${id}`, {
      method: "DELETE",
    }),

  // Employee Statistics
  getStats: () => fetchClient("/employees/stats"),
};

// LEAVE APIs
export const leaveAPI = {
  // Get All Leave Requests
  getAll: (params) => fetchClient(`/leaves${buildQuery(params)}`),

  // Get Leave By ID
  getById: (id) => fetchClient(`/leaves/${id}`),

  // Create Leave Request
  create: (data) =>
    fetchClient("/leaves", {
      method: "POST",
      body: JSON.stringify(data),
    }),

  // Update Leave Status
  updateStatus: (id, data) =>
    fetchClient(`/leaves/${id}/status`, {
      method: "PATCH",
      body: JSON.stringify(data),
    }),

  // Leave Statistics
  getStats: () => fetchClient("/leaves/stats"),

  // Manually trigger the expired-leave (24h) auto-reject sweep
  processExpired: () =>
    fetchClient("/leaves/process-expired", { method: "POST" }),
};

// ATTENDANCE APIs
export const attendanceAPI = {
  getAll: (params) =>
    fetchClient(`/attendance${buildQuery(params)}`),

  getById: (id) =>
    fetchClient(`/attendance/${id}`),

  getMyTodayAttendance: () =>
    fetchClient("/attendance/me/today"),

  getMyHistory: (params) =>
    fetchClient(`/attendance/me/history${buildQuery(params)}`),

  checkInAttendance: () =>
    fetchClient("/attendance/check-in", {
      method: "POST",
    }),

  checkOutAttendance: (checkOutAt) =>
    fetchClient("/attendance/check-out", {
      method: "POST",
      ...(checkOutAt ? { body: JSON.stringify({ checkOutAt }) } : {}),
    }),

  continueWork: () =>
    fetchClient("/attendance/continue-work", {
      method: "POST",
    }),

  create: (data) =>
    fetchClient("/attendance", {
      method: "POST",
      body: JSON.stringify(data),
    }),

  update: (id, data) =>
    fetchClient(`/attendance/${id}`, {
      method: "PUT",
      body: JSON.stringify(data),
    }),

  delete: (id) =>
    fetchClient(`/attendance/${id}`, {
      method: "DELETE",
    }),

  getStats: (params) =>
    fetchClient(`/attendance/stats${buildQuery(params)}`),

  processMissedCheckouts: () =>
    fetchClient("/attendance/process-missed-checkouts", {
      method: "POST",
    }),
};
// SETTINGS APIs
export const settingsAPI = {
  // Get All Settings
  getAll: () => fetchClient("/settings"),

  // Save All Settings
  saveAll: (data) =>
    fetchClient("/settings", {
      method: "POST",
      body: JSON.stringify(data),
    }),

  // Get Company Settings
  getCompany: () => fetchClient("/settings/company"),

  // Update Company Settings
  updateCompany: (data) =>
    fetchClient("/settings/company", {
      method: "PATCH",
      body: JSON.stringify(data),
    }),

  // Backup settings
  getBackupSettings: () => fetchClient("/settings/backup"),
  updateBackupSettings: (data) =>
    fetchClient("/settings/backup", {
      method: "PATCH",
      body: JSON.stringify(data),
    }),
  getBackupHistory: () => fetchClient("/settings/backup/history"),

  // Run Manual Backup
  runBackup: () =>
    fetchClient("/settings/backup/run", {
      method: "POST",
    }),
};

export const api = {
  // Authentication
  login: authAPI.login,
  logout: authAPI.logout,
  getMe: authAPI.getMe,
  changePassword: authAPI.changePassword,

  // Users
  getUsers: userAPI.getAll,
  getUser: userAPI.getById,
  createUser: userAPI.create,
  updateUser: userAPI.update,
  toggleUserStatus: userAPI.toggleStatus,
  deleteUser: userAPI.delete,

  // Roles
  getRoles: roleAPI.getAll,
  getRole: roleAPI.getById,
  createRole: roleAPI.create,
  updateRole: roleAPI.update,
  deleteRole: roleAPI.delete,

  // Reports
  getReportTypes: reportAPI.getTypes,
  getEmployeeReport: reportAPI.getEmployee,
  getAttendanceReport: reportAPI.getAttendance,
  getLeaveReport: reportAPI.getLeave,
  getPayrollReport: reportAPI.getPayroll,

  // Audit Logs
  getAuditLogs: auditAPI.getLogs,
  exportAuditLogs: auditAPI.export,
  exportAuditLogsRaw,

  // Dashboard Stats
  getStats: statsAPI.getDashboard,

  // Modules
  getModules: moduleAPI.getAll,
  getModule: moduleAPI.getById,
  createModule: moduleAPI.create,
  toggleModule: moduleAPI.toggle,
  deleteModule: moduleAPI.delete,
  getModuleStats: moduleAPI.getStats,
  updateModuleOrder: moduleAPI.updateOrder,

  // Notifications
  getNotifications: notificationAPI.getAll,
  getNotificationUnreadCount: notificationAPI.getUnreadCount,
  createNotification: notificationAPI.create,
  markNotificationRead: notificationAPI.markAsRead,
  markNotificationUnread: notificationAPI.markAsUnread,
  markAllNotificationsRead: notificationAPI.markAllAsRead,
  deleteNotification: notificationAPI.delete,
  deleteNotificationsBatch: notificationAPI.deleteBatch,
  clearReadNotifications: notificationAPI.clearRead,

  // Integrations
  getIntegrationsStatus: integrationsAPI.getStatus,

  // Password Policy
  getPasswordPolicy: passwordPolicyAPI.getPolicy,

  // Search
  search: searchAPI.global,

  // Backup
  runBackup: backupAPI.runBackup,

  // Recruitment
  getRecruitmentRequirements: recruitmentAPI.getRequirements,
  createRecruitmentRequirement: recruitmentAPI.createRequirement,
  analyzeRecruitmentCandidate: recruitmentAPI.analyzeCandidate,
  getRecruitmentAnalyses: recruitmentAPI.getAnalyses,
  updateRecruitmentCandidateStatus: recruitmentAPI.updateCandidateStatus,
  deleteRecruitmentCandidate: recruitmentAPI.deleteCandidate,

  // Employees
  getEmployees: employeeAPI.getAll,
  getEmployee: employeeAPI.getById,
  getEmployeeByUserId: employeeAPI.getByUserId,
  createEmployee: employeeAPI.create,
  updateEmployee: employeeAPI.update,
  deleteEmployee: employeeAPI.delete,
  getEmployeeStats: employeeAPI.getStats,

  // Leaves
  getLeaves: leaveAPI.getAll,
  getLeave: leaveAPI.getById,
  createLeave: leaveAPI.create,
  updateLeaveStatus: leaveAPI.updateStatus,
  getLeaveStats: leaveAPI.getStats,
  processExpiredLeaves: leaveAPI.processExpired,

  // Attendance
  getAttendance: attendanceAPI.getAll,
  getAttendanceById: attendanceAPI.getById,
  getMyTodayAttendance: attendanceAPI.getMyTodayAttendance,
  getMyAttendanceHistory: attendanceAPI.getMyHistory,
  checkInAttendance: attendanceAPI.checkInAttendance,
  checkOutAttendance: attendanceAPI.checkOutAttendance,
  continueAttendance: attendanceAPI.continueWork,
  createAttendance: attendanceAPI.create,
  updateAttendance: attendanceAPI.update,
  deleteAttendance: attendanceAPI.delete,
  getAttendanceStats: attendanceAPI.getStats,
  processMissedCheckouts: attendanceAPI.processMissedCheckouts,

  // Settings
  getSettings: settingsAPI.getAll,
  saveSettings: settingsAPI.saveAll,
  getCompanySettings: settingsAPI.getCompany,
  updateCompanySettings: settingsAPI.updateCompany,
  getBackupSettings: settingsAPI.getBackupSettings,
  updateBackupSettings: settingsAPI.updateBackupSettings,
  getBackupHistory: settingsAPI.getBackupHistory,
  runManualBackup: settingsAPI.runBackup,

  // Profile APIs
  getMyProfile: profileAPI.getMyProfile,
  updateMyProfile: profileAPI.updateMyProfile,
};

export default api;