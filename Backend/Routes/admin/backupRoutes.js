// Backend/Routes/admin/backupRoutes.js
// Backup execution and settings endpoints. Admin-only access required.
import express from 'express';
import {
  runBackup,
  getBackupSettings,
  updateBackupSettings,
} from '../../Controllers/admin/backupController.js';
import { verifyToken, requireAdmin } from '../../Middleware/authmiddleware.js';

const router = express.Router();

// Trigger a manual backup (admin only)
router.post('/', verifyToken, requireAdmin, runBackup);

// View backup settings (admin only)
router.get('/settings', verifyToken, requireAdmin, getBackupSettings);

// Update backup settings (admin only)
router.put('/settings', verifyToken, requireAdmin, updateBackupSettings);

export default router;