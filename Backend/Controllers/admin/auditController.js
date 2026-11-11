// Backend/Controllers/admin/auditController.js
// Manages audit logs: retrieval, filtering, and export (CSV/JSON).
import { createObjectCsvStringifier } from 'csv-writer';
import AuditLog from '../../Models/AuditLog.js';

// ─── Get Audit Logs ────────────────────────────────────────────────────────
// Supports filtering by action, module, adminName, and date range with pagination.
export const getAuditLogs = async (req, res) => {
    try {
        const limit = Math.min(parseInt(req.query.limit) || 50, 1000); // Cap at 1000
        const page = parseInt(req.query.page) || 1;
        const skip = (page - 1) * limit;
        const { action, module, adminName, from, to } = req.query;
        const filter = {};

        if (action) filter.action = action;
        if (module) filter.module = module;
        if (adminName) filter.adminName = { $regex: adminName, $options: 'i' };
        if (from || to) {
            filter.timestamp = {};
            if (from) {
                const fromDate = new Date(from);
                if (isNaN(fromDate.getTime())) {
                    return res.status(400).json({ message: 'Invalid from date format' });
                }
                filter.timestamp.$gte = fromDate;
            }
            if (to) {
                const toDate = new Date(to);
                if (isNaN(toDate.getTime())) {
                    return res.status(400).json({ message: 'Invalid to date format' });
                }
                filter.timestamp.$lte = toDate;
            }
        }

        const [logs, total] = await Promise.all([
            AuditLog.find(filter)
                .sort({ timestamp: -1 })
                .skip(skip)
                .limit(limit)
                .lean(),
            AuditLog.countDocuments(filter),
        ]);

        res.status(200).json({
            logs,
            total,
            page,
            totalPages: Math.ceil(total / limit),
        });
    } catch (error) {
        res.status(500).json({ message: 'Failed to fetch audit logs', error: error.message });
    }
};

// ─── Export Audit Logs ─────────────────────────────────────────────────────
// Exports audit logs as CSV or JSON with optional date filtering.
export const exportAuditLogs = async (req, res) => {
    try {
        const { from, to, format = 'csv' } = req.query;
        const filter = {};

        if (from || to) {
            filter.timestamp = {};
            if (from) {
                const fromDate = new Date(from);
                if (isNaN(fromDate.getTime())) {
                    return res.status(400).json({ message: 'Invalid from date format' });
                }
                filter.timestamp.$gte = fromDate;
            }
            if (to) {
                const toDate = new Date(to);
                if (isNaN(toDate.getTime())) {
                    return res.status(400).json({ message: 'Invalid to date format' });
                }
                filter.timestamp.$lte = toDate;
            }
        }

        // Cap export to prevent memory issues
        const logs = await AuditLog.find(filter).sort({ timestamp: -1 }).limit(10000);

        if (format === 'json') {
            res.setHeader('Content-Type', 'application/json');
            res.setHeader('Content-Disposition', 'attachment; filename="audit-logs.json"');
            return res.status(200).json(
                logs.map((log) => ({
                    ...log.toObject(),
                    _id: log._id.toString(),
                }))
            );
        }

        const csvStringifier = createObjectCsvStringifier({
            header: [
                { id: 'timestamp', title: 'Timestamp' },
                { id: 'adminName', title: 'Admin' },
                { id: 'action', title: 'Action' },
                { id: 'details', title: 'Details' },
                { id: 'module', title: 'Module' },
                { id: 'severity', title: 'Severity' },
                { id: 'ipAddress', title: 'IP Address' },
            ],
        });

        const records = logs.map((l) => ({
            timestamp: l.timestamp ? new Date(l.timestamp).toISOString() : '',
            adminName: l.adminName || '',
            action: l.action || '',
            details: l.details || '',
            module: l.module || 'System',
            severity: l.severity || 'info',
            ipAddress: l.ipAddress || '',
        }));

        const csv = csvStringifier.getHeaderString() + csvStringifier.stringifyRecords(records);
        res.setHeader('Content-Type', 'text/csv');
        res.setHeader('Content-Disposition', 'attachment; filename="audit-logs.csv"');
        res.status(200).send(csv);
    } catch (error) {
        res.status(500).json({ message: 'Failed to export audit logs', error: error.message });
    }
};
