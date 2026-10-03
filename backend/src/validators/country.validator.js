import Joi from 'joi';

export const createCountrySchema = Joi.object({
  name: Joi.string().trim().min(2).max(100).required(),
  displayName: Joi.string().trim().allow('').optional(),
  code: Joi.string().trim().uppercase().min(2).max(3).required(),
  slug: Joi.string().trim().lowercase().allow('').optional(),
  flagEmoji: Joi.string().trim().allow('').optional(),
  flagUrl: Joi.string().allow('').optional(),
  image: Joi.string().allow('').optional(),
  description: Joi.string().trim().allow('').optional(),
  status: Joi.string().valid('ACTIVE', 'INACTIVE').optional(),
  isActive: Joi.boolean().optional(),
  visas: Joi.array().items(Joi.string()).optional()
});

export const updateCountrySchema = Joi.object({
  name: Joi.string().trim().min(2).max(100).optional(),
  displayName: Joi.string().trim().allow('').optional(),
  code: Joi.string().trim().uppercase().min(2).max(3).optional(),
  slug: Joi.string().trim().lowercase().allow('').optional(),
  flagEmoji: Joi.string().trim().allow('').optional(),
  flagUrl: Joi.string().allow('').optional(),
  image: Joi.string().allow('').optional(),
  description: Joi.string().trim().allow('').optional(),
  status: Joi.string().valid('ACTIVE', 'INACTIVE').optional(),
  isActive: Joi.boolean().optional()
});

export const countryQuerySchema = Joi.object({
  query: Joi.string().trim().allow('').optional(),
  status: Joi.string().valid('ALL', 'ACTIVE', 'INACTIVE', 'Active', 'Inactive', 'All').optional(),
  page: Joi.number().integer().min(1).default(1),
  limit: Joi.number().integer().min(1).max(200).default(50)
});
