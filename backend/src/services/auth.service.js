import jwt from 'jsonwebtoken';
import crypto from 'crypto';
import { User } from '../models/User.js';
import { RefreshToken } from '../models/RefreshToken.js';
import { ApiError } from '../utils/apiError.js';
import { env } from '../config/environment.js';
import { ROLES } from '../constants/roles.js';
import { auditService } from './audit.service.js';
import { AUDIT_ACTIONS, AUDIT_ENTITIES } from '../constants/statuses.js';
import { logger } from '../utils/logger.js';

class AuthService {
  /**
   * Generates Access and Refresh Token pair
   */
  _generateTokens(user) {
    const payload = {
      id: user._id.toString(),
      email: user.email,
      role: user.role
    };

    const accessToken = jwt.sign(payload, env.JWT_ACCESS_SECRET, {
      expiresIn: env.JWT_ACCESS_EXPIRY
    });

    const refreshTokenValue = crypto.randomBytes(40).toString('hex');
    const refreshExpiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000); // 7 days

    return { accessToken, refreshTokenValue, refreshExpiresAt };
  }

  /**
   * Register a new customer
   */
  async register({ name, email, phone, password, nationality }) {
    const existing = await User.findOne({ email: email.toLowerCase().trim() });
    if (existing) {
      throw ApiError.conflict('An account with this email already exists');
    }

    const user = await User.create({
      name: name.trim(),
      email: email.toLowerCase().trim(),
      phone: phone?.trim() || '',
      passwordHash: password,
      role: ROLES.CUSTOMER,
      nationality: nationality || 'Indian'
    });

    const { accessToken, refreshTokenValue, refreshExpiresAt } = this._generateTokens(user);

    await RefreshToken.create({
      token: refreshTokenValue,
      user: user._id,
      expiresAt: refreshExpiresAt
    });

    return {
      user: user.toJSON(),
      tokens: {
        accessToken,
        refreshToken: refreshTokenValue,
        expiresIn: env.JWT_ACCESS_EXPIRY
      }
    };
  }

  /**
   * Authenticate user (Customer or Admin)
   */
  async login({ email, password, req = null }) {
    const user = await User.findOne({ email: email.toLowerCase().trim() }).select('+passwordHash');
    if (!user || !user.isActive) {
      throw ApiError.unauthorized('Invalid email or password');
    }

    const isMatch = await user.comparePassword(password);
    if (!isMatch) {
      throw ApiError.unauthorized('Invalid email or password');
    }

    user.lastLoginAt = new Date();
    await user.save();

    const { accessToken, refreshTokenValue, refreshExpiresAt } = this._generateTokens(user);

    await RefreshToken.create({
      token: refreshTokenValue,
      user: user._id,
      expiresAt: refreshExpiresAt,
      createdByIp: req?.ip || ''
    });

    await auditService.log({
      actor: user._id,
      actorEmail: user.email,
      actorRole: user.role,
      action: AUDIT_ACTIONS.LOGIN,
      entity: AUDIT_ENTITIES.USER,
      entityId: user._id,
      req
    });

    return {
      user: user.toJSON(),
      tokens: {
        accessToken,
        refreshToken: refreshTokenValue,
        expiresIn: env.JWT_ACCESS_EXPIRY
      }
    };
  }

  /**
   * Rotate refresh token and issue new token pair
   */
  async refreshToken(payload) {
    const tokenStr = typeof payload === 'string' ? payload : payload?.refreshToken;
    const req = payload?.req || null;
    if (!tokenStr) {
      throw ApiError.badRequest('Refresh token is required');
    }

    // 1. Generate new replacement token pair in advance
    const { accessToken, refreshTokenValue, refreshExpiresAt } = this._generateTokens({ _id: 'temp' });

    // 2. Atomic rotation: only ONE concurrent request can successfully find and revoke this token
    const tokenDoc = await RefreshToken.findOneAndUpdate(
      {
        token: tokenStr,
        isRevoked: false,
        expiresAt: { $gt: new Date() }
      },
      {
        $set: {
          isRevoked: true,
          replacedByToken: refreshTokenValue
        }
      },
      { new: false }
    );

    // 3. If atomic update failed, check if token was revoked (replay attack detection)
    if (!tokenDoc) {
      const revokedCheck = await RefreshToken.findOne({ token: tokenStr });
      if (revokedCheck && revokedCheck.isRevoked) {
        // Replay detected! Invalidate entire token family for this user to prevent session hijacking
        await RefreshToken.updateMany({ user: revokedCheck.user }, { $set: { isRevoked: true } });
        logger.warn(`Security alert: Revoked refresh token reused for user ${revokedCheck.user}. All active sessions invalidated.`);
        throw ApiError.unauthorized('Security alert: Revoked refresh token reused. All sessions have been terminated.');
      }
      throw ApiError.unauthorized('Invalid or expired refresh token');
    }

    const user = await User.findById(tokenDoc.user);
    if (!user || !user.isActive) {
      throw ApiError.unauthorized('User not found or deactivated');
    }

    // Now re-generate tokens with the real user payload
    const realTokens = this._generateTokens(user);

    // Update the replacement token record to match the actual user payload
    await RefreshToken.updateOne(
      { token: tokenStr },
      { $set: { replacedByToken: realTokens.refreshTokenValue } }
    );

    await RefreshToken.create({
      token: realTokens.refreshTokenValue,
      user: user._id,
      expiresAt: realTokens.refreshExpiresAt,
      createdByIp: req?.ip || ''
    });

    return {
      tokens: {
        accessToken: realTokens.accessToken,
        refreshToken: realTokens.refreshTokenValue,
        expiresIn: env.JWT_ACCESS_EXPIRY
      }
    };
  }

  /**
   * Revoke refresh token (Logout)
   */
  async logout({ refreshToken: tokenStr, userId = null }) {
    if (tokenStr) {
      await RefreshToken.updateOne({ token: tokenStr }, { isRevoked: true });
    }
    if (userId) {
      await RefreshToken.updateMany({ user: userId }, { isRevoked: true });
    }
    return true;
  }

  /**
   * Get user profile
   */
  async getProfile(userId) {
    const user = await User.findById(userId);
    if (!user) throw ApiError.notFound('User not found');
    return user.toJSON();
  }

  /**
   * Update user profile
   */
  async updateProfile(userId, updates, req = null) {
    const allowedUpdates = ['name', 'firstName', 'lastName', 'phone', 'nationality', 'countryOfResidence', 'passportNumber'];
    const filtered = {};
    for (const key of allowedUpdates) {
      if (updates[key] !== undefined) filtered[key] = updates[key];
    }

    const previous = await User.findById(userId);
    if (!previous) throw ApiError.notFound('User not found');

    const updated = await User.findByIdAndUpdate(userId, filtered, { new: true, runValidators: true });

    await auditService.log({
      actor: userId,
      actorEmail: updated.email,
      actorRole: updated.role,
      action: AUDIT_ACTIONS.UPDATE,
      entity: AUDIT_ENTITIES.USER,
      entityId: userId,
      previousValues: previous.toJSON(),
      newValues: updated.toJSON(),
      req
    });

    return updated.toJSON();
  }
}

export const authService = new AuthService();
export default authService;
