const getStateKey = () => {
  const storedUser = localStorage.getItem("user");
  if (!storedUser) return null;

  const user = JSON.parse(storedUser);
  const userId = user?.id || user?._id;
  return userId ? `hrms:attendance:${userId}` : null;
};

export const readOfflineAttendanceState = () => {
  const key = getStateKey();
  if (!key) return null;

  const storedState = localStorage.getItem(key);
  return storedState ? JSON.parse(storedState) : null;
};

export const writeOfflineAttendanceState = (state) => {
  const key = getStateKey();
  if (!key) {
    throw new Error("Unable to identify the signed-in employee for offline attendance.");
  }
  localStorage.setItem(key, JSON.stringify(state));
};

export const isConnectionError = (error) =>
  !error?.status &&
  (typeof navigator === "undefined" ||
    !navigator.onLine ||
    error instanceof TypeError ||
    error?.name === "AbortError" ||
    /connect|network|fetch|timed out/i.test(error?.message || ""));

export const isAttendanceForToday = (attendance, timeZone) => {
  if (!attendance?.date) return false;
  const zone = timeZone || Intl.DateTimeFormat().resolvedOptions().timeZone;
  const formatDate = (value) =>
    new Intl.DateTimeFormat("en-CA", {
      timeZone: zone,
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
    }).format(new Date(value));
  return formatDate(attendance.date) === formatDate(new Date());
};

export const makeOfflineCheckout = (attendance, checkOutAt) => {
  const workingHours = Math.max(
    0,
    (new Date(checkOutAt).getTime() - new Date(attendance.checkIn).getTime()) /
      3600000,
  );
  return {
    ...attendance,
    checkOut: checkOutAt,
    workingHours: Number(workingHours.toFixed(2)),
    status:
      workingHours < 4
        ? "Half Day"
        : attendance.status === "Late"
          ? "Present"
          : attendance.status,
    offlinePendingCheckout: true,
  };
};
