import { Router } from 'express';
import {
  getAllCountries,
  getCountryById,
  getCountryVisas,
  createCountry,
  updateCountry,
  toggleCountryStatus,
  deleteCountry
} from '../controllers/country.controller.js';
import { authenticate, authorize } from '../middleware/auth.middleware.js';
import { validate } from '../middleware/validate.middleware.js';
import {
  createCountrySchema,
  updateCountrySchema,
  countryQuerySchema
} from '../validators/country.validator.js';
import { ROLES } from '../constants/roles.js';

const router = Router();

// Public Routes
router.get('/', validate(countryQuerySchema, 'query'), getAllCountries);
router.get('/:idOrSlug', getCountryById);
router.get('/:countryId/visas', getCountryVisas);

// Admin Protected Routes
router.post('/', authenticate, authorize(ROLES.ADMIN), validate(createCountrySchema), createCountry);
router.put('/:id', authenticate, authorize(ROLES.ADMIN), validate(updateCountrySchema), updateCountry);
router.patch('/:id/status', authenticate, authorize(ROLES.ADMIN), toggleCountryStatus);
router.delete('/:id', authenticate, authorize(ROLES.ADMIN), deleteCountry);

export default router;
