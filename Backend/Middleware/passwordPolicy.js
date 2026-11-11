// Backend/Middleware/passwordPolicy.js
// Single source of truth for password rules. Previously this logic existed
// in three different places that could drift out of sync: a full,
// settings-driven check in userController.js (used for account creation
// and admin-driven resets), a partial minLength-only check in
// authController.js's self-service changePassword, and a third, entirely
// unused, hardcoded-rules copy in Middleware/passwordPolicy.js. That meant
// a password rejected when an admin created your account could still be
// accepted when you changed it yourself.
import bcrypt from 'bcryptjs';
import User from '../Models/User.js';
import SecuritySettings from '../Models/SecuritySettings.js';

// Validates a candidate password against the org's configured
// SecuritySettings (falling back to sane defaults if none are configured).
export const validatePasswordPolicy = async (password) => {
  const settings = await SecuritySettings.findOne();
  const errors = [];

  const minLength = settings?.minPasswordLength || 8;
  const requireUppercase = settings?.requireUppercase !== false;
  const requireLowercase = settings?.requireLowercase !== false;
  const requireNumbers = settings?.requireNumbers !== false;
  const requireSymbols = settings?.requireSymbols !== false;

  if (password.length < minLength) {
    errors.push(`Password must be at least ${minLength} characters long`);
  }
  if (requireUppercase && !/[A-Z]/.test(password)) {
    errors.push('Password must contain at least one uppercase letter');
  }
  if (requireLowercase && !/[a-z]/.test(password)) {
    errors.push('Password must contain at least one lowercase letter');
  }
  if (requireNumbers && !/[0-9]/.test(password)) {
    errors.push('Password must contain at least one number');
  }
  if (requireSymbols && !/[!@#$%^&*(),.?":{}|<>]/.test(password)) {
    errors.push('Password must contain at least one special character');
  }

  return errors;
};

// True if the plain-text candidate password matches any recent password hash.
// IMPORTANT: bcrypt.compare() must receive the plain password first and the
// stored bcrypt hash second. Hashing the candidate first would generate a new
// salt and make password-history checking incorrect.
export const isPasswordInHistory = async (userId, plainPassword) => {
  const user = await User.findById(userId).select('passwordHistory password');
  if (!user) return false;

  const history = user.passwordHistory || [];
  const hashes = [user.password, ...history.map((entry) => entry.hash)].filter(Boolean);

  for (const hash of hashes) {
    if (await bcrypt.compare(plainPassword, hash)) return true;
  }

  return false;
};