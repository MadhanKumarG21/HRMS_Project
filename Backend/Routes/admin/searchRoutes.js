// Backend/Routes/admin/searchRoutes.js
// Global search endpoint. Authenticated users can search.
import express from 'express';
import { query } from 'express-validator';
import { globalSearch } from '../../Controllers/admin/searchController.js';
import { verifyToken, handleValidationErrors } from '../../Middleware/authmiddleware.js';

const router = express.Router();

// Global search across users, logs, and modules
router.get(
  '/',
  verifyToken,
  [
    query('q')
      .trim()
      .isLength({ min: 2 })
      .withMessage('Search query must be at least 2 characters'),
    query('type').optional().isIn(['users', 'logs', 'modules']),
    handleValidationErrors,
  ],
  globalSearch,
);

export default router;