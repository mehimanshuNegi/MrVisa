import { applicationService } from '../services/application.service.js';
import { documentService } from '../services/document.service.js';
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
  claimGuestApplication
};
