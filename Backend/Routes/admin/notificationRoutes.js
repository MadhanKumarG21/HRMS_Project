// Backend/Routes/admin/notificationRoutes.js
import express from 'express';
import { param } from 'express-validator';
import {
  getAllNotifications,
  getUnreadCount,
  markAsRead,
  markAsUnread,
  markAllAsRead,
  createNotification,
  deleteNotification,
  deleteMultipleNotifications,
  clearReadNotifications,
} from '../../Controllers/admin/notificationController.js';
import { verifyToken, requireAdmin, handleValidationErrors } from '../../Middleware/authmiddleware.js';

const router = express.Router();

// Any authenticated user — not admin-only.
// Controller scopes visibility based on role (admins see broadcasts + their own; users see their own).
router.get('/', verifyToken, getAllNotifications);
router.get('/unread-count', verifyToken, getUnreadCount);

// Create new notification (admin-only broadcast or targeted alert)
router.post('/', verifyToken, requireAdmin, createNotification);

// Read / Unread actions
router.patch('/read-all', verifyToken, markAllAsRead);

router.patch(
  '/:id/read',
  verifyToken,
  param('id').isMongoId().withMessage('Invalid notification ID'),
  handleValidationErrors,
  markAsRead,
);

router.patch(
  '/:id/unread',
  verifyToken,
  param('id').isMongoId().withMessage('Invalid notification ID'),
  handleValidationErrors,
  markAsUnread,
);

// Delete actions — specific static endpoints come BEFORE param /:id
router.delete('/clear-read', verifyToken, clearReadNotifications);
router.post('/batch-delete', verifyToken, deleteMultipleNotifications);

router.delete(
  '/:id',
  verifyToken,
  param('id').isMongoId().withMessage('Invalid notification ID'),
  handleValidationErrors,
  deleteNotification,
);

export default router;