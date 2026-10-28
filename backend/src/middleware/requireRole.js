const ApiError = require('../utils/ApiError');

/**
 * Role-Based Access Control middleware.
 * Verifies that the authenticated user possesses one of the allowed roles.
 * 
 * @param  {...string} allowedRoles - e.g., 'doctor', 'patient', 'admin'
 */
const requireRole = (...allowedRoles) => {
  return (req, res, next) => {
    if (!req.user) {
      return next(ApiError.unauthorized('Authentication required'));
    }

    if (!allowedRoles.includes(req.user.role)) {
      return next(
        ApiError.forbidden(
          `Forbidden: access restricted to [${allowedRoles.join(', ')}] (your role: ${req.user.role})`
        )
      );
    }

    next();
  };
};

module.exports = requireRole;

