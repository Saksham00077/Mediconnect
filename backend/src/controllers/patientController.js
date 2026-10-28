const PatientProfile = require('../models/PatientProfile');
const Appointment = require('../models/Appointment');
const DoctorProfile = require('../models/DoctorProfile');
const User = require('../models/User');
const ApiError = require('../utils/ApiError');
const asyncHandler = require('../utils/asyncHandler');

/**
 * Patient: Get own health profile
 */
const getMyProfile = asyncHandler(async (req, res) => {
  let profile = await PatientProfile.findOne({ user: req.user._id }).populate(
    'user',
    'name email phone'
  );

  if (!profile) {
    // If not created yet, create a default one
    profile = await PatientProfile.create({ user: req.user._id });
    profile = await PatientProfile.findById(profile._id).populate('user', 'name email phone');
  }

  res.status(200).json(profile);
});

/**
 * Patient: Update own health profile
 */
const updateMyProfile = asyncHandler(async (req, res) => {
  const { age, gender, bloodGroup, allergies, chronicConditions, emergencyContact } = req.body;

  let profile = await PatientProfile.findOne({ user: req.user._id });
  if (!profile) {
    profile = new PatientProfile({ user: req.user._id });
  }

  if (age !== undefined) profile.age = age ? Number(age) : null;
  if (gender !== undefined) profile.gender = gender;
  if (bloodGroup !== undefined) profile.bloodGroup = bloodGroup;
  if (allergies !== undefined) {
    profile.allergies = Array.isArray(allergies)
      ? allergies
      : allergies.split(',').map((s) => s.trim()).filter(Boolean);
  }
  if (chronicConditions !== undefined) {
    profile.chronicConditions = Array.isArray(chronicConditions)
      ? chronicConditions
      : chronicConditions.split(',').map((s) => s.trim()).filter(Boolean);
  }
  if (emergencyContact !== undefined) {
    profile.emergencyContact = emergencyContact;
  }

  await profile.save();

  const populated = await PatientProfile.findById(profile._id).populate('user', 'name email phone');

  res.status(200).json({
    message: 'Health profile updated successfully',
    profile: populated
  });
});

/**
 * Doctor: View patient's health profile
 * Strict access control: doctor must share at least one appointment with this patient
 */
const getPatientProfileByDoctor = asyncHandler(async (req, res) => {
  const { patientId } = req.params;

  const patientUser = await User.findById(patientId);
  if (!patientUser || patientUser.role !== 'patient') {
    throw ApiError.notFound('Patient not found');
  }

  const doctorProfile = req.doctorProfile || (await DoctorProfile.findOne({ user: req.user._id }));
  if (!doctorProfile) {
    throw ApiError.forbidden('Doctor profile not found for user');
  }

  // Check if they share any appointment
  const sharedAppointment = await Appointment.findOne({
    doctor: doctorProfile._id,
    patient: patientId
  });

  if (!sharedAppointment && req.user.role !== 'admin') {
    throw ApiError.forbidden(
      'Access denied: You can only view health profiles for patients who have consulted with you'
    );
  }

  let profile = await PatientProfile.findOne({ user: patientId }).populate(
    'user',
    'name email phone'
  );

  if (!profile) {
    profile = {
      user: patientUser,
      age: null,
      gender: 'prefer_not_to_say',
      bloodGroup: 'Unknown',
      allergies: [],
      chronicConditions: [],
      emergencyContact: { name: '', phone: '', relation: '' }
    };
  }

  res.status(200).json(profile);
});

module.exports = {
  getMyProfile,
  updateMyProfile,
  getPatientProfileByDoctor
};

