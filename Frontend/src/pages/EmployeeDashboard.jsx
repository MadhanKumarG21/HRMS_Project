import { useCallback, useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { api } from "../services/api.js";
import { useAuth } from "../hooks/useAuth.jsx";
import Icon from "../Components/Icon.jsx";
import "../styles/RoleDashboard.css";

const formatTime = (value) => value ? new Date(value).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }) : "—";
const formatDate = (value) => value ? new Date(value).toLocaleDateString([], { month: "short", day: "numeric", year: "numeric" }) : "—";

export default function EmployeeDashboard({ manager = false }) {
  const { user } = useAuth();
  const [today, setToday] = useState(null);
  const [history, setHistory] = useState([]);
  const [leaves, setLeaves] = useState([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState("");
  const [error, setError] = useState("");
  const [showLeaveForm, setShowLeaveForm] = useState(false);
  const [leaveForm, setLeaveForm] = useState({ type: "Annual", fromDate: "", toDate: "", reason: "" });

  const loadDashboard = useCallback(async () => {
    setLoading(true); setError("");
    try {
      const [todayRes, historyRes, leavesRes] = await Promise.all([
        api.getMyTodayAttendance(),
        api.getMyAttendanceHistory({ limit: 30 }),
        api.getMyLeaves(),
      ]);
      setToday(todayRes?.attendance || todayRes || null);
      setHistory(Array.isArray(historyRes) ? historyRes : Array.isArray(historyRes?.data) ? historyRes.data : []);
      setLeaves(Array.isArray(leavesRes?.data) ? leavesRes.data : Array.isArray(leavesRes) ? leavesRes : []);
    } catch (err) { setError(err.message || "Could not load your dashboard."); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { loadDashboard(); }, [loadDashboard]);

  const attendanceAction = async (action) => {
    setBusy(true); setNotice(""); setError("");
    try {
      if (action === "in") await api.checkInAttendance();
      else await api.checkOutAttendance();
      setNotice(action === "in" ? "Checked in successfully." : "Checked out successfully.");
      await loadDashboard();
    } catch (err) { setError(err.message || "Attendance action failed."); }
    finally { setBusy(false); }
  };

  const submitLeave = async (event) => {
    event.preventDefault(); setError(""); setNotice("");
    if (!leaveForm.fromDate || !leaveForm.toDate || leaveForm.toDate < leaveForm.fromDate) {
      setError("Please choose a valid leave date range."); return;
    }
    if (!leaveForm.reason.trim()) { setError("Please enter a reason for your leave."); return; }
    setBusy(true);
    try {
      await api.applyForLeave({ ...leaveForm, userId: user?._id || user?.id });
      setLeaveForm({ type: "Annual", fromDate: "", toDate: "", reason: "" });
      setShowLeaveForm(false); setNotice("Leave request submitted."); await loadDashboard();
    } catch (err) { setError(err.message || "Could not submit leave request."); }
    finally { setBusy(false); }
  };

  const checkedIn = Boolean(today?.checkIn && !today?.checkOut);
  const presentDays = history.filter((row) => ["Present", "Late", "Half Day"].includes(row.status)).length;
  const pendingLeaves = leaves.filter((row) => row.status === "Pending").length;

  return <div className="role-dashboard">
    <header className="rd-header">
      <div><p className="rd-eyebrow">TECHNOVA HRMS</p><h1>{manager ? "Manager workspace" : "My workspace"}</h1><p>Welcome back, {user?.name || "there"}. Here’s your workday at a glance.</p></div>
      <div className="rd-date"><Icon name="event_repeat" /> {new Date().toLocaleDateString([], { weekday: "long", month: "long", day: "numeric" })}</div>
    </header>
    {error && <div className="rd-alert error">{error}</div>}{notice && <div className="rd-alert success">{notice}</div>}
    {manager && <section className="rd-manager-tools"><div><h2>Team tools</h2><p>Shortcuts for your team responsibilities.</p></div><div className="rd-actions"><Link to="/employees"><Icon name="groups" /> Team members</Link><Link to="/leave"><Icon name="event_repeat" /> Review leave</Link><Link to="/attendance"><Icon name="schedule" /> Attendance records</Link></div></section>}
    <section className="rd-stats">
      <article className="rd-stat"><span className="rd-stat-icon blue"><Icon name="schedule" /></span><span className="rd-stat-label">Today's check-in</span><strong>{loading ? "—" : formatTime(today?.checkIn)}</strong><small>{today?.checkOut ? `Checked out ${formatTime(today.checkOut)}` : checkedIn ? "Currently checked in" : "Not checked in yet"}</small></article>
      <article className="rd-stat"><span className="rd-stat-icon green"><Icon name="check_circle" /></span><span className="rd-stat-label">Days present</span><strong>{loading ? "—" : presentDays}</strong><small>Based on last 30 attendance records</small></article>
      <article className="rd-stat"><span className="rd-stat-icon amber"><Icon name="warning" /></span><span className="rd-stat-label">Pending leave</span><strong>{loading ? "—" : pendingLeaves}</strong><small>Requests awaiting a decision</small></article>
    </section>
    <section className="rd-panel rd-checkin"><div><h2>Attendance</h2><p>{checkedIn ? "Your work session is active." : "Record your workday check-in and check-out."}</p></div><div className="rd-actions"><button disabled={busy || loading || checkedIn || Boolean(today?.checkOut)} onClick={() => attendanceAction("in")}><Icon name="check_circle" /> Check in</button><button className="secondary" disabled={busy || loading || !checkedIn} onClick={() => attendanceAction("out")}><Icon name="logout" /> Check out</button></div></section>
    <section className="rd-panel"><div className="rd-panel-head"><div><h2>My leave requests</h2><p>Apply for leave and track request status.</p></div><button className="rd-button" onClick={() => setShowLeaveForm((value) => !value)}>{showLeaveForm ? "Cancel" : "Apply for leave"}</button></div>
      {showLeaveForm && <form className="rd-leave-form" onSubmit={submitLeave}><label>Type<select value={leaveForm.type} onChange={(e) => setLeaveForm({ ...leaveForm, type: e.target.value })}>{["Annual", "Sick", "Casual", "Maternity", "Paternity", "Unpaid", "Other"].map((type) => <option key={type}>{type}</option>)}</select></label><label>From<input type="date" required value={leaveForm.fromDate} onChange={(e) => setLeaveForm({ ...leaveForm, fromDate: e.target.value })}/></label><label>To<input type="date" required value={leaveForm.toDate} onChange={(e) => setLeaveForm({ ...leaveForm, toDate: e.target.value })}/></label><label className="rd-reason">Reason<textarea required rows="2" value={leaveForm.reason} onChange={(e) => setLeaveForm({ ...leaveForm, reason: e.target.value })}/></label><button disabled={busy} type="submit">{busy ? "Submitting…" : "Submit request"}</button></form>}
      {loading ? <p className="rd-muted">Loading leave requests…</p> : leaves.length === 0 ? <p className="rd-muted">No leave requests yet.</p> : <div className="rd-table-wrap"><table className="rd-table"><thead><tr><th>Type</th><th>From</th><th>To</th><th>Status</th></tr></thead><tbody>{leaves.slice(0, 5).map((leave) => <tr key={leave._id}><td>{leave.type}</td><td>{formatDate(leave.fromDate)}</td><td>{formatDate(leave.toDate)}</td><td><span className={`rd-pill ${String(leave.status || "pending").toLowerCase()}`}>{leave.status}</span></td></tr>)}</tbody></table></div>}
    </section>
    <section className="rd-panel"><div className="rd-panel-head"><div><h2>Recent attendance</h2><p>Your latest attendance records.</p></div><button className="rd-text-button" onClick={loadDashboard} disabled={loading}><Icon name="refresh" /> Refresh</button></div>{loading ? <p className="rd-muted">Loading attendance…</p> : history.length === 0 ? <p className="rd-muted">No attendance history found.</p> : <div className="rd-table-wrap"><table className="rd-table"><thead><tr><th>Date</th><th>Check in</th><th>Check out</th><th>Hours</th><th>Status</th></tr></thead><tbody>{history.slice(0, 7).map((row) => <tr key={row._id}><td>{formatDate(row.date)}</td><td>{formatTime(row.checkIn)}</td><td>{formatTime(row.checkOut)}</td><td>{Number(row.workingHours || 0).toFixed(1)}h</td><td><span className={`rd-pill ${String(row.status || "pending").toLowerCase().replace(/\s+/g, "-")}`}>{row.status || "—"}</span></td></tr>)}</tbody></table></div>}</section>
  </div>;
}
