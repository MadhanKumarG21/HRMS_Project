// Backend/server.js
// Main Express application entry point.
// Configures middleware, mounts routes, and starts the HTTP server.
import express from "express";
import mongoose from "mongoose";
import cors from "cors";
import helmet from "helmet";
import rateLimit from "express-rate-limit";
import cookieParser from "cookie-parser";
import dotenv from "dotenv";
import path from "path";
import { fileURLToPath } from "url";
import { config } from "./config/config.js";
import connectDB from "./config/db.js";
import routes from "./Routes/index.js";
import { statsTracker } from "./Middleware/statsTracker.js";
import { getCachedSecuritySettings } from "./config/securityCache.js";
import { startLeaveAutoRejectScheduler } from "./Services/leaveAutoReject.js";
import { startAttendanceAutoCheckoutScheduler } from "./Services/attendanceAutoCheckout.js";

dotenv.config();

// ESM doesn't have __dirname built in — needed below to serve static files.
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();

// ─── Security Middleware ──────────────────────────────────
app.use(helmet());
app.use(statsTracker);

// ─── CORS Configuration ───────────────────────────────────
app.use(
  cors({
    origin: (origin, callback) => {
      if (!origin) {
        return callback(null, true);
      }

      const allowed = [
        config.CLIENT_URL,
        "http://localhost:5173",
        "http://localhost:5174",
      ];

      if (allowed.includes(origin) || /^http:\/\/localhost:\d+$/.test(origin)) {
        return callback(null, true);
      }

      return callback(new Error("Not allowed by CORS"));
    },

    credentials: true,

    methods: ["GET", "POST", "PATCH", "PUT", "DELETE", "OPTIONS"],

    allowedHeaders: ["Content-Type", "Authorization", "X-Requested-With"],
  }),
);

app.use(express.json({ limit: "100mb" }));
app.use(express.urlencoded({ limit: "100mb", extended: true }));
app.use(cookieParser());

// ─── Rate Limiting ────────────────────────────────────────
const systemLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: async (req, res) => {
    try {
      const settings = await getCachedSecuritySettings();
      if (settings && settings.rateLimitMax !== undefined) {
        return settings.rateLimitMax;
      }
    } catch (error) {
      console.error(
        "[RateLimiter] Error fetching systemLimiter max:",
        error.message,
      );
    }
    return process.env.NODE_ENV === "development" ? 5000 : 100;
  },
  skip: async (req, res) => {
    try {
      const settings = await getCachedSecuritySettings();
      if (settings && settings.rateLimitEnabled === false) {
        return true;
      }
    } catch (error) {
      console.error(
        "[RateLimiter] Error fetching systemLimiter skip:",
        error.message,
      );
    }
    return false;
  },
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    message: "Request limit reached. Try again later.",
  },
});
app.use("/api/users", systemLimiter);
app.use("/api/settings", systemLimiter);

const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: async (req, res) => {
    try {
      const settings = await getCachedSecuritySettings();
      if (settings && settings.retryLimit !== undefined) {
        return settings.retryLimit;
      }
    } catch (error) {
      console.error(
        "[RateLimiter] Error fetching authLimiter max:",
        error.message,
      );
    }
    return 10;
  },
  skip: async (req, res) => {
    try {
      const settings = await getCachedSecuritySettings();
      if (settings && settings.rateLimitEnabled === false) {
        return true;
      }
    } catch (error) {
      console.error(
        "[RateLimiter] Error fetching authLimiter skip:",
        error.message,
      );
    }
    return false;
  },
  message: { message: "Too many login attempts. Try again after 15 minutes." },
});
app.use("/api/auth/login", authLimiter);

// 2FA verification occurs before a full authenticated session exists, so it
// needs its own brute-force protection.



// ─── API Routes ────────────────────────────────────────────
app.use("/api", routes);
// ─── Static Demo Page ────────────────────────────────────────
// Serves the standalone login/check-in-out page at the same origin as the
// API, so the browser never has to make a cross-origin request — no CORS
// config needed for it at all. Put index.html/style.css/script.js in
// Backend/public/attendance-demo/, then visit:
//   http://localhost:5000/attendance-demo/
// IMPORTANT: this must be registered before the catch-all 404 handler
// below — Express matches middleware in registration order, so anything
// added after that handler would never actually be reached.
app.use(
  "/attendance-demo",
  express.static(path.join(__dirname, "public/attendance-demo")),
);

// ─── Health Check ──────────────────────────────────────────
app.get("/health", (req, res) => {
  res.json({
    status: "ok",
    db: mongoose.connection.readyState === 1 ? "connected" : "disconnected",
    timestamp: new Date().toISOString(),
  });
});

// ─── 404 Handler ───────────────────────────────────────────
app.use((req, res) => {
  if (req.path.startsWith("/api")) {
    return res.status(404).json({
      message: "API endpoint not found",
      path: req.path,
      method: req.method,
    });
  }
  res.status(404).json({ message: "Not found" });
});

// ─── Global Error Handler ──────────────────────────────────
app.use((err, req, res, next) => {
  console.error("[Server] Error:", err.message);
  res.status(err.status || 500).json({
    message: err.message || "Internal server error",
    ...(process.env.NODE_ENV === "development" && { stack: err.stack }),
  });
});

// ─── Database Connection ───────────────────────────────────
await connectDB();

// ─── Background Jobs ────────────────────────────────────────
startLeaveAutoRejectScheduler();
startAttendanceAutoCheckoutScheduler();

// ─── Start Server ──────────────────────────────────────────
const PORT = config.PORT || 5000;

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});

export default app;
