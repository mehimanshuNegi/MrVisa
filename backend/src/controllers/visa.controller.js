import { visaService } from '../services/visa.service.js';
import { ApiResponse } from '../utils/apiResponse.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import { ApiError } from '../utils/apiError.js';

export const getAllVisas = asyncHandler(async (req, res) => {
  const { query, country, visaType, documentCategory, status, isPopular, page, limit } = req.query;
  const result = await visaService.getAllVisas({
    query,
    country,
    visaType,
    documentCategory,
    status,
    isPopular,
    page,
    limit
  });
  return ApiResponse.paginated(res, result.items, result.pagination, 'Visas retrieved successfully');
});

export const searchVisas = asyncHandler(async (req, res) => {
  const { query, country, visaType, documentCategory } = req.query;
  const result = await visaService.getAllVisas({
    query,
    country,
    visaType,
    documentCategory,
    status: 'ACTIVE',
    limit: 100
  });
  return ApiResponse.success(res, result.items, 'Search results retrieved');
});

export const getVisaById = asyncHandler(async (req, res) => {
  const visa = await visaService.getVisaById(req.params.idOrSlug);
  if (!visa) throw ApiError.notFound(`Visa '${req.params.idOrSlug}' not found`);
  return ApiResponse.success(res, visa, 'Visa details retrieved');
});

export const createVisa = asyncHandler(async (req, res) => {
  const visa = await visaService.createVisa(req.body, req);
  return ApiResponse.created(res, visa, 'Visa offering created successfully');
});

export const updateVisa = asyncHandler(async (req, res) => {
  const visa = await visaService.updateVisa(req.params.id, req.body, req);
  return ApiResponse.success(res, visa, 'Visa offering updated successfully');
});

export const toggleVisaStatus = asyncHandler(async (req, res) => {
  const visa = await visaService.toggleVisaStatus(req.params.id, req);
  return ApiResponse.success(res, visa, 'Visa status updated successfully');
});

export const deleteVisa = asyncHandler(async (req, res) => {
  await visaService.deleteVisa(req.params.id, req);
  return ApiResponse.success(res, { deleted: true }, 'Visa deactivated successfully');
});

export default {
  getAllVisas,
  searchVisas,
  getVisaById,
  createVisa,
  updateVisa,
  toggleVisaStatus,
  deleteVisa
};
