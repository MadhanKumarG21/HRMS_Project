import { useState, useEffect, useCallback } from "react";
import { api } from "../../services/api.js";
import Pagination from "../Pagination.jsx";

export default function AuditLog() {
  const ITEMS_PER_PAGE = 10;
  const [currentPage, setCurrentPage] = useState(1);
  const [logs, setLogs] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const fetchLogs = useCallback(async (page, showLoading = true) => {
    try {
      if (showLoading) setLoading(true);
      const res = await api.getAuditLogs({
        page,
        limit: ITEMS_PER_PAGE,
      });
      setLogs(res.data || res);
      setError(null);
    } catch (err) {
      if (
        err.message?.includes("401") ||
        err.message?.includes("Unauthorized")
      ) {
        setError("Session expired. Please login again.");
      } else {
        setError(err.message || "Failed to fetch data");
      }
    } finally {
      if (showLoading) setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchLogs(currentPage, true);
  }, [currentPage, fetchLogs]);

  useEffect(() => {
    const lastPage = Math.max(1, Number(logs?.totalPages) || 1);
    if (currentPage > lastPage) setCurrentPage(lastPage);
  }, [currentPage, logs?.totalPages]);

  const handleExport = async () => {
    try {
      const csvContent = await api.exportAuditLogsRaw("csv");

      const blob = new Blob([csvContent], {
        type: "text/csv",
      });

      const url = window.URL.createObjectURL(blob);

      const a = document.createElement("a");
      a.href = url;
      a.download = `audit-logs-${new Date().toISOString().split("T")[0]}.csv`;

      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);

      window.URL.revokeObjectURL(url);
    } catch (err) {
      console.error("Export failed:", err);
    }
  };

  if (loading && !logs) {
    return (
      <div className="audit-card">
        <div className="audit-head">
          <div className="card-title">Recent Audit Log</div>
        </div>

        <div className="skeleton-table" />
      </div>
    );
  }
const auditLogs = Array.isArray(logs?.logs) ? logs.logs : [];

const rows = auditLogs.map((log) => ({
  id: log._id,
  user: log.adminName || "System",
  action: log.action,
  module: log.module || "System",
  time: log.timestamp
    ? new Date(log.timestamp).toLocaleTimeString("en-US", {
        hour: "2-digit",
        minute: "2-digit",
      })
    : "--",
  ip: log.ipAddress || "--",
  severity: log.severity || "info",
}));
const totalPages = logs?.totalPages || 1;
  const currentRows = rows;


  return (
    <div className="audit-card">
      <div className="audit-head">
        <div className="card-title">Recent Audit Log</div>

        <button className="view-all" onClick={handleExport}>
          Export CSV
        </button>
      </div>

      <table>
        <thead>
          <tr>
            <th>User</th>
            <th>Action</th>
            <th>Module</th>
            <th>Time</th>
            <th>IP Address</th>
          </tr>
        </thead>

        <tbody>
          {currentRows.map((r) => (
            <tr key={r.id}>
              <td className="td-name">{r.user}</td>

              <td>
                <span className={`action-badge action-${r.severity}`}>
                  {r.action}
                </span>
              </td>

              <td>
                <span className="module-tag">{r.module}</span>
              </td>

              <td>{r.time}</td>

              <td className="td-right">{r.ip}</td>
            </tr>
          ))}

          {currentRows.length === 0 && (
            <tr>
              <td
                colSpan="5"
                className="text-center"
                style={{
                  padding: "20px",
                  color: "var(--text-muted)",
                }}
              >
                No audit logs found
              </td>
            </tr>
          )}
        </tbody>
      </table>

      <Pagination
        page={currentPage}
        totalPages={totalPages}
        itemCount={logs?.total || 0}
        pageSize={ITEMS_PER_PAGE}
        itemLabel="logs"
        onPageChange={setCurrentPage}
      />
    </div>
  );
}
