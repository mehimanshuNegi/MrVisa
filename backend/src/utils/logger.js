/**
 * Structured Production Logger
 * Provides consistent timestamps, log levels, and sanitizes sensitive data (passwords, tokens, payment secrets).
 */

const LOG_LEVELS = {
  ERROR: 'ERROR',
  WARN: 'WARN',
  INFO: 'INFO',
  DEBUG: 'DEBUG'
};

const SENSITIVE_KEYS = new Set([
  'password',
  'passwordhash',
  'token',
  'refreshtoken',
  'accesstoken',
  'authorization',
  'jwt_secret',
  'razorpay_key_secret',
  'storage_secret_access_key',
  'secret'
]);

function sanitize(data) {
  if (!data || typeof data !== 'object') return data;
  if (Array.isArray(data)) return data.map(sanitize);

  const cleaned = {};
  for (const [key, value] of Object.entries(data)) {
    if (SENSITIVE_KEYS.has(key.toLowerCase())) {
      cleaned[key] = '[REDACTED]';
    } else if (value && typeof value === 'object') {
      cleaned[key] = sanitize(value);
    } else {
      cleaned[key] = value;
    }
  }
  return cleaned;
}

function formatLog(level, message, meta = null) {
  const timestamp = new Date().toISOString();
  let log = `[${timestamp}] [${level}] ${message}`;
  if (meta) {
    try {
      const sanitizedMeta = sanitize(meta);
      log += ` | ${JSON.stringify(sanitizedMeta)}`;
    } catch {
      log += ` | [Unserializable metadata]`;
    }
  }
  return log;
}

export const logger = {
  info: (message, meta) => console.log(formatLog(LOG_LEVELS.INFO, message, meta)),
  warn: (message, meta) => console.warn(formatLog(LOG_LEVELS.WARN, message, meta)),
  error: (message, meta) => console.error(formatLog(LOG_LEVELS.ERROR, message, meta)),
  debug: (message, meta) => {
    if (process.env.NODE_ENV !== 'production') {
      console.log(formatLog(LOG_LEVELS.DEBUG, message, meta));
    }
  }
};

export default logger;
