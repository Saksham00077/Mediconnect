const express = require('express');
const { body } = require('express-validator');
const doctorController = require('../controllers/doctorController');
const auth = require('../middleware/auth');
const requireRole = require('../middleware/requireRole');
const validate = require('../middleware/validate');

const router = express.Router();

// --- Doctor Self-Service Routes (Role: doctor) ---
router.get('/me/profile', auth, requireRole('doctor'), doctorController.getMyProfile);
router.put('/me/profile', auth, requireRole('doctor'), doctorController.updateMyProfile);

router.get('/me/availability', auth, requireRole('doctor'), doctorController.getMyAvailability);
router.put(
  '/me/availability',
  auth,
  requireRole('doctor'),
  [
    body('slotDurationMins')
      .optional()
      .isInt({ min: 10, max: 120 })
      .withMessage('slotDurationMins must be between 10 and 120'),
    body('availability').optional().isArray().withMessage('availability must be an array of ranges')
  ],
  validate,
  doctorController.updateMyAvailability
);

router.post(
  '/me/leaves',
  auth,
  requireRole('doctor'),
  [body('date').matches(/^\d{4}-\d{2}-\d{2}$/).withMessage('date must be in YYYY-MM-DD format')],
  validate,
  doctorController.addLeave
);
router.delete('/me/leaves/:date', auth, requireRole('doctor'), doctorController.removeLeave);

router.get('/me/schedule', auth, requireRole('doctor'), doctorController.getMyDaySchedule);
router.get('/me/schedule/week', auth, requireRole('doctor'), doctorController.getMyWeekSchedule);
router.get('/me/summary', auth, requireRole('doctor'), doctorController.getMySummary);

// --- Public Discovery Routes ---
router.get('/filters/meta', doctorController.getFilterMeta);
router.get('/', doctorController.getDoctors);
router.get('/:id', doctorController.getDoctorById);
router.get('/:id/slots', doctorController.getDoctorSlots);

module.exports = router;

