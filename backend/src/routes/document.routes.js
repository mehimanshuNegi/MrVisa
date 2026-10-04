import { Router } from 'express';
import {
  uploadDocument,
  getDocumentById,
  getSignedUrl,
  getDocumentFile,
  deleteDocument,
  updateDocumentStatus,
  serveLocalRawFile
} from '../controllers/document.controller.js';
import { processPassportOcr } from '../controllers/application.controller.js';
import { authenticate, optionalAuthenticate, authorize } from '../middleware/auth.middleware.js';
import { validate } from '../middleware/validate.middleware.js';
import { uploadMiddleware, passportUploadMiddleware } from '../middleware/upload.middleware.js';
import { updateDocumentStatusSchema } from '../validators/document.validator.js';
import { ROLES } from '../constants/roles.js';

const router = Router();

// Passport-first OCR endpoint
router.post('/passport-ocr', optionalAuthenticate, passportUploadMiddleware, processPassportOcr);

// 1. Upload document (Attached to application specified in body)
router.post('/', optionalAuthenticate, uploadMiddleware.single('file'), uploadDocument);
router.post('/upload', optionalAuthenticate, uploadMiddleware.single('file'), uploadDocument);

// 2. Get document metadata (Secured)
router.get('/:id', authenticate, getDocumentById);

// 3. Get temporary signed download/view URL (Secured: requires authentication and application ownership)
router.get('/:id/signed-url', authenticate, getSignedUrl);
router.get('/:id/url', authenticate, getSignedUrl);
router.get('/:id/download', authenticate, getSignedUrl);
router.get('/:id/preview', authenticate, getSignedUrl);
router.get('/:id/file', authenticate, getDocumentFile);

// 4. Delete document (Deletes from Cloudflare R2 and marks deleted in MongoDB)
router.delete('/:id', authenticate, deleteDocument);

// 5. Admin verify or reject document
router.patch('/:id/status', authenticate, authorize(ROLES.ADMIN), validate(updateDocumentStatusSchema), updateDocumentStatus);

// 6. Local file stream endpoint (HMAC token protected for local dev)
router.get('/raw/*', serveLocalRawFile);

export default router;
