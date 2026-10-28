const { validationResult } = require('express-validator');
const ApiError = require('../utils/ApiError');

/**
 * Middleware that inspects express-validator results
 * Returns 400 Bad Request with field-level details if validation fails
 */
const validate = (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    const formatted = errors.array().map((err) => ({
      field: err.path || err.param,
      message: err.msg
    }));
    return next(new ApiError(400, formatted[0].message || 'Validation error', formatted));
  }
  next();
};

module.exports = validate;

