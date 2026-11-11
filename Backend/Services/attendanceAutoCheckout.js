import Attendance from "../Models/Attendance.js";
import AuditLog from "../Models/AuditLog.js";
import { notifyUser } from "./notify.js";
import {
  AUTO_CHECKOUT_GRACE_MINUTES,
  calculateHours,
  deriveCheckoutStatus,
  getAttendanceTimeContext,
} from "../utils/attendanceHelpers.js";

export { AUTO_CHECKOUT_GRACE_MINUTES };

const CHECK_INTERVAL_MS = 15 * 1000;
let intervalHandle = null;

export const runAttendanceAutoCheckoutSweep = async () => {
  const now = new Date();
  const {
    today,
    tomorrow,
    overtimeStart,
    autoCheckoutDeadline,
    timeZone,
  } = await getAttendanceTimeContext();
  const result = { reminded: 0, autoCheckedOut: 0, skippedOvertime: 0 };

  if (now < overtimeStart) {
    return result;
  }

  if (now < autoCheckoutDeadline) {
    const records = await Attendance.find({
      date: { $gte: today, $lt: tomorrow },
      checkIn: { $ne: null },
      checkOut: null,
      overtimeStartedAt: null,
      autoCheckoutNotifiedAt: null,
    }).populate("userId", "name");

    for (const record of records) {
      const updated = await Attendance.findOneAndUpdate(
        {
          _id: record._id,
          checkOut: null,
          overtimeStartedAt: null,
          autoCheckoutNotifiedAt: null,
        },
        { $set: { autoCheckoutNotifiedAt: overtimeStart } },
        { new: true },
      );
      if (!updated) continue;

      result.reminded += 1;
      const user = record.userId;
      const userId = user?._id || record.userId;
      if (userId) {
        await notifyUser({
          userId,
          title: "Regular Workday Ended",
          message:
            "Your regular workday has ended. Continue working as overtime or check out before 5:15 PM.",
          type: "warning",
          link: "/attendance",
        });
      }
    }
    return result;
  }

  const records = await Attendance.find({
    date: { $gte: today, $lt: tomorrow },
    checkIn: { $ne: null },
    checkOut: null,
    overtimeStartedAt: null,
  }).populate("userId", "name");

  result.skippedOvertime = await Attendance.countDocuments({
    date: { $gte: today, $lt: tomorrow },
    checkIn: { $ne: null },
    checkOut: null,
    overtimeStartedAt: { $ne: null },
  });

  for (const record of records) {
    if (autoCheckoutDeadline <= record.checkIn) continue;

    const workingHours = calculateHours(record.checkIn, autoCheckoutDeadline);
    const unroundedWorkingHours =
      (autoCheckoutDeadline - record.checkIn) / (1000 * 60 * 60);
    const updated = await Attendance.findOneAndUpdate(
      {
        _id: record._id,
        checkOut: null,
        overtimeStartedAt: null,
      },
      {
        $set: {
          checkOut: autoCheckoutDeadline,
          workingHours,
          overtimeHours: 0,
          status: deriveCheckoutStatus(record.status, unroundedWorkingHours),
          isLate: Boolean(record.isLate || record.status === "Late"),
          lateMinutes: record.lateMinutes || 0,
          autoCheckedOut: true,
          autoCheckoutNotifiedAt:
            record.autoCheckoutNotifiedAt || overtimeStart,
        },
      },
      { new: true, runValidators: true },
    );
    if (!updated) continue;

    result.autoCheckedOut += 1;
    const user = record.userId;
    const userId = user?._id || record.userId;
    const employeeName = user?.name || "Employee";

    await AuditLog.create({
      adminId: userId,
      adminName: "System",
      action: "ATTENDANCE_AUTO_CHECKOUT",
      details: `${employeeName} was automatically checked out at ${autoCheckoutDeadline.toLocaleTimeString([], { timeZone })} (${workingHours.toFixed(1)}h worked)`,
      module: "Attendance",
      severity: "warning",
      ipAddress: "system",
    });

    if (userId) {
      await notifyUser({
        userId,
        title: "Attendance Automatically Checked Out",
        message: `Your attendance was automatically checked out at ${autoCheckoutDeadline.toLocaleTimeString([], { timeZone })}. No overtime was recorded.`,
        type: "warning",
        link: "/attendance",
      });
    }
  }

  return result;
};

export const startAttendanceAutoCheckoutScheduler = () => {
  if (intervalHandle) return;

  runAttendanceAutoCheckoutSweep().catch((error) => {
    console.error(
      "[AttendanceAutoCheckout] Initial sweep failed:",
      error.message,
    );
  });

  intervalHandle = setInterval(() => {
    runAttendanceAutoCheckoutSweep().catch((error) => {
      console.error(
        "[AttendanceAutoCheckout] Scheduled sweep failed:",
        error.message,
      );
    });
  }, CHECK_INTERVAL_MS);
};

export const stopAttendanceAutoCheckoutScheduler = () => {
  if (!intervalHandle) return;
  clearInterval(intervalHandle);
  intervalHandle = null;
};

export default runAttendanceAutoCheckoutSweep;
