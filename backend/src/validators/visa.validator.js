import Joi from 'joi';

const faqItemSchema = Joi.object({
  q: Joi.string().trim().required(),
  a: Joi.string().trim().required()
});

const documentItemSchema = Joi.alternatives().try(
  Joi.string().trim().allow(''),
  Joi.object({
    _id: Joi.string().allow('').optional(),
    id: Joi.string().allow('').optional(),
    title: Joi.string().trim().allow('').optional(),
    name: Joi.string().trim().allow('').optional(),
    acceptedFormats: Joi.array().items(Joi.string().trim().uppercase()).optional(),
    subtitle: Joi.string().trim().allow('').optional(),
    detail: Joi.string().trim().allow('').optional(),
    guidance: Joi.string().trim().allow('').optional(),
    description: Joi.string().trim().allow('').optional(),
    required: Joi.boolean().optional(),
    isRequired: Joi.boolean().optional()
  })
);

export const createVisaSchema = Joi.object({
  country: Joi.string().trim().allow('').optional(),
  countryId: Joi.string().trim().allow('').optional(),
  countryName: Joi.string().trim().allow('').optional(),
  countryCode: Joi.string().trim().allow('').optional(),
  code: Joi.string().trim().allow('').optional(),
  countryFlag: Joi.string().trim().allow('').optional(),
  flagEmoji: Joi.string().trim().allow('').optional(),
  countryImage: Joi.string().allow('').optional(),
  category: Joi.string().trim().allow('').optional(),
  isPopular: Joi.boolean().optional(),
  popularity: Joi.boolean().optional(),
  displayOrder: Joi.number().optional(),
  title: Joi.string().trim().allow('').optional(),
  displayName: Joi.string().trim().allow('').optional(),
  visaType: Joi.string().trim().default('Tourist Visa'),
  description: Joi.string().trim().allow('').optional(),
  shortDescription: Joi.string().trim().allow('').optional(),
  stayPeriod: Joi.string().trim().allow('').optional(),
  validity: Joi.string().trim().allow('').optional(),
  entryType: Joi.string().trim().allow('').optional(),
  processingTime: Joi.string().trim().allow('').optional(),
  governmentFee: Joi.number().min(0).optional(),
  serviceFee: Joi.number().min(0).optional(),
  price: Joi.alternatives().try(Joi.number().min(0), Joi.string()).optional(),
  fees: Joi.alternatives().try(Joi.number().min(0), Joi.string()).optional(),
  currency: Joi.string().trim().uppercase().default('INR'),
  documentCategory: Joi.string().trim().allow('').optional(),
  documentsSummary: Joi.string().trim().allow('').optional(),
  travelPurpose: Joi.string().trim().allow('').optional(),
  requiredDocuments: Joi.array().items(documentItemSchema).optional(),
  documents: Joi.array().items(documentItemSchema).optional(),
  documentsRequired: Joi.array().items(documentItemSchema).optional(),
  faqs: Joi.array().items(faqItemSchema).optional(),
  image: Joi.string().allow('').optional(),
  guaranteedDate: Joi.string().allow('').optional(),
  status: Joi.string().valid('ACTIVE', 'INACTIVE').optional(),
  isActive: Joi.boolean().optional()
});

export const updateVisaSchema = Joi.object({
  title: Joi.string().trim().allow('').optional(),
  displayName: Joi.string().trim().allow('').optional(),
  countryName: Joi.string().trim().allow('').optional(),
  countryCode: Joi.string().trim().allow('').optional(),
  code: Joi.string().trim().allow('').optional(),
  countryFlag: Joi.string().trim().allow('').optional(),
  flagEmoji: Joi.string().trim().allow('').optional(),
  countryImage: Joi.string().allow('').optional(),
  category: Joi.string().trim().allow('').optional(),
  isPopular: Joi.boolean().optional(),
  popularity: Joi.boolean().optional(),
  displayOrder: Joi.number().optional(),
  visaType: Joi.string().trim().optional(),
  description: Joi.string().trim().allow('').optional(),
  shortDescription: Joi.string().trim().allow('').optional(),
  stayPeriod: Joi.string().trim().allow('').optional(),
  validity: Joi.string().trim().allow('').optional(),
  entryType: Joi.string().trim().allow('').optional(),
  processingTime: Joi.string().trim().allow('').optional(),
  governmentFee: Joi.number().min(0).optional(),
  serviceFee: Joi.number().min(0).optional(),
  price: Joi.alternatives().try(Joi.number().min(0), Joi.string()).optional(),
  fees: Joi.alternatives().try(Joi.number().min(0), Joi.string()).optional(),
  currency: Joi.string().trim().uppercase().optional(),
  documentCategory: Joi.string().trim().allow('').optional(),
  documentsSummary: Joi.string().trim().allow('').optional(),
  travelPurpose: Joi.string().trim().allow('').optional(),
  requiredDocuments: Joi.array().items(documentItemSchema).optional(),
  documents: Joi.array().items(documentItemSchema).optional(),
  documentsRequired: Joi.array().items(documentItemSchema).optional(),
  faqs: Joi.array().items(faqItemSchema).optional(),
  image: Joi.string().allow('').optional(),
  guaranteedDate: Joi.string().allow('').optional(),
  status: Joi.string().valid('ACTIVE', 'INACTIVE').optional(),
  isActive: Joi.boolean().optional(),
  countryId: Joi.string().trim().allow('').optional(),
  country: Joi.string().trim().allow('').optional(),
  slug: Joi.string().trim().lowercase().allow('').optional()
});

export const visaQuerySchema = Joi.object({
  query: Joi.string().trim().allow('').optional(),
  country: Joi.string().trim().allow('').optional(),
  visaType: Joi.string().trim().allow('').optional(),
  documentCategory: Joi.string().trim().allow('').optional(),
  isPopular: Joi.alternatives().try(Joi.boolean(), Joi.string()).optional(),
  status: Joi.string().valid('ALL', 'ACTIVE', 'INACTIVE', 'Active', 'Inactive', 'All').optional(),
  page: Joi.number().integer().min(1).default(1),
  limit: Joi.number().integer().min(1).max(200).default(50)
});
