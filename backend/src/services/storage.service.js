import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import { fileURLToPath } from 'url';
import { PutObjectCommand, GetObjectCommand, DeleteObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { getStorageClient } from '../config/storage.js';
import { env } from '../config/environment.js';
import { logger } from '../utils/logger.js';
import { validateFilePayload } from '../utils/fileValidator.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const LOCAL_STORAGE_DIR = path.resolve(__dirname, '../../uploads');

// Ensure local storage directory exists if using local provider
if (!fs.existsSync(LOCAL_STORAGE_DIR)) {
  fs.mkdirSync(LOCAL_STORAGE_DIR, { recursive: true });
}

class StorageService {
  /**
   * Uploads file buffer to Object Storage (R2/S3) or Local Dev Storage
   */
  async uploadFile({ buffer, originalFilename, mimeType, folder = 'documents' }) {
    // Cryptographically inspect magic bytes and sanitize mime type
    const { verifiedMime, ext } = validateFilePayload(buffer, originalFilename, mimeType);
    const uniqueId = crypto.randomBytes(16).toString('hex');
    const storageKey = `${folder}/${Date.now()}-${uniqueId}${ext}`;

    const s3Client = getStorageClient();

    if (s3Client) {
      // Cloudflare R2 / AWS S3 Upload
      const command = new PutObjectCommand({
        Bucket: env.STORAGE_BUCKET,
        Key: storageKey,
        Body: buffer,
        ContentType: mimeType,
        Metadata: {
          originalName: encodeURIComponent(originalFilename || '')
        }
      });

      await s3Client.send(command);
      logger.info(`Uploaded file to cloud storage: ${storageKey}`);
      return { storageKey, originalFilename, mimeType, fileSize: buffer.length };
    }

    // In production, system MUST NOT silently store customer documents on ephemeral local disk
    if (env.NODE_ENV === 'production') {
      throw new Error('Cloud storage is not configured. Customer documents cannot be stored on ephemeral local disk in production.');
    }

    // Local Disk Fallback for development only
    const destinationPath = path.join(LOCAL_STORAGE_DIR, storageKey);
    const destinationDir = path.dirname(destinationPath);
    if (!fs.existsSync(destinationDir)) {
      fs.mkdirSync(destinationDir, { recursive: true });
    }

    await fs.promises.writeFile(destinationPath, buffer);
    logger.info(`Uploaded file to local disk storage: ${storageKey}`);
    return { storageKey, originalFilename, mimeType, fileSize: buffer.length };
  }

  /**
   * Generates a temporary authorized download URL (Signed URL)
   */
  async getSignedUrl(storageKey, expiresInSeconds = env.SIGNED_URL_EXPIRY_SECONDS) {
    const s3Client = getStorageClient();

    if (s3Client) {
      const command = new GetObjectCommand({
        Bucket: env.STORAGE_BUCKET,
        Key: storageKey
      });
      return await getSignedUrl(s3Client, command, { expiresIn: expiresInSeconds });
    }

    if (env.NODE_ENV === 'production') {
      throw new Error('Cloud storage is not configured. Cannot generate document URL in production.');
    }

    // Local Fallback: return tokenized API route URL (development only)
    const token = crypto.createHmac('sha256', env.JWT_ACCESS_SECRET).update(storageKey).digest('hex').substring(0, 16);
    return `${env.CLIENT_URL ? 'http://localhost:5000' : ''}/api/v1/documents/raw/${encodeURIComponent(storageKey)}?token=${token}`;
  }

  /**
   * Deletes a file from storage
   */
  async deleteFile(storageKey) {
    const s3Client = getStorageClient();

    if (s3Client) {
      const command = new DeleteObjectCommand({
        Bucket: env.STORAGE_BUCKET,
        Key: storageKey
      });
      await s3Client.send(command);
      return true;
    }

    const localPath = path.join(LOCAL_STORAGE_DIR, storageKey);
    if (fs.existsSync(localPath)) {
      await fs.promises.unlink(localPath);
    }
    return true;
  }

  /**
   * Retrieves an object stream and metadata from Object Storage (R2/S3) or Local Disk
   */
  async getObjectStream(storageKey) {
    const s3Client = getStorageClient();

    if (s3Client) {
      try {
        const command = new GetObjectCommand({
          Bucket: env.STORAGE_BUCKET,
          Key: storageKey
        });
        const response = await s3Client.send(command);
        return {
          stream: response.Body,
          contentType: response.ContentType || 'image/jpeg',
          contentLength: response.ContentLength
        };
      } catch (err) {
        if (err.name === 'NoSuchKey' || err.$metadata?.httpStatusCode === 404) {
          return null;
        }
        throw err;
      }
    }

    const safePath = path.normalize(path.join(LOCAL_STORAGE_DIR, storageKey));
    if (!safePath.startsWith(LOCAL_STORAGE_DIR) || !fs.existsSync(safePath)) {
      return null;
    }

    const ext = path.extname(safePath).toLowerCase();
    const mimeMap = {
      '.png': 'image/png',
      '.jpg': 'image/jpeg',
      '.jpeg': 'image/jpeg',
      '.webp': 'image/webp',
      '.pdf': 'application/pdf'
    };

    return {
      stream: fs.createReadStream(safePath),
      contentType: mimeMap[ext] || 'application/octet-stream',
      contentLength: (await fs.promises.stat(safePath)).size
    };
  }
}

export const storageService = new StorageService();
export default storageService;
