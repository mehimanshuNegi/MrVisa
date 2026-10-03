import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import { fileURLToPath } from 'url';
import { documentService } from '../services/document.service.js';
import { ApiResponse } from '../utils/apiResponse.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import { ApiError } from '../utils/apiError.js';
import { env } from '../config/environment.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const LOCAL_STORAGE_DIR = path.resolve(__dirname, '../../uploads');

export const uploadDocument = asyncHandler(async (req, res) => {
  if (!req.file) {
    throw ApiError.badRequest('No document file was provided');
  }

  const applicationId = req.body.applicationId || req.params.applicationId || req.params.idOrRef;
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

export const getDocumentById = asyncHandler(async (req, res) => {
  const result = await documentService.getDocumentById(req.params.id, req.user);
  return ApiResponse.success(res, result, 'Document details retrieved');
});

export const getSignedUrl = asyncHandler(async (req, res) => {
  const result = await documentService.getDocumentSignedUrl(req.params.id, req.user);
  return ApiResponse.success(res, result, 'Signed download URL generated');
});

export const deleteDocument = asyncHandler(async (req, res) => {
  const result = await documentService.deleteDocument(req.params.id, req.user, req);
  return ApiResponse.success(res, result, 'Document deleted successfully');
});

export const updateDocumentStatus = asyncHandler(async (req, res) => {
  const { status, rejectionReason, note } = req.body;
  const result = await documentService.updateDocumentStatus(
    req.params.id,
    { status, rejectionReason, note },
    req
  );
  return ApiResponse.success(res, result, 'Document status updated successfully');
});

/**
 * Endpoint for streaming locally stored files in development mode with HMAC token verification
 */
export const serveLocalRawFile = asyncHandler(async (req, res) => {
  const storageKey = req.params[0] || req.params.key;
  const token = req.query.token;

  // Verify HMAC token to prevent path traversal / unauthorized file access
  const expectedToken = crypto.createHmac('sha256', env.JWT_ACCESS_SECRET).update(storageKey).digest('hex').substring(0, 16);
  if (token !== expectedToken) {
    throw ApiError.unauthorized('Invalid or expired file access token');
  }

  const safePath = path.normalize(path.join(LOCAL_STORAGE_DIR, storageKey));
  if (!safePath.startsWith(LOCAL_STORAGE_DIR) || !fs.existsSync(safePath)) {
    throw ApiError.notFound('File not found');
  }

  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('Content-Disposition', `attachment; filename="${encodeURIComponent(path.basename(safePath))}"`);
  res.sendFile(safePath);
});

export default {
  uploadDocument,
  getDocumentById,
  getSignedUrl,
  deleteDocument,
  updateDocumentStatus,
  serveLocalRawFile
};
