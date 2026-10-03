import { Router } from 'express';
import {
  getAllVisas,
  searchVisas,
  getVisaById,
  createVisa,
  updateVisa,
  toggleVisaStatus,
  deleteVisa
} from '../controllers/visa.controller.js';
import { authenticate, authorize } from '../middleware/auth.middleware.js';
import { validate } from '../middleware/validate.middleware.js';
import {
  createVisaSchema,
  updateVisaSchema,
  visaQuerySchema
} from '../validators/visa.validator.js';
import { ROLES } from '../constants/roles.js';

const router = Router();

// Public Routes
router.get('/', validate(visaQuerySchema, 'query'), getAllVisas);
router.get('/search', searchVisas);
router.get('/:idOrSlug', getVisaById);

// Admin Protected Routes
router.post('/', authenticate, authorize(ROLES.ADMIN), validate(createVisaSchema), createVisa);
router.put('/:id', authenticate, authorize(ROLES.ADMIN), validate(updateVisaSchema), updateVisa);
router.patch('/:id/status', authenticate, authorize(ROLES.ADMIN), toggleVisaStatus);
router.delete('/:id', authenticate, authorize(ROLES.ADMIN), deleteVisa);

export default router;
