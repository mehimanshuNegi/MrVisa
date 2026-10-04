/**
 * API and Data Source Configuration
 * Single source of truth: Live MongoDB Atlas Backend API
 */

export const API_CONFIG = Object.freeze({
  DATA_SOURCE: import.meta.env.VITE_DATA_SOURCE || 'api',
  BASE_URL: import.meta.env.VITE_API_BASE_URL || (import.meta.env.PROD ? 'https://mrvisa.onrender.com/api/v1' : 'http://localhost:5000/api/v1'),
  TIMEOUT_MS: 60000
});

export const isMockMode = () => API_CONFIG.DATA_SOURCE === 'mock';
