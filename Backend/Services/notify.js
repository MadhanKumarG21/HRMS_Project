// Backend/Services/notify.js
// Small shared helper so any controller/service can raise a notification
// without duplicating the Notification.create(...) call everywhere.
import Notification from '../Models/Notification.js';

/**
 * Creates a notification visible in the topbar's notification center.
 * @param {Object} params
 * @param {string} params.title - Short headline, e.g. "New Leave Request"
 * @param {string} params.message - One-line detail shown under the title
 * @param {'info'|'warning'|'critical'|'success'} [params.type='info']
 * @param {string} [params.link='/audit'] - Route to open when clicked
 */
export const notifyAdmins = async ({ title, message, type = 'info', link = '/audit' }) => {
  try {
    await Notification.create({
      recipientId: null,
      audience: 'admins',
      title,
      message,
      type,
      link,
    });
  } catch (err) {
    // A notification failing to save should never break the calling
    // workflow (e.g. leave submission) — just log it and move on.
    console.error('[Notify] Failed to create notification:', err.message);
  }
};

/**
 * Creates a notification visible only to one specific employee — e.g. a
 * missed-checkout reminder. Distinct from notifyAdmins, which broadcasts
 * to every admin instead of targeting one person.
 * @param {Object} params
 * @param {string} params.userId - The recipient's User _id
 * @param {string} params.title
 * @param {string} params.message
 * @param {'info'|'warning'|'critical'|'success'} [params.type='info']
 * @param {string} [params.link='/attendance']
 */
export const notifyUser = async ({ userId, title, message, type = 'info', link = '/attendance' }) => {
  try {
    await Notification.create({
      recipientId: userId,
      title,
      message,
      type,
      link,
    });
  } catch (err) {
    console.error('[Notify] Failed to create personal notification:', err.message);
  }
};