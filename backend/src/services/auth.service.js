import jwt from 'jsonwebtoken';
import crypto from 'crypto';
import { User } from '../models/User.js';
import { RefreshToken } from '../models/RefreshToken.js';
import { ApiError } from '../utils/apiError.js';
import { env } from '../config/environment.js';
import { ROLES } from '../constants/roles.js';
import { auditService } from './audit.service.js';
import { emailService } from './email.service.js';
import { AUDIT_ACTIONS, AUDIT_ENTITIES } from '../constants/statuses.js';
import { logger } from '../utils/logger.js';
import { googleAuthService } from './googleAuth.service.js';

class AuthService {
  /**
   * Generates Access and Refresh Token pair with validated issuer, audience, and expiry
   */
  _generateTokens(user) {
    const payload = {
      id: user._id.toString(),
      email: user.email,
      role: user.role
    };

    const accessToken = jwt.sign(payload, env.JWT_ACCESS_SECRET, {
      expiresIn: env.JWT_ACCESS_EXPIRY,
      issuer: 'nimufly-api',
      audience: 'nimufly-client'
    });

    const refreshTokenValue = crypto.randomBytes(40).toString('hex');
    const refreshExpiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000); // 7 days

    return { accessToken, refreshTokenValue, refreshExpiresAt };
  }

  /**
   * Register a new customer
   * Normalizes email, hashes password, assigns CUSTOMER role server-side,
   * generates email verification token, and issues initial authentication session.
   */
  async register({ name, email, phone, password, nationality, req = null }) {
    const cleanEmail = email.toLowerCase().trim();
    const existing = await User.findOne({ email: cleanEmail });
    if (existing) {
      throw ApiError.conflict('An account with this email address already exists');
    }

    // Generate single-use email verification token
    const verificationToken = crypto.randomBytes(32).toString('hex');
    const emailVerificationTokenHash = crypto
      .createHash('sha256')
      .update(verificationToken)
      .digest('hex');
    const emailVerificationExpiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24 hours

    const user = await User.create({
      name: name.trim(),
      email: cleanEmail,
      phone: phone?.trim() || '',
      passwordHash: password,
      role: ROLES.CUSTOMER,
      nationality: nationality || 'Indian',
      isEmailVerified: false,
      emailVerificationTokenHash,
      emailVerificationExpiresAt
    });

    // Send verification email via provider or log in simulated environment
    await emailService.sendVerificationEmail({
      user,
      verificationToken
    });

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
      action: AUDIT_ACTIONS.CREATE,
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
      },
      verificationSent: true
    };
  }

  /**
   * Authenticate user (Customer or Admin) with generic error response against enumeration
   */
  async login({ email, password, req = null }) {
    const cleanEmail = email.toLowerCase().trim();
    const user = await User.findOne({ email: cleanEmail }).select('+passwordHash');
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
   * Authenticate or register customer via verified Google ID Token
   * Strict security guarantees:
   * - Server-side verification with google-auth-library
   * - Never trust client-supplied email/role
   * - Enforces email_verified === true
   * - Enforces unique sub identifier
   * - Rejects admin role escalation / admin authentication
   * - Does not silently merge existing unlinked email/password accounts
   * - Uses existing dual-token and refresh-token rotation architecture
   */
  async loginWithGoogle({ idToken, req = null }) {
    // 1. Verify Google ID token cryptographically
    const googleProfile = await googleAuthService.verifyIdToken(idToken);
    const { sub: googleId, email: cleanEmail, name, givenName, familyName, picture } = googleProfile;

    // 2. Resolve account by linked Google Subject ID (sub)
    let user = await User.findOne({ googleId });

    if (user) {
      // Deactivated account check
      if (!user.isActive) {
        throw ApiError.forbidden('Your account has been deactivated. Please contact customer support.');
      }

      // Administrative boundary check: Google login is strictly customer-facing
      if (user.role === ROLES.ADMIN || user.role === ROLES.SUPER_ADMIN) {
        throw ApiError.forbidden('Google sign-in is not permitted for administrative accounts.');
      }

      // Do NOT overwrite user profile without consent; update lastLoginAt and avatar if empty
      user.lastLoginAt = new Date();
      if (!user.avatar && picture) {
        user.avatar = picture;
      }
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
        },
        isNewUser: false
      };
    }

    // 3. No account linked to this googleId yet. Check if an account already exists with this verified email
    const existingByEmail = await User.findOne({ email: cleanEmail });

    if (existingByEmail) {
      // Prevent admin account access
      if (existingByEmail.role === ROLES.ADMIN || existingByEmail.role === ROLES.SUPER_ADMIN) {
        throw ApiError.forbidden('Google sign-in is not permitted for administrative accounts.');
      }

      // If existing account already linked to another Google identity
      if (existingByEmail.googleId && existingByEmail.googleId !== googleId) {
        throw ApiError.conflict('This email address is already linked to a different Google account.');
      }

      // Email/password account exists without Google link:
      // SECURITY: Do NOT silently merge accounts. Require customer authentication to complete safe linking.
      const linkError = ApiError.conflict(
        'An account with this email address already exists. Please sign in with your email and password to link your Google account.'
      );
      linkError.code = 'ACCOUNT_EXISTS_LINK_REQUIRED';
      linkError.data = { email: cleanEmail, requiresLinking: true };
      throw linkError;
    }

    // 4. No linked account and no existing email match: Register new Customer
    try {
      user = await User.create({
        name: name || 'Customer',
        firstName: givenName || '',
        lastName: familyName || '',
        email: cleanEmail,
        googleId,
        authProvider: 'google',
        role: ROLES.CUSTOMER, // Strictly customer
        isEmailVerified: true, // Google email is verified
        emailVerifiedAt: new Date(),
        isActive: true,
        nationality: 'Indian',
        avatar: picture || '',
        lastLoginAt: new Date()
      });
    } catch (err) {
      // Handle concurrent registration race conditions safely
      if (err.code === 11000) {
        const concurrentUser = await User.findOne({ $or: [{ googleId }, { email: cleanEmail }] });
        if (concurrentUser && concurrentUser.googleId === googleId) {
          user = concurrentUser;
        } else {
          throw ApiError.conflict('An account with this email or Google account already exists.');
        }
      } else {
        throw err;
      }
    }

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
      action: AUDIT_ACTIONS.CREATE,
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
      },
      isNewUser: true
    };
  }

  /**
   * Explicitly link Google account to an authenticated customer account
   */
  async linkGoogleAccount({ userId, idToken, req = null }) {
    const user = await User.findById(userId);
    if (!user || !user.isActive) {
      throw ApiError.unauthorized('User not found or deactivated');
    }

    if (user.role === ROLES.ADMIN || user.role === ROLES.SUPER_ADMIN) {
      throw ApiError.forbidden('Google account linking is not permitted for administrative accounts.');
    }

    const googleProfile = await googleAuthService.verifyIdToken(idToken);
    const { sub: googleId, email: googleEmail, picture } = googleProfile;

    // Strict identity match: Google email must match the account's registered email
    if (googleEmail.toLowerCase().trim() !== user.email.toLowerCase().trim()) {
      throw ApiError.badRequest(
        `Google email (${googleEmail}) does not match your account email (${user.email}). Linking rejected.`
      );
    }

    // Ensure this googleId is not already linked to another account
    const existingGoogleUser = await User.findOne({ googleId });
    if (existingGoogleUser && existingGoogleUser._id.toString() !== user._id.toString()) {
      throw ApiError.conflict('This Google account is already linked to another NimuFly account.');
    }

    user.googleId = googleId;
    user.isEmailVerified = true;
    if (!user.emailVerifiedAt) {
      user.emailVerifiedAt = new Date();
    }
    if (!user.avatar && picture) {
      user.avatar = picture;
    }
    await user.save();

    await auditService.log({
      actor: user._id,
      actorEmail: user.email,
      actorRole: user.role,
      action: AUDIT_ACTIONS.UPDATE,
      entity: AUDIT_ENTITIES.USER,
      entityId: user._id,
      req
    });

    return {
      linked: true,
      user: user.toJSON()
    };
  }

  /**
   * Rotate refresh token and issue new token pair
   * Implements strict atomic rotation & replay attack detection (invalidating all sessions on reuse)
   */
  async refreshToken(payload) {
    const tokenStr = typeof payload === 'string' ? payload : (payload?.refreshToken || payload?.token);
    const req = payload?.req || null;
    if (!tokenStr) {
      throw ApiError.unauthorized('Refresh token is required');
    }

    // 1. Generate new replacement token pair in advance
    const { accessToken, refreshTokenValue, refreshExpiresAt } = this._generateTokens({ _id: 'temp' });

    // 2. Atomic rotation: only ONE concurrent request can successfully find and revoke this active token
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
        logger.warn(
          `Security alert: Revoked refresh token reused for user ${revokedCheck.user}. All active sessions invalidated.`
        );
        throw ApiError.unauthorized('Security alert: Revoked refresh token reused. All sessions have been terminated.');
      }
      throw ApiError.unauthorized('Invalid or expired refresh token. Please sign in again.');
    }

    const user = await User.findById(tokenDoc.user);
    if (!user || !user.isActive) {
      throw ApiError.unauthorized('User not found or deactivated');
    }

    // Generate fresh tokens with the real user payload
    const realTokens = this._generateTokens(user);

    // Update replacement token record
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
      user: user.toJSON(),
      tokens: {
        accessToken: realTokens.accessToken,
        refreshToken: realTokens.refreshTokenValue,
        expiresIn: env.JWT_ACCESS_EXPIRY
      }
    };
  }

  /**
   * Revoke refresh token on logout
   */
  async logout({ refreshToken: tokenStr, userId = null }) {
    if (tokenStr) {
      await RefreshToken.updateOne({ token: tokenStr }, { $set: { isRevoked: true } });
    }
    if (userId) {
      await RefreshToken.updateMany({ user: userId }, { $set: { isRevoked: true } });
    }
    return true;
  }

  /**
   * Verify email address with single-use cryptographic token
   */
  async verifyEmail({ token, req = null }) {
    if (!token) {
      throw ApiError.badRequest('Verification token is required');
    }

    const tokenHash = crypto.createHash('sha256').update(token.trim()).digest('hex');

    const user = await User.findOne({
      emailVerificationTokenHash: tokenHash,
      emailVerificationExpiresAt: { $gt: new Date() }
    });

    if (!user) {
      throw ApiError.badRequest('Email verification token is invalid or has expired');
    }

    user.isEmailVerified = true;
    user.emailVerifiedAt = new Date();
    user.emailVerificationTokenHash = undefined;
    user.emailVerificationExpiresAt = undefined;
    await user.save();

    await auditService.log({
      actor: user._id,
      actorEmail: user.email,
      actorRole: user.role,
      action: AUDIT_ACTIONS.UPDATE,
      entity: AUDIT_ENTITIES.USER,
      entityId: user._id,
      req
    });

    return { emailVerified: true, user: user.toJSON() };
  }

  /**
   * Resend email verification token (Generic response against account enumeration)
   */
  async resendVerification({ email }) {
    const cleanEmail = email.toLowerCase().trim();
    const user = await User.findOne({ email: cleanEmail });

    if (user && !user.isEmailVerified && user.isActive) {
      const verificationToken = crypto.randomBytes(32).toString('hex');
      const emailVerificationTokenHash = crypto
        .createHash('sha256')
        .update(verificationToken)
        .digest('hex');
      user.emailVerificationTokenHash = emailVerificationTokenHash;
      user.emailVerificationExpiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000);
      await user.save();

      await emailService.sendVerificationEmail({
        user,
        verificationToken
      });
    }

    return {
      message: 'If your email is registered and unverified, a verification link has been sent.'
    };
  }

  /**
   * Initiate forgot password flow (Generic response against account enumeration)
   */
  async forgotPassword({ email }) {
    const cleanEmail = email.toLowerCase().trim();
    const user = await User.findOne({ email: cleanEmail });

    if (user && user.isActive) {
      const resetToken = crypto.randomBytes(32).toString('hex');
      const passwordResetTokenHash = crypto
        .createHash('sha256')
        .update(resetToken)
        .digest('hex');

      user.passwordResetTokenHash = passwordResetTokenHash;
      user.passwordResetExpiresAt = new Date(Date.now() + 60 * 60 * 1000); // 1 hour validity
      await user.save();

      await emailService.sendPasswordResetEmail({
        user,
        resetToken
      });
    }

    return {
      message: 'If an account exists with this email address, password reset instructions have been sent.'
    };
  }

  /**
   * Reset password with single-use cryptographic token and invalidate all previous sessions
   */
  async resetPassword({ token, newPassword, req = null }) {
    if (!token || !newPassword) {
      throw ApiError.badRequest('Token and new password are required');
    }

    const tokenHash = crypto.createHash('sha256').update(token.trim()).digest('hex');

    const user = await User.findOne({
      passwordResetTokenHash: tokenHash,
      passwordResetExpiresAt: { $gt: new Date() }
    }).select('+passwordHash');

    if (!user) {
      throw ApiError.badRequest('Password reset token is invalid or has expired');
    }

    user.passwordHash = newPassword; // Pre-save hook hashes with bcryptjs
    user.passwordResetTokenHash = undefined;
    user.passwordResetExpiresAt = undefined;
    await user.save();

    // Revoke all existing sessions for this user to ensure compromised accounts are sealed
    await RefreshToken.updateMany({ user: user._id }, { $set: { isRevoked: true } });

    await auditService.log({
      actor: user._id,
      actorEmail: user.email,
      actorRole: user.role,
      action: AUDIT_ACTIONS.UPDATE,
      entity: AUDIT_ENTITIES.USER,
      entityId: user._id,
      req
    });

    return { passwordReset: true };
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
   * Update user profile details
   */
  async updateProfile(userId, updates, req = null) {
    const allowedUpdates = [
      'name',
      'firstName',
      'lastName',
      'phone',
      'nationality',
      'countryOfResidence',
      'passportNumber'
    ];
    const filtered = {};
    for (const key of allowedUpdates) {
      if (updates[key] !== undefined) filtered[key] = updates[key];
    }

    // Auto-sync composite name if firstName / lastName changed
    if (filtered.firstName || filtered.lastName) {
      const prev = await User.findById(userId);
      const fName = filtered.firstName !== undefined ? filtered.firstName : (prev?.firstName || '');
      const lName = filtered.lastName !== undefined ? filtered.lastName : (prev?.lastName || '');
      filtered.name = `${fName} ${lName}`.trim() || prev?.name || 'Customer';
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
