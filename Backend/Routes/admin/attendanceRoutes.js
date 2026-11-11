// Backend/Routes/admin/attendanceRoutes.js
// Attendance record CRUD, statistics, and self-service check-in/check-out.
import express from 'express';
import { body, param, query } from 'express-validator';
import {
  getAllAttendance,
  getAttendanceById,
  createAttendance,
  updateAttendance,
  deleteAttendance,
  getAttendanceStats,
  getAttendanceByUserId,
  getAttendanceByDate,
  getMyTodayAttendance,
  getMyHistory,
  checkIn,
  checkOut,
  continueWork,
  processMissedCheckouts,
} from '../../Controllers/admin/attendanceController.js';
import { verifyToken, requirePermission, requireAdmin, handleValidationErrors } from '../../Middleware/authmiddleware.js';

const router = express.Router();

// ─── Self-Service Check-In / Check-Out ──────────────────────────────────────
// No special permission required beyond being logged in — these endpoints
// only ever read/write the requester's OWN attendance record (req.user._id),
// so any authenticated user can use them regardless of role/permissions.

// Get my own attendance record for today (or null if not checked in yet)
router.get('/me/today', verifyToken, getMyTodayAttendance);

// Get my own recent attendance history — was implemented in the controller
// but never actually wired to a route until now.
router.get('/me/history', verifyToken, getMyHistory);

// Check in now
router.post('/check-in', verifyToken, checkIn);

// Check out now
router.post(
  '/check-out',
  verifyToken,
  [body('checkOutAt').optional().isISO8601().withMessage('Invalid check-out time'), handleValidationErrors],
  checkOut,
);

router.post("/continue-work", verifyToken, continueWork);

// ─── Admin / Reporting Routes ───────────────────────────────────────────────

// Get all attendance records (authenticated users can view)
router.get(
  '/',
  verifyToken,
  requirePermission('attendance.view'),
  [
    query('date').optional().isISO8601().withMessage('Invalid date format'),
    query('userId').optional().isMongoId().withMessage('Invalid user ID'),
    query('status')
      .optional()
      .isIn(['Present', 'Absent', 'Late', 'Half Day', 'Holiday', 'Leave']),
    handleValidationErrors,
  ],
  getAllAttendance,
);

// Get attendance statistics
router.get('/stats', verifyToken, requirePermission('attendance.view'), getAttendanceStats);

// Manually trigger the missed-checkout reminder/auto-checkout sweep (admin only)
router.post('/process-missed-checkouts', verifyToken, requireAdmin, processMissedCheckouts);

// Get attendance records for a specific user
router.get(
  '/user/:userId',
  verifyToken,
  requirePermission('attendance.view'),
  [
    param('userId').isMongoId().withMessage('Invalid user ID'),
    handleValidationErrors,
  ],
  getAttendanceByUserId,
);

// Get attendance records for a specific date
router.get(
  '/date/:date',
  verifyToken,
  requirePermission('attendance.view'),
  [
    param('date').isISO8601().withMessage('Invalid date format'),
    handleValidationErrors,
  ],
  getAttendanceByDate,
);

// Get a single attendance record by ID
router.get(
  '/:id',
  verifyToken,
  requirePermission('attendance.view'),
  [
    param('id').isMongoId().withMessage('Invalid attendance ID'),
    handleValidationErrors,
  ],
  getAttendanceById,
);

// Create a new attendance record (admin-driven manual entry)
router.post(
  '/',
  verifyToken,
  requirePermission('attendance.mark'),
  [
    body('userId').isMongoId().withMessage('Invalid user ID'),
    body('date').isISO8601().withMessage('Invalid date'),
    body('checkIn').optional().isString(),
    body('checkOut').optional().isString(),
    body('status')
      .isIn(['Present', 'Absent', 'Late', 'Half Day', 'Holiday', 'Leave'])
      .withMessage('Invalid status'),
    handleValidationErrors,
  ],
  createAttendance,
);

// Update an existing attendance record
router.put(
  '/:id',
  verifyToken,
  requirePermission('attendance.update'),
  [
    param('id').isMongoId().withMessage('Invalid attendance ID'),
    handleValidationErrors,
  ],
  updateAttendance,
);

router.delete(
  '/:id',
  verifyToken,
  requirePermission('attendance.delete'),
  [
    param('id').isMongoId().withMessage('Invalid attendance ID'),
    handleValidationErrors,
  ],
  deleteAttendance,
);

export default router;