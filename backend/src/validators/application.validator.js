import Joi from 'joi';
import { APPLICATION_STATUS, REQUIRED_ACTION } from '../constants/statuses.js';
import { validateName } from '../utils/nameValidator.js';

const nameValidatorCustom = (value, helpers) => {
  if (!value) return value;
  const result = validateName(value);
  if (!result.isValid) {
    return helpers.message(result.error);
  }
  return result.normalized;
};

const travellerInputSchema = Joi.object({
  travellerId: Joi.string().allow('').optional(),
  name: Joi.string().trim().custom(nameValidatorCustom).required().messages({
    'any.required': 'Traveller name is required'
  }),
  firstName: Joi.string().trim().allow('').optional(),
  lastName: Joi.string().trim().allow('').optional(),
  email: Joi.string().email().allow('').optional(),
  phone: Joi.string().allow('').optional(),
  passportNumber: Joi.string().allow('').optional(),
  placeOfIssue: Joi.string().allow('').optional(),
  issueDate: Joi.string().allow('').optional(),
  expiryDate: Joi.string().allow('').optional(),
  nationality: Joi.string().allow('').optional(),
  dob: Joi.string().allow('').optional(),
  gender: Joi.string().allow('').optional(),
  docs: Joi.object().optional()
});

export const createApplicationSchema = Joi.object({
  id: Joi.string().allow('').optional(),
  applicationId: Joi.string().allow('').optional(),
  visaId: Joi.string().trim().required().messages({
    'any.required': 'Visa offering identifier (visaId) is required'
  }),
  countryId: Joi.string().trim().allow('').optional(),
  status: Joi.string().valid(...Object.values(APPLICATION_STATUS)).optional(),
  travellers: Joi.array().items(travellerInputSchema).min(1).optional(),
  documents: Joi.array().items(Joi.object()).optional(),
  applicantName: Joi.string().trim().optional(),
  applicantEmail: Joi.string().email().optional(),
  applicantPhone: Joi.string().optional(),
  additionalInformation: Joi.string().allow('').optional(),
  previousVisaRefusal: Joi.boolean().optional(),
  previousVisaRefusalCountry: Joi.string().allow('').optional(),
  previousVisaRefusalReason: Joi.string().allow('').optional(),
  passportOcr: Joi.object().optional()
});

export const updateApplicationSchema = Joi.object({
  status: Joi.string().valid(...Object.values(APPLICATION_STATUS)).optional(),
  adminMessage: Joi.string().allow('').optional(),
  adminNotes: Joi.string().allow('').optional(),
  requiredAction: Joi.string().valid(...Object.values(REQUIRED_ACTION)).optional(),
  paymentStatus: Joi.string().valid('PENDING', 'SUCCESS', 'FAILED').optional(),
  travellers: Joi.array().items(travellerInputSchema).min(1).optional(),
  applicantName: Joi.string().trim().optional(),
  applicantEmail: Joi.string().email().optional(),
  applicantPhone: Joi.string().optional(),
  additionalInformation: Joi.string().allow('').optional(),
  previousVisaRefusal: Joi.boolean().optional(),
  previousVisaRefusalCountry: Joi.string().allow('').optional(),
  previousVisaRefusalReason: Joi.string().allow('').optional(),
  passportOcr: Joi.object().optional(),
  documents: Joi.array().items(Joi.object()).optional(),
  visaDetails: Joi.object({
    docNumber: Joi.string().allow('').optional(),
    validUntil: Joi.string().allow('').optional(),
    entryType: Joi.string().allow('').optional(),
    downloadUrl: Joi.string().allow('').optional()
  }).optional()
});

export const submitFeedbackSchema = Joi.object({
  rating: Joi.number().integer().min(1).max(5).required().messages({
    'number.base': 'Rating must be a number between 1 and 5',
    'number.integer': 'Rating must be an integer between 1 and 5',
    'number.min': 'Rating must be at least 1 star',
    'number.max': 'Rating cannot exceed 5 stars',
    'any.required': 'Rating is required'
  }),
  comment: Joi.string().max(1000).allow('').optional()
});

export const submitApplicationSchema = Joi.object({
  notes: Joi.string().allow('').optional()
});

export const updateActionSchema = Joi.object({
  actionType: Joi.string().valid(...Object.values(REQUIRED_ACTION)).required(),
  message: Joi.string().allow('').optional(),
  documentUpdates: Joi.array().items(Joi.object()).optional()
});

export const applicationQuerySchema = Joi.object({
  query: Joi.string().trim().allow('').optional(),
  status: Joi.string().allow('').optional(),
  page: Joi.number().integer().min(1).default(1),
  limit: Joi.number().integer().min(1).max(100).default(20)
});

export const claimApplicationSchema = Joi.object({
  referenceNumber: Joi.string().trim().uppercase().required().messages({
    'any.required': 'Application reference number is required'
  }),
  verificationKey: Joi.string().trim().required().messages({
    'any.required': 'Verification passport number or phone is required'
  })
});

export default {
  createApplicationSchema,
  updateApplicationSchema,
  submitApplicationSchema,
  updateActionSchema,
  applicationQuerySchema,
  claimApplicationSchema
};
