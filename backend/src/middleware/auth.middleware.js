import jwt from 'jsonwebtoken';
import { env } from '../config/environment.js';
import { User } from '../models/User.js';
import { ApiError } from '../utils/apiError.js';
import { hasRole } from '../constants/roles.js';

/**
 * Verifies JWT Access Token and attaches authenticated user to req.user
 */
export async function authenticate(req, res, next) {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      throw ApiError.unauthorized('Authentication token missing or invalid');
    }

    const token = authHeader.split(' ')[1];
    let decoded;
    try {
      decoded = jwt.verify(token, env.JWT_ACCESS_SECRET);
    } catch (err) {
      if (err.name === 'TokenExpiredError') {
        throw ApiError.unauthorized('Token expired. Please refresh your session.');
      }
      throw ApiError.unauthorized('Invalid authentication token');
    }

    const user = await User.findById(decoded.id);
    if (!user || !user.isActive) {
      throw ApiError.unauthorized('User account not found or deactivated');
    }

    req.user = user;
    next();
  } catch (error) {
    next(error);
  }
}

/**
 * Optional authentication: attaches user if token is present, continues otherwise
 */
export async function optionalAuthenticate(req, res, next) {
  try {
    const authHeader = req.headers.authorization;
    if (authHeader && authHeader.startsWith('Bearer ')) {
      const token = authHeader.split(' ')[1];
      try {
        const decoded = jwt.verify(token, env.JWT_ACCESS_SECRET);
        const user = await User.findById(decoded.id);
        if (user && user.isActive) {
          req.user = user;
        }
      } catch {
        // Token invalid or expired, continue as guest
      }
    }
    next();
  } catch (error) {
    next(error);
  }
}

/**
 * Authorizes based on one or more allowed roles or hierarchical role inheritance
 */
export function authorize(...allowedRoles) {
  return (req, res, next) => {
    if (!req.user) {
      return next(ApiError.unauthorized('Authentication required'));
    }

    const userRole = req.user.role;
    const isAuthorized = allowedRoles.some((role) => hasRole(userRole, role));

    if (!isAuthorized) {
      return next(
        ApiError.forbidden(`Access forbidden: Role '${userRole}' lacks required permissions`)
      );
    }

    next();
  };
}

export default { authenticate, optionalAuthenticate, authorize };
