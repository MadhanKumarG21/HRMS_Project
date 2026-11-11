// All printable ASCII special characters that are commonly accepted in passwords.
const SPECIAL_CHARS = /[!@#$%^&*()_+\-=[\]{};':"\\|,.<>/?`~]/;

export const DEFAULT_PASSWORD_POLICY = {
    minPasswordLength: 8,
    requireUppercase: true,
    requireLowercase: true,
    requireNumbers: true,
    requireSymbols: true,
};

/**
 * validatePassword — Checks a password against a policy and returns
 * an array of error messages. Returns an empty array if the password
 * satisfies all enabled rules.
 */
export const validatePassword = (password, policy = DEFAULT_PASSWORD_POLICY) => {
    const errors = [];

    if (!password || password.length === 0) {
        errors.push("Password is required");
        return errors;
    }

    if (password.length < policy.minPasswordLength) {
        errors.push(`Must be at least ${policy.minPasswordLength} characters`);
    }
    if (policy.requireUppercase && !/[A-Z]/.test(password)) {
        errors.push("At least one uppercase letter");
    }
    if (policy.requireLowercase && !/[a-z]/.test(password)) {
        errors.push("At least one lowercase letter");
    }
    if (policy.requireNumbers && !/[0-9]/.test(password)) {
        errors.push("At least one number");
    }
    if (policy.requireSymbols && !SPECIAL_CHARS.test(password)) {
        errors.push("At least one special character");
    }
    return errors;
};

/**
 * isStrongEnough — Returns true if the password satisfies all
 * enabled rules in the policy. Convenience wrapper around validatePassword.
 */
export const isStrongEnough = (password, policy = DEFAULT_PASSWORD_POLICY) => {
    return validatePassword(password, policy).length === 0;
};

/**
 * calculatePasswordStrength — Scores a password from 0–6 based on
 * how many strength indicators it meets, using the provided policy.
 */
export const calculatePasswordStrength = (password, policy = DEFAULT_PASSWORD_POLICY) => {
    if (!password || password.length === 0) return 0;
    let score = 0;
    if (password.length >= policy.minPasswordLength) score++;
    if (password.length >= 12) score++;
    if (/[A-Z]/.test(password)) score++;
    if (/[a-z]/.test(password)) score++;
    if (/[0-9]/.test(password)) score++;
    if (SPECIAL_CHARS.test(password)) score++;
    return Math.min(score, 6);
};

/**
 * getStrengthInfo — Maps a numeric strength score (0–6) to a
 * human-readable label and color.
 */
export const getStrengthInfo = (strength) => {
    const levels = [
        { label: "Very Weak", color: "#e53e3e" },
        { label: "Weak", color: "#ed8936" },
        { label: "Fair", color: "#d69e2e" },
        { label: "Good", color: "#48bb78" },
        { label: "Strong", color: "#38a169" },
        { label: "Very Strong", color: "#2f855a" },
    ];
    const index = Math.max(0, Math.min(strength, levels.length - 1));
    return levels[index];
};