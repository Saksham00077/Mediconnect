const mongoose = require('mongoose');

const appointmentSchema = new mongoose.Schema(
  {
    patient: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true
    },
    doctor: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'DoctorProfile',
      required: true
    },
    startAt: {
      type: Date,
      required: true
    },
    endAt: {
      type: Date,
      required: true
    },
    status: {
      type: String,
      enum: ['booked', 'completed', 'cancelled', 'no_show'],
      default: 'booked'
    },
    reason: {
      type: String,
      required: [true, 'Reason for visit is required'],
      trim: true
    },
    fee: {
      type: Number,
      required: true
    },
    cancelledBy: {
      type: String,
      enum: ['patient', 'doctor', null],
      default: null
    },
    cancelReason: {
      type: String,
      default: null
    },
    completedAt: {
      type: Date,
      default: null
    },
    rating: {
      stars: {
        type: Number,
        min: 1,
        max: 5
      },
      comment: {
        type: String,
        trim: true
      }
    },
    rescheduleCount: {
      type: Number,
      default: 0
    }
  },
  {
    timestamps: true
  }
);

// CRUCIAL: Partial Unique Index
// Guarantees that at database level, a doctor cannot have two active ('booked')
// appointments starting at the exact same timestamp. Cancelled or completed
// appointments automatically free the slot without manual index deletion.
appointmentSchema.index(
  { doctor: 1, startAt: 1 },
  {
    name: 'unique_active_doctor_slot',
    unique: true,
    partialFilterExpression: { status: 'booked' }
  }
);

// Indices for fast user appointment lookups
appointmentSchema.index({ patient: 1, startAt: -1 });
appointmentSchema.index({ doctor: 1, startAt: 1 }, { name: 'doctor_all_appointments_idx' });

const Appointment = mongoose.model('Appointment', appointmentSchema);

module.exports = Appointment;
