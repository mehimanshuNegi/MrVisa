/**
 * Centralized API Client & HTTP Transport for NimuFly
 * 
 * Security Principles:
 * - Customer access tokens are held strictly IN-MEMORY (never persisted in localStorage).
 * - Customer refresh tokens are managed via secure HttpOnly SameSite cookies.
 * - Admin tokens are isolated in separate admin storage to prevent customer/admin privilege collisions.
 * - Automatic 401 token refresh interceptor using HttpOnly cookie rotation.
 */

import { API_CONFIG } from './apiConfig';

export class ApiError extends Error {
  constructor(message, status = 500, data = null) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.data = data;
  }
}

// In-memory customer authentication state (Strictly ephemeral, zero localStorage persistence)
let customerAccessToken = null;
let customerUser = null;

export const customerTokenStore = {
  getToken: () => customerAccessToken,
  getUser: () => customerUser,
  setAuth: ({ accessToken, user }) => {
    if (accessToken) customerAccessToken = accessToken;
    if (user) customerUser = user;
  },
  setUser: (user) => {
    customerUser = user;
  },
  clearAuth: () => {
    customerAccessToken = null;
    customerUser = null;
  }
};

// Isolated Admin Token Store (Retained for existing /admin management consoles)
export const adminTokenStore = {
  getToken: () => {
    try {
      return localStorage.getItem('mrvisa_admin_token') || localStorage.getItem('mrvisa_auth_token') || null;
    } catch {
      return null;
    }
  },
  getUser: () => {
    try {
      const u = localStorage.getItem('mrvisa_admin_user') || localStorage.getItem('mrvisa_user');
      return u ? JSON.parse(u) : null;
    } catch {
      return null;
    }
  },
  setAuth: ({ accessToken, user }) => {
    try {
      if (accessToken) {
        localStorage.setItem('mrvisa_admin_token', accessToken);
        localStorage.setItem('mrvisa_auth_token', accessToken);
      }
      if (user) {
        localStorage.setItem('mrvisa_admin_user', JSON.stringify(user));
        localStorage.setItem('mrvisa_user', JSON.stringify(user));
      }
    } catch {
      // ignore
    }
  },
  clearAuth: () => {
    try {
      localStorage.removeItem('mrvisa_admin_token');
      localStorage.removeItem('mrvisa_admin_user');
      localStorage.removeItem('mrvisa_auth_token');
      localStorage.removeItem('mrvisa_user');
    } catch {
      // ignore
    }
  }
};

// Unified token accessor maintaining full backwards compatibility for existing code
export const tokenStore = {
  getToken: (endpoint = '') => {
    if (endpoint.includes('/admin')) {
      return adminTokenStore.getToken() || customerTokenStore.getToken();
    }
    return customerTokenStore.getToken() || adminTokenStore.getToken();
  },
  getUser: () => customerTokenStore.getUser() || adminTokenStore.getUser(),
  setAuth: ({ accessToken, user, role }) => {
    if (role === 'ADMIN' || role === 'SUPER_ADMIN' || user?.role === 'ADMIN') {
      adminTokenStore.setAuth({ accessToken, user });
    } else {
      customerTokenStore.setAuth({ accessToken, user });
    }
  },
  clearToken: () => {
    customerTokenStore.clearAuth();
    adminTokenStore.clearAuth();
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
export async function apiClient(
  endpoint,
  { method = 'GET', body, headers = {}, params, _isRetry = false } = {}
) {
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

  // Determine token: Admin token for /admin endpoints, in-memory customer token for customer endpoints
  const token = endpoint.includes('/admin')
    ? adminTokenStore.getToken() || customerTokenStore.getToken()
    : customerTokenStore.getToken() || adminTokenStore.getToken();

  const isFormData = typeof FormData !== 'undefined' && body instanceof FormData;
  const requestHeaders = {
    ...(isFormData ? {} : { 'Content-Type': 'application/json' }),
    Accept: 'application/json',
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
    ...headers
  };

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), API_CONFIG.TIMEOUT_MS || 25000);

  try {
    const response = await fetch(url, {
      method,
      headers: requestHeaders,
      body: isFormData ? body : (body ? JSON.stringify(body) : undefined),
      signal: controller.signal,
      credentials: 'include' // Always include cookies for cross-origin and HttpOnly refresh token
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
      // 401 Token Refresh Interceptor (Works seamlessly with HttpOnly cookie)
      const isAuthEndpoint =
        endpoint.includes('/auth/refresh') ||
        endpoint.includes('/auth/login') ||
        endpoint.includes('/auth/register') ||
        endpoint.includes('/auth/forgot-password') ||
        endpoint.includes('/auth/reset-password');

      if (response.status === 401 && !_isRetry && !isAuthEndpoint) {
        if (isRefreshing) {
          // Another request is already refreshing; queue this request
          return new Promise((resolve, reject) => {
            refreshQueue.push({ resolve, reject });
          }).then((freshToken) => {
            return apiClient(endpoint, {
              method,
              body,
              headers: { ...headers, Authorization: `Bearer ${freshToken}` },
              params,
              _isRetry: true
            });
          });
        }

        isRefreshing = true;
        try {
          const refreshRes = await fetch(`${API_CONFIG.BASE_URL}/auth/refresh`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({}),
            credentials: 'include' // Sends HttpOnly cookie automatically
          });

          if (!refreshRes.ok) {
            throw new Error('Refresh token was rejected');
          }

          const refreshData = await refreshRes.json();
          const newAccessToken =
            refreshData?.data?.tokens?.accessToken ||
            refreshData?.tokens?.accessToken ||
            refreshData?.data?.accessToken;
          const freshUser = refreshData?.data?.user || refreshData?.user;

          if (!newAccessToken) {
            throw new Error('No access token returned from refresh endpoint');
          }

          // Save fresh token strictly in-memory
          customerTokenStore.setAuth({
            accessToken: newAccessToken,
            user: freshUser || customerTokenStore.getUser()
          });

          isRefreshing = false;
          processRefreshQueue(null, newAccessToken);

          // Retry the original request with the fresh in-memory access token
          return apiClient(endpoint, {
            method,
            body,
            headers: { ...headers, Authorization: `Bearer ${newAccessToken}` },
            params,
            _isRetry: true
          });
        } catch (refreshErr) {
          isRefreshing = false;
          processRefreshQueue(refreshErr, null);
          customerTokenStore.clearAuth();
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
