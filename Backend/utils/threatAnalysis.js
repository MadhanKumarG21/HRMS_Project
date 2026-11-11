// Backend/utils/threatAnalysis.js
//
// Session-staleness and IP-whitelist-expiry checks have been removed along
// with those features. Remaining metrics are computed from User and
// AuditLog only.
import User from "../Models/User.js";
import AuditLog from "../Models/AuditLog.js";
import SecuritySettings from "../Models/SecuritySettings.js";

const DAY_MS = 24 * 60 * 60 * 1000;

export async function runThreatAnalysis({ deep = false } = {}) {
  const recommendations = [];
  const now = Date.now();

  const [totalUsers, usersWithout2FA, failedLogins24h, settings] = await Promise.all([
    User.countDocuments({ status: "Active" }),
    User.countDocuments({ status: "Active", twoFactorEnabled: { $ne: true } }),
    AuditLog.countDocuments({
      action: "LOGIN_FAILED",
      timestamp: { $gte: new Date(now - DAY_MS) },
    }),
    SecuritySettings.findOne({}).lean(),
  ]);

  // ── Encrypted storage ─────────────────────────────────────────────
  const storageEncrypted =
    process.env.DB_ENCRYPTION_AT_REST === "true" ||
    process.env.MONGODB_URI?.includes("ssl=true");
  const storageStatus = storageEncrypted ? "Secure" : "Unverified";
  if (!storageEncrypted) {
    recommendations.push(
      "Could not confirm encryption-at-rest is enabled for the database connection. Verify your MONGODB_URI / DB_ENCRYPTION_AT_REST configuration.",
    );
  }

  // ── Intrusion detection (failed login volume) ────────────────────
  let intrusionStatus = "Watching";
  if (failedLogins24h > 25) {
    intrusionStatus = "High Activity";
    recommendations.push(
      `${failedLogins24h} failed login attempts in the last 24 hours — review the Security Logs tab for repeated source IPs.`,
    );
  } else if (failedLogins24h > 10) {
    intrusionStatus = "Elevated";
  }

  // ── 2FA coverage ───────────────────────────────────────────────────
  if (totalUsers > 0 && usersWithout2FA > 0) {
    const pct = Math.round((usersWithout2FA / totalUsers) * 100);
    if (pct >= 25) {
      recommendations.push(
        `${usersWithout2FA} of ${totalUsers} active users (${pct}%) do not have 2FA enabled.`,
      );
    }
  }

  if (deep) {
    const repeatOffenders = await AuditLog.aggregate([
      {
        $match: {
          action: "LOGIN_FAILED",
          timestamp: { $gte: new Date(now - DAY_MS) },
        },
      },
      { $group: { _id: "$ipAddress", count: { $sum: 1 } } },
      { $match: { count: { $gte: 5 } } },
      { $sort: { count: -1 } },
      { $limit: 5 },
    ]).catch(() => []);

    if (repeatOffenders.length > 0) {
      intrusionStatus = "High Activity";
      recommendations.push(
        `${repeatOffenders.length} source IP${repeatOffenders.length === 1 ? "" : "s"} generated 5+ failed login attempts in the last 24 hours — consider adding to a blocklist.`,
      );
    }

    if (!settings?.mfaEnabled) {
      recommendations.push(
        "Org-wide MFA enforcement is currently off. Enable it under Settings to require 2FA for all admin roles.",
      );
    }
  }

  const metrics = [
    { label: "Encrypted Storage", value: storageStatus, healthy: storageStatus === "Secure" },
    { label: "Intrusion Detection", value: intrusionStatus, healthy: intrusionStatus === "Watching" },
  ];

  const status = recommendations.length > 0 ? "warning" : "secure";

  return {
    status,
    metrics,
    recommendations,
    summary: {
      failedLogins24h,
      totalUsers,
      usersWithout2FA,
    },
    timestamp: new Date(),
  };
}

export default runThreatAnalysis;