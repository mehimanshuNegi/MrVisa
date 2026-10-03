import { S3Client } from '@aws-sdk/client-s3';
import { env } from './environment.js';
import { logger } from '../utils/logger.js';

let s3ClientInstance = null;

export function getStorageClient() {
  if (s3ClientInstance) return s3ClientInstance;

  // Cloudflare R2 / AWS S3 S3Client configuration
  if (env.STORAGE_ACCESS_KEY_ID && env.STORAGE_SECRET_ACCESS_KEY) {
    const config = {
      region: env.STORAGE_REGION || 'auto',
      credentials: {
        accessKeyId: env.STORAGE_ACCESS_KEY_ID,
        secretAccessKey: env.STORAGE_SECRET_ACCESS_KEY
      }
    };

    if (env.STORAGE_ENDPOINT) {
      config.endpoint = env.STORAGE_ENDPOINT;
    }

    s3ClientInstance = new S3Client(config);
    logger.info(`Object Storage Client initialized using provider: ${env.STORAGE_PROVIDER}`);
    return s3ClientInstance;
  }

  logger.info('Cloud storage credentials not configured. Using local filesystem storage provider for development.');
  return null;
}

export default getStorageClient;
