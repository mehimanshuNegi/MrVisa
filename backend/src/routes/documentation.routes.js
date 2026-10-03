import { Router } from 'express';
import {
  getAllDocumentationServices,
  getDocumentationServiceById,
  createDocumentationService,
  updateDocumentationService,
  toggleDocumentationServiceStatus,
  deleteDocumentationService
} from '../controllers/documentation.controller.js';
import { authenticate, authorize } from '../middleware/auth.middleware.js';
import { validate } from '../middleware/validate.middleware.js';
import {
  createDocumentationServiceSchema,
  updateDocumentationServiceSchema,
  documentationQuerySchema
} from '../validators/documentation.validator.js';
import { ROLES } from '../constants/roles.js';

const router = Router();

// Public routes
router.get('/', validate(documentationQuerySchema, 'query'), getAllDocumentationServices);
router.get('/:idOrSlug', getDocumentationServiceById);

// Admin protected routes
router.post('/', authenticate, authorize(ROLES.ADMIN), validate(createDocumentationServiceSchema), createDocumentationService);
router.put('/:id', authenticate, authorize(ROLES.ADMIN), validate(updateDocumentationServiceSchema), updateDocumentationService);
router.patch('/:id/status', authenticate, authorize(ROLES.ADMIN), toggleDocumentationServiceStatus);
router.delete('/:id', authenticate, authorize(ROLES.ADMIN), deleteDocumentationService);

export default router;
