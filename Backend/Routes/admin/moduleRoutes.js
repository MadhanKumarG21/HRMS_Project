// Backend/Routes/admin/moduleRoutes.js
// Module management endpoints (CRUD, toggle, reorder). Admin-only for mutations.
import express from 'express';
import { body, param } from 'express-validator';
import {
  getAllModules,
  getModuleById,
  createModule,
  toggleModuleStatus,
  deleteModule,
  getModuleStats,
  updateModuleOrder,
} from '../../Controllers/admin/moduleController.js';
import { verifyToken, requireAdmin, handleValidationErrors } from '../../Middleware/authmiddleware.js';

const router = express.Router();

// Get all modules (authenticated users can view)
router.get('/', verifyToken, getAllModules);

// Get module statistics (admin only)
router.get('/stats', verifyToken, requireAdmin, getModuleStats);

// Get a single module by ID
router.get(
  '/:id',
  verifyToken,
  [
    param('id').isMongoId().withMessage('Invalid module ID'),
    handleValidationErrors,
  ],
  getModuleById,
);

// Create a new module (admin only)
router.post(
  '/',
  verifyToken,
  requireAdmin,
  [
    body('name').trim().isLength({ min: 2 }).withMessage('Module name is required'),
    body('label').trim().isLength({ min: 2 }).withMessage('Module label is required'),
    handleValidationErrors,
  ],
  createModule,
);

// Toggle module active/inactive status (admin only)
router.patch(
  '/:id/toggle',
  verifyToken,
  requireAdmin,
  [
    param('id').isMongoId().withMessage('Invalid module ID'),
    handleValidationErrors,
  ],
  toggleModuleStatus,
);

// Delete a module (admin only)
router.delete(
  '/:id',
  verifyToken,
  requireAdmin,
  [
    param('id').isMongoId().withMessage('Invalid module ID'),
    handleValidationErrors,
  ],
  deleteModule,
);

// Update module display order (admin only)
router.put(
  '/order',
  verifyToken,
  requireAdmin,
  [
    body('modules').isArray().withMessage('Modules array is required'),
    handleValidationErrors,
  ],
  updateModuleOrder,
);

export default router;