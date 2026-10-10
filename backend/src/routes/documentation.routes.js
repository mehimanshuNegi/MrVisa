import { Router } from 'express';
import {
  getAllDocumentationServices,
  getDocumentationServiceById,
  createDocumentationService,
  updateDocumentationService,
  toggleDocumentationServiceStatus,
  deleteDocumentationService
} from '../controllers/documentation.controller.js';
import {
  createDocumentationRequest,
  getMyDocumentationRequests,
  getAllDocumentationRequests,
  getDocumentationRequestById,
  updateDocumentationRequestStatus
} from '../controllers/documentationRequest.controller.js';
import { authenticate, optionalAuthenticate, authorize } from '../middleware/auth.middleware.js';
import { validate } from '../middleware/validate.middleware.js';
import {
  createDocumentationServiceSchema,
  updateDocumentationServiceSchema,
  documentationQuerySchema
} from '../validators/documentation.validator.js';
import { ROLES } from '../constants/roles.js';

const router = Router();

// ==========================================
// CUSTOMER DOCUMENTATION REQUESTS & APPLICATIONS
// (Must precede /:idOrSlug route!)
// ==========================================
router.post('/requests', optionalAuthenticate, createDocumentationRequest);
router.get('/requests/my', authenticate, getMyDocumentationRequests);
router.get('/requests', authenticate, authorize(ROLES.ADMIN), getAllDocumentationRequests);
router.get('/requests/:id', authenticate, getDocumentationRequestById);
router.patch('/requests/:id/status', authenticate, authorize(ROLES.ADMIN), updateDocumentationRequestStatus);

// ==========================================
// DOCUMENTATION SERVICE CATALOG
// ==========================================
// Public routes
router.get('/', validate(documentationQuerySchema, 'query'), getAllDocumentationServices);
router.get('/:idOrSlug', getDocumentationServiceById);

// Admin protected routes
router.post('/', authenticate, authorize(ROLES.ADMIN), validate(createDocumentationServiceSchema), createDocumentationService);
router.put('/:id', authenticate, authorize(ROLES.ADMIN), validate(updateDocumentationServiceSchema), updateDocumentationService);
router.patch('/:id/status', authenticate, authorize(ROLES.ADMIN), toggleDocumentationServiceStatus);
router.delete('/:id', authenticate, authorize(ROLES.ADMIN), deleteDocumentationService);

export default router;
