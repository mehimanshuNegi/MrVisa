import { Router } from 'express';
import {
  createApplication,
  getApplications,
  getApplicationById,
  updateApplication,
  submitApplication,
  getApplicationStatus,
  getApplicationDocuments,
  uploadDocumentForApplication,
  updateCustomerAction,
  claimGuestApplication
} from '../controllers/application.controller.js';
import { authenticate, optionalAuthenticate } from '../middleware/auth.middleware.js';
import { validate } from '../middleware/validate.middleware.js';
import { uploadMiddleware } from '../middleware/upload.middleware.js';
import {
  createApplicationSchema,
  updateApplicationSchema,
  submitApplicationSchema,
  updateActionSchema,
  applicationQuerySchema,
  claimApplicationSchema
} from '../validators/application.validator.js';
import { claimLimiter } from '../middleware/rateLimiter.middleware.js';

const router = Router();

// 1. Create or Draft Application (Guest or Authenticated Customer)
router.post('/', optionalAuthenticate, validate(createApplicationSchema), createApplication);

// 2. Customer or Admin applications list (Secured)
router.get('/', authenticate, validate(applicationQuerySchema, 'query'), getApplications);

// 3. Customer claim/link unclaimed guest application (Secured & rate-limited)
router.post('/claim', claimLimiter, authenticate, validate(claimApplicationSchema), claimGuestApplication);

// 4. Single Application Details (Secured)
router.get('/:idOrRef', authenticate, getApplicationById);

// 5. Application Status and Timeline Summary (Secured)
router.get('/:idOrRef/status', authenticate, getApplicationStatus);

// 6. Update Application Details (Customer editing draft or Admin managing status/notes)
router.put('/:idOrRef', authenticate, validate(updateApplicationSchema), updateApplication);
router.patch('/:idOrRef', authenticate, validate(updateApplicationSchema), updateApplication);

// 7. Submit Application for consulate review (Validates required applicant info & documents)
router.post('/:idOrRef/submit', authenticate, validate(submitApplicationSchema), submitApplication);

// 8. Application Documents Sub-routes
router.get('/:idOrRef/documents', authenticate, getApplicationDocuments);
router.post('/:idOrRef/documents', optionalAuthenticate, uploadMiddleware.single('file'), uploadDocumentForApplication);

// 9. Customer action response (e.g. re-upload when ADDITIONAL_INFORMATION_REQUIRED)
router.post('/:idOrRef/actions', authenticate, validate(updateActionSchema), updateCustomerAction);

export default router;
