// Backend/Routes/admin/reportsRoutes.js
// Report generation and type listing endpoints. Admin-only access required.
import express from 'express';
import { query } from 'express-validator';
import {
  generateEmployeeReport,
  generateAttendanceReport,
  generateLeaveReport,
  generatePayrollReport,
  getReportTypes,
} from '../../Controllers/admin/reportsController.js';
import { verifyToken, requirePermission, requireActiveModule, handleValidationErrors } from '../../Middleware/authmiddleware.js';

const router = express.Router();
router.use(requireActiveModule('reports'));

// Get available report types (admin only)
router.get(
  '/types',
  verifyToken,
  requirePermission('reports.view'),
  getReportTypes,
);

// Employee Report (admin only)
router.get(
  '/employee',
  verifyToken,
  requirePermission('reports.export'),
  [
    query('department').optional().isString(),
    query('status').optional().isString(),
    handleValidationErrors,
  ],
  generateEmployeeReport,
);

// Attendance Report (admin only)
// `from` and `to` are optional here; the controller validates their presence.
router.get(
  '/attendance',
  verifyToken,
  requirePermission('reports.export'),
  [
    query('from').optional().isISO8601().withMessage('Invalid from date'),
    query('to').optional().isISO8601().withMessage('Invalid to date'),
    query('department').optional().isString(),
    handleValidationErrors,
  ],
  generateAttendanceReport,
);

// Leave Report (admin only)
// `from` and `to` are optional here; the controller validates their presence.
router.get(
  '/leave',
  verifyToken,
  requirePermission('reports.export'),
  [
    query('from').optional().isISO8601().withMessage('Invalid from date'),
    query('to').optional().isISO8601().withMessage('Invalid to date'),
    query('type').optional().isString(),
    query('status').optional().isString(),
    handleValidationErrors,
  ],
  generateLeaveReport,
);

// Payroll Report (admin only)
router.get(
  '/payroll',
  verifyToken,
  requirePermission('reports.export'),
  [
    query('month').isString().withMessage('Month is required'),
    query('year').isInt().withMessage('Year is required'),
    handleValidationErrors,
  ],
  generatePayrollReport,
);

export default router;