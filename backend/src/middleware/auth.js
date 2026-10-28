const jwt = require('jsonwebtoken');
const User = require('../models/User');
const DoctorProfile = require('../models/DoctorProfile');
const ApiError = require('../utils/ApiError');

/**
 * Verifies JWT token from Authorization header and attaches the user document to req.user.
 * If user is a doctor, also preloads and attaches req.doctorProfile.
 */
const auth = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return next(ApiError.unauthorized('Authentication token missing or invalid'));
    }

    const token = authHeader.split(' ')[1];
    if (!token) {
      return next(ApiError.unauthorized('Authentication token missing'));
    }

    const secret = process.env.JWT_SECRET;
    if (!secret) {
      console.error('FATAL: JWT_SECRET environment variable is missing');
      return next(ApiError.internal('Internal server auth configuration error'));
    }

    const decoded = jwt.verify(token, secret);
    const user = await User.findById(decoded.id).select('-passwordHash');

    if (!user) {
      return next(ApiError.unauthorized('User associated with this token no longer exists'));
    }

    if (!user.isActive) {
      return next(ApiError.forbidden('Your account has been deactivated'));
    }

    req.user = user;

    // Pre-attach doctor profile if role is doctor
    if (user.role === 'doctor') {
      const doctorProfile = await DoctorProfile.findOne({ user: user._id });
      req.doctorProfile = doctorProfile;
    }

    next();
  } catch (error) {
    if (error.name === 'JsonWebTokenError' || error.name === 'TokenExpiredError') {
      return next(error);
    }
    next(ApiError.unauthorized('Failed to authenticate token'));
  }
};

module.exports = auth;

