import Joi from 'joi';

const requirementSchema = Joi.object({
  _id: Joi.string().allow('').optional(),
  id: Joi.string().allow('').optional(),
  title: Joi.string().trim().required(),
  description: Joi.string().trim().allow('').optional(),
  category: Joi.string().trim().default('Basic Information'),
  required: Joi.boolean().default(true),
  inputType: Joi.string().trim().allow('').default('file'),
  options: Joi.array().items(Joi.string().trim().allow('')).optional(),
  acceptedFormats: Joi.array().items(Joi.string().trim().uppercase()).optional(),
  condition: Joi.string().trim().allow('').optional(),
  displayOrder: Joi.number().integer().default(0),
  isActive: Joi.boolean().default(true)
});

export const createDocumentationServiceSchema = Joi.object({
  title: Joi.string().trim().required(),
  slug: Joi.string().trim().lowercase().allow('').optional(),
  category: Joi.string().trim().allow('').optional(),
  shortDescription: Joi.string().trim().allow('').optional(),
  description: Joi.string().trim().allow('').optional(),
  icon: Joi.string().trim().allow('').optional(),
  image: Joi.string().trim().allow('').optional(),
  features: Joi.array().items(Joi.string()).optional(),
  requiredDocuments: Joi.array().items(Joi.string()).optional(),
  requirements: Joi.array().items(requirementSchema).optional(),
  conditionPrompt: Joi.string().trim().allow('').optional(),
  conditionOptions: Joi.array().items(Joi.string().trim().allow('')).optional(),
  deliverablesHeader: Joi.string().trim().allow('').optional(),
  deliverables: Joi.array().items(Joi.string().trim().allow('')).optional(),
  processingTime: Joi.string().trim().allow('').optional(),
  governmentFee: Joi.number().min(0).optional(),
  serviceFee: Joi.number().min(0).optional(),
  price: Joi.alternatives().try(Joi.number().min(0), Joi.string()).optional(),
  currency: Joi.string().trim().uppercase().default('INR'),
  displayOrder: Joi.number().integer().optional(),
  status: Joi.string().valid('ACTIVE', 'INACTIVE').optional(),
  isActive: Joi.boolean().optional()
});

export const updateDocumentationServiceSchema = Joi.object({
  title: Joi.string().trim().optional(),
  slug: Joi.string().trim().lowercase().allow('').optional(),
  category: Joi.string().trim().allow('').optional(),
  shortDescription: Joi.string().trim().allow('').optional(),
  description: Joi.string().trim().allow('').optional(),
  icon: Joi.string().trim().allow('').optional(),
  image: Joi.string().trim().allow('').optional(),
  features: Joi.array().items(Joi.string()).optional(),
  requiredDocuments: Joi.array().items(Joi.string()).optional(),
  requirements: Joi.array().items(requirementSchema).optional(),
  conditionPrompt: Joi.string().trim().allow('').optional(),
  conditionOptions: Joi.array().items(Joi.string().trim().allow('')).optional(),
  deliverablesHeader: Joi.string().trim().allow('').optional(),
  deliverables: Joi.array().items(Joi.string().trim().allow('')).optional(),
  processingTime: Joi.string().trim().allow('').optional(),
  governmentFee: Joi.number().min(0).optional(),
  serviceFee: Joi.number().min(0).optional(),
  price: Joi.alternatives().try(Joi.number().min(0), Joi.string()).optional(),
  currency: Joi.string().trim().uppercase().optional(),
  displayOrder: Joi.number().integer().optional(),
  status: Joi.string().valid('ACTIVE', 'INACTIVE').optional(),
  isActive: Joi.boolean().optional()
});

export const documentationQuerySchema = Joi.object({
  query: Joi.string().trim().allow('').optional(),
  category: Joi.string().trim().allow('').optional(),
  status: Joi.string().valid('ACTIVE', 'INACTIVE', 'ALL').default('ALL'),
  page: Joi.number().integer().min(1).default(1),
  limit: Joi.number().integer().min(1).max(100).default(50)
});
