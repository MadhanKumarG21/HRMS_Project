// Backend/Routes/admin/employeeRoutes.js
// Map legacy employee endpoints to the unified User/Employee controller actions.
import express from 'express';
import {
  getAllUsers,
  getUserById as getEmployeeById,
  getUserById as getEmployeeByUserId,
  createUserAccount as createEmployee,
  updateUser as updateEmployee,
  deleteUser as deleteEmployee,
  getEmployeeStats,
} from '../../Controllers/admin/userController.js';
import { verifyToken, requirePermission, handleValidationErrors } from '../../Middleware/authmiddleware.js';
import { param } from 'express-validator';

const router = express.Router();

const getAllEmployees = (req, res) =>
  getAllUsers(
    {
      ...req,
      query: { ...req.query, sortBy: 'employeeId', order: 'asc' },
    },
    res,
  );

// Get all employees
router.get('/', verifyToken, requirePermission('employees.view'), getAllEmployees);

// Get employee statistics (admin only)
router.get('/stats', verifyToken, requirePermission('employees.view'), getEmployeeStats);

// Get a single employee by ID
router.get(
  '/:id',
  verifyToken,
  requirePermission('employees.view'),
  [
    param('id').isMongoId().withMessage('Invalid employee ID'),
    handleValidationErrors,
  ],
  getEmployeeById,
);

// Get employee by associated user ID (aliased to getUserById since models are merged)
router.get(
  '/user/:userId',
  verifyToken,
  requirePermission('employees.view'),
  [
    param('userId').isMongoId().withMessage('Invalid user ID'),
    handleValidationErrors,
  ],
  getEmployeeByUserId,
);

// Create a new employee record (admin only)
router.post('/', verifyToken, requirePermission('employees.create'), createEmployee);

// Update an existing employee record (admin only)
router.put(
  '/:id',
  verifyToken,
  requirePermission('employees.update'),
  [
    param('id').isMongoId().withMessage('Invalid employee ID'),
    handleValidationErrors,
  ],
  updateEmployee,
);

// Delete an employee record (admin only)
router.delete(
  '/:id',
  verifyToken,
  requirePermission('employees.delete'),
  [
    param('id').isMongoId().withMessage('Invalid employee ID'),
    handleValidationErrors,
  ],
  deleteEmployee,
);

export default router;