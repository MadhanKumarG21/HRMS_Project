// Backend/Controllers/admin/attendanceController.js
// Manages attendance records: CRUD, filtering, daily statistics, and
// employee self-service check-in/check-out.
import mongoose from "mongoose";
import Attendance from "../../Models/Attendance.js";
import User from "../../Models/User.js";
import AuditLog from "../../Models/AuditLog.js";
import {
  calculateHours,
  deriveCheckoutStatus,
  getAttendanceDateTime,
  getAttendanceDateKey,
  getAttendanceTimeContext,
  isValidAttendanceDate,
  getLateAttendanceDetails,
} from "../../utils/attendanceHelpers.js";
import { runAttendanceAutoCheckoutSweep } from "../../Services/attendanceAutoCheckout.js";

const isValidObjectId = (id) => mongoose.Types.ObjectId.isValid(id);

// ─── Get All Attendance ────────────────────────────────────────────────────
export const getAllAttendance = async (req, res) => {
  try {
    const { date, userId, status, page = 1, limit = 50 } = req.query;
    const filter = {};

    if (date && !isValidAttendanceDate(date)) {
      return res.status(400).json({ message: "Invalid date format" });
    }
    const currentDay = await getAttendanceTimeContext(date || new Date());
    const attendanceDate = getAttendanceDateKey(
      new Date(),
      currentDay.timeZone,
    );
    let startOfDay, endOfDay;
    if (date) {
      startOfDay = currentDay.today;
      endOfDay = currentDay.tomorrow;
      filter.date = { $gte: startOfDay, $lt: endOfDay };
    }

    if (userId) {
      if (!isValidObjectId(userId)) {
        return res.status(400).json({ message: "Invalid user ID format" });
      }
      filter.userId = userId;
    }
    if (status === "Present") {
      filter.status = { $in: ["Present", "Late"] };
    } else if (status === "Late") {
      filter.$or = [{ status: "Late" }, { isLate: true }];
    } else if (status) {
      filter.status = status;
    }

    const skip = (parseInt(page) - 1) * parseInt(limit);

    const [attendance, total] = await Promise.all([
      Attendance.find(filter)
        .populate("userId", "name email department role status")
        .sort({ date: -1 })
        .skip(skip)
        .limit(parseInt(limit))
        .lean(),
      Attendance.countDocuments(filter),
    ]);

    if (date && !userId && !status) {
      const users = await User.find({
        status: { $in: ["Active", "On Leave"] },
        role: { $ne: "Admin" },
      }).select("_id name email department role status").lean();

      const existingUserIds = new Set(
        attendance
          .map(
            (record) =>
              record.userId?._id?.toString() || record.userId?.toString(),
          )
          .filter(Boolean),
      );

      const absentRows = users
        .filter((user) => !existingUserIds.has(user._id.toString()))
        .map((user) => ({
          _id: `absent-${user._id}-${startOfDay.toISOString().slice(0, 10)}`,
          userId: user,
          date: startOfDay,
          checkIn: null,
          checkOut: null,
          status: "Absent",
          workingHours: 0,
          notes: "No check-in recorded",
          isSyntheticAbsent: true,
        }));

      const merged = [...attendance, ...absentRows].sort((a, b) => {
        const aName = a.userId?.name || "";
        const bName = b.userId?.name || "";
        return aName.localeCompare(bName);
      });

      return res.status(200).json({
        data: merged,
        total: merged.length,
        page: parseInt(page),
        totalPages: Math.ceil(merged.length / parseInt(limit)),
        attendanceDate,
        attendanceTimezone: currentDay.timeZone,
      });
    }

    res.status(200).json({
      data: attendance,
      total,
      page: parseInt(page),
      totalPages: Math.ceil(total / parseInt(limit)),
      attendanceDate,
      attendanceTimezone: currentDay.timeZone,
    });
  } catch (error) {
    console.error("[Attendance] Get all error:", error);
    res
      .status(500)
      .json({ message: "Failed to fetch attendance", error: error.message });
  }
};
// ─── Get Attendance by ID ──────────────────────────────────────────────────
export const getAttendanceById = async (req, res) => {
  try {
    const { id } = req.params;

    if (!isValidObjectId(id)) {
      return res.status(400).json({ message: "Invalid attendance ID format" });
    }

    const attendance = await Attendance.findById(id).populate(
      "userId",
      "name email department",
    );

    if (!attendance) {
      return res.status(404).json({ message: "Attendance not found" });
    }

    res.status(200).json(attendance);
  } catch (error) {
    console.error("[Attendance] Get by ID error:", error);
    res
      .status(500)
      .json({ message: "Failed to fetch attendance", error: error.message });
  }
};

// ─── Get Attendance by User ID ─────────────────────────────────────────────
export const getAttendanceByUserId = async (req, res) => {
  try {
    const { userId } = req.params;

    if (!isValidObjectId(userId)) {
      return res.status(400).json({ message: "Invalid user ID format" });
    }

    const isSelf = req.user?._id?.toString() === userId.toString();
    const userRole =
      typeof req.user?.role === "object" ? req.user.role?.name : req.user?.role;
    const isAdmin = userRole?.toLowerCase() === "admin";
    const hasViewPerm = (req.user?.permissions || []).includes(
      "attendance.view",
    );

    if (!isSelf && !isAdmin && !hasViewPerm) {
      return res
        .status(403)
        .json({
          message: "Insufficient permissions to view this user's attendance",
        });
    }

    const attendance = await Attendance.find({ userId })
      .populate("userId", "name email department")
      .sort({ date: -1 });

    res.status(200).json(attendance);
  } catch (error) {
    console.error("[Attendance] Get by user ID error:", error);
    res
      .status(500)
      .json({ message: "Failed to fetch attendance", error: error.message });
  }
};

// ─── Get My Attendance History ──────────────────────────────────────────────
export const getMyHistory = async (req, res) => {
  try {
    const limit = parseInt(req.query.limit) || 30;
    const attendance = await Attendance.find({ userId: req.user._id })
      .populate("userId", "name email department role")
      .sort({ date: -1 })
      .limit(limit);

    res.status(200).json(attendance);
  } catch (error) {
    console.error("[Attendance] Get my history error:", error);
    res
      .status(500)
      .json({
        message: "Failed to fetch attendance history",
        error: error.message,
      });
  }
};

// ─── Get Attendance by Date ────────────────────────────────────────────────
export const getAttendanceByDate = async (req, res) => {
  try {
    const { date } = req.params;

    if (!date || !isValidAttendanceDate(date)) {
      return res.status(400).json({ message: "Invalid date format" });
    }

    const { today: startDate, tomorrow: endDate } =
      await getAttendanceTimeContext(date);

    const attendance = await Attendance.find({
      date: { $gte: startDate, $lt: endDate },
    }).populate("userId", "name email department");

    res.status(200).json(attendance);
  } catch (error) {
    console.error("[Attendance] Get by date error:", error);
    res
      .status(500)
      .json({ message: "Failed to fetch attendance", error: error.message });
  }
};

// ─── Get My Today's Attendance ─────────────────────────────────────────────
// Self-service: returns the current user's own attendance record for today
// (or null if they haven't checked in yet). Used by the frontend to decide
// whether to show a "Check In" or "Check Out" button.
export const getMyTodayAttendance = async (req, res) => {
  try {
    const { today, overtimeStart, autoCheckoutDeadline, timeZone } =
      await getAttendanceTimeContext();
    const now = new Date();

    let attendance = await Attendance.findOne({
      userId: req.user._id,
      date: today,
    });

    if (now >= overtimeStart && attendance?.checkIn && !attendance.checkOut) {
      await runAttendanceAutoCheckoutSweep();
      attendance = await Attendance.findById(attendance._id);
    }

    res.status(200).json({
      attendance: attendance || null,
      serverTime: now,
      overtimeWindow: {
        overtimeStart,
        autoCheckoutDeadline,
        open: now >= overtimeStart && now < autoCheckoutDeadline,
        timeZone,
      },
    });
  } catch (error) {
    console.error("[Attendance] Get my today error:", error);
    res.status(500).json({
      message: "Failed to fetch today's attendance",
      error: error.message,
    });
  }
};

// ─── Self Check-In ──────────────────────────────────────────────────────────
// Creates today's attendance record for the current user with checkIn = now.
export const checkIn = async (req, res) => {
  try {
    const { today, timeZone } = await getAttendanceTimeContext();
    const now = new Date();

    const existing = await Attendance.findOne({
      userId: req.user._id,
      date: today,
    });
    if (existing && existing.checkIn) {
      return res.status(400).json({
        message: `Already checked in today at ${existing.checkIn.toLocaleTimeString()}`,
      });
    }

    const { isLate, lateMinutes } = getLateAttendanceDetails(now, today, timeZone);
    const status = "Present";

    const attendance = existing
      ? await Attendance.findByIdAndUpdate(
          existing._id,
          {
            checkIn: now,
            status,
            isLate,
            lateMinutes,
            checkOut: null,
            workingHours: 0,
            overtimeStartedAt: null,
            overtimeHours: 0,
            autoCheckoutNotifiedAt: null,
            autoCheckedOut: false,
          },
          { new: true, runValidators: true },
        )
      : await Attendance.create({
          userId: req.user._id,
          date: today,
          checkIn: now,
          status,
          isLate,
          lateMinutes,
          workingHours: 0,
          overtimeStartedAt: null,
          overtimeHours: 0,
          autoCheckoutNotifiedAt: null,
          autoCheckedOut: false,
        });

    await AuditLog.create({
      adminId: req.user._id,
      adminName: req.user.name,
      action: isLate ? "ATTENDANCE_LATE_CHECK_IN" : "ATTENDANCE_CHECK_IN",
      details: `${req.user.name} checked in at ${now.toLocaleTimeString()}${isLate ? ` (late by ${lateMinutes} minute${lateMinutes === 1 ? "" : "s"})` : ""}`,
      module: "Attendance",
      severity: "info",
      ipAddress:
        req.headers["x-forwarded-for"] || req.socket?.remoteAddress || req.ip,
    });

    res.status(existing ? 200 : 201).json({
      message: "Checked in successfully",
      attendance,
    });
  } catch (error) {
    console.error("[Attendance] Check-in error:", error);
    res
      .status(500)
      .json({ message: "Failed to check in", error: error.message });
  }
};

// ─── Self Check-Out ─────────────────────────────────────────────────────────
// Sets checkOut = now on today's record, recomputes workingHours, and
// adjusts status (keeps "Late" if they were late, but downgrades to
// "Half Day" if they worked fewer than HALF_DAY_HOURS_THRESHOLD hours).
export const checkOut = async (req, res) => {
  try {
    const now = new Date();
    const requestedCheckOutAt = req.body?.checkOutAt;
    let checkOutAt = now;

    if (requestedCheckOutAt !== undefined) {
      if (
        typeof requestedCheckOutAt !== "string" ||
        !/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/.test(
          requestedCheckOutAt,
        )
      ) {
        return res.status(400).json({ message: "Invalid check-out time" });
      }
      checkOutAt = new Date(requestedCheckOutAt);
      if (
        Number.isNaN(checkOutAt.getTime()) ||
        checkOutAt.getTime() > now.getTime() + 5 * 60 * 1000
      ) {
        return res.status(400).json({ message: "Invalid check-out time" });
      }
    }

    const { today, overtimeStart, autoCheckoutDeadline } =
      await getAttendanceTimeContext(checkOutAt);

    let attendance = await Attendance.findOne({
      userId: req.user._id,
      date: today,
    });

    if (!attendance || !attendance.checkIn) {
      return res.status(400).json({ message: "You have not checked in today" });
    }

    if (attendance.checkOut) {
      if (
        requestedCheckOutAt !== undefined &&
        Math.abs(attendance.checkOut.getTime() - checkOutAt.getTime()) < 1000
      ) {
        return res.status(200).json({
          message: "Checked out successfully",
          attendance,
        });
      }
      return res.status(409).json({
        message: `Already checked out today at ${attendance.checkOut.toLocaleTimeString()}`,
        attendance,
      });
    }

    if (
      requestedCheckOutAt === undefined &&
      now >= autoCheckoutDeadline &&
      !attendance.overtimeStartedAt
    ) {
      await runAttendanceAutoCheckoutSweep();
      attendance = await Attendance.findById(attendance._id);
      if (attendance?.checkOut) {
        return res.status(200).json({
          message: "Attendance was automatically checked out at 5:15 PM",
          attendance,
        });
      }
      if (!attendance) {
        return res.status(404).json({ message: "Attendance not found" });
      }
    }

    if (checkOutAt <= attendance.checkIn) {
      return res
        .status(400)
        .json({ message: "Check-out time must be after check-in time" });
    }

    // Checking out during the grace period records the actual checkout and
    // counts time after 5:00 PM as overtime, even if they did not continue.
    const overtimeStartedAt =
      attendance.overtimeStartedAt ||
      (checkOutAt > overtimeStart && checkOutAt < autoCheckoutDeadline
        ? overtimeStart
        : null);
    const unroundedWorkingHours =
      (checkOutAt - attendance.checkIn) / (1000 * 60 * 60);
    const workingHours = Number(unroundedWorkingHours.toFixed(2));
    const overtimeHours = overtimeStartedAt
      ? calculateHours(overtimeStartedAt, checkOutAt)
      : 0;

    // Preserve "Late" if that's how the day started, but a very short
    // day still gets flagged as Half Day regardless of punctuality.
    const status = deriveCheckoutStatus(
      attendance.status,
      unroundedWorkingHours,
    );
    const updatedAttendance = await Attendance.findOneAndUpdate(
      { _id: attendance._id, checkOut: null },
      {
        $set: {
          checkOut: checkOutAt,
          workingHours,
          overtimeStartedAt,
          overtimeHours,
          autoCheckoutNotifiedAt:
            attendance.autoCheckoutNotifiedAt ||
            (checkOutAt >= overtimeStart ? overtimeStart : null),
          status,
          isLate: Boolean(attendance.isLate || attendance.status === "Late"),
          lateMinutes: attendance.lateMinutes || 0,
          autoCheckedOut: false,
        },
      },
      { new: true, runValidators: true },
    );
    if (!updatedAttendance) {
      const currentAttendance = await Attendance.findById(attendance._id);
      return res.status(409).json({
        message: "Attendance has already been completed",
        attendance: currentAttendance,
      });
    }
    attendance = updatedAttendance;

    await AuditLog.create({
      adminId: req.user._id,
      adminName: req.user.name,
      action: "ATTENDANCE_CHECK_OUT",
      details: `${req.user.name} checked out at ${checkOutAt.toLocaleTimeString()} (${workingHours.toFixed(1)}h worked, ${overtimeHours.toFixed(1)}h overtime)`,
      module: "Attendance",
      severity: "info",
      ipAddress:
        req.headers["x-forwarded-for"] || req.socket?.remoteAddress || req.ip,
    });

    res.status(200).json({
      message: "Checked out successfully",
      attendance,
    });
  } catch (error) {
    console.error("[Attendance] Check-out error:", error);
    res
      .status(500)
      .json({ message: "Failed to check out", error: error.message });
  }
};

// ─── Continue Work / Start Overtime ────────────────────────────────────────
export const continueWork = async (req, res) => {
  try {
    const { today, overtimeStart, autoCheckoutDeadline } =
      await getAttendanceTimeContext();
    const now = new Date();

    let attendance = await Attendance.findOne({
      userId: req.user._id,
      date: today,
    });

    if (!attendance || !attendance.checkIn) {
      return res.status(400).json({ message: "You have not checked in today" });
    }

    if (attendance.checkOut) {
      return res.status(400).json({ message: "Attendance is already completed" });
    }

    if (attendance.overtimeStartedAt) {
      return res.status(200).json({
        message: "Overtime is already active",
        attendance,
      });
    }

    if (now < overtimeStart) {
      return res.status(400).json({
        message: "Overtime continuation is available from 5:00 PM",
      });
    }

    if (now >= autoCheckoutDeadline) {
      return res.status(400).json({
        message: "The overtime continuation window has expired",
      });
    }

    const updatedAttendance = await Attendance.findOneAndUpdate(
      {
        _id: attendance._id,
        checkOut: null,
        overtimeStartedAt: null,
      },
      {
        $set: {
          overtimeStartedAt: overtimeStart,
          overtimeHours: 0,
          autoCheckoutNotifiedAt:
            attendance.autoCheckoutNotifiedAt || overtimeStart,
          autoCheckedOut: false,
        },
      },
      { new: true, runValidators: true },
    );
    if (!updatedAttendance) {
      const latestAttendance = await Attendance.findById(attendance._id);
      if (latestAttendance?.overtimeStartedAt && !latestAttendance.checkOut) {
        return res.status(200).json({
          message: "Overtime is already active",
          attendance: latestAttendance,
        });
      }
      return res.status(409).json({
        message: "Attendance has already been completed",
        attendance: latestAttendance,
      });
    }
    attendance = updatedAttendance;

    await AuditLog.create({
      adminId: req.user._id,
      adminName: req.user.name,
      action: "ATTENDANCE_OVERTIME_STARTED",
      details: `${req.user.name} continued work after 5:00 PM`,
      module: "Attendance",
      severity: "info",
      ipAddress:
        req.headers["x-forwarded-for"] || req.socket?.remoteAddress || req.ip,
    });

    res.status(200).json({
      message: "Overtime started successfully",
      attendance,
    });
  } catch (error) {
    console.error("[Attendance] Continue work error:", error);
    res.status(500).json({
      message: "Failed to continue work",
      error: error.message,
    });
  }
};

// ─── Create Attendance ─────────────────────────────────────────────────────
// Admin-driven: manually mark/backdate attendance for any employee.
export const createAttendance = async (req, res) => {
  try {
    const {
      userId,
      date,
      checkIn: checkInStr,
      checkOut: checkOutStr,
      status,
      notes,
    } = req.body;

    if (!userId || !date) {
      return res.status(400).json({ message: "User ID and date are required" });
    }
    if (!isValidAttendanceDate(date)) {
      return res.status(400).json({ message: "Invalid date format" });
    }

    if (!isValidObjectId(userId)) {
      return res.status(400).json({ message: "Invalid user ID format" });
    }

    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    const { today: recordDate, tomorrow: recordDateEnd, timeZone } =
      await getAttendanceTimeContext(date);

    const existing = await Attendance.findOne({
      userId,
      date: { $gte: recordDate, $lt: recordDateEnd },
    });
    if (existing) {
      return res
        .status(400)
        .json({ message: "Attendance already marked for this date" });
    }

    let workingHours = 0;
    let checkInDate = null;
    let checkOutDate = null;

    if (checkOutStr && !checkInStr) {
      return res.status(400).json({
        message: "A check-in time is required when providing a check-out time",
      });
    }

    if (checkInStr) {
      checkInDate = await getAttendanceDateTime(date, checkInStr);
    }
    if (checkOutStr && !checkInDate) {
      return res.status(400).json({
        message: "A check-in time is required when providing a check-out time",
      });
    }
    if (checkOutStr) {
      checkOutDate = await getAttendanceDateTime(date, checkOutStr);
      if (Number.isNaN(checkOutDate.getTime()) || checkOutDate <= checkInDate) {
        return res
          .status(400)
          .json({ message: "Check-out time must be after check-in time" });
      }

      workingHours = calculateHours(checkInDate, checkOutDate);
    }

    const requestedStatus =
      status ||
      (workingHours >= 8
        ? "Present"
        : checkInDate && !checkOutDate
          ? "Present"
          : workingHours > 0
          ? "Half Day"
          : "Absent");
    const isPresentStatus = ["Present", "Late", "Half Day"].includes(
      requestedStatus,
    );
    const { isLate, lateMinutes } = checkInDate && isPresentStatus
      ? getLateAttendanceDetails(checkInDate, recordDate, timeZone)
      : { isLate: requestedStatus === "Late", lateMinutes: 0 };

    const attendance = await Attendance.create({
      userId,
      date: recordDate,
      checkIn: checkInDate,
      checkOut: checkOutDate,
      status: requestedStatus === "Late" ? "Present" : requestedStatus,
      isLate,
      lateMinutes,
      workingHours,
      overtimeHours: 0,
      notes,
    });

    await AuditLog.create({
      adminId: req.user?._id,
      adminName: req.user?.name || "System",
      action: "ATTENDANCE_CREATED",
      details: `Attendance marked for ${user.name}`,
      module: "Attendance",
      severity: "info",
      ipAddress:
        req.headers["x-forwarded-for"] || req.socket?.remoteAddress || req.ip,
    });

    res.status(201).json({
      message: "Attendance marked successfully",
      attendance,
    });
  } catch (error) {
    console.error("[Attendance] Create error:", error);
    res
      .status(500)
      .json({ message: "Failed to mark attendance", error: error.message });
  }
};

// ─── Update Attendance ─────────────────────────────────────────────────────
export const updateAttendance = async (req, res) => {
  try {
    const { id } = req.params;

    if (!isValidObjectId(id)) {
      return res.status(400).json({ message: "Invalid attendance ID format" });
    }

    const existing = await Attendance.findById(id);
    if (!existing) {
      return res.status(404).json({ message: "Attendance not found" });
    }

    const {
      checkIn: checkInStr,
      checkOut: checkOutStr,
      status,
      notes,
    } = req.body;
    const updates = {};

    const { timeZone } = await getAttendanceTimeContext(existing.date);

    if (checkInStr) {
      updates.checkIn = await getAttendanceDateTime(existing.date, checkInStr);
    }
    if (checkOutStr) {
      updates.checkOut = await getAttendanceDateTime(existing.date, checkOutStr);
    }
    if (notes !== undefined) updates.notes = notes;

    // Resolve what check-in/check-out will actually be in effect after this
    // update, falling back to the existing stored value for whichever one
    // wasn't resubmitted. Previously this only recalculated when BOTH
    // checkInStr and checkOutStr were present in the same request — editing
    // just the checkout time (the common case: an admin fixing a mistaken
    // clock-out) left workingHours silently stale.
    const effectiveCheckIn = updates.checkIn || existing.checkIn;
    const effectiveCheckOut = updates.checkOut || existing.checkOut;

    if (effectiveCheckIn && effectiveCheckOut) {
      if (effectiveCheckOut <= effectiveCheckIn) {
        return res
          .status(400)
          .json({ message: "Check-out time must be after check-in time" });
      }
      updates.workingHours = calculateHours(effectiveCheckIn, effectiveCheckOut);

      if (existing.overtimeStartedAt) {
        updates.overtimeHours = calculateHours(
          existing.overtimeStartedAt,
          effectiveCheckOut,
        );
      } else {
        updates.overtimeHours = 0;
      }

      // Recompute status from the corrected hours whenever the check-in or
      // check-out time actually changed — this is the same rule self
      // checkout and the auto-checkout sweep already use
      // (deriveCheckoutStatus), so a corrected checkout time is reflected
      // in the status the same way it would be if the employee had
      // checked out at that time themselves. Only applies to the
      // hours-derived statuses — an explicit Holiday/Absent/Leave call is
      // not something a time correction should silently overwrite.
      const HOURS_DERIVED_STATUSES = ["Present", "Late", "Half Day"];
      if (updates.checkIn || updates.checkOut) {
        const requestedStatus = status || existing.status;
        const baseStatus =
          requestedStatus === "Late" ? "Present" : requestedStatus;
        updates.status = HOURS_DERIVED_STATUSES.includes(baseStatus)
          ? deriveCheckoutStatus(baseStatus, updates.workingHours)
          : baseStatus;
      } else if (status) {
        updates.status = status === "Late" ? "Present" : status;
      }

      if (updates.checkIn || status !== undefined) {
        const effectiveStatus = updates.status || existing.status;
        const isPresentStatus = ["Present", "Late", "Half Day"].includes(
          effectiveStatus,
        );
        const details = effectiveCheckIn && isPresentStatus
          ? getLateAttendanceDetails(effectiveCheckIn, existing.date, timeZone)
          : {
              isLate: status === "Late" || Boolean(existing.isLate),
              lateMinutes: status === "Late" ? 0 : existing.lateMinutes || 0,
            };
        updates.isLate = isPresentStatus && details.isLate;
        updates.lateMinutes = updates.isLate ? details.lateMinutes : 0;
      }
    } else if (status) {
      updates.status = status;
    }

    const attendance = await Attendance.findByIdAndUpdate(id, updates, {
      returnDocument: "after",
      runValidators: true,
    });

    await AuditLog.create({
      adminId: req.user?._id,
      adminName: req.user?.name || "System",
      action: "ATTENDANCE_UPDATED",
      details: `Attendance updated for ${attendance.userId}`,
      module: "Attendance",
      severity: "info",
      ipAddress:
        req.headers["x-forwarded-for"] || req.socket?.remoteAddress || req.ip,
    });

    res.status(200).json({
      message: "Attendance updated successfully",
      attendance,
    });
  } catch (error) {
    console.error("[Attendance] Update error:", error);
    res
      .status(500)
      .json({ message: "Failed to update attendance", error: error.message });
  }
};

// ─── Delete Attendance ──────────────────────────────────────────────────────
export const deleteAttendance = async (req, res) => {
  try {
    const { id } = req.params;

    if (!isValidObjectId(id)) {
      return res.status(400).json({
        success: false,
        message: "Invalid attendance ID format",
      });
    }

    const attendance = await Attendance.findById(id);

    if (!attendance) {
      return res.status(404).json({
        success: false,
        message: "Attendance record not found",
      });
    }

    const userRole =
      typeof req.user.role === "object" ? req.user.role?.name : req.user.role;
    const isAdmin = userRole?.toLowerCase() === "admin";
    const isOwner = attendance.userId.toString() === req.user._id.toString();

    if (!isAdmin && !isOwner) {
      return res.status(403).json({
        success: false,
        message: "You are not authorized to delete this record",
      });
    }

    await Attendance.findByIdAndDelete(id);

    await AuditLog.create({
      adminId: req.user._id,
      adminName: req.user.name,
      action: "ATTENDANCE_DELETED",
      details: `Deleted attendance record for user ${attendance.userId}`,
      module: "Attendance",
      severity: "warning",
      ipAddress:
        req.headers["x-forwarded-for"] || req.socket?.remoteAddress || req.ip,
    });

    res.status(200).json({
      success: true,
      message: "Attendance record deleted successfully",
      data: {
        id: attendance._id,
        userId: attendance.userId,
        date: attendance.date,
        status: attendance.status,
      },
    });
  } catch (error) {
    console.error("[Attendance] Delete error:", error);

    if (error.name === "CastError") {
      return res.status(400).json({
        success: false,
        message: "Invalid attendance ID format",
      });
    }

    res.status(500).json({
      success: false,
      message: "Failed to delete attendance record",
      error: process.env.NODE_ENV === "development" ? error.message : undefined,
    });
  }
};

// ─── Manually Trigger Missed-Checkout Sweep ────────────────────────────────
// The background scheduler already runs this every 5 minutes; this lets an
// admin force an immediate run — useful for testing without waiting for
// the actual 5 PM / 5:15 PM thresholds to pass.
export const processMissedCheckouts = async (req, res) => {
  try {
    const result = await runAttendanceAutoCheckoutSweep();
    res.status(200).json({
      message: `Sent ${result.reminded} reminder(s), auto checked-out ${result.autoCheckedOut} employee(s)`,
      ...result,
    });
  } catch (error) {
    console.error("[Attendance] Process missed checkouts error:", error);
    res.status(500).json({
      message: "Failed to process missed checkouts",
      error: error.message,
    });
  }
};

// ─── Get Attendance Stats ──────────────────────────────────────────────────
export const getAttendanceStats = async (req, res) => {
  try {
    const rawDate = req.query?.date;
    const targetDate = rawDate ? new Date(rawDate) : new Date();

    if (rawDate && !isValidAttendanceDate(rawDate)) {
      return res.status(400).json({ message: "Invalid date format" });
    }

    const { today: start, tomorrow: end } =
      await getAttendanceTimeContext(rawDate || targetDate);

    const stats = await Attendance.aggregate([
      {
        $match: {
          date: { $gte: start, $lt: end },
          deletedAt: null,
        },
      },
      {
        $group: {
          _id: null,
          present: {
            $sum: {
              $cond: [{ $in: ["$status", ["Present", "Late"]] }, 1, 0],
            },
          },
          late: {
            $sum: {
              $cond: [
                {
                  $or: [
                    { $eq: ["$isLate", true] },
                    { $eq: ["$status", "Late"] },
                  ],
                },
                1,
                0,
              ],
            },
          },
          absent: {
            $sum: { $cond: [{ $eq: ["$status", "Absent"] }, 1, 0] },
          },
          halfDay: {
            $sum: { $cond: [{ $eq: ["$status", "Half Day"] }, 1, 0] },
          },
          recorded: { $sum: 1 },
        },
      },
    ]);

    const totals = stats[0] || {};
    const result = {
      present: totals.present || 0,
      absent: totals.absent || 0,
      late: totals.late || 0,
      halfDay: totals.halfDay || 0,
    };

    const activeUsersCount = await User.countDocuments({
      status: "Active",
      role: { $ne: "Admin" },
    });

    const recordedCount = totals.recorded || 0;
    result.absent = Math.max(0, activeUsersCount - recordedCount);

    res.status(200).json(result);
  } catch (error) {
    console.error("[Attendance] Stats error:", error);
    res.status(500).json({
      message: "Failed to fetch attendance stats",
      error: error.message,
    });
  }
};
