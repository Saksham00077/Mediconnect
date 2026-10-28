const express = require('express');
const { body } = require('express-validator');
const prescriptionController = require('../controllers/prescriptionController');
const auth = require('../middleware/auth');
const requireRole = require('../middleware/requireRole');
const validate = require('../middleware/validate');

const router = express.Router();

router.post(
  '/',
  auth,
  requireRole('doctor'),
  [
    body('appointmentId').notEmpty().withMessage('appointmentId is required'),
    body('diagnosis').trim().notEmpty().withMessage('diagnosis is required'),
    body('medicines').isArray().withMessage('medicines must be an array')
  ],
  validate,
  prescriptionController.savePrescription
);

router.get('/appointment/:appointmentId', auth, prescriptionController.getPrescriptionByAppointment);
router.get('/', auth, requireRole('patient'), prescriptionController.getMyPrescriptions);

module.exports = router;

