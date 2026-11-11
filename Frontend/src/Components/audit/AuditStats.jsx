import { isToday } from "./auditHelpers.js";

function StatCard({ label, value, sub, valueClass = "" }) {
  return (
    <div className="al-stat-card">
      <p className="al-stat-label">{label}</p>
      <div className="al-stat-row">
        <span className={`al-stat-value ${valueClass}`}>{value}</span>
        <span className="al-stat-sub">{sub}</span>
      </div>
    </div>
  );
}

export default function AuditStats({ logs, loading }) {
  const total = logs.length;
  const today = logs.filter((l) => isToday(l.timestamp)).length;
  const system = logs.filter(
    (l) => l.adminName === "System" || l.module === "System",
  ).length;
  const critical = logs.filter((l) => l.severity === "critical").length;
  const info = logs.filter((l) => l.severity === "info").length;

  const v = (n) => (loading ? "—" : n);

  return (
    <div className="al-stats-grid">
      <StatCard label="Total Logs" value={v(total)} sub={`${v(today)} today`} />
      <StatCard
        label="System Actions"
        value={v(system)}
        sub="Automatic"
        valueClass="al-val-primary"
      />
      <StatCard
        label="Critical Events"
        value={v(critical)}
        sub="Needs review"
        valueClass="al-val-danger"
      />
      <StatCard
        label="Successful Actions"
        value={v(info)}
        sub="Info level"
        valueClass="al-val-teal"
      />
    </div>
  );
}
