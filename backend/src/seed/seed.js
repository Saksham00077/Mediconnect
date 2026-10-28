const dotenv = require('dotenv');
dotenv.config();

const mongoose = require('mongoose');
const { DateTime } = require('luxon');
const User = require('../models/User');
const DoctorProfile = require('../models/DoctorProfile');
const Appointment = require('../models/Appointment');
const Message = require('../models/Message');
const Notification = require('../models/Notification');
const Prescription = require('../models/Prescription');
const PatientProfile = require('../models/PatientProfile');
const { startEmbeddedMongo, stopEmbeddedMongo } = require('../config/embeddedMongo');

const DEMO_PASSWORD = 'Password@123';
const TIMEZONE = process.env.APP_TIMEZONE || 'Asia/Kolkata';

async function seed() {
  const mongoUri = process.env.MONGO_URI || 'mongodb://127.0.0.1:27017/mediconnect';
  console.log(`[Seed] Connecting to MongoDB: ${mongoUri}`);

  let isEmbedded = false;
  try {
    await mongoose.connect(mongoUri, { serverSelectionTimeoutMS: 2000 });
    console.log('[Seed] Connected to existing MongoDB.');
  } catch (err) {
    if (mongoUri.includes('127.0.0.1:27017') || mongoUri.includes('localhost:27017')) {
      console.log('[Seed] Local MongoDB on 27017 not detected. Launching persistent standalone instance for seeding...');
      await startEmbeddedMongo(27017, 'mediconnect');
      await mongoose.connect(mongoUri);
      isEmbedded = true;
      console.log('[Seed] Connected to embedded standalone MongoDB.');
    } else {
      console.error('[Seed] Could not connect to MongoDB:', err.message);
      console.error('Make sure your MongoDB server is running or set a valid MONGO_URI in backend/.env');
      process.exit(1);
    }
  }

  console.log('[Seed] Dropping existing collections...');
  await mongoose.connection.dropDatabase();
  console.log('[Seed] Database cleared.');

  // Pre-hash common password
  const passwordHash = await User.hashPassword(DEMO_PASSWORD);

  // 1. Admin
  const admin = await User.create({
    name: 'Admin System',
    email: 'admin@demo.com',
    passwordHash,
    phone: '+91 98765 00000',
    role: 'admin'
  });

  // 2. Six Patients
  const patientData = [
    { name: 'Aarav Sharma', email: 'patient1@demo.com', phone: '+91 98200 11111', age: 29, gender: 'male', bloodGroup: 'O+', allergies: ['Penicillin'], conditions: ['Asthma'] },
    { name: 'Priya Patel', email: 'patient2@demo.com', phone: '+91 98200 22222', age: 34, gender: 'female', bloodGroup: 'B+', allergies: ['Sulfa drugs'], conditions: ['Migraine'] },
    { name: 'Rohan Verma', email: 'patient3@demo.com', phone: '+91 98200 33333', age: 45, gender: 'male', bloodGroup: 'A+', allergies: ['Aspirin'], conditions: ['Hypertension'] },
    { name: 'Ananya Iyer', email: 'patient4@demo.com', phone: '+91 98200 44444', age: 24, gender: 'female', bloodGroup: 'AB+', allergies: [], conditions: [] },
    { name: 'Vikram Malhotra', email: 'patient5@demo.com', phone: '+91 98200 55555', age: 52, gender: 'male', bloodGroup: 'O-', allergies: ['Ibuprofen'], conditions: ['Type 2 Diabetes'] },
    { name: 'Sneha Kulkarni', email: 'patient6@demo.com', phone: '+91 98200 66666', age: 31, gender: 'female', bloodGroup: 'A-', allergies: [], conditions: ['PCOS'] }
  ];

  const patients = [];
  for (const p of patientData) {
    const user = await User.create({
      name: p.name,
      email: p.email,
      passwordHash,
      phone: p.phone,
      role: 'patient'
    });
    await PatientProfile.create({
      user: user._id,
      age: p.age,
      gender: p.gender,
      bloodGroup: p.bloodGroup,
      allergies: p.allergies,
      chronicConditions: p.conditions,
      emergencyContact: {
        name: 'Family Contact',
        phone: '+91 98000 00000',
        relation: 'Spouse'
      }
    });
    patients.push(user);
  }

  // 3. Twelve Approved Doctors across 8 specialisations + 1 Pending Doctor
  const now = DateTime.now().setZone(TIMEZONE);
  const tomorrowStr = now.plus({ days: 1 }).toISODate();

  const doctorConfigs = [
    {
      name: 'Dr. Rajesh Khanna',
      email: 'doctor1@demo.com',
      phone: '+91 98111 00001',
      specialisation: 'General Physician',
      qualifications: 'MBBS, MD (Internal Medicine)',
      experienceYears: 14,
      city: 'Mumbai',
      languages: ['English', 'Hindi', 'Marathi'],
      fee: 600,
      bio: 'Experienced internist specializing in comprehensive chronic illness management, adult preventative health, and routine diagnostic care.',
      regNumber: 'MCI-2010-44910',
      slotDurationMins: 30,
      availability: [1, 2, 3, 4, 5].map((d) => ({ dayOfWeek: d, startTime: '09:00', endTime: '17:00' })),
      leaves: []
    },
    {
      name: 'Dr. Sunita Rao',
      email: 'doctor2@demo.com',
      phone: '+91 98111 00002',
      specialisation: 'Cardiologist',
      qualifications: 'MBBS, MD, DM (Cardiology)',
      experienceYears: 18,
      city: 'Bengaluru',
      languages: ['English', 'Kannada', 'Hindi'],
      fee: 1200,
      bio: 'Senior consultant interventional cardiologist with extensive research in hypertension, coronary artery disease, and lipid management.',
      regNumber: 'KMC-2006-88123',
      slotDurationMins: 30,
      // Split lunch break availability pattern! 09:00 - 13:00 and 14:30 - 18:00
      availability: [
        { dayOfWeek: 1, startTime: '09:00', endTime: '13:00' },
        { dayOfWeek: 1, startTime: '14:30', endTime: '18:00' },
        { dayOfWeek: 2, startTime: '09:00', endTime: '13:00' },
        { dayOfWeek: 2, startTime: '14:30', endTime: '18:00' },
        { dayOfWeek: 3, startTime: '09:00', endTime: '13:00' },
        { dayOfWeek: 3, startTime: '14:30', endTime: '18:00' },
        { dayOfWeek: 4, startTime: '09:00', endTime: '13:00' },
        { dayOfWeek: 4, startTime: '14:30', endTime: '18:00' },
        { dayOfWeek: 5, startTime: '09:00', endTime: '13:00' },
        { dayOfWeek: 5, startTime: '14:30', endTime: '18:00' }
      ],
      leaves: []
    },
    {
      name: 'Dr. Amitav Sen',
      email: 'doctor3@demo.com',
      phone: '+91 98111 00003',
      specialisation: 'Dermatologist',
      qualifications: 'MBBS, DVD, MD (Dermatology)',
      experienceYears: 11,
      city: 'Delhi',
      languages: ['English', 'Hindi', 'Bengali'],
      fee: 800,
      bio: 'Specialist in clinical dermatology, acne scarring, eczema, psoriasis, and advanced laser aesthetics.',
      regNumber: 'DMC-2013-19283',
      slotDurationMins: 20,
      availability: [1, 2, 3, 4, 5, 6].map((d) => ({ dayOfWeek: d, startTime: '10:00', endTime: '16:00' })),
      // One with a leave tomorrow to demo leave handling
      leaves: [{ date: tomorrowStr, reason: 'Attending National Dermatology Summit' }]
    },
    {
      name: 'Dr. Meera Nambiar',
      email: 'doctor4@demo.com',
      phone: '+91 98111 00004',
      specialisation: 'Pediatrician',
      qualifications: 'MBBS, DCH, MD (Pediatrics)',
      experienceYears: 12,
      city: 'Chennai',
      languages: ['English', 'Tamil', 'Malayalam'],
      fee: 700,
      bio: 'Warm and gentle child healthcare expert dedicated to infant nutrition, developmental milestones, vaccinations, and pediatric allergy care.',
      regNumber: 'TNC-2012-65543',
      slotDurationMins: 30,
      availability: [1, 2, 3, 4, 5].map((d) => ({ dayOfWeek: d, startTime: '09:30', endTime: '16:30' })),
      leaves: []
    },
    {
      name: 'Dr. Arjun Kapoor',
      email: 'doctor5@demo.com',
      phone: '+91 98111 00005',
      specialisation: 'Orthopedic',
      qualifications: 'MBBS, MS (Orthopedics), Fellowship (Joint Replacement)',
      experienceYears: 16,
      city: 'Mumbai',
      languages: ['English', 'Hindi', 'Gujarati'],
      fee: 1000,
      bio: 'Consultant orthopedic surgeon specializing in knee and hip arthroplasty, sports injuries, and spine rehabilitation.',
      regNumber: 'MMC-2008-33421',
      slotDurationMins: 30,
      availability: [1, 3, 5].map((d) => ({ dayOfWeek: d, startTime: '11:00', endTime: '19:00' })),
      leaves: []
    },
    {
      name: 'Dr. Kavita Deshmukh',
      email: 'doctor6@demo.com',
      phone: '+91 98111 00006',
      specialisation: 'Gynecologist',
      qualifications: 'MBBS, MS (OBG), FICOG',
      experienceYears: 15,
      city: 'Pune',
      languages: ['English', 'Marathi', 'Hindi'],
      fee: 900,
      bio: 'Dedicated obstetrician and gynecologist focusing on high-risk pregnancy, adolescent reproductive wellness, and laparoscopic procedures.',
      regNumber: 'MMC-2009-77291',
      slotDurationMins: 30,
      availability: [1, 2, 4, 5, 6].map((d) => ({ dayOfWeek: d, startTime: '09:00', endTime: '15:00' })),
      leaves: []
    },
    {
      name: 'Dr. Farhan Qureshi',
      email: 'doctor7@demo.com',
      phone: '+91 98111 00007',
      specialisation: 'ENT',
      qualifications: 'MBBS, MS (ENT / Otorhinolaryngology)',
      experienceYears: 9,
      city: 'Hyderabad',
      languages: ['English', 'Telugu', 'Urdu', 'Hindi'],
      fee: 650,
      bio: 'Specialist in sinus disorders, endoscopic ear surgeries, voice rehabilitation, and allergy testing.',
      regNumber: 'TSMC-2015-88319',
      slotDurationMins: 20,
      availability: [1, 2, 3, 4, 5, 6].map((d) => ({ dayOfWeek: d, startTime: '10:00', endTime: '18:00' })),
      leaves: []
    },
    {
      name: 'Dr. Shalini Singhal',
      email: 'doctor8@demo.com',
      phone: '+91 98111 00008',
      specialisation: 'Psychiatrist',
      qualifications: 'MBBS, MD (Psychiatry), Dip. Psychotherapy',
      experienceYears: 13,
      city: 'Delhi',
      languages: ['English', 'Hindi', 'Punjabi'],
      fee: 1500,
      bio: 'Compassionate mental wellness clinician providing evidence-based treatment for anxiety, depression, adult ADHD, and stress management.',
      regNumber: 'DMC-2011-99432',
      slotDurationMins: 45,
      availability: [1, 2, 3, 4].map((d) => ({ dayOfWeek: d, startTime: '12:00', endTime: '18:00' })),
      leaves: []
    },
    {
      name: 'Dr. Nikhil Swaminathan',
      email: 'doctor9@demo.com',
      phone: '+91 98111 00009',
      specialisation: 'General Physician',
      qualifications: 'MBBS, DNB (Family Medicine)',
      experienceYears: 8,
      city: 'Bengaluru',
      languages: ['English', 'Tamil', 'Kannada'],
      fee: 500,
      bio: 'Family doctor dedicated to lifestyle disorders, preventive screenings, viral fever care, and health optimization.',
      regNumber: 'KMC-2016-12009',
      slotDurationMins: 30,
      availability: [1, 2, 3, 4, 5, 6].map((d) => ({ dayOfWeek: d, startTime: '08:30', endTime: '14:30' })),
      leaves: []
    },
    {
      name: 'Dr. Pooja Nair',
      email: 'doctor10@demo.com',
      phone: '+91 98111 00010',
      specialisation: 'Dermatologist',
      qualifications: 'MBBS, MD (DVL)',
      experienceYears: 10,
      city: 'Kochi',
      languages: ['English', 'Malayalam', 'Hindi'],
      fee: 750,
      bio: 'Expert clinical skin specialist focused on hair loss treatment, fungal disorders, and cosmetic dermatology.',
      regNumber: 'TC-2014-55442',
      slotDurationMins: 30,
      availability: [2, 3, 4, 5, 6].map((d) => ({ dayOfWeek: d, startTime: '10:00', endTime: '16:00' })),
      leaves: []
    },
    {
      name: 'Dr. Harish Bahl',
      email: 'doctor11@demo.com',
      phone: '+91 98111 00011',
      specialisation: 'Cardiologist',
      qualifications: 'MBBS, MD, DM (Cardiology), FACC',
      experienceYears: 22,
      city: 'Chandigarh',
      languages: ['English', 'Hindi', 'Punjabi'],
      fee: 1400,
      bio: 'Renowned clinical cardiologist with over two decades in cardiac diagnostics, preventive echocardiography, and heart failure care.',
      regNumber: 'PMC-2002-11002',
      slotDurationMins: 30,
      availability: [1, 2, 3, 4, 5].map((d) => ({ dayOfWeek: d, startTime: '11:00', endTime: '17:00' })),
      leaves: []
    },
    {
      name: 'Dr. Tanvi Joshi',
      email: 'doctor12@demo.com',
      phone: '+91 98111 00012',
      specialisation: 'Pediatrician',
      qualifications: 'MBBS, MD (Pediatrics), Fellowship in Neonatology',
      experienceYears: 7,
      city: 'Ahmedabad',
      languages: ['English', 'Gujarati', 'Hindi'],
      fee: 650,
      bio: 'Newborn and pediatric specialist focused on gentle, evidence-based care, pediatric allergy mitigation, and childhood development.',
      regNumber: 'GMC-2017-90921',
      slotDurationMins: 30,
      availability: [1, 2, 3, 4, 5].map((d) => ({ dayOfWeek: d, startTime: '09:00', endTime: '16:00' })),
      leaves: []
    }
  ];

  const approvedDoctors = [];
  for (const doc of doctorConfigs) {
    const user = await User.create({
      name: doc.name,
      email: doc.email,
      passwordHash,
      phone: doc.phone,
      role: 'doctor'
    });

    const profile = await DoctorProfile.create({
      user: user._id,
      specialisation: doc.specialisation,
      qualifications: doc.qualifications,
      experienceYears: doc.experienceYears,
      city: doc.city,
      languages: doc.languages,
      fee: doc.fee,
      bio: doc.bio,
      regNumber: doc.regNumber,
      isApproved: true,
      rating: { avg: 4.8, count: 5 },
      slotDurationMins: doc.slotDurationMins,
      availability: doc.availability,
      leaves: doc.leaves
    });

    approvedDoctors.push({ user, profile });
  }

  // 1 Pending Doctor to demo Admin Approval
  const pendingUser = await User.create({
    name: 'Dr. Siddharth Rao (Pending)',
    email: 'doctor_pending@demo.com',
    passwordHash,
    phone: '+91 98111 99999',
    role: 'doctor'
  });

  await DoctorProfile.create({
    user: pendingUser._id,
    specialisation: 'Neurologist',
    qualifications: 'MBBS, MD, DM (Neurology)',
    experienceYears: 6,
    city: 'Hyderabad',
    languages: ['English', 'Telugu', 'Hindi'],
    fee: 1100,
    bio: 'Clinical neurologist specializing in headache disorders, epilepsy management, and peripheral neuropathy.',
    regNumber: 'TSMC-2018-77112',
    isApproved: false, // PENDING ADMIN APPROVAL
    slotDurationMins: 30,
    availability: [1, 2, 3, 4, 5].map((d) => ({ dayOfWeek: d, startTime: '10:00', endTime: '17:00' }))
  });

  // Ensure index on Appointment
  await Appointment.init();

  // 4. Create Sample Appointments (Past Completed with Rating & Prescription, Upcoming Booked, Cancelled)
  const d1 = approvedDoctors[0]; // Dr. Rajesh Khanna (General Physician)
  const d2 = approvedDoctors[1]; // Dr. Sunita Rao (Cardiologist)
  const d3 = approvedDoctors[2]; // Dr. Amitav Sen (Dermatologist)

  // Past Completed Appointment 1 (d1 with patient1)
  const pastDate1 = now.minus({ days: 3 }).set({ hour: 10, minute: 0, second: 0, millisecond: 0 });
  const pastApt1 = await Appointment.create({
    patient: patients[0]._id,
    doctor: d1.profile._id,
    startAt: pastDate1.toJSDate(),
    endAt: pastDate1.plus({ minutes: 30 }).toJSDate(),
    status: 'completed',
    reason: 'Seasonal chest congestion and chronic morning cough',
    fee: d1.profile.fee,
    completedAt: pastDate1.plus({ minutes: 25 }).toJSDate(),
    rating: {
      stars: 5,
      comment: 'Dr. Rajesh took time to listen patiently and explained the treatment thoroughly.'
    }
  });

  // Prescription for Past Appointment 1
  await Prescription.create({
    appointment: pastApt1._id,
    doctor: d1.profile._id,
    patient: patients[0]._id,
    diagnosis: 'Acute Bronchitis with mild wheezing',
    medicines: [
      {
        name: 'Azithromycin 500mg',
        dosage: '1 tablet',
        frequency: 'Once daily after food',
        duration: '3 days',
        instructions: 'Complete the entire course without skipping'
      },
      {
        name: 'Levocetirizine + Montelukast',
        dosage: '1 tablet',
        frequency: 'Once at night before sleep',
        duration: '7 days',
        instructions: 'Helps relieve night-time airway constriction'
      }
    ],
    advice: 'Drink warm water frequently, avoid chilled beverages, and steam inhalation twice daily.',
    followUpDate: now.plus({ days: 7 }).toISODate()
  });

  // Chat messages for Past Appointment 1
  await Message.create({
    appointment: pastApt1._id,
    sender: patients[0]._id,
    senderRole: 'patient',
    text: 'Hello doctor, thank you for the consultation. Should I continue the steam inhalation for 5 days?',
    readAt: pastDate1.plus({ hours: 4 }).toJSDate()
  });
  await Message.create({
    appointment: pastApt1._id,
    sender: d1.user._id,
    senderRole: 'doctor',
    text: 'Yes Aarav, steam inhalation for 5 days will be very beneficial. Keep hydrated.',
    readAt: pastDate1.plus({ hours: 5 }).toJSDate()
  });

  // Past Completed Appointment 2 (d2 with patient2)
  const pastDate2 = now.minus({ days: 5 }).set({ hour: 11, minute: 0, second: 0, millisecond: 0 });
  const pastApt2 = await Appointment.create({
    patient: patients[1]._id,
    doctor: d2.profile._id,
    startAt: pastDate2.toJSDate(),
    endAt: pastDate2.plus({ minutes: 30 }).toJSDate(),
    status: 'completed',
    reason: 'Periodic chest tightness after light exercise',
    fee: d2.profile.fee,
    completedAt: pastDate2.plus({ minutes: 30 }).toJSDate(),
    rating: {
      stars: 5,
      comment: 'Very thorough checkup. Dr. Sunita performed an ECG and calmed my anxieties.'
    }
  });

  await Prescription.create({
    appointment: pastApt2._id,
    doctor: d2.profile._id,
    patient: patients[1]._id,
    diagnosis: 'Mild Sinus Tachycardia, stress induced',
    medicines: [
      {
        name: 'Metoprolol Succinate 25mg',
        dosage: '1 tablet',
        frequency: 'Morning after breakfast',
        duration: '14 days',
        instructions: 'Monitor pulse daily'
      }
    ],
    advice: 'Practice deep breathing exercises, 30 minutes brisk walking daily, reduce caffeine intake.',
    followUpDate: now.plus({ days: 10 }).toISODate()
  });

  // Upcoming Booked Appointment 1 (d1 with patient1)
  let futureDay = now.plus({ days: 2 });
  while (futureDay.weekday > 5) {
    futureDay = futureDay.plus({ days: 1 });
  }
  const upcomingDate1 = futureDay.set({ hour: 10, minute: 0, second: 0, millisecond: 0 });

  const upcomingApt1 = await Appointment.create({
    patient: patients[0]._id,
    doctor: d1.profile._id,
    startAt: upcomingDate1.toJSDate(),
    endAt: upcomingDate1.plus({ minutes: 30 }).toJSDate(),
    status: 'booked',
    reason: 'Routine follow-up on recovery and breathing comfort',
    fee: d1.profile.fee
  });

  // Active chat thread on upcoming appointment
  await Message.create({
    appointment: upcomingApt1._id,
    sender: patients[0]._id,
    senderRole: 'patient',
    text: 'Dr. Rajesh, do I need to bring my previous lab reports for this follow-up visit?',
    readAt: null
  });

  // Upcoming Booked Appointment 2 (d2 with patient3)
  const upcomingDate2 = futureDay.set({ hour: 15, minute: 0, second: 0, millisecond: 0 });
  await Appointment.create({
    patient: patients[2]._id,
    doctor: d2.profile._id,
    startAt: upcomingDate2.toJSDate(),
    endAt: upcomingDate2.plus({ minutes: 30 }).toJSDate(),
    status: 'booked',
    reason: 'Blood pressure fluctuation consultation and medication review',
    fee: d2.profile.fee
  });

  // Cancelled Appointment (d3 with patient4)
  const cancelledDate = now.plus({ days: 3 }).set({ hour: 14, minute: 0, second: 0, millisecond: 0 });
  await Appointment.create({
    patient: patients[3]._id,
    doctor: d3.profile._id,
    startAt: cancelledDate.toJSDate(),
    endAt: cancelledDate.plus({ minutes: 20 }).toJSDate(),
    status: 'cancelled',
    cancelledBy: 'patient',
    cancelReason: 'Sudden personal travel plan conflict',
    reason: 'Skin rash on forehead and allergic itching',
    fee: d3.profile.fee
  });

  // Sample Notifications
  await Notification.create({
    user: d1.user._id,
    type: 'booking',
    title: 'New Appointment Booked',
    body: `${patients[0].name} booked an appointment for ${upcomingDate1.toFormat('ccc, dd LLL, hh:mm a')}`,
    link: '/doctor/appointments',
    isRead: false
  });

  await Notification.create({
    user: patients[0]._id,
    type: 'prescription',
    title: 'New Prescription Issued',
    body: `Dr. Rajesh Khanna has uploaded your prescription for the consultation.`,
    link: `/appointments/${pastApt1._id}`,
    isRead: true
  });

  await Notification.create({
    user: patients[1]._id,
    type: 'completed',
    title: 'Consultation Completed',
    body: 'Your consultation with Dr. Sunita Rao is marked complete. Please share your rating.',
    link: `/appointments/${pastApt2._id}`,
    isRead: true
  });

  console.log('\n======================================================');
  console.log('       MEDICONNECT DATABASE SEEDED SUCCESSFULLY       ');
  console.log('======================================================');
  console.log(`Common Password for ALL demo accounts: ${DEMO_PASSWORD}\n`);
  console.log('ADMIN ACCOUNT:');
  console.log('  Email: admin@demo.com\n');
  console.log('DOCTOR ACCOUNTS (Approved):');
  console.log('  doctor1@demo.com  - Dr. Rajesh Khanna (General Physician, Mumbai)');
  console.log('  doctor2@demo.com  - Dr. Sunita Rao (Cardiologist, Bengaluru - Split Schedule)');
  console.log('  doctor3@demo.com  - Dr. Amitav Sen (Dermatologist, Delhi - Leave Tomorrow)');
  console.log('  doctor4@demo.com  - Dr. Meera Nambiar (Pediatrician, Chennai)');
  console.log('  doctor5@demo.com  - Dr. Arjun Kapoor (Orthopedic, Mumbai)');
  console.log('  doctor6@demo.com  - Dr. Kavita Deshmukh (Gynecologist, Pune)');
  console.log('  doctor7@demo.com  - Dr. Farhan Qureshi (ENT, Hyderabad)');
  console.log('  doctor8@demo.com  - Dr. Shalini Singhal (Psychiatrist, Delhi)');
  console.log('  doctor9@demo.com  - Dr. Nikhil Swaminathan (General Physician, Bengaluru)');
  console.log('  doctor10@demo.com - Dr. Pooja Nair (Dermatologist, Kochi)');
  console.log('  doctor11@demo.com - Dr. Harish Bahl (Cardiologist, Chandigarh)');
  console.log('  doctor12@demo.com - Dr. Tanvi Joshi (Pediatrician, Ahmedabad)\n');
  console.log('DOCTOR ACCOUNT (Pending Admin Approval):');
  console.log('  doctor_pending@demo.com - Dr. Siddharth Rao (Neurologist, Hyderabad)\n');
  console.log('PATIENT ACCOUNTS:');
  console.log('  patient1@demo.com - Aarav Sharma (Allergy: Penicillin)');
  console.log('  patient2@demo.com - Priya Patel (Allergy: Sulfa)');
  console.log('  patient3@demo.com - Rohan Verma (Allergy: Aspirin)');
  console.log('  patient4@demo.com - Ananya Iyer');
  console.log('  patient5@demo.com - Vikram Malhotra');
  console.log('  patient6@demo.com - Sneha Kulkarni');
  console.log('======================================================\n');

  await mongoose.disconnect();
  if (isEmbedded) {
    await stopEmbeddedMongo();
  }
}

if (require.main === module) {
  seed()
    .then(() => process.exit(0))
    .catch((err) => {
      console.error('Seed error:', err);
      process.exit(1);
    });
}

module.exports = seed;
