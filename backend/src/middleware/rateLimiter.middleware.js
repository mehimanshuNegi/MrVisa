import rateLimit from 'express-rate-limit';
import { env } from '../config/environment.js';

export const standardLimiter = rateLimit({
  windowMs: env.RATE_LIMIT_WINDOW_MS,
  max: env.RATE_LIMIT_MAX,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    message: 'Too many requests from this IP. Please try again later.',
    errors: []
  }
});

// Stricter limiter for sensitive auth endpoints
export const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 mins
  max: 30, // 30 attempts per 15 mins
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    message: 'Too many authentication attempts. Please try again after 15 minutes.',
    errors: []
  }
});

// Dedicated limiter for refresh token rotation
export const refreshLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 mins
  max: 60, // 60 refresh requests per 15 mins
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    message: 'Too many token refresh attempts. Please try again after 15 minutes.',
    errors: []
  }
});

// Dedicated limiter for guest application claim to prevent reference enumeration
export const claimLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 mins
  max: 15, // 15 claim attempts per 15 mins
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    message: 'Too many claim attempts. Please try again after 15 minutes.',
    errors: []
  }
});

// Dedicated limiter for payment initialization and verification
export const paymentLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 mins
  max: 40, // 40 payment actions per 15 mins
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    message: 'Too many payment requests from this IP. Please try again after 15 minutes.',
    errors: []
  }
});

export default { standardLimiter, authLimiter, refreshLimiter, claimLimiter, paymentLimiter };
