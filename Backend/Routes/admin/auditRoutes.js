// Audit log retrieval and export endpoints. Admin-only access required.
import express from 'express';
import { query } from 'express-validator';
import {
  getAuditLogs,
  exportAuditLogs,
} from '../../Controllers/admin/auditController.js';
import { verifyToken, requirePermission, handleValidationErrors } from '../../Middleware/authmiddleware.js';

const router = express.Router();

// Get audit logs (admin only)
router.get(
  '/',
  verifyToken,
  requirePermission('audit.view'),
  [
    query('limit').optional().isInt({ min: 1, max: 1000 }),
    handleValidationErrors,
  ],
  getAuditLogs,
);

// Export audit logs in CSV or JSON format (admin only)
router.get(
  '/export',
  verifyToken,
  requirePermission('audit.export'),
  [
    query('format').optional().isIn(['csv', 'json']),
    handleValidationErrors,
  ],
  exportAuditLogs,
);

export default router;