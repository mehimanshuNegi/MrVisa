import { applicationService } from '../services/application.service.js';
import { documentService, getSensibleFilename } from '../services/document.service.js';
import { ApiResponse } from '../utils/apiResponse.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import { ApiError } from '../utils/apiError.js';
import { ROLES } from '../constants/roles.js';
import { sanitizeApplicationForCustomer } from '../utils/sanitize.js';

export const createApplication = asyncHandler(async (req, res) => {
  const application = await applicationService.createApplication(req.body, req.user || null, req);
  const responseData = req.user?.role === ROLES.ADMIN ? application : sanitizeApplicationForCustomer(application);
  return ApiResponse.created(res, responseData, 'Application initialized successfully');
});

export const getApplications = asyncHandler(async (req, res) => {
  if (!req.user) {
    throw ApiError.unauthorized('Authentication required to access applications');
  }

  const { query, status, page, limit } = req.query;

  // CUSTOMER can strictly only view their own applications
  const customerId = req.user.role === ROLES.CUSTOMER ? req.user._id : (req.query.customerId || null);

  const result = await applicationService.getApplications({
    customerId,
    query,
    status,
    page,
    limit
  });

  const items = req.user.role === ROLES.ADMIN
    ? result.items
    : result.items.map(sanitizeApplicationForCustomer);

  return ApiResponse.paginated(res, items, result.pagination, 'Applications retrieved successfully');
});

export const getApplicationById = asyncHandler(async (req, res) => {
  if (!req.user) {
    throw ApiError.unauthorized('Authentication required to access application details');
  }

  const application = await applicationService.getApplicationById(req.params.idOrRef, req.user);
  if (!application) throw ApiError.notFound(`Application '${req.params.idOrRef}' not found`);

  const responseData = req.user.role === ROLES.ADMIN ? application : sanitizeApplicationForCustomer(application);
  return ApiResponse.success(res, responseData, 'Application details retrieved');
});

export const updateApplication = asyncHandler(async (req, res) => {
  if (!req.user) {
    throw ApiError.unauthorized('Authentication required to update application');
  }

  const application = await applicationService.updateApplication(req.params.idOrRef || req.params.id, req.body, req);
  const responseData = req.user.role === ROLES.ADMIN ? application : sanitizeApplicationForCustomer(application);
  return ApiResponse.success(res, responseData, 'Application updated successfully');
});

export const submitApplication = asyncHandler(async (req, res) => {
  if (!req.user) {
    throw ApiError.unauthorized('Authentication required to submit application');
  }

  const application = await applicationService.submitApplication(req.params.idOrRef || req.params.id, req.user, req);
  const responseData = req.user.role === ROLES.ADMIN ? application : sanitizeApplicationForCustomer(application);
  return ApiResponse.success(res, responseData, 'Application submitted successfully for consulate review');
});

export const getApplicationStatus = asyncHandler(async (req, res) => {
  if (!req.user) {
    throw ApiError.unauthorized('Authentication required to check application status');
  }

  const statusData = await applicationService.getApplicationStatus(req.params.idOrRef || req.params.id, req.user);
  return ApiResponse.success(res, statusData, 'Application status retrieved successfully');
});

export const getApplicationDocuments = asyncHandler(async (req, res) => {
  if (!req.user) {
    throw ApiError.unauthorized('Authentication required to view application documents');
  }

  const docs = await documentService.getDocumentsByApplication(req.params.idOrRef || req.params.id, req.user);
  return ApiResponse.success(res, docs, 'Application documents retrieved successfully');
});

export const uploadDocumentForApplication = asyncHandler(async (req, res) => {
  if (!req.file) {
    throw ApiError.badRequest('No document file was provided');
  }

  const applicationId = req.params.idOrRef || req.params.id;
  const { travellerId, documentType } = req.body;
  const verificationKey = req.body.verificationKey || req.headers['x-verification-key'] || '';

  const result = await documentService.uploadDocument({
    applicationId,
    travellerId,
    documentType,
    file: req.file,
    verificationKey,
    currentUser: req.user || null,
    req
  });

  return ApiResponse.created(res, result, 'Document uploaded successfully');
});

export const getApplicationDocumentSignedUrl = asyncHandler(async (req, res) => {
  const { idOrRef, docId } = req.params;
  const mode = req.query.mode === 'download' ? 'download' : 'preview';
  const { document, application } = await documentService.getDocumentForApplication(idOrRef, docId, req.user);

  const sensibleFilename = getSensibleFilename(document, application);
  const disposition = mode === 'download' ? `attachment; filename="${sensibleFilename}"` : 'inline';
  const signedUrl = await storageService.getSignedUrl(document.storageKey, 900, {
    responseContentDisposition: disposition,
    responseContentType: document.mimeType || 'image/jpeg'
  });

  return ApiResponse.success(res, {
    documentId: document._id ? document._id.toString() : docId,
    id: document._id ? document._id.toString() : docId,
    name: document.name,
    documentType: document.documentType,
    originalFilename: document.originalFilename,
    downloadFilename: sensibleFilename,
    mimeType: document.mimeType,
    fileSize: document.fileSize,
    signedUrl,
    fileUrl: signedUrl
  }, 'Document access URL generated successfully');
});

export const getApplicationDocumentFile = asyncHandler(async (req, res) => {
  const { idOrRef, docId } = req.params;
  const mode = req.query.mode === 'download' ? 'download' : 'preview';
  const { document, application } = await documentService.getDocumentForApplication(idOrRef, docId, req.user);

  const sensibleFilename = getSensibleFilename(document, application);
  const mimeType = document.mimeType || 'image/jpeg';

  res.setHeader('Content-Type', mimeType);
  res.setHeader('Content-Disposition', mode === 'download' ? `attachment; filename="${encodeURIComponent(sensibleFilename)}"` : 'inline');
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('Cache-Control', 'private, no-cache, no-store, must-revalidate');

  try {
    const { stream, contentType, contentLength } = await storageService.getObjectStream(document.storageKey);
    if (contentType) res.setHeader('Content-Type', contentType);
    if (contentLength) res.setHeader('Content-Length', contentLength);
    return stream.pipe(res);
  } catch (err) {
    logger.warn(`Direct stream failed for ${document.storageKey}, redirecting to signed URL:`, { error: err.message });
    const signedUrl = await storageService.getSignedUrl(document.storageKey, 300, {
      responseContentDisposition: mode === 'download' ? `attachment; filename="${sensibleFilename}"` : 'inline',
      responseContentType: mimeType
    });
    return res.redirect(signedUrl);
  }
});

export const updateCustomerAction = asyncHandler(async (req, res) => {
  if (!req.user) {
    throw ApiError.unauthorized('Authentication required to perform actions on an application');
  }

  const application = await applicationService.updateApplicationAction(req.params.idOrRef || req.params.id, req.body, req);
  const responseData = req.user.role === ROLES.ADMIN ? application : sanitizeApplicationForCustomer(application);
  return ApiResponse.success(res, responseData, 'Action processed successfully');
});

export const claimGuestApplication = asyncHandler(async (req, res) => {
  const application = await applicationService.claimGuestApplication({
    referenceNumber: req.body.referenceNumber,
    verificationKey: req.body.verificationKey,
    customerUser: req.user,
    req
  });
  return ApiResponse.success(
    res,
    sanitizeApplicationForCustomer(application),
    'Application successfully linked to your account'
  );
});

export const submitFeedback = asyncHandler(async (req, res) => {
  const { rating, comment } = req.body;
  const feedback = await applicationService.submitFeedback(
    req.params.idOrRef || req.params.id,
    { rating, comment },
    req.user || null
  );
  return ApiResponse.created(res, feedback, 'Thank you for your feedback!');
});

export const getApplicationFeedback = asyncHandler(async (req, res) => {
  const feedback = await applicationService.getApplicationFeedback(
    req.params.idOrRef || req.params.id,
    req.user || null
  );
  return ApiResponse.success(res, feedback, 'Application feedback retrieved');
});

import { passportOcrService } from '../services/passportOcr.service.js';
import { photoValidationService } from '../services/photoValidation.service.js';
import { faceConsistencyService } from '../services/faceConsistency.service.js';
import { storageService } from '../services/storage.service.js';
import { Visa } from '../models/Visa.js';
import logger from '../utils/logger.js';

export const processPassportOcr = asyncHandler(async (req, res) => {
  if (!req.file || !req.file.buffer) {
    throw ApiError.badRequest('Please upload a passport document or image (PDF, JPG, PNG, or WEBP).');
  }

  const allowedMimeTypes = ['image/jpeg', 'image/png', 'image/webp', 'application/pdf'];
  const filename = (req.file.originalname || '').toLowerCase();
  const hasAllowedExt = /\.(jpe?g|png|webp|pdf)$/i.test(filename);

  if (!allowedMimeTypes.includes(req.file.mimetype) && !hasAllowedExt) {
    throw ApiError.badRequest('Invalid file format. Please upload a passport in PDF, JPG, PNG, or WEBP format.');
  }

  let frontExtractedData = {};
  if (req.body?.frontExtractedData) {
    try {
      frontExtractedData = typeof req.body.frontExtractedData === 'string'
        ? JSON.parse(req.body.frontExtractedData)
        : req.body.frontExtractedData;
    } catch {
      frontExtractedData = {};
    }
  }

  try {
    const result = await passportOcrService.processPassport({
      buffer: req.file.buffer,
      originalFilename: req.file.originalname,
      mimeType: req.file.mimetype,
      userFullName: req.body?.fullName || req.body?.name || '',
      pageType: req.body?.pageType || 'front',
      frontExtractedData,
      previousStorageKey: req.body?.previousStorageKey || null
    });

    return ApiResponse.success(res, result, result.message || 'Passport processing completed');
  } finally {
    if (req.file) {
      req.file.buffer = null;
    }
  }
});

export const processPassportPhoto = asyncHandler(async (req, res) => {
  if (!req.file || !req.file.buffer) {
    throw ApiError.badRequest('Please upload a passport-size photograph (JPG, PNG, or WEBP).');
  }

  // Fetch visa photo requirements if visaId is provided
  let photoRequirements = {};
  if (req.body?.visaId) {
    try {
      const visa = await Visa.findById(req.body.visaId);
      if (visa && visa.photoRequirements) {
        photoRequirements = visa.photoRequirements;
      }
    } catch (e) {
      logger.warn('Visa fetch for photo requirements notice:', e?.message);
    }
  }

  // Clean up previous photo file in R2 if re-uploading
  if (req.body?.previousStorageKey) {
    try {
      await storageService.deleteFile(req.body.previousStorageKey);
    } catch (err) {
      logger.warn('Failed to delete previous photo file:', err?.message);
    }
  }

  // 1. Run automatic quality and detectable condition validation
  const validation = await photoValidationService.validatePhoto(req.file.buffer, {
    photoRequirements
  });

  // 2. Stage photo safely in R2 private storage
  let uploadedDocument = null;
  try {
    const uploadResult = await storageService.uploadFile({
      buffer: req.file.buffer,
      originalFilename: req.file.originalname || 'passport_photograph.jpg',
      mimeType: req.file.mimetype || 'image/jpeg',
      folder: 'documents'
    });

    uploadedDocument = {
      documentId: `photo_${Date.now()}_${Math.random().toString(36).substr(2, 6)}`,
      name: 'Passport Size Photograph',
      documentType: 'PASSPORT_PHOTO',
      originalFilename: uploadResult.originalFilename,
      storageKey: uploadResult.storageKey,
      fileSize: uploadResult.fileSize,
      mimeType: uploadResult.mimeType
    };
  } catch (uploadErr) {
    logger.warn('Passport photo storage staging notice:', uploadErr?.message);
  }

  // 3. Privacy-conscious face consistency check against passport front image
  let faceConsistency = null;
  if (req.body?.frontStorageKey) {
    try {
      faceConsistency = await faceConsistencyService.comparePassportWithPhoto({
        photoBuffer: req.file.buffer,
        frontStorageKey: req.body.frontStorageKey
      });
    } catch (faceErr) {
      logger.warn('Face consistency comparison notice:', faceErr?.message);
    }
  }

  // Determine overall status, messages, and summary
  let overallStatus = validation.status;
  let overallCanContinue = validation.canContinue;
  let overallMessages = [...validation.messages];

  if (faceConsistency) {
    if (faceConsistency.outcome === 'MISMATCH') {
      overallStatus = 'REVIEW_NEEDED';
      overallMessages.unshift(faceConsistency.message);
    } else if (faceConsistency.message) {
      overallMessages.push(faceConsistency.message);
    }
  }

  return ApiResponse.success(
    res,
    {
      uploadedDocument,
      validation,
      faceConsistency,
      canContinue: overallCanContinue,
      status: overallStatus,
      summary: faceConsistency?.summary || validation.summary || 'Photograph processed',
      messages: overallMessages
    },
    validation.summary || 'Passport photograph processed'
  );
});

export const deleteApplication = asyncHandler(async (req, res) => {
  const { idOrRef } = req.params;
  const result = await applicationService.deleteApplication(idOrRef, req.user || null, req);
  return ApiResponse.success(res, result, 'Application permanently deleted');
});

export default {
  createApplication,
  getApplications,
  getApplicationById,
  updateApplication,
  submitApplication,
  getApplicationStatus,
  getApplicationDocuments,
  uploadDocumentForApplication,
  updateCustomerAction,
  claimGuestApplication,
  submitFeedback,
  getApplicationFeedback,
  processPassportOcr,
  processPassportPhoto,
  deleteApplication
};
