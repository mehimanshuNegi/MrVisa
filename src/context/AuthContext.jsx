import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { authService, customerTokenStore } from '../services';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(() => customerTokenStore.getUser());
  const [isAuthenticated, setIsAuthenticated] = useState(() => authService.isAuthenticated());
  const [isLoading, setIsLoading] = useState(true);

  // Initialize session on app load using secure HttpOnly cookie
  const initializeAuth = useCallback(async () => {
    try {
      // Attempt silent session refresh via HttpOnly cookie
      const refreshed = await authService.refreshSession();
      if (refreshed) {
        const profile = await authService.getMe();
        setUser(profile);
        setIsAuthenticated(true);
      } else {
        setUser(null);
        setIsAuthenticated(false);
      }
    } catch {
      setUser(null);
      setIsAuthenticated(false);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    initializeAuth();

    // Listen to 401 session expiration event from apiClient
    const handleAuthExpired = () => {
      setUser(null);
      setIsAuthenticated(false);
    };

    window.addEventListener('auth:expired', handleAuthExpired);
    return () => {
      window.removeEventListener('auth:expired', handleAuthExpired);
    };
  }, [initializeAuth]);

  const login = async ({ email, password }) => {
    const res = await authService.login({ email, password });
    const loggedUser = res?.data?.user || res?.user;
    setUser(loggedUser);
    setIsAuthenticated(true);
    return res;
  };

  const loginWithGoogle = async ({ idToken, credential }) => {
    const res = await authService.loginWithGoogle({ idToken, credential });
    const loggedUser = res?.data?.user || res?.user;
    setUser(loggedUser);
    setIsAuthenticated(true);
    return res;
  };

  const linkGoogleAccount = async ({ idToken, credential }) => {
    const res = await authService.linkGoogleAccount({ idToken, credential });
    const updatedUser = res?.data?.user || res?.user;
    if (updatedUser) {
      setUser(updatedUser);
    }
    return res;
  };

  const register = async (formData) => {
    const res = await authService.register(formData);
    const registeredUser = res?.data?.user || res?.user;
    setUser(registeredUser);
    setIsAuthenticated(true);
    return res;
  };

  const logout = async () => {
    try {
      await authService.logout();
    } finally {
      setUser(null);
      setIsAuthenticated(false);
    }
  };

  const refreshProfile = async () => {
    try {
      const profile = await authService.getMe();
      setUser(profile);
      return profile;
    } catch (err) {
      console.warn('Failed to refresh customer profile:', err);
      return null;
    }
  };

  const claimApplication = async ({ referenceNumber, verificationKey }) => {
    return authService.claimApplication({ referenceNumber, verificationKey });
  };

  const value = {
    user,
    isAuthenticated,
    isLoading,
    login,
    loginWithGoogle,
    linkGoogleAccount,
    register,
    logout,
    refreshProfile,
    claimApplication
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}

export default AuthContext;
