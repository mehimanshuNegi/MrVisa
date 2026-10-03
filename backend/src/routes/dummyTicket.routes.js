import { Router } from 'express';
import {
  getAllDummyTicketServices,
  getDummyTicketServiceById,
  createDummyTicketService,
  updateDummyTicketService,
  toggleDummyTicketServiceStatus,
  deleteDummyTicketService
} from '../controllers/dummyTicket.controller.js';
import {
  createDummyTicketRequest,
  getAllDummyTicketRequests,
  getMyDummyTicketRequests,
  getDummyTicketRequestById,
  updateDummyTicketRequestStatus,
  deleteDummyTicketRequest
} from '../controllers/dummyTicketRequest.controller.js';
import { authenticate, optionalAuthenticate, authorize } from '../middleware/auth.middleware.js';
import { validate } from '../middleware/validate.middleware.js';
import {
  createDummyTicketServiceSchema,
  updateDummyTicketServiceSchema,
  dummyTicketQuerySchema
} from '../validators/dummyTicket.validator.js';
import { ROLES } from '../constants/roles.js';

const router = Router();

// ==========================================
// DUMMY TICKET CUSTOMER REQUESTS & BOOKINGS
// (Must precede /:idOrSlug route!)
// ==========================================
router.post('/requests', optionalAuthenticate, createDummyTicketRequest);
router.get('/requests/my', authenticate, getMyDummyTicketRequests);
router.get('/requests', authenticate, authorize(ROLES.ADMIN), getAllDummyTicketRequests);
router.get('/requests/:id', authenticate, getDummyTicketRequestById);
router.patch('/requests/:id/status', authenticate, authorize(ROLES.ADMIN), updateDummyTicketRequestStatus);
router.delete('/requests/:id', authenticate, authorize(ROLES.ADMIN), deleteDummyTicketRequest);

// ==========================================
// DUMMY TICKET SERVICE PACKAGES / CATALOG
// ==========================================
// Public routes
router.get('/', validate(dummyTicketQuerySchema, 'query'), getAllDummyTicketServices);
router.get('/:idOrSlug', getDummyTicketServiceById);

// Admin protected package routes
router.post('/', authenticate, authorize(ROLES.ADMIN), validate(createDummyTicketServiceSchema), createDummyTicketService);
router.put('/:id', authenticate, authorize(ROLES.ADMIN), validate(updateDummyTicketServiceSchema), updateDummyTicketService);
router.patch('/:id/status', authenticate, authorize(ROLES.ADMIN), toggleDummyTicketServiceStatus);
router.delete('/:id', authenticate, authorize(ROLES.ADMIN), deleteDummyTicketService);

export default router;
