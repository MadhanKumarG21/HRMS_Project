// Backend/utils/attendanceHelpers.js
import CompanySettings from "../Models/CompanySettings.js";

const parseTime = (value, name, fallback) => {
  if (value === undefined || value === "") {
    return fallback;
  }
  const match = /^([01]\d|2[0-3]):([0-5]\d)$/.exec(value);
  if (!match) {
    throw new Error(`${name} must use HH:mm 24-hour format`);
  }
  return { hour: Number(match[1]), minute: Number(match[2]) };
};

const parseGraceMinutes = () => {
  const configured = process.env.ATTENDANCE_AUTO_CHECKOUT_GRACE_MINUTES;
  if (configured === undefined || configured === "") {
    return 15;
  }
  const minutes = Number(configured);
  if (!Number.isInteger(minutes) || minutes < 0 || minutes > 180) {
    throw new Error(
      "ATTENDANCE_AUTO_CHECKOUT_GRACE_MINUTES must be an integer from 0 to 180",
    );
  }
  return minutes;
};

export const LATE_THRESHOLD = parseTime(
  process.env.ATTENDANCE_LATE_THRESHOLD_TIME,
  "ATTENDANCE_LATE_THRESHOLD_TIME",
  { hour: 10, minute: 0 },
);
export const WORKDAY_END = parseTime(
  process.env.ATTENDANCE_WORKDAY_END_TIME,
  "ATTENDANCE_WORKDAY_END_TIME",
  { hour: 17, minute: 0 },
);
export const AUTO_CHECKOUT_GRACE_MINUTES = parseGraceMinutes();

// If total worked hours end up below this, the day is downgraded to
// "Half Day" regardless of whether they were on time.
export const HALF_DAY_HOURS_THRESHOLD = 4;
export const FULL_DAY_HOURS_THRESHOLD = 8;

/**
 * Legacy "Late" records remain valid, but current records store lateness
 * separately so a late employee still counts as Present.
 */
export const deriveCheckoutStatus = (existingStatus, workingHours) => {
  if (workingHours < HALF_DAY_HOURS_THRESHOLD) {
    return 'Half Day';
  }
  if (existingStatus === 'Late') {
    return 'Present';
  }
  return existingStatus;
};

const getZonedParts = (value, timeZone) => {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hourCycle: "h23",
  }).formatToParts(value);
  return Object.fromEntries(
    parts
      .filter((part) => part.type !== "literal")
      .map((part) => [part.type, Number(part.value)]),
  );
};

const localDateTimeToUtc = (parts, timeZone) => {
  const targetUtc = Date.UTC(
    parts.year,
    parts.month - 1,
    parts.day,
    parts.hour || 0,
    parts.minute || 0,
    parts.second || 0,
  );
  let timestamp = targetUtc;
  for (let attempt = 0; attempt < 3; attempt += 1) {
    const zoned = getZonedParts(new Date(timestamp), timeZone);
    const representedUtc = Date.UTC(
      zoned.year,
      zoned.month - 1,
      zoned.day,
      zoned.hour,
      zoned.minute,
      zoned.second,
    );
    timestamp += targetUtc - representedUtc;
  }
  return new Date(timestamp);
};

const getDateParts = (date, timeZone) => {
  if (typeof date === "string") {
    const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(date);
    if (match) {
      const parts = {
        year: Number(match[1]),
        month: Number(match[2]),
        day: Number(match[3]),
      };
      const parsed = new Date(
        Date.UTC(parts.year, parts.month - 1, parts.day),
      );
      if (
        parsed.getUTCFullYear() !== parts.year ||
        parsed.getUTCMonth() + 1 !== parts.month ||
        parsed.getUTCDate() !== parts.day
      ) {
        throw new Error("Attendance date is invalid");
      }
      return parts;
    }
  }
  const parts = getZonedParts(new Date(date), timeZone);
  return { year: parts.year, month: parts.month, day: parts.day };
};

export const isValidAttendanceDate = (value) => {
  if (typeof value === "string" && /^\d{4}-\d{2}-\d{2}$/.test(value)) {
    try {
      getDateParts(value, "UTC");
      return true;
    } catch {
      return false;
    }
  }
  return !Number.isNaN(new Date(value).getTime());
};

let cachedTimezone = null;
let timezoneCacheExpiry = 0;
const TIMEZONE_CACHE_TTL = 5 * 60 * 1000; // 5 minutes

export const getAttendanceTimezone = async () => {
  const now = Date.now();
  if (!cachedTimezone || now > timezoneCacheExpiry) {
    try {
      const settings = await CompanySettings.findOne().select("timezone").lean();
      cachedTimezone = settings?.timezone || "Asia/Kolkata";
      timezoneCacheExpiry = now + TIMEZONE_CACHE_TTL;
    } catch {
      cachedTimezone = "Asia/Kolkata";
    }
  }
  const timeZone = cachedTimezone || "Asia/Kolkata";
  try {
    new Intl.DateTimeFormat("en-US", { timeZone }).format();
  } catch {
    throw new Error(`Invalid company attendance timezone: ${timeZone}`);
  }
  return timeZone;
};

export const invalidateAttendanceTimezoneCache = () => {
  cachedTimezone = null;
  timezoneCacheExpiry = 0;
};

export const getAttendanceTimeContext = async (date = new Date()) => {
  const timeZone = await getAttendanceTimezone();
  const parts = getDateParts(date, timeZone);
  const today = localDateTimeToUtc({ ...parts }, timeZone);
  const nextDate = new Date(Date.UTC(parts.year, parts.month - 1, parts.day + 1));
  const tomorrow = localDateTimeToUtc(
    {
      year: nextDate.getUTCFullYear(),
      month: nextDate.getUTCMonth() + 1,
      day: nextDate.getUTCDate(),
    },
    timeZone,
  );
  const overtimeStart = localDateTimeToUtc(
    { ...parts, hour: WORKDAY_END.hour, minute: WORKDAY_END.minute },
    timeZone,
  );
  const autoCheckoutDeadline = new Date(
    overtimeStart.getTime() + AUTO_CHECKOUT_GRACE_MINUTES * 60000,
  );
  return {
    today,
    tomorrow,
    overtimeStart,
    autoCheckoutDeadline,
    timeZone,
  };
};

export const getAttendanceDateKey = (date, timeZone) => {
  const parts = getZonedParts(new Date(date), timeZone);
  return `${parts.year}-${String(parts.month).padStart(2, "0")}-${String(
    parts.day,
  ).padStart(2, "0")}`;
};

export const getAttendanceDateTime = async (date, time) => {
  const timeMatch = /^([01]\d|2[0-3]):([0-5]\d)$/.exec(time || "");
  if (!timeMatch) {
    throw new Error("Attendance time must use HH:mm 24-hour format");
  }
  const timeZone = await getAttendanceTimezone();
  return localDateTimeToUtc(
    {
      ...getDateParts(date, timeZone),
      hour: Number(timeMatch[1]),
      minute: Number(timeMatch[2]),
    },
    timeZone,
  );
};

export const getLateAttendanceDetails = (
  checkIn,
  date = checkIn,
  timeZone = Intl.DateTimeFormat().resolvedOptions().timeZone,
) => {
  const dateParts = getDateParts(date, timeZone);
  const lateThreshold = localDateTimeToUtc(
    {
      ...dateParts,
      hour: LATE_THRESHOLD.hour,
      minute: LATE_THRESHOLD.minute,
    },
    timeZone,
  );
  const checkInTime = new Date(checkIn);
  const isLate =
    !Number.isNaN(checkInTime.getTime()) && checkInTime > lateThreshold;

  return {
    isLate,
    lateMinutes: isLate
      ? Math.ceil((checkInTime.getTime() - lateThreshold.getTime()) / 60000)
      : 0,
  };
};

export const calculateHours = (start, end) => {
  const startTime = new Date(start).getTime();
  const endTime = new Date(end).getTime();
  if (
    Number.isNaN(startTime) ||
    Number.isNaN(endTime) ||
    endTime <= startTime
  ) {
    return 0;
  }
  return Number(((endTime - startTime) / (1000 * 60 * 60)).toFixed(2));
};
