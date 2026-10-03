import { countryService } from '../services/country.service.js';
import { visaService } from '../services/visa.service.js';
import { ApiResponse } from '../utils/apiResponse.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import { ApiError } from '../utils/apiError.js';

export const getAllCountries = asyncHandler(async (req, res) => {
  const { query, status, page, limit } = req.query;
  const result = await countryService.getAllCountries({ query, status, page, limit });
  return ApiResponse.paginated(res, result.items, result.pagination, 'Countries retrieved successfully');
});

export const getCountryById = asyncHandler(async (req, res) => {
  const country = await countryService.getCountryById(req.params.idOrSlug);
  if (!country) throw ApiError.notFound(`Country '${req.params.idOrSlug}' not found`);
  return ApiResponse.success(res, country, 'Country details retrieved');
});

export const getCountryVisas = asyncHandler(async (req, res) => {
  const visas = await visaService.getVisasByCountry(req.params.countryId);
  return ApiResponse.success(res, visas, 'Country visas retrieved successfully');
});

export const createCountry = asyncHandler(async (req, res) => {
  const country = await countryService.createCountry(req.body, req);
  return ApiResponse.created(res, country, 'Country created successfully');
});

export const updateCountry = asyncHandler(async (req, res) => {
  const country = await countryService.updateCountry(req.params.id, req.body, req);
  return ApiResponse.success(res, country, 'Country updated successfully');
});

export const toggleCountryStatus = asyncHandler(async (req, res) => {
  const country = await countryService.toggleCountryStatus(req.params.id, req);
  return ApiResponse.success(res, country, 'Country status updated successfully');
});

export const deleteCountry = asyncHandler(async (req, res) => {
  await countryService.deleteCountry(req.params.id, req);
  return ApiResponse.success(res, { deleted: true }, 'Country deactivated successfully');
});

export default {
  getAllCountries,
  getCountryById,
  getCountryVisas,
  createCountry,
  updateCountry,
  toggleCountryStatus,
  deleteCountry
};
