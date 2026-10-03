import { Router } from 'express';
import {
  getAllDummyTicketServices,
  getDummyTicketServiceById,
  createDummyTicketService,
  updateDummyTicketService,
  toggleDummyTicketServiceStatus,
  deleteDummyTicketService
} from '../controllers/dummyTicket.controller.js';
import { authenticate, authorize } from '../middleware/auth.middleware.js';
import { validate } from '../middleware/validate.middleware.js';
import {
  createDummyTicketServiceSchema,
  updateDummyTicketServiceSchema,
  dummyTicketQuerySchema
} from '../validators/dummyTicket.validator.js';
import { ROLES } from '../constants/roles.js';

const router = Router();

// Public routes
router.get('/', validate(dummyTicketQuerySchema, 'query'), getAllDummyTicketServices);
router.get('/:idOrSlug', getDummyTicketServiceById);

// Admin protected routes
router.post('/', authenticate, authorize(ROLES.ADMIN), validate(createDummyTicketServiceSchema), createDummyTicketService);
router.put('/:id', authenticate, authorize(ROLES.ADMIN), validate(updateDummyTicketServiceSchema), updateDummyTicketService);
router.patch('/:id/status', authenticate, authorize(ROLES.ADMIN), toggleDummyTicketServiceStatus);
router.delete('/:id', authenticate, authorize(ROLES.ADMIN), deleteDummyTicketService);

export default router;
