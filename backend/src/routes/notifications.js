const express = require('express');
const notificationController = require('../controllers/notificationController');
const auth = require('../middleware/auth');

const router = express.Router();

router.get('/unread-count', auth, notificationController.getUnreadCount);
router.patch('/read-all', auth, notificationController.markAllAsRead);
router.get('/', auth, notificationController.getMyNotifications);
router.patch('/:id/read', auth, notificationController.markAsRead);

module.exports = router;

