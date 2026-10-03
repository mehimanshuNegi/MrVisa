import Joi from 'joi';

export const createPaymentOrderSchema = Joi.object({
  applicationId: Joi.string().required().messages({
    'any.required': 'Application ID is required'
  }),
  paymentMethod: Joi.string().valid('UPI', 'CARD', 'NETBANKING', 'WALLET', 'OTHER').default('UPI')
});

export const verifyPaymentSchema = Joi.object({
  orderId: Joi.string().required().messages({
    'any.required': 'Order ID is required'
  }),
  paymentId: Joi.string().required().messages({
    'any.required': 'Payment ID is required'
  }),
  signature: Joi.string().allow('').optional()
});
