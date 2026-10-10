import { documentationRequestService } from '../services/documentationRequest.service.js';
import { ApiResponse } from '../utils/apiResponse.js';
import { ApiError } from '../utils/apiError.js';
import { asyncHandler } from '../utils/asyncHandler.js';

export const createDocumentationRequest = asyncHandler(async (req, res) => {
  const user = req.user || null;
  const request = await documentationRequestService.createRequest(req.body, user, req);
  return ApiResponse.created(res, request, 'Documentation application submitted successfully');
});

export const getMyDocumentationRequests = asyncHandler(async (req, res) => {
  const userId = req.user?._id || req.user?.id;
  const email = req.user?.email || req.query.email;
  const requests = await documentationRequestService.getMyRequests(userId, email);
  return ApiResponse.success(res, requests, 'Documentation requests retrieved successfully');
});

export const getAllDocumentationRequests = asyncHandler(async (req, res) => {
  const { status, query, page, limit } = req.query;
  const result = await documentationRequestService.getAllRequests({
    status,
    query,
    page: Number(page) || 1,
    limit: Number(limit) || 50
  });
  return ApiResponse.paginated(res, result.items, result.pagination, 'Documentation requests retrieved');
});

export const getDocumentationRequestById = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const request = await documentationRequestService.getRequestById(id);
  if (!request) {
    throw ApiError.notFound(`Documentation request '${id}' not found`);
  }

  // RBAC: If not admin, ensure customer owns this request
  if (req.user && req.user.role !== 'ADMIN' && req.user.role !== 'SUPER_ADMIN') {
    const isOwner =
      (request.user && request.user.toString() === req.user._id.toString()) ||
      request.applicant?.email?.toLowerCase() === req.user.email?.toLowerCase();
    if (!isOwner) {
      throw ApiError.forbidden('Access denied to this documentation request');
    }
  }

  return ApiResponse.success(res, request, 'Documentation request details retrieved');
});

export const updateDocumentationRequestStatus = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const { status, adminNotes } = req.body;
  const request = await documentationRequestService.updateRequestStatus(id, { status, adminNotes });
  return ApiResponse.success(res, request, 'Documentation request status updated');
});
