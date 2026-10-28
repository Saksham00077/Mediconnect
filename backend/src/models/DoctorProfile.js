const mongoose = require('mongoose');

const timeRangeSchema = new mongoose.Schema(
  {
    dayOfWeek: {
      type: Number,
      required: true,
      min: 0,
      max: 6 // 0 = Sunday, 1 = Monday, ..., 6 = Saturday
    },
    startTime: {
      type: String,
      required: true,
      match: [/^([01]\d|2[0-3]):[0-5]\d$/, 'startTime must be in HH:mm 24-hour format']
    },
    endTime: {
      type: String,
      required: true,
      match: [/^([01]\d|2[0-3]):[0-5]\d$/, 'endTime must be in HH:mm 24-hour format']
    }
  },
  { _id: true }
);

const leaveSchema = new mongoose.Schema(
  {
    date: {
      type: String,
      required: true,
      match: [/^\d{4}-\d{2}-\d{2}$/, 'Leave date must be in YYYY-MM-DD format']
    },
    reason: {
      type: String,
      trim: true,
      default: 'On leave'
    }
  },
  { _id: true }
);

const doctorProfileSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      unique: true
    },
    specialisation: {
      type: String,
      required: [true, 'Specialisation is required'],
      trim: true
    },
    qualifications: {
      type: String,
      trim: true,
      default: ''
    },
    experienceYears: {
      type: Number,
      default: 0,
      min: 0
    },
    city: {
      type: String,
      required: [true, 'City is required'],
      trim: true
    },
    languages: {
      type: [String],
      default: ['English']
    },
    fee: {
      type: Number,
      required: [true, 'Consultation fee is required'],
      min: [0, 'Fee cannot be negative']
    },
    bio: {
      type: String,
      trim: true,
      default: ''
    },
    regNumber: {
      type: String,
      required: [true, 'Medical Registration Number is required'],
      trim: true
    },
    isApproved: {
      type: Boolean,
      default: false,
      index: true
    },
    rating: {
      avg: { type: Number, default: 0, min: 0, max: 5 },
      count: { type: Number, default: 0, min: 0 }
    },
    slotDurationMins: {
      type: Number,
      default: 30,
      min: 10,
      max: 120
    },
    availability: {
      type: [timeRangeSchema],
      default: [],
      validate: {
        validator: function (ranges) {
          if (!ranges || ranges.length === 0) return true;

          // Group by day of week
          const byDay = {};
          for (const r of ranges) {
            if (r.startTime >= r.endTime) {
              return false; // start must be strictly before end
            }
            if (!byDay[r.dayOfWeek]) {
              byDay[r.dayOfWeek] = [];
            }
            byDay[r.dayOfWeek].push(r);
          }

          // Check overlap within each day
          for (const day in byDay) {
            const sorted = [...byDay[day]].sort((a, b) => a.startTime.localeCompare(b.startTime));
            for (let i = 0; i < sorted.length - 1; i++) {
              if (sorted[i].endTime > sorted[i + 1].startTime) {
                return false; // Overlapping range detected
              }
            }
          }

          return true;
        },
        message: 'Invalid availability: startTime must be earlier than endTime and ranges cannot overlap within the same day'
      }
    },
    leaves: {
      type: [leaveSchema],
      default: []
    }
  },
  {
    timestamps: true
  }
);

// Helpful index for search/discovery queries
doctorProfileSchema.index({ specialisation: 1, city: 1, isApproved: 1 });

const DoctorProfile = mongoose.model('DoctorProfile', doctorProfileSchema);

module.exports = DoctorProfile;

