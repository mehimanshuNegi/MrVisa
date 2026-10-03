import { dummyTicketRequestService } from '../services/dummyTicketRequest.service.js';
import { ApiResponse } from '../utils/apiResponse.js';
import { ApiError } from '../utils/apiError.js';

export async function createDummyTicketRequest(req, res, next) {
  try {
    const user = req.user || null;
    const request = await dummyTicketRequestService.createRequest(req.body, user, req);
    return ApiResponse.created(res, request, 'Dummy ticket booking request submitted successfully');
  } catch (error) {
    next(error);
  }
}

export async function getAllDummyTicketRequests(req, res, next) {
  try {
    const { status, query, page, limit } = req.query;
    const result = await dummyTicketRequestService.getAllRequests({
      status,
      query,
      page: Number(page) || 1,
      limit: Number(limit) || 50
    });
    return ApiResponse.success(res, result);
  } catch (error) {
    next(error);
  }
}

export async function getMyDummyTicketRequests(req, res, next) {
  try {
    const userId = req.user?._id || req.user?.id;
    const email = req.user?.email || req.query.email;
    const requests = await dummyTicketRequestService.getMyRequests(userId, email);
    return ApiResponse.success(res, requests);
  } catch (error) {
    next(error);
  }
}

export async function getDummyTicketRequestById(req, res, next) {
  try {
    const { id } = req.params;
    const request = await dummyTicketRequestService.getRequestById(id);
    if (!request) {
      throw ApiError.notFound(`Dummy ticket request '${id}' not found`);
    }

    // RBAC: If not admin, ensure customer owns this request
    if (req.user && req.user.role !== 'ADMIN' && req.user.role !== 'SUPER_ADMIN') {
      const isOwner = (request.user && request.user.toString() === req.user._id.toString()) ||
        request.contact?.email?.toLowerCase() === req.user.email?.toLowerCase();
      if (!isOwner) {
        throw ApiError.forbidden('Access denied to this request');
      }
    }

    return ApiResponse.success(res, request);
  } catch (error) {
    next(error);
  }
}

export async function updateDummyTicketRequestStatus(req, res, next) {
  try {
    const { id } = req.params;
    const { status, adminNotes } = req.body;
    const updated = await dummyTicketRequestService.updateRequestStatus(id, { status, adminNotes }, req);
    return ApiResponse.success(res, updated, 'Dummy ticket request status updated successfully');
  } catch (error) {
    next(error);
  }
}

export async function deleteDummyTicketRequest(req, res, next) {
  try {
    const { id } = req.params;
    await dummyTicketRequestService.deleteRequest(id, req);
    return ApiResponse.success(res, null, 'Dummy ticket request deleted successfully');
  } catch (error) {
    next(error);
  }
}
