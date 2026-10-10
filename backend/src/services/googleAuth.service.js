import { OAuth2Client } from 'google-auth-library';
import { env } from '../config/environment.js';
import { ApiError } from '../utils/apiError.js';
import { logger } from '../utils/logger.js';

class GoogleAuthService {
  constructor() {
    this._client = null;
    this._customVerifier = null;
  }

  getClient() {
    if (!this._client) {
      if (!env.GOOGLE_CLIENT_ID) {
        throw ApiError.internal('Google Sign-In is not configured on the server (GOOGLE_CLIENT_ID missing)');
      }
      this._client = new OAuth2Client(env.GOOGLE_CLIENT_ID);
    }
    return this._client;
  }

  /**
   * Set custom verifier function for automated security and regression test suites
   * @param {Function|null} fn
   */
  setVerifier(fn) {
    this._customVerifier = fn;
  }

  /**
   * Reset custom verifier to default OAuth2Client
   */
  resetVerifier() {
    this._customVerifier = null;
  }

  /**
   * Server-side Google ID Token Verification
   * Uses Google's official google-auth-library to verify signature, issuer, audience, and expiry.
   * Enforces email_verified === true and extracts stable Google sub identifier.
   *
   * @param {string} idToken
   * @returns {Promise<{ sub: string, email: string, emailVerified: boolean, name: string, givenName: string, familyName: string, picture: string }>}
   */
  async verifyIdToken(idToken) {
    if (!idToken || typeof idToken !== 'string') {
      throw ApiError.badRequest('A valid Google ID token is required');
    }

    if (!env.GOOGLE_CLIENT_ID && !this._customVerifier) {
      logger.error('Google ID token verification failed: GOOGLE_CLIENT_ID is not configured');
      throw ApiError.internal('Google Sign-In is not configured on this server');
    }

    let payload;

    if (this._customVerifier) {
      payload = await this._customVerifier(idToken, env.GOOGLE_CLIENT_ID);
    } else {
      const client = this.getClient();
      let ticket;
      try {
        ticket = await client.verifyIdToken({
          idToken,
          audience: env.GOOGLE_CLIENT_ID
        });
      } catch (err) {
        logger.warn(`Google token verification failed: ${err.message}`);
        throw ApiError.unauthorized(`Invalid or expired Google authentication token: ${err.message}`);
      }

      payload = ticket.getPayload();
    }

    if (!payload) {
      throw ApiError.unauthorized('Invalid Google token: Payload empty');
    }

    // 1. Validate audience strictly against configured Google Client ID
    const clientId = env.GOOGLE_CLIENT_ID;
    if (clientId && payload.aud !== clientId) {
      throw ApiError.unauthorized(`Google token audience mismatch: expected ${clientId}, received ${payload.aud}`);
    }

    // 2. Validate token issuer
    const validIssuers = ['accounts.google.com', 'https://accounts.google.com'];
    if (!validIssuers.includes(payload.iss)) {
      throw ApiError.unauthorized(`Invalid Google token issuer: ${payload.iss}`);
    }

    // 3. Validate token expiry
    const nowInSeconds = Math.floor(Date.now() / 1000);
    if (!payload.exp || payload.exp < nowInSeconds) {
      throw ApiError.unauthorized('Google authentication token has expired');
    }

    // 4. Stable sub claim as provider account identifier
    if (!payload.sub) {
      throw ApiError.unauthorized('Google token is missing stable subject identifier (sub)');
    }

    // 5. Require valid email
    if (!payload.email) {
      throw ApiError.badRequest('Google account did not provide an email address');
    }

    // 6. Strict check: Never treat an unverified email as verified
    if (payload.email_verified !== true) {
      throw ApiError.unauthorized('Google email address is not verified. Unverified accounts cannot be used to sign in.');
    }

    return {
      sub: payload.sub,
      email: payload.email.toLowerCase().trim(),
      emailVerified: true,
      name: (payload.name || `${payload.given_name || ''} ${payload.family_name || ''}`).trim() || 'Google User',
      givenName: payload.given_name || '',
      familyName: payload.family_name || '',
      picture: payload.picture || ''
    };
  }
}

export const googleAuthService = new GoogleAuthService();
export default googleAuthService;
