// Backend/Controllers/authController.js
// Handles authentication: login, logout, get current user, and change password.
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import User from '../Models/User.js';
import AuditLog from '../Models/AuditLog.js';
import SecuritySettings from '../Models/SecuritySettings.js';
import Role from '../Models/Role.js';
import { config } from '../config/config.js';

// ─── Login User ─────────────────────────────────────────────────────────────
export const loginUser = async (req, res) => {
    try {
        const { email, password } = req.body;

        if (!email || !password) {
            return res.status(400).json({ message: 'Email and password are required' });
        }

        const user = await User.findOne({ email });

        if (!user) {
            return res.status(401).json({ message: 'Invalid email or password' });
        }

        if (user.status !== 'Active') {
            return res.status(401).json({ message: 'Account is disabled' });
        }

        const isMatch = await bcrypt.compare(password, user.password);

        if (!isMatch) {
            return res.status(401).json({ message: 'Invalid email or password' });
        }

        const token = jwt.sign(
            { userId: user._id, role: user.role },
            config.JWT_SECRET,
            { expiresIn: config.JWT_EXPIRE || '7d' },
        );

        res.cookie('token', token, {
            httpOnly: true,
            secure: config.NODE_ENV === 'production',
            sameSite: config.NODE_ENV === 'production' ? 'none' : 'lax',
            maxAge: 7 * 24 * 60 * 60 * 1000,
            path: '/',
        });

        user.lastLogin = new Date();
        await user.save();

        const roleDoc = await Role.findOne({ name: { $regex: `^${user.role}$`, $options: "i" } });
        const permissions = roleDoc?.permissions || user.permissions || [];

        res.status(200).json({
            message: 'Login successful',
            user: {
                id: user._id,
                name: user.name,
                email: user.email,
                role: user.role,
                department: user.department,
                status: user.status,
                profileImage: user.profileImage || "",
                permissions,
            },
        });
    } catch (error) {
        console.error('[Auth] Login Error:', error);
        res.status(500).json({ message: 'Server error' });
    }
};

// ─── Get Current User ──────────────────────────────────────────────────────
export const getMe = async (req, res) => {
    try {
        const user = await User.findById(req.user._id).select(
            '-password -passwordHistory -activeSessions -twoFactorSecret -twoFactorTempSecret -twoFactorBackupCodes',
        );

        if (!user) {
            return res.status(404).json({ message: 'User not found' });
        }

        const roleDoc = await Role.findOne({ name: { $regex: `^${user.role}$`, $options: "i" } });
        const permissions = roleDoc?.permissions || req.user?.permissions || user.permissions || [];
        const userObj = user.toObject();
        userObj.permissions = permissions;
        userObj.profileImage = userObj.profileImage || "";

        res.status(200).json(userObj);
    } catch (error) {
        console.error('[Auth] GetMe Error:', error);
        res.status(500).json({ message: 'Server error' });
    }
};

// ─── Logout User ───────────────────────────────────────────────────────────
export const logoutUser = async (req, res) => {
    res.clearCookie('token', {
        httpOnly: true,
        secure: config.NODE_ENV === 'production',
        sameSite: config.NODE_ENV === 'production' ? 'none' : 'lax',
        path: '/',
    });

    res.status(200).json({ message: 'Logged out successfully' });
};

// ─── Change Password ───────────────────────────────────────────────────────
export const changePassword = async (req, res) => {
    try {
        const { currentPassword, newPassword, confirmNewPassword } = req.body;

        if (!currentPassword || !newPassword || !confirmNewPassword) {
            return res.status(400).json({ message: 'All password fields are required' });
        }

        if (newPassword !== confirmNewPassword) {
            return res.status(400).json({ message: 'New passwords do not match' });
        }

        const user = await User.findById(req.user._id);

        if (!user) {
            return res.status(404).json({ message: 'User not found' });
        }

        const isMatch = await bcrypt.compare(currentPassword, user.password);

        if (!isMatch) {
            return res.status(400).json({ message: 'Current password is incorrect' });
        }

        const settings = await SecuritySettings.findOne();
        const minLength = settings?.minPasswordLength || 8;
        if (newPassword.length < minLength) {
            return res.status(400).json({
                message: `New password must be at least ${minLength} characters long`
            });
        }

        const salt = await bcrypt.genSalt(12);
        user.password = await bcrypt.hash(newPassword, salt);
        user.passwordChangedAt = new Date();

        user.passwordHistory = [
            { hash: user.password, changedAt: new Date() },
            ...(user.passwordHistory || []).slice(0, 4)
        ];

        await user.save();

        res.status(200).json({ message: 'Password updated successfully' });
    } catch (error) {
        console.error('[Auth] Change Password Error:', error);
        res.status(500).json({ message: 'Server error' });
    }
};