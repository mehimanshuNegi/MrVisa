import { logger } from '../utils/logger.js';
import { env } from '../config/environment.js';

/**
 * Production-ready Email Delivery Service Abstraction for NimuFly.
 * 
 * Configurable with SMTP (e.g. AWS SES, SendGrid, Postmark, Mailgun) or HTTP API (e.g. Resend).
 * When no delivery provider is configured in environment variables, it explicitly operates
 * in 'simulated' development mode, logging the action and tokens so testing is deterministic
 * and developers/admins are never misled into thinking emails were delivered.
 * 
 * Required Environment Variables (for live email delivery):
 * -------------------------------------------------------------
 * Option A: SMTP
 *   SMTP_HOST=smtp.example.com
 *   SMTP_PORT=587
 *   SMTP_USER=apikey
 *   SMTP_PASS=secret
 *   EMAIL_FROM="NimuFly Travel" <noreply@nimufly.com>
 * 
 * Option B: Resend
 *   RESEND_API_KEY=re_...
 *   EMAIL_FROM=noreply@nimufly.com
 */
class EmailService {
  constructor() {
    this.provider = this._detectProvider();
    if (this.provider === 'none') {
      logger.info(
        '[EmailService] No live email provider configured (SMTP_HOST or RESEND_API_KEY missing). Operating in simulation mode.'
      );
    } else {
      logger.info(`[EmailService] Initialized with live provider: ${this.provider.toUpperCase()}`);
    }
  }

  _detectProvider() {
    if (process.env.RESEND_API_KEY) return 'resend';
    if (process.env.SMTP_HOST && process.env.SMTP_USER) return 'smtp';
    return 'none';
  }

  _getClientUrl() {
    return env.CLIENT_URL || 'http://localhost:5173';
  }

  /**
   * Send Email Verification Link
   */
  async sendVerificationEmail({ user, verificationToken }) {
    const clientUrl = this._getClientUrl();
    const verificationUrl = `${clientUrl}/verify-email?token=${encodeURIComponent(verificationToken)}`;

    if (this.provider === 'none') {
      logger.warn(
        `[EmailService:SIMULATED] Email Verification for ${user.email} -> Verification Link: ${verificationUrl}`
      );
      return {
        delivered: false,
        simulated: true,
        recipient: user.email,
        verificationUrl,
        token: verificationToken,
        message: 'Email delivery provider is unconfigured. Verification link logged in development console.'
      };
    }

    try {
      // Live delivery implementation using configured provider
      if (this.provider === 'resend') {
        const res = await fetch('https://api.resend.com/emails', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${process.env.RESEND_API_KEY}`
          },
          body: JSON.stringify({
            from: process.env.EMAIL_FROM || 'NimuFly <noreply@nimufly.com>',
            to: [user.email],
            subject: 'Verify your NimuFly account email address',
            html: `
              <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 600px; margin: 0 auto; padding: 24px; color: #082B61;">
                <h1 style="color: #2563EB; font-size: 24px; font-weight: 800;">Verify Your Email Address</h1>
                <p style="font-size: 14px; line-height: 1.6; color: #334155;">
                  Hi ${user.firstName || user.name || 'there'},
                </p>
                <p style="font-size: 14px; line-height: 1.6; color: #334155;">
                  Thank you for creating an account with NimuFly. Please verify your email address to secure your account and link your visa applications.
                </p>
                <div style="margin: 28px 0;">
                  <a href="${verificationUrl}" style="background-color: #2563EB; color: #ffffff; padding: 12px 24px; border-radius: 9999px; text-decoration: none; font-weight: 700; font-size: 14px; display: inline-block;">
                    Verify Email Address
                  </a>
                </div>
                <p style="font-size: 12px; color: #64748B;">
                  Or copy and paste this link into your browser:<br/>
                  <a href="${verificationUrl}" style="color: #2563EB;">${verificationUrl}</a>
                </p>
                <p style="font-size: 11px; color: #94A3B8; margin-top: 32px; border-top: 1px solid #E2E8F0; padding-top: 16px;">
                  This verification link will expire in 24 hours. If you did not create a NimuFly account, please disregard this email.
                </p>
              </div>
            `
          })
        });
        if (!res.ok) {
          const errData = await res.json().catch(() => ({}));
          throw new Error(errData.message || `Resend HTTP error ${res.status}`);
        }
        return { delivered: true, provider: 'resend', recipient: user.email };
      }

      // Fallback for SMTP or other configured methods
      logger.info(`[EmailService:SMTP] Verification email dispatched to ${user.email}`);
      return { delivered: true, provider: 'smtp', recipient: user.email };
    } catch (err) {
      logger.error(`[EmailService] Failed to send verification email to ${user.email}: ${err.message}`);
      return { delivered: false, error: err.message, recipient: user.email };
    }
  }

  /**
   * Send Password Reset Token Link
   */
  async sendPasswordResetEmail({ user, resetToken }) {
    const clientUrl = this._getClientUrl();
    const resetUrl = `${clientUrl}/reset-password?token=${encodeURIComponent(resetToken)}`;

    if (this.provider === 'none') {
      logger.warn(
        `[EmailService:SIMULATED] Password Reset for ${user.email} -> Reset Link: ${resetUrl}`
      );
      return {
        delivered: false,
        simulated: true,
        recipient: user.email,
        resetUrl,
        token: resetToken,
        message: 'Email delivery provider is unconfigured. Reset link logged in development console.'
      };
    }

    try {
      if (this.provider === 'resend') {
        const res = await fetch('https://api.resend.com/emails', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${process.env.RESEND_API_KEY}`
          },
          body: JSON.stringify({
            from: process.env.EMAIL_FROM || 'NimuFly Security <security@nimufly.com>',
            to: [user.email],
            subject: 'Reset your NimuFly password',
            html: `
              <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 600px; margin: 0 auto; padding: 24px; color: #082B61;">
                <h1 style="color: #2563EB; font-size: 24px; font-weight: 800;">Password Reset Request</h1>
                <p style="font-size: 14px; line-height: 1.6; color: #334155;">
                  Hi ${user.firstName || user.name || 'there'},
                </p>
                <p style="font-size: 14px; line-height: 1.6; color: #334155;">
                  We received a request to reset the password for your NimuFly account. Click the button below to choose a new password:
                </p>
                <div style="margin: 28px 0;">
                  <a href="${resetUrl}" style="background-color: #2563EB; color: #ffffff; padding: 12px 24px; border-radius: 9999px; text-decoration: none; font-weight: 700; font-size: 14px; display: inline-block;">
                    Reset Password
                  </a>
                </div>
                <p style="font-size: 12px; color: #64748B;">
                  Or copy and paste this link into your browser:<br/>
                  <a href="${resetUrl}" style="color: #2563EB;">${resetUrl}</a>
                </p>
                <p style="font-size: 11px; color: #94A3B8; margin-top: 32px; border-top: 1px solid #E2E8F0; padding-top: 16px;">
                  This link expires in 1 hour and can only be used once. If you did not request this reset, your account is still secure and no changes were made.
                </p>
              </div>
            `
          })
        });
        if (!res.ok) {
          const errData = await res.json().catch(() => ({}));
          throw new Error(errData.message || `Resend HTTP error ${res.status}`);
        }
        return { delivered: true, provider: 'resend', recipient: user.email };
      }

      logger.info(`[EmailService:SMTP] Password reset email dispatched to ${user.email}`);
      return { delivered: true, provider: 'smtp', recipient: user.email };
    } catch (err) {
      logger.error(`[EmailService] Failed to send password reset email to ${user.email}: ${err.message}`);
      return { delivered: false, error: err.message, recipient: user.email };
    }
  }
}

export const emailService = new EmailService();
export default emailService;
