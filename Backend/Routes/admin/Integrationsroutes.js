// Backend/Routes/admin/Integrationsroutes.js
// Integration status endpoints. Admin-only access required.
import express from 'express';
import { getIntegrationsStatus } from '../../Controllers/admin/Integrationscontroller.js';
import { verifyToken, requireAdmin } from '../../Middleware/authmiddleware.js';

const router = express.Router();

// Get integration connectivity status (admin only)
router.get('/status', verifyToken, requireAdmin, getIntegrationsStatus);

export default router;