// Backend/Utils/deviceParser.js
// Replaces the old approach of guessing device info from a seeded hash.
// Parses the REAL User-Agent header sent by the browser/client.
import { UAParser } from "ua-parser-js";

/**
 * Extracts real device/browser/OS info from a request's User-Agent header.
 * @param {import('express').Request} req
 * @returns {{ type: string, name: string, os: string, browser: string, raw: string }}
 */
export function parseDevice(req) {
  const uaString = req.headers["user-agent"] || "";
  const parser = new UAParser(uaString);
  const { browser, os, device } = parser.getResult();

  const type = device.type === "mobile" || device.type === "tablet"
    ? "mobile"
    : "desktop";

  const browserLabel = browser.name
    ? `${browser.name}${browser.version ? " " + browser.version.split(".")[0] : ""}`
    : "Unknown Browser";

  const osLabel = os.name
    ? `${os.name}${os.version ? " " + os.version : ""}`
    : "Unknown OS";

  const deviceName = device.vendor && device.model
    ? `${device.vendor} ${device.model}`
    : browserLabel;

  return {
    type,
    name: deviceName,
    os: osLabel,
    browser: browserLabel,
    raw: uaString,
  };
}

export default parseDevice;