// Backend/Routes/index.js
// Central route aggregator for the HRMS API. Mounts all sub-route
// modules under /api and defines top-level auth, user, role, audit,
// stats, module, search, and security endpoints.
import express from "express";
import {
  loginUser,
  getMe,
  logoutUser,
  changePassword,
} from "../Controllers/authController.js";
import {
  createUserAccount,
  getPasswordPolicy,
  getAllUsers,
  getUserById,
  updateUser,
  toggleUserStatus,
  deleteUser,
} from "../Controllers/admin/userController.js";
import {
  getAuditLogs,
  exportAuditLogs,
} from "../Controllers/admin/auditController.js";
import { getDashboardStats } from "../Controllers/admin/statsController.js";
import {
  getAllModules,
  getModuleById,
  createModule,
  toggleModuleStatus,
  deleteModule,
  getModuleStats,
  updateModuleOrder,
} from "../Controllers/admin/moduleController.js";
import { globalSearch } from "../Controllers/admin/searchController.js";
import {
  getAllRoles,
  getRoleById,
  createRole,
  updateRole,
  deleteRole,
} from "../Controllers/roleController.js";
import {
  verifyToken,
  requireAdmin,
  requirePermission,
  requireActiveModule,
  handleValidationErrors,
} from "../Middleware/authmiddleware.js";
import { body, query, param } from "express-validator";

import employeeRoutes from "./admin/employeeRoutes.js";
import leaveRoutes from "./admin/leaveRoutes.js";
import notificationRoutes from "./admin/notificationRoutes.js";
import attendanceRoutes from "./admin/attendanceRoutes.js";
import settingsRoutes from "./admin/settingsRoutes.js";
import reportsRoutes from "./admin/reportsRoutes.js";
import resumeRoutes from "./admin/resumeRoutes.js";
import recruitmentRoutes from "./admin/recruitmentRoutes.js";
// NOTE: The actual filename is Integrationsroutes.js (case mismatch).
// The import must match the filesystem casing on Linux.
import integrationsRoutes from "./admin/Integrationsroutes.js";
import backupRoutes from "./admin/backupRoutes.js";
import profileRoutes from "./admin/profileRoutes.js";

const router = express.Router();
router.use("/roles", requireActiveModule("roles"));
router.use("/audit-logs", requireActiveModule("audit"));

// ─── Auth Routes ────────────────────────────────────────────────────
// Public: no token required
router.get("/auth/clear-auth", (req, res) => {
  res.clearCookie("token", {
    httpOnly: true,
    path: "/",
    sameSite: config.NODE_ENV === "production" ? "none" : "lax",
    secure: config.NODE_ENV === "production",
  });
  res.json({ message: "Auth cookie cleared (router)" });
});

router.post(
  "/auth/login",
  [
    body("email")
      .isEmail()
      .normalizeEmail()
      .withMessage("Valid email is required"),
    body("password").isLength({ min: 1 }).withMessage("Password is required"),
    handleValidationErrors,
  ],
  loginUser,
);

// Protected: token required
router.get("/auth/me", verifyToken, getMe);
router.post("/auth/logout", verifyToken, logoutUser);
router.post(
  "/auth/change-password",
  verifyToken,
  [
    body("currentPassword")
      .isLength({ min: 1 })
      .withMessage("Current password is required"),
    body("newPassword")
      .isLength({ min: 8 })
      .withMessage("New password must be at least 8 characters"),
    body("newPassword")
      .custom((value, { req }) => {
        if (value === req.body.currentPassword) {
          throw new Error("New password must be different from current password");
        }
        return true;
      })
      .withMessage("New password must be different from current password"),
    handleValidationErrors,
  ],
  changePassword,
);

// ─── Users ──────────────────────────────────────────────────────────
router.get(
  "/users",
  verifyToken,
  requirePermission("employees.view"),
  [
    query("status").optional().isIn(["Active", "Inactive"]),
    query("sortBy").optional().isIn(["name", "email", "createdAt", "status"]),
    query("order").optional().isIn(["asc", "desc"]),
    handleValidationErrors,
  ],
  getAllUsers,
);

router.get("/users/password-policy", verifyToken, getPasswordPolicy);

router.get(
  "/users/:id",
  verifyToken,
  requirePermission("employees.view"),
  [
    param("id").isMongoId().withMessage("Invalid user ID"),
    handleValidationErrors,
  ],
  getUserById,
);

router.post(
  "/users/create",
  verifyToken,
  requireAdmin,
  [
    body("name")
      .trim()
      .isLength({ min: 2, max: 100 })
      .withMessage("Name must be 2-100 characters"),
    body("email")
      .isEmail()
      .normalizeEmail()
      .withMessage("Valid email is required"),
    body("password")
      .isLength({ min: 8 })
      .withMessage("Password must be at least 8 characters"),
    body("roleName")
      .trim()
      .isLength({ min: 1 })
      .withMessage("Role name is required"),
    body("department")
      .trim()
      .isLength({ min: 1, max: 100 })
      .withMessage("Department is required"),
    body("status")
      .optional()
      // Was restricted to Active/Inactive only — the create-account form's
      // status field now represents the combined User+Employee status
      // (see mapStatusForUserAndEmployee in userController.js), so "On
      // Leave" and "Terminated" need to actually reach the controller
      // instead of getting rejected here before it ever sees them.
      .isIn(["Active", "Inactive", "On Leave", "Terminated"])
      .withMessage("Invalid status"),
    handleValidationErrors,
  ],
  createUserAccount,
);

router.patch(
  "/users/:id",
  verifyToken,
  requireAdmin,
  [
    param("id").isMongoId().withMessage("Invalid user ID"),
    handleValidationErrors,
  ],
  updateUser,
);

router.patch(
  "/users/:id/toggle",
  verifyToken,
  requireAdmin,
  [
    param("id").isMongoId().withMessage("Invalid user ID"),
    handleValidationErrors,
  ],
  toggleUserStatus,
);

router.delete(
  "/users/:id",
  verifyToken,
  requireAdmin,
  [
    param("id").isMongoId().withMessage("Invalid user ID"),
    handleValidationErrors,
  ],
  deleteUser,
);

// ─── Roles ──────────────────────────────────────────────────────────
router.get("/roles", verifyToken, requirePermission("roles.view"), getAllRoles);
router.get(
  "/roles/:id",
  verifyToken,
  requirePermission("roles.view"),
  [
    param("id").isMongoId().withMessage("Invalid role ID"),
    handleValidationErrors,
  ],
  getRoleById,
);

router.post(
  "/roles",
  verifyToken,
  requireAdmin,
  [
    body("name")
      .trim()
      .isLength({ min: 2, max: 50 })
      .withMessage("Role name must be 2-50 characters"),
    body("description").optional().trim().isLength({ max: 500 }),
    body("permissions").optional().isArray(),
    handleValidationErrors,
  ],
  createRole,
);

router.patch(
  "/roles/:id",
  verifyToken,
  requireAdmin,
  [
    param("id").isMongoId().withMessage("Invalid role ID"),
    handleValidationErrors,
  ],
  updateRole,
);

router.delete(
  "/roles/:id",
  verifyToken,
  requireAdmin,
  [
    param("id").isMongoId().withMessage("Invalid role ID"),
    handleValidationErrors,
  ],
  deleteRole,
);

// ─── Audit Logs ─────────────────────────────────────────────────────
router.get(
  "/audit-logs",
  verifyToken,
  requirePermission("audit.view"),
  [
    query("limit").optional().isInt({ min: 1, max: 1000 }),
    handleValidationErrors,
  ],
  getAuditLogs,
);

router.get(
  "/audit-logs/export",
  verifyToken,
  requirePermission("audit.export"),
  [query("format").optional().isIn(["csv", "json"]), handleValidationErrors],
  exportAuditLogs,
);

// Development-only debug endpoint. Never exposed in production.
router.get('/debug/me', verifyToken, requireAdmin, (req, res) => {
  if (process.env.NODE_ENV !== 'development') {
    return res.status(404).json({ message: 'Not found' });
  }

  res.json({
    user: {
      id: req.user._id,
      name: req.user.name,
      email: req.user.email,
      role: req.user.role,
      roleType: typeof req.user.role,
      status: req.user.status,
    },
    isAdmin: req.user.role === 'Admin',
    isAdminLower: req.user.role?.toLowerCase() === 'admin',
  });
});

// ─── Stats ──────────────────────────────────────────────────────────
router.get("/stats", verifyToken, requireAdmin, getDashboardStats);

// ─── Modules ────────────────────────────────────────────────────────
router.get("/modules", verifyToken, getAllModules);

router.get("/modules/stats", verifyToken, requireAdmin, getModuleStats);

router.get(
  "/modules/:id",
  verifyToken,
  [
    param("id").isMongoId().withMessage("Invalid module ID"),
    handleValidationErrors,
  ],
  getModuleById,
);

router.put(
  "/modules/order",
  verifyToken,
  requireAdmin,
  [
    body("modules").isArray().withMessage("Modules array is required"),
    handleValidationErrors,
  ],
  updateModuleOrder,
);

router.patch(
  "/modules/:id/toggle",
  verifyToken,
  requireAdmin,
  [
    param("id").isMongoId().withMessage("Invalid module ID"),
    handleValidationErrors,
  ],
  toggleModuleStatus,
);

router.post(
  "/modules",
  verifyToken,
  requireAdmin,
  [
    body("name")
      .trim()
      .isLength({ min: 2 })
      .withMessage("Module name is required"),
    body("label")
      .trim()
      .isLength({ min: 2 })
      .withMessage("Module label is required"),
    handleValidationErrors,
  ],
  createModule,
);

router.delete(
  "/modules/:id",
  verifyToken,
  requireAdmin,
  [
    param("id").isMongoId().withMessage("Invalid module ID"),
    handleValidationErrors,
  ],
  deleteModule,
);

// ─── Search ─────────────────────────────────────────────────────────
router.get(
  "/search",
  verifyToken,
  [
    query("q")
      .trim()
      .isLength({ min: 2, max: 100 })
      .withMessage("Search query must contain 2 to 100 characters"),
    query("type").optional().isIn(["users", "logs", "modules"]),
    handleValidationErrors,
  ],
  globalSearch,
);

// ─── Sub-Route Modules ──────────────────────────────────────────────
router.use("/backup", backupRoutes);
router.use("/employees", employeeRoutes);
router.use("/leaves", leaveRoutes);
router.use("/notifications", notificationRoutes);
router.use("/attendance", attendanceRoutes);
router.use("/settings", settingsRoutes);
router.use("/reports", reportsRoutes);
router.use("/recruitment", recruitmentRoutes);
router.use("/recruitment", resumeRoutes);
router.use("/integrations", integrationsRoutes);


router.use("/profile", profileRoutes);


export default router;