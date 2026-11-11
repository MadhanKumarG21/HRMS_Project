// Backend/Routes/admin/settingsRoutes.js
// System settings endpoints: company, backup, and security policy.
// All mutation operations use PATCH per REST conventions.
import express from 'express';
import { body } from 'express-validator';
import {
  getAllSettings,
  saveAllSettings,
  getCompanySettings,
  updateCompanySettings,
  getBackupSettings,
  updateBackupSettings,
  runManualBackup,
  restoreFromBackup,
  getBackupHistory,
} from '../../Controllers/admin/settingsController.js';
import { verifyToken, requireAdmin, handleValidationErrors } from '../../Middleware/authmiddleware.js';

const router = express.Router();

// Get all settings (admin only)
router.get('/', verifyToken, requireAdmin, getAllSettings);

// Save all settings at once (admin only)
router.post('/', verifyToken, requireAdmin, saveAllSettings);

// ─── Company Settings ────────────────────────────────────────
router.get('/company', verifyToken, requireAdmin, getCompanySettings);
router.patch(
  '/company',
  verifyToken,
  requireAdmin,
  [
    body('companyName').optional().isString(),
    body('companyEmail').optional().isEmail(),
    handleValidationErrors,
  ],
  updateCompanySettings,
);

// ─── Backup Settings ─────────────────────────────────────────
router.get('/backup', verifyToken, requireAdmin, getBackupSettings);
router.patch('/backup', verifyToken, requireAdmin, updateBackupSettings);

// Backup history
router.get('/backup/history', verifyToken, requireAdmin, getBackupHistory);

// Manual backup trigger (action endpoint — POST is appropriate)
router.post('/backup/run', verifyToken, requireAdmin, runManualBackup);

// Restore from backup (action endpoint — POST is appropriate)
router.post(
  '/backup/restore',
  verifyToken,
  requireAdmin,
  [
    body('backupFile').isString().withMessage('Backup file is required'),
    handleValidationErrors,
  ],
  restoreFromBackup,
);

export default router;