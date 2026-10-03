import { Application } from '../models/Application.js';
import { Visa } from '../models/Visa.js';
import { Country } from '../models/Country.js';
import { User } from '../models/User.js';
import { auditService } from '../services/audit.service.js';
import { storageService } from '../services/storage.service.js';
import { ApiResponse } from '../utils/apiResponse.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import { ApiError } from '../utils/apiError.js';

export const getDashboardStats = asyncHandler(async (req, res) => {
  const [
    totalApplications,
    pendingReviewApplications,
    approvedApplications,
    totalVisas,
    totalCountries,
    totalUsers
  ] = await Promise.all([
    Application.countDocuments({ isDeleted: false }),
    Application.countDocuments({ status: { $in: ['APPLICATION_RECEIVED', 'DOCUMENTS_UNDER_REVIEW', 'PROCESSING'] }, isDeleted: false }),
    Application.countDocuments({ status: { $in: ['APPROVED', 'VISA_ISSUED'] }, isDeleted: false }),
    Visa.countDocuments({ isDeleted: false }),
    Country.countDocuments({ isDeleted: false }),
    User.countDocuments()
  ]);

  const stats = {
    applications: {
      total: totalApplications,
      pending: pendingReviewApplications,
      approved: approvedApplications
    },
    visas: { total: totalVisas },
    countries: { total: totalCountries },
    users: { total: totalUsers }
  };

  return ApiResponse.success(res, stats, 'Dashboard statistics retrieved');
});

export const getAuditLogs = asyncHandler(async (req, res) => {
  const { entity, entityId, limit } = req.query;
  const logs = await auditService.getAuditTrail({ entity, entityId, limit: parseInt(limit, 10) || 50 });
  return ApiResponse.success(res, logs, 'Audit logs retrieved');
});

export const uploadAdminImage = asyncHandler(async (req, res) => {
  if (!req.file) {
    throw ApiError.badRequest('No image file provided');
  }

  const allowedTypes = ['image/jpeg', 'image/png', 'image/webp'];
  if (!allowedTypes.includes(req.file.mimetype)) {
    throw ApiError.badRequest('Invalid image format. Supported formats: JPEG, PNG, WEBP.');
  }

  const uploaded = await storageService.uploadFile({
    buffer: req.file.buffer,
    originalFilename: req.file.originalname,
    mimeType: req.file.mimetype,
    folder: 'images'
  });

  const url = `/api/v1/media/${uploaded.storageKey}`;

  return ApiResponse.created(
    res,
    {
      url,
      storageKey: uploaded.storageKey,
      mimeType: uploaded.mimeType,
      fileSize: uploaded.fileSize
    },
    'Image uploaded successfully'
  );
});

export default {
  getDashboardStats,
  getAuditLogs,
  uploadAdminImage
};

