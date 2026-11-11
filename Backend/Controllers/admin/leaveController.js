// Backend/Controllers/admin/leaveController.js
// Manages leave requests: creation, approval/rejection, stats, and retrieval.
import mongoose from 'mongoose';
import Leave from '../../Models/Leave.js';
import User from '../../Models/User.js';
import AuditLog from '../../Models/AuditLog.js';
import { autoRejectExpiredLeaves } from '../../Services/leaveAutoReject.js';
import { notifyAdmins } from '../../Services/notify.js';

const isValidObjectId = (id) => mongoose.Types.ObjectId.isValid(id);

const isAdminUser = (req) => {
    const role = typeof req.user?.role === 'object' ? req.user.role?.name : req.user?.role;
    return role?.toLowerCase() === 'admin';
};

// ─── Get All Leaves ────────────────────────────────────────────────────────
// Supports filtering by status, type, and date range with pagination.
export const getAllLeaves = async (req, res) => {
    try {
        const { status, type, from, to, page = 1, limit = 50 } = req.query;
        const filter = {};
        const skip = (parseInt(page) - 1) * parseInt(limit);

        // A regular employee can only ever see their own leave requests —
        // without this, GET /leaves (open to any authenticated user, not
        // just admins) returns every employee's leave reasons and dates to
        // whoever asks. This was harmless only while login itself was
        // Admin-only; now that any Active account can log in, it's a real
        // privacy leak. Admins still see everyone, or filter by any userId.
        const isAdmin = isAdminUser(req);
        if (!isAdmin) {
            filter.userId = req.user._id;
        } else if (req.query.userId) {
            filter.userId = req.query.userId;
        }

        if (status) filter.status = status;
        if (type) filter.type = type;
        if (from) filter.fromDate = { $gte: new Date(from) };
        if (to) filter.toDate = { $lte: new Date(to) };

        const [leaves, total] = await Promise.all([
            Leave.find(filter)
                .populate('userId', 'name email department')
                .populate('approvedBy', 'name')
                .sort({ createdAt: -1 })
                .skip(skip)
                .limit(parseInt(limit)),
            Leave.countDocuments(filter),
        ]);

        res.status(200).json({
            data: leaves,
            total,
            page: parseInt(page),
            totalPages: Math.ceil(total / parseInt(limit)),
        });
    } catch (error) {
        console.error('[Leave] Get all error:', error);
        res.status(500).json({ message: 'Failed to fetch leaves', error: error.message });
    }
};

// ─── Get Leave by ID ───────────────────────────────────────────────────────
export const getLeaveById = async (req, res) => {
    try {
        const { id } = req.params;

        if (!isValidObjectId(id)) {
            return res.status(400).json({ message: 'Invalid leave ID format' });
        }

        const leave = await Leave.findById(id)
            .populate('userId', 'name email department')
            .populate('approvedBy', 'name');

        if (!leave) {
            return res.status(404).json({ message: 'Leave not found' });
        }

        if (!isAdminUser(req) && String(leave.userId?._id || leave.userId) !== String(req.user._id)) {
            return res.status(403).json({ message: 'Access denied: you can only view your own leave requests' });
        }

        res.status(200).json(leave);
    } catch (error) {
        console.error('[Leave] Get by ID error:', error);
        res.status(500).json({ message: 'Failed to fetch leave', error: error.message });
    }
};

// ─── Get Leave by User ID ──────────────────────────────────────────────────
export const getLeaveByUserId = async (req, res) => {
    try {
        const { userId } = req.params;

        if (!isValidObjectId(userId)) {
            return res.status(400).json({ message: 'Invalid user ID format' });
        }

        const requestedUserId = isAdminUser(req) ? userId : req.user._id;
        const leaves = await Leave.find({ userId: requestedUserId })
            .populate('userId', 'name email department')
            .populate('approvedBy', 'name')
            .sort({ createdAt: -1 });

        res.status(200).json(leaves);
    } catch (error) {
        console.error('[Leave] Get by user ID error:', error);
        res.status(500).json({ message: 'Failed to fetch leaves', error: error.message });
    }
};

// ─── Create Leave ──────────────────────────────────────────────────────────
// Validates date range and checks for overlapping pending/approved leaves.
export const createLeave = async (req, res) => {
    try {
        const { userId, type, fromDate, toDate, reason } = req.body;

        if (!userId || !type || !fromDate || !toDate || !reason) {
            return res.status(400).json({
                message: 'User ID, type, from date, to date, and reason are required',
            });
        }

        if (!isValidObjectId(userId)) {
            return res.status(400).json({ message: 'Invalid user ID format' });
        }

        const from = new Date(fromDate);
        const to = new Date(toDate);

        if (isNaN(from.getTime()) || isNaN(to.getTime())) {
            return res.status(400).json({ message: 'Invalid date format' });
        }

        if (from > to) {
            return res.status(400).json({ message: 'From date must be before to date' });
        }

        // Employees may only create leave for themselves. Admins may create
        // a request on behalf of another employee.
        const targetUserId = isAdminUser(req) ? userId : req.user._id;

        const user = await User.findById(targetUserId);
        if (!user) {
            return res.status(404).json({ message: 'User not found' });
        }

        // Check for overlapping approved/pending leaves
        const overlapping = await Leave.findOne({
            userId: targetUserId,
            status: { $in: ['Pending', 'Approved'] },
            $or: [
                { fromDate: { $lte: to }, toDate: { $gte: from } },
            ],
        });

        if (overlapping) {
            return res.status(400).json({
                message: 'Leave request overlaps with an existing approved or pending leave',
            });
        }

        const leave = await Leave.create({
            userId: targetUserId,
            type,
            fromDate: from,
            toDate: to,
            reason,
            status: 'Pending',
        });

        await AuditLog.create({
            adminId: req.user?._id,
            adminName: req.user?.name || 'System',
            action: 'LEAVE_CREATED',
            details: `Leave request created for ${user.name} (${type})`,
            module: 'Leave Management',
            severity: 'info',
            ipAddress: req.headers['x-forwarded-for'] || req.socket?.remoteAddress || req.ip,
        });

        await notifyAdmins({
            title: 'New Leave Request',
            message: `${user.name} submitted a ${type} leave request awaiting approval`,
            type: 'info',
            link: '/leave',
        });

        res.status(201).json({
            message: 'Leave request created successfully',
            leave,
        });
    } catch (error) {
        console.error('[Leave] Create error:', error);
        res.status(500).json({ message: 'Failed to create leave', error: error.message });
    }
};

// ─── Update Leave Status ───────────────────────────────────────────────────
// Requires rejectionReason when rejecting a leave.
export const updateLeaveStatus = async (req, res) => {
    try {
        const { id } = req.params;
        const { status, rejectionReason } = req.body;

        if (!isValidObjectId(id)) {
            return res.status(400).json({ message: 'Invalid leave ID format' });
        }

        if (!status) {
            return res.status(400).json({ message: 'Status is required' });
        }

        const validStatuses = ['Pending', 'Approved', 'Rejected', 'Cancelled'];
        if (!validStatuses.includes(status)) {
            return res.status(400).json({ message: 'Invalid status value' });
        }

        const leave = await Leave.findById(id);
        if (!leave) {
            return res.status(404).json({ message: 'Leave not found' });
        }

        // Rejection requires a reason
        if (status === 'Rejected' && !rejectionReason) {
            return res.status(400).json({ message: 'Rejection reason is required' });
        }

        leave.status = status;
        if (status === 'Approved') {
            leave.approvedBy = req.user._id;
            leave.approvedAt = new Date();
        }
        if (status === 'Rejected') {
            leave.rejectionReason = rejectionReason;
        }
        await leave.save();

        // Fetch user name for audit details
        const approverName = req.user?.name || 'System';
        await AuditLog.create({
            adminId: req.user._id,
            adminName: approverName,
            action: 'LEAVE_UPDATED',
            details: `Leave ${status.toLowerCase()} by ${approverName}`,
            module: 'Leave Management',
            severity: 'info',
            ipAddress: req.headers['x-forwarded-for'] || req.socket?.remoteAddress || req.ip,
        });

        res.status(200).json({
            message: `Leave ${status.toLowerCase()} successfully`,
            leave,
        });
    } catch (error) {
        console.error('[Leave] Update status error:', error);
        res.status(500).json({ message: 'Failed to update leave', error: error.message });
    }
};

// ─── Manually Trigger Expired-Leave Sweep ───────────────────────────────────
// The background scheduler already does this every 15 minutes; this endpoint
// lets an admin force an immediate run (useful right after changing the
// window, or to confirm the feature is wired up correctly).
export const processExpiredLeaves = async (req, res) => {
    try {
        const result = await autoRejectExpiredLeaves();
        res.status(200).json({
            message: `Processed ${result.processed} expired leave request(s)`,
            ...result,
        });
    } catch (error) {
        console.error('[Leave] Process expired error:', error);
        res.status(500).json({ message: 'Failed to process expired leaves', error: error.message });
    }
};

// ─── Get Leave Stats ───────────────────────────────────────────────────────
// Returns status counts using a single aggregation.
export const getLeaveStats = async (req, res) => {
    try {
        const stats = await Leave.aggregate([
            {
                $group: {
                    _id: '$status',
                    count: { $sum: 1 },
                },
            },
        ]);

        const result = {
            pending: 0,
            approved: 0,
            rejected: 0,
            cancelled: 0,
        };

        stats.forEach((item) => {
            const key = item._id?.toLowerCase();
            if (key && result.hasOwnProperty(key)) {
                result[key] = item.count;
            }
        });

        res.status(200).json(result);
    } catch (error) {
        console.error('[Leave] Stats error:', error);
        res.status(500).json({ message: 'Failed to fetch leave stats', error: error.message });
    }
};