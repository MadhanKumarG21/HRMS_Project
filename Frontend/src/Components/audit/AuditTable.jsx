import {
  getInitials,
  getAvatarColor,
  formatTimestamp,
  getRowClass,
  SEVERITY_STATUS,
  MODULE_COLORS,
} from "./auditHelpers.js";

//Atoms 

function Avatar({ name }) {
  return (
    <div className="al-avatar" style={{ background: getAvatarColor(name) }}>
      {getInitials(name)}
    </div>
  );
}

function StatusBadge({ severity }) {
  const s = SEVERITY_STATUS[severity] || SEVERITY_STATUS.info;
  return (
    <span
      className="al-status-badge"
      style={{ background: s.bg, color: s.fg, border: `1px solid ${s.border}` }}
    >
      {s.label}
    </span>
  );
}

function ModuleBadge({ module }) {
  const m = MODULE_COLORS[module] || { bg: "#F1F5F9", fg: "#475569" };
  return (
    <span className="al-module-badge" style={{ background: m.bg, color: m.fg }}>
      {module || "System"}
    </span>
  );
}

function SeverityTag({ severity }) {
  return (
    <span className={`al-severity-tag al-sev-${severity || "info"}`}>
      {(severity || "info").toUpperCase()}
    </span>
  );
}

function SkeletonRow() {
  return (
    <tr className="al-row al-skeleton-row">
      {[180, 220, 80, 70, 130, 90, 70].map((w, i) => (
        <td key={i} className="al-td">
          <div className="al-skeleton" style={{ width: w }} />
        </td>
      ))}
    </tr>
  );
}

//Main Table 

export default function AuditTable({ rows, loading, setlog , highlighted, onRowClick }) {
  return (
    <div className="al-table-wrap">
      <table className="al-table">
        <thead>
          <tr>
            {[
              "User",
              "Action",
              "Module",
              "Severity",
              "Timestamp",
              "IP Address",
              "Status",
            ].map((h) => (
              <th key={h} className="al-th">
                {h}
              </th>
            ))}
          </tr>
        </thead>

        <tbody>
          {loading ? (
            [...Array(8)].map((_, i) => <SkeletonRow key={i} />)
          ) : rows.length === 0 ? (
            <tr>
              <td colSpan={7} className="al-empty">
              
                <p>No audit logs match your filters.</p>
              </td>
            </tr>
          ) : (
            rows.map((log) => (
              <tr
                key={log._id}
                className={`${getRowClass(log.severity)} ${highlighted === log._id ? "al-row-highlighted" : ""}`}
                onClick={() => onRowClick(log._id)}
              >
                {/* User */}
                <td className="al-td">
                  <div className="al-user-cell">
                    <Avatar name={log.adminName} />
                    <span className="al-user-name">
                      {log.adminName || "System"}
                    </span>
                  </div>
                </td>

                {/* Action + details */}
                <td className="al-td al-action-cell">
                  <p className="al-action-text">
                    {log.action?.replace(/_/g, " ")}
                  </p>
                  {log.details && (
                    <p className="al-action-detail">{log.details}</p>
                  )}
                </td>

                {/* Module */}
                <td className="al-td">
                  <ModuleBadge module={log.module} />
                </td>

                {/* Severity */}
                <td className="al-td">
                  <SeverityTag severity={log.severity} />
                </td>

                {/* Timestamp */}
                <td className="al-td al-mono">
                  {formatTimestamp(log.timestamp)}
                </td>

                {/* IP */}
                <td className="al-td al-mono al-ip">{log.ipAddress || "—"}</td>

                {/* Status */}
                <td className="al-td">
                  <StatusBadge severity={log.severity} />
                </td>
              </tr>
            ))
          )}
        </tbody>
      </table>
    </div>
  );
}
