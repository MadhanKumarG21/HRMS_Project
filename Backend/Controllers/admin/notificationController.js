// Backend/Controllers/admin/notificationController.js
import Notification from '../../Models/Notification.js';

const isAdminUser = (req) => {
  const role = typeof req.user.role === 'object' ? req.user.role?.name : req.user.role;
  return role?.toLowerCase() === 'admin' || (req.user.permissions || []).includes('all:access');
};

// Admin-only alerts stay out of employee feeds; admin-created announcements
// and notifications addressed to the current user remain visible.
const visibilityFilter = (req) => {
  if (isAdminUser(req)) {
    return { $or: [{ recipientId: null }, { recipientId: req.user._id }] };
  }

  return {
    $or: [
      { recipientId: req.user._id },
      { recipientId: null, audience: 'employees' },
    ],
  };
};

// ─── Get All Notifications ───────────────────────────────────────────────────
// Supports filtering by type, read status, search term, and limit.
export const getAllNotifications = async (req, res) => {
  try {
    const limit = Math.min(parseInt(req.query.limit, 10) || 50, 100);
    const { type, read, search } = req.query;

    const query = { ...visibilityFilter(req) };

    if (type && type !== 'all') {
      query.type = type;
    }

    if (read !== undefined && read !== '' && read !== 'all') {
      query.read = read === 'true' || read === true;
    }

    if (search && search.trim()) {
      const searchRegex = new RegExp(search.trim().replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i');
      query.$and = [
        { $or: [{ title: searchRegex }, { message: searchRegex }] },
      ];
    }

    const notifications = await Notification.find(query)
      .sort({ createdAt: -1 })
      .limit(limit)
      .lean();

    res.status(200).json(notifications);
  } catch (error) {
    console.error('[Notification] Get all error:', error);
    res.status(500).json({ message: 'Failed to fetch notifications', error: error.message });
  }
};

// ─── Create Notification (Admin / System) ───────────────────────────────────
export const createNotification = async (req, res) => {
  try {
    const { title, message, type = 'info', link = '/notifications', recipientId = null } = req.body;

    if (!title || !title.trim() || !message || !message.trim()) {
      return res.status(400).json({ message: 'Title and message are required' });
    }

    const notification = await Notification.create({
      recipientId: recipientId || null,
      audience: recipientId ? 'admins' : 'employees',
      title: title.trim(),
      message: message.trim(),
      type: ['info', 'warning', 'critical', 'success'].includes(type) ? type : 'info',
      link: link || '/notifications',
      read: false,
    });

    res.status(201).json(notification);
  } catch (error) {
    console.error('[Notification] Create error:', error);
    res.status(500).json({ message: 'Failed to create notification', error: error.message });
  }
};

// ─── Get Unread Count ────────────────────────────────────────────────────────
// Lightweight endpoint for polling the topbar badge without pulling full rows.
export const getUnreadCount = async (req, res) => {
  try {
    const count = await Notification.countDocuments({ ...visibilityFilter(req), read: false });
    res.status(200).json({ count });
  } catch (error) {
    console.error('[Notification] Unread count error:', error);
    res.status(500).json({ message: 'Failed to fetch unread count', error: error.message });
  }
};

// ─── Mark One As Read ────────────────────────────────────────────────────────
export const markAsRead = async (req, res) => {
  try {
    const notification = await Notification.findOneAndUpdate(
      { _id: req.params.id, ...visibilityFilter(req) },
      { read: true },
      { returnDocument: 'after' },
    );
    if (!notification) {
      return res.status(404).json({ message: 'Notification not found' });
    }
    res.status(200).json(notification);
  } catch (error) {
    console.error('[Notification] Mark as read error:', error);
    res.status(500).json({ message: 'Failed to update notification', error: error.message });
  }
};

// ─── Mark One As Unread ──────────────────────────────────────────────────────
export const markAsUnread = async (req, res) => {
  try {
    const notification = await Notification.findOneAndUpdate(
      { _id: req.params.id, ...visibilityFilter(req) },
      { read: false },
      { returnDocument: 'after' },
    );
    if (!notification) {
      return res.status(404).json({ message: 'Notification not found' });
    }
    res.status(200).json(notification);
  } catch (error) {
    console.error('[Notification] Mark as unread error:', error);
    res.status(500).json({ message: 'Failed to update notification', error: error.message });
  }
};

// ─── Mark All As Read ────────────────────────────────────────────────────────
export const markAllAsRead = async (req, res) => {
  try {
    const result = await Notification.updateMany(
      { ...visibilityFilter(req), read: false },
      { read: true },
    );
    res.status(200).json({ message: 'All notifications marked as read', modified: result.modifiedCount });
  } catch (error) {
    console.error('[Notification] Mark all as read error:', error);
    res.status(500).json({ message: 'Failed to update notifications', error: error.message });
  }
};

// ─── Delete Single Notification ──────────────────────────────────────────────
export const deleteNotification = async (req, res) => {
  try {
    const notification = await Notification.findOneAndDelete({
      _id: req.params.id,
      ...visibilityFilter(req),
    });
    if (!notification) {
      return res.status(404).json({ message: 'Notification not found' });
    }
    res.status(200).json({ message: 'Notification deleted successfully', id: req.params.id });
  } catch (error) {
    console.error('[Notification] Delete error:', error);
    res.status(500).json({ message: 'Failed to delete notification', error: error.message });
  }
};

// ─── Delete Multiple Notifications (Batch) ──────────────────────────────────
export const deleteMultipleNotifications = async (req, res) => {
  try {
    const { ids } = req.body;
    if (!Array.isArray(ids) || ids.length === 0) {
      return res.status(400).json({ message: 'No notification IDs provided' });
    }
    const result = await Notification.deleteMany({
      _id: { $in: ids },
      ...visibilityFilter(req),
    });
    res.status(200).json({ message: 'Notifications deleted successfully', deletedCount: result.deletedCount });
  } catch (error) {
    console.error('[Notification] Delete multiple error:', error);
    res.status(500).json({ message: 'Failed to delete notifications', error: error.message });
  }
};

// ─── Clear All Read Notifications ────────────────────────────────────────────
export const clearReadNotifications = async (req, res) => {
  try {
    const result = await Notification.deleteMany({
      ...visibilityFilter(req),
      read: true,
    });
    res.status(200).json({ message: 'Read notifications cleared successfully', deletedCount: result.deletedCount });
  } catch (error) {
    console.error('[Notification] Clear read error:', error);
    res.status(500).json({ message: 'Failed to clear read notifications', error: error.message });
  }
};