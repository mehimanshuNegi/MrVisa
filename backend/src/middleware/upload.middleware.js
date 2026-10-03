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
 * Reusable Multer memory storage middleware with file size and MIME filtering
 */
export const uploadMiddleware = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 10 * 1024 * 1024 // 10MB maximum file size
  },
  fileFilter: (req, file, cb) => {
    if (ALLOWED_MIME_TYPES.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(
        ApiError.badRequest('Invalid file format. Only JPEG, PNG, WEBP, and PDF documents are allowed.'),
        false
      );
    }
  }
});

export default uploadMiddleware;
