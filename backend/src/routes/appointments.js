const express = require('express');
const { body } = require('express-validator');
const appointmentController = require('../controllers/appointmentController');
const auth = require('../middleware/auth');
const requireRole = require('../middleware/requireRole');
const validate = require('../middleware/validate');

const router = express.Router();

router.post(
  '/',
  auth,
  requireRole('patient'),
  [
    body('doctorId').notEmpty().withMessage('doctorId is required'),
    body('startAt').notEmpty().withMessage('startAt ISO date is required'),
    body('reason').trim().notEmpty().withMessage('Reason for visit is required')
  ],
  validate,
  appointmentController.bookAppointment
);

router.get('/', auth, appointmentController.getMyAppointments);
router.get('/:id', auth, appointmentController.getAppointmentById);

router.patch(
  '/:id/cancel',
  auth,
  [body('reason').optional().trim()],
  validate,
  appointmentController.cancelAppointment
);

router.patch(
  '/:id/reschedule',
  auth,
  requireRole('patient'),
  [body('newStartAt').notEmpty().withMessage('newStartAt ISO date is required')],
  validate,
  appointmentController.rescheduleAppointment
);

router.patch('/:id/complete', auth, requireRole('doctor'), appointmentController.completeAppointment);
router.patch('/:id/no-show', auth, requireRole('doctor'), appointmentController.markNoShow);

router.post(
  '/:id/rate',
  auth,
  requireRole('patient'),
  [
    body('stars')
      .isInt({ min: 1, max: 5 })
      .withMessage('stars must be an integer between 1 and 5'),
    body('comment').optional().trim()
  ],
  validate,
  appointmentController.rateAppointment
);

module.exports = router;

