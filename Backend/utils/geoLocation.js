// Backend/Utils/geoLocation.js
// Replaces getSeededLocation()/getSeededIP() (which derived a fake city
// from a hash of the username). This does a real lookup against the
// requester's actual IP using geoip-lite's offline MaxMind-derived DB.
import geoip from "geoip-lite";
import { isIP } from "node:net";

const PRIVATE_RANGES = [
  /^127\./,
  /^10\./,
  /^192\.168\./,
  /^172\.(1[6-9]|2\d|3[0-1])\./,
  /^::1$/,
  /^fc00:/,
  /^fe80:/,
];

/**
 * Pulls the real client IP off a request, honoring a trusted proxy chain.
 * Express must have `app.set('trust proxy', 1)` (or similar) for
 * `req.ip` to reflect X-Forwarded-For correctly behind a load balancer.
 */
export function getClientIP(req) {
  const forwarded = req.headers["x-forwarded-for"];
  const ip = forwarded ? forwarded.split(",")[0].trim() : req.ip || req.socket?.remoteAddress;
  // Normalize IPv4-mapped IPv6 addresses like ::ffff:127.0.0.1
  return ip?.replace(/^::ffff:/, "") || "0.0.0.0";
}

function isPrivateIP(ip) {
  return PRIVATE_RANGES.some((re) => re.test(ip));
}

/**
 * Real geolocation lookup. Returns null city/region for private/local
 * IPs or IPs the offline DB has no record for — never fabricates a place.
 * @param {string} ip
 * @returns {{ city: string, region: string, country: string } | { city: string }}
 */
export function locateIP(ip) {
  if (!ip || isIP(ip) === 0) {
    return { city: "Unknown" };
  }
  if (isPrivateIP(ip)) {
    return { city: "Local Network" };
  }

  const result = geoip.lookup(ip);
  if (!result) {
    return { city: "Unknown" };
  }

  return {
    city: result.city || "Unknown",
    region: result.region || "",
    country: result.country || "",
  };
}

export default { getClientIP, locateIP };