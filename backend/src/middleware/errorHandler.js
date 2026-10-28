const ApiError = require('../utils/ApiError');

/**
 * Centralized Express Error Handling Middleware
 * Normalizes all operational, database, and validation errors into a standard JSON payload:
 * { message: string, errors?: array }
 */
const errorHandler = (err, req, res, next) => {
  let statusCode = err.statusCode || 500;
  let message = err.message || 'Internal Server Error';
  let errors = err.errors || [];

  // MongoDB duplicate key error (e.g., partial unique index collision on Appointment)
  if (err.code === 11000) {
    statusCode = 409;
    if (err.keyPattern && err.keyPattern.doctor && err.keyPattern.startAt) {
      message = 'This slot was just booked by someone else. Please pick another.';
    } else if (err.keyPattern && err.keyPattern.email) {
      message = 'An account with this email already exists.';
    } else {
      message = 'Duplicate key conflict: a record with these unique details already exists.';
    }
  }

  // Mongoose validation errors
  if (err.name === 'ValidationError') {
    statusCode = 400;
    message = 'Validation failed';
    errors = Object.values(err.errors).map((e) => ({
      field: e.path,
      message: e.message
    }));
  }

  // CastError (e.g. invalid MongoDB ObjectId)
  if (err.name === 'CastError') {
    statusCode = 400;
    message = `Invalid ${err.path}: ${err.value}`;
  }

  // JWT errors
  if (err.name === 'JsonWebTokenError') {
    statusCode = 401;
    message = 'Invalid authentication token';
  }
  if (err.name === 'TokenExpiredError') {
    statusCode = 401;
    message = 'Authentication token expired, please sign in again';
  }

  const response = {
    message
  };

  if (errors && errors.length > 0) {
    response.errors = errors;
  }

  // Only include stack trace in non-production for debugging
  if (process.env.NODE_ENV !== 'production' && statusCode === 500) {
    response.stack = err.stack;
  }

  res.status(statusCode).json(response);
};

module.exports = errorHandler;

