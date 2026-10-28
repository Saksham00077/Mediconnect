const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const userSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, 'Name is required'],
      trim: true
    },
    email: {
      type: String,
      required: [true, 'Email is required'],
      unique: true,
      lowercase: true,
      trim: true
    },
    passwordHash: {
      type: String,
      required: [true, 'Password is required'],
      select: false
    },
    phone: {
      type: String,
      trim: true,
      default: ''
    },
    role: {
      type: String,
      enum: ['patient', 'doctor', 'admin'],
      default: 'patient'
    },
    isActive: {
      type: Boolean,
      default: true
    }
  },
  {
    timestamps: true
  }
);

// Method to verify password against bcrypt hash
userSchema.methods.comparePassword = async function (candidatePassword) {
  return bcrypt.compare(candidatePassword, this.passwordHash);
};

// Static helper to hash passwords consistently
userSchema.statics.hashPassword = async function (plainPassword) {
  return bcrypt.hash(plainPassword, 10);
};

const User = mongoose.model('User', userSchema);

module.exports = User;

