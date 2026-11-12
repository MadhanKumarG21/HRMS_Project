// src/pages/Reports.jsx
import { useState, useEffect, useCallback, useRef } from "react";
import { api } from "../services/api.js";
import Icon from "../Components/Icon.jsx";
import { StatsSkeleton, TableSkeleton } from "../Components/common/Skeleton.jsx";
import { useAuth } from "../hooks/useAuth.jsx";
import "../styles/Reports.css";

// ─── Helper Functions ─────────────────────────────────────────────────────

const getDefaultStartDate = () =>
  new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split("T")[0];

const getDefaultEndDate = () => new Date().toISOString().split("T")[0];
const getDefaultPayrollPeriod = () => new Date().toISOString().slice(0, 7);
const REPORT_LIMIT = 500;

const FALLBACK_REPORT_TYPES = [
  {
    id: "employee",
    label: "Employee Report",
    description: "List of all employees with details",
  },
  {
    id: "attendance",
    label: "Attendance Report",
    description: "Attendance records for date range",
  },
  {
    id: "leave",
    label: "Leave Report",
    description: "Leave requests and status",
  },
  {
    id: "payroll",
    label: "Payroll Summary",
    description: "Estimated salaries, allowances, and deductions",
  },
];

const getReportColumns = (record = {}) =>
  Object.keys(record).filter(
    (key) =>
      key !== "_id" &&
      key !== "__v" &&
      key !== "updatedAt" &&
      key !== "createdAt",
  );

// ─── Main Component ──────────────────────────────────────────────────────

export default function Reports() {
  const { hasPermission } = useAuth();
  const reportRequestId = useRef(0);
  // ─── State ─────────────────────────────────────────────────────────────
  const [reportType, setReportType] = useState("employee");
  const [startDate, setStartDate] = useState(getDefaultStartDate);
  const [endDate, setEndDate] = useState(getDefaultEndDate);
  const [payrollPeriod, setPayrollPeriod] = useState(getDefaultPayrollPeriod);
  const [reportData, setReportData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [exporting, setExporting] = useState(false);
  const [reportTypes, setReportTypes] = useState(FALLBACK_REPORT_TYPES);
  const [searchTerm, setSearchTerm] = useState("");

  // ─── Load Report Types ─────────────────────────────────────────────────

  useEffect(() => {
    const loadReportTypes = async () => {
      try {
        const types = await api.getReportTypes();
        setReportTypes(
          Array.isArray(types) && types.length ? types : FALLBACK_REPORT_TYPES,
        );
      } catch (err) {
        console.error("Failed to load report types:", err);
        setReportTypes(FALLBACK_REPORT_TYPES);
      }
    };
    loadReportTypes();
  }, []);

  // ─── Generate Report ───────────────────────────────────────────────────

  const generateReport = useCallback(async () => {
    const requestId = ++reportRequestId.current;
    if (
      (reportType === "attendance" || reportType === "leave") &&
      startDate > endDate
    ) {
      setReportData(null);
      setError("The start date must be on or before the end date.");
      setLoading(false);
      return;
    }

    setLoading(true);
    setError("");
    setReportData(null);

    try {
      let response;
      switch (reportType) {
        case "employee": {
          response = await api.getEmployeeReport({
            page: 1,
            limit: REPORT_LIMIT,
          });
          break;
        }

        case "attendance": {
          response = await api.getAttendanceReport({
            from: startDate,
            to: endDate,
            page: 1,
            limit: REPORT_LIMIT,
          });
          break;
        }

        case "leave": {
          response = await api.getLeaveReport({
            from: startDate,
            to: endDate,
            page: 1,
            limit: REPORT_LIMIT,
          });
          break;
        }

        case "payroll": {
          const [year, month] = payrollPeriod.split("-");
          response = await api.getPayrollReport({ month, year });
          break;
        }

        default:
          throw new Error("Please select a supported report type.");
      }

      if (!response || !Array.isArray(response.data)) {
        throw new Error("The server returned an invalid report.");
      }

      if (requestId === reportRequestId.current) {
        setReportData({
          type: reportType,
          stats: response.summary || {},
          records: response.data,
          note: response.note || "",
          pagination: response.pagination || null,
        });
      }
    } catch (err) {
      console.error("Report generation error:", err);
      if (requestId === reportRequestId.current) {
        setError(err.message || "Failed to generate report");
      }
    } finally {
      if (requestId === reportRequestId.current) {
        setLoading(false);
      }
    }
  }, [reportType, startDate, endDate, payrollPeriod]);

  // ─── Auto-generate on type change ─────────────────────────────────────

  useEffect(() => {
    generateReport();
  }, [generateReport]);

  // ─── Export CSV ────────────────────────────────────────────────────────

  const filteredRecords = (reportData?.records || []).filter(
    (record) =>
      !searchTerm.trim() ||
      JSON.stringify(record)
        .toLowerCase()
        .includes(searchTerm.trim().toLowerCase()),
  );
  const reportColumns = getReportColumns(filteredRecords[0]);

  const exportCSV = async () => {
    if (filteredRecords.length === 0) {
      setError("No data to export");
      setTimeout(() => setError(""), 3000);
      return;
    }

    setExporting(true);
    setError("");

    try {
      const headers = reportColumns;
      const escapeCSV = (value) =>
        `"${String(value ?? "").replace(/"/g, '""')}"`;
      const csv = [
        headers.map(formatHeader).map(escapeCSV).join(","),
        ...filteredRecords.map((record) =>
          headers
            .map((header) => escapeCSV(formatValue(record[header])))
            .join(","),
        ),
      ].join("\r\n");
      const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = `${reportType}-report-${new Date().toISOString().split("T")[0]}.csv`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.setTimeout(() => URL.revokeObjectURL(url), 0);
    } catch (err) {
      console.error("Export error:", err);
      setError("Failed to export CSV: " + err.message);
      setTimeout(() => setError(""), 3000);
    } finally {
      setExporting(false);
    }
  };

  // ─── Format Header Labels ─────────────────────────────────────────────

  const formatHeader = (key) => {
    const labels = {
      userId: "Employee",
      name: "Name",
      email: "Email",
      department: "Department",
      designation: "Designation",
      employeeId: "Employee ID",
      status: "Status",
      date: "Date",
      checkIn: "Check In",
      checkOut: "Check Out",
      workingHours: "Working Hours",
      overtimeHours: "Overtime",
      type: "Leave Type",
      fromDate: "From Date",
      toDate: "To Date",
      reason: "Reason",
      approvedBy: "Approved By",
      rejectionReason: "Rejection Reason",
      joiningDate: "Joining Date",
      dateOfBirth: "Date of Birth",
      gender: "Gender",
      phone: "Phone",
      address: "Address",
      emergencyContact: "Emergency Contact",
      role: "Role",
      lastLogin: "Last Login",
      createdAt: "Created At",
      updatedAt: "Updated At",
    };
    return (
      labels[key] ||
      key.charAt(0).toUpperCase() + key.slice(1).replace(/([A-Z])/g, " $1")
    );
  };

  // ─── Format Value ──────────────────────────────────────────────────────

  const formatValue = (value) => {
    if (value === null || value === undefined) return "-";
    if (typeof value === "object" && value !== null) {
      if (value.name) return value.name;
      if (value.email) return value.email;
      if (value._id) return String(value._id).substring(0, 8);
      return JSON.stringify(value);
    }
    if (typeof value === "string" && value.match(/^\d{4}-\d{2}-\d{2}T/)) {
      return new Date(value).toLocaleDateString();
    }
    return String(value);
  };

  // ─── Stats Labels ──────────────────────────────────────────────────────

  const getStatLabel = (key) => {
    const labels = {
      total: "Total",
      active: "Active",
      inactive: "Inactive",
      onLeave: "On Leave",
      terminated: "Terminated",
      present: "Present",
      absent: "Absent",
      late: "Late",
      halfDay: "Half Day",
      holiday: "Holiday",
      leave: "Leave",
      pending: "Pending",
      approved: "Approved",
      rejected: "Rejected",
      cancelled: "Cancelled",
      totalWorkingHours: "Total Working Hours",
      totalOvertime: "Total Overtime",
      totalEmployees: "Total Employees",
      totalSalary: "Total Salary",
      totalAllowances: "Total Allowances",
      totalDeductions: "Total Deductions",
      averageSalary: "Average Salary",
    };
    return (
      labels[key] ||
      key.charAt(0).toUpperCase() + key.slice(1).replace(/([A-Z])/g, " $1")
    );
  };

  // ─── Get Stat Color ────────────────────────────────────────────────────

  const getStatColor = (key, value) => {
    if (
      key === "pending" ||
      key === "absent" ||
      key === "inactive" ||
      key === "terminated"
    ) {
      return value > 0 ? "stat-danger" : "stat-success";
    }
    if (key === "approved" || key === "active" || key === "present") {
      return "stat-success";
    }
    if (key === "rejected" || key === "cancelled") {
      return value > 0 ? "stat-warning" : "stat-success";
    }
    return "";
  };

  // ─── Handle Search Change ─────────────────────────────────────────────

  const handleSearchChange = (e) => {
    setSearchTerm(e.target.value);
  };

  // ─── Clear Search ──────────────────────────────────────────────────────

  const clearSearch = () => {
    setSearchTerm("");
  };

  // ─── Render ─────────────────────────────────────────────────────────────

  return (
    <div className="reports-page">
      <header className="page-header">
        <div>
          <h1>Reports</h1>
          <p className="page-subtitle">
            Generate and export reports
            {reportData && (
              <span className="report-count">
                {filteredRecords.length} records found
              </span>
            )}
          </p>
        </div>
        <button
          className="btn-primary"
          onClick={exportCSV}
          disabled={
            !hasPermission("reports.export") ||
            filteredRecords.length === 0 ||
            exporting
          }
          title={
            !hasPermission("reports.export")
              ? "Export permission required"
              : undefined
          }
        >
          <Icon name="download" />
          {exporting ? "Exporting..." : "Export CSV"}
        </button>
      </header>

      {error && (
        <div className="error-message">
          <Icon name="error" /> {error}
        </div>
      )}

      {/* ─── Filters ────────────────────────────────────────────────── */}
      <div className="reports-filters">
        {/* Search Input */}
        <div className="filter-group search-group">
          <label>Search</label>
          <div className="search-input-wrapper">
            <Icon name="search" className="search-icon" />
            <input
              type="text"
              placeholder="Search employee, ID, department..."
              value={searchTerm}
              onChange={handleSearchChange}
              className="search-input"
            />
            {searchTerm && (
              <button className="clear-search" onClick={clearSearch}>
                <Icon name="close" />
              </button>
            )}
          </div>
        </div>

        <div className="filter-group">
          <label>Report Type</label>
          <select
            value={reportType}
            onChange={(e) => setReportType(e.target.value)}
          >
            {reportTypes
              .filter(
                (type) =>
                  type.id !== "payroll" || hasPermission("reports.export"),
              )
              .map((type) => (
              <option key={type.id} value={type.id}>
                {type.label}
              </option>
              ))}
          </select>
        </div>

        {(reportType === "attendance" || reportType === "leave") && (
          <>
            <div className="filter-group">
              <label>From</label>
              <input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
              />
            </div>
            <div className="filter-group">
              <label>To</label>
              <input
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
              />
            </div>
          </>
        )}

        {reportType === "payroll" && (
          <div className="filter-group">
            <label htmlFor="payroll-period">Payroll month</label>
            <input
              id="payroll-period"
              type="month"
              value={payrollPeriod}
              onChange={(e) => setPayrollPeriod(e.target.value)}
            />
          </div>
        )}

        <button
          className="btn-secondary"
          onClick={generateReport}
          disabled={loading}
        >
          {loading ? (
            <>
              <span className="spinner-small" /> Generating...
            </>
          ) : (
            <>
              <Icon name="refresh" /> Generate
            </>
          )}
        </button>
      </div>

      {/* ─── Report Preview ────────────────────────────────────────── */}
      <div className="report-preview">
        {loading ? (
          <div
            className="report-loading-skeleton"
            role="status"
            aria-busy="true"
            aria-label="Generating report"
          >
            <StatsSkeleton count={4} />
            <TableSkeleton rows={6} columns={6} />
          </div>
        ) : reportData ? (
          <div className="report-content">
            {reportData.note && (
              <p className="report-note" role="note">
                {reportData.note}
              </p>
            )}
            {reportData.pagination?.total > reportData.records.length && (
              <p className="report-note" role="note">
                Showing the first {reportData.records.length} of{" "}
                {reportData.pagination.total} records. CSV export includes the
                loaded records.
              </p>
            )}
            {/* Stats Summary */}
            {reportData.stats && Object.keys(reportData.stats).length > 0 && (
              <div className="report-stats">
                {Object.entries(reportData.stats)
                  .filter(([, value]) => typeof value === "number")
                  .map(([key, value]) => (
                    <div
                      className={`report-stat ${getStatColor(key, value)}`}
                      key={key}
                    >
                      <span className="stat-label">{getStatLabel(key)}</span>
                      <span className="stat-value">{value}</span>
                    </div>
                  ))}
              </div>
            )}

            {/* Table */}
            {filteredRecords.length > 0 ? (
              <div className="report-table-wrapper">
                <div className="table-header">
                  <span className="table-title">
                    {filteredRecords.length} Records
                  </span>
                  <span className="table-info">
                    Showing {Math.min(20, filteredRecords.length)} of{" "}
                    {filteredRecords.length}
                  </span>
                </div>
                <table className="report-table">
                  <thead>
                    <tr>
                      {reportColumns.map((key) => (
                        <th key={key}>{formatHeader(key)}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {filteredRecords.slice(0, 20).map((record, i) => (
                      <tr key={i}>
                        {reportColumns.map((key) => (
                          <td key={key}>{formatValue(record[key])}</td>
                        ))}
                      </tr>
                    ))}
                    {filteredRecords.length > 20 && (
                      <tr>
                        <td
                          colSpan={reportColumns.length}
                          className="text-center text-muted"
                        >
                          Showing first 20 of {filteredRecords.length}{" "}
                          records
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            ) : (
              <div className="no-data">
                <Icon name="search_off" />
                <p>No records found for this report</p>
              </div>
            )}
          </div>
        ) : (
          <div className="report-placeholder">
            <Icon
              name="description"
              style={{ fontSize: 48, color: "#cbd5e0" }}
            />
            <p>Select report type and generate</p>
            <span className="placeholder-hint">
              Choose a report from the dropdown above
            </span>
          </div>
        )}
      </div>
    </div>
  );
}
