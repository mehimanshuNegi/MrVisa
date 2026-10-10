import crypto from 'crypto';
import { VerificationCode } from '../models/VerificationCode.js';
import { User } from '../models/User.js';
import { emailService } from './email.service.js';
import { smsService } from './sms.service.js';
import { ApiError } from '../utils/apiError.js';
import { env } from '../config/environment.js';
import { logger } from '../utils/logger.js';

class VerificationService {
  _normalizeTarget(target, type) {
    if (!target) return '';
    if (type === 'EMAIL') {
      return String(target).trim().toLowerCase();
    }
    if (type === 'PHONE') {
      // Clean to digits with optional leading +
      const raw = String(target).trim();
      const hasPlus = raw.startsWith('+');
      const digits = raw.replace(/\D/g, '');
      return hasPlus ? `+${digits}` : digits;
    }
    return String(target).trim();
  }

  _hashOtp(code, target) {
    const salt = env.JWT_ACCESS_SECRET || 'nimufly_secure_salt';
    return crypto.createHmac('sha256', salt).update(`${code}:${target}`).digest('hex');
  }

  /**
   * Generates and dispatches a 6-digit verification OTP.
   * Enforces 60-second cooldown and rate limiting.
   */
  async sendOtp({ target: rawTarget, type: rawType, ip = '' }) {
    const type = String(rawType || '').toUpperCase();
    if (!['EMAIL', 'PHONE'].includes(type)) {
      throw ApiError.badRequest('Invalid verification type. Must be EMAIL or PHONE.');
    }

    const target = this._normalizeTarget(rawTarget, type);
    if (!target) {
      throw ApiError.badRequest(`${type === 'EMAIL' ? 'Email address' : 'Phone number'} is required.`);
    }

    // Format validation
    if (type === 'EMAIL') {
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(target)) {
        throw ApiError.badRequest('Please enter a valid email address.');
      }
    } else {
      const phoneDigits = target.replace(/\D/g, '');
      if (phoneDigits.length < 8 || phoneDigits.length > 15) {
        throw ApiError.badRequest('Please enter a valid phone number (8–15 digits).');
      }
    }

    // Check 60-second cooldown on existing pending record
    const existing = await VerificationCode.findOne({ target, type }).sort({ createdAt: -1 });
    if (existing && existing.lastSentAt) {
      const elapsedSeconds = Math.floor((Date.now() - new Date(existing.lastSentAt).getTime()) / 1000);
      if (elapsedSeconds < 60) {
        const remaining = 60 - elapsedSeconds;
        throw ApiError.badRequest(`Please wait ${remaining} seconds before requesting a new code.`);
      }
    }

    // Generate cryptographically secure 6-digit numeric OTP
    const code = crypto.randomInt(100000, 999999).toString();
    const codeHash = this._hashOtp(code, target);
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes

    // Store in DB with reset attempts
    await VerificationCode.findOneAndUpdate(
      { target, type },
      {
        target,
        type,
        codeHash,
        status: 'PENDING',
        attempts: 0,
        verificationToken: '',
        lastSentAt: new Date(),
        expiresAt,
        verifiedAt: null
      },
      { upsert: true, new: true, setDefaultsOnInsert: true }
    );

    // Dispatch via configured provider
    if (type === 'EMAIL') {
      const dispatch = await emailService.sendVerificationOtpEmail({ email: target, code });
      if (!dispatch.delivered) {
        if (dispatch.unconfigured) {
          throw ApiError.badRequest(
            'Email delivery provider is currently unconfigured in this environment. Please contact administrator.'
          );
        }
        throw ApiError.badRequest(dispatch.error || 'Failed to dispatch verification email. Please try again.');
      }
    } else {
      const dispatch = await smsService.sendOtpSms({ phone: target, code });
      if (!dispatch.delivered) {
        if (dispatch.unconfigured) {
          throw ApiError.badRequest(
            'SMS provider is currently not configured in this deployment environment. Phone verification via live SMS is unavailable.'
          );
        }
        throw ApiError.badRequest(dispatch.error || 'Failed to dispatch verification SMS. Please try again.');
      }
    }

    return {
      success: true,
      message: `Verification code sent successfully to ${type === 'EMAIL' ? 'your email' : 'your phone'}.`,
      cooldownSeconds: 60
    };
  }

  /**
   * Verifies the provided OTP code against stored record.
   * Issues verification token and enforces attempt limit (max 5).
   */
  async verifyOtp({ target: rawTarget, type: rawType, code: rawCode, currentUser = null }) {
    const type = String(rawType || '').toUpperCase();
    if (!['EMAIL', 'PHONE'].includes(type)) {
      throw ApiError.badRequest('Invalid verification type.');
    }

    const target = this._normalizeTarget(rawTarget, type);
    const code = String(rawCode || '').trim();

    if (!target || !code) {
      throw ApiError.badRequest('Target and verification code are required.');
    }

    const record = await VerificationCode.findOne({ target, type }).sort({ createdAt: -1 });
    if (!record) {
      throw ApiError.badRequest('No active verification code found. Please request a new code.');
    }

    if (new Date() > new Date(record.expiresAt)) {
      record.status = 'EXPIRED';
      await record.save();
      throw ApiError.badRequest('Verification code has expired. Please request a new code.');
    }

    if (record.attempts >= 5) {
      record.status = 'MAX_ATTEMPTS';
      await record.save();
      throw ApiError.badRequest('Too many incorrect attempts. Please request a new verification code.');
    }

    const expectedHash = this._hashOtp(code, target);
    const isMatch = crypto.timingSafeEqual(Buffer.from(record.codeHash), Buffer.from(expectedHash));

    if (!isMatch) {
      record.attempts += 1;
      await record.save();
      const remainingAttempts = 5 - record.attempts;
      throw ApiError.badRequest(
        `Invalid verification code. ${remainingAttempts > 0 ? `${remainingAttempts} attempt(s) remaining.` : 'Maximum attempts exceeded.'}`
      );
    }

    // Success! Generate proof of verification token
    const verificationToken = crypto.randomBytes(32).toString('hex');
    record.status = 'VERIFIED';
    record.verifiedAt = new Date();
    record.verificationToken = verificationToken;
    await record.save();

    // If logged in customer is verifying their own account email or phone, update user profile in DB
    if (currentUser) {
      try {
        const update = {};
        if (type === 'EMAIL' && currentUser.email?.toLowerCase() === target) {
          update.isEmailVerified = true;
        }
        if (type === 'PHONE') {
          update.isPhoneVerified = true;
        }
        if (Object.keys(update).length > 0) {
          await User.findByIdAndUpdate(currentUser._id, update);
        }
      } catch (err) {
        logger.warn('User verification profile update notice:', err?.message);
      }
    }

    return {
      success: true,
      isVerified: true,
      target,
      type,
      verificationToken,
      message: `${type === 'EMAIL' ? 'Email' : 'Phone'} verified successfully.`
    };
  }

  /**
   * Confirms whether a target holds a valid, active verification proof.
   */
  async checkVerificationStatus({ target: rawTarget, type: rawType, verificationToken = '' }) {
    const type = String(rawType || '').toUpperCase();
    const target = this._normalizeTarget(rawTarget, type);
    if (!target) return { isVerified: false };

    const query = {
      target,
      type,
      status: 'VERIFIED'
    };

    if (verificationToken) {
      query.verificationToken = verificationToken;
    }

    const record = await VerificationCode.findOne(query).sort({ verifiedAt: -1 });
    return {
      isVerified: Boolean(record && record.verifiedAt)
    };
  }
}

export const verificationService = new VerificationService();
export default verificationService;
