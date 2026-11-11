// Backend/Routes/admin/userRoutes.js
// User management endpoints (CRUD, password policy).
// NOTE: This module is currently unused (dead code). Its routes are
// already defined in Routes/index.js. Keeping this file for
// reference but it should be removed or integrated if needed.
import express from 'express';
import { body, query, param } from 'express-validator';
import {
  createUserAccount,
  getAllUsers,
  getUserById,
  updateUser,
  toggleUserStatus,
  deleteUser,
  getPasswordPolicy,
} from '../Controllers/admin/userController.js';
import { verifyToken, requireAdmin, handleValidationErrors } from '../Middleware/authmiddleware.js';

const router = express.Router();

// Get password policy (public — no auth required)
router.get('/password-policy', verifyToken, getPasswordPolicy);

// Get all users with optional filters (authenticated)
router.get(
  '/',
  verifyToken,
  [
    query('status').optional().isIn(['Active', 'Inactive']),
    query('sortBy').optional().isIn(['name', 'email', 'createdAt', 'status']),
    query('order').optional().isIn(['asc', 'desc']),
    handleValidationErrors,
  ],
  getAllUsers,
);

// Get a single user by ID
router.get(
  '/:id',
  verifyToken,
  [
    param('id').isMongoId().withMessage('Invalid user ID'),
    handleValidationErrors,
  ],
  getUserById,
);

// Create a new user account (admin only)
router.post(
  '/create',
  verifyToken,
  requireAdmin,
  [
    body('name')
      .trim()
      .isLength({ min: 2, max: 100 })
      .withMessage('Name must be 2-100 characters'),
    body('email')
      .isEmail()
      .normalizeEmail()
      .withMessage('Valid email is required'),
    body('password')
      .isLength({ min: 8 })
      .withMessage('Password must be at least 8 characters'),
    body('roleName')
      .trim()
      .isLength({ min: 1 })
      .withMessage('Role name is required'),
    body('department')
      .trim()
      .isLength({ min: 1, max: 100 })
      .withMessage('Department is required'),
    handleValidationErrors,
  ],
  createUserAccount,
);

// Update an existing user (admin only)
router.patch(
  '/:id',
  verifyToken,
  requireAdmin,
  [
    param('id').isMongoId().withMessage('Invalid user ID'),
    handleValidationErrors,
  ],
  updateUser,
);

// Toggle user active/inactive status (admin only)
router.patch(
  '/:id/toggle',
  verifyToken,
  requireAdmin,
  [
    param('id').isMongoId().withMessage('Invalid user ID'),
    handleValidationErrors,
  ],
  toggleUserStatus,
);

// Delete a user (admin only)
router.delete(
  '/:id',
  verifyToken,
  requireAdmin,
  [
    param('id').isMongoId().withMessage('Invalid user ID'),
    handleValidationErrors,
  ],
  deleteUser,
);

export default router;