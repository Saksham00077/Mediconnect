const request = require('supertest');
const mongoose = require('mongoose');
const { MongoMemoryServer } = require('mongodb-memory-server');
const { DateTime } = require('luxon');
const jwt = require('jsonwebtoken');

// Set test environment variables before requiring app
process.env.NODE_ENV = 'test';
process.env.JWT_SECRET = 'test_jwt_secret_key_1234567890';
process.env.APP_TIMEZONE = 'Asia/Kolkata';
process.env.MIN_NOTICE_MINS = '60';
process.env.BOOKING_HORIZON_DAYS = '14';

const app = require('../server');
const User = require('../src/models/User');
const DoctorProfile = require('../src/models/DoctorProfile');
const Appointment = require('../src/models/Appointment');
const Message = require('../src/models/Message');
const Prescription = require('../src/models/Prescription');
const PatientProfile = require('../src/models/PatientProfile');
const { getSlotsForDate, getDayOfWeek0to6 } = require('../src/utils/slots');

let mongoServer;

const createToken = (user) => {
  return jwt.sign(
    { id: user._id, role: user.role, email: user.email },
    process.env.JWT_SECRET,
    { expiresIn: '1d' }
  );
};

beforeAll(async () => {
  mongoServer = await MongoMemoryServer.create();
  const uri = mongoServer.getUri();
  await mongoose.connect(uri);

  // CRITICAL: Ensure indexes are built in mongodb-memory-server before tests run
  await Appointment.init();
  await DoctorProfile.init();
  await User.init();
});

afterAll(async () => {
  await mongoose.disconnect();
  await mongoServer.stop();
});

beforeEach(async () => {
  // Clear collections between tests
  const collections = mongoose.connection.collections;
  for (const key in collections) {
    await collections[key].deleteMany({});
  }
});

describe('MediConnect Comprehensive Test Suite', () => {
  // ==========================================
  // 1. SLOT GENERATION UNIT TESTS
  // ==========================================
  describe('Slot Generation Logic (utils/slots.js)', () => {
    const sampleDoctor = {
      slotDurationMins: 30,
      availability: [
        // Monday (dayOfWeek: 1) 09:00 - 11:00 -> 4 slots: 09:00, 09:30, 10:00, 10:30
        { dayOfWeek: 1, startTime: '09:00', endTime: '11:00' }
      ],
      leaves: [{ date: '2026-11-09', reason: 'Annual Leave' }]
    };

    it('should map weekday correctly and generate slots within ranges', async () => {
      // 2026-11-02 is a Monday (dayOfWeek 1)
      const testDate = '2026-11-02';
      // Pass a reference now that is days before so nothing is filtered by minNotice
      const refNow = DateTime.fromISO('2026-10-25T08:00:00', { zone: 'Asia/Kolkata' });

      const slots = await getSlotsForDate(sampleDoctor, testDate, [], refNow);
      expect(slots).toHaveLength(4);
      expect(slots[0].available).toBe(true);
      expect(slots[3].available).toBe(true);
    });

    it('should return empty array on a scheduled leave date', async () => {
      // 2026-11-09 is a Monday, but on leave
      const leaveDate = '2026-11-09';
      const refNow = DateTime.fromISO('2026-10-25T08:00:00', { zone: 'Asia/Kolkata' });

      const slots = await getSlotsForDate(sampleDoctor, leaveDate, [], refNow);
      expect(slots).toEqual([]);
    });

    it('should mark already-booked slots as available: false', async () => {
      const testDate = '2026-11-02';
      const refNow = DateTime.fromISO('2026-10-25T08:00:00', { zone: 'Asia/Kolkata' });

      // Simulate a booked appointment at 09:30 AM local time
      const bookedStart = DateTime.fromISO('2026-11-02T09:30:00', { zone: 'Asia/Kolkata' }).toJSDate();
      const bookedApts = [{ startAt: bookedStart, status: 'booked' }];

      const slots = await getSlotsForDate(sampleDoctor, testDate, bookedApts, refNow);
      expect(slots).toHaveLength(4);
      expect(slots[0].available).toBe(true); // 09:00
      expect(slots[1].available).toBe(false); // 09:30 is booked!
      expect(slots[2].available).toBe(true); // 10:00
    });

    it('should exclude slots in the past or within MIN_NOTICE_MINS', async () => {
      const testDate = '2026-11-02';
      // Reference time is 09:15 AM on that same day.
      // With MIN_NOTICE_MINS = 60, cutoff is 10:15 AM.
      // So 09:00, 09:30, and 10:00 must be excluded. Only 10:30 remains!
      const refNow = DateTime.fromISO('2026-11-02T09:15:00', { zone: 'Asia/Kolkata' });

      const slots = await getSlotsForDate(sampleDoctor, testDate, [], refNow);
      expect(slots).toHaveLength(1);
      // The remaining slot must be 10:30 AM
      const remainingTime = DateTime.fromISO(slots[0].startAt).setZone('Asia/Kolkata').toFormat('HH:mm');
      expect(remainingTime).toBe('10:30');
    });
  });

  // ==========================================
  // 2. CONCURRENCY: 10 PARALLEL BOOKINGS
  // ==========================================
  describe('Double-Booking Prevention Concurrency Test', () => {
    it('should allow exactly 1 successful booking and return 409 for the other 9 parallel attempts', async () => {
      // Create Doctor User & Profile
      const docUser = await User.create({
        name: 'Dr. Concurrency Doctor',
        email: 'doc.concurrency@demo.com',
        passwordHash: 'dummyHash',
        role: 'doctor'
      });

      // Target appointment date: Next Wednesday 10:00 AM
      const aptDt = DateTime.now().setZone('Asia/Kolkata').plus({ days: 3 }).set({
        hour: 10,
        minute: 0,
        second: 0,
        millisecond: 0
      });
      const dayOfWeek = getDayOfWeek0to6(aptDt);

      const doctorProfile = await DoctorProfile.create({
        user: docUser._id,
        specialisation: 'General Physician',
        city: 'Mumbai',
        fee: 500,
        regNumber: 'DOC-12345',
        isApproved: true,
        slotDurationMins: 30,
        availability: [{ dayOfWeek, startTime: '09:00', endTime: '12:00' }]
      });

      // Create 10 distinct patients and generate their JWT tokens
      const patientTokens = [];
      for (let i = 1; i <= 10; i++) {
        const patient = await User.create({
          name: `Patient ${i}`,
          email: `patient_concurrent_${i}@demo.com`,
          passwordHash: 'dummyHash',
          role: 'patient'
        });
        patientTokens.push(createToken(patient));
      }

      const targetIso = aptDt.toUTC().toISO();

      // Launch 10 simultaneous booking requests for the exact same slot
      const bookingPromises = patientTokens.map((token) =>
        request(app)
          .post('/api/appointments')
          .set('Authorization', `Bearer ${token}`)
          .send({
            doctorId: doctorProfile._id.toString(),
            startAt: targetIso,
            reason: 'Simultaneous appointment test'
          })
      );

      const responses = await Promise.all(bookingPromises);

      const successResponses = responses.filter((r) => r.status === 201);
      const conflictResponses = responses.filter((r) => r.status === 409);

      expect(successResponses).toHaveLength(1);
      expect(conflictResponses).toHaveLength(9);
      expect(conflictResponses[0].body.message).toMatch(
        /This slot was just booked by someone else/i
      );

      // Verify that exactly 1 appointment exists in the database
      const dbAppointments = await Appointment.find({
        doctor: doctorProfile._id,
        startAt: new Date(targetIso),
        status: 'booked'
      });
      expect(dbAppointments).toHaveLength(1);
    });
  });

  // ==========================================
  // 3. CANCEL & RESCHEDULE BUSINESS RULES
  // ==========================================
  describe('Cancellation and Rescheduling Rules', () => {
    let patient, patientToken, doctorUser, doctorToken, doctorProfile;

    beforeEach(async () => {
      patient = await User.create({
        name: 'John Patient',
        email: 'john@patient.com',
        passwordHash: 'dummyHash',
        role: 'patient'
      });
      patientToken = createToken(patient);

      doctorUser = await User.create({
        name: 'Dr. Jane Doctor',
        email: 'jane@doctor.com',
        passwordHash: 'dummyHash',
        role: 'doctor'
      });
      doctorToken = createToken(doctorUser);

      doctorProfile = await DoctorProfile.create({
        user: doctorUser._id,
        specialisation: 'Dermatologist',
        city: 'Delhi',
        fee: 700,
        regNumber: 'DOC-999',
        isApproved: true,
        slotDurationMins: 30,
        availability: [0, 1, 2, 3, 4, 5, 6].map((d) => ({
          dayOfWeek: d,
          startTime: '08:00',
          endTime: '20:00'
        }))
      });
    });

    it('should reject patient cancellation within 2 hours of appointment start time', async () => {
      // Scheduled 1 hour from now
      const startAt = new Date(Date.now() + 60 * 60 * 1000);
      const apt = await Appointment.create({
        patient: patient._id,
        doctor: doctorProfile._id,
        startAt,
        endAt: new Date(startAt.getTime() + 30 * 60 * 1000),
        reason: 'Skin allergy',
        fee: 700,
        status: 'booked'
      });

      const res = await request(app)
        .patch(`/api/appointments/${apt._id}/cancel`)
        .set('Authorization', `Bearer ${patientToken}`)
        .send({ reason: 'Emergency' });

      expect(res.status).toBe(400);
      expect(res.body.message).toMatch(/at least 2 hours before/i);
    });

    it('should allow patient cancellation more than 2 hours before start time', async () => {
      // Scheduled 5 hours from now
      const startAt = new Date(Date.now() + 5 * 60 * 60 * 1000);
      const apt = await Appointment.create({
        patient: patient._id,
        doctor: doctorProfile._id,
        startAt,
        endAt: new Date(startAt.getTime() + 30 * 60 * 1000),
        reason: 'Skin allergy',
        fee: 700,
        status: 'booked'
      });

      const res = await request(app)
        .patch(`/api/appointments/${apt._id}/cancel`)
        .set('Authorization', `Bearer ${patientToken}`)
        .send({ reason: 'Schedule clash' });

      expect(res.status).toBe(200);
      expect(res.body.appointment.status).toBe('cancelled');
    });

    it('should allow doctor to cancel anytime provided a reason is given', async () => {
      // Scheduled 30 minutes from now
      const startAt = new Date(Date.now() + 30 * 60 * 1000);
      const apt = await Appointment.create({
        patient: patient._id,
        doctor: doctorProfile._id,
        startAt,
        endAt: new Date(startAt.getTime() + 30 * 60 * 1000),
        reason: 'Skin allergy',
        fee: 700,
        status: 'booked'
      });

      // Doctor cancellation without reason fails
      const noReasonRes = await request(app)
        .patch(`/api/appointments/${apt._id}/cancel`)
        .set('Authorization', `Bearer ${doctorToken}`)
        .send({ reason: '' });
      expect(noReasonRes.status).toBe(400);

      // Doctor cancellation with reason succeeds
      const okRes = await request(app)
        .patch(`/api/appointments/${apt._id}/cancel`)
        .set('Authorization', `Bearer ${doctorToken}`)
        .send({ reason: 'Urgent surgery required' });

      expect(okRes.status).toBe(200);
      expect(okRes.body.appointment.status).toBe('cancelled');
    });

    it('should enforce max 2 reschedules rule for patients', async () => {
      const now = DateTime.now().setZone('Asia/Kolkata');
      const startAt = now.plus({ days: 1 }).set({ hour: 10, minute: 0 }).toJSDate();

      const apt = await Appointment.create({
        patient: patient._id,
        doctor: doctorProfile._id,
        startAt,
        endAt: new Date(startAt.getTime() + 30 * 60 * 1000),
        reason: 'Checkup',
        fee: 700,
        status: 'booked',
        rescheduleCount: 2 // Already rescheduled twice!
      });

      const newSlot = now.plus({ days: 2 }).set({ hour: 11, minute: 0 }).toUTC().toISO();

      const res = await request(app)
        .patch(`/api/appointments/${apt._id}/reschedule`)
        .set('Authorization', `Bearer ${patientToken}`)
        .send({ newStartAt: newSlot });

      expect(res.status).toBe(400);
      expect(res.body.message).toMatch(/maximum allowed limit of 2/i);
    });
  });

  // ==========================================
  // 4. AUTHORISATION & PRIVACY TESTS
  // ==========================================
  describe('Authorisation and Role Privacy Checks', () => {
    let patientA, patientAToken;
    let patientB, patientBToken;
    let doctor1, doctor1Token, doctor1Profile;
    let doctor2, doctor2Token, doctor2Profile;
    let appointmentA;

    beforeEach(async () => {
      patientA = await User.create({
        name: 'Patient Alice',
        email: 'alice@test.com',
        passwordHash: 'hash',
        role: 'patient'
      });
      patientAToken = createToken(patientA);

      patientB = await User.create({
        name: 'Patient Bob',
        email: 'bob@test.com',
        passwordHash: 'hash',
        role: 'patient'
      });
      patientBToken = createToken(patientB);

      doctor1 = await User.create({
        name: 'Dr. One',
        email: 'doc1@test.com',
        passwordHash: 'hash',
        role: 'doctor'
      });
      doctor1Token = createToken(doctor1);
      doctor1Profile = await DoctorProfile.create({
        user: doctor1._id,
        specialisation: 'Cardiologist',
        city: 'Delhi',
        fee: 800,
        regNumber: 'DOC-1',
        isApproved: true
      });

      doctor2 = await User.create({
        name: 'Dr. Two (Unrelated)',
        email: 'doc2@test.com',
        passwordHash: 'hash',
        role: 'doctor'
      });
      doctor2Token = createToken(doctor2);
      doctor2Profile = await DoctorProfile.create({
        user: doctor2._id,
        specialisation: 'ENT',
        city: 'Mumbai',
        fee: 600,
        regNumber: 'DOC-2',
        isApproved: true
      });

      // Appointment between patientA and doctor1
      appointmentA = await Appointment.create({
        patient: patientA._id,
        doctor: doctor1Profile._id,
        startAt: new Date(Date.now() + 24 * 60 * 60 * 1000),
        endAt: new Date(Date.now() + 24 * 60 * 60 * 1000 + 30 * 60 * 1000),
        reason: 'Palpitations',
        fee: 800,
        status: 'booked'
      });
    });

    it('should forbid Patient B from reading Patient A appointment', async () => {
      const res = await request(app)
        .get(`/api/appointments/${appointmentA._id}`)
        .set('Authorization', `Bearer ${patientBToken}`);

      expect(res.status).toBe(403);
    });

    it('should forbid Patient B from reading Patient A chat messages', async () => {
      const res = await request(app)
        .get(`/api/messages/${appointmentA._id}`)
        .set('Authorization', `Bearer ${patientBToken}`);

      expect(res.status).toBe(403);
    });

    it('should forbid Patient B from reading Patient A prescription', async () => {
      await Prescription.create({
        appointment: appointmentA._id,
        doctor: doctor1Profile._id,
        patient: patientA._id,
        diagnosis: 'Hypertension',
        medicines: [{ name: 'Amlodipine 5mg', dosage: '1', frequency: 'OD', duration: '10 days' }]
      });

      const res = await request(app)
        .get(`/api/prescriptions/appointment/${appointmentA._id}`)
        .set('Authorization', `Bearer ${patientBToken}`);

      expect(res.status).toBe(403);
    });

    it('should forbid a patient from accessing doctor self-service routes', async () => {
      const res = await request(app)
        .get('/api/doctors/me/schedule?date=2026-11-01')
        .set('Authorization', `Bearer ${patientAToken}`);

      expect(res.status).toBe(403);
      expect(res.body.message).toMatch(/Forbidden/i);
    });

    it('should forbid Doctor 2 from reading Patient A health profile when having no shared appointments', async () => {
      await PatientProfile.create({
        user: patientA._id,
        bloodGroup: 'O+',
        allergies: ['Penicillin']
      });

      const res = await request(app)
        .get(`/api/patient/${patientA._id}/profile`)
        .set('Authorization', `Bearer ${doctor2Token}`);

      expect(res.status).toBe(403);
      expect(res.body.message).toMatch(/Access denied/i);
    });
  });
});

