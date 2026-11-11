// src/Components/Topbar.jsx
import { useState, useEffect, useRef, useCallback, useMemo } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { api } from "../services/api.js";
import { useAuth } from "../hooks/useAuth.jsx";
import Icon from "./Icon.jsx";
import "../styles/Topbar.css";

const RECENT_SEARCHES_KEY = "hrms_recent_searches";
const MAX_RECENT_SEARCHES = 5;
const NOTIFICATION_POLL_MS = 60 * 1000;

// ── Recent searches (localStorage) ─────────────────────────────────────────
const loadRecentSearches = () => {
  try {
    const raw = localStorage.getItem(RECENT_SEARCHES_KEY);
    const parsed = raw ? JSON.parse(raw) : [];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
};

const saveRecentSearch = (query) => {
  const trimmed = query.trim();
  if (!trimmed) return loadRecentSearches();
  const existing = loadRecentSearches().filter(
    (q) => q.toLowerCase() !== trimmed.toLowerCase(),
  );
  const updated = [trimmed, ...existing].slice(0, MAX_RECENT_SEARCHES);
  try {
    localStorage.setItem(RECENT_SEARCHES_KEY, JSON.stringify(updated));
  } catch {
    // localStorage unavailable (private browsing, quota) — fail silently,
    // recent searches just won't persist for this session.
  }
  return updated;
};

const clearRecentSearches = () => {
  try {
    localStorage.removeItem(RECENT_SEARCHES_KEY);
  } catch {
    /* no-op */
  }
};

// Wraps the portion of `text` matching `query` in <mark>, case-insensitively.
// Returns the original string when there's no match so callers can render
// it directly either way.
const highlightMatch = (text, query) => {
  if (!text) return text;
  const q = query?.trim();
  if (!q) return text;
  const idx = text.toLowerCase().indexOf(q.toLowerCase());
  if (idx === -1) return text;
  return (
    <>
      {text.slice(0, idx)}
      <mark className="search-match">{text.slice(idx, idx + q.length)}</mark>
      {text.slice(idx + q.length)}
    </>
  );
};

const getInitials = (name) =>
  name
    ?.split(" ")
    .filter(Boolean)
    .map((n) => n[0])
    .join("")
    .toUpperCase()
    .slice(0, 2) || "?";

function ProfileAvatar({ src, initials, className }) {
  const [failedSrc, setFailedSrc] = useState("");

  if (src && failedSrc !== src) {
    return (
      <img
        className={`${className} profile-avatar-image`}
        src={src}
        alt=""
        onError={() => setFailedSrc(src)}
      />
    );
  }

  return (
    <span className={className} aria-hidden="true">
      {initials}
    </span>
  );
}

export default function Topbar({ onMenuClick, mobileNavOpen = false }) {
  const { user, logout, isAdmin } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  // ── Search state ──────────────────────────────────────────────────────
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState(null);
  const [searchLoading, setSearchLoading] = useState(false);
  const [searchError, setSearchError] = useState("");
  const [showResults, setShowResults] = useState(false);
  const [activeIndex, setActiveIndex] = useState(-1);
  const [recentSearches, setRecentSearches] = useState(loadRecentSearches);

  // ── Notification state ───────────────────────────────────────────────
  const [notifications, setNotifications] = useState([]);
  const [notificationsLoading, setNotificationsLoading] = useState(false);
  const [notificationsError, setNotificationsError] = useState("");
  const [showNotifications, setShowNotifications] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);

  // ── User menu state ──────────────────────────────────────────────────
  const [showUserMenu, setShowUserMenu] = useState(false);

  const searchWrapRef = useRef(null);
  const searchInputRef = useRef(null);
  const notificationRef = useRef(null);
  const userMenuRef = useRef(null);
  const searchTimeout = useRef(null);
  const latestRequestId = useRef(0);

  // ── Click-outside handling ───────────────────────────────────────────
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (searchWrapRef.current && !searchWrapRef.current.contains(e.target)) {
        setShowResults(false);
        setActiveIndex(-1);
      }
      if (
        notificationRef.current &&
        !notificationRef.current.contains(e.target)
      ) {
        setShowNotifications(false);
      }
      if (userMenuRef.current && !userMenuRef.current.contains(e.target)) {
        setShowUserMenu(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // ── Global keyboard shortcuts: Cmd/Ctrl+K and "/" focus the search box,
  // Escape closes whichever dropdown is open ───────────────────────────
  useEffect(() => {
    const handleGlobalKeyDown = (e) => {
      const isTypingElsewhere =
        document.activeElement?.tagName === "TEXTAREA" ||
        (document.activeElement?.tagName === "INPUT" &&
          document.activeElement !== searchInputRef.current) ||
        document.activeElement?.isContentEditable;

      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        searchInputRef.current?.focus();
        searchInputRef.current?.select();
        return;
      }

      if (e.key === "/" && !isTypingElsewhere) {
        e.preventDefault();
        searchInputRef.current?.focus();
        return;
      }

      if (e.key === "Escape") {
        if (showResults) {
          setShowResults(false);
          searchInputRef.current?.blur();
        }
        setShowNotifications(false);
        setShowUserMenu(false);
      }
    };

    document.addEventListener("keydown", handleGlobalKeyDown);
    return () => document.removeEventListener("keydown", handleGlobalKeyDown);
  }, [showResults]);

  // ── Notifications: full list (on demand) + lightweight polling ───────
  const fetchNotifications = useCallback(async () => {
    if (!isAdmin) {
      setNotifications([]);
      setUnreadCount(0);
      return;
    }

    setNotificationsLoading(true);
    setNotificationsError("");
    try {
      const response = await api.getNotifications({ limit: 15 });
      const items = Array.isArray(response)
        ? response
        : Array.isArray(response?.data)
          ? response.data
          : Array.isArray(response?.notifications)
            ? response.notifications
            : null;

      if (!items) throw new Error("Invalid notifications response");

      const formattedNotifications = items
        .filter((n) => n && (n._id || n.id))
        .map((n) => ({
          id: n._id || n.id,
          title: n.title || "Notification",
          message: n.message || "",
          time: n.time || n.createdAt || n.timestamp,
          read: Boolean(n.read),
          type: n.type || "info",
          link: n.link || "/notifications",
        }));

      setNotifications(formattedNotifications);
      setUnreadCount(formattedNotifications.filter((n) => !n.read).length);
    } catch (error) {
      console.error("Failed to fetch notifications:", error);
      setNotificationsError("Unable to load notifications. Try again.");
    } finally {
      setNotificationsLoading(false);
    }
  }, [isAdmin]);

  // Cheap badge-only refresh — safe to poll frequently without pulling
  // full notification bodies every time.
  const pollUnreadCount = useCallback(async () => {
    if (!isAdmin) {
      setUnreadCount(0);
      return;
    }

    try {
      const response = await api.getNotificationUnreadCount();
      const count = typeof response === "number"
        ? response
        : response?.count ?? response?.unreadCount ?? 0;
      setUnreadCount(Number(count) || 0);
    } catch {
      // Falls back silently — the full fetchNotifications path (audit-log
      // derived) doesn't have a matching lightweight count endpoint, and
      // that's fine; the badge just won't update between dropdown opens.
    }
  }, [isAdmin]);

  useEffect(() => {
    if (!isAdmin) {
      setNotifications([]);
      setUnreadCount(0);
      return;
    }

    fetchNotifications();
    pollUnreadCount();
    const interval = setInterval(pollUnreadCount, NOTIFICATION_POLL_MS);
    return () => clearInterval(interval);
  }, [fetchNotifications, isAdmin, pollUnreadCount]);

  // ── Search ────────────────────────────────────────────────────────────
  const performSearch = useCallback(async (query) => {
    const trimmedQuery = query?.trim() || "";
    if (trimmedQuery.length < 2) {
      setSearchResults(null);
      setSearchLoading(false);
      setSearchError("");
      return;
    }
    const requestId = ++latestRequestId.current;
    setSearchLoading(true);
    setSearchError("");
    try {
      const res = await api.search(trimmedQuery);
      // A slower, earlier request that resolves after a newer one would
      // otherwise clobber the newer results — ignore anything stale.
      if (requestId !== latestRequestId.current) return;
      if (!res || typeof res !== "object") {
        throw new Error("Invalid search response");
      }
      const uniqueById = (items) => [
        ...new Map(
          (Array.isArray(items) ? items : [])
            .filter((item) => item && (item._id || item.id))
            .map((item) => [String(item._id || item.id), item]),
        ).values(),
      ];
      const users = uniqueById(res.users);
      const auditLogs = uniqueById(res.auditLogs);
      const modules = uniqueById(res.modules);
      setSearchResults({
        ...res,
        users,
        auditLogs,
        modules,
        totalCount: users.length + auditLogs.length + modules.length,
      });
    } catch (err) {
      if (requestId !== latestRequestId.current) return;
      console.error("Search error:", err);
      setSearchResults(null);
      setSearchError("Unable to search employees. Try again.");
    } finally {
      if (requestId === latestRequestId.current) setSearchLoading(false);
    }
  }, []);

  const handleSearchChange = (e) => {
    const value = e.target.value;
    setSearchQuery(value);
    setShowResults(true);
    setShowNotifications(false);
    setShowUserMenu(false);
    setActiveIndex(-1);
    latestRequestId.current += 1;
    if (searchTimeout.current) clearTimeout(searchTimeout.current);
    setSearchResults(null);
    setSearchError("");
    if (value.trim().length < 2) {
      setSearchLoading(false);
      return;
    }
    setSearchLoading(true);
    searchTimeout.current = setTimeout(() => performSearch(value), 300);
  };

  const handleClearSearch = () => {
    latestRequestId.current += 1;
    if (searchTimeout.current) clearTimeout(searchTimeout.current);
    setSearchQuery("");
    setSearchResults(null);
    setSearchLoading(false);
    setSearchError("");
    setActiveIndex(-1);
    searchInputRef.current?.focus();
  };

  const handleSelectRecentSearch = (query) => {
    setSearchQuery(query);
    setActiveIndex(-1);
    setShowResults(true);
    setShowNotifications(false);
    setShowUserMenu(false);
    performSearch(query);
  };

  const handleRemoveRecentSearch = (query) => {
    const updated = recentSearches.filter((recent) => recent !== query);
    setRecentSearches(updated);
    try {
      localStorage.setItem(RECENT_SEARCHES_KEY, JSON.stringify(updated));
    } catch {
      // Keep the in-memory list usable when storage is unavailable.
    }
  };

  const handleClearRecentSearches = (e) => {
    e.stopPropagation();
    clearRecentSearches();
    setRecentSearches([]);
  };

  useEffect(() => {
    return () => {
      if (searchTimeout.current) clearTimeout(searchTimeout.current);
    };
  }, []);

  // ── Result click / keyboard select ───────────────────────────────────
  const handleResultClick = (type, id) => {
    setRecentSearches(saveRecentSearch(searchQuery));
    setShowResults(false);
    setSearchQuery("");
    setSearchResults(null);
    setActiveIndex(-1);
    const routes = {
      user: `/employees?employeeId=${encodeURIComponent(id)}`,
      log: "/audit",
      module: `/modules`,
    };
    navigate(routes[type] || "/");
  };

  const handleViewAllResults = () => {
    const query = searchQuery.trim();
    if (!query) return;
    setRecentSearches(saveRecentSearch(query));
    setShowResults(false);
    setActiveIndex(-1);
    navigate(`/employees?search=${encodeURIComponent(query)}`);
  };

  // Flattened, ordered view of whatever's currently rendered in the
  // dropdown — this is what arrow-key navigation walks through, in the
  // same order as the sections appear on screen.
  const flatResults = useMemo(() => {
    if (!searchResults) return [];
    const users = (searchResults.users || [])
      .slice(0, 5)
      .map((u) => ({ kind: "user", id: u._id, data: u }));
    const logs = (searchResults.auditLogs || [])
      .slice(0, 5)
      .map((l) => ({ kind: "log", id: l._id, data: l }));
    const modules = (searchResults.modules || [])
      .slice(0, 5)
      .map((m) => ({ kind: "module", id: m._id, data: m }));
    return [...users, ...logs, ...modules];
  }, [searchResults]);

  const handleSearchKeyDown = (e) => {
    if (!showResults || flatResults.length === 0) {
      if (e.key === "Escape") {
        setShowResults(false);
        e.currentTarget.blur();
      } else if (e.key === "Enter" && searchQuery.trim().length >= 2) {
        e.preventDefault();
        handleViewAllResults();
      }
      return;
    }

    if (e.key === "ArrowDown") {
      e.preventDefault();
      setActiveIndex((i) => Math.min(i + 1, flatResults.length - 1));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setActiveIndex((i) => Math.max(i - 1, -1));
    } else if (e.key === "Enter") {
      if (activeIndex >= 0 && flatResults[activeIndex]) {
        e.preventDefault();
        const { kind, id } = flatResults[activeIndex];
        handleResultClick(kind, id);
      } else if (searchQuery.trim().length >= 2) {
        e.preventDefault();
        handleViewAllResults();
      }
    } else if (e.key === "Escape") {
      setShowResults(false);
      e.currentTarget.blur();
    }
  };

  // ── Notification handlers ────────────────────────────────────────────
  const handleNotificationClick = async (notification) => {
    setShowNotifications(false);
    if (notification.link) {
      navigate(notification.link);
    }

    if (notification.read) return;

    setNotifications((prev) =>
      prev.map((n) => (n.id === notification.id ? { ...n, read: true } : n)),
    );
    setUnreadCount((prev) => Math.max(0, prev - 1));

    try {
      await api.markNotificationRead(notification.id);
    } catch (error) {
      console.error("Failed to persist notification read state:", error);
      setNotifications((prev) =>
        prev.map((n) =>
          n.id === notification.id ? { ...n, read: false } : n,
        ),
      );
      setUnreadCount((prev) => prev + 1);
    }
  };

  const markAllAsRead = async () => {
    const previousNotifications = notifications;
    const previousUnreadCount = unreadCount;

    setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
    setUnreadCount(0);

    try {
      await api.markAllNotificationsRead();
    } catch (error) {
      console.error("Failed to persist mark-all-as-read:", error);
      setNotifications(previousNotifications);
      setUnreadCount(previousUnreadCount);
    }
  };

  // ── User helpers ──────────────────────────────────────────────────────
  const initials = getInitials(user?.name) === "?" ? "U" : getInitials(user?.name);

  const roleLabel =
    typeof user?.role === "object" ? user.role?.name : user?.role;

  const handleLogout = async () => {
    setShowUserMenu(false);
    await logout();
    navigate("/login");
  };

  const getPageTitle = () => {
    const path = location.pathname;
    const titles = {
      "/dashboard": "Dashboard",
      "/users": "User Management",
      "/employees": "Employees",
      "/leave": "Leave Management",
      "/attendance": "Attendance",
      "/notifications": "Notifications",
      "/notification": "Notifications",
      "/roles": "Roles & Permissions",
      "/audit": "Audit Logs",
      "/modules": "Modules",
      "/recruitment": "Recruitment",
      "/reports": "Reports",
      "/settings": "Settings",
    };
    return titles[path] || "HRMS";
  };

  const notificationIcon = (type) => ({
    critical: "error",
    warning: "warning",
    success: "check_circle",
  })[type] || "info";

  return (
    <header className="topbar">
      {/* ── Left: breadcrumb + search ─────────────────────────────────── */}
      <div className="topbar-left">
        <button
          type="button"
          className="topbar-menu-btn"
          onClick={onMenuClick}
          aria-label="Open navigation menu"
          aria-expanded={mobileNavOpen}
          aria-controls="primary-sidebar"
        >
          <Icon name="menu" />
        </button>
        <div className="topbar-breadcrumb">
          <span className="breadcrumb-current">{getPageTitle()}</span>
        </div>

        <div className="search-wrap" ref={searchWrapRef}>
          <Icon name="search" className="search-icon" />
          <input
            ref={searchInputRef}
            className="search-input"
            type="text"
            placeholder="Search employees, logs, modules..."
            value={searchQuery}
            onChange={handleSearchChange}
            onFocus={() => {
              setShowResults(true);
              setShowNotifications(false);
              setShowUserMenu(false);
            }}
            onKeyDown={handleSearchKeyDown}
            aria-label="Global search"
            role="combobox"
            aria-expanded={showResults}
            aria-controls="topbar-search-listbox"
            aria-autocomplete="list"
            aria-activedescendant={
              activeIndex >= 0 ? `search-option-${activeIndex}` : undefined
            }
          />
          {searchQuery && (
            <button
              type="button"
              className="search-clear-btn"
              onClick={handleClearSearch}
              aria-label="Clear search"
              tabIndex={-1}
            >
              <Icon name="close" />
            </button>
          )}
          {!searchQuery && (
            <span className="search-shortcut-hint" aria-hidden="true">
              Ctrl K
            </span>
          )}

          {/* ── Dropdown ─────────────────────────────────────────────── */}
          {showResults && (
            <div
              className="search-dropdown"
              id="topbar-search-listbox"
              role="listbox"
            >
              {searchError ? (
                <div className="search-empty search-error" role="alert">
                  <Icon name="error" />
                  <p>{searchError}</p>
                </div>
              ) : searchQuery.trim().length < 2 ? (
                recentSearches.length > 0 ? (
                  <div className="search-recent">
                    <div className="search-section-title">
                      <Icon name="assignment" />
                      <span>Recent Searches</span>
                      <button
                        type="button"
                        className="search-recent-clear"
                        onClick={handleClearRecentSearches}
                      >
                        Clear
                      </button>
                    </div>
                    {recentSearches.map((q) => (
                      <div
                        key={q}
                        className="search-recent-item"
                      >
                        <button
                          type="button"
                          className="search-recent-select"
                          onClick={() => handleSelectRecentSearch(q)}
                        >
                          <Icon name="search" />
                          <span>{q}</span>
                        </button>
                        <button
                          type="button"
                          className="search-recent-remove"
                          onClick={() => handleRemoveRecentSearch(q)}
                          aria-label={`Remove recent search ${q}`}
                        >
                          <Icon name="close" />
                        </button>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="search-empty">
                    <Icon name="search" />
                    <p>Type at least 2 characters to search</p>
                  </div>
                )
              ) : searchLoading ? (
                <div className="search-loading">
                  <div className="spinner-small"></div>
                  <span>Searching...</span>
                </div>
              ) : searchResults && searchResults.totalCount > 0 ? (
                <div className="search-results">
                  {/* Employee accounts */}
                  {searchResults.users?.length > 0 && (
                    <div className="search-section">
                      <div className="search-section-title">
                        <Icon name="person" />
                        <span>Employees</span>
                      </div>
                      {searchResults.users.slice(0, 5).map((u) => {
                        const flatIdx = flatResults.findIndex(
                          (r) => r.kind === "user" && r.id === u._id,
                        );
                        return (
                          <button
                            type="button"
                            key={u._id}
                            id={`search-option-${flatIdx}`}
                            role="option"
                            aria-selected={activeIndex === flatIdx}
                            className={`search-result-item ${activeIndex === flatIdx ? "active" : ""}`}
                            onMouseEnter={() => setActiveIndex(flatIdx)}
                            onClick={() => handleResultClick("user", u._id)}
                          >
                            <div className="search-result-avatar">
                              {getInitials(u.name)}
                            </div>
                            <div className="search-result-info">
                              <span className="search-result-name">
                                {highlightMatch(u.name, searchQuery)}
                              </span>
                              <span className="search-result-meta">
                                {highlightMatch(u.employeeId || "No Employee ID", searchQuery)}
                                {" • "}
                                {highlightMatch(u.department || "No Department", searchQuery)}
                              </span>
                              <span className="search-result-meta">
                                {highlightMatch(u.designation || u.role || "Employee", searchQuery)}
                                {u.designation && u.role ? ` • ${u.role}` : ""}
                                {` • ${u.status || "Active"}`}
                              </span>
                              {u.email && (
                                <span className="search-result-meta search-result-email">
                                  {highlightMatch(u.email, searchQuery)}
                                </span>
                              )}
                            </div>
                            <span className={`status-badge ${u.status?.toLowerCase().replace(/\s+/g, "-") || "active"}`}>
                              {u.status || "Active"}
                            </span>
                          </button>
                        );
                      })}
                      {searchResults.users.length > 5 && (
                        <div className="search-view-all">
                          +{searchResults.users.length - 5} more users
                        </div>
                      )}
                    </div>
                  )}

                  {/* Audit Logs */}
                  {searchResults.auditLogs?.length > 0 && (
                    <div className="search-section">
                      <div className="search-section-title">
                        <Icon name="assignment" />
                        <span>Audit Logs</span>
                      </div>
                      {searchResults.auditLogs.slice(0, 5).map((l) => {
                        const flatIdx = flatResults.findIndex(
                          (r) => r.kind === "log" && r.id === l._id,
                        );
                        return (
                          <button
                            type="button"
                            key={l._id}
                            id={`search-option-${flatIdx}`}
                            role="option"
                            aria-selected={activeIndex === flatIdx}
                            className={`search-result-item ${activeIndex === flatIdx ? "active" : ""}`}
                            onMouseEnter={() => setActiveIndex(flatIdx)}
                            onClick={() => handleResultClick("log")}
                          >
                            <div className="search-result-icon">
                              <Icon name="description" />
                            </div>
                            <div className="search-result-info">
                              <span className="search-result-name">
                                {highlightMatch(
                                  l.action?.replace(/_/g, " "),
                                  searchQuery,
                                )}
                              </span>
                              <span className="search-result-meta">
                                {l.adminName || "System"} •{" "}
                                {l.module || "System"}
                              </span>
                            </div>
                            <span
                              className={`severity-badge ${l.severity || "info"}`}
                            >
                              {l.severity || "info"}
                            </span>
                          </button>
                        );
                      })}
                      {searchResults.auditLogs.length > 5 && (
                        <div className="search-view-all">
                          +{searchResults.auditLogs.length - 5} more logs
                        </div>
                      )}
                    </div>
                  )}

                  {/* Modules */}
                  {searchResults.modules?.length > 0 && (
                    <div className="search-section">
                      <div className="search-section-title">
                        <Icon name="extension" />
                        <span>Modules</span>
                      </div>
                      {searchResults.modules.slice(0, 5).map((m) => {
                        const flatIdx = flatResults.findIndex(
                          (r) => r.kind === "module" && r.id === m._id,
                        );
                        return (
                          <button
                            type="button"
                            key={m._id}
                            id={`search-option-${flatIdx}`}
                            role="option"
                            aria-selected={activeIndex === flatIdx}
                            className={`search-result-item ${activeIndex === flatIdx ? "active" : ""}`}
                            onMouseEnter={() => setActiveIndex(flatIdx)}
                            onClick={() => handleResultClick("module")}
                          >
                            <div className="search-result-icon">
                              <Icon name="extension" />
                            </div>
                            <div className="search-result-info">
                              <span className="search-result-name">
                                {highlightMatch(m.label, searchQuery)}
                              </span>
                              <span className="search-result-meta">
                                {m.category || "General"} •{" "}
                                {m.status || "Active"}
                              </span>
                            </div>
                            <span
                              className={`module-status-badge ${m.status?.toLowerCase() || "active"}`}
                            >
                              {m.status || "Active"}
                            </span>
                          </button>
                        );
                      })}
                      {searchResults.modules.length > 5 && (
                        <div className="search-view-all">
                          +{searchResults.modules.length - 5} more modules
                        </div>
                      )}
                    </div>
                  )}

                  <div className="search-footer">
                    <span>
                      {searchResults.users.length} employee result
                      {searchResults.users.length !== 1 ? "s" : ""}
                    </span>
                    <button
                      type="button"
                      className="search-view-all-button"
                      onClick={handleViewAllResults}
                    >
                      View all employee results
                      <Icon name="arrow_forward" />
                    </button>
                  </div>
                </div>
              ) : searchLoading ? (
                <div className="search-loading" role="status">
                  <div className="spinner-small" />
                  <span>Searching...</span>
                </div>
              ) : (
                <div className="search-empty">
                  <Icon name="search_off" />
                  <p>No employees found for "{searchQuery}"</p>
                  <button
                    type="button"
                    className="search-view-all-button"
                    onClick={handleViewAllResults}
                  >
                    View all employee results
                  </button>
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* ── Right: notifications + user menu ────────────────────────────── */}
      <div className="topbar-right">
        {/* Notifications */}
        {isAdmin && (
          <div className="notification-wrap" ref={notificationRef}>
            <button
              type="button"
              className="icon-btn"
              aria-controls="topbar-notifications"
              onClick={() => {
                const next = !showNotifications;
                setShowNotifications(next);
                setShowResults(false);
                setShowUserMenu(false);
                if (next) fetchNotifications();
              }}
              aria-label={`Notifications${unreadCount > 0 ? ` (${unreadCount} unread)` : ""}`}
              aria-expanded={showNotifications}
            >
              <Icon name="notifications" />
              {unreadCount > 0 && (
                <span className="notification-count-badge">
                  {unreadCount > 99 ? "99+" : unreadCount}
                </span>
              )}
            </button>

            {showNotifications && (
              <div className="notification-dropdown" id="topbar-notifications">
                <div className="notification-header">
                  <span className="notification-title">Notifications</span>
                  {unreadCount > 0 && (
                    <button
                      type="button"
                      className="notification-mark-all"
                      onClick={markAllAsRead}
                    >
                      Mark all as read
                    </button>
                  )}
                </div>
                <div className="notification-list">
                  {notificationsLoading ? (
                    <div className="notification-empty" role="status">
                      <span className="spinner-small" />
                      <p>Loading notifications...</p>
                    </div>
                  ) : notificationsError ? (
                    <div className="notification-empty" role="alert">
                      <Icon name="error" />
                      <p>{notificationsError}</p>
                    </div>
                  ) : notifications.length === 0 ? (
                    <div className="notification-empty">
                      <Icon name="notifications_off" />
                      <p>No notifications</p>
                    </div>
                  ) : (
                    notifications.map((n) => (
                      <button
                        type="button"
                        key={n.id}
                        className={`notification-item ${n.read ? "read" : "unread"}`}
                        onClick={() => handleNotificationClick(n)}
                      >
                        <span className={`notification-icon ${n.type}`}>
                          <Icon name={notificationIcon(n.type)} />
                        </span>
                        <div className="notification-content">
                          <div className="notification-title-text">{n.title}</div>
                          <div className="notification-message">{n.message}</div>
                          <div className="notification-time">
                            {n.time
                              ? new Date(n.time).toLocaleString()
                              : "Just now"}
                          </div>
                        </div>
                        {!n.read && <span className="notification-unread-dot" aria-label="Unread" />}
                      </button>
                    ))
                  )}
                </div>
                <div className="notification-footer">
                  <button
                    type="button"
                    className="notification-view-all"
                    onClick={() => {
                      setShowNotifications(false);
                      navigate("/notifications");
                    }}
                  >
                    View All Notifications
                  </button>
                </div>
              </div>
            )}
          </div>
        )}

        <div className="divider-v"></div>

        {/* User Menu */}
        <div className="user-menu-wrap" ref={userMenuRef}>
          <button
            type="button"
            className="user-chip"
            aria-expanded={showUserMenu}
            aria-controls="topbar-user-menu"
            aria-label={`User menu for ${user?.name || "Guest"}`}
            onClick={() => {
              setShowUserMenu((prev) => !prev);
              setShowResults(false);
              setShowNotifications(false);
            }}
          >
            <div className="user-chip-info">
              <span className="user-name">{user?.name || "Guest"}</span>
              <span className="user-role">{roleLabel || "User"}</span>
            </div>
            <ProfileAvatar
              src={user?.profileImage}
              initials={initials}
              className="user-avatar"
            />
          </button>

          {showUserMenu && (
            <div className="user-menu-dropdown" id="topbar-user-menu">
              <div className="user-menu-header">
                <ProfileAvatar
                  src={user?.profileImage}
                  initials={initials}
                  className="user-menu-avatar"
                />
                <div className="user-menu-info">
                  <span className="user-menu-name">
                    {user?.name || "Guest"}
                  </span>
                  <span className="user-menu-email">
                    {user?.email || "No email"}
                  </span>
                  <span className="user-menu-role">{roleLabel || "User"}</span>
                </div>
              </div>
              <div className="user-menu-divider" />
              <div className="user-menu-items">
                <button
                  type="button"
                  className="user-menu-item"
                  onClick={() => {
                    setShowUserMenu(false);
                    navigate("/settings?section=profile");
                  }}
                >
                  <Icon name="person" />
                  <span>My Profile</span>
                </button>
                <button
                  type="button"
                  className="user-menu-item"
                  onClick={() => {
                    setShowUserMenu(false);
                    navigate("/settings");
                  }}
                >
                  <Icon name="settings" />
                  <span>Settings</span>
                </button>
              </div>
              <div className="user-menu-divider" />
              <button
                type="button"
                className="user-menu-item user-menu-logout"
                onClick={handleLogout}
              >
                <Icon name="logout" />
                <span>Logout</span>
              </button>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}