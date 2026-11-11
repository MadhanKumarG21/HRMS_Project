import { useState, useEffect, useCallback } from "react";
import { api } from "../../services/api.js";
import Icon from "../Icon.jsx";

const LEAVE_ICON = {
  Annual: "beach_access",
  Sick: "sick",
  Casual: "weekend",
  Maternity: "child_care",
  Paternity: "child_care",
  Unpaid: "money_off",
  Other: "event_note",
};

const formatRange = (from, to) => {
  const opts = { month: "short", day: "numeric" };
  try {
    const f = new Date(from).toLocaleDateString("en-US", opts);
    const t = new Date(to).toLocaleDateString("en-US", opts);
    return f === t ? f : `${f} – ${t}`;
  } catch {
    return "--";
  }
};

export default function PendingApprovals() {
  const [leaves, setLeaves] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [actingId, setActingId] = useState(null);

  const fetchPending = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const res = await api.getLeaves({ status: "Pending", limit: 5, sortBy: "createdAt" });
      const list = Array.isArray(res?.data) ? res.data : Array.isArray(res) ? res : [];
      setLeaves(list);
    } catch (err) {
      setError(err.message || "Failed to load pending approvals.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchPending();
  }, [fetchPending]);

  const handleDecision = async (id, status) => {
    if (status === "Rejected") {
      const rejectionReason = window.prompt("Reason for rejecting this leave request:");
      if (rejectionReason === null) return; // cancelled
      if (!rejectionReason.trim()) {
        alert("A rejection reason is required.");
        return;
      }
      setActingId(id);
      try {
        await api.updateLeaveStatus(id, { status, rejectionReason });
        setLeaves((prev) => prev.filter((l) => l._id !== id));
      } catch (err) {
        alert(err.message || "Failed to update leave status.");
      } finally {
        setActingId(null);
      }
      return;
    }

    setActingId(id);
    try {
      await api.updateLeaveStatus(id, { status });
      setLeaves((prev) => prev.filter((l) => l._id !== id));
    } catch (err) {
      alert(err.message || "Failed to update leave status.");
    } finally {
      setActingId(null);
    }
  };

  return (
    <div className="card">
      <div className="card-title">
        Pending Approvals
        {leaves.length > 0 && <span className="badge approvals-count">{leaves.length}</span>}
      </div>

      {loading && leaves.length === 0 ? (
        <div className="approval-row">
          <span>Loading pending requests...</span>
        </div>
      ) : error ? (
        <div className="approval-row">
          <span style={{ color: "var(--danger)" }}>{error}</span>
        </div>
      ) : leaves.length === 0 ? (
        <div className="approval-row">
          <span style={{ color: "var(--text-muted)" }}>No pending leave requests 🎉</span>
        </div>
      ) : (
        leaves.map((leave) => (
          <div className="approval-row" key={leave._id}>
            <div className="approval-left">
              <div className="approval-icon">
                <Icon name={LEAVE_ICON[leave.type] || "event_note"} style={{ fontSize: 20 }} />
              </div>
              <div className="approval-info">
                <span className="approval-name">
                  {leave.userId?.name || "Unknown employee"}
                </span>
                <span className="approval-meta">
                  {leave.type} leave · {formatRange(leave.fromDate, leave.toDate)}
                </span>
              </div>
            </div>
            <div className="approval-actions">
              <button
                className="approve-btn"
                disabled={actingId === leave._id}
                onClick={() => handleDecision(leave._id, "Approved")}
                title="Approve"
              >
                <Icon name="check" style={{ fontSize: 16 }} />
              </button>
              <button
                className="reject-btn"
                disabled={actingId === leave._id}
                onClick={() => handleDecision(leave._id, "Rejected")}
                title="Reject"
              >
                <Icon name="close" style={{ fontSize: 16 }} />
              </button>
            </div>
          </div>
        ))
      )}

      <button className="manage-btn" onClick={fetchPending} disabled={loading}>
        {loading ? "Refreshing..." : "Refresh"}
      </button>
    </div>
  );
}