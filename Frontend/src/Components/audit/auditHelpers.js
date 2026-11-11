export const ITEMS_PER_PAGE = 10;

export const SEVERITY_STATUS = {
  info: { label: "Success", bg: "#F0FDF4", fg: "#16A34A", border: "#BBF7D0" },
  warning: {
    label: "Pending",
    bg: "#FFFBEB",
    fg: "#D97706",
    border: "#FDE68A",
  },
  critical: {
    label: "Failed",
    bg: "#FFF1F2",
    fg: "#DC2626",
    border: "#FECDD3",
  },
};

export const AVATAR_COLORS = [
  "#3B82F6",
  "#F59E0B",
  "#10B981",
  "#64748B",
  "#8B5CF6",
  "#06B6D4",
  "#EC4899",
  "#EF4444",
];

export const MODULE_COLORS = {
  Payroll: { bg: "#F0FDF4", fg: "#16A34A" },
  Attendance: { bg: "#EFF6FF", fg: "#2563EB" },
  Security: { bg: "#FFF1F2", fg: "#DC2626" },
  Auth: { bg: "#FFF7ED", fg: "#D97706" },
  "User Management": { bg: "#F5F3FF", fg: "#7C3AED" },
  Modules: { bg: "#F0FDFA", fg: "#0D9488" },
  System: { bg: "#F8FAFC", fg: "#64748B" },
  Infrastructure: { bg: "#FFF7ED", fg: "#D97706" },
  Finance: { bg: "#F0FDF4", fg: "#16A34A" },
  Compliance: { bg: "#FFFBEB", fg: "#D97706" },
};

export const DATE_FILTERS = [
  { label: "All Time", value: "all" },
  { label: "Last 24 Hours", value: "24h" },
  { label: "Last 7 Days", value: "7d" },
  { label: "Current Month", value: "30d" },
];

//Pure helpers 

export const getInitials = (name = "") =>
  name
    .split(" ")
    .slice(0, 2)
    .map((n) => n[0])
    .join("")
    .toUpperCase() || "?";

export const getAvatarColor = (name = "") =>
  AVATAR_COLORS[(name.charCodeAt(0) || 0) % AVATAR_COLORS.length];

export const formatTimestamp = (ts) => {
  if (!ts) return "—";
  const d = new Date(ts);
  const time = d.toLocaleTimeString("en-US", {
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: false,
  });
  const date = d.toLocaleDateString("en-IN", {
    day: "numeric",
    month: "short",
  });
  return `${time} · ${date}`;
};

export const isToday = (ts) => {
  if (!ts) return false;
  const d = new Date(ts);
  const now = new Date();
  return (
    d.getDate() === now.getDate() &&
    d.getMonth() === now.getMonth() &&
    d.getFullYear() === now.getFullYear()
  );
};

export const isWithinDays = (ts, days) =>
  !!ts && Date.now() - new Date(ts).getTime() < days * 86400000;

export const getRowClass = (severity) => {
  if (severity === "critical") return "al-row al-row-critical";
  if (severity === "warning") return "al-row al-row-warning";
  return "al-row";
};

//Filter logic (shared between page and table) 

export const applyFilters = (
  logs,
  { search, dateFilter, moduleFilter, severityFilter },
) =>
  logs.filter((l) => {
    const q = search.toLowerCase();
    const matchSearch =
      !q ||
      l.adminName?.toLowerCase().includes(q) ||
      l.action?.toLowerCase().includes(q) ||
      l.details?.toLowerCase().includes(q);

    const matchDate =
      dateFilter === "24h"
        ? isWithinDays(l.timestamp, 1)
        : dateFilter === "7d"
          ? isWithinDays(l.timestamp, 7)
          : dateFilter === "30d"
            ? isWithinDays(l.timestamp, 30)
            : true;

    const matchModule = !moduleFilter || l.module === moduleFilter;
    const matchSeverity = !severityFilter || l.severity === severityFilter;

    return matchSearch && matchDate && matchModule && matchSeverity;
  });
