import { storageService } from '../services/storage.service.js';
import { ApiError } from '../utils/apiError.js';
import { asyncHandler } from '../utils/asyncHandler.js';

export const servePublicMedia = asyncHandler(async (req, res) => {
  const key = req.params[0] || req.params.key;
  if (!key) {
    throw ApiError.badRequest('Media key is required');
  }

  // Security check: only allow images folder, prevent directory traversal
  const normalizedKey = key.replace(/\\/g, '/');
  if (normalizedKey.includes('..') || !normalizedKey.startsWith('images/')) {
    throw ApiError.forbidden('Invalid media path');
  }

  const result = await storageService.getObjectStream(normalizedKey);
  if (!result || !result.stream) {
    throw ApiError.notFound('Media item not found');
  }

  res.setHeader('Content-Type', result.contentType || 'image/jpeg');
  if (result.contentLength) {
    res.setHeader('Content-Length', result.contentLength);
  }
  res.setHeader('Cache-Control', 'public, max-age=31536000, immutable');
  res.setHeader('X-Content-Type-Options', 'nosniff');

  result.stream.pipe(res);
});

export default {
  servePublicMedia
};
