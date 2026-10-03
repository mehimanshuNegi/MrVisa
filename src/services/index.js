/**
 * Services Barrel Export
 */

export { visaService, normalizeVisa } from './visaService';
export { countryService, normalizeCountry, generateSlug, getFlagEmojiFromCode } from './countryService';
export { applicationService, normalizeApplication, normalizeDocument, normalizeTraveller } from './applicationService';
export { userService, normalizeUserProfile } from './userService';
export { authService } from './authService';
export { apiClient, ApiError, tokenStore } from './apiClient';
export { API_CONFIG, isMockMode } from './apiConfig';
export { filterDestinations, searchCountryDestinations, normalizeVisaType, normalizeCountryName } from './destinationFilter';
export { documentationService } from './documentationService';
export { dummyTicketService } from './dummyTicketService';
export { adminService } from './adminService';

