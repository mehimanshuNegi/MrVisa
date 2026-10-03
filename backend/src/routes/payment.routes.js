import { Router } from 'express';
import {
  createPaymentOrder,
  verifyPayment,
  handleWebhook
} from '../controllers/payment.controller.js';
import { optionalAuthenticate } from '../middleware/auth.middleware.js';
import { validate } from '../middleware/validate.middleware.js';
import { paymentLimiter } from '../middleware/rateLimiter.middleware.js';
import {
  createPaymentOrderSchema,
  verifyPaymentSchema
} from '../validators/payment.validator.js';

const router = Router();

// Create payment order from backend pricing (Rate limited)
router.post('/initialize', paymentLimiter, optionalAuthenticate, validate(createPaymentOrderSchema), createPaymentOrder);
router.post('/create-order', paymentLimiter, optionalAuthenticate, validate(createPaymentOrderSchema), createPaymentOrder);

// Verify payment signature / complete transaction (Rate limited)
router.post('/verify', paymentLimiter, optionalAuthenticate, validate(verifyPaymentSchema), verifyPayment);

// Razorpay asynchronous webhook endpoint (Direct delivery, no client rate limiting)
router.post('/webhook', handleWebhook);

export default router;
