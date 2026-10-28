const jwt = require('jsonwebtoken');
const User = require('../models/User');
const DoctorProfile = require('../models/DoctorProfile');
const PatientProfile = require('../models/PatientProfile');
const ApiError = require('../utils/ApiError');
const asyncHandler = require('../utils/asyncHandler');

// Helper to generate JWT token
const signToken = (user) => {
  return jwt.sign(
    { id: user._id, role: user.role, email: user.email },
    process.env.JWT_SECRET,
    { expiresIn: process.env.JWT_EXPIRES_IN || '7d' }
  );
};

/**
 * Register a new user (Patient or Doctor)
 * Doctors require initial profile details and start in isApproved=false status.
 */
const register = asyncHandler(async (req, res) => {
  const {
    name,
    email,
    password,
    phone,
    role = 'patient',
    // Doctor specific fields:
    specialisation,
    qualifications,
    experienceYears,
    city,
    languages,
    fee,
    bio,
    regNumber
  } = req.body;

  // Check if email already registered
  const existingUser = await User.findOne({ email: email.toLowerCase() });
  if (existingUser) {
    throw ApiError.conflict('An account with this email already exists');
  }

  // Hash password
  const passwordHash = await User.hashPassword(password);

  // 1. Create base User
  const user = await User.create({
    name,
    email: email.toLowerCase(),
    passwordHash,
    phone: phone || '',
    role
  });

  let doctorProfile = null;
  let patientProfile = null;

  // 2. Initialize role-specific profile
  if (role === 'doctor') {
    if (!specialisation || !city || !regNumber || fee === undefined) {
      // Clean up user if required doctor fields are missing
      await User.findByIdAndDelete(user._id);
      throw ApiError.badRequest('Doctor registration requires specialisation, city, regNumber, and fee');
    }

    doctorProfile = await DoctorProfile.create({
      user: user._id,
      specialisation,
      qualifications: qualifications || '',
      experienceYears: Number(experienceYears) || 0,
      city,
      languages: Array.isArray(languages) ? languages : (languages ? languages.split(',').map(s => s.trim()) : ['English']),
      fee: Number(fee),
      bio: bio || '',
      regNumber,
      isApproved: false, // Must be approved by admin before receiving bookings
      slotDurationMins: 30,
      availability: [
        // Sensible default weekday schedule: Mon-Fri 09:00 - 17:00
        { dayOfWeek: 1, startTime: '09:00', endTime: '17:00' },
        { dayOfWeek: 2, startTime: '09:00', endTime: '17:00' },
        { dayOfWeek: 3, startTime: '09:00', endTime: '17:00' },
        { dayOfWeek: 4, startTime: '09:00', endTime: '17:00' },
        { dayOfWeek: 5, startTime: '09:00', endTime: '17:00' }
      ]
    });
  } else if (role === 'patient') {
    patientProfile = await PatientProfile.create({
      user: user._id
    });
  }

  const token = signToken(user);

  res.status(201).json({
    message: role === 'doctor'
      ? 'Registration successful! Your doctor profile is awaiting admin approval before patients can book.'
      : 'Registration successful!',
    token,
    user: {
      id: user._id,
      name: user.name,
      email: user.email,
      phone: user.phone,
      role: user.role
    },
    doctorProfile,
    patientProfile
  });
});

/**
 * Login user
 */
const login = asyncHandler(async (req, res) => {
  const { email, password } = req.body;

  if (!email || !password) {
    throw ApiError.badRequest('Please provide both email and password');
  }

  // Find user and explicitly select passwordHash
  const user = await User.findOne({ email: email.toLowerCase() }).select('+passwordHash');
  if (!user) {
    throw ApiError.unauthorized('Invalid email or password');
  }

  const isMatch = await user.comparePassword(password);
  if (!isMatch) {
    throw ApiError.unauthorized('Invalid email or password');
  }

  if (!user.isActive) {
    throw ApiError.forbidden('Your account has been deactivated. Please contact support.');
  }

  const token = signToken(user);

  let doctorProfile = null;
  let patientProfile = null;

  if (user.role === 'doctor') {
    doctorProfile = await DoctorProfile.findOne({ user: user._id });
  } else if (user.role === 'patient') {
    patientProfile = await PatientProfile.findOne({ user: user._id });
  }

  res.status(200).json({
    message: 'Login successful',
    token,
    user: {
      id: user._id,
      name: user.name,
      email: user.email,
      phone: user.phone,
      role: user.role
    },
    doctorProfile,
    patientProfile
  });
});

/**
 * Get current authenticated user session data
 */
const getMe = asyncHandler(async (req, res) => {
  let doctorProfile = null;
  let patientProfile = null;

  if (req.user.role === 'doctor') {
    doctorProfile = await DoctorProfile.findOne({ user: req.user._id });
  } else if (req.user.role === 'patient') {
    patientProfile = await PatientProfile.findOne({ user: req.user._id });
  }

  res.status(200).json({
    user: {
      id: req.user._id,
      name: req.user.name,
      email: req.user.email,
      phone: req.user.phone,
      role: req.user.role
    },
    doctorProfile,
    patientProfile
  });
});

module.exports = {
  register,
  login,
  getMe
};

