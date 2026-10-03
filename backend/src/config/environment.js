import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load .env from backend root or system environment
dotenv.config({ path: path.resolve(__dirname, '../../.env') });

const DEV_JWT_ACCESS_FALLBACK = 'dev_nimufly_access_secret_do_not_use_in_prod_32chars';
const DEV_JWT_REFRESH_FALLBACK = 'dev_nimufly_refresh_secret_do_not_use_in_prod_32chars';

const nodeEnv = process.env.NODE_ENV || 'development';
const isProd = nodeEnv === 'production';

// Production Fail-Closed Security Validation
if (isProd) {
  const missingSecrets = [];
  if (!process.env.MONGODB_URI) missingSecrets.push('MONGODB_URI');
  if (!process.env.JWT_ACCESS_SECRET || process.env.JWT_ACCESS_SECRET === DEV_JWT_ACCESS_FALLBACK) {
    missingSecrets.push('JWT_ACCESS_SECRET');
  }
  if (!process.env.JWT_REFRESH_SECRET || process.env.JWT_REFRESH_SECRET === DEV_JWT_REFRESH_FALLBACK) {
    missingSecrets.push('JWT_REFRESH_SECRET');
  }

  if (missingSecrets.length > 0) {
    throw new Error(
      `[SECURITY ERROR] Production cannot start: Missing or invalid required environment secrets (${missingSecrets.join(', ')}). Fail closed.`
    );
  }
}

export const env = {
  NODE_ENV: nodeEnv,
  PORT: parseInt(process.env.PORT || '5000', 10),
  CLIENT_URL: process.env.CLIENT_URL || 'http://localhost:5173',

  // Database
  MONGODB_URI: process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/nimufly',

  // JWT (Dev defaults permitted ONLY outside production)
  JWT_ACCESS_SECRET: process.env.JWT_ACCESS_SECRET || (isProd ? '' : DEV_JWT_ACCESS_FALLBACK),
  JWT_REFRESH_SECRET: process.env.JWT_REFRESH_SECRET || (isProd ? '' : DEV_JWT_REFRESH_FALLBACK),
  JWT_ACCESS_EXPIRY: process.env.JWT_ACCESS_EXPIRY || '15m',
  JWT_REFRESH_EXPIRY: process.env.JWT_REFRESH_EXPIRY || '7d',

  // Default Admin Credentials (Initial Seeding)
  DEFAULT_ADMIN_NAME: process.env.DEFAULT_ADMIN_NAME || 'NimuFly Admin',
  DEFAULT_ADMIN_EMAIL: process.env.DEFAULT_ADMIN_EMAIL || 'admin@nimufly.com',
  DEFAULT_ADMIN_PASSWORD: process.env.DEFAULT_ADMIN_PASSWORD || (isProd ? '' : ''),

  // Storage (Cloudflare R2 / S3 / Local)
  STORAGE_PROVIDER: process.env.STORAGE_PROVIDER || (isProd ? 's3' : 'local'),
  STORAGE_ENDPOINT: process.env.STORAGE_ENDPOINT || '',
  STORAGE_REGION: process.env.STORAGE_REGION || 'auto',
  STORAGE_BUCKET: process.env.STORAGE_BUCKET || 'nimufly-documents',
  STORAGE_ACCESS_KEY_ID: process.env.STORAGE_ACCESS_KEY_ID || '',
  STORAGE_SECRET_ACCESS_KEY: process.env.STORAGE_SECRET_ACCESS_KEY || '',
  SIGNED_URL_EXPIRY_SECONDS: parseInt(process.env.SIGNED_URL_EXPIRY_SECONDS || '900', 10),

  // Razorpay
  RAZORPAY_KEY_ID: process.env.RAZORPAY_KEY_ID || '',
  RAZORPAY_KEY_SECRET: process.env.RAZORPAY_KEY_SECRET || '',
  RAZORPAY_WEBHOOK_SECRET: process.env.RAZORPAY_WEBHOOK_SECRET || '',

  // Rate Limiting
  RATE_LIMIT_WINDOW_MS: parseInt(process.env.RATE_LIMIT_WINDOW_MS || '900000', 10), // 15 mins
  RATE_LIMIT_MAX: parseInt(process.env.RATE_LIMIT_MAX || '1000', 10)
};

export const isProduction = env.NODE_ENV === 'production';
export const isDevelopment = env.NODE_ENV === 'development';
export default env;

