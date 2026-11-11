// Backend/Controllers/admin/statsController.js
// Provides dashboard statistics: user counts, roles, module stats, and request metrics.
import User from '../../Models/User.js';
import Role from '../../Models/Role.js';
import AuditLog from '../../Models/AuditLog.js';
import Module from '../../Models/Modules.js';
import { getRequestStats } from '../../Middleware/statsTracker.js';

// Simple in-memory cache to avoid expensive repeated queries.
let cachedStats = null;
let cacheExpiresAt = 0;
const CACHE_TTL_MS = 30_000; // 30 seconds

// ─── Get Dashboard Stats ───────────────────────────────────────────────────
export const getDashboardStats = async (req, res) => {
    try {
        const now = Date.now();

        // Return cached data if still fresh
        if (cachedStats && now < cacheExpiresAt) {
            return res.status(200).json(cachedStats);
        }

        const [
            totalUsers,
            activeUsers,
            inactiveUsers,
            totalRoles,
            recentLogins,
            failedLogins,
            activeModules,
            suspendedModules,
            roles,
            usersByRoleAgg,
        ] = await Promise.all([
            User.countDocuments(),
            User.countDocuments({ status: 'Active' }),
            User.countDocuments({ status: 'Inactive' }),
            Role.countDocuments(),
            AuditLog.countDocuments({
                action: 'USER_LOGIN',
                timestamp: { $gte: new Date(now - 24 * 60 * 60 * 1000) },
            }),
            AuditLog.countDocuments({
                action: 'LOGIN_FAILED',
                timestamp: { $gte: new Date(now - 24 * 60 * 60 * 1000) },
            }),
            Module.countDocuments({ status: 'Active' }),
            Module.countDocuments({ status: 'Suspended' }),
            Role.find().lean(),
            User.aggregate([
                { $group: { _id: '$role', count: { $sum: 1 } } },
            ]),
        ]);

        const usersByRole = roles.map((r) => ({
            id: r._id.toString(),
            name: r.name,
            count: usersByRoleAgg.find((u) => u._id === r.name)?.count || 0,
        }));

        const { avgResponseTime, uptimePercent, processUptimeSeconds } = getRequestStats();

        cachedStats = {
            totalUsers,
            activeUsers,
            inactiveUsers,
            totalRoles,
            usersByRole,
            recentLogins,
            failedLogins,
            activeModules,
            suspendedModules,
            avgResponseTime,
            uptimePercent,
            processUptimeSeconds,
            lastUpdated: new Date(),
        };

        cacheExpiresAt = now + CACHE_TTL_MS;

        res.status(200).json(cachedStats);
    } catch (error) {
        res.status(500).json({ message: 'Failed to fetch stats', error: error.message });
    }
};
