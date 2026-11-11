import { useState, useEffect, useCallback } from "react";
import { api, exportAuditLogsRaw } from "../services/api.js";
import AuditStats from "../Components/audit/AuditStats.jsx";
import AuditFilters from "../Components/audit/AuditFilters.jsx";
import AuditTable from "../Components/audit/AuditTable.jsx";
import AuditPagination from "../Components/audit/AuditPagination.jsx";
import {
  applyFilters,
  ITEMS_PER_PAGE,
} from "../Components/audit/auditHelpers.js";
import "../styles/Auditlog.css";

export default function AuditLog() {
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [exporting, setExporting] = useState(false);

  const [search, setSearch] = useState("");
  const [dateFilter, setDateFilter] = useState("all");
  const [moduleFilter, setModuleFilter] = useState("");
  const [severityFilter, setSeverityFilter] = useState("");

  const [page, setPage] = useState(1);
  const [highlighted, setHighlighted] = useState(null);

  const fetchLogs = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const data = await api.getAuditLogs({ limit: 100 });
      setLogs(Array.isArray(data.logs) ? data.logs : []);
      // console.log("Audit Logs Response:", data.logs);
    } catch (err) {
      setError(err.message || "Failed to load audit logs.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchLogs();
  }, [fetchLogs]);
  useEffect(() => {
    setPage(1);
  }, [search, dateFilter, moduleFilter, severityFilter]);

  const handleExport = async () => {
    setExporting(true);
    try {
      const csv = await exportAuditLogsRaw("csv");
      const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `audit-logs-${new Date().toISOString().split("T")[0]}.csv`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch (err) {
      setError("Export failed: " + err.message);
    } finally {
      setExporting(false);
    }
  };

  const allModules = [
    ...new Set(logs.map((l) => l.module).filter(Boolean)),
  ].sort();
  const filtered = applyFilters(logs, {
    search,
    dateFilter,
    moduleFilter,
    severityFilter,
  });
  const totalPages = Math.max(1, Math.ceil(filtered.length / ITEMS_PER_PAGE));
  const safePage = Math.min(page, totalPages);
  const pageRows = filtered.slice(
    (safePage - 1) * ITEMS_PER_PAGE,
    safePage * ITEMS_PER_PAGE,
  );

  const handleRowClick = (id) =>
    setHighlighted((prev) => (prev === id ? null : id));

  const handleClear = () => {
    setSearch("");
    setDateFilter("all");
    setModuleFilter("");
    setSeverityFilter("");
  };

  return (
    <div className="al-page">
      <header className="al-page-header">
        <div>
          <h2 className="al-page-title">Audit Logs</h2>
          <p className="al-page-sub">
            Every action by every user — who did what, when, from where
          </p>
        </div>
        <button
          className="al-refresh-btn"
          onClick={fetchLogs}
          disabled={loading}
        >
          {loading ? "Loading..." : "Refresh"}
        </button>
      </header>

      {error && (
        <div className="al-error-banner">
          <span className="material-symbols-outlined">error</span>
          {error}
          <button className="al-error-dismiss" onClick={() => setError("")}>
            ✕
          </button>
        </div>
      )}

      <AuditStats logs={logs} loading={loading} />

      <AuditFilters
        search={search}
        dateFilter={dateFilter}
        moduleFilter={moduleFilter}
        severityFilter={severityFilter}
        allModules={allModules}
        resultCount={filtered.length}
        exporting={exporting}
        onSearch={setSearch}
        onDateFilter={setDateFilter}
        onModuleFilter={setModuleFilter}
        onSeverityFilter={setSeverityFilter}
        onClear={handleClear}
        onExport={handleExport}
      />

      <div className="al-table-card">
        <AuditTable
          rows={pageRows}
          loading={loading}
          setlog={setLogs}
          highlighted={highlighted}
          onRowClick={handleRowClick}
        />
        <AuditPagination
          current={safePage}
          total={totalPages}
          filtered={filtered.length}
          itemsPerPage={ITEMS_PER_PAGE}
          onChange={setPage}
        />
      </div>
    </div>
  );
}
