const Notification = require('../models/Notification');
const ApiError = require('../utils/ApiError');
const asyncHandler = require('../utils/asyncHandler');

/**
 * Get all notifications for current user
 */
const getMyNotifications = asyncHandler(async (req, res) => {
  const notifications = await Notification.find({ user: req.user._id })
    .sort({ createdAt: -1 })
    .limit(50);

  res.status(200).json({ notifications });
});

/**
 * Mark single notification as read
 */
const markAsRead = asyncHandler(async (req, res) => {
  const notification = await Notification.findOne({
    _id: req.params.id,
    user: req.user._id
  });

  if (!notification) {
    throw ApiError.notFound('Notification not found');
  }

  notification.isRead = true;
  await notification.save();

  res.status(200).json({ message: 'Marked as read', notification });
});

/**
 * Mark all notifications as read for current user
 */
const markAllAsRead = asyncHandler(async (req, res) => {
  await Notification.updateMany({ user: req.user._id, isRead: false }, { $set: { isRead: true } });

  res.status(200).json({ message: 'All notifications marked as read' });
});

/**
 * Get unread notification count
 */
const getUnreadCount = asyncHandler(async (req, res) => {
  const unreadCount = await Notification.countDocuments({
    user: req.user._id,
    isRead: false
  });

  res.status(200).json({ unreadCount });
});

module.exports = {
  getMyNotifications,
  markAsRead,
  markAllAsRead,
  getUnreadCount
};

