import { documentationService } from '../services/documentation.service.js';
import { ApiResponse } from '../utils/apiResponse.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import { ApiError } from '../utils/apiError.js';

export const getAllDocumentationServices = asyncHandler(async (req, res) => {
  const { query, category, status, page, limit } = req.query;
  const result = await documentationService.getAllServices({
    query,
    category,
    status,
    page,
    limit
  });
  return ApiResponse.paginated(res, result.items, result.pagination, 'Documentation services retrieved successfully');
});

export const getDocumentationServiceById = asyncHandler(async (req, res) => {
  const service = await documentationService.getServiceById(req.params.idOrSlug);
  if (!service) throw ApiError.notFound(`Documentation service '${req.params.idOrSlug}' not found`);
  return ApiResponse.success(res, service, 'Documentation service details retrieved');
});

export const createDocumentationService = asyncHandler(async (req, res) => {
  const service = await documentationService.createService(req.body, req);
  return ApiResponse.created(res, service, 'Documentation service created successfully');
});

export const updateDocumentationService = asyncHandler(async (req, res) => {
  const service = await documentationService.updateService(req.params.id, req.body, req);
  return ApiResponse.success(res, service, 'Documentation service updated successfully');
});

export const toggleDocumentationServiceStatus = asyncHandler(async (req, res) => {
  const service = await documentationService.toggleServiceStatus(req.params.id, req);
  return ApiResponse.success(res, service, 'Documentation service status updated successfully');
});

export const deleteDocumentationService = asyncHandler(async (req, res) => {
  await documentationService.deleteService(req.params.id, req);
  return ApiResponse.success(res, { deleted: true }, 'Documentation service deactivated successfully');
});

export default {
  getAllDocumentationServices,
  getDocumentationServiceById,
  createDocumentationService,
  updateDocumentationService,
  toggleDocumentationServiceStatus,
  deleteDocumentationService
};
