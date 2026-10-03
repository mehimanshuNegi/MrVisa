import Joi from 'joi';
import { DOCUMENT_STATUS } from '../constants/statuses.js';

export const updateDocumentStatusSchema = Joi.object({
  status: Joi.string().valid(...Object.values(DOCUMENT_STATUS)).required().messages({
    'any.required': 'Document verification status is required'
  }),
  rejectionReason: Joi.string().allow('').optional(),
  note: Joi.string().allow('').optional()
});

export const documentUploadQuerySchema = Joi.object({
  applicationId: Joi.string().trim().optional(),
  travellerId: Joi.string().trim().allow('').optional(),
  documentType: Joi.string().trim().optional(),
  verificationKey: Joi.string().trim().allow('').optional()
});

export default {
  updateDocumentStatusSchema,
  documentUploadQuerySchema
};
