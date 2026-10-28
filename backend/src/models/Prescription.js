const mongoose = require('mongoose');

const medicineSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, 'Medicine name is required'],
      trim: true
    },
    dosage: {
      type: String,
      required: [true, 'Dosage is required (e.g., 500mg)'],
      trim: true
    },
    frequency: {
      type: String,
      required: [true, 'Frequency is required (e.g., 1-0-1 after food)'],
      trim: true
    },
    duration: {
      type: String,
      required: [true, 'Duration is required (e.g., 5 days)'],
      trim: true
    },
    instructions: {
      type: String,
      trim: true,
      default: ''
    }
  },
  { _id: true }
);

const prescriptionSchema = new mongoose.Schema(
  {
    appointment: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Appointment',
      required: true,
      unique: true
    },
    doctor: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'DoctorProfile',
      required: true
    },
    patient: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true
    },
    diagnosis: {
      type: String,
      required: [true, 'Diagnosis is required'],
      trim: true
    },
    medicines: {
      type: [medicineSchema],
      default: []
    },
    advice: {
      type: String,
      trim: true,
      default: ''
    },
    followUpDate: {
      type: String, // 'YYYY-MM-DD' or date string
      default: null
    }
  },
  {
    timestamps: true
  }
);

prescriptionSchema.index({ patient: 1, createdAt: -1 });

const Prescription = mongoose.model('Prescription', prescriptionSchema);

module.exports = Prescription;

