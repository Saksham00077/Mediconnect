const express = require('express');
const { body } = require('express-validator');
const patientController = require('../controllers/patientController');
const auth = require('../middleware/auth');
const requireRole = require('../middleware/requireRole');
const validate = require('../middleware/validate');

const router = express.Router();

router.get('/profile', auth, requireRole('patient'), patientController.getMyProfile);
router.put(
  '/profile',
  auth,
  requireRole('patient'),
  [
    body('age').optional().isInt({ min: 0, max: 130 }).withMessage('Valid age between 0 and 130'),
    body('bloodGroup')
      .optional()
      .isIn(['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-', 'Unknown'])
      .withMessage('Valid blood group')
  ],
  validate,
  patientController.updateMyProfile
);

router.get('/:patientId/profile', auth, requireRole('doctor', 'admin'), patientController.getPatientProfileByDoctor);

module.exports = router;

