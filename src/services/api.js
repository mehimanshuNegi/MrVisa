/**
 * Central API Client and Transport Interface
 * Re-exports core API client functions and configuration.
 */

import { apiClient, tokenStore, ApiError } from './apiClient';
import { API_CONFIG, isMockMode } from './apiConfig';

export { apiClient, apiClient as api, tokenStore, ApiError, API_CONFIG, isMockMode };
export default apiClient;
