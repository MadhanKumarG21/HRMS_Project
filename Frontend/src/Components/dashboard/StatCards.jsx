import Icon from "../Icon.jsx";

// Formats seconds into a short duration string, e.g. "3d 4h" or "12m"
function formatUptimeDuration(seconds) {
  if (!seconds && seconds !== 0) return "--";
  const days = Math.floor(seconds / 86400);
  const hours = Math.floor((seconds % 86400) / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);

  if (days > 0) return `${days}d ${hours}h`;
  if (hours > 0) return `${hours}h ${minutes}m`;
  return `${minutes}m`;
}

// Maps an average response time to a 0-100 progress width.
// <100ms = excellent (full bar), scales down, floors at 10% so the bar
// never fully disappears.
function responseTimeProgress(ms) {
  if (ms == null) return 0;
  if (ms <= 100) return 100;
  if (ms >= 1000) return 10;
  return Math.max(10, Math.round(100 - ((ms - 100) / 900) * 90));
}

export default function StatCards({ stats, loading }) {
  if (loading && !stats) {
    return (
      <div className="stat-grid">
        {[1, 2, 3, 4].map((i) => (
          <div key={i} className="stat-card skeleton" />
        ))}
      </div>
    );
  }

  const uptimePercent = stats?.uptimePercent;
  const avgResponseTime = stats?.avgResponseTime;

  const statData = [
    {
      label: "System Uptime",
      badge:
        uptimePercent == null || uptimePercent >= 99
          ? "Operational"
          : uptimePercent >= 95
            ? "Degraded"
            : "Down",
      badgeClass:
        uptimePercent == null || uptimePercent >= 99
          ? "badge-success"
          : uptimePercent >= 95
            ? "badge-warning"
            : "badge-danger",
      value: uptimePercent != null ? `${uptimePercent}%` : "--",
      valueClass: "stat-value-success",
      sub: (
        <>
          <Icon
            name="trending_up"
            style={{ color: "var(--success)", fontSize: 13 }}
          />
          <span>Up for {formatUptimeDuration(stats?.processUptimeSeconds)}</span>
        </>
      ),
    },
    {
      label: "Active Users",
      badge: "Live",
      badgeClass: "badge-primary badge-live",
      value: stats?.activeUsers ?? "--",
      valueClass: "stat-value-dark",
      sub: `${stats?.totalUsers ?? 0} total registered`,
    },
    {
      label: "Avg API Response",
      badge:
        avgResponseTime == null
          ? "Healthy"
          : avgResponseTime < 300
            ? "Healthy"
            : avgResponseTime < 800
              ? "Slow"
              : "Critical",
      badgeClass:
        avgResponseTime == null
          ? "badge-teal"
          : avgResponseTime < 300
            ? "badge-teal"
            : avgResponseTime < 800
              ? "badge-warning"
              : "badge-danger",
      value: avgResponseTime ?? "--",
      unit: avgResponseTime != null ? "ms" : "",
      valueClass: "stat-value-dark",
      sub: (
        <div className="progress-bar">
          <div
            className="progress-fill"
            style={{ width: `${responseTimeProgress(avgResponseTime)}%` }}
          />
        </div>
      ),
    },
    {
      label: "Inactive Accounts",
      badge: stats?.inactiveUsers > 0 ? "Attention" : "OK",
      badgeClass: stats?.inactiveUsers > 0 ? "badge-warning" : "badge-success",
      value: stats?.inactiveUsers ?? "--",
      valueClass: "stat-value-dark",
      sub: `${stats?.recentLogins ?? 0} logins today`,
    },
  ];

  return (
    <div className="stat-grid">
      {statData.map((card) => (
        <div className="stat-card" key={card.label}>
          <div className="stat-head">
            <span className="stat-label">{card.label}</span>
            <span className={`badge ${card.badgeClass}`}>
              {card.badge === "Live" && <span className="badge-live-dot" />}
              {card.badge}
            </span>
          </div>
          <div className={`stat-value ${card.valueClass}`}>
            {card.value}
            {card.unit && <span className="stat-unit">{card.unit}</span>}
          </div>
          <div className="stat-sub">{card.sub}</div>
        </div>
      ))}
    </div>
  );
}