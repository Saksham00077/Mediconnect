const DoctorProfile = require('../models/DoctorProfile');
const User = require('../models/User');
const Appointment = require('../models/Appointment');
const ApiError = require('../utils/ApiError');
const asyncHandler = require('../utils/asyncHandler');
const { createNotification } = require('../utils/notify');

/**
 * Admin: List doctors (can filter by approval status)
 */
const getDoctors = asyncHandler(async (req, res) => {
  const { approved } = req.query;
  const query = {};

  if (approved !== undefined) {
    query.isApproved = approved === 'true';
  }

  const doctors = await DoctorProfile.find(query)
    .populate('user', 'name email phone isActive createdAt')
    .sort({ createdAt: -1 });

  res.status(200).json({ doctors });
});

/**
 * Admin: Approve a doctor profile
 */
const approveDoctor = asyncHandler(async (req, res) => {
  const doctor = await DoctorProfile.findById(req.params.id).populate('user');
  if (!doctor) {
    throw ApiError.notFound('Doctor profile not found');
  }

  doctor.isApproved = true;
  await doctor.save();

  // Notify the doctor
  if (doctor.user) {
    await createNotification({
      userId: doctor.user._id,
      type: 'approval',
      title: 'Doctor Profile Approved!',
      body: 'Your MediConnect credentials have been verified and approved. Patients can now book consultations with you.',
      link: '/doctor/dashboard'
    });
  }

  res.status(200).json({
    message: 'Doctor approved successfully',
    doctor
  });
});

/**
 * Admin: Reject / Deactivate a doctor
 */
const rejectDoctor = asyncHandler(async (req, res) => {
  const doctor = await DoctorProfile.findById(req.params.id);
  if (!doctor) {
    throw ApiError.notFound('Doctor profile not found');
  }

  doctor.isApproved = false;
  await doctor.save();

  // Deactivate the user account
  await User.findByIdAndUpdate(doctor.user, { isActive: false });

  res.status(200).json({
    message: 'Doctor rejected and account deactivated',
    doctor
  });
});

/**
 * Admin: Overview statistics
 */
const getAdminStats = asyncHandler(async (req, res) => {
  const [
    totalUsers,
    totalPatients,
    totalDoctors,
    approvedDoctors,
    pendingDoctors,
    totalAppointments,
    bookedAppointments,
    completedAppointments,
    cancelledAppointments,
    noShowAppointments
  ] = await Promise.all([
    User.countDocuments(),
    User.countDocuments({ role: 'patient' }),
    DoctorProfile.countDocuments(),
    DoctorProfile.countDocuments({ isApproved: true }),
    DoctorProfile.countDocuments({ isApproved: false }),
    Appointment.countDocuments(),
    Appointment.countDocuments({ status: 'booked' }),
    Appointment.countDocuments({ status: 'completed' }),
    Appointment.countDocuments({ status: 'cancelled' }),
    Appointment.countDocuments({ status: 'no_show' })
  ]);

  res.status(200).json({
    users: {
      total: totalUsers,
      patients: totalPatients,
      doctors: totalDoctors
    },
    doctors: {
      total: totalDoctors,
      approved: approvedDoctors,
      pending: pendingDoctors
    },
    appointments: {
      total: totalAppointments,
      booked: bookedAppointments,
      completed: completedAppointments,
      cancelled: cancelledAppointments,
      noShow: noShowAppointments
    }
  });
});

module.exports = {
  getDoctors,
  approveDoctor,
  rejectDoctor,
  getAdminStats
};

