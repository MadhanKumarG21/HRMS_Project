// Backend/Routes/admin/authRoutes.js
// Authentication routes: login (public), me/logout/change-password (protected).
import express from 'express';
import { body } from 'express-validator';
import {
  loginUser,
  getMe,
  logoutUser,
  changePassword,
} from '../Controllers/authController.js';
import { verifyToken, handleValidationErrors } from '../Middleware/authmiddleware.js';

const router = express.Router();

// Public route — no token required
router.post(
  '/login',
  [
    body('email').isEmail().normalizeEmail().withMessage('Valid email is required'),
    body('password').isLength({ min: 1 }).withMessage('Password is required'),
    handleValidationErrors,
  ],
  loginUser,
);

// Protected routes — valid authentication token required
router.get('/me', verifyToken, getMe);
router.post('/logout', verifyToken, logoutUser);
router.post(
  '/change-password',
  verifyToken,
  [
    body('currentPassword')
      .isLength({ min: 1 })
      .withMessage('Current password is required'),
    body('newPassword')
      .isLength({ min: 8 })
      .withMessage('New password must be at least 8 characters'),
    body('newPassword')
      .custom((value, { req }) => {
        if (value === req.body.currentPassword) {
          throw new Error('New password must be different from current password');
        }
        return true;
      })
      .withMessage('New password must be different from current password'),
    handleValidationErrors,
  ],
  changePassword,
);

export default router;