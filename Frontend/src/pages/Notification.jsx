// Frontend/src/pages/Notification.jsx
import { useState, useEffect, useCallback, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { api } from "../services/api.js";
import { useAuth } from "../hooks/useAuth.jsx";
import Icon from "../Components/Icon.jsx";
import "../styles/Notification.css";

const POLLING_INTERVAL = 30000;

const getNotificationIcon = (type) => {
  switch (type) {
    case "critical":
      return "error";
    case "warning":
      return "warning";
    case "success":
      return "check_circle";
    case "info":
    default:
      return "info";
  }
};

const formatRelativeTime = (dateValue) => {
  if (!dateValue) return "";
  const date = new Date(dateValue);
  if (Number.isNaN(date.getTime())) return "";

  const now = new Date();
  const diffInSeconds = Math.floor((now - date) / 1000);

  if (diffInSeconds < 0 || diffInSeconds < 10) return "Just now";
  if (diffInSeconds < 60) return `${diffInSeconds}s ago`;

  const minutes = Math.floor(diffInSeconds / 60);
  if (minutes < 60) return `${minutes}m ago`;

  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;

  const days = Math.floor(hours / 24);
  if (days < 7) return `${days}d ago`;

  const weeks = Math.floor(days / 7);
  if (weeks < 5) return `${weeks}w ago`;

  return date.toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
};

const formatFullDate = (dateValue) => {
  if (!dateValue) return "";
  const date = new Date(dateValue);
  if (Number.isNaN(date.getTime())) return "";
  return date.toLocaleString(undefined, {
    dateStyle: "medium",
    timeStyle: "short",
  });
};

export default function Notification() {
  const navigate = useNavigate();
  const { isAdmin } = useAuth();

  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState("");
  const [alertMessage, setAlertMessage] = useState(null);

  // Filters & Search
  const [search, setSearch] = useState("");
  const [statusTab, setStatusTab] = useState("all"); // 'all' | 'unread' | 'read'
  const [typeFilter, setTypeFilter] = useState("all"); // 'all' | 'info' | 'warning' | 'critical' | 'success'

  // Multi-selection for bulk actions
  const [selectedIds, setSelectedIds] = useState(new Set());

  // Admin Broadcast / Create Notification Modal
  const [showSendModal, setShowSendModal] = useState(false);
  const [sendForm, setSendForm] = useState({
    title: "",
    message: "",
    type: "info",
    link: "/notifications",
  });
  const [sending, setSending] = useState(false);

  // ─── Fetch Notifications ──────────────────────────────────────────
  const fetchNotifications = useCallback(async (isSilent = false) => {
    try {
      if (!isSilent) {
        setRefreshing(true);
      }
      setError("");

      const data = await api.getNotifications({ limit: 100 });
      const items = Array.isArray(data)
        ? data
        : Array.isArray(data?.notifications)
          ? data.notifications
          : Array.isArray(data?.data)
            ? data.data
            : [];

      setNotifications(items);
    } catch (err) {
      console.error("Failed to load notifications:", err);
      if (!isSilent) {
        setError(err.message || "Failed to load notifications.");
      }
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    fetchNotifications();

    const interval = setInterval(() => {
      fetchNotifications(true);
    }, POLLING_INTERVAL);

    return () => clearInterval(interval);
  }, [fetchNotifications]);

  // ─── Auto-dismiss Alert Banner ────────────────────────────────────
  useEffect(() => {
    if (alertMessage) {
      const timer = setTimeout(() => setAlertMessage(null), 4000);
      return () => clearTimeout(timer);
    }
  }, [alertMessage]);

  // ─── Statistics ───────────────────────────────────────────────────
  const stats = useMemo(() => {
    const total = notifications.length;
    const unread = notifications.filter((n) => !n.read).length;
    const alerts = notifications.filter(
      (n) => n.type === "critical" || n.type === "warning"
    ).length;
    const read = notifications.filter((n) => n.read).length;
    return { total, unread, alerts, read };
  }, [notifications]);

  // ─── Filtered Notifications ───────────────────────────────────────
  const filteredNotifications = useMemo(() => {
    return notifications.filter((n) => {
      // Status filter
      if (statusTab === "unread" && n.read) return false;
      if (statusTab === "read" && !n.read) return false;

      // Type filter
      const notificationType = n.type || "info";
      if (
        typeFilter === "priority" &&
        !["critical", "warning"].includes(notificationType)
      ) {
        return false;
      }
      if (
        typeFilter !== "all" &&
        typeFilter !== "priority" &&
        notificationType !== typeFilter
      ) {
        return false;
      }

      // Search query
      if (search.trim()) {
        const q = search.toLowerCase();
        const titleMatch = (n.title || "").toLowerCase().includes(q);
        const msgMatch = (n.message || "").toLowerCase().includes(q);
        if (!titleMatch && !msgMatch) return false;
      }

      return true;
    });
  }, [notifications, statusTab, typeFilter, search]);

  // ─── Selection Handlers ───────────────────────────────────────────
  const handleSelectAll = () => {
    if (
      selectedIds.size === filteredNotifications.length &&
      filteredNotifications.length > 0
    ) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(filteredNotifications.map((n) => n._id)));
    }
  };

  const handleToggleSelect = (id) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  // ─── Single Item Actions ──────────────────────────────────────────
  const handleToggleRead = async (notification) => {
    const nextRead = !notification.read;

    // Optimistic UI update
    setNotifications((prev) =>
      prev.map((item) =>
        item._id === notification._id ? { ...item, read: nextRead } : item
      )
    );

    try {
      if (nextRead) {
        await api.markNotificationRead(notification._id);
      } else {
        await api.markNotificationUnread(notification._id);
      }
    } catch (err) {
      console.error("Failed to update notification read status:", err);
      // Rollback on failure
      setNotifications((prev) =>
        prev.map((item) =>
          item._id === notification._id ? { ...item, read: !nextRead } : item
        )
      );
      setAlertMessage({
        type: "error",
        text: "Failed to update notification status.",
      });
    }
  };

const handleDelete = async (id) => {
  const confirmed = window.confirm(
    "Are you sure you want to delete this notification? This action cannot be undone."
  );

  if (!confirmed) {
    return;
  }

  const removedItem = notifications.find(
    (notification) => notification._id === id
  );

  // Optimistic removal
  setNotifications((prev) =>
    prev.filter((notification) => notification._id !== id)
  );

  setSelectedIds((prev) => {
    const next = new Set(prev);
    next.delete(id);
    return next;
  });

  try {
    await api.deleteNotification(id);

    setAlertMessage({
      type: "success",
      text: "Notification deleted successfully.",
    });
  } catch (err) {
    console.error("Failed to delete notification:", err);

    // Restore notification if API request fails
    if (removedItem) {
      setNotifications((prev) => [removedItem, ...prev]);
    }

    setAlertMessage({
      type: "error",
      text: "Failed to delete notification.",
    });
  }
};

  const handleActionClick = async (notification) => {
    if (!notification.read) {
      // Mark as read when navigating
      setNotifications((prev) =>
        prev.map((item) =>
          item._id === notification._id ? { ...item, read: true } : item
        )
      );
      api.markNotificationRead(notification._id).catch(() => {});
    }

    if (notification.link) {
      navigate(notification.link);
    }
  };

  // ─── Bulk & Global Actions ────────────────────────────────────────
  const handleMarkAllAsRead = async () => {
    if (stats.unread === 0) return;

    setNotifications((prev) =>
      prev.map((item) => ({ ...item, read: true }))
    );

    try {
      await api.markAllNotificationsRead();
      setAlertMessage({
        type: "success",
        text: "All notifications marked as read.",
      });
    } catch (err) {
      console.error("Failed to mark all as read:", err);
      fetchNotifications(true);
      setAlertMessage({
        type: "error",
        text: "Failed to mark all as read.",
      });
    }
  };

  const handleClearRead = async () => {
    if (stats.read === 0) return;

    const readItems = notifications.filter((n) => n.read);
    setNotifications((prev) => prev.filter((n) => !n.read));
    setSelectedIds(new Set());

    try {
      await api.clearReadNotifications();
      setAlertMessage({
        type: "success",
        text: "Read notifications cleared successfully.",
      });
    } catch (err) {
      console.error("Failed to clear read notifications:", err);
      setNotifications((prev) => [...prev, ...readItems]);
      setAlertMessage({
        type: "error",
        text: "Failed to clear read notifications.",
      });
    }
  };

  const handleBulkMarkRead = async () => {
    const ids = Array.from(selectedIds);
    if (ids.length === 0) return;

    setNotifications((prev) =>
      prev.map((n) => (selectedIds.has(n._id) ? { ...n, read: true } : n))
    );
    setSelectedIds(new Set());

    try {
      await Promise.all(ids.map((id) => api.markNotificationRead(id)));
      setAlertMessage({
        type: "success",
        text: `Marked ${ids.length} notifications as read.`,
      });
    } catch (err) {
      console.error("Bulk mark read failed:", err);
      fetchNotifications(true);
    }
  };

  const handleBulkDelete = async () => {
  const ids = Array.from(selectedIds);

  if (ids.length === 0) {
    return;
  }

  const confirmed = window.confirm(
    `Are you sure you want to delete ${ids.length} selected notification${
      ids.length === 1 ? "" : "s"
    }?\n\nThis action cannot be undone.`
  );

  if (!confirmed) {
    return;
  }

  const removed = notifications.filter((notification) =>
    selectedIds.has(notification._id)
  );

  setNotifications((prev) =>
    prev.filter((notification) => !selectedIds.has(notification._id))
  );

  setSelectedIds(new Set());

  try {
    await api.deleteNotificationsBatch(ids);

    window.alert(
      `Deleted ${ids.length} notification${
        ids.length === 1 ? "" : "s"
      } successfully.`
    );
  } catch (err) {
    console.error("Bulk delete failed:", err);

    setNotifications((prev) => [...removed, ...prev]);

    window.alert("Failed to delete selected notifications.");
  }
};
  // ─── Admin Send Notification Modal ────────────────────────────────
  const handleSendNotification = async (e) => {
    e.preventDefault();
    if (!sendForm.title.trim() || !sendForm.message.trim()) return;

    try {
      setSending(true);
      const created = await api.createNotification(sendForm);

      setNotifications((prev) => [created, ...prev]);
      setShowSendModal(false);
      setSendForm({
        title: "",
        message: "",
        type: "info",
        link: "/notifications",
      });
      setAlertMessage({
        type: "success",
        text: "Notification announcement sent successfully.",
      });
    } catch (err) {
      console.error("Failed to send notification:", err);
      setAlertMessage({
        type: "error",
        text: err.message || "Failed to broadcast notification.",
      });
    } finally {
      setSending(false);
    }
  };

  const handleClearFilters = () => {
    setSearch("");
    setStatusTab("all");
    setTypeFilter("all");
  };

  const isAllSelected =
    filteredNotifications.length > 0 &&
    filteredNotifications.every((n) => selectedIds.has(n._id));

  return (
    <div className="notif-page">
      {/* ── Alert Feedback Banner ─────────────────────────────────── */}
      {alertMessage && (
        <div className={`notif-alert-banner notif-alert-${alertMessage.type}`}>
          <Icon
            name={
              alertMessage.type === "success" ? "check_circle" : "error_outline"
            }
          />
          <span>{alertMessage.text}</span>
          <button
            type="button"
            className="notif-alert-close"
            onClick={() => setAlertMessage(null)}
            aria-label="Dismiss alert"
          >
            <Icon name="close" />
          </button>
        </div>
      )}

      {/* ── Page Header ───────────────────────────────────────────── */}
      <header className="notif-header">
        <div className="notif-title-area">
          <h1>Notifications</h1>
          <p className="notif-subtitle">
            Stay informed on leave requests, attendance alerts, and system updates
          </p>
        </div>

        <div className="notif-actions">
          {isAdmin && (
            <button
              type="button"
              className="notif-btn notif-btn-primary"
              onClick={() => setShowSendModal(true)}
            >
              <Icon name="add" />
              <span>Send Notification</span>
            </button>
          )}

          {stats.unread > 0 && (
            <button
              type="button"
              className="notif-btn notif-btn-secondary"
              onClick={handleMarkAllAsRead}
            >
              <Icon name="done_all" />
              <span>Mark All as Read</span>
            </button>
          )}

          {stats.read > 0 && (
            <button
              type="button"
              className="notif-btn notif-btn-danger-outline"
              onClick={handleClearRead}
              title="Clear all read notifications"
            >
              <Icon name="delete_sweep" />
              <span>Clear Read</span>
            </button>
          )}

          <button
            type="button"
            className="notif-btn notif-btn-secondary"
            onClick={() => fetchNotifications(false)}
            disabled={refreshing}
            title="Refresh notifications"
          >
            <Icon name="refresh" className={refreshing ? "spin" : ""} />
            <span>{refreshing ? "Refreshing..." : "Refresh"}</span>
          </button>
        </div>
      </header>

      {/* ── Stats Overview Cards ──────────────────────────────────── */}
      <section className="notif-stats-grid" aria-label="Notification Overview">
        <div
          className={`notif-stat-card ${statusTab === "all" ? "active" : ""}`}
          onClick={() => setStatusTab("all")}
        >
          <div className="notif-stat-icon total">
            <Icon name="notifications" />
          </div>
          <div className="notif-stat-details">
            <span className="notif-stat-value">{stats.total}</span>
            <span className="notif-stat-label">Total Notifications</span>
          </div>
        </div>

        <div
          className={`notif-stat-card ${statusTab === "unread" ? "active" : ""}`}
          onClick={() => setStatusTab("unread")}
        >
          <div className="notif-stat-icon unread">
            <Icon name="mark_email_unread" />
          </div>
          <div className="notif-stat-details">
            <span className="notif-stat-value">{stats.unread}</span>
            <span className="notif-stat-label">Unread Notifications</span>
          </div>
        </div>

        <div
          className={`notif-stat-card ${typeFilter === "priority" ? "active" : ""}`}
          onClick={() => {
            setTypeFilter((prev) => (prev === "priority" ? "all" : "priority"));
          }}
        >
          <div className="notif-stat-icon alerts">
            <Icon name="warning" />
          </div>
          <div className="notif-stat-details">
            <span className="notif-stat-value">{stats.alerts}</span>
            <span className="notif-stat-label">Priority Alerts</span>
          </div>
        </div>

        <div
          className={`notif-stat-card ${statusTab === "read" ? "active" : ""}`}
          onClick={() => setStatusTab("read")}
        >
          <div className="notif-stat-icon read">
            <Icon name="done_all" />
          </div>
          <div className="notif-stat-details">
            <span className="notif-stat-value">{stats.read}</span>
            <span className="notif-stat-label">Read / Resolved</span>
          </div>
        </div>
      </section>

      {/* ── Toolbar: Search, Tabs & Type Filters ──────────────────── */}
      <section className="notif-toolbar">
        <div className="notif-toolbar-row">
          {/* Search Box */}
          <div className="notif-search-wrap">
            <span className="notif-search-icon">
              <Icon name="search" />
            </span>
            <input
              type="text"
              className="notif-search-input"
              placeholder="Search notifications by title or content..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
            {search && (
              <button
                type="button"
                className="notif-search-clear"
                onClick={() => setSearch("")}
                aria-label="Clear search"
              >
                <Icon name="close" />
              </button>
            )}
          </div>

          {/* Status Tabs */}
          <div className="notif-tabs" role="tablist">
            <button
              type="button"
              className={`notif-tab ${statusTab === "all" ? "active" : ""}`}
              onClick={() => setStatusTab("all")}
              role="tab"
              aria-selected={statusTab === "all"}
            >
              All
              <span className="notif-tab-badge">{stats.total}</span>
            </button>

            <button
              type="button"
              className={`notif-tab ${statusTab === "unread" ? "active" : ""}`}
              onClick={() => setStatusTab("unread")}
              role="tab"
              aria-selected={statusTab === "unread"}
            >
              Unread
              <span className="notif-tab-badge">{stats.unread}</span>
            </button>

            <button
              type="button"
              className={`notif-tab ${statusTab === "read" ? "active" : ""}`}
              onClick={() => setStatusTab("read")}
              role="tab"
              aria-selected={statusTab === "read"}
            >
              Read
              <span className="notif-tab-badge">{stats.read}</span>
            </button>
          </div>
        </div>

        {/* Type Filter Pills */}
        <div className="notif-toolbar-row">
          <div className="notif-type-pills">
            <span className="notif-type-label">Filter by Type:</span>
            {[
              { key: "all", label: "All Types" },
              { key: "priority", label: "Priority" },
              { key: "critical", label: "Critical", dot: "dot-critical" },
              { key: "warning", label: "Warning", dot: "dot-warning" },
              { key: "info", label: "Info", dot: "dot-info" },
              { key: "success", label: "Success", dot: "dot-success" },
            ].map(({ key, label, dot }) => (
              <button
                type="button"
                key={key}
                className={`notif-pill ${typeFilter === key ? "active" : ""}`}
                onClick={() => setTypeFilter(key)}
              >
                {dot && <span className={`notif-pill-dot ${dot}`} />}
                <span>{label}</span>
              </button>
            ))}
          </div>

          {(search || statusTab !== "all" || typeFilter !== "all") && (
            <button
              type="button"
              className="notif-btn notif-btn-secondary"
              onClick={handleClearFilters}
              style={{ padding: "5px 12px", fontSize: "12px" }}
            >
              <Icon name="filter_alt_off" />
              <span>Reset Filters</span>
            </button>
          )}
        </div>
      </section>

      {/* ── Bulk Actions Bar ──────────────────────────────────────── */}
      {selectedIds.size > 0 && (
        <div className="notif-bulk-bar">
          <div className="notif-bulk-left">
            <input
              type="checkbox"
              className="notif-card-checkbox"
              checked={isAllSelected}
              onChange={handleSelectAll}
              aria-label="Select all"
            />
            <span>{selectedIds.size} selected</span>
          </div>

          <div className="notif-bulk-right">
            <button
              type="button"
              className="notif-bulk-btn"
              onClick={handleBulkMarkRead}
            >
              <Icon name="check" />
              <span>Mark as Read</span>
            </button>

            <button
              type="button"
              className="notif-bulk-btn notif-bulk-btn-danger"
              onClick={handleBulkDelete}
            >
              <Icon name="delete" />
              <span>Delete Selected</span>
            </button>
          </div>
        </div>
      )}

      {/* ── Main Notifications Feed ───────────────────────────────── */}
      {loading ? (
        <div className="notif-skeleton-list">
          {[1, 2, 3, 4, 5].map((i) => (
            <div key={i} className="notif-skeleton-card">
              <div className="notif-sk-circle" />
              <div className="notif-sk-body">
                <div className="notif-sk-line" style={{ width: "40%" }} />
                <div className="notif-sk-line" style={{ width: "85%" }} />
                <div className="notif-sk-line" style={{ width: "20%" }} />
              </div>
            </div>
          ))}
        </div>
      ) : error ? (
        <div className="notif-empty-state">
          <div
            className="notif-empty-icon-wrap"
            style={{ color: "#ef4444", background: "rgba(239, 68, 68, 0.1)" }}
          >
            <Icon name="error_outline" />
          </div>
          <h3 className="notif-empty-title">Failed to Load Notifications</h3>
          <p className="notif-empty-sub">{error}</p>
          <button
            type="button"
            className="notif-btn notif-btn-primary"
            onClick={() => fetchNotifications(false)}
          >
            Try Again
          </button>
        </div>
      ) : filteredNotifications.length === 0 ? (
        <div className="notif-empty-state">
          <div className="notif-empty-icon-wrap">
            <Icon
              name={
                search || statusTab !== "all" || typeFilter !== "all"
                  ? "search_off"
                  : "notifications_off"
              }
            />
          </div>
          <h3 className="notif-empty-title">
            {search || statusTab !== "all" || typeFilter !== "all"
              ? "No matching notifications"
              : "No notifications"}
          </h3>
          <p className="notif-empty-sub">
            {search || statusTab !== "all" || typeFilter !== "all"
              ? "No notifications match your current filter criteria."
              : "You're all caught up! New alerts and requests will appear here."}
          </p>
          {(search || statusTab !== "all" || typeFilter !== "all") && (
            <button
              type="button"
              className="notif-btn notif-btn-secondary"
              onClick={handleClearFilters}
            >
              <Icon name="filter_alt_off" />
              <span>Reset Filters</span>
            </button>
          )}
        </div>
      ) : (
        <div className="notif-feed">
          {filteredNotifications.map((notification) => {
            const type = notification.type || "info";
            const isSelected = selectedIds.has(notification._id);

            return (
              <div
                key={notification._id}
                className={`notif-card ${
                  !notification.read ? "notif-card-unread" : ""
                }`}
              >
                {/* Selection Checkbox */}
                <input
                  type="checkbox"
                  className="notif-card-checkbox"
                  checked={isSelected}
                  onChange={() => handleToggleSelect(notification._id)}
                  aria-label={`Select notification ${notification.title}`}
                />

                {/* Type Icon Badge */}
                <div className={`notif-card-icon notif-icon-${type}`}>
                  <Icon name={getNotificationIcon(type)} />
                </div>

                {/* Content */}
                <div className="notif-card-body">
                  <div className="notif-card-header">
                    <div className="notif-card-title-group">
                      {!notification.read && (
                        <span
                          className="notif-unread-badge"
                          title="Unread notification"
                        />
                      )}
                      <h3 className="notif-card-title">{notification.title}</h3>
                      <span className={`notif-type-tag tag-${type}`}>
                        {type}
                      </span>
                    </div>

                    <span
                      className="notif-card-time"
                      title={formatFullDate(notification.createdAt)}
                    >
                      {formatRelativeTime(notification.createdAt)}
                    </span>
                  </div>

                  <p className="notif-card-message">{notification.message}</p>

                  <div className="notif-card-footer">
                    {notification.link && (
                      <button
                        type="button"
                        className="notif-action-link-btn"
                        onClick={() => handleActionClick(notification)}
                      >
                        <span>
                          {notification.link.includes("leave")
                            ? "Review Leave Request"
                            : notification.link.includes("attendance")
                              ? "View Attendance"
                              : notification.link.includes("audit")
                                ? "Open Audit Log"
                                : notification.link.includes("employee")
                                  ? "View Employees"
                                  : "View Details"}
                        </span>
                        <Icon name="arrow_forward" />
                      </button>
                    )}

                    <div className="notif-card-actions">
                      <button
                        type="button"
                        className="notif-icon-btn"
                        onClick={() => handleToggleRead(notification)}
                        title={
                          notification.read
                            ? "Mark as unread"
                            : "Mark as read"
                        }
                        aria-label={
                          notification.read
                            ? "Mark as unread"
                            : "Mark as read"
                        }
                      >
                        <Icon
                          name={
                            notification.read
                              ? "mark_email_unread"
                              : "done_all"
                          }
                        />
                      </button>

                      <button
                        type="button"
                        className="notif-icon-btn delete"
                        onClick={() => handleDelete(notification._id)}
                        title="Delete notification"
                        aria-label="Delete notification"
                      >
                        <Icon name="delete" />
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* ── Admin Create Notification Modal ──────────────────────── */}
      {showSendModal && (
        <div
          className="notif-modal-backdrop"
          onClick={() => setShowSendModal(false)}
        >
          <div
            className="notif-modal"
            onClick={(e) => e.stopPropagation()}
            role="dialog"
            aria-label="Send Notification"
          >
            <div className="notif-modal-header">
              <div className="notif-modal-title-wrap">
                <Icon name="campaign" style={{ color: "var(--primary)" }} />
                <h3>Send Announcement</h3>
              </div>
              <button
                type="button"
                className="notif-modal-close"
                onClick={() => setShowSendModal(false)}
                aria-label="Close modal"
              >
                <Icon name="close" />
              </button>
            </div>

            <form onSubmit={handleSendNotification}>
              <div className="notif-modal-body">
                <div className="notif-form-group">
                  <label className="notif-form-label">Title *</label>
                  <input
                    type="text"
                    required
                    className="notif-form-input"
                    placeholder="e.g. Scheduled System Maintenance"
                    value={sendForm.title}
                    onChange={(e) =>
                      setSendForm((prev) => ({
                        ...prev,
                        title: e.target.value,
                      }))
                    }
                  />
                </div>

                <div className="notif-form-group">
                  <label className="notif-form-label">Message *</label>
                  <textarea
                    required
                    className="notif-form-textarea"
                    placeholder="Provide details about the announcement..."
                    value={sendForm.message}
                    onChange={(e) =>
                      setSendForm((prev) => ({
                        ...prev,
                        message: e.target.value,
                      }))
                    }
                  />
                </div>

                <div className="notif-form-group">
                  <label className="notif-form-label">Alert Severity / Type</label>
                  <div className="notif-type-selector">
                    {[
                      { key: "info", label: "Info", icon: "info" },
                      { key: "warning", label: "Warning", icon: "warning" },
                      { key: "critical", label: "Critical", icon: "error" },
                      { key: "success", label: "Success", icon: "check_circle" },
                    ].map(({ key, label, icon }) => (
                      <button
                        type="button"
                        key={key}
                        className={`notif-type-option ${key} ${
                          sendForm.type === key ? "selected" : ""
                        }`}
                        onClick={() =>
                          setSendForm((prev) => ({ ...prev, type: key }))
                        }
                      >
                        <Icon name={icon} />
                        <span>{label}</span>
                      </button>
                    ))}
                  </div>
                </div>

                <div className="notif-form-group">
                  <label className="notif-form-label">Target Page Link</label>
                  <select
                    className="notif-form-select"
                    value={sendForm.link}
                    onChange={(e) =>
                      setSendForm((prev) => ({
                        ...prev,
                        link: e.target.value,
                      }))
                    }
                  >
                    <option value="/notifications">Notifications (/notifications)</option>
                    <option value="/leave">Leave Management (/leave)</option>
                    <option value="/attendance">Attendance (/attendance)</option>
                    <option value="/employees">Employees (/employees)</option>
                    <option value="/audit">Audit Logs (/audit)</option>
                    <option value="/dashboard">Dashboard (/dashboard)</option>
                  </select>
                </div>
              </div>

              <div className="notif-modal-footer">
                <button
                  type="button"
                  className="notif-btn notif-btn-secondary"
                  onClick={() => setShowSendModal(false)}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="notif-btn notif-btn-primary"
                  disabled={sending}
                >
                  <Icon name="send" />
                  <span>{sending ? "Sending..." : "Send Announcement"}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
