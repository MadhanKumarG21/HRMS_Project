// Backend/Controllers/admin/userController.js
// Manages user accounts: creation, retrieval, updates, status toggling, deletion, and password policy.
import bcrypt from "bcryptjs";
import mongoose from "mongoose";
import User from "../../Models/User.js";
import Role from "../../Models/Role.js";
import AuditLog from "../../Models/AuditLog.js";
import SecuritySettings from "../../Models/SecuritySettings.js";
import { validatePasswordPolicy, isPasswordInHistory } from "../../Middleware/passwordPolicy.js";

const isValidObjectId = (id) => mongoose.Types.ObjectId.isValid(id);
const escapeRegex = (value) => value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

// Employee-profile fields the create/edit modal collects beyond the
// account-level fields (name/email/role/department/status/password) that
// User itself owns. Previously these were silently discarded — collected
// by the form, sent to the server, and dropped, because createUserAccount/
// updateUser only ever destructured the account fields from req.body.
const EMPLOYEE_PROFILE_FIELDS = [
  "employeeId", "designation", "joiningDate", "dateOfBirth",
  "gender", "phone", "address", "emergencyContact", "bankDetails",
];

const pickEmployeeFields = (body) => {
  const picked = {};
  for (const field of EMPLOYEE_PROFILE_FIELDS) {
    if (body[field] !== undefined) picked[field] = body[field];
  }
  return picked;
};

const mapStatusForUserAndEmployee = (status) => {
  return { userStatus: status, employeeStatus: status };
};

const getRoleName = (req) => {
  const role = req.user?.role;
  return (typeof role === "object" ? role?.name : role || "").toLowerCase();
};

const hasFullAccess = (req) =>
  getRoleName(req) === "admin" ||
  (req.user?.permissions || []).includes("all:access");

const isElevatedRole = (role) =>
  ["admin", "hr", "manager"].includes(String(role || "").toLowerCase());

const applyUserDataScope = (filter, req) => {
  if (hasFullAccess(req)) return filter;
  const role = getRoleName(req);
  if (role === "employee") {
    filter._id = req.user._id;
  } else if (role === "manager") {
    filter.department = req.user.department || "__no_department__";
    filter.role = { $nin: ["Admin", "HR"] };
  }
  return filter;
};

// ─── Create User Account ───────────────────────────────────────────────────
export const createUserAccount = async (req, res) => {
  try {
    const { name, email, password, confirmPassword, roleName, department, status } =
      req.body;

    if (!name || !email || !password || !roleName || !department || !status) {
      return res.status(400).json({
        message: "All fields are required",
        errors: ["Name, email, password, role, department, and status are required"],
      });
    }

    if (!hasFullAccess(req) && String(roleName).toLowerCase() !== "employee") {
      return res.status(403).json({ message: "Only administrators can assign elevated roles" });
    }
    const targetDepartment = getRoleName(req) === "manager"
      ? req.user.department
      : department;
    if (!targetDepartment) {
      return res.status(403).json({ message: "A department is required for this account" });
    }

    if (confirmPassword !== undefined && password !== confirmPassword) {
      return res.status(400).json({
        message: "Passwords do not match",
      });
    }

    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return res.status(400).json({
        message: "Email already registered",
        errors: [`${email} is already registered`],
      });
    }

    const policyErrors = await validatePasswordPolicy(password);
    if (policyErrors.length > 0) {
      return res.status(400).json({
        message: "Password does not meet security policy",
        errors: policyErrors,
      });
    }

    const roleExists = await Role.findOne({ name: roleName });
    if (!roleExists) {
      return res.status(404).json({
        message: `Role '${roleName}' not found`,
        errors: [`Role '${roleName}' does not exist`],
      });
    }

    const salt = await bcrypt.genSalt(12);
    const hashedPassword = await bcrypt.hash(password, salt);

    const { userStatus } = mapStatusForUserAndEmployee(status);
    const employeeFields = pickEmployeeFields(req.body);

    const newUser = await User.create({
      name,
      email,
      password: hashedPassword,
      role: roleName,
      department: targetDepartment,
      status: userStatus,
      ...employeeFields,
      passwordChangedAt: new Date(),
      passwordHistory: [{ hash: hashedPassword, changedAt: new Date() }],
    });

    await AuditLog.create({
      adminId: req.user._id,
      adminName: req.user.name,
      action: "USER_CREATED",
      details: `Created account for ${name} with role ${roleName} (${status})`,
      module: "User Management",
      severity: "info",
      ipAddress:
        req.headers["x-forwarded-for"] || req.socket?.remoteAddress || req.ip,
    });

    const user = await User.findById(newUser._id)
      .select("-password -passwordHistory -activeSessions -twoFactorSecret -twoFactorTempSecret -twoFactorBackupCodes");
    res.status(201).json({
      message: "User created successfully",
      user,
      policy: {
        minPasswordLength: await SecuritySettings.findOne().then(
          (s) => s?.minPasswordLength || 8,
        ),
      },
    });
  } catch (error) {
    console.error("[User] Create error:", error);
    res.status(500).json({
      message: "Failed to create user",
      error: error.message,
    });
  }
};

// ─── Get Password Policy ───────────────────────────────────────────────────
export const getPasswordPolicy = async (req, res) => {
  try {
    const settings = await SecuritySettings.findOne();

    if (!settings) {
      return res.status(200).json({
        minPasswordLength: 8,
        requireUppercase: true,
        requireLowercase: true,
        requireNumbers: true,
        requireSymbols: true,
        passwordExpiry: 90,
        passwordHistoryCount: 5,
        maxLoginAttempts: 5,
        lockoutDuration: 30,
        sessionTimeout: 30,
        maxSessionsPerUser: 5,
        sessionConcurrency: true,
        mfaEnabled: true,
        mfaRequired: false,
        mfaForAdmin: true,
        backupCodesCount: 10,
        ipWhitelistEnabled: false,
        ipWhitelistStrict: false,
        auditRetentionDays: 365,
        auditLoggingEnabled: true,
        logFailedLogin: true,
        logSuccessfulLogin: true,
        rateLimitEnabled: true,
        rateLimitWindow: 15,
        rateLimitMax: 100,
      });
    }

    res.status(200).json({
      minPasswordLength: settings.minPasswordLength || 8,
      requireUppercase:
        settings.requireUppercase !== undefined
          ? settings.requireUppercase
          : true,
      requireLowercase:
        settings.requireLowercase !== undefined
          ? settings.requireLowercase
          : true,
      requireNumbers:
        settings.requireNumbers !== undefined ? settings.requireNumbers : true,
      requireSymbols:
        settings.requireSymbols !== undefined ? settings.requireSymbols : true,
      passwordExpiry: settings.passwordExpiry || 90,
      passwordHistoryCount: settings.passwordHistoryCount || 5,
      maxLoginAttempts: settings.maxLoginAttempts || 5,
      lockoutDuration: settings.lockoutDuration || 30,
      sessionTimeout: settings.sessionTimeout || 30,
      maxSessionsPerUser: settings.maxSessionsPerUser || 5,
      sessionConcurrency:
        settings.sessionConcurrency !== undefined
          ? settings.sessionConcurrency
          : true,
      mfaEnabled:
        settings.mfaEnabled !== undefined ? settings.mfaEnabled : true,
      mfaRequired:
        settings.mfaRequired !== undefined ? settings.mfaRequired : false,
      mfaForAdmin:
        settings.mfaForAdmin !== undefined ? settings.mfaForAdmin : true,
      backupCodesCount: settings.backupCodesCount || 10,
      ipWhitelistEnabled:
        settings.ipWhitelistEnabled !== undefined
          ? settings.ipWhitelistEnabled
          : false,
      ipWhitelistStrict:
        settings.ipWhitelistStrict !== undefined
          ? settings.ipWhitelistStrict
          : false,
      auditRetentionDays: settings.auditRetentionDays || 365,
      auditLoggingEnabled:
        settings.auditLoggingEnabled !== undefined
          ? settings.auditLoggingEnabled
          : true,
      logFailedLogin:
        settings.logFailedLogin !== undefined ? settings.logFailedLogin : true,
      logSuccessfulLogin:
        settings.logSuccessfulLogin !== undefined
          ? settings.logSuccessfulLogin
          : true,
      rateLimitEnabled:
        settings.rateLimitEnabled !== undefined
          ? settings.rateLimitEnabled
          : true,
      rateLimitWindow: settings.rateLimitWindow || 15,
      rateLimitMax: settings.rateLimitMax || 100,
    });
  } catch (error) {
    console.error("[Password Policy] Get error:", error);
    res
      .status(500)
      .json({
        message: "Failed to fetch password policy",
        error: error.message,
      });
  }
};

// ─── Get All Users ─────────────────────────────────────────────────────────
export const getAllUsers = async (req, res) => {
  try {
    const {
      search,
      status,
      department,
      role,
      sortBy = "createdAt",
      order = "desc",
      page = 1,
      limit = 50,
    } = req.query;
    const filter = {};
    const skip = (parseInt(page) - 1) * parseInt(limit);

    if (status) filter.status = status;
    if (department) filter.department = department;
    if (role) filter.role = role;
    const searchTerm = typeof search === "string" ? search.trim().slice(0, 100) : "";
    if (searchTerm) {
      const searchRegex = new RegExp(escapeRegex(searchTerm), "i");
      filter.$or = [
        { name: searchRegex },
        { employeeId: searchRegex },
        { email: searchRegex },
        { department: searchRegex },
        { designation: searchRegex },
        { role: searchRegex },
        { status: searchRegex },
      ];
    }
    applyUserDataScope(filter, req);

    const [users, total] = await Promise.all([
      User.find(filter)
        .select("-password -passwordHistory -activeSessions -twoFactorSecret -twoFactorTempSecret -twoFactorBackupCodes")
        .sort({ [sortBy]: order === "desc" ? -1 : 1 })
        .skip(skip)
        .limit(parseInt(limit))
        .lean(),
      User.countDocuments(filter),
    ]);

    res.status(200).json({
      data: users,
      total,
      page: parseInt(page),
      totalPages: Math.ceil(total / parseInt(limit)),
    });
  } catch (error) {
    console.error("[User] Get all error:", error);
    res
      .status(500)
      .json({ message: "Failed to fetch users", error: error.message });
  }
};

// ─── Get Employee Stats ───────────────────────────────────────────────────
export const getEmployeeStats = async (req, res) => {
  try {
    const filter = applyUserDataScope({}, req);
    const [statsAgg, total] = await Promise.all([
      User.aggregate([
        { $match: filter },
        { $group: { _id: "$status", count: { $sum: 1 } } }
      ]),
      User.countDocuments(filter)
    ]);

    let active = 0;
    let inactive = 0;
    let onLeave = 0;
    let terminated = 0;

    for (const item of statsAgg) {
      if (item._id === "Active") active = item.count;
      else if (item._id === "Inactive") inactive = item.count;
      else if (item._id === "On Leave") onLeave = item.count;
      else if (item._id === "Terminated") terminated = item.count;
    }

    return res.status(200).json({ total, active, inactive, onLeave, terminated });
  } catch (error) {
    console.error("[User] Employee stats error:", error);
    return res.status(500).json({
      message: "Failed to fetch employee stats",
      error: error.message,
    });
  }
};

// ─── Get User By ID ────────────────────────────────────────────────────────
export const getUserById = async (req, res) => {
  try {
    const { id } = req.params;

    if (!isValidObjectId(id)) {
      return res.status(400).json({ message: "Invalid user ID format" });
    }

    const user = await User.findById(id)
      .select("-password -passwordHistory -activeSessions -twoFactorSecret -twoFactorTempSecret -twoFactorBackupCodes");
    if (!user) return res.status(404).json({ message: "User not found" });
    const role = getRoleName(req);
    if (
      !hasFullAccess(req) &&
      ((role === "employee" && String(user._id) !== String(req.user._id)) ||
        (role === "manager" && user.department !== req.user.department))
    ) {
      return res.status(403).json({ message: "Access denied to this employee record" });
    }

    res.status(200).json(user);
  } catch (error) {
    console.error("[User] Get by ID error:", error);
    res
      .status(500)
      .json({ message: "Failed to fetch user", error: error.message });
  }
};

// ─── Update User ───────────────────────────────────────────────────────────
export const updateUser = async (req, res) => {
  try {
    const { id } = req.params;
    // 1. Add 'status' to destructured body properties
    const { name, email, department, roleName, password, status, profileImage } = req.body;

    if (!isValidObjectId(id)) {
      return res.status(400).json({ message: "Invalid user ID format" });
    }
    const existingUser = await User.findById(id).select("role department");
    if (!existingUser) return res.status(404).json({ message: "User not found" });
    if (!hasFullAccess(req)) {
      if (isElevatedRole(existingUser.role)) {
        return res.status(403).json({ message: "Access denied to this employee record" });
      }
      if (getRoleName(req) === "manager" && existingUser.department !== req.user.department) {
        return res.status(403).json({ message: "Access denied to this employee record" });
      }
      if (roleName !== undefined) {
        return res.status(403).json({ message: "Only administrators can change user roles" });
      }
      if (getRoleName(req) === "manager" && password !== undefined) {
        return res.status(403).json({ message: "Managers cannot change employee passwords" });
      }
      if (
        getRoleName(req) === "manager" &&
        department !== undefined &&
        department !== existingUser.department
      ) {
        return res.status(403).json({ message: "Managers cannot move employees between departments" });
      }
    }

    const updates = pickEmployeeFields(req.body);

    if (name) updates.name = name;
    if (email) updates.email = email;
    if (department) updates.department = department;
    if (profileImage !== undefined) {
      updates.profileImage = typeof profileImage === "string" ? profileImage : "";
    }

    // Previously restricted to Active/Inactive only, silently ignoring
    // "On Leave"/"Terminated" — an admin picking either of those believed
    // they'd changed the employee's status when nothing happened at all.
    // Now maps to both User.status (the login gate — Terminated correctly
    // revokes access) and, further down, Employee.status (the fuller HR
    // status) if a linked Employee record exists or gets created here.
    const VALID_STATUSES = ["Active", "Inactive", "On Leave", "Terminated"];
    if (status && VALID_STATUSES.includes(status)) {
      const mapped = mapStatusForUserAndEmployee(status);
      updates.status = mapped.userStatus;
    }

    if (roleName) {
      const roleExists = await Role.findOne({ name: roleName });
      if (!roleExists) {
        return res
          .status(404)
          .json({ message: `Role '${roleName}' not found` });
      }
      updates.role = roleName;
    }

    if (password) {
      const policyErrors = await validatePasswordPolicy(password);
      if (policyErrors.length > 0) {
        return res.status(400).json({
          message: "Password does not meet security policy",
          errors: policyErrors,
        });
      }

      if (await isPasswordInHistory(id, password)) {
        return res.status(400).json({
          message:
            "Password has been used recently. Please choose a different password.",
        });
      }

      const currentUser = await User.findById(id).select("password passwordHistory");
      if (!currentUser) {
        return res.status(404).json({ message: "User not found" });
      }

      const salt = await bcrypt.genSalt(12);
      const hashedPassword = await bcrypt.hash(password, salt);
      const historyLimit = Math.max(0, Number((await SecuritySettings.findOne().lean())?.passwordHistoryCount) || 5);

      updates.password = hashedPassword;
      updates.passwordChangedAt = new Date();
      updates.passwordHistory = [
        { hash: currentUser.password, changedAt: new Date() },
        ...(currentUser.passwordHistory || []),
      ].slice(0, historyLimit);
    }

    const user = await User.findByIdAndUpdate(id, updates, {
      returnDocument: "after",
      runValidators: true,
    }).select("-password -passwordHistory -activeSessions -twoFactorSecret -twoFactorTempSecret -twoFactorBackupCodes");

    if (!user) return res.status(404).json({ message: "User not found" });

    // Sync employee details if an associated Employee record exists
    const employeeUpdates = {};
    if (updates.department) employeeUpdates.department = updates.department;
    if (updates.designation !== undefined) employeeUpdates.designation = updates.designation;
    if (updates.phone !== undefined) employeeUpdates.phone = updates.phone;
    if (updates.address !== undefined) employeeUpdates.address = updates.address;
    if (updates.status) employeeUpdates.status = updates.status;
    if (updates.gender !== undefined) employeeUpdates.gender = updates.gender;
    if (updates.dateOfBirth !== undefined) employeeUpdates.dateOfBirth = updates.dateOfBirth;

    if (Object.keys(employeeUpdates).length > 0) {
      await User.findOneAndUpdate({ userId: id }, employeeUpdates);
    }

    await AuditLog.create({
      adminId: req.user._id,
      adminName: req.user.name,
      action: "USER_UPDATED",
      details: `Updated account for ${user.name}`,
      module: "User Management",
      severity: "info",
      ipAddress:
        req.headers["x-forwarded-for"] || req.socket?.remoteAddress || req.ip,
    });

    res.status(200).json({
      message: "User updated successfully",
      user,
    });
  } catch (error) {
    console.error("[User] Update error:", error);
    res
      .status(500)
      .json({ message: "Failed to update user", error: error.message });
  }
};
// ─── Toggle User Status ────────────────────────────────────────────────────
export const toggleUserStatus = async (req, res) => {
  try {
    const { id } = req.params;

    if (!isValidObjectId(id)) {
      return res.status(400).json({ message: "Invalid user ID format" });
    }

    // Prevent self-toggle
    if (id === req.user._id.toString()) {
      return res.status(400).json({ message: "Cannot change your own status" });
    }

    const user = await User.findById(id);
    if (!user) return res.status(404).json({ message: "User not found" });
    if (
      !hasFullAccess(req) &&
      (isElevatedRole(user.role) ||
        (getRoleName(req) === "manager" && user.department !== req.user.department))
    ) {
      return res.status(403).json({ message: "Access denied to this employee record" });
    }
    // Prevent deactivating the last active admin
    if (user.role === "Admin" && user.status === "Active") {
      const activeAdminCount = await User.countDocuments({
        role: "Admin",
        status: "Active",
      });
      if (activeAdminCount <= 1) {
        return res
          .status(400)
          .json({ message: "Cannot deactivate the last active admin account" });
      }
    }

    user.status = user.status === "Active" ? "Inactive" : "Active";
    await user.save();

    await AuditLog.create({
      adminId: req.user._id,
      adminName: req.user.name,
      action: "STATUS_TOGGLED",
      details: `Toggled ${user.name} to ${user.status}`,
      module: "User Management",
      severity: "warning",
      ipAddress:
        req.headers["x-forwarded-for"] || req.socket?.remoteAddress || req.ip,
    });

    res
      .status(200)
      .json({ message: `User ${user.status.toLowerCase()}`, user });
  } catch (error) {
    console.error("[User] Toggle status error:", error);
    res
      .status(500)
      .json({ message: "Failed to toggle status", error: error.message });
  }
};

// ─── Delete User ───────────────────────────────────────────────────────────
export const deleteUser = async (req, res) => {
  try {
    const { id } = req.params;

    if (!isValidObjectId(id)) {
      return res.status(400).json({ message: "Invalid user ID format" });
    }

    // Prevent self-deletion
    if (id === req.user._id.toString()) {
      return res
        .status(400)
        .json({ message: "Cannot delete your own account" });
    }

    const user = await User.findById(id);
    if (!user) return res.status(404).json({ message: "User not found" });
    if (
      !hasFullAccess(req) &&
      (isElevatedRole(user.role) ||
        (getRoleName(req) === "manager" && user.department !== req.user.department))
    ) {
      return res.status(403).json({ message: "Access denied to this employee record" });
    }

    // Prevent deleting the last active admin
    if (user.role === "Admin" && user.status === "Active") {
      const activeAdminCount = await User.countDocuments({
        role: "Admin",
        status: "Active",
      });
      if (activeAdminCount <= 1) {
        return res
          .status(400)
          .json({ message: "Cannot delete the last active admin account" });
      }
    }

    await User.findByIdAndDelete(id);

    await AuditLog.create({
      adminId: req.user._id,
      adminName: req.user.name,
      action: "USER_DELETED",
      details: `Deleted user: ${user.name}`,
      module: "User Management",
      severity: "critical",
      ipAddress:
        req.headers["x-forwarded-for"] || req.socket?.remoteAddress || req.ip,
    });

    res.status(200).json({ message: "User deleted successfully" });
  } catch (error) {
    console.error("[User] Delete error:", error);
    res
      .status(500)
      .json({ message: "Failed to delete user", error: error.message });
  }
};