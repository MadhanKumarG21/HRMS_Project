// Backend/Controllers/admin/reportsController.js
// Generates various HR reports: employee, attendance, leave, and payroll.
import mongoose from 'mongoose';
import User from '../../Models/User.js';
import Leave from '../../Models/Leave.js';
import Attendance from '../../Models/Attendance.js';
import {
    getAttendanceTimeContext,
    isValidAttendanceDate,
} from '../../utils/attendanceHelpers.js';
import AuditLog from '../../Models/AuditLog.js';

const isValidObjectId = (id) => mongoose.Types.ObjectId.isValid(id);

// ─── Get Report Types ──────────────────────────────────────────────────────
export const getReportTypes = async (req, res) => {
    try {
        const types = [
            { id: 'employee', label: 'Employee Report', description: 'List of all employees with details' },
            { id: 'attendance', label: 'Attendance Report', description: 'Daily check-in and working hours logs' },
            { id: 'leave', label: 'Leave Report', description: 'Leave balances, approvals, and history' },
            { id: 'payroll', label: 'Payroll Summary', description: 'Estimated salaries, allowances, and deductions' },
        ];
        res.status(200).json(types);
    } catch (error) {
        console.error('[Reports] Get types error:', error);
        res.status(500).json({ message: 'Failed to fetch report types', error: error.message });
    }
};

// ─── Generate Employee Report ──────────────────────────────────────────────
export const generateEmployeeReport = async (req, res) => {
    try {
        const { department, status, page = 1, limit = 100 } = req.query;
        const filter = {};
        const skip = (parseInt(page) - 1) * parseInt(limit);

        if (department) filter.department = department;
        if (status) filter.status = status;

        const [employees, total] = await Promise.all([
            User.find(filter)
                .sort({ employeeId: 1 })
                .skip(skip)
                .limit(parseInt(limit)),
            User.countDocuments(filter),
        ]);

        const summary = {
            total,
            active: employees.filter((e) => e.status === 'Active').length,
            inactive: employees.filter((e) => e.status === 'Inactive').length,
            onLeave: employees.filter((e) => e.status === 'On Leave').length,
            terminated: employees.filter((e) => e.status === 'Terminated').length,
            departments: {},
        };

        employees.forEach((e) => {
            summary.departments[e.department] = (summary.departments[e.department] || 0) + 1;
        });

        res.status(200).json({
            type: 'employee',
            generatedAt: new Date(),
            summary,
            data: employees,
            pagination: { total, page: parseInt(page), totalPages: Math.ceil(total / parseInt(limit)) },
        });
    } catch (error) {
        console.error('[Reports] Employee report error:', error);
        res.status(500).json({ message: 'Failed to generate employee report', error: error.message });
    }
};

// ─── Generate Attendance Report ────────────────────────────────────────────
export const generateAttendanceReport = async (req, res) => {
    try {
        const { from, to, department, page = 1, limit = 100 } = req.query;

        if (!from || !to) {
            return res.status(400).json({ message: 'From and to dates are required' });
        }

        if (!isValidAttendanceDate(from) || !isValidAttendanceDate(to)) {
            return res.status(400).json({ message: 'Invalid date format' });
        }
        const [{ today: fromDate }, { tomorrow: toDate }] = await Promise.all([
            getAttendanceTimeContext(from),
            getAttendanceTimeContext(to),
        ]);

        // Get users in department if specified
        let userIds = [];
        if (department) {
            const employees = await User.find({ department }).select('_id');
            userIds = employees.map((e) => e._id);
        } else {
            const users = await User.find({}).select('_id');
            userIds = users.map((u) => u._id);
        }

        const skip = (parseInt(page) - 1) * parseInt(limit);

        const [attendance, total] = await Promise.all([
            Attendance.find({
                userId: { $in: userIds },
                date: { $gte: fromDate, $lt: toDate },
            })
                .populate('userId', 'name email')
                .sort({ date: -1 })
                .skip(skip)
                .limit(parseInt(limit)),
            Attendance.countDocuments({
                userId: { $in: userIds },
                date: { $gte: fromDate, $lt: toDate },
            }),
        ]);

        const summary = {
            totalLogs: total,
            present: attendance.filter((a) => ['Present', 'Late'].includes(a.status)).length,
            late: attendance.filter((a) => a.isLate || a.status === 'Late').length,
            absent: attendance.filter((a) => a.status === 'Absent').length,
        };

        res.status(200).json({
            type: 'attendance',
            generatedAt: new Date(),
            summary,
            data: attendance,
            pagination: { total, page: parseInt(page), totalPages: Math.ceil(total / parseInt(limit)) },
        });
    } catch (error) {
        console.error('[Reports] Attendance report error:', error);
        res.status(500).json({ message: 'Failed to generate attendance report', error: error.message });
    }
};

// ─── Generate Leave Report ─────────────────────────────────────────────────
export const generateLeaveReport = async (req, res) => {
    try {
        const { department, status, page = 1, limit = 100 } = req.query;

        // Get users in department if specified
        let userIds = [];
        if (department) {
            const employees = await User.find({ department }).select('_id');
            userIds = employees.map((e) => e._id);
        } else {
            const users = await User.find({}).select('_id');
            userIds = users.map((u) => u._id);
        }

        const leaveFilter = {
            userId: { $in: userIds },
            ...(status && { status }),
        };

        const skip = (parseInt(page) - 1) * parseInt(limit);

        const [leaves, total] = await Promise.all([
            Leave.find(leaveFilter)
                .populate('userId', 'name email department')
                .sort({ createdAt: -1 })
                .skip(skip)
                .limit(parseInt(limit)),
            Leave.countDocuments(leaveFilter),
        ]);

        const summary = {
            totalApplications: total,
            approved: leaves.filter((l) => l.status === 'Approved').length,
            pending: leaves.filter((l) => l.status === 'Pending').length,
            rejected: leaves.filter((l) => l.status === 'Rejected').length,
        };

        res.status(200).json({
            type: 'leave',
            generatedAt: new Date(),
            summary,
            data: leaves,
            pagination: { total, page: parseInt(page), totalPages: Math.ceil(total / parseInt(limit)) },
        });
    } catch (error) {
        console.error('[Reports] Leave report error:', error);
        res.status(500).json({ message: 'Failed to generate leave report', error: error.message });
    }
};

// ─── Generate Payroll Report ───────────────────────────────────────────────
export const generatePayrollReport = async (req, res) => {
    try {
        const { month, year } = req.query;

        if (!month || !year) {
            return res.status(400).json({ message: 'Month and year are required' });
        }

        const employees = await User.find({ status: 'Active' });

        if (employees.length === 0) {
            return res.status(200).json({
                type: 'payroll',
                generatedAt: new Date(),
                month,
                year,
                summary: { totalEmployees: 0, totalSalary: 0, totalAllowances: 0, totalDeductions: 0, averageSalary: 0 },
                data: [],
                note: 'No active employee data configured.',
            });
        }

        // Placeholder payroll calculation
        const payrollData = employees.map((emp) => {
            const basicSalary = 50000;
            const allowances = 15000;
            const deductions = 8000;
            const netSalary = basicSalary + allowances - deductions;

            return {
                employeeId: emp.employeeId,
                name: emp.name || 'Unknown',
                department: emp.department,
                designation: emp.designation,
                basicSalary,
                allowances,
                deductions,
                netSalary,
                status: 'Pending',
            };
        });

        const summary = {
            totalEmployees: payrollData.length,
            totalSalary: payrollData.reduce((sum, p) => sum + p.netSalary, 0),
            totalAllowances: payrollData.reduce((sum, p) => sum + p.allowances, 0),
            totalDeductions: payrollData.reduce((sum, p) => sum + p.deductions, 0),
            averageSalary:
                payrollData.length > 0
                    ? Math.round(payrollData.reduce((sum, p) => sum + p.netSalary, 0) / payrollData.length)
                    : 0,
        };

        res.status(200).json({
            type: 'payroll',
            generatedAt: new Date(),
            month,
            year,
            summary,
            data: payrollData,
            note: 'Placeholder data. Integrate actual payroll service for production use.',
        });
    } catch (error) {
        console.error('[Reports] Payroll report error:', error);
        res.status(500).json({ message: 'Failed to generate payroll report', error: error.message });
    }
};
