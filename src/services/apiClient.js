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
  getRefreshToken: () => {
    try {
      return localStorage.getItem('mrvisa_refresh_token') || null;
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
  setRefreshToken: (refreshToken) => {
    try {
      if (refreshToken) {
        localStorage.setItem('mrvisa_refresh_token', refreshToken);
      } else {
        localStorage.removeItem('mrvisa_refresh_token');
      }
    } catch {
      // ignore
    }
  },
  setAuth: ({ accessToken, refreshToken, user }) => {
    if (accessToken) tokenStore.setToken(accessToken);
    if (refreshToken) tokenStore.setRefreshToken(refreshToken);
    if (user) {
      try {
        localStorage.setItem('mrvisa_user', JSON.stringify(user));
      } catch {
        // ignore
      }
    }
  },
  getUser: () => {
    try {
      const u = localStorage.getItem('mrvisa_user');
      return u ? JSON.parse(u) : null;
    } catch {
      return null;
    }
  },
  clearToken: () => {
    authToken = null;
    try {
      localStorage.removeItem('mrvisa_auth_token');
      localStorage.removeItem('mrvisa_refresh_token');
      localStorage.removeItem('mrvisa_user');
    } catch {
      // ignore
    }
  }
};

let isRefreshing = false;
let refreshQueue = [];

function processRefreshQueue(error, newAccessToken = null) {
  refreshQueue.forEach((prom) => {
    if (error) {
      prom.reject(error);
    } else {
      prom.resolve(newAccessToken);
    }
  });
  refreshQueue = [];
}

/**
 * Performs a normalized HTTP request to the backend API with automatic 401 token refresh
 */
export async function apiClient(endpoint, { method = 'GET', body, headers = {}, params, _isRetry = false } = {}) {
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
  const isFormData = typeof FormData !== 'undefined' && body instanceof FormData;
  const requestHeaders = {
    ...(isFormData ? {} : { 'Content-Type': 'application/json' }),
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
      body: isFormData ? body : (body ? JSON.stringify(body) : undefined),
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
      // 401 Token Refresh Interceptor
      if (
        response.status === 401 &&
        !_isRetry &&
        !endpoint.includes('/auth/refresh') &&
        !endpoint.includes('/auth/login') &&
        tokenStore.getRefreshToken()
      ) {
        if (isRefreshing) {
          // Another request is already refreshing; queue this request
          return new Promise((resolve, reject) => {
            refreshQueue.push({ resolve, reject });
          }).then(() => {
            return apiClient(endpoint, { method, body, headers, params, _isRetry: true });
          });
        }

        isRefreshing = true;
        try {
          const refreshRes = await fetch(`${API_CONFIG.BASE_URL}/auth/refresh`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ refreshToken: tokenStore.getRefreshToken() })
          });

          if (!refreshRes.ok) {
            throw new Error('Refresh token was rejected');
          }

          const refreshData = await refreshRes.json();
          const newAccessToken =
            refreshData?.data?.tokens?.accessToken || refreshData?.tokens?.accessToken;
          const newRefreshToken =
            refreshData?.data?.tokens?.refreshToken || refreshData?.tokens?.refreshToken;

          if (!newAccessToken) {
            throw new Error('No access token returned from refresh endpoint');
          }

          tokenStore.setAuth({
            accessToken: newAccessToken,
            refreshToken: newRefreshToken,
            user: tokenStore.getUser()
          });

          isRefreshing = false;
          processRefreshQueue(null, newAccessToken);

          // Retry the original request with the fresh token
          return apiClient(endpoint, { method, body, headers, params, _isRetry: true });
        } catch (refreshErr) {
          isRefreshing = false;
          processRefreshQueue(refreshErr, null);
          tokenStore.clearToken();
          if (typeof window !== 'undefined') {
            window.dispatchEvent(new CustomEvent('auth:expired'));
          }
          throw new ApiError('Your session has expired. Please sign in again.', 401);
        }
      }

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
