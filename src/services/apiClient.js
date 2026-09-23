/**
 * Centralized API Client & HTTP Transport
 * Prepares NimuFly for authenticated backend API requests.
 * When VITE_DATA_SOURCE=api, all network requests flow through this client.
 */

import { API_CONFIG, isMockMode } from './apiConfig';

/**
 * Standard API Error class with HTTP status and detail payload
 */
export class ApiError extends Error {
  constructor(message, status = 500, data = null) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.data = data;
  }
}

// In-memory or persisted auth token store
let authToken = null;

export const tokenStore = {
  getToken: () => {
    if (authToken) return authToken;
    try {
      return localStorage.getItem('mrvisa_auth_token') || null;
    } catch {
      return null;
    }
  },
  setToken: (token) => {
    authToken = token;
    try {
      if (token) {
        localStorage.setItem('mrvisa_auth_token', token);
      } else {
        localStorage.removeItem('mrvisa_auth_token');
      }
    } catch {
      // ignore in restricted environments
    }
  },
  clearToken: () => {
    authToken = null;
    try {
      localStorage.removeItem('mrvisa_auth_token');
    } catch {
      // ignore
    }
  }
};

/**
 * Performs a normalized HTTP request to the backend API
 */
export async function apiClient(endpoint, { method = 'GET', body, headers = {}, params } = {}) {
  let url = `${API_CONFIG.BASE_URL}${endpoint.startsWith('/') ? endpoint : `/${endpoint}`}`;

  if (params && Object.keys(params).length > 0) {
    const searchParams = new URLSearchParams();
    Object.entries(params).forEach(([key, val]) => {
      if (val !== undefined && val !== null && val !== '') {
        searchParams.append(key, val);
      }
    });
    const queryString = searchParams.toString();
    if (queryString) {
      url += (url.includes('?') ? '&' : '?') + queryString;
    }
  }

  const token = tokenStore.getToken();
  const requestHeaders = {
    'Content-Type': 'application/json',
    Accept: 'application/json',
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
    ...headers
  };

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), API_CONFIG.TIMEOUT_MS || 15000);

  try {
    const response = await fetch(url, {
      method,
      headers: requestHeaders,
      body: body ? JSON.stringify(body) : undefined,
      signal: controller.signal
    });

    clearTimeout(timeoutId);

    // Parse response
    let responseData = null;
    const contentType = response.headers.get('content-type');
    if (contentType && contentType.includes('application/json')) {
      responseData = await response.json();
    } else {
      responseData = await response.text();
    }

    if (!response.ok) {
      const errorMessage =
        (responseData && (responseData.message || responseData.error)) ||
        `API request failed with status ${response.status}`;
      throw new ApiError(errorMessage, response.status, responseData);
    }

    return responseData;
  } catch (error) {
    clearTimeout(timeoutId);
    if (error.name === 'AbortError') {
      throw new ApiError('Request timed out. Please check your network connection.', 408);
    }
    if (error instanceof ApiError) {
      throw error;
    }
    throw new ApiError(error.message || 'Network error occurred.', 0, error);
  }
}

export default apiClient;
