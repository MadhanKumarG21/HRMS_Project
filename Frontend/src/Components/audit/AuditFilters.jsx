import { DATE_FILTERS } from "./auditHelpers.js";
import Icon from "../Icon.jsx";

export default function AuditFilters({
  search,
  dateFilter,
  moduleFilter,
  severityFilter,
  allModules,
  resultCount,
  exporting,
  onSearch,
  onDateFilter,
  onModuleFilter,
  onSeverityFilter,
  onClear,
  onExport,
}) {
  const isDirty =
    search || moduleFilter || severityFilter || dateFilter !== "all";

  return (
    <div className="al-filter-bar">
      {/* Search */}
      <div className="al-search-wrap">
        
        <input
          type="text"
          className="al-search-input"
          placeholder=" 🔍︎ Filter by user, action or details..."
          value={search}
          onChange={(e) => onSearch(e.target.value)}
        />
      </div>

      {/* Date range */}
      <select
        className="al-filter-select"
        value={dateFilter}
        onChange={(e) => onDateFilter(e.target.value)}
      >
        {DATE_FILTERS.map((d) => (
          <option key={d.value} value={d.value}>
            {d.label}
          </option>
        ))}
      </select>

      {/* Module */}
      <select
        className="al-filter-select"
        value={moduleFilter}
        onChange={(e) => onModuleFilter(e.target.value)}
      >
        <option value="">All Modules</option>
        {allModules.map((m) => (
          <option key={m} value={m}>
            {m}
          </option>
        ))}
      </select>

      {/* Severity / Status */}
      <select
        className="al-filter-select"
        value={severityFilter}
        onChange={(e) => onSeverityFilter(e.target.value)}
      >
        <option value="">All Status</option>
        <option value="info">Success</option>
        <option value="warning">Pending</option>
        <option value="critical">Failed</option>
      </select>

      {/* Result count */}
      <span className="al-result-count">
        {resultCount} result{resultCount !== 1 ? "s" : ""}
      </span>

      {/* Clear */}
      {isDirty && (
        <button className="al-clear-btn" onClick={onClear}>
          <Icon name="close" />
          Clear
        </button>
      )}

      {/* Export */}
      <button className="al-export-btn" onClick={onExport} disabled={exporting}>
        <Icon name="download" />
        {exporting ? "Exporting..." : "Export CSV"}
      </button>
    </div>
  );
}
