import { Router } from 'express';
import {
  register,
  login,
  googleAuth,
  linkGoogle,
  refreshToken,
  logout,
  getMe,
  updateMe,
  verifyEmail,
  resendVerification,
  forgotPassword,
  resetPassword
} from '../controllers/auth.controller.js';
import { authenticate, optionalAuthenticate } from '../middleware/auth.middleware.js';
import { authLimiter, refreshLimiter } from '../middleware/rateLimiter.middleware.js';
import { validate } from '../middleware/validate.middleware.js';
import {
  registerSchema,
  loginSchema,
  googleAuthSchema,
  refreshTokenSchema,
  updateProfileSchema,
  verifyEmailSchema,
  resendVerificationSchema,
  forgotPasswordSchema,
  resetPasswordSchema
} from '../validators/auth.validator.js';

const router = Router();

// 1. Customer Registration & Authentication
router.post('/register', authLimiter, validate(registerSchema), register);
router.post('/login', authLimiter, validate(loginSchema), login);
router.post('/google', authLimiter, validate(googleAuthSchema), googleAuth);
router.post('/google/link', authenticate, validate(googleAuthSchema), linkGoogle);
router.post('/refresh', refreshLimiter, validate(refreshTokenSchema), refreshToken);
router.post('/logout', optionalAuthenticate, logout);

// 2. Customer Profile
router.get('/me', authenticate, getMe);
router.patch('/me', authenticate, validate(updateProfileSchema), updateMe);
router.put('/me', authenticate, validate(updateProfileSchema), updateMe);

// 3. Email Verification
router.post('/verify-email', authLimiter, validate(verifyEmailSchema), verifyEmail);
router.post('/resend-verification', authLimiter, validate(resendVerificationSchema), resendVerification);

// 4. Password Recovery & Reset
router.post('/forgot-password', authLimiter, validate(forgotPasswordSchema), forgotPassword);
router.post('/reset-password', authLimiter, validate(resetPasswordSchema), resetPassword);

// Aliases for profile routes
router.get('/profile', authenticate, getMe);
router.patch('/profile', authenticate, validate(updateProfileSchema), updateMe);
router.put('/profile', authenticate, validate(updateProfileSchema), updateMe);

export default router;
