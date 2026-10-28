const Notification = require('../models/Notification');

/**
 * Creates an in-app notification for a given user.
 * Safe helper: catches and logs errors so notification issues don't crash primary business transactions.
 * 
 * @param {Object} options
 * @param {string|ObjectId} options.userId - Target recipient user ID
 * @param {'booking'|'cancellation'|'reschedule'|'chat'|'prescription'|'completed'|'approval'|'general'} options.type
 * @param {string} options.title - Short header
 * @param {string} options.body - Explanatory message text
 * @param {string} [options.link] - Frontend route path for quick navigation
 */
const createNotification = async ({ userId, type, title, body, link = '' }) => {
  try {
    if (!userId) return null;
    const notification = await Notification.create({
      user: userId,
      type,
      title,
      body,
      link
    });
    return notification;
  } catch (error) {
    console.error(`[Notification] Failed to create notification for user ${userId}:`, error.message);
    return null;
  }
};

module.exports = {
  createNotification
};

