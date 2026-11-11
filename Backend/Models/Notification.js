// Backend/Models/Notification.js
// Notifications can be admin-only alerts, employee announcements, or
// personal notifications addressed to one user.
import mongoose from 'mongoose';

const NotificationSchema = new mongoose.Schema(
  {
    recipientId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
    audience: {
      type: String,
      enum: ['admins', 'employees'],
      default: 'admins',
    },
    title: { type: String, required: true, trim: true },
    message: { type: String, required: true, trim: true },
    type: {
      type: String,
      enum: ['info', 'warning', 'critical', 'success'],
      default: 'info',
    },
    link: { type: String, default: '/audit' },
    read: { type: Boolean, default: false },
  },
  { timestamps: true },
);

NotificationSchema.index({ createdAt: -1 });
NotificationSchema.index({ recipientId: 1, read: 1 });

export default mongoose.model('Notification', NotificationSchema);