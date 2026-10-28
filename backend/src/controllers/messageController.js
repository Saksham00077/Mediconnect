const Message = require('../models/Message');
const Appointment = require('../models/Appointment');
const ApiError = require('../utils/ApiError');
const asyncHandler = require('../utils/asyncHandler');
const { createNotification } = require('../utils/notify');

/**
 * Helper to verify appointment participation
 */
const verifyAppointmentParticipant = async (appointmentId, user) => {
  const appointment = await Appointment.findById(appointmentId).populate({
    path: 'doctor',
    populate: { path: 'user', select: 'name _id' }
  });

  if (!appointment) {
    throw ApiError.notFound('Appointment not found');
  }

  const isPatient = appointment.patient.toString() === user._id.toString();
  const isDoctor =
    appointment.doctor &&
    appointment.doctor.user &&
    appointment.doctor.user._id.toString() === user._id.toString();
  const isAdmin = user.role === 'admin';

  if (!isPatient && !isDoctor && !isAdmin) {
    throw ApiError.forbidden('You are not a participant in this appointment consultation');
  }

  return { appointment, isPatient, isDoctor };
};

/**
 * Get messages for an appointment thread
 * Supports incremental fetching via ?after= query parameter (ISO date or message ID)
 * Marks other party's unread messages as read
 */
const getMessages = asyncHandler(async (req, res) => {
  const { appointmentId } = req.params;
  const { after } = req.query;

  const { isPatient, isDoctor } = await verifyAppointmentParticipant(appointmentId, req.user);

  const query = { appointment: appointmentId };
  if (after) {
    if (/^\d{4}-\d{2}-\d{2}/.test(after) || !isNaN(Date.parse(after))) {
      query.createdAt = { $gt: new Date(after) };
    } else {
      // If object id was passed
      query._id = { $gt: after };
    }
  }

  const messages = await Message.find(query)
    .populate('sender', 'name role')
    .sort({ createdAt: 1 });

  // Mark all unread messages from the OTHER party as read
  await Message.updateMany(
    {
      appointment: appointmentId,
      sender: { $ne: req.user._id },
      readAt: null
    },
    {
      $set: { readAt: new Date() }
    }
  );

  res.status(200).json({ messages });
});

/**
 * Send a message in an appointment thread
 */
const sendMessage = asyncHandler(async (req, res) => {
  const { appointmentId } = req.params;
  const { text } = req.body;

  if (!text || text.trim().length === 0) {
    throw ApiError.badRequest('Message text cannot be empty');
  }

  const { appointment, isPatient, isDoctor } = await verifyAppointmentParticipant(
    appointmentId,
    req.user
  );

  // Allowed while appointment is booked or completed (NOT cancelled or no_show)
  if (['cancelled', 'no_show'].includes(appointment.status)) {
    throw ApiError.badRequest(
      `Cannot send messages because this appointment is ${appointment.status}`
    );
  }

  const message = await Message.create({
    appointment: appointment._id,
    sender: req.user._id,
    senderRole: req.user.role,
    text: text.trim()
  });

  const populated = await Message.findById(message._id).populate('sender', 'name role');

  // Notify recipient
  const recipientId = isPatient
    ? appointment.doctor.user._id
    : appointment.patient;

  await createNotification({
    userId: recipientId,
    type: 'chat',
    title: `New message from ${req.user.name}`,
    body: text.length > 80 ? text.substring(0, 77) + '...' : text,
    link: `/appointments/${appointment._id}`
  });

  res.status(201).json({ message: populated });
});

/**
 * Unread message count summary per appointment for logged-in user
 */
const getUnreadSummary = asyncHandler(async (req, res) => {
  // Find appointments user is involved in
  let appointmentQuery = {};
  if (req.user.role === 'patient') {
    appointmentQuery = { patient: req.user._id };
  } else if (req.user.role === 'doctor') {
    const doctorProfile = req.doctorProfile;
    if (!doctorProfile) return res.status(200).json({ unreadCounts: {} });
    appointmentQuery = { doctor: doctorProfile._id };
  }

  const appointments = await Appointment.find(appointmentQuery).select('_id');
  const appointmentIds = appointments.map((a) => a._id);

  const unreadAggregation = await Message.aggregate([
    {
      $match: {
        appointment: { $in: appointmentIds },
        sender: { $ne: req.user._id },
        readAt: null
      }
    },
    {
      $group: {
        _id: '$appointment',
        count: { $sum: 1 }
      }
    }
  ]);

  const unreadCounts = {};
  let totalUnread = 0;
  unreadAggregation.forEach((item) => {
    unreadCounts[item._id.toString()] = item.count;
    totalUnread += item.count;
  });

  res.status(200).json({ unreadCounts, totalUnread });
});

module.exports = {
  getMessages,
  sendMessage,
  getUnreadSummary
};

