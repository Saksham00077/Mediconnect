const express = require('express');
const { body } = require('express-validator');
const rateLimit = require('express-rate-limit');
const authController = require('../controllers/authController');
const auth = require('../middleware/auth');
const validate = require('../middleware/validate');

const router = express.Router();

// Rate limiter for auth endpoints: max 50 requests per 15 mins per IP
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 50,
  message: {
    message: 'Too many authentication attempts from this IP, please try again in 15 minutes.'
  },
  standardHeaders: true,
  legacyHeaders: false
});

// Validation rules
const registerRules = [
  body('name').trim().notEmpty().withMessage('Full name is required'),
  body('email').trim().isEmail().normalizeEmail().withMessage('Valid email address is required'),
  body('password')
    .isLength({ min: 6 })
    .withMessage('Password must be at least 6 characters long'),
  body('role')
    .optional()
    .isIn(['patient', 'doctor'])
    .withMessage('Role must be either patient or doctor')
];

const loginRules = [
  body('email').trim().isEmail().normalizeEmail().withMessage('Valid email address is required'),
  body('password').notEmpty().withMessage('Password is required')
];

router.post('/register', authLimiter, registerRules, validate, authController.register);
router.post('/login', authLimiter, loginRules, validate, authController.login);
router.get('/me', auth, authController.getMe);

module.exports = router;

