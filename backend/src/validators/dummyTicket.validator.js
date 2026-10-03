import Joi from 'joi';

export const createDummyTicketServiceSchema = Joi.object({
  title: Joi.string().trim().required(),
  slug: Joi.string().trim().lowercase().allow('').optional(),
  shortDescription: Joi.string().trim().allow('').optional(),
  description: Joi.string().trim().allow('').optional(),
  price: Joi.alternatives().try(Joi.number().min(0), Joi.string()).required(),
  currency: Joi.string().trim().uppercase().default('INR'),
  type: Joi.string().trim().allow('').optional(),
  deliveryTime: Joi.string().trim().allow('').optional(),
  validity: Joi.string().trim().allow('').optional(),
  icon: Joi.string().trim().allow('').optional(),
  features: Joi.array().items(Joi.string()).optional(),
  displayOrder: Joi.number().integer().optional(),
  status: Joi.string().valid('ACTIVE', 'INACTIVE').optional(),
  isActive: Joi.boolean().optional()
});

export const updateDummyTicketServiceSchema = Joi.object({
  title: Joi.string().trim().optional(),
  slug: Joi.string().trim().lowercase().allow('').optional(),
  shortDescription: Joi.string().trim().allow('').optional(),
  description: Joi.string().trim().allow('').optional(),
  price: Joi.alternatives().try(Joi.number().min(0), Joi.string()).optional(),
  currency: Joi.string().trim().uppercase().optional(),
  type: Joi.string().trim().allow('').optional(),
  deliveryTime: Joi.string().trim().allow('').optional(),
  validity: Joi.string().trim().allow('').optional(),
  icon: Joi.string().trim().allow('').optional(),
  features: Joi.array().items(Joi.string()).optional(),
  displayOrder: Joi.number().integer().optional(),
  status: Joi.string().valid('ACTIVE', 'INACTIVE').optional(),
  isActive: Joi.boolean().optional()
});

export const dummyTicketQuerySchema = Joi.object({
  query: Joi.string().trim().allow('').optional(),
  status: Joi.string().valid('ACTIVE', 'INACTIVE', 'ALL').default('ALL'),
  page: Joi.number().integer().min(1).default(1),
  limit: Joi.number().integer().min(1).max(100).default(50)
});
