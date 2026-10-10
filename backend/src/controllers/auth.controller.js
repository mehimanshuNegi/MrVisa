import { authService } from '../services/auth.service.js';
import { verificationService } from '../services/verification.service.js';
import { ApiResponse } from '../utils/apiResponse.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import { env } from '../config/environment.js';

/**
 * Production Cookie Options Helper
 * In production (cross-site Vercel frontend <-> Render backend), requires sameSite: 'none' and secure: true.
 * In development, sameSite: 'lax' and secure: false allows localhost cookie storage.
 */
function getCookieOptions() {
  const isProd = env.NODE_ENV === 'production';
  return {
    httpOnly: true,
    secure: isProd,
    sameSite: isProd ? 'none' : 'lax',
    maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days in ms
    path: '/api/v1/auth'
  };
}

function getClearCookieOptions() {
  const { maxAge, ...clearOpts } = getCookieOptions();
  return clearOpts;
}

export const register = asyncHandler(async (req, res) => {
  const result = await authService.register({
    ...req.body,
    req
  });

  // Attach HttpOnly cookie with refresh token
  if (result.tokens?.refreshToken) {
    res.cookie('refreshToken', result.tokens.refreshToken, getCookieOptions());
  }

  return ApiResponse.created(res, result, 'Registration successful');
});

export const login = asyncHandler(async (req, res) => {
  const result = await authService.login({
    email: req.body.email,
    password: req.body.password,
    req
  });

  // Attach HttpOnly cookie with refresh token
  if (result.tokens?.refreshToken) {
    res.cookie('refreshToken', result.tokens.refreshToken, getCookieOptions());
  }

  return ApiResponse.success(res, result, 'Login successful');
});

export const googleAuth = asyncHandler(async (req, res) => {
  const token = req.body.idToken || req.body.credential;
  const result = await authService.loginWithGoogle({
    idToken: token,
    req
  });

  // Attach HttpOnly cookie with refresh token
  if (result.tokens?.refreshToken) {
    res.cookie('refreshToken', result.tokens.refreshToken, getCookieOptions());
  }

  const message = result.isNewUser
    ? 'Customer account created and authenticated via Google'
    : 'Google authentication successful';

  return ApiResponse.success(res, result, message);
});

export const linkGoogle = asyncHandler(async (req, res) => {
  const token = req.body.idToken || req.body.credential;
  const result = await authService.linkGoogleAccount({
    userId: req.user._id,
    idToken: token,
    req
  });

  return ApiResponse.success(res, result, 'Google account successfully linked');
});

export const refreshToken = asyncHandler(async (req, res) => {
  // Extract from HttpOnly cookie first, then fall back to body (for non-browser clients)
  const token = req.cookies?.refreshToken || req.body?.refreshToken;

  const result = await authService.refreshToken({
    refreshToken: token,
    req
  });

  // Attach rotated HttpOnly refresh token cookie
  if (result.tokens?.refreshToken) {
    res.cookie('refreshToken', result.tokens.refreshToken, getCookieOptions());
  }

  return ApiResponse.success(res, result, 'Token refreshed successfully');
});

export const logout = asyncHandler(async (req, res) => {
  const token = req.cookies?.refreshToken || req.body?.refreshToken;

  await authService.logout({
    refreshToken: token,
    userId: req.user?._id || null
  });

  // Clear HttpOnly cookie
  res.clearCookie('refreshToken', getClearCookieOptions());

  return ApiResponse.success(res, { loggedOut: true }, 'Logged out successfully');
});

export const getMe = asyncHandler(async (req, res) => {
  const profile = await authService.getProfile(req.user._id);
  return ApiResponse.success(res, profile, 'User profile retrieved');
});

export const updateMe = asyncHandler(async (req, res) => {
  const profile = await authService.updateProfile(req.user._id, req.body, req);
  return ApiResponse.success(res, profile, 'Profile updated successfully');
});

export const verifyEmail = asyncHandler(async (req, res) => {
  const result = await authService.verifyEmail({
    token: req.body.token,
    req
  });
  return ApiResponse.success(res, result, 'Email verified successfully');
});

export const resendVerification = asyncHandler(async (req, res) => {
  const result = await authService.resendVerification({
    email: req.body.email
  });
  return ApiResponse.success(res, result, result.message);
});

export const forgotPassword = asyncHandler(async (req, res) => {
  const result = await authService.forgotPassword({
    email: req.body.email
  });
  return ApiResponse.success(res, result, result.message);
});

export const resetPassword = asyncHandler(async (req, res) => {
  const result = await authService.resetPassword({
    token: req.body.token,
    newPassword: req.body.newPassword,
    req
  });
  // Clear any existing session cookie
  res.clearCookie('refreshToken', getClearCookieOptions());
  return ApiResponse.success(res, result, 'Password reset successfully');
});

export const sendVerificationOtp = asyncHandler(async (req, res) => {
  const { target, type } = req.body;
  const result = await verificationService.sendOtp({
    target,
    type,
    ip: req.ip || req.connection?.remoteAddress
  });
  return ApiResponse.success(res, result, result.message);
});

export const verifyOtp = asyncHandler(async (req, res) => {
  const { target, type, code } = req.body;
  const result = await verificationService.verifyOtp({
    target,
    type,
    code,
    currentUser: req.user || null
  });
  return ApiResponse.success(res, result, result.message);
});

export const checkVerificationStatus = asyncHandler(async (req, res) => {
  const { target, type, verificationToken } = req.body;
  const result = await verificationService.checkVerificationStatus({
    target,
    type,
    verificationToken
  });
  return ApiResponse.success(res, result, 'Verification status retrieved');
});

export default {
  register,
  login,
  googleAuth,
  linkGoogle,
  refreshToken,
  logout,
  getMe,
  updateMe,
  verifyEmail,
  resendVerification,
  forgotPassword,
  resetPassword,
  sendVerificationOtp,
  verifyOtp,
  checkVerificationStatus
};
