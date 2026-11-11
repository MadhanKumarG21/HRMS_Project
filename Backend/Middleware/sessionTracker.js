// Backend/Middleware/sessionTracker.js
//
// createSession() is still called directly from authController.loginUser
// and authentication flow right after authenticating,
// to create the Session record and get the sessionToken embedded as the
// JWT's `jti` claim.
//
// touchSession() below is kept exported for reference/backward compat, but
// you no longer need to mount it manually anywhere — verifyToken in
// authmiddleware.js now does this same lastActive update on every
// authenticated request, so session activity tracking works everywhere,
// not just on the routes that used to explicitly include this middleware.
import crypto from "crypto";
import Session from "../Models/Session.js";
import { parseDevice } from "../utils/deviceParser.js";
import { getClientIP, locateIP } from "../utils/geoLocation.js";
import SecuritySettings from "../Models/SecuritySettings.js";

/**
 * Call this from loginUser() immediately after authenticating the user,
 * before signing the JWT. Returns the sessionToken to embed as the
 * token's `jti` claim.
 */
export async function createSession(req, userId) {
  const sessionToken = crypto.randomUUID();
  const ip = getClientIP(req);
  const device = parseDevice(req);
  const location = locateIP(ip);

  const settings = await SecuritySettings.findOne().lean();
  const maxSessions = Math.max(1, Number(settings?.maxSessionsPerUser) || 5);
  const concurrencyEnabled = settings?.sessionConcurrency !== false;

  if (concurrencyEnabled) {
    const activeSessions = await Session.find({ user: userId, revoked: false })
      .sort({ lastActive: -1 })
      .select("_id sessionToken lastActive")
      .lean();

    // Keep the newest session plus the configured number of existing sessions.
    // This prevents unlimited live JWT sessions from accumulating.
    if (activeSessions.length >= maxSessions) {
      const sessionsToRevoke = activeSessions.slice(maxSessions - 1);
      if (sessionsToRevoke.length) {
        await Session.updateMany(
          { _id: { $in: sessionsToRevoke.map((s) => s._id) } },
          { $set: { revoked: true, revokedAt: new Date() } },
        );
      }
    }
  }

  await Session.create({
    user: userId,
    sessionToken,
    ip,
    device: { type: device.type, name: device.name, os: device.os, browser: device.browser },
    location,
    userAgent: device.raw,
    lastActive: new Date(),
  });

  return sessionToken;
}

/**
 * Deprecated as a route-level middleware — authmiddleware.js's verifyToken
 * now does this globally. Left here only so any existing import doesn't
 * break; safe to remove entirely once you've confirmed nothing still
 * mounts it directly.
 */
export function touchSession(req, res, next) {
  const token = req.user?.sessionToken;
  if (token) {
    Session.updateOne({ sessionToken: token, revoked: false }, { $set: { lastActive: new Date() } })
      .catch((err) => console.error("[sessionTracker] touchSession failed:", err.message));
  }
  next();
}

export default { createSession, touchSession };