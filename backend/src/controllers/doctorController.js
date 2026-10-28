const { DateTime } = require('luxon');
const DoctorProfile = require('../models/DoctorProfile');
const Appointment = require('../models/Appointment');
const ApiError = require('../utils/ApiError');
const asyncHandler = require('../utils/asyncHandler');
const { getSlotsForDate, getNextAvailableSlot, DEFAULT_TIMEZONE, DEFAULT_HORIZON_DAYS } = require('../utils/slots');

/**
 * Public: List doctors with filtering, search, sorting, pagination, and nextAvailableSlot.
 */
const getDoctors = asyncHandler(async (req, res) => {
  const {
    specialisation,
    city,
    language,
    minFee,
    maxFee,
    minRating,
    q,
    sort = 'rating',
    page = 1,
    limit = 10
  } = req.query;

  const query = { isApproved: true };

  if (specialisation) {
    query.specialisation = new RegExp(`^${specialisation}$`, 'i');
  }

  if (city) {
    query.city = new RegExp(`^${city}$`, 'i');
  }

  if (language) {
    query.languages = { $in: [new RegExp(language, 'i')] };
  }

  if (minFee || maxFee) {
    query.fee = {};
    if (minFee) query.fee.$gte = Number(minFee);
    if (maxFee) query.fee.$lte = Number(maxFee);
  }

  if (minRating) {
    query['rating.avg'] = { $gte: Number(minRating) };
  }

  // Text search query across name, specialisation, city, bio
  if (q) {
    const regex = new RegExp(q, 'i');
    query.$or = [
      { specialisation: regex },
      { city: regex },
      { bio: regex },
      { qualifications: regex }
    ];
  }

  const pageNum = Math.max(1, parseInt(page, 10));
  const limitNum = Math.max(1, Math.min(50, parseInt(limit, 10)));

  // Sorting setup
  let sortOption = {};
  if (sort === 'rating') {
    sortOption = { 'rating.avg': -1, 'rating.count': -1 };
  } else if (sort === 'fee_asc') {
    sortOption = { fee: 1 };
  } else if (sort === 'fee_desc') {
    sortOption = { fee: -1 };
  } else if (sort === 'experience') {
    sortOption = { experienceYears: -1 };
  }

  // If search includes user name, we populate user
  let doctors = await DoctorProfile.find(query)
    .populate('user', 'name email phone')
    .sort(sortOption);

  // If user searched a doctor name via `q`, filter in-memory if name matches
  if (q) {
    const qLower = q.toLowerCase();
    doctors = doctors.filter((doc) => {
      const matchDoc = (doc.specialisation && doc.specialisation.toLowerCase().includes(qLower)) ||
        (doc.city && doc.city.toLowerCase().includes(qLower)) ||
        (doc.bio && doc.bio.toLowerCase().includes(qLower));
      const matchUser = doc.user && doc.user.name && doc.user.name.toLowerCase().includes(qLower);
      return matchDoc || matchUser;
    });
  }

  // Efficient batch computation of next available slots
  // 1. Fetch appointments across horizon for ALL returned doctors in ONE query
  const timezone = process.env.APP_TIMEZONE || DEFAULT_TIMEZONE;
  const horizonDays = Number(process.env.BOOKING_HORIZON_DAYS || DEFAULT_HORIZON_DAYS);
  const now = DateTime.now().setZone(timezone);
  const startHorizon = now.startOf('day').toJSDate();
  const endHorizon = now.plus({ days: horizonDays }).endOf('day').toJSDate();

  const doctorIds = doctors.map((d) => d._id);
  const allHorizonApts = await Appointment.find({
    doctor: { $in: doctorIds },
    status: 'booked',
    startAt: { $gte: startHorizon, $lte: endHorizon }
  }).select('doctor startAt status');

  // Group appointments by doctor ID
  const aptsByDoctor = new Map();
  for (const apt of allHorizonApts) {
    const key = apt.doctor.toString();
    if (!aptsByDoctor.has(key)) aptsByDoctor.set(key, []);
    aptsByDoctor.get(key).push(apt);
  }

  // 2. Attach nextAvailableSlot
  const doctorsWithSlots = await Promise.all(
    doctors.map(async (doc) => {
      const doctorApts = aptsByDoctor.get(doc._id.toString()) || [];
      const nextSlot = await getNextAvailableSlot(doc, doctorApts, now);
      const docObj = doc.toObject();
      docObj.nextAvailableSlot = nextSlot;
      return docObj;
    })
  );

  // If sorted by nextAvailable, sort slots
  if (sort === 'nextAvailable') {
    doctorsWithSlots.sort((a, b) => {
      if (!a.nextAvailableSlot) return 1;
      if (!b.nextAvailableSlot) return -1;
      return new Date(a.nextAvailableSlot.startAt) - new Date(b.nextAvailableSlot.startAt);
    });
  }

  // Pagination in memory
  const total = doctorsWithSlots.length;
  const startIndex = (pageNum - 1) * limitNum;
  const paginatedResults = doctorsWithSlots.slice(startIndex, startIndex + limitNum);

  res.status(200).json({
    data: paginatedResults,
    pagination: {
      total,
      page: pageNum,
      limit: limitNum,
      totalPages: Math.ceil(total / limitNum) || 1
    }
  });
});

/**
 * Public: Filter metadata (unique specialisations, cities, languages)
 */
const getFilterMeta = asyncHandler(async (req, res) => {
  const approvedDocs = await DoctorProfile.find({ isApproved: true }).select(
    'specialisation city languages'
  );

  const specialisations = [...new Set(approvedDocs.map((d) => d.specialisation).filter(Boolean))].sort();
  const cities = [...new Set(approvedDocs.map((d) => d.city).filter(Boolean))].sort();
  const languageSet = new Set();
  approvedDocs.forEach((d) => {
    (d.languages || []).forEach((l) => languageSet.add(l));
  });
  const languages = [...languageSet].sort();

  res.status(200).json({
    specialisations,
    cities,
    languages
  });
});

/**
 * Public: Doctor details + recent patient reviews
 */
const getDoctorById = asyncHandler(async (req, res) => {
  const doctor = await DoctorProfile.findById(req.params.id).populate('user', 'name email phone');
  if (!doctor) {
    throw ApiError.notFound('Doctor profile not found');
  }

  // Fetch recent reviews from completed appointments
  const reviews = await Appointment.find({
    doctor: doctor._id,
    status: 'completed',
    'rating.stars': { $exists: true, $ne: null }
  })
    .populate('patient', 'name')
    .sort({ completedAt: -1 })
    .limit(10)
    .select('rating completedAt patient');

  // Shorten patient name to "First Name + Initial" for privacy
  const sanitizedReviews = reviews.map((r) => {
    let patientDisplayName = 'Patient';
    if (r.patient && r.patient.name) {
      const parts = r.patient.name.trim().split(/\s+/);
      patientDisplayName = parts.length > 1 ? `${parts[0]} ${parts[1][0]}.` : parts[0];
    }
    return {
      _id: r._id,
      stars: r.rating.stars,
      comment: r.rating.comment,
      completedAt: r.completedAt,
      patientName: patientDisplayName
    };
  });

  const docObj = doctor.toObject();
  docObj.reviews = sanitizedReviews;

  res.status(200).json(docObj);
});

/**
 * Public: Get computed slots for a specific date
 */
const getDoctorSlots = asyncHandler(async (req, res) => {
  const { date } = req.query;
  if (!date || !/^\d{4}-\d{2}-\d{2}$/.test(date)) {
    throw ApiError.badRequest('Query param date in YYYY-MM-DD format is required');
  }

  const doctor = await DoctorProfile.findById(req.params.id);
  if (!doctor) {
    throw ApiError.notFound('Doctor profile not found');
  }

  if (!doctor.isApproved) {
    throw ApiError.badRequest('Doctor is currently not available for bookings');
  }

  const slots = await getSlotsForDate(doctor, date);
  res.status(200).json({ date, slots });
});

/**
 * Doctor Self-Service: Get current doctor's profile
 */
const getMyProfile = asyncHandler(async (req, res) => {
  const doctor = await DoctorProfile.findOne({ user: req.user._id }).populate('user', 'name email phone');
  if (!doctor) {
    throw ApiError.notFound('Doctor profile not found for this user');
  }
  res.status(200).json(doctor);
});

/**
 * Doctor Self-Service: Update profile details
 */
const updateMyProfile = asyncHandler(async (req, res) => {
  const doctor = await DoctorProfile.findOne({ user: req.user._id });
  if (!doctor) {
    throw ApiError.notFound('Doctor profile not found');
  }

  const { specialisation, qualifications, experienceYears, city, languages, fee, bio } = req.body;

  if (specialisation !== undefined) doctor.specialisation = specialisation;
  if (qualifications !== undefined) doctor.qualifications = qualifications;
  if (experienceYears !== undefined) doctor.experienceYears = Number(experienceYears);
  if (city !== undefined) doctor.city = city;
  if (languages !== undefined) {
    doctor.languages = Array.isArray(languages) ? languages : languages.split(',').map((s) => s.trim());
  }
  if (fee !== undefined) doctor.fee = Number(fee);
  if (bio !== undefined) doctor.bio = bio;

  await doctor.save();

  // If user changed their name/phone
  if (req.body.name || req.body.phone) {
    const user = await req.user.constructor.findById(req.user._id);
    if (req.body.name) user.name = req.body.name;
    if (req.body.phone) user.phone = req.body.phone;
    await user.save();
  }

  const updated = await DoctorProfile.findById(doctor._id).populate('user', 'name email phone');
  res.status(200).json({
    message: 'Profile updated successfully',
    doctor: updated
  });
});

/**
 * Doctor Self-Service: Get availability schedule
 */
const getMyAvailability = asyncHandler(async (req, res) => {
  const doctor = await DoctorProfile.findOne({ user: req.user._id });
  if (!doctor) {
    throw ApiError.notFound('Doctor profile not found');
  }
  res.status(200).json({
    availability: doctor.availability,
    slotDurationMins: doctor.slotDurationMins,
    leaves: doctor.leaves
  });
});

/**
 * Doctor Self-Service: Update availability schedule
 */
const updateMyAvailability = asyncHandler(async (req, res) => {
  const doctor = await DoctorProfile.findOne({ user: req.user._id });
  if (!doctor) {
    throw ApiError.notFound('Doctor profile not found');
  }

  const { availability, slotDurationMins } = req.body;

  if (slotDurationMins !== undefined) {
    doctor.slotDurationMins = Number(slotDurationMins);
  }

  if (availability !== undefined) {
    doctor.availability = availability;
  }

  await doctor.save();
  res.status(200).json({
    message: 'Availability updated successfully',
    availability: doctor.availability,
    slotDurationMins: doctor.slotDurationMins
  });
});

/**
 * Doctor Self-Service: Add leave date
 * Returns conflicts (already-booked appointments on that date) without auto-cancelling.
 */
const addLeave = asyncHandler(async (req, res) => {
  const { date, reason } = req.body;
  if (!date || !/^\d{4}-\d{2}-\d{2}$/.test(date)) {
    throw ApiError.badRequest('Leave date in YYYY-MM-DD format is required');
  }

  const doctor = await DoctorProfile.findOne({ user: req.user._id });
  if (!doctor) {
    throw ApiError.notFound('Doctor profile not found');
  }

  // Check if leave already exists for this date
  const exists = doctor.leaves.some((l) => l.date === date);
  if (!exists) {
    doctor.leaves.push({ date, reason: reason || 'On leave' });
    await doctor.save();
  }

  // Find any already-booked appointments on this date
  const timezone = process.env.APP_TIMEZONE || DEFAULT_TIMEZONE;
  const dayStart = DateTime.fromISO(date, { zone: timezone }).startOf('day').toJSDate();
  const dayEnd = DateTime.fromISO(date, { zone: timezone }).endOf('day').toJSDate();

  const conflicts = await Appointment.find({
    doctor: doctor._id,
    status: 'booked',
    startAt: { $gte: dayStart, $lte: dayEnd }
  }).populate('patient', 'name email phone');

  res.status(200).json({
    message: `Leave recorded for ${date}`,
    leaves: doctor.leaves,
    conflicts: conflicts.map((c) => ({
      appointmentId: c._id,
      patientName: c.patient ? c.patient.name : 'Unknown',
      patientPhone: c.patient ? c.patient.phone : '',
      startAt: c.startAt,
      reason: c.reason
    }))
  });
});

/**
 * Doctor Self-Service: Remove leave date
 */
const removeLeave = asyncHandler(async (req, res) => {
  const { date } = req.params;
  const doctor = await DoctorProfile.findOne({ user: req.user._id });
  if (!doctor) {
    throw ApiError.notFound('Doctor profile not found');
  }

  doctor.leaves = doctor.leaves.filter((l) => l.date !== date);
  await doctor.save();

  res.status(200).json({
    message: `Leave for ${date} removed`,
    leaves: doctor.leaves
  });
});

/**
 * Doctor Self-Service: Get daily schedule with appointments attached to slots
 */
const getMyDaySchedule = asyncHandler(async (req, res) => {
  const { date } = req.query;
  if (!date || !/^\d{4}-\d{2}-\d{2}$/.test(date)) {
    throw ApiError.badRequest('Date query parameter in YYYY-MM-DD format is required');
  }

  const doctor = await DoctorProfile.findOne({ user: req.user._id });
  if (!doctor) {
    throw ApiError.notFound('Doctor profile not found');
  }

  const timezone = process.env.APP_TIMEZONE || DEFAULT_TIMEZONE;
  const dayStart = DateTime.fromISO(date, { zone: timezone }).startOf('day').toJSDate();
  const dayEnd = DateTime.fromISO(date, { zone: timezone }).endOf('day').toJSDate();

  // Find appointments on this day
  const appointments = await Appointment.find({
    doctor: doctor._id,
    startAt: { $gte: dayStart, $lte: dayEnd }
  })
    .populate('patient', 'name email phone')
    .sort({ startAt: 1 });

  // Compute all potential slots for this day
  const slots = await getSlotsForDate(doctor, date, appointments);

  // Annotate each slot with appointment if booked
  const aptByStartTime = new Map();
  appointments.forEach((apt) => {
    aptByStartTime.set(new Date(apt.startAt).getTime(), apt);
  });

  const annotatedSlots = slots.map((slot) => {
    const slotTime = new Date(slot.startAt).getTime();
    const apt = aptByStartTime.get(slotTime);
    return {
      ...slot,
      appointment: apt
        ? {
            id: apt._id,
            status: apt.status,
            patient: apt.patient,
            reason: apt.reason,
            fee: apt.fee
          }
        : null
    };
  });

  res.status(200).json({
    date,
    slots: annotatedSlots,
    totalAppointments: appointments.length
  });
});

/**
 * Doctor Self-Service: Get 7-day schedule grid
 */
const getMyWeekSchedule = asyncHandler(async (req, res) => {
  const { start } = req.query;
  const timezone = process.env.APP_TIMEZONE || DEFAULT_TIMEZONE;
  const startDate = start
    ? DateTime.fromISO(start, { zone: timezone }).startOf('day')
    : DateTime.now().setZone(timezone).startOf('day');

  const doctor = await DoctorProfile.findOne({ user: req.user._id });
  if (!doctor) {
    throw ApiError.notFound('Doctor profile not found');
  }

  const endDate = startDate.plus({ days: 7 }).endOf('day');

  const appointments = await Appointment.find({
    doctor: doctor._id,
    startAt: { $gte: startDate.toJSDate(), $lte: endDate.toJSDate() }
  }).populate('patient', 'name');

  const days = [];
  for (let i = 0; i < 7; i++) {
    const dayDate = startDate.plus({ days: i });
    const dateStr = dayDate.toISODate();
    const slots = await getSlotsForDate(doctor, dateStr, appointments);
    days.push({
      date: dateStr,
      dayOfWeek: dayDate.weekdayShort,
      slots
    });
  }

  res.status(200).json({ days });
});

/**
 * Doctor Self-Service: Summary metrics for dashboard
 */
const getMySummary = asyncHandler(async (req, res) => {
  const doctor = await DoctorProfile.findOne({ user: req.user._id });
  if (!doctor) {
    throw ApiError.notFound('Doctor profile not found');
  }

  const timezone = process.env.APP_TIMEZONE || DEFAULT_TIMEZONE;
  const todayStart = DateTime.now().setZone(timezone).startOf('day').toJSDate();
  const todayEnd = DateTime.now().setZone(timezone).endOf('day').toJSDate();

  const [todayCount, upcomingCount, completedCount, distinctPatients] = await Promise.all([
    Appointment.countDocuments({
      doctor: doctor._id,
      startAt: { $gte: todayStart, $lte: todayEnd },
      status: { $in: ['booked', 'completed'] }
    }),
    Appointment.countDocuments({
      doctor: doctor._id,
      startAt: { $gt: todayEnd },
      status: 'booked'
    }),
    Appointment.countDocuments({
      doctor: doctor._id,
      status: 'completed'
    }),
    Appointment.distinct('patient', { doctor: doctor._id })
  ]);

  res.status(200).json({
    todayCount,
    upcomingCount,
    completedCount,
    totalUniquePatients: distinctPatients.length,
    rating: doctor.rating
  });
});

module.exports = {
  getDoctors,
  getFilterMeta,
  getDoctorById,
  getDoctorSlots,
  getMyProfile,
  updateMyProfile,
  getMyAvailability,
  updateMyAvailability,
  addLeave,
  removeLeave,
  getMyDaySchedule,
  getMyWeekSchedule,
  getMySummary
};

