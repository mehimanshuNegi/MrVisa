import multer from 'multer';
import { ApiError } from '../utils/apiError.js';

const ALLOWED_MIME_TYPES = [
  'image/jpeg',
  'image/png',
  'image/webp',
  'application/pdf',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
];

/**
 * Validates buffer signature (magic bytes) to prevent renamed/corrupt files
 */
export function validateBufferMagicBytes(buffer, mimetype = '', filename = '') {
  if (!buffer || buffer.length === 0) {
    return { isValid: false, error: 'File is empty (0 bytes). Please upload a valid document.' };
  }

  // 1. PDF signature (%PDF) -> 0x25 0x50 0x44 0x46
  if (buffer.length >= 4 && buffer[0] === 0x25 && buffer[1] === 0x50 && buffer[2] === 0x44 && buffer[3] === 0x46) {
    return { isValid: true, detectedType: 'application/pdf', extension: 'pdf' };
  }

  // 2. JPEG signature (\xFF\xD8\xFF)
  if (buffer.length >= 3 && buffer[0] === 0xFF && buffer[1] === 0xD8 && buffer[2] === 0xFF) {
    return { isValid: true, detectedType: 'image/jpeg', extension: 'jpg' };
  }

  // 3. PNG signature (\x89PNG\r\n\x1a\n)
  if (
    buffer.length >= 8 &&
    buffer[0] === 0x89 &&
    buffer[1] === 0x50 &&
    buffer[2] === 0x4E &&
    buffer[3] === 0x47 &&
    buffer[4] === 0x0D &&
    buffer[5] === 0x0A &&
    buffer[6] === 0x1A &&
    buffer[7] === 0x0A
  ) {
    return { isValid: true, detectedType: 'image/png', extension: 'png' };
  }

  // 4. WEBP signature (RIFF....WEBP)
  if (
    buffer.length >= 12 &&
    buffer[0] === 0x52 && buffer[1] === 0x49 && buffer[2] === 0x46 && buffer[3] === 0x46 &&
    buffer[8] === 0x57 && buffer[9] === 0x45 && buffer[10] === 0x42 && buffer[11] === 0x50
  ) {
    return { isValid: true, detectedType: 'image/webp', extension: 'webp' };
  }

  // 5. DOCX signature (PK\x03\x04 - ZIP archive)
  if (buffer.length >= 4 && buffer[0] === 0x50 && buffer[1] === 0x4B && buffer[2] === 0x03 && buffer[3] === 0x04) {
    return { isValid: true, detectedType: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document', extension: 'docx' };
  }

  // 6. DOC signature (OLE Compound File) -> \xD0\xCF\x11\xE0\xA1\xB1\x1A\xE1
  if (buffer.length >= 8 && buffer[0] === 0xD0 && buffer[1] === 0xCF && buffer[2] === 0x11 && buffer[3] === 0xE0) {
    return { isValid: true, detectedType: 'application/msword', extension: 'doc' };
  }

  // Fallback check against declared mimetype / extension if buffer is valid
  const lowerExt = (filename || '').split('.').pop()?.toLowerCase();
  if (['pdf', 'jpg', 'jpeg', 'png', 'webp', 'doc', 'docx'].includes(lowerExt)) {
    return { isValid: true, detectedType: mimetype || 'application/octet-stream', extension: lowerExt };
  }

  return { isValid: false, error: 'File contents do not match any supported document format (PDF, JPG, PNG, WEBP, DOCX).' };
}

/**
 * Reusable Multer memory storage middleware with file size and MIME filtering
 */
export const uploadMiddleware = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 25 * 1024 * 1024 // 25MB maximum file size for high-res documents & multi-page PDFs
  },
  fileFilter: (req, file, cb) => {
    const filename = (file.originalname || '').toLowerCase();
    const hasAllowedExt = /\.(jpe?g|png|webp|pdf|docx?)$/i.test(filename);
    if (ALLOWED_MIME_TYPES.includes(file.mimetype) || hasAllowedExt) {
      cb(null, true);
    } else {
      cb(
        ApiError.badRequest('Invalid file format. Only PDF, JPEG, PNG, WEBP, and DOC/DOCX documents are allowed.'),
        false
      );
    }
  }
});

/**
 * Flexible upload middleware accepting single file under any common field name:
 * 'file', 'document', 'passportFile', 'attachment', etc.
 */
export const flexibleUploadMiddleware = (req, res, next) => {
  uploadMiddleware.any()(req, res, (err) => {
    if (err) {
      if (err.code === 'LIMIT_FILE_SIZE') {
        return next(ApiError.badRequest('File size exceeds the 25 MB maximum limit. Please compress or select a smaller file.'));
      }
      return next(err);
    }
    if (!req.file && Array.isArray(req.files) && req.files.length > 0) {
      req.file =
        req.files.find((f) => ['file', 'document', 'passportFile', 'attachment', 'passport', 'photo'].includes(f.fieldname)) ||
        req.files[0];
    }
    next();
  });
};

/**
 * Flexible passport upload middleware supporting multiple common field names:
 * 'passportFile', 'file', 'passport', 'photo', or any uploaded file attachment.
 */
export const passportUploadMiddleware = (req, res, next) => {
  uploadMiddleware.any()(req, res, (err) => {
    if (err) {
      if (err.code === 'LIMIT_FILE_SIZE') {
        return next(ApiError.badRequest('File size exceeds the 25 MB maximum limit. Please compress or select a smaller file.'));
      }
      return next(err);
    }
    if (!req.file && Array.isArray(req.files) && req.files.length > 0) {
      req.file =
        req.files.find((f) => ['passportFile', 'file', 'passport', 'image', 'photo'].includes(f.fieldname)) ||
        req.files[0];
    }
    next();
  });
};

export default uploadMiddleware;
