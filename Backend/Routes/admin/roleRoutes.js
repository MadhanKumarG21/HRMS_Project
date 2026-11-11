// Backend/Routes/admin/roleRoutes.js
// Role management endpoints (CRUD). Admin-only for mutations.
import express from 'express';
import { body, param } from 'express-validator';
import {
  getAllRoles,
  getRoleById,
  createRole,
  updateRole,
  deleteRole,
} from '../../Controllers/roleController.js';
import { verifyToken, requireAdmin, handleValidationErrors } from '../../Middleware/authmiddleware.js';

const router = express.Router();

// Get all roles (authenticated users can view)
router.get('/', verifyToken, getAllRoles);

// Get a single role by ID
router.get(
  '/:id',
  verifyToken,
  [
    param('id').isMongoId().withMessage('Invalid role ID'),
    handleValidationErrors,
  ],
  getRoleById,
);

// Create a new role (admin only)
router.post(
  '/',
  verifyToken,
  requireAdmin,
  [
    body('name')
      .trim()
      .isLength({ min: 2, max: 50 })
      .withMessage('Role name must be 2-50 characters'),
    body('description').optional().trim().isLength({ max: 500 }),
    body('permissions').optional().isArray(),
    handleValidationErrors,
  ],
  createRole,
);

// Update an existing role (admin only)
router.patch(
  '/:id',
  verifyToken,
  requireAdmin,
  [
    param('id').isMongoId().withMessage('Invalid role ID'),
    handleValidationErrors,
  ],
  updateRole,
);

// Delete a role (admin only)
router.delete(
  '/:id',
  verifyToken,
  requireAdmin,
  [
    param('id').isMongoId().withMessage('Invalid role ID'),
    handleValidationErrors,
  ],
  deleteRole,
);

export default router;