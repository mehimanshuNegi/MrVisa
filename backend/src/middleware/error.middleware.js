import { ApiError } from '../utils/apiError.js';
import { logger } from '../utils/logger.js';
import { isProduction } from '../config/environment.js';

export function errorHandler(err, req, res, next) {
  let error = err;

  // Convert non-ApiError errors to normalized ApiError
  if (!(error instanceof ApiError)) {
    const statusCode = error.statusCode || (error.name === 'ValidationError' ? 400 : 500);
    const message = error.message || 'Internal Server Error';
    error = new ApiError(statusCode, message, error.errors || [], err.stack);
  }

  // Handle Mongoose CastError (invalid ObjectId)
  if (err.name === 'CastError') {
    const message = `Invalid identifier format: '${err.value}' for field '${err.path}'`;
    error = ApiError.badRequest(message);
  }

  // Handle Mongoose Duplicate Key Error (E11000)
  if (err.code === 11000) {
    const field = Object.keys(err.keyValue || {})[0] || 'field';
    const val = err.keyValue ? err.keyValue[field] : '';
    const message = `Duplicate value: '${val}' already exists for ${field}`;
    error = ApiError.conflict(message);
  }

  // Handle JWT Malformed or Signature Errors
  if (err.name === 'JsonWebTokenError') {
    error = ApiError.unauthorized('Invalid security token');
  }

  // Handle Multer upload errors
  if (err.name === 'MulterError') {
    error = ApiError.badRequest(`File upload error: ${err.message}`);
  }

  const response = {
    success: false,
    message: error.message || 'Something went wrong',
    errors: error.errors || []
  };

  // Only include stack trace in development
  if (!isProduction) {
    response.stack = error.stack;
  }

  // Log server errors (500)
  if (error.statusCode >= 500) {
    logger.error(`[Unhandled Error] ${req.method} ${req.originalUrl}:`, {
      message: error.message,
      stack: error.stack,
      ip: req.ip
    });
  } else {
    logger.warn(`[Client Error ${error.statusCode}] ${req.method} ${req.originalUrl}: ${error.message}`);
  }

  res.status(error.statusCode || 500).json(response);
}

export function notFoundHandler(req, res, next) {
  next(ApiError.notFound(`Endpoint '${req.method} ${req.originalUrl}' does not exist on this server`));
}

export default { errorHandler, notFoundHandler };
