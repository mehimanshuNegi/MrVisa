import { authService } from '../services/auth.service.js';
import { ApiResponse } from '../utils/apiResponse.js';
import { asyncHandler } from '../utils/asyncHandler.js';

export const register = asyncHandler(async (req, res) => {
  const result = await authService.register(req.body);
  return ApiResponse.created(res, result, 'Registration successful');
});

export const login = asyncHandler(async (req, res) => {
  const result = await authService.login({
    email: req.body.email,
    password: req.body.password,
    req
  });
  return ApiResponse.success(res, result, 'Login successful');
});

export const refreshToken = asyncHandler(async (req, res) => {
  const result = await authService.refreshToken({
    refreshToken: req.body.refreshToken,
    req
  });
  return ApiResponse.success(res, result, 'Token refreshed successfully');
});

export const logout = asyncHandler(async (req, res) => {
  await authService.logout({
    refreshToken: req.body.refreshToken,
    userId: req.user?._id || null
  });
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

export default { register, login, refreshToken, logout, getMe, updateMe };
