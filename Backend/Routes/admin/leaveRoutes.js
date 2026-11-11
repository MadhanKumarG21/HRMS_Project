// Backend/Routes/admin/leaveRoutes.js
// Leave request CRUD and statistics endpoints.
// Employees can create/view their own leaves; admin can manage all.
import express from 'express';
import { body, param, query } from 'express-validator';
import {
  getAllLeaves,
  getLeaveById,
  createLeave,
  updateLeaveStatus,
  getLeaveStats,
  getLeaveByUserId,
  processExpiredLeaves,
} from '../../Controllers/admin/leaveController.js';
import { verifyToken, requirePermission, requireLeaveDecisionPermission, requireAdmin, requireActiveModule, handleValidationErrors } from '../../Middleware/authmiddleware.js';

const router = express.Router();
router.use(requireActiveModule('leave_management'));

// Get all leave requests (authenticated users can view)
router.get(
  '/',
  verifyToken,
  [
    query('status')
      .optional()
      .isIn(['Pending', 'Approved', 'Rejected', 'Cancelled']),
    query('type')
      .optional()
      .isIn(['Annual', 'Sick', 'Casual', 'Maternity', 'Paternity', 'Unpaid', 'Other']),
    query('userId').optional().isMongoId().withMessage('Invalid user ID'),
    query('from').optional().isISO8601().withMessage('Invalid from date'),
    query('to').optional().isISO8601().withMessage('Invalid to date'),
    handleValidationErrors,
  ],
  getAllLeaves,
);

// Get leave statistics (admin only)
router.get('/stats', verifyToken, requirePermission('leave.view'), getLeaveStats);

// Manually trigger the expired-leave auto-reject sweep (admin only)
router.post('/process-expired', verifyToken, requireAdmin, processExpiredLeaves);

// Get leave requests for a specific user
router.get(
  '/user/:userId',
  verifyToken,
  [
    param('userId').isMongoId().withMessage('Invalid user ID'),
    handleValidationErrors,
  ],
  getLeaveByUserId,
);

// Get a single leave request by ID
router.get(
  '/:id',
  verifyToken,
  [
    param('id').isMongoId().withMessage('Invalid leave ID'),
    handleValidationErrors,
  ],
  getLeaveById,
);

// Create a new leave request (any authenticated user)
router.post(
  '/',
  verifyToken,
  requirePermission('leave.create'),
  [
    body('userId').isMongoId().withMessage('Invalid user ID'),
    body('type')
      .isIn(['Annual', 'Sick', 'Casual', 'Maternity', 'Paternity', 'Unpaid', 'Other'])
      .withMessage('Invalid leave type'),
    body('fromDate').isISO8601().withMessage('Invalid from date'),
    body('toDate').isISO8601().withMessage('Invalid to date'),
    body('reason').isLength({ min: 1 }).withMessage('Reason is required'),
    handleValidationErrors,
  ],
  createLeave,
);

// Update leave status — approve/reject (admin only)
router.patch(
  '/:id/status',
  verifyToken,
  requireLeaveDecisionPermission,
  [
    param('id').isMongoId().withMessage('Invalid leave ID'),
    body('status')
      .isIn(['Pending', 'Approved', 'Rejected', 'Cancelled'])
      .withMessage('Invalid status'),
    handleValidationErrors,
  ],
  updateLeaveStatus,
);

export default router;