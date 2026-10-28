const { DateTime } = require('luxon');
const Appointment = require('../models/Appointment');
const DoctorProfile = require('../models/DoctorProfile');
const User = require('../models/User');
const ApiError = require('../utils/ApiError');
const asyncHandler = require('../utils/asyncHandler');
const { getSlotsForDate, DEFAULT_TIMEZONE, DEFAULT_HORIZON_DAYS } = require('../utils/slots');
const { createNotification } = require('../utils/notify');

/**
 * Patient: Book an appointment
 * Validates slot existence, doctor approval, patient overlap, and enforces partial unique index
 */
const bookAppointment = asyncHandler(async (req, res) => {
  const { doctorId, startAt, reason } = req.body;

  if (!doctorId || !startAt || !reason) {
    throw ApiError.badRequest('doctorId, startAt, and reason for visit are required');
  }

  // 1. Verify Doctor exists and is approved
  const doctor = await DoctorProfile.findById(doctorId).populate('user', 'name');
  if (!doctor) {
    throw ApiError.notFound('Doctor not found');
  }
  if (!doctor.isApproved) {
    throw ApiError.badRequest('Cannot book an appointment with a doctor who is pending approval');
  }

  const requestedStart = new Date(startAt);
  if (isNaN(requestedStart.getTime())) {
    throw ApiError.badRequest('Invalid startAt ISO date format');
  }

  const timezone = process.env.APP_TIMEZONE || DEFAULT_TIMEZONE;
  const slotDt = DateTime.fromJSDate(requestedStart, { zone: timezone });
  const dateStr = slotDt.toISODate();
  const now = DateTime.now().setZone(timezone);

  // Check booking horizon
  const horizonDays = Number(process.env.BOOKING_HORIZON_DAYS || DEFAULT_HORIZON_DAYS);
  const maxDate = now.plus({ days: horizonDays }).endOf('day');
  if (slotDt > maxDate || slotDt < now) {
    throw ApiError.badRequest(
      `Appointments can only be booked within ${horizonDays} days in advance and cannot be in the past`
    );
  }

  // 2. Layer 1 Validation: Verify slot is genuinely generated and currently available
  const availableSlots = await getSlotsForDate(doctor, dateStr, null, now);
  const matchingSlot = availableSlots.find(
    (s) => new Date(s.startAt).getTime() === requestedStart.getTime()
  );

  if (!matchingSlot) {
    throw ApiError.badRequest('Requested time does not correspond to a valid timetable slot for this doctor');
  }

  if (!matchingSlot.available) {
    throw ApiError.conflict('This slot was just booked by someone else. Please pick another.');
  }

  // 3. Prevent patient from double-booking themselves for overlapping appointments
  const patientOverlap = await Appointment.findOne({
    patient: req.user._id,
    startAt: requestedStart,
    status: 'booked'
  });

  if (patientOverlap) {
    throw ApiError.badRequest('You already have another active appointment booked at this exact time');
  }

  const endAt = new Date(matchingSlot.endAt);

  // 4. Layer 2: Attempt creation. The partial unique index guarantees DB-level atomicity!
  let appointment;
  try {
    appointment = await Appointment.create({
      patient: req.user._id,
      doctor: doctor._id,
      startAt: requestedStart,
      endAt,
      reason: reason.trim(),
      fee: doctor.fee,
      status: 'booked'
    });
  } catch (err) {
    if (err.code === 11000) {
      throw ApiError.conflict('This slot was just booked by someone else. Please pick another.');
    }
    throw err;
  }

  // Notify the doctor
  if (doctor.user) {
    const formattedDate = slotDt.toFormat('ccc, dd LLL yyyy, hh:mm a');
    await createNotification({
      userId: doctor.user._id || doctor.user,
      type: 'booking',
      title: 'New Appointment Booked',
      body: `${req.user.name} booked an appointment for ${formattedDate}`,
      link: `/doctor/appointments`
    });
  }

  const populated = await Appointment.findById(appointment._id)
    .populate('doctor', 'specialisation city fee user')
    .populate({
      path: 'doctor',
      populate: { path: 'user', select: 'name email phone' }
    });

  res.status(201).json({
    message: 'Appointment booked successfully',
    appointment: populated
  });
});

/**
 * Get logged-in user's appointments (Patient or Doctor view)
 */
const getMyAppointments = asyncHandler(async (req, res) => {
  const { status, from, to } = req.query;
  const query = {};

  if (req.user.role === 'patient') {
    query.patient = req.user._id;
  } else if (req.user.role === 'doctor') {
    const doctorProfile = req.doctorProfile || (await DoctorProfile.findOne({ user: req.user._id }));
    if (!doctorProfile) {
      return res.status(200).json({ appointments: [] });
    }
    query.doctor = doctorProfile._id;
  } else if (req.user.role === 'admin') {
    // Admin can view all
  }

  if (status) {
    query.status = status;
  }

  if (from || to) {
    query.startAt = {};
    if (from) query.startAt.$gte = new Date(from);
    if (to) query.startAt.$lte = new Date(to);
  }

  const appointments = await Appointment.find(query)
    .populate('patient', 'name email phone')
    .populate({
      path: 'doctor',
      populate: { path: 'user', select: 'name email phone' }
    })
    .sort({ startAt: -1 });

  res.status(200).json({ appointments });
});

/**
 * Get single appointment details (with ownership check)
 */
const getAppointmentById = asyncHandler(async (req, res) => {
  const appointment = await Appointment.findById(req.params.id)
    .populate('patient', 'name email phone')
    .populate({
      path: 'doctor',
      populate: { path: 'user', select: 'name email phone' }
    });

  if (!appointment) {
    throw ApiError.notFound('Appointment not found');
  }

  // Ownership verification
  const isPatient = appointment.patient._id.toString() === req.user._id.toString();
  const isDoctor =
    appointment.doctor &&
    appointment.doctor.user &&
    appointment.doctor.user._id.toString() === req.user._id.toString();
  const isAdmin = req.user.role === 'admin';

  if (!isPatient && !isDoctor && !isAdmin) {
    throw ApiError.forbidden('You are not authorized to view this appointment');
  }

  res.status(200).json(appointment);
});

/**
 * Cancel an appointment
 * Patient: allowed only if > 2 hours before startAt
 * Doctor: allowed anytime (reason required)
 */
const cancelAppointment = asyncHandler(async (req, res) => {
  const { reason } = req.body;
  const appointment = await Appointment.findById(req.params.id)
    .populate('patient', 'name')
    .populate({
      path: 'doctor',
      populate: { path: 'user', select: 'name _id' }
    });

  if (!appointment) {
    throw ApiError.notFound('Appointment not found');
  }

  if (appointment.status === 'cancelled') {
    throw ApiError.badRequest('This appointment is already cancelled');
  }

  if (appointment.status === 'completed') {
    throw ApiError.badRequest('Cannot cancel an appointment that has already been completed');
  }

  const isPatient = appointment.patient._id.toString() === req.user._id.toString();
  const isDoctor =
    appointment.doctor &&
    appointment.doctor.user &&
    appointment.doctor.user._id.toString() === req.user._id.toString();

  if (!isPatient && !isDoctor && req.user.role !== 'admin') {
    throw ApiError.forbidden('You do not have permission to cancel this appointment');
  }

  const now = new Date();
  const startAt = new Date(appointment.startAt);

  // 2-hour rule for patients
  if (isPatient) {
    const diffHours = (startAt - now) / (1000 * 60 * 60);
    if (diffHours < 2) {
      throw ApiError.badRequest(
        'Appointments can only be cancelled at least 2 hours before the scheduled time'
      );
    }
  }

  // Doctor must provide a cancellation reason
  if (isDoctor && (!reason || reason.trim().length === 0)) {
    throw ApiError.badRequest('A reason is required when a doctor cancels an appointment');
  }

  appointment.status = 'cancelled';
  appointment.cancelledBy = req.user.role;
  appointment.cancelReason = reason || 'Cancelled by user';
  await appointment.save();

  // Notify the other party
  const notifyRecipient = isPatient
    ? appointment.doctor.user._id
    : appointment.patient._id;

  const cancelledByName = isPatient ? 'Patient' : 'Dr. ' + (appointment.doctor.user?.name || '');
  await createNotification({
    userId: notifyRecipient,
    type: 'cancellation',
    title: 'Appointment Cancelled',
    body: `Appointment scheduled for ${DateTime.fromJSDate(startAt).toFormat('dd LLL, hh:mm a')} was cancelled by ${cancelledByName}. Reason: ${appointment.cancelReason}`,
    link: isPatient ? '/doctor/appointments' : '/patient/appointments'
  });

  res.status(200).json({
    message: 'Appointment cancelled successfully. The slot is now freed.',
    appointment
  });
});

/**
 * Patient: Reschedule an appointment
 * Must be > 2 hours before start, max 2 reschedules, validates new slot
 */
const rescheduleAppointment = asyncHandler(async (req, res) => {
  const { newStartAt } = req.body;
  if (!newStartAt) {
    throw ApiError.badRequest('newStartAt ISO date string is required');
  }

  const appointment = await Appointment.findById(req.params.id).populate({
    path: 'doctor',
    populate: { path: 'user', select: 'name _id' }
  });

  if (!appointment) {
    throw ApiError.notFound('Appointment not found');
  }

  // Only the patient can reschedule
  if (appointment.patient.toString() !== req.user._id.toString()) {
    throw ApiError.forbidden('Only the booking patient can reschedule this appointment');
  }

  if (appointment.status !== 'booked') {
    throw ApiError.badRequest('Only active booked appointments can be rescheduled');
  }

  // 2-hour rule check
  const now = new Date();
  const currentStart = new Date(appointment.startAt);
  const diffHours = (currentStart - now) / (1000 * 60 * 60);
  if (diffHours < 2) {
    throw ApiError.badRequest(
      'Appointments can only be rescheduled at least 2 hours before the scheduled time'
    );
  }

  // Max 2 reschedules rule
  if ((appointment.rescheduleCount || 0) >= 2) {
    throw ApiError.badRequest('This appointment has already been rescheduled the maximum allowed limit of 2 times');
  }

  const requestedNewStart = new Date(newStartAt);
  const timezone = process.env.APP_TIMEZONE || DEFAULT_TIMEZONE;
  const newDt = DateTime.fromJSDate(requestedNewStart, { zone: timezone });
  const dateStr = newDt.toISODate();

  const doctor = await DoctorProfile.findById(appointment.doctor._id);

  // Validate new slot availability
  const slots = await getSlotsForDate(doctor, dateStr, null, DateTime.now().setZone(timezone));
  const matchingSlot = slots.find(
    (s) => new Date(s.startAt).getTime() === requestedNewStart.getTime()
  );

  if (!matchingSlot) {
    throw ApiError.badRequest('Requested new time is not a valid timetable slot for this doctor');
  }

  if (!matchingSlot.available) {
    throw ApiError.conflict('The chosen new slot is already booked. Please choose another slot.');
  }

  // Prevent overlap for patient
  const patientOverlap = await Appointment.findOne({
    patient: req.user._id,
    startAt: requestedNewStart,
    status: 'booked',
    _id: { $ne: appointment._id }
  });

  if (patientOverlap) {
    throw ApiError.badRequest('You already have another active appointment booked at this new time');
  }

  // Update appointment
  appointment.startAt = requestedNewStart;
  appointment.endAt = new Date(matchingSlot.endAt);
  appointment.rescheduleCount = (appointment.rescheduleCount || 0) + 1;

  try {
    await appointment.save();
  } catch (err) {
    if (err.code === 11000) {
      throw ApiError.conflict('This slot was just booked by someone else. Please pick another.');
    }
    throw err;
  }

  // Notify doctor
  if (appointment.doctor.user) {
    await createNotification({
      userId: appointment.doctor.user._id,
      type: 'reschedule',
      title: 'Appointment Rescheduled',
      body: `${req.user.name} rescheduled their appointment to ${newDt.toFormat('ccc, dd LLL, hh:mm a')}`,
      link: '/doctor/appointments'
    });
  }

  res.status(200).json({
    message: 'Appointment rescheduled successfully',
    appointment
  });
});

/**
 * Doctor: Mark appointment as completed
 * Allowed only on or after startAt
 */
const completeAppointment = asyncHandler(async (req, res) => {
  const appointment = await Appointment.findById(req.params.id).populate('doctor');
  if (!appointment) {
    throw ApiError.notFound('Appointment not found');
  }

  // Doctor check
  if (appointment.doctor.user.toString() !== req.user._id.toString()) {
    throw ApiError.forbidden('Only the assigned doctor can complete this appointment');
  }

  if (appointment.status !== 'booked') {
    throw ApiError.badRequest(`Cannot complete an appointment with status '${appointment.status}'`);
  }

  // Can only complete on or after startAt
  const now = new Date();
  if (now < new Date(appointment.startAt)) {
    throw ApiError.badRequest('Cannot complete an appointment before its scheduled start time');
  }

  appointment.status = 'completed';
  appointment.completedAt = now;
  await appointment.save();

  // Prompt patient to rate the consultation
  await createNotification({
    userId: appointment.patient,
    type: 'completed',
    title: 'Consultation Completed',
    body: 'Your consultation is complete. Please take a moment to rate your doctor experience.',
    link: `/appointments/${appointment._id}`
  });

  res.status(200).json({
    message: 'Appointment marked as completed',
    appointment
  });
});

/**
 * Doctor: Mark appointment as no-show
 */
const markNoShow = asyncHandler(async (req, res) => {
  const appointment = await Appointment.findById(req.params.id).populate('doctor');
  if (!appointment) {
    throw ApiError.notFound('Appointment not found');
  }

  if (appointment.doctor.user.toString() !== req.user._id.toString()) {
    throw ApiError.forbidden('Only the assigned doctor can mark no-show');
  }

  if (appointment.status !== 'booked') {
    throw ApiError.badRequest(`Cannot mark no-show for appointment with status '${appointment.status}'`);
  }

  appointment.status = 'no_show';
  await appointment.save();

  res.status(200).json({
    message: 'Appointment marked as no-show',
    appointment
  });
});

/**
 * Patient: Rate completed appointment
 * Updates appointment rating and recomputes DoctorProfile average
 */
const rateAppointment = asyncHandler(async (req, res) => {
  const { stars, comment } = req.body;
  const starNum = Number(stars);

  if (!starNum || starNum < 1 || starNum > 5) {
    throw ApiError.badRequest('Rating must be an integer between 1 and 5');
  }

  const appointment = await Appointment.findById(req.params.id);
  if (!appointment) {
    throw ApiError.notFound('Appointment not found');
  }

  if (appointment.patient.toString() !== req.user._id.toString()) {
    throw ApiError.forbidden('Only the patient of this appointment can submit a review');
  }

  if (appointment.status !== 'completed') {
    throw ApiError.badRequest('Only completed appointments can be rated');
  }

  if (appointment.rating && appointment.rating.stars) {
    throw ApiError.badRequest('This appointment has already been rated');
  }

  appointment.rating = {
    stars: starNum,
    comment: comment ? comment.trim() : ''
  };
  await appointment.save();

  // Recompute DoctorProfile rating
  const ratings = await Appointment.find({
    doctor: appointment.doctor,
    'rating.stars': { $exists: true, $ne: null }
  }).select('rating.stars');

  const count = ratings.length;
  const sum = ratings.reduce((acc, curr) => acc + curr.rating.stars, 0);
  const avg = count > 0 ? parseFloat((sum / count).toFixed(1)) : 0;

  await DoctorProfile.findByIdAndUpdate(appointment.doctor, {
    rating: { avg, count }
  });

  res.status(200).json({
    message: 'Rating submitted successfully',
    rating: appointment.rating,
    newDoctorRating: { avg, count }
  });
});

module.exports = {
  bookAppointment,
  getMyAppointments,
  getAppointmentById,
  cancelAppointment,
  rescheduleAppointment,
  completeAppointment,
  markNoShow,
  rateAppointment
};

