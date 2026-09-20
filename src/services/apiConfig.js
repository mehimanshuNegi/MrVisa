/**
 * API and Data Source Configuration
 * Allows zero-friction switching between Mock Data and real Backend API.
 * 
 * Set in environment:
 * VITE_DATA_SOURCE = "mock" | "api"
 * VITE_API_BASE_URL = "https://api.mrvisa.com/v1"
 */

export const API_CONFIG = Object.freeze({
  DATA_SOURCE: import.meta.env.VITE_DATA_SOURCE || 'mock',
  BASE_URL: import.meta.env.VITE_API_BASE_URL || '',
  TIMEOUT_MS: 15000
});

export const isMockMode = () => API_CONFIG.DATA_SOURCE === 'mock';
