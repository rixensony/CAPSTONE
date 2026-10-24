import jwt from 'jsonwebtoken';
import User from '../models/User.js';
import { env } from '../config/env.js';
import { ApiError } from '../utils/ApiError.js';

/**
 * Verifies the Bearer token and attaches the fresh user document.
 * Re-reading the user on every request keeps role changes effective
 * immediately instead of trusting stale claims inside old tokens.
 */
export async function protect(req, _res, next) {
  const header = req.headers.authorization || '';
  const token = header.startsWith('Bearer ') ? header.slice(7).trim() : null;

  if (!token) {
    return next(new ApiError(401, 'Authentication required. Please log in.'));
  }

  try {
    const decoded = jwt.verify(token, env.jwtSecret);
    const user = await User.findById(decoded.id);
    if (!user) {
      return next(new ApiError(401, 'This account no longer exists. Please log in again.'));
    }
    req.user = user;
    return next();
  } catch (error) {
    if (error?.name === 'TokenExpiredError') {
      return next(new ApiError(401, 'Your session has expired. Please log in again.'));
    }
    return next(new ApiError(401, 'Invalid token. Please log in again.'));
  }
}

/** Second guard for admin-only routes (used together with protect). */
export function requireAdmin(req, _res, next) {
  if (req.user?.role !== 'admin') {
    return next(new ApiError(403, 'Admin access required.'));
  }
  return next();
}
