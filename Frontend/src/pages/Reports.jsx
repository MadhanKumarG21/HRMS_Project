// src/pages/Reports.jsx
import { useState, useEffect, useCallback } from "react";
import { api } from "../services/api.js";
import Icon from "../Components/Icon.jsx";
import "../styles/Reports.css";

// ─── Helper Functions ─────────────────────────────────────────────────────

const getDefaultStartDate = () =>
  new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split("T")[0];

const getDefaultEndDate = () => new Date().toISOString().split("T")[0];

// ─── Main Component ──────────────────────────────────────────────────────

export default function Reports() {
  // ─── State ─────────────────────────────────────────────────────────────
  const [reportType, setReportType] = useState("employee");
  const [startDate, setStartDate] = useState(getDefaultStartDate);
  const [endDate, setEndDate] = useState(getDefaultEndDate);
  const [reportData, setReportData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [exporting, setExporting] = useState(false);
  const [reportTypes, setReportTypes] = useState([]);
  const [searchTerm, setSearchTerm] = useState("");

  // ─── Load Report Types ─────────────────────────────────────────────────

  useEffect(() => {
    const loadReportTypes = async () => {
      try {
        const types = await api.getReportTypes();
        setReportTypes(
          types || [
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
          ],
        );
      } catch (err) {
        console.error("Failed to load report types:", err);
        setReportTypes([
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
        ]);
      }
    };
    loadReportTypes();
  }, []);

  // ─── Generate Report ───────────────────────────────────────────────────

  const generateReport = useCallback(async () => {
    setLoading(true);
    setError("");
    setReportData(null);

    try {
      let data = null;
      let stats = {};
      let records = [];

      switch (reportType) {
        case "employee": {
          stats = await api.getEmployeeStats().catch(() => ({}));
          console.log(stats);

          const employees = await api.getEmployees().catch(() => []);
          console.log("Employees Response:", employees);
          // Apply search filter
          const filteredEmployees = searchTerm
            ? employees.filter(
                (emp) =>
                  emp?.userId?.name
                    ?.toLowerCase()
                    .includes(searchTerm.toLowerCase()) ||
                  emp?.employeeId
                    ?.toLowerCase()
                    .includes(searchTerm.toLowerCase()) ||
                  emp?.department
                    ?.toLowerCase()
                    .includes(searchTerm.toLowerCase()),
              )
            : employees;
          records = filteredEmployees;
          data = { stats, records, type: "employee" };
          break;
        }

        case "attendance": {
          stats = await api.getAttendanceStats().catch(() => ({}));
          const attendance = await api
            .getAttendance({ from: startDate, to: endDate })
            .catch(() => []);
          records = attendance;
          data = { stats, records, type: "attendance" };
          break;
        }

        case "leave": {
          stats = await api.getLeaveStats().catch(() => ({}));
          const leaves = await api
            .getLeaves({ from: startDate, to: endDate })
            .catch(() => []);
          records = leaves;
          data = { stats, records, type: "leave" };
          break;
        }

        default:
          data = null;
      }

      if (data) {
        setReportData(data);
      } else {
        setError("No data available for this report type");
      }
    } catch (err) {
      console.error("Report generation error:", err);
      setError(err.message || "Failed to generate report");
    } finally {
      setLoading(false);
    }
  }, [reportType, startDate, endDate, searchTerm]);

  // ─── Auto-generate on type change ─────────────────────────────────────

  useEffect(() => {
    generateReport();
  }, [reportType, generateReport]);

  // ─── Export CSV ────────────────────────────────────────────────────────

  const exportCSV = async () => {
    if (!reportData || !reportData.records || reportData.records.length === 0) {
      setError("No data to export");
      setTimeout(() => setError(""), 3000);
      return;
    }

    setExporting(true);
    setError("");

    try {
      const records = reportData.records;

      const headers = Object.keys(records[0] || {}).filter(
        (k) =>
          k !== "_id" && k !== "__v" && k !== "updatedAt" && k !== "createdAt",
      );

      let csv = headers.join(",") + "\n";

      records.forEach((record) => {
        const row = headers.map((header) => {
          let value = record[header];
          if (value === null || value === undefined) return "";
          if (typeof value === "object" && value !== null) {
            if (value.name) return `"${value.name}"`;
            if (value.email) return `"${value.email}"`;
            if (value._id) return `"${value._id}"`;
            return `"${JSON.stringify(value).replace(/"/g, '""')}"`;
          }
          const stringValue = String(value);
          if (
            stringValue.includes(",") ||
            stringValue.includes('"') ||
            stringValue.includes("\n")
          ) {
            return `"${stringValue.replace(/"/g, '""')}"`;
          }
          return stringValue;
        });
        csv += row.join(",") + "\n";
      });

      const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = `${reportType}-report-${new Date().toISOString().split("T")[0]}.csv`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
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
      if (value._id) return value._id.substring(0, 8);
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

  const handleSearchKeyDown = (e) => {
    if (e.key === "Enter") {
      generateReport();
    }
  };

  // ─── Clear Search ──────────────────────────────────────────────────────

  const clearSearch = () => {
    setSearchTerm("");
    generateReport();
  };

  // ─── Render ─────────────────────────────────────────────────────────────

  return (
    <div className="reports-page">
      <header className="page-header">
        <div>
          <h1>Reports</h1>
          <p className="page-subtitle">
            Generate and export reports
            {reportData && reportData.records && (
              <span className="report-count">
                {reportData.records.length} records found
              </span>
            )}
          </p>
        </div>
        <button
          className="btn-primary"
          onClick={exportCSV}
          disabled={
            !reportData ||
            !reportData.records ||
            reportData.records.length === 0 ||
            exporting
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
              onKeyDown={handleSearchKeyDown}
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
            {reportTypes.map((type) => (
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
          <div className="loading-state">
            <div className="spinner" />
            <p>Generating report...</p>
          </div>
        ) : reportData ? (
          <div className="report-content">
            {/* Stats Summary */}
            {reportData.stats && Object.keys(reportData.stats).length > 0 && (
              <div className="report-stats">
                {Object.entries(reportData.stats)
                  .filter(([key]) => !key.includes("by"))
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
            {reportData.records && reportData.records.length > 0 ? (
              <div className="report-table-wrapper">
                <div className="table-header">
                  <span className="table-title">
                    {reportData.records.length} Records
                  </span>
                  <span className="table-info">
                    Showing {Math.min(20, reportData.records.length)} of{" "}
                    {reportData.records.length}
                  </span>
                </div>
                <table className="report-table">
                  <thead>
                    <tr>
                      {Object.keys(reportData.records[0])
                        .filter(
                          (k) =>
                            k !== "_id" &&
                            k !== "__v" &&
                            k !== "updatedAt" &&
                            k !== "createdAt",
                        )
                        .map((key) => (
                          <th key={key}>{formatHeader(key)}</th>
                        ))}
                    </tr>
                  </thead>
                  <tbody>
                    {reportData.records.slice(0, 20).map((record, i) => (
                      <tr key={i}>
                        {Object.entries(record)
                          .filter(
                            ([k]) =>
                              k !== "_id" &&
                              k !== "__v" &&
                              k !== "updatedAt" &&
                              k !== "createdAt",
                          )
                          .map(([key, value]) => (
                            <td key={key}>{formatValue(value)}</td>
                          ))}
                      </tr>
                    ))}
                    {reportData.records.length > 20 && (
                      <tr>
                        <td
                          colSpan={
                            Object.keys(reportData.records[0]).filter(
                              (k) =>
                                k !== "_id" &&
                                k !== "__v" &&
                                k !== "updatedAt" &&
                                k !== "createdAt",
                            ).length
                          }
                          className="text-center text-muted"
                        >
                          Showing first 20 of {reportData.records.length}{" "}
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
