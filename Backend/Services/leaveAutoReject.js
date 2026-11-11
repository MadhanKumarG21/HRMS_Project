// Backend/Services/leaveAutoReject.js
// Automatically rejects Leave requests that have sat in "Pending" status
// longer than the configured review window. Without this, a request an
// admin never touches would stay Pending forever with no resolution for
// the employee — this guarantees every request gets a decision.
import Leave from '../Models/Leave.js';
import AuditLog from '../Models/AuditLog.js';

// How long a Pending request is allowed to wait before it's auto-rejected.
export const AUTO_REJECT_WINDOW_MS = 24 * 60 * 60 * 1000; // 24 hours

// How often the background sweep runs. This is independent of the window
// above — it only controls how promptly an expired request gets caught,
// not how long the window itself is.
const CHECK_INTERVAL_MS = 15 * 60 * 1000; // every 15 minutes

export const AUTO_REJECT_REASON =
  'Automatically rejected: no action was taken within the 24-hour review window.';

// Finds every Pending leave older than the window and rejects it.
// Safe to call repeatedly/concurrently — a request that already flipped to
// Rejected/Approved/Cancelled by the time this runs simply won't match the
// { status: 'Pending' } filter anymore.
export const autoRejectExpiredLeaves = async () => {
  const cutoff = new Date(Date.now() - AUTO_REJECT_WINDOW_MS);

  const expired = await Leave.find({
    status: 'Pending',
    createdAt: { $lte: cutoff },
  }).populate('userId', 'name');

  if (expired.length === 0) {
    return { processed: 0 };
  }

  for (const leave of expired) {
    leave.status = 'Rejected';
    leave.rejectionReason = AUTO_REJECT_REASON;
    leave.approvedAt = new Date();
    // approvedBy is intentionally left unset — this wasn't a human decision,
    // and attributing it to whichever admin happens to be logged in when the
    // sweep runs would be misleading in the audit trail.
    await leave.save();

    await AuditLog.create({
      adminName: 'System',
      action: 'LEAVE_AUTO_REJECTED',
      details: `Auto-rejected leave request for ${
        leave.userId?.name || 'an employee'
      } — no admin action within 24 hours of submission`,
      module: 'Leave Management',
      severity: 'warning',
    });
  }

  console.log(
    `[LeaveAutoReject] Auto-rejected ${expired.length} leave request(s) past the 24h window.`,
  );
  return { processed: expired.length };
};

let intervalHandle = null;

// Starts the recurring background sweep. Call once at server startup.
// Runs immediately on start (to catch anything that expired while the
// server was offline), then on a fixed interval after that.
export const startLeaveAutoRejectScheduler = () => {
  if (intervalHandle) return; // guard against double-start (e.g. hot reload)

  autoRejectExpiredLeaves().catch((err) =>
    console.error('[LeaveAutoReject] Initial run failed:', err.message),
  );

  intervalHandle = setInterval(() => {
    autoRejectExpiredLeaves().catch((err) =>
      console.error('[LeaveAutoReject] Scheduled run failed:', err.message),
    );
  }, CHECK_INTERVAL_MS);
};

export const stopLeaveAutoRejectScheduler = () => {
  if (intervalHandle) {
    clearInterval(intervalHandle);
    intervalHandle = null;
  }
};