const express = require('express');
const { body } = require('express-validator');
const messageController = require('../controllers/messageController');
const auth = require('../middleware/auth');
const validate = require('../middleware/validate');

const router = express.Router();

router.get('/unread/summary', auth, messageController.getUnreadSummary);

router.get('/:appointmentId', auth, messageController.getMessages);

router.post(
  '/:appointmentId',
  auth,
  [
    body('text')
      .trim()
      .notEmpty()
      .withMessage('Message text is required')
      .isLength({ max: 1000 })
      .withMessage('Message cannot exceed 1000 characters')
  ],
  validate,
  messageController.sendMessage
);

module.exports = router;

