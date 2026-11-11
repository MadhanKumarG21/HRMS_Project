// src/Components/attendance/MyAttendanceCheckInOut.jsx
// Self-service check-in / check-out card. Shown to every logged-in user at
// the top of the Attendance page, above the admin stats/table — lets an
// employee mark their own arrival/departure without needing the admin
// "Mark Attendance" modal.
import { useState, useEffect, useCallback, useRef } from "react";
import { api } from "../../services/api.js";
import Icon from "../Icon.jsx";
import {
  isAttendanceForToday,
  isConnectionError,
  makeOfflineCheckout,
  readOfflineAttendanceState,
  writeOfflineAttendanceState,
} from "../../utils/offlineAttendance.js";

// Live "time elapsed since check-in" ticker — purely client-side display,
// not persisted. Re-renders once a minute, not every second, to avoid
// needless re-renders while still feeling "live".
function useElapsedSince(startTime, clockOffset) {
  const [elapsed, setElapsed] = useState("");

  useEffect(() => {
    if (!startTime) {
      setElapsed("");
      return;
    }

    const update = () => {
      const diffMs = Date.now() + clockOffset - new Date(startTime).getTime();
      const totalMinutes = Math.max(0, Math.floor(diffMs / 60000));
      const hours = Math.floor(totalMinutes / 60);
      const minutes = totalMinutes % 60;
      setElapsed(hours > 0 ? `${hours}h ${minutes}m` : `${minutes}m`);
    };

    update();
    const interval = setInterval(update, 60000);
    return () => clearInterval(interval);
  }, [startTime, clockOffset]);

  return elapsed;
}

// Mirrors Backend/Services/attendanceAutoCheckout.js — purely for the
// client-side countdown display; the backend sweep is the actual source
// of truth for when auto-checkout happens.
// Live countdown to the auto-checkout deadline, shown once the missed-
// checkout reminder has fired. Ticks every 30s — this window is only
// ~15 minutes wide, so a coarser update would feel stale.
function useCountdownTo(deadlineValue, clockOffset) {
  const [label, setLabel] = useState("");

  useEffect(() => {
    if (!deadlineValue) {
      setLabel("");
      return;
    }

    const update = () => {
      const diffMs =
        new Date(deadlineValue).getTime() - (Date.now() + clockOffset);
      if (diffMs <= 0) {
        setLabel("any moment now");
        return;
      }
      const totalMinutes = Math.ceil(diffMs / 60000);
      setLabel(`${totalMinutes}m`);
    };

    update();
    const interval = setInterval(update, 30000);
    return () => clearInterval(interval);
  }, [deadlineValue, clockOffset]);

  return label;
}

function useOvertimeSince(startTime, clockOffset) {
  const [elapsed, setElapsed] = useState("0m");

  useEffect(() => {
    if (!startTime) {
      setElapsed("0m");
      return;
    }

    const update = () => {
      const diffMs = Math.max(
        0,
        Date.now() + clockOffset - new Date(startTime).getTime(),
      );
      const totalMinutes = Math.floor(diffMs / 60000);
      const hours = Math.floor(totalMinutes / 60);
      const minutes = totalMinutes % 60;
      setElapsed(hours > 0 ? `${hours}h ${minutes}m` : `${minutes}m`);
    };

    update();
    const interval = setInterval(update, 60000);
    return () => clearInterval(interval);
  }, [startTime, clockOffset]);

  return elapsed;
}

const formatTime = (value, timeZone) =>
  value
    ? new Date(value).toLocaleTimeString([], {
        hour: "2-digit",
        minute: "2-digit",
        ...(timeZone ? { timeZone } : {}),
      })
    : "-";

export default function MyAttendanceCheckInOut({ onChanged }) {
  const [today, setToday] = useState(null); // attendance record or null
  const [clockNow, setClockNow] = useState(() => new Date());
  const [clockOffset, setClockOffset] = useState(0);
  const [overtimeWindow, setOvertimeWindow] = useState(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const mountedRef = useRef(true);

  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
    };
  }, []);

const loadToday = useCallback(async () => {
  let cachedState;
  let checkoutSynced = false;
  try {
    setError("");
    cachedState = readOfflineAttendanceState();
    let pendingCheckout = cachedState?.pendingCheckout || null;
    if (pendingCheckout && navigator.onLine) {
      try {
        await api.checkOutAttendance(pendingCheckout.checkOutAt);
        pendingCheckout = null;
        checkoutSynced = true;
      } catch (syncError) {
        if (syncError.status === 409) {
          pendingCheckout = null;
        } else {
          throw syncError;
        }
      }
    }
    const res = await api.getMyTodayAttendance();
    const attendance =
      pendingCheckout && cachedState?.attendance
        ? makeOfflineCheckout(
            cachedState.attendance,
            pendingCheckout.checkOutAt,
          )
        : res?.attendance || null;

    try {
      writeOfflineAttendanceState({
        attendance,
        overtimeWindow:
          res?.overtimeWindow || cachedState?.overtimeWindow || null,
        pendingCheckout,
      });
    } catch (storageError) {
      setError(`Offline attendance could not be saved: ${storageError.message}`);
    }

    if (mountedRef.current) {
      setToday(attendance);
      setOvertimeWindow(res?.overtimeWindow || null);
      if (res?.serverTime) {
        setClockOffset(new Date(res.serverTime).getTime() - Date.now());
        setClockNow(new Date(res.serverTime));
      }
      if (checkoutSynced) onChanged?.();
    }
  } catch (err) {
    if (mountedRef.current) {
      const offlineState = cachedState || readOfflineAttendanceState();
      const cachedAttendance = offlineState?.pendingCheckout
        ? makeOfflineCheckout(
            offlineState.attendance,
            offlineState.pendingCheckout.checkOutAt,
          )
        : isAttendanceForToday(
              offlineState?.attendance,
              offlineState?.overtimeWindow?.timeZone,
            )
          ? offlineState.attendance
          : null;
      setToday(cachedAttendance);
      setOvertimeWindow(offlineState?.overtimeWindow || null);
      setError(
        cachedAttendance && isConnectionError(err)
          ? ""
          : err.message || "Failed to load today's attendance",
      );
    }
  } finally {
    if (mountedRef.current) {
      setLoading(false);
    }
  }
}, [onChanged]);

  useEffect(() => {
    loadToday();
  }, [loadToday]);

  useEffect(() => {
    const handleOnline = () => loadToday();
    window.addEventListener("online", handleOnline);
    return () => window.removeEventListener("online", handleOnline);
  }, [loadToday]);

  useEffect(() => {
    const interval = setInterval(
      () => setClockNow(new Date(Date.now() + clockOffset)),
      1000,
    );
    return () => clearInterval(interval);
  }, [clockOffset]);

  const elapsed = useElapsedSince(
    today?.checkIn && !today?.checkOut ? today.checkIn : null,
    clockOffset,
  );

  const overtimeStarted = Boolean(today?.overtimeStartedAt && !today?.checkOut);

  const autoCheckoutDeadline = overtimeWindow?.autoCheckoutDeadline
    ? new Date(overtimeWindow.autoCheckoutDeadline)
    : null;
  const overtimeWindowOpen = Boolean(
    overtimeWindow?.open &&
      autoCheckoutDeadline &&
      clockNow < autoCheckoutDeadline,
  );
  const hasCheckedIn = Boolean(today?.checkIn);
  const hasCheckedOut = Boolean(today?.checkOut);
  const pendingAutoCheckout = Boolean(
    (today?.autoCheckoutNotifiedAt || overtimeWindowOpen) &&
      hasCheckedIn &&
      !hasCheckedOut &&
    autoCheckoutDeadline &&
    clockNow < autoCheckoutDeadline &&
    !overtimeStarted
  );
  const countdown = useCountdownTo(
    pendingAutoCheckout ? autoCheckoutDeadline : null,
    clockOffset,
  );

  const overtimeElapsed = useOvertimeSince(
    overtimeStarted ? today?.overtimeStartedAt : null,
    clockOffset,
  );

  // Once the reminder has fired, poll a bit more actively so the card
  // reflects an auto-checkout (or a manual one from another tab) within
  // a minute of it happening, instead of only on next page load.
  useEffect(() => {
    if (!today?.checkIn || today?.checkOut) return;
    const interval = setInterval(loadToday, 15000);
    return () => clearInterval(interval);
  }, [today?.checkIn, today?.checkOut, loadToday]);

  const handleCheckIn = async () => {
    try {
      setSubmitting(true);
      setError("");
      const res = await api.checkInAttendance();
      setToday(res.attendance);
      onChanged?.(); // let the parent page refresh its table/stats
    } catch (err) {
      setError(err.message || "Failed to check in");
    } finally {
      setSubmitting(false);
    }
  };

const handleCheckOut = async () => {
  const confirmed = window.confirm(
    "Are you sure you want to check out? This will finalize your attendance for today."
  );
  if (!confirmed) {
    return;
  }
  const checkOutAt = new Date(Date.now() + clockOffset).toISOString();
  try {
    setSubmitting(true);
    setError("");
    const res = await api.checkOutAttendance(checkOutAt);
    setToday(res.attendance);
    try {
      writeOfflineAttendanceState({
        attendance: res.attendance,
        overtimeWindow,
        pendingCheckout: null,
      });
    } catch (storageError) {
      setError(`Offline attendance could not be saved: ${storageError.message}`);
    }
    onChanged?.();
  } catch (err) {
    if (isConnectionError(err)) {
      try {
        const pendingAttendance = makeOfflineCheckout(today, checkOutAt);
        writeOfflineAttendanceState({
          attendance: pendingAttendance,
          overtimeWindow,
          pendingCheckout: { checkOutAt },
        });
        setToday(pendingAttendance);
        setError("");
      } catch (storageError) {
        setError(`Could not save checkout offline: ${storageError.message}`);
      }
    } else {
      setError(err.message || "Failed to check out");
    }
  } finally {
    setSubmitting(false);
  }
};

  const handleContinueWork = async () => {
    try {
      setSubmitting(true);
      setError("");

      const res = await api.continueAttendance();
      setToday(res.attendance);
      onChanged?.();
    } catch (err) {
      setError(err.message || "Failed to continue work");
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="my-attendance-card my-attendance-loading">
        <div className="spinner-small" />
        <span>Checking today's attendance…</span>
      </div>
    );
  }

  return (
    <div className="my-attendance-card">
      <div className="my-attendance-left">
        <div
          className={`my-attendance-status-dot ${
            hasCheckedOut
              ? "done"
              : pendingAutoCheckout
              ? "urgent"
              : hasCheckedIn
              ? "active"
              : "pending"
          }`}
        />
        <div>
          {!hasCheckedIn && (
            <>
              <p className="my-attendance-title">You haven't checked in today</p>
              <p className="my-attendance-sub">Tap Check In when you start work</p>
            </>
          )}
          {hasCheckedIn && !hasCheckedOut && (
            <>
              <p className="my-attendance-title">
                Checked in at {formatTime(today.checkIn, overtimeWindow?.timeZone)}
                {(today.isLate || today.status === "Late") && (
                  <span className="my-attendance-late-tag">
                    Late{today.lateMinutes ? ` · ${today.lateMinutes}m` : ""}
                  </span>
                )}
              </p>
              {pendingAutoCheckout ? (
                <div className="my-attendance-overtime-warning">
                  <p className="my-attendance-overtime-title">
                    <Icon name="schedule" />
                    Regular workday has ended. Do you want to continue working?
                  </p>
                  <p className="my-attendance-sub my-attendance-warning">
                    Automatic checkout will happen at{" "}
                    {formatTime(autoCheckoutDeadline, overtimeWindow?.timeZone)}.
                  </p>
                  <div className="my-attendance-overtime-actions">
                    <button
                      type="button"
                      className="btn-primary"
                      onClick={handleContinueWork}
                      disabled={submitting}
                    >
                      <Icon name="play_arrow" />
                      {submitting ? "Starting..." : "Continue Work"}
                    </button>
                    <button
                      type="button"
                      className="btn-warning"
                      onClick={handleCheckOut}
                      disabled={submitting}
                    >
                      <Icon name="logout" />
                      Check Out
                    </button>
                  </div>
                  <p className="my-attendance-sub">
                    Auto checkout in {countdown || "a few minutes"}
                  </p>
                </div>
              ) : overtimeStarted ? (
                <>
                  <p className="my-attendance-sub">
                    <strong>Overtime Active</strong>
                  </p>
                  <p className="my-attendance-sub">
                    Overtime: <strong>{overtimeElapsed}</strong>
                  </p>
                </>
              ) : (
                <p className="my-attendance-sub">Working for {elapsed || "0m"}</p>
              )}
            </>
          )}
          {hasCheckedOut && today.autoCheckedOut && (
            <>
              <p className="my-attendance-title">
                Auto checked-out at {formatTime(today.checkOut, overtimeWindow?.timeZone)}
                <span className="my-attendance-auto-tag">auto</span>
              </p>
              <p className="my-attendance-sub my-attendance-warning">
                You didn't check out manually, so the system closed out your
                day at 5:15 PM · {today.workingHours?.toFixed(1) || "0"}h
                recorded · {today.status}
              </p>
            </>
          )}
          {hasCheckedOut && !today.autoCheckedOut && (
            <>
              <p className="my-attendance-title">
                {today.offlinePendingCheckout
                  ? "Check-out saved offline"
                  : "Attendance completed for today"}
              </p>
              <p className="my-attendance-sub">
                {formatTime(today.checkIn, overtimeWindow?.timeZone)} –{" "}
                {formatTime(today.checkOut, overtimeWindow?.timeZone)} ·{" "}
                {today.workingHours?.toFixed(1) || "0"}h worked ·{" "}
                {today.offlinePendingCheckout
                  ? "Waiting for connection to sync"
                  : today.status}
              </p>
              {Number(today.overtimeHours) > 0 && (
                <p className="my-attendance-overtime-summary">
                  Overtime: {Number(today.overtimeHours).toFixed(1)}h
                </p>
              )}
            </>
          )}
        </div>
      </div>

      <div className="my-attendance-right">
        {error && <span className="my-attendance-error">{error}</span>}

        {!hasCheckedIn && (
          <button className="btn-primary" onClick={handleCheckIn} disabled={submitting}>
            <Icon name="add" /> {submitting ? "Checking in…" : "Check In"}
          </button>
        )}

        {hasCheckedIn && !hasCheckedOut && !pendingAutoCheckout && (
          <button className="btn-warning" onClick={handleCheckOut} disabled={submitting}>
            <Icon name="logout" /> {submitting ? "Checking out…" : "Check Out"}
          </button>
        )}

        {hasCheckedOut && (
          <span className="my-attendance-complete-badge">
            <Icon name="check_circle" /> Done
          </span>
        )}
      </div>
    </div>
  );
}