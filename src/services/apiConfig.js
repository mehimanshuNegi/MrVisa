/**
 * API and Data Source Configuration
 * Single source of truth: Live MongoDB Atlas Backend API
 */

export const API_CONFIG = Object.freeze({
  DATA_SOURCE: import.meta.env.VITE_DATA_SOURCE || 'api',
  BASE_URL: import.meta.env.VITE_API_BASE_URL || '/api/v1',
  TIMEOUT_MS: 15000
});

export const isMockMode = () => API_CONFIG.DATA_SOURCE === 'mock';
