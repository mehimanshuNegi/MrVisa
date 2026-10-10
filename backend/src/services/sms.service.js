import { logger } from '../utils/logger.js';

class SmsService {
  constructor() {
    this.provider = this._detectProvider();
    if (this.provider === 'none') {
      logger.info('[SmsService] No live SMS provider configured (TWILIO_ACCOUNT_SID or SMS_API_KEY missing).');
    } else {
      logger.info(`[SmsService] Initialized with provider: ${this.provider.toUpperCase()}`);
    }
  }

  _detectProvider() {
    if (process.env.TWILIO_ACCOUNT_SID && process.env.TWILIO_AUTH_TOKEN && process.env.TWILIO_PHONE_NUMBER) {
      return 'twilio';
    }
    if (process.env.FAST2SMS_API_KEY) {
      return 'fast2sms';
    }
    return 'none';
  }

  isConfigured() {
    return this.provider !== 'none';
  }

  /**
   * Dispatches OTP via configured SMS provider.
   * If unconfigured, clearly returns error so backend never displays false success.
   */
  async sendOtpSms({ phone, code }) {
    if (this.provider === 'none') {
      logger.warn(`[SmsService] Attempted to send SMS OTP to ${phone}, but no SMS provider is configured in environment.`);
      return {
        delivered: false,
        unconfigured: true,
        error: 'SMS service configuration is required in deployment environment to dispatch live SMS.'
      };
    }

    try {
      if (this.provider === 'twilio') {
        const sid = process.env.TWILIO_ACCOUNT_SID;
        const auth = Buffer.from(`${sid}:${process.env.TWILIO_AUTH_TOKEN}`).toString('base64');
        const params = new URLSearchParams();
        params.append('To', phone);
        params.append('From', process.env.TWILIO_PHONE_NUMBER);
        params.append('Body', `Your NimuFly verification code is: ${code}. Valid for 10 minutes.`);

        const res = await fetch(`https://api.twilio.com/2010-04-01/Accounts/${sid}/Messages.json`, {
          method: 'POST',
          headers: {
            Authorization: `Basic ${auth}`,
            'Content-Type': 'application/x-www-form-urlencoded'
          },
          body: params.toString()
        });

        if (!res.ok) {
          const errData = await res.json().catch(() => ({}));
          throw new Error(errData.message || `Twilio HTTP error ${res.status}`);
        }

        return { delivered: true, provider: 'twilio' };
      }

      if (this.provider === 'fast2sms') {
        const res = await fetch('https://www.fast2sms.com/dev/bulkV2', {
          method: 'POST',
          headers: {
            authorization: process.env.FAST2SMS_API_KEY,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            route: 'otp',
            variables_values: code,
            numbers: phone.replace(/\D/g, '')
          })
        });

        if (!res.ok) {
          throw new Error(`Fast2SMS HTTP error ${res.status}`);
        }

        return { delivered: true, provider: 'fast2sms' };
      }

      return { delivered: false, error: 'Unknown SMS provider configuration.' };
    } catch (err) {
      logger.error(`[SmsService] SMS dispatch failed for ${phone}: ${err.message}`);
      return { delivered: false, error: err.message };
    }
  }
}

export const smsService = new SmsService();
export default smsService;
