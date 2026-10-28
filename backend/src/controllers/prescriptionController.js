const Prescription = require('../models/Prescription');
const Appointment = require('../models/Appointment');
const PatientProfile = require('../models/PatientProfile');
const DoctorProfile = require('../models/DoctorProfile');
const ApiError = require('../utils/ApiError');
const asyncHandler = require('../utils/asyncHandler');
const { createNotification } = require('../utils/notify');

/**
 * Doctor: Create or Update Prescription for an Appointment
 * Validates doctor ownership, consultation start/completion, and checks patient allergies.
 */
const savePrescription = asyncHandler(async (req, res) => {
  const { appointmentId, diagnosis, medicines, advice, followUpDate } = req.body;

  if (!appointmentId || !diagnosis) {
    throw ApiError.badRequest('appointmentId and diagnosis are required');
  }

  const appointment = await Appointment.findById(appointmentId).populate('doctor');
  if (!appointment) {
    throw ApiError.notFound('Appointment not found');
  }

  // Verify doctor ownership
  if (appointment.doctor.user.toString() !== req.user._id.toString()) {
    throw ApiError.forbidden('Only the consulting doctor can issue prescriptions for this appointment');
  }

  // Check appointment status: must be booked-and-started OR completed
  if (appointment.status === 'cancelled' || appointment.status === 'no_show') {
    throw ApiError.badRequest(
      `Cannot create a prescription for an appointment that is ${appointment.status}`
    );
  }

  const now = new Date();
  if (appointment.status === 'booked' && now < new Date(appointment.startAt)) {
    throw ApiError.badRequest(
      'Prescriptions can only be issued during or after the consultation time'
    );
  }

  // Check patient allergies for non-blocking allergy warnings
  const patientProfile = await PatientProfile.findOne({ user: appointment.patient });
  const warnings = [];

  if (patientProfile && patientProfile.allergies && patientProfile.allergies.length > 0) {
    const allergyList = patientProfile.allergies.map((a) => a.trim().toLowerCase());
    (medicines || []).forEach((med) => {
      if (med.name) {
        const medNameLower = med.name.toLowerCase();
        for (const allergy of allergyList) {
          if (medNameLower.includes(allergy) || allergy.includes(medNameLower)) {
            warnings.push(
              `Potential Allergy Conflict: Patient has recorded allergy "${allergy}" which matches prescribed medicine "${med.name}".`
            );
          }
        }
      }
    });
  }

  // One prescription per appointment - upsert pattern
  let prescription = await Prescription.findOne({ appointment: appointmentId });

  if (prescription) {
    prescription.diagnosis = diagnosis.trim();
    prescription.medicines = medicines || [];
    prescription.advice = advice ? advice.trim() : '';
    prescription.followUpDate = followUpDate || null;
    await prescription.save();
  } else {
    prescription = await Prescription.create({
      appointment: appointment._id,
      doctor: appointment.doctor._id,
      patient: appointment.patient,
      diagnosis: diagnosis.trim(),
      medicines: medicines || [],
      advice: advice ? advice.trim() : '',
      followUpDate: followUpDate || null
    });
  }

  // Notify patient
  await createNotification({
    userId: appointment.patient,
    type: 'prescription',
    title: 'New Prescription Available',
    body: `Dr. ${req.user.name} has issued your medical prescription.`,
    link: `/appointments/${appointment._id}`
  });

  const populated = await Prescription.findById(prescription._id)
    .populate({
      path: 'doctor',
      populate: { path: 'user', select: 'name email phone' }
    })
    .populate('patient', 'name email phone')
    .populate('appointment', 'startAt endAt reason fee');

  res.status(200).json({
    message: 'Prescription saved successfully',
    prescription: populated,
    warnings: warnings.length > 0 ? warnings : undefined
  });
});

/**
 * Get prescription by appointment ID
 */
const getPrescriptionByAppointment = asyncHandler(async (req, res) => {
  const { appointmentId } = req.params;

  const prescription = await Prescription.findOne({ appointment: appointmentId })
    .populate({
      path: 'doctor',
      populate: { path: 'user', select: 'name email phone' }
    })
    .populate('patient', 'name email phone')
    .populate('appointment', 'startAt endAt reason fee');

  if (!prescription) {
    return res.status(200).json({ prescription: null });
  }

  // Ownership check
  const isPatient = prescription.patient._id.toString() === req.user._id.toString();
  const isDoctor =
    prescription.doctor &&
    prescription.doctor.user &&
    prescription.doctor.user._id.toString() === req.user._id.toString();
  const isAdmin = req.user.role === 'admin';

  if (!isPatient && !isDoctor && !isAdmin) {
    throw ApiError.forbidden('You are not authorized to view this prescription');
  }

  res.status(200).json({ prescription });
});

/**
 * Patient: List my prescriptions
 */
const getMyPrescriptions = asyncHandler(async (req, res) => {
  const prescriptions = await Prescription.find({ patient: req.user._id })
    .populate({
      path: 'doctor',
      populate: { path: 'user', select: 'name email phone' }
    })
    .populate('appointment', 'startAt endAt reason fee')
    .sort({ createdAt: -1 });

  res.status(200).json({ prescriptions });
});

module.exports = {
  savePrescription,
  getPrescriptionByAppointment,
  getMyPrescriptions
};

