// src/Components/common/Skeleton.jsx
import "../../styles/Skeleton.css";

// ─── Primitive Skeleton Box ──────────────────────────────────────────────────
export function Skeleton({ width = "100%", height = "16px", borderRadius, style, className = "" }) {
  return (
    <span
      className={`skeleton-box ${className}`}
      style={{
        width,
        height,
        borderRadius: borderRadius || (height === "100%" ? "8px" : undefined),
        ...style,
      }}
    />
  );
}

// ─── Header Skeleton ─────────────────────────────────────────────────────────
export function PageHeaderSkeleton({ hasButton = true, buttonWidth = 140 }) {
  return (
    <div className="skeleton-header">
      <div className="skeleton-header-left">
        <Skeleton width="220px" height="32px" borderRadius="6px" />
        <Skeleton width="340px" height="16px" borderRadius="4px" />
      </div>
      {hasButton && (
        <div className="skeleton-header-right">
          <Skeleton width={`${buttonWidth}px`} height="40px" borderRadius="8px" />
        </div>
      )}
    </div>
  );
}

// ─── Stats Grid Skeleton ─────────────────────────────────────────────────────
export function StatsSkeleton({ count = 4 }) {
  return (
    <div className="skeleton-stats-grid">
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} className="skeleton-stat-card">
          <div className="skeleton-stat-top">
            <Skeleton width="90px" height="14px" />
            <Skeleton width="24px" height="24px" borderRadius="50%" />
          </div>
          <Skeleton width="110px" height="30px" borderRadius="6px" />
          <Skeleton width="140px" height="12px" />
        </div>
      ))}
    </div>
  );
}

// ─── Filter Bar Skeleton ─────────────────────────────────────────────────────
export function FilterBarSkeleton({ filterCount = 2 }) {
  return (
    <div className="skeleton-filter-bar">
      <Skeleton width="260px" height="38px" borderRadius="6px" style={{ flex: "1 1 200px" }} />
      {Array.from({ length: filterCount }).map((_, i) => (
        <Skeleton key={i} width="140px" height="38px" borderRadius="6px" />
      ))}
    </div>
  );
}

// ─── Table Skeleton ──────────────────────────────────────────────────────────
export function TableSkeleton({ rows = 6, columns = 6 }) {
  const getCellWidth = (colIdx) => {
    if (colIdx === 0) return "60px";
    if (colIdx === 1) return "130px";
    if (colIdx === 2) return "160px";
    if (colIdx === columns - 1) return "70px";
    return "100px";
  };

  return (
    <div className="skeleton-table-container">
      <div className="skeleton-table-header">
        {Array.from({ length: columns }).map((_, col) => (
          <div key={col} className="skeleton-cell">
            <Skeleton width={getCellWidth(col)} height="14px" borderRadius="4px" />
          </div>
        ))}
      </div>
      {Array.from({ length: rows }).map((_, row) => (
        <div key={row} className="skeleton-table-row">
          {Array.from({ length: columns }).map((_, col) => (
            <div key={col} className="skeleton-cell">
              {col === 0 ? (
                <Skeleton width="45px" height="16px" borderRadius="4px" />
              ) : col === columns - 1 ? (
                <Skeleton width="60px" height="26px" borderRadius="6px" />
              ) : col === 1 ? (
                <div style={{ display: "flex", alignItems: "center", gap: 10, width: "100%" }}>
                  <Skeleton width="30px" height="30px" borderRadius="50%" />
                  <Skeleton width="100px" height="14px" />
                </div>
              ) : (
                <Skeleton width={getCellWidth(col)} height="16px" borderRadius="4px" />
              )}
            </div>
          ))}
        </div>
      ))}
    </div>
  );
}

// ─── Card Grid Skeleton ──────────────────────────────────────────────────────
export function CardsGridSkeleton({ count = 6 }) {
  return (
    <div className="skeleton-cards-grid">
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} className="skeleton-card">
          <div className="skeleton-card-header">
            <Skeleton width="44px" height="44px" borderRadius="10px" />
            <Skeleton width="70px" height="22px" borderRadius="20px" />
          </div>
          <div className="skeleton-card-body">
            <Skeleton width="75%" height="18px" />
            <Skeleton width="90%" height="13px" />
            <Skeleton width="60%" height="13px" />
          </div>
          <div className="skeleton-card-footer">
            <Skeleton width="90px" height="26px" borderRadius="20px" />
            <Skeleton width="28px" height="28px" borderRadius="6px" />
          </div>
        </div>
      ))}
    </div>
  );
}

// ─── Form / Settings Skeleton ────────────────────────────────────────────────
export function FormSkeleton({ sections = 2 }) {
  return (
    <div className="skeleton-form-container">
      <div className="skeleton-tabs-bar">
        <Skeleton width="110px" height="32px" borderRadius="6px" />
        <Skeleton width="130px" height="32px" borderRadius="6px" />
        <Skeleton width="100px" height="32px" borderRadius="6px" />
      </div>
      {Array.from({ length: sections }).map((_, s) => (
        <div key={s} style={{ display: "flex", flexDirection: "column", gap: 16 }}>
          <Skeleton width="180px" height="20px" borderRadius="4px" />
          <div className="skeleton-form-grid">
            {Array.from({ length: 4 }).map((_, f) => (
              <div key={f} className="skeleton-form-field">
                <Skeleton width="100px" height="14px" />
                <Skeleton width="100%" height="40px" borderRadius="6px" />
              </div>
            ))}
          </div>
        </div>
      ))}
      <div style={{ display: "flex", justifyContent: "flex-end", gap: 12, marginTop: 12 }}>
        <Skeleton width="90px" height="38px" borderRadius="6px" />
        <Skeleton width="120px" height="38px" borderRadius="6px" />
      </div>
    </div>
  );
}

// ─── List Skeleton ───────────────────────────────────────────────────────────
export function ListSkeleton({ count = 5 }) {
  return (
    <div className="skeleton-list-container">
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} className="skeleton-list-item">
          <Skeleton width="40px" height="40px" borderRadius="50%" style={{ flexShrink: 0 }} />
          <div className="skeleton-list-content">
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <Skeleton width="160px" height="16px" />
              <Skeleton width="65px" height="12px" />
            </div>
            <Skeleton width="85%" height="13px" />
            <Skeleton width="40%" height="11px" />
          </div>
        </div>
      ))}
    </div>
  );
}

// =============================================================================
// Dedicated Full-Page Skeletons
// =============================================================================

export function DashboardSkeleton() {
  return (
    <div className="skeleton-page-container" role="status" aria-busy="true" aria-label="Loading dashboard">
      <PageHeaderSkeleton hasButton={false} />
      <StatsSkeleton count={4} />
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(400px, 1fr))", gap: 20 }}>
        <div className="skeleton-card" style={{ minHeight: 280 }}>
          <Skeleton width="160px" height="20px" />
          <Skeleton width="100%" height="180px" borderRadius="8px" />
        </div>
        <div className="skeleton-card" style={{ minHeight: 280 }}>
          <Skeleton width="140px" height="20px" />
          <div style={{ display: "flex", flexDirection: "column", gap: 12, marginTop: 12 }}>
            <Skeleton width="100%" height="45px" borderRadius="8px" />
            <Skeleton width="100%" height="45px" borderRadius="8px" />
            <Skeleton width="100%" height="45px" borderRadius="8px" />
          </div>
        </div>
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(400px, 1fr))", gap: 20 }}>
        <ListSkeleton count={4} />
        <ListSkeleton count={4} />
      </div>
    </div>
  );
}

export function EmployeeDashboardSkeleton() {
  return (
    <div className="skeleton-page-container" role="status" aria-busy="true" aria-label="Loading dashboard">
      <PageHeaderSkeleton hasButton={false} />
      <StatsSkeleton count={3} />
      <div className="skeleton-card">
        <Skeleton width="160px" height="22px" />
        <div style={{ display: "flex", gap: 12, marginTop: 16 }}>
          <Skeleton width="120px" height="40px" borderRadius="8px" />
          <Skeleton width="120px" height="40px" borderRadius="8px" />
        </div>
      </div>
      <TableSkeleton rows={5} columns={4} />
      <TableSkeleton rows={5} columns={5} />
    </div>
  );
}

export function EmployeesSkeleton() {
  return (
    <div className="skeleton-page-container" role="status" aria-busy="true" aria-label="Loading employees">
      <PageHeaderSkeleton buttonWidth={150} />
      <StatsSkeleton count={5} />
      <FilterBarSkeleton filterCount={3} />
      <TableSkeleton rows={8} columns={8} />
    </div>
  );
}

export function AttendanceSkeleton() {
  return (
    <div className="skeleton-page-container" role="status" aria-busy="true" aria-label="Loading attendance">
      <PageHeaderSkeleton buttonWidth={140} />
      <div className="skeleton-card" style={{ padding: 24, display: "flex", flexDirection: "column", gap: 16 }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <Skeleton width="180px" height="22px" />
          <Skeleton width="120px" height="36px" borderRadius="20px" />
        </div>
        <div style={{ display: "flex", gap: 16, flexWrap: "wrap" }}>
          <Skeleton width="140px" height="40px" borderRadius="8px" />
          <Skeleton width="140px" height="40px" borderRadius="8px" />
        </div>
      </div>
      <StatsSkeleton count={4} />
      <FilterBarSkeleton filterCount={2} />
      <TableSkeleton rows={7} columns={7} />
    </div>
  );
}

export function LeaveSkeleton() {
  return (
    <div className="skeleton-page-container" role="status" aria-busy="true" aria-label="Loading leave management">
      <PageHeaderSkeleton buttonWidth={150} />
      <StatsSkeleton count={4} />
      <FilterBarSkeleton filterCount={2} />
      <TableSkeleton rows={6} columns={7} />
    </div>
  );
}

export function AuditLogSkeleton() {
  return (
    <div className="skeleton-page-container" role="status" aria-busy="true" aria-label="Loading audit log">
      <PageHeaderSkeleton buttonWidth={120} />
      <StatsSkeleton count={4} />
      <FilterBarSkeleton filterCount={3} />
      <TableSkeleton rows={8} columns={6} />
    </div>
  );
}

export function RolesSkeleton() {
  return (
    <div className="skeleton-page-container" role="status" aria-busy="true" aria-label="Loading roles">
      <PageHeaderSkeleton buttonWidth={140} />
      <CardsGridSkeleton count={4} />
    </div>
  );
}

export function ModulesSkeleton() {
  return (
    <div className="skeleton-page-container" role="status" aria-busy="true" aria-label="Loading modules">
      <PageHeaderSkeleton buttonWidth={150} />
      <StatsSkeleton count={3} />
      <FilterBarSkeleton filterCount={2} />
      <CardsGridSkeleton count={6} />
    </div>
  );
}

export function RecruitmentSkeleton() {
  return (
    <div className="skeleton-page-container" role="status" aria-busy="true" aria-label="Loading recruitment">
      <PageHeaderSkeleton buttonWidth={160} />
      <StatsSkeleton count={4} />
      <FilterBarSkeleton filterCount={2} />
      <CardsGridSkeleton count={3} />
      <TableSkeleton rows={6} columns={7} />
    </div>
  );
}

export function ReportsSkeleton() {
  return (
    <div className="skeleton-page-container" role="status" aria-busy="true" aria-label="Loading reports">
      <PageHeaderSkeleton buttonWidth={130} />
      <FilterBarSkeleton filterCount={3} />
      <div className="skeleton-card" style={{ height: 320, padding: 24 }}>
        <Skeleton width="200px" height="22px" />
        <Skeleton width="100%" height="230px" borderRadius="8px" style={{ marginTop: 16 }} />
      </div>
      <TableSkeleton rows={6} columns={6} />
    </div>
  );
}

export function SettingsSkeleton() {
  return (
    <div className="skeleton-page-container" role="status" aria-busy="true" aria-label="Loading settings">
      <PageHeaderSkeleton buttonWidth={120} />
      <FormSkeleton sections={3} />
    </div>
  );
}

export function NotificationSkeleton() {
  return (
    <div className="skeleton-page-container" role="status" aria-busy="true" aria-label="Loading notifications">
      <PageHeaderSkeleton buttonWidth={140} />
      <div className="skeleton-filter-bar">
        <Skeleton width="90px" height="32px" borderRadius="20px" />
        <Skeleton width="90px" height="32px" borderRadius="20px" />
        <Skeleton width="90px" height="32px" borderRadius="20px" />
      </div>
      <ListSkeleton count={7} />
    </div>
  );
}

export function ProfileSkeleton() {
  return (
    <div className="skeleton-page-container" role="status" aria-busy="true" aria-label="Loading profile">
      <div className="skeleton-card" style={{ padding: 28, display: "flex", gap: 24, alignItems: "center" }}>
        <Skeleton width="88px" height="88px" borderRadius="50%" style={{ flexShrink: 0 }} />
        <div style={{ display: "flex", flexDirection: "column", gap: 10, flex: 1 }}>
          <Skeleton width="220px" height="26px" />
          <Skeleton width="160px" height="15px" />
          <Skeleton width="100px" height="22px" borderRadius="20px" />
        </div>
      </div>
      <FormSkeleton sections={2} />
    </div>
  );
}

export function GenericPageSkeleton() {
  return (
    <div className="skeleton-page-container" role="status" aria-busy="true" aria-label="Loading page">
      <PageHeaderSkeleton />
      <StatsSkeleton count={4} />
      <TableSkeleton rows={6} columns={6} />
    </div>
  );
}
