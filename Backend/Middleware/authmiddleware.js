// Backend/Middleware/authmiddleware.js
import jwt from "jsonwebtoken";
import { validationResult } from "express-validator";
import { config } from "../config/config.js";
import User from "../Models/User.js";
import { getCachedPermissionsForRole } from "../config/roleCache.js";

const escapeRegex = (value) => value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

export const verifyToken = async (req, res, next) => {
  try {
    const token = req.cookies?.token;
    if (!token) {
      return res
        .status(401)
        .json({ message: "Access Denied: No authentication token" });
    }

    const decoded = jwt.verify(token, config.JWT_SECRET);
    const user = await User.findById(decoded.userId).select("-password").lean();

    if (!user || user.status === "Inactive") {
      res.clearCookie("token", {
        httpOnly: true,
        secure: config.NODE_ENV === "production",
        path: "/",
        sameSite: config.NODE_ENV === "production" ? "none" : "lax",
      });
      return res
        .status(403)
        .json({ message: "Unauthorized access: Account restricted" });
    }

    const roleName = decoded.role || user.role;
    user.permissions = await getCachedPermissionsForRole(roleName);

    req.user = user;
    req.userId = user._id;

    next();
  } catch (error) {
    res.clearCookie("token", {
      httpOnly: true,
      secure: config.NODE_ENV === "production",
      path: "/",
      sameSite: config.NODE_ENV === "production" ? "none" : "lax",
    });

    if (error.name === "JsonWebTokenError") {
      return res.status(401).json({ message: "Invalid authentication token" });
    }
    if (error.name === "TokenExpiredError") {
      return res
        .status(401)
        .json({ message: "Session expired. Please login again." });
    }
    return res
      .status(401)
      .json({ message: "Invalid or expired session token" });
  }
};

export const handleValidationErrors = (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({
      message: "Validation failed",
      errors: errors.array().map((e) => ({ field: e.path, msg: e.msg })),
    });
  }
  next();
};

export const requireAdmin = (req, res, next) => {
  if (!req.user) {
    console.log("[Auth] requireAdmin: No user found");
    return res.status(403).json({
      message: "Administrative clearance required",
    });
  }

  let userRole = req.user.role;
  if (userRole && typeof userRole === "object") {
    userRole = userRole.name;
  }

  const isAdmin = userRole && userRole.toLowerCase() === "admin";

  if (!isAdmin) {
    return res.status(403).json({
      message: "Administrative clearance required. User role: " + userRole,
    });
  }

  next();
};

export const requirePermission = (...requiredPermissions) => {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({ message: "Authentication required" });
    }
    const userRole =
      typeof req.user.role === "object" ? req.user.role?.name : req.user.role;

    if (userRole?.toLowerCase() === "admin") {
      return next();
    }
    const userPermissions = req.user.permissions || [];
    const hasAllPermissions = requiredPermissions.every((perm) =>
      userPermissions.includes(perm),
    );
    if (!hasAllPermissions) {
      return res.status(403).json({
        message: "Insufficient permissions",
      });
    }
    next();
  };
};

export const requireLeaveDecisionPermission = (req, res, next) => {
  const permission = req.body.status === "Rejected" ? "leave.reject" : "leave.approve";
  return requirePermission(permission)(req, res, next);
};