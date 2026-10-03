import { paymentService } from '../services/payment.service.js';
import { ApiResponse } from '../utils/apiResponse.js';
import { asyncHandler } from '../utils/asyncHandler.js';

export const createPaymentOrder = asyncHandler(async (req, res) => {
  const result = await paymentService.createPaymentOrder({
    applicationId: req.body.applicationId,
    paymentMethod: req.body.paymentMethod,
    customerUser: req.user || null,
    req
  });
  return ApiResponse.created(res, result, 'Payment order generated successfully');
});

export const verifyPayment = asyncHandler(async (req, res) => {
  const result = await paymentService.verifyPayment({
    orderId: req.body.orderId,
    paymentId: req.body.paymentId,
    signature: req.body.signature,
    applicationId: req.body.applicationId,
    customerUser: req.user || null,
    req
  });
  return ApiResponse.success(res, result, 'Payment verified successfully');
});

export const handleWebhook = asyncHandler(async (req, res) => {
  const signature = req.headers['x-razorpay-signature'];
  const rawBody = req.rawBody || JSON.stringify(req.body);

  const result = await paymentService.handleRazorpayWebhook({
    rawBody,
    signature,
    eventData: req.body,
    req
  });

  return ApiResponse.success(res, result, 'Webhook processed');
});

export default {
  createPaymentOrder,
  verifyPayment,
  handleWebhook
};
