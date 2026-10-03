import { apiClient, tokenStore } from './apiClient';
import { isMockMode } from './apiConfig';

class AuthService {
  /**
   * Register a new customer
   */
  async register({ name, email, phone, password, nationality = 'Indian' }) {
    if (isMockMode()) {
      const mockUser = {
        id: `usr_${Date.now()}`,
        name,
        email,
        phone,
        nationality,
        role: 'CUSTOMER'
      };
      tokenStore.setAuth({
        accessToken: `mock_jwt_${Date.now()}`,
        refreshToken: `mock_refresh_${Date.now()}`,
        user: mockUser
      });
      return { user: mockUser };
    }

    const res = await apiClient('/auth/register', {
      method: 'POST',
      body: { name, email, phone, password, nationality }
    });

    const data = res.data || res;
    if (data.tokens) {
      tokenStore.setAuth({
        accessToken: data.tokens.accessToken,
        refreshToken: data.tokens.refreshToken,
        user: data.user
      });
    }
    return data;
  }

  /**
   * Log in an existing user
   */
  async login({ email, password }) {
    if (isMockMode()) {
      const mockUser = {
        id: 'usr_guest_01',
        name: 'Rahul Sharma',
        email,
        phone: '9876543210',
        nationality: 'Indian',
        role: 'CUSTOMER'
      };
      tokenStore.setAuth({
        accessToken: `mock_jwt_${Date.now()}`,
        refreshToken: `mock_refresh_${Date.now()}`,
        user: mockUser
      });
      return { user: mockUser };
    }

    const res = await apiClient('/auth/login', {
      method: 'POST',
      body: { email, password }
    });

    const data = res.data || res;
    if (data.tokens) {
      tokenStore.setAuth({
        accessToken: data.tokens.accessToken,
        refreshToken: data.tokens.refreshToken,
        user: data.user
      });
    }
    return data;
  }

  /**
   * Fetch current authenticated user profile
   */
  async getMe() {
    if (isMockMode()) {
      return tokenStore.getUser() || {
        id: 'usr_guest_01',
        name: 'Rahul Sharma',
        email: 'rahul.sharma@example.com',
        phone: '9876543210',
        nationality: 'Indian',
        role: 'CUSTOMER'
      };
    }

    const res = await apiClient('/auth/me');
    const user = res.data || res;
    if (user) {
      try {
        localStorage.setItem('mrvisa_user', JSON.stringify(user));
      } catch {}
    }
    return user;
  }

  /**
   * Update profile details
   */
  async updateProfile(updates) {
    if (isMockMode()) {
      const current = tokenStore.getUser() || {};
      const updated = { ...current, ...updates };
      localStorage.setItem('mrvisa_user', JSON.stringify(updated));
      return updated;
    }

    const res = await apiClient('/auth/me', {
      method: 'PUT',
      body: updates
    });
    const user = res.data || res;
    if (user) {
      try {
        localStorage.setItem('mrvisa_user', JSON.stringify(user));
      } catch {}
    }
    return user;
  }

  /**
   * Refresh session tokens
   */
  async refreshSession() {
    const refreshToken = tokenStore.getRefreshToken();
    if (!refreshToken) return null;

    try {
      const res = await apiClient('/auth/refresh', {
        method: 'POST',
        body: { refreshToken }
      });
      const data = res.data || res;
      if (data.tokens) {
        tokenStore.setToken(data.tokens.accessToken);
        tokenStore.setRefreshToken(data.tokens.refreshToken);
      }
      return data.tokens;
    } catch (err) {
      this.logout();
      return null;
    }
  }

  /**
   * Log out and invalidate refresh token
   */
  async logout() {
    const refreshToken = tokenStore.getRefreshToken();
    try {
      if (refreshToken && !isMockMode()) {
        await apiClient('/auth/logout', {
          method: 'POST',
          body: { refreshToken }
        });
      }
    } catch (err) {
      console.warn('Logout API notification failed:', err);
    } finally {
      tokenStore.clearToken();
    }
  }

  /**
   * Claim an unclaimed guest application to the authenticated customer account
   */
  async claimApplication({ referenceNumber, verificationKey }) {
    const res = await apiClient('/applications/claim', {
      method: 'POST',
      body: { referenceNumber, verificationKey }
    });
    return res.data || res;
  }

  /**
   * Check if user is currently authenticated
   */
  isAuthenticated() {
    return Boolean(tokenStore.getToken());
  }

  /**
   * Get cached user or null
   */
  getCurrentUser() {
    return tokenStore.getUser();
  }
}

export const authService = new AuthService();
export default authService;
