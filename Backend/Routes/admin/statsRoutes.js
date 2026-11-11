// Backend/Routes/admin/statsRoutes.js
// Dashboard statistics endpoint. Admin-only access required.
import express from 'express';
import { getDashboardStats } from '../../Controllers/admin/statsController.js';
import { verifyToken, requireAdmin } from '../../Middleware/authmiddleware.js';

const router = express.Router();

// Get dashboard statistics (admin only)
router.get('/', verifyToken, requireAdmin, getDashboardStats);

export default router;