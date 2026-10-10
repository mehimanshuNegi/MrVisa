import { apiClient, customerTokenStore, adminTokenStore } from './apiClient';
import { isMockMode } from './apiConfig';

class AuthService {
  /**
   * Register a new customer account
   */
  async register({ name, email, phone, password, confirmPassword, nationality = 'Indian' }) {
    if (isMockMode()) {
      const mockUser = {
        id: `usr_${Date.now()}`,
        name,
        email,
        phone,
        nationality,
        isEmailVerified: false,
        role: 'CUSTOMER'
      };
      customerTokenStore.setAuth({
        accessToken: `mock_jwt_${Date.now()}`,
        user: mockUser
      });
      return { user: mockUser };
    }

    const res = await apiClient('/auth/register', {
      method: 'POST',
      body: { name, email, phone, password, confirmPassword, nationality }
    });

    const data = res.data || res;
    if (data.tokens?.accessToken) {
      customerTokenStore.setAuth({
        accessToken: data.tokens.accessToken,
        user: data.user
      });
    }
    return data;
  }

  /**
   * Log in customer or admin
   */
  async login({ email, password }) {
    if (isMockMode()) {
      const mockUser = {
        id: 'usr_guest_01',
        name: 'Rahul Sharma',
        email,
        phone: '9876543210',
        nationality: 'Indian',
        isEmailVerified: true,
        role: 'CUSTOMER'
      };
      customerTokenStore.setAuth({
        accessToken: `mock_jwt_${Date.now()}`,
        user: mockUser
      });
      return { user: mockUser };
    }

    const res = await apiClient('/auth/login', {
      method: 'POST',
      body: { email, password }
    });

    const data = res.data || res;
    const receivedToken = data.tokens?.accessToken;
    const loggedUser = data.user;

    if (receivedToken) {
      // Store in customer in-memory store
      customerTokenStore.setAuth({
        accessToken: receivedToken,
        user: loggedUser
      });

      // If user possesses ADMIN role, sync to isolated admin store for console operations
      if (loggedUser?.role === 'ADMIN' || loggedUser?.role === 'SUPER_ADMIN') {
        adminTokenStore.setAuth({
          accessToken: receivedToken,
          user: loggedUser
        });
      }
    }

    return data;
  }

  /**
   * Log in or register customer via verified Google ID Token
   */
  async loginWithGoogle({ idToken, credential }) {
    const token = credential || idToken;
    if (isMockMode()) {
      const mockUser = {
        id: `usr_google_${Date.now()}`,
        name: 'Google Customer',
        email: 'google.customer@example.com',
        phone: '',
        nationality: 'Indian',
        isEmailVerified: true,
        role: 'CUSTOMER',
        authProvider: 'google'
      };
      customerTokenStore.setAuth({
        accessToken: `mock_jwt_google_${Date.now()}`,
        user: mockUser
      });
      return { user: mockUser };
    }

    const res = await apiClient('/auth/google', {
      method: 'POST',
      body: { idToken: token, credential: token }
    });

    const data = res.data || res;
    const receivedToken = data.tokens?.accessToken;
    const loggedUser = data.user;

    if (receivedToken) {
      customerTokenStore.setAuth({
        accessToken: receivedToken,
        user: loggedUser
      });
    }

    return data;
  }

  /**
   * Explicitly link Google account to authenticated user
   */
  async linkGoogleAccount({ idToken, credential }) {
    const token = credential || idToken;
    if (isMockMode()) {
      const current = customerTokenStore.getUser() || {};
      const updated = { ...current, googleId: 'mock_google_id' };
      customerTokenStore.setUser(updated);
      return { linked: true, user: updated };
    }

    const res = await apiClient('/auth/google/link', {
      method: 'POST',
      body: { idToken: token, credential: token }
    });

    const data = res.data || res;
    if (data.user) {
      customerTokenStore.setUser(data.user);
    }
    return data;
  }

  /**
   * Fetch current authenticated user profile
   */
  async getMe() {
    if (isMockMode()) {
      return customerTokenStore.getUser() || {
        id: 'usr_guest_01',
        name: 'Rahul Sharma',
        email: 'rahul.sharma@example.com',
        phone: '9876543210',
        nationality: 'Indian',
        isEmailVerified: true,
        role: 'CUSTOMER'
      };
    }

    const res = await apiClient('/auth/me');
    const user = res.data || res;
    if (user) {
      customerTokenStore.setUser(user);
    }
    return user;
  }

  /**
   * Update profile details
   */
  async updateProfile(updates) {
    if (isMockMode()) {
      const current = customerTokenStore.getUser() || {};
      const updated = { ...current, ...updates };
      customerTokenStore.setUser(updated);
      return updated;
    }

    const res = await apiClient('/auth/me', {
      method: 'PATCH',
      body: updates
    });
    const user = res.data || res;
    if (user) {
      customerTokenStore.setUser(user);
    }
    return user;
  }

  /**
   * Refresh session tokens via secure HttpOnly cookie
   */
  async refreshSession() {
    if (isMockMode()) return true;

    try {
      const res = await apiClient('/auth/refresh', {
        method: 'POST',
        body: {}
      });
      const data = res.data || res;
      const newToken = data.tokens?.accessToken || data.accessToken;
      const user = data.user;

      if (newToken) {
        customerTokenStore.setAuth({
          accessToken: newToken,
          user: user || customerTokenStore.getUser()
        });
        return true;
      }
      return false;
    } catch {
      customerTokenStore.clearAuth();
      return false;
    }
  }

  /**
   * Log out customer session
   */
  async logout() {
    try {
      if (!isMockMode()) {
        await apiClient('/auth/logout', {
          method: 'POST',
          body: {}
        });
      }
    } catch (err) {
      console.warn('Logout notification error:', err);
    } finally {
      customerTokenStore.clearAuth();
    }
  }

  /**
   * Request password reset instructions email
   */
  async forgotPassword({ email }) {
    if (isMockMode()) {
      return { message: 'Password reset link simulated.' };
    }

    const res = await apiClient('/auth/forgot-password', {
      method: 'POST',
      body: { email }
    });
    return res.data || res;
  }

  /**
   * Reset password with single-use token
   */
  async resetPassword({ token, newPassword, confirmPassword }) {
    if (isMockMode()) {
      return { message: 'Password reset simulated.' };
    }

    const res = await apiClient('/auth/reset-password', {
      method: 'POST',
      body: { token, newPassword, confirmPassword }
    });
    return res.data || res;
  }

  /**
   * Verify customer email address with single-use token
   */
  async verifyEmail({ token }) {
    if (isMockMode()) {
      return { emailVerified: true };
    }

    const res = await apiClient('/auth/verify-email', {
      method: 'POST',
      body: { token }
    });
    return res.data || res;
  }

  /**
   * Resend verification email
   */
  async resendVerification({ email }) {
    if (isMockMode()) {
      return { message: 'Verification email simulated.' };
    }

    const res = await apiClient('/auth/resend-verification', {
      method: 'POST',
      body: { email }
    });
    return res.data || res;
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
    return Boolean(customerTokenStore.getToken());
  }

  /**
   * Get cached in-memory user
   */
  getCurrentUser() {
    return customerTokenStore.getUser();
  }

  /**
   * Alias for getCurrentUser for API consistency
   */
  getUser() {
    return this.getCurrentUser();
  }
}

export const authService = new AuthService();
export default authService;
