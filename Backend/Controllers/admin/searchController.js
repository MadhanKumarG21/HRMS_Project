// Backend/Controllers/admin/searchController.js
// Provides global search across users, audit logs, and modules.
import User from '../../Models/User.js';
import AuditLog from '../../Models/AuditLog.js';
import Module from '../../Models/Modules.js';

const escapeRegex = (value) => value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

// ─── Global Search ─────────────────────────────────────────────────────────
// Searches across users, audit logs, and modules with per-type pagination.
export const globalSearch = async (req, res) => {
    try {
        const { q, type } = req.query;

        if (typeof q !== 'string' || q.trim().length < 2 || q.trim().length > 100) {
            return res.status(400).json({ message: 'Search query must contain 2 to 100 characters' });
        }

        const query = q.trim();
        const searchRegex = new RegExp(escapeRegex(query), 'i');
        const limit = 10;
        const results = { users: [], auditLogs: [], modules: [] };

        if (!type || type === 'users') {
            results.users = await User.find({
                $or: [
                    { name: searchRegex },
                    { employeeId: searchRegex },
                    { email: searchRegex },
                    { department: searchRegex },
                    { designation: searchRegex },
                    { role: searchRegex },
                    { status: searchRegex },
                ],
            })
                .select('name email employeeId department designation role status profileImage')
                .sort({ name: 1 })
                .limit(limit);
        }

        if (!type || type === 'logs') {
            results.auditLogs = await AuditLog.find({
                $or: [
                    { adminName: searchRegex },
                    { action: searchRegex },
                    { details: searchRegex },
                ],
            })
                .sort({ timestamp: -1 })
                .limit(limit);
        }

        if (!type || type === 'modules') {
            results.modules = await Module.find({
                $or: [
                    { name: searchRegex },
                    { label: searchRegex },
                    { description: searchRegex },
                ],
            }).limit(limit);
        }

        const totalCount = results.users.length + results.auditLogs.length + results.modules.length;
        res.status(200).json({ query, totalCount, ...results });
    } catch (error) {
        res.status(500).json({ message: 'Search failed', error: error.message });
    }
};
