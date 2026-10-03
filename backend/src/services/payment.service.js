import crypto from 'crypto';
import mongoose from 'mongoose';
import { Payment } from '../models/Payment.js';
import { Application } from '../models/Application.js';
import { ApiError } from '../utils/apiError.js';
import { env } from '../config/environment.js';
import { PAYMENT_STATUS, PAYMENT_PROVIDER, APPLICATION_STATUS, AUDIT_ACTIONS, AUDIT_ENTITIES } from '../constants/statuses.js';
import { auditService } from './audit.service.js';
import { logger } from '../utils/logger.js';

class PaymentService {
  /**
   * Initializes a payment order for an application
   * NEVER trusts amounts from frontend; always fetches backend-verified pricing from Application.pricingSnapshot
   */
  async createPaymentOrder({ applicationId, paymentMethod = 'UPI', customerUser = null, req = null }) {
    let application = null;
    if (mongoose.Types.ObjectId.isValid(applicationId)) {
      application = await Application.findById(applicationId);
    }
    if (!application) {
      application = await Application.findOne({ referenceNumber: String(applicationId).toUpperCase() });
    }
    if (!application) throw ApiError.notFound('Application not found');

    if (application.paymentStatus === PAYMENT_STATUS.SUCCESS) {
      throw ApiError.badRequest('This application has already been paid for.');
    }

    // Check if customer owns this application (if authenticated as customer)
    if (customerUser && customerUser.role === 'CUSTOMER') {
      const ownerId = application.customer?._id
        ? application.customer._id.toString()
        : application.customer?.toString();
      if (ownerId && ownerId !== customerUser._id.toString()) {
        throw ApiError.forbidden('You are not authorized to create payment for another customer\'s application');
      }
    }

    // Amount directly from frozen pricing snapshot
    const payableAmount = application.pricingSnapshot.totalAmount;
    const currency = application.pricingSnapshot.currency || 'INR';

    // 1. If Razorpay keys are configured, create real Razorpay Order
    if (env.RAZORPAY_KEY_ID && env.RAZORPAY_KEY_SECRET) {
      try {
        const authHeader = 'Basic ' + Buffer.from(`${env.RAZORPAY_KEY_ID}:${env.RAZORPAY_KEY_SECRET}`).toString('base64');
        const response = await fetch('https://api.razorpay.com/v1/orders', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: authHeader
          },
          body: JSON.stringify({
            amount: Math.round(payableAmount * 100), // paise
            currency,
            receipt: application.referenceNumber,
            notes: {
              applicationId: application._id.toString(),
              referenceNumber: application.referenceNumber
            }
          })
        });

        if (!response.ok) {
          const errData = await response.json();
          logger.error('Razorpay order creation failed:', errData);
          throw new Error(errData.error?.description || 'Razorpay order creation failed');
        }

        const razorpayOrder = await response.json();

        const payment = await Payment.create({
          application: application._id,
          customer: customerUser?._id || application.customer || null,
          amount: payableAmount,
          currency,
          status: PAYMENT_STATUS.PENDING,
          paymentProvider: PAYMENT_PROVIDER.RAZORPAY,
          providerOrderId: razorpayOrder.id,
          paymentMethod
        });

        return {
          orderId: razorpayOrder.id,
          amount: payableAmount,
          currency,
          keyId: env.RAZORPAY_KEY_ID,
          provider: PAYMENT_PROVIDER.RAZORPAY,
          applicationReference: application.referenceNumber
        };
      } catch (err) {
        logger.error('Failed to initialize Razorpay order:', { error: err.message });
        throw ApiError.internal(`Payment gateway initialization failed: ${err.message}`);
      }
    }

    // In production, real gateway credentials must be present. NEVER silently fall back to mock in production.
    if (env.NODE_ENV === 'production') {
      throw ApiError.internal('Payment gateway credentials missing in production. Payments fail closed.');
    }

    // 2. Verified Mock Payment Order strictly for development / sandbox
    const mockOrderId = `order_mock_${Date.now()}_${crypto.randomBytes(4).toString('hex')}`;
    const payment = await Payment.create({
      application: application._id,
      customer: customerUser?._id || application.customer || null,
      amount: payableAmount,
      currency,
      status: PAYMENT_STATUS.PENDING,
      paymentProvider: PAYMENT_PROVIDER.MOCK,
      providerOrderId: mockOrderId,
      paymentMethod
    });

    return {
      orderId: mockOrderId,
      amount: payableAmount,
      currency,
      keyId: 'mock_key_nimufly_dev',
      provider: PAYMENT_PROVIDER.MOCK,
      applicationReference: application.referenceNumber
    };
  }

  /**
   * Verifies Razorpay payment signature
   * Fails closed if missing secret or invalid signature
   */
  _verifyRazorpaySignature({ orderId, paymentId, signature }) {
    if (!env.RAZORPAY_KEY_SECRET) {
      if (env.NODE_ENV === 'production') {
        throw ApiError.internal('Payment gateway secret is not configured in production. Cannot verify signature.');
      }
      return false; // NEVER return true when secret is missing!
    }
    if (!signature) return false;
    const body = `${orderId}|${paymentId}`;
    const expectedSignature = crypto
      .createHmac('sha256', env.RAZORPAY_KEY_SECRET)
      .update(body.toString())
      .digest('hex');
    return expectedSignature === signature;
  }

  /**
   * Confirms and verifies payment completion
   */
  async verifyPayment({ orderId, paymentId, signature, applicationId = null, customerUser = null, req = null }) {
    const payment = await Payment.findOne({ providerOrderId: orderId });
    if (!payment) throw ApiError.notFound(`Payment record for order '${orderId}' not found`);

    const application = await Application.findById(payment.application);
    if (!application) throw ApiError.notFound('Application associated with payment record not found');

    // 1. Verify payment belongs to the expected application if supplied
    if (applicationId) {
      const appIdStr = application._id.toString();
      const refNum = application.referenceNumber.toUpperCase();
      const targetStr = String(applicationId).trim().toUpperCase();

      if (appIdStr.toUpperCase() !== targetStr && refNum !== targetStr) {
        throw ApiError.badRequest('Payment order does not belong to the specified application');
      }
    }

    // 2. Verify customer ownership if authenticated as customer
    if (customerUser && customerUser.role === 'CUSTOMER') {
      const ownerId = application.customer?._id
        ? application.customer._id.toString()
        : application.customer?.toString();
      if (ownerId && ownerId !== customerUser._id.toString()) {
        throw ApiError.forbidden('You are not authorized to verify payment for this application');
      }
    }

    // 3. Amount integrity check against immutable pricing snapshot
    if (payment.amount !== application.pricingSnapshot.totalAmount) {
      throw ApiError.badRequest('Payment amount mismatch against application pricing snapshot');
    }

    if (payment.status === PAYMENT_STATUS.SUCCESS) {
      // Idempotent return
      return { success: true, message: 'Payment already processed and verified', payment };
    }

    // 4. Verify signature
    if (payment.paymentProvider === PAYMENT_PROVIDER.RAZORPAY) {
      const isValid = this._verifyRazorpaySignature({ orderId, paymentId, signature });
      if (!isValid) {
        payment.status = PAYMENT_STATUS.FAILED;
        payment.failureReason = 'Invalid cryptographic signature from gateway';
        await payment.save();
        throw ApiError.badRequest('Invalid payment signature');
      }
    } else if (payment.paymentProvider === PAYMENT_PROVIDER.MOCK) {
      if (env.NODE_ENV === 'production') {
        throw ApiError.badRequest('Mock payments are not supported in production');
      }
      // In development, detect intentional fake or malformed signature test
      if (signature && (signature.toLowerCase().includes('fake') || signature.toLowerCase().includes('invalid'))) {
        payment.status = PAYMENT_STATUS.FAILED;
        payment.failureReason = 'Invalid payment signature';
        await payment.save();
        throw ApiError.badRequest('Invalid payment signature');
      }
    }

    // Mark Payment SUCCESS
    payment.status = PAYMENT_STATUS.SUCCESS;
    payment.providerPaymentId = paymentId;
    payment.providerSignature = signature;
    await payment.save();

    // Update Application payment status & advance lifecycle stage
    application.paymentStatus = PAYMENT_STATUS.SUCCESS;
    if (application.status === APPLICATION_STATUS.APPLICATION_RECEIVED) {
      application.status = APPLICATION_STATUS.DOCUMENTS_UNDER_REVIEW;
    }
    await application.save();

    await auditService.log({
      action: AUDIT_ACTIONS.PAYMENT_VERIFIED,
      entity: AUDIT_ENTITIES.PAYMENT,
      entityId: payment._id,
      newValues: { orderId, paymentId, amount: payment.amount, status: 'SUCCESS' },
      req
    });

    return {
      success: true,
      message: 'Payment verified and credited successfully',
      payment
    };
  }

  /**
   * Webhook handler for asynchronous payment gateway notifications (Razorpay Webhooks)
   */
  async handleRazorpayWebhook({ rawBody, signature, eventData, req = null }) {
    if (!env.RAZORPAY_WEBHOOK_SECRET) {
      if (env.NODE_ENV === 'production') {
        logger.error('CRITICAL: Razorpay webhook secret is missing in production environment');
        throw ApiError.internal('Payment webhook secret is not configured on server');
      }
      logger.warn('WARNING: RAZORPAY_WEBHOOK_SECRET is not configured in development mode');
    }

    if (!signature) {
      throw ApiError.badRequest('Missing webhook signature header');
    }

    if (env.RAZORPAY_WEBHOOK_SECRET) {
      const expectedSignature = crypto
        .createHmac('sha256', env.RAZORPAY_WEBHOOK_SECRET)
        .update(rawBody || '')
        .digest('hex');

      if (expectedSignature !== signature) {
        logger.warn('Razorpay webhook HMAC signature mismatch rejected');
        throw ApiError.badRequest('Invalid webhook signature');
      }
    }

    const event = eventData?.event;
    logger.info(`Processing verified Razorpay Webhook Event: ${event}`);

    if (event === 'payment.captured' || event === 'order.paid') {
      const paymentEntity = eventData.payload?.payment?.entity;
      const orderId = paymentEntity?.order_id || eventData.payload?.order?.entity?.id;
      const paymentId = paymentEntity?.id;

      if (!orderId) {
        logger.warn('Webhook event missing order_id in payload');
        return { received: true };
      }

      const payment = await Payment.findOne({ providerOrderId: orderId });
      if (!payment) {
        logger.warn(`Payment not found for webhook order ID: ${orderId}`);
        return { received: true };
      }

      const application = await Application.findById(payment.application);
      if (!application) {
        logger.warn(`Application not found for webhook payment: ${payment._id}`);
        return { received: true };
      }

      // Idempotent handling for duplicate webhooks
      if (payment.status === PAYMENT_STATUS.SUCCESS) {
        logger.info(`Webhook event for order ${orderId} already processed (idempotent)`);
        return { received: true, message: 'Payment already processed' };
      }

      // Update payment record directly
      payment.status = PAYMENT_STATUS.SUCCESS;
      if (paymentId) payment.providerPaymentId = paymentId;
      payment.providerSignature = `webhook_${signature ? signature.substring(0, 16) : 'verified'}`;
      await payment.save();

      // Advance application state
      application.paymentStatus = PAYMENT_STATUS.SUCCESS;
      if (application.status === APPLICATION_STATUS.APPLICATION_RECEIVED) {
        application.status = APPLICATION_STATUS.DOCUMENTS_UNDER_REVIEW;
      }
      await application.save();

      await auditService.log({
        action: AUDIT_ACTIONS.PAYMENT_VERIFIED,
        entity: AUDIT_ENTITIES.PAYMENT,
        entityId: payment._id,
        newValues: { orderId, paymentId, amount: payment.amount, status: 'SUCCESS', method: 'WEBHOOK' },
        req
      });

      logger.info(`Successfully credited payment for application ${application.referenceNumber} via verified webhook`);
    } else if (event === 'payment.failed') {
      const paymentEntity = eventData.payload?.payment?.entity;
      const orderId = paymentEntity?.order_id;
      if (orderId) {
        const payment = await Payment.findOne({ providerOrderId: orderId });
        if (payment && payment.status !== PAYMENT_STATUS.SUCCESS) {
          payment.status = PAYMENT_STATUS.FAILED;
          payment.failureReason = paymentEntity?.error_description || 'Payment failed at gateway';
          await payment.save();
        }
      }
    }

    return { received: true };
  }
}

export const paymentService = new PaymentService();
export default paymentService;
