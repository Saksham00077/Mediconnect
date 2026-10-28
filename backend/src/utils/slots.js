const { DateTime } = require('luxon');
const Appointment = require('../models/Appointment');

const DEFAULT_TIMEZONE = process.env.APP_TIMEZONE || 'Asia/Kolkata';
const DEFAULT_MIN_NOTICE_MINS = Number(process.env.MIN_NOTICE_MINS || 60);
const DEFAULT_HORIZON_DAYS = Number(process.env.BOOKING_HORIZON_DAYS || 14);

/**
 * Normalizes Luxon weekday (1=Mon ... 7=Sun) to standard 0-6 (0=Sun, 1=Mon, ..., 6=Sat)
 */
const getDayOfWeek0to6 = (luxonDateTime) => {
  return luxonDateTime.weekday % 7;
};

/**
 * Computes on-demand slots for a doctor on a specific date (YYYY-MM-DD).
 * 
 * Logic:
 * 1. Return empty array if the date falls on doctor's scheduled leaves.
 * 2. Find weekly availability rules for that day of week (0-6).
 * 3. Step in slotDurationMins increments from startTime to endTime.
 * 4. Filter out slots that are in the past or within MIN_NOTICE_MINS from now.
 * 5. Mark slots as available: false if already booked in an active appointment.
 * 
 * @param {Object} doctorProfile - Mongoose doc or plain object with availability, leaves, slotDurationMins
 * @param {string} dateStr - 'YYYY-MM-DD'
 * @param {Array} [bookedAppointments=null] - Optional preloaded appointments to avoid N+1 DB queries
 * @param {DateTime} [nowDateTime=null] - Optional reference time for testing
 * @returns {Promise<Array<{startAt: string, endAt: string, available: boolean}>>}
 */
const getSlotsForDate = async (doctorProfile, dateStr, bookedAppointments = null, nowDateTime = null) => {
  const timezone = process.env.APP_TIMEZONE || DEFAULT_TIMEZONE;
  const minNoticeMins = Number(process.env.MIN_NOTICE_MINS || DEFAULT_MIN_NOTICE_MINS);

  // Reference now
  const now = nowDateTime
    ? (DateTime.isDateTime(nowDateTime) ? nowDateTime.setZone(timezone) : DateTime.fromJSDate(nowDateTime, { zone: timezone }))
    : DateTime.now().setZone(timezone);

  // Target date parsed at midnight in the application timezone
  const targetDate = DateTime.fromISO(dateStr, { zone: timezone }).startOf('day');
  if (!targetDate.isValid) {
    return [];
  }

  // 1. Check leaves
  const leaves = doctorProfile.leaves || [];
  const isOnLeave = leaves.some((l) => l.date === dateStr);
  if (isOnLeave) {
    return [];
  }

  // 2. Availability for this weekday (0 = Sunday, 1 = Monday, ..., 6 = Saturday)
  const dayOfWeek = getDayOfWeek0to6(targetDate);
  const availabilityRanges = (doctorProfile.availability || []).filter(
    (r) => r.dayOfWeek === dayOfWeek
  );

  if (availabilityRanges.length === 0) {
    return [];
  }

  const slotDuration = doctorProfile.slotDurationMins || 30;
  const cutoffTime = now.plus({ minutes: minNoticeMins });

  // 3. Generate candidate slots across all ranges for the day
  const candidateSlots = [];

  for (const range of availabilityRanges) {
    const [startH, startM] = range.startTime.split(':').map(Number);
    const [endH, endM] = range.endTime.split(':').map(Number);

    let slotStart = targetDate.set({ hour: startH, minute: startM, second: 0, millisecond: 0 });
    const rangeEnd = targetDate.set({ hour: endH, minute: endM, second: 0, millisecond: 0 });

    while (slotStart.plus({ minutes: slotDuration }) <= rangeEnd) {
      const slotEnd = slotStart.plus({ minutes: slotDuration });

      // Step 3: Remove slots in past or less than MIN_NOTICE_MINS from now
      if (slotStart >= cutoffTime) {
        candidateSlots.push({
          startAt: slotStart.toUTC().toISO(),
          endAt: slotEnd.toUTC().toISO(),
          startEpoch: slotStart.toMillis(),
          endEpoch: slotEnd.toMillis()
        });
      }

      slotStart = slotEnd;
    }
  }

  if (candidateSlots.length === 0) {
    return [];
  }

  // Sort candidate slots chronologically
  candidateSlots.sort((a, b) => a.startEpoch - b.startEpoch);

  // 4. Load booked appointments if not passed in
  let bookedTimesSet = new Set();

  if (bookedAppointments) {
    bookedAppointments.forEach((apt) => {
      if (apt.status === 'booked') {
        const aptTime = new Date(apt.startAt).getTime();
        bookedTimesSet.add(aptTime);
      }
    });
  } else if (doctorProfile._id) {
    const dayStartUTC = targetDate.startOf('day').toJSDate();
    const dayEndUTC = targetDate.endOf('day').toJSDate();

    const activeApts = await Appointment.find({
      doctor: doctorProfile._id,
      status: 'booked',
      startAt: { $gte: dayStartUTC, $lte: dayEndUTC }
    }).select('startAt');

    activeApts.forEach((apt) => {
      bookedTimesSet.add(new Date(apt.startAt).getTime());
    });
  }

  // 5. Build final return payload
  return candidateSlots.map((slot) => {
    const isBooked = bookedTimesSet.has(slot.startEpoch);
    return {
      startAt: slot.startAt,
      endAt: slot.endAt,
      available: !isBooked
    };
  });
};

/**
 * Searches the next BOOKING_HORIZON_DAYS to find the doctor's earliest available slot.
 * Efficient: accepts pre-fetched appointments in the horizon or fetches once.
 * 
 * @param {Object} doctorProfile
 * @param {Array} [horizonAppointments=null]
 * @param {DateTime} [nowDateTime=null]
 * @returns {Promise<{startAt: string, endAt: string, date: string}|null>}
 */
const getNextAvailableSlot = async (doctorProfile, horizonAppointments = null, nowDateTime = null) => {
  const timezone = process.env.APP_TIMEZONE || DEFAULT_TIMEZONE;
  const horizonDays = Number(process.env.BOOKING_HORIZON_DAYS || DEFAULT_HORIZON_DAYS);

  const now = nowDateTime
    ? (DateTime.isDateTime(nowDateTime) ? nowDateTime.setZone(timezone) : DateTime.fromJSDate(nowDateTime, { zone: timezone }))
    : DateTime.now().setZone(timezone);

  // Fetch appointments once for the whole horizon if not passed
  let bookedApts = horizonAppointments;
  if (!bookedApts && doctorProfile._id) {
    const startHorizon = now.startOf('day').toJSDate();
    const endHorizon = now.plus({ days: horizonDays }).endOf('day').toJSDate();

    bookedApts = await Appointment.find({
      doctor: doctorProfile._id,
      status: 'booked',
      startAt: { $gte: startHorizon, $lte: endHorizon }
    }).select('startAt status');
  }

  for (let i = 0; i < horizonDays; i++) {
    const checkDate = now.plus({ days: i });
    const dateStr = checkDate.toISODate();

    const slots = await getSlotsForDate(doctorProfile, dateStr, bookedApts, now);
    const firstAvailable = slots.find((s) => s.available);
    if (firstAvailable) {
      return {
        ...firstAvailable,
        date: dateStr
      };
    }
  }

  return null;
};

module.exports = {
  DEFAULT_TIMEZONE,
  DEFAULT_MIN_NOTICE_MINS,
  DEFAULT_HORIZON_DAYS,
  getDayOfWeek0to6,
  getSlotsForDate,
  getNextAvailableSlot
};

