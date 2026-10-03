import { dummyTicketService } from '../services/dummyTicket.service.js';
import { ApiResponse } from '../utils/apiResponse.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import { ApiError } from '../utils/apiError.js';

export const getAllDummyTicketServices = asyncHandler(async (req, res) => {
  const { query, status, page, limit } = req.query;
  const result = await dummyTicketService.getAllServices({
    query,
    status,
    page,
    limit
  });
  return ApiResponse.paginated(res, result.items, result.pagination, 'Dummy ticket services retrieved successfully');
});

export const getDummyTicketServiceById = asyncHandler(async (req, res) => {
  const service = await dummyTicketService.getServiceById(req.params.idOrSlug);
  if (!service) throw ApiError.notFound(`Dummy ticket service '${req.params.idOrSlug}' not found`);
  return ApiResponse.success(res, service, 'Dummy ticket service details retrieved');
});

export const createDummyTicketService = asyncHandler(async (req, res) => {
  const service = await dummyTicketService.createService(req.body, req);
  return ApiResponse.created(res, service, 'Dummy ticket service created successfully');
});

export const updateDummyTicketService = asyncHandler(async (req, res) => {
  const service = await dummyTicketService.updateService(req.params.id, req.body, req);
  return ApiResponse.success(res, service, 'Dummy ticket service updated successfully');
});

export const toggleDummyTicketServiceStatus = asyncHandler(async (req, res) => {
  const service = await dummyTicketService.toggleServiceStatus(req.params.id, req);
  return ApiResponse.success(res, service, 'Dummy ticket service status updated successfully');
});

export const deleteDummyTicketService = asyncHandler(async (req, res) => {
  await dummyTicketService.deleteService(req.params.id, req);
  return ApiResponse.success(res, { deleted: true }, 'Dummy ticket service deactivated successfully');
});

export default {
  getAllDummyTicketServices,
  getDummyTicketServiceById,
  createDummyTicketService,
  updateDummyTicketService,
  toggleDummyTicketServiceStatus,
  deleteDummyTicketService
};
