export default function UserSummary({ stats, loading }) {
  const rows = stats?.usersByRole
    ? [
        {
          label: "Employees",
          value:
            stats.usersByRole.find((r) => r.name === "Employee")?.count ?? 0,
          danger: false,
        },
        {
          label: "Managers",
          value:
            stats.usersByRole.find((r) => r.name === "Manager")?.count ?? 0,
          danger: false,
        },
        {
          label: "HR Staff",
          value: stats.usersByRole.find((r) => r.name === "HR")?.count ?? 0,
          danger: false,
        },
        {
          label: "Admins",
          value: stats.usersByRole.find((r) => r.name === "Admin")?.count ?? 0,
          danger: false,
        },
        { label: "Inactive", value: stats?.inactiveUsers ?? 0, danger: true },
      ]
    : [];

  if (loading && !stats) {
    return (
      <div className="card">
        <div className="card-title">User summary</div>
        {[1, 2, 3, 4, 5].map((i) => (
          <div key={i} className="skeleton-row" />
        ))}
      </div>
    );
  }

  return (
    <div className="card">
      <div className="card-title">User summary</div>
      {rows.map(({ label, value, danger }) => (
        <div key={label} className={`user-row${danger ? " danger-row" : ""}`}>
          <span className="user-row-label">{label}</span>
          <span className="user-row-val">{value}</span>
        </div>
      ))}
    </div>
  );
}
