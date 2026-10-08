import mongoose from 'mongoose';
import { env } from '../config/env.js';
import { logger } from '../utils/logger.js';
import { ApiError, TokenReuseError } from '../utils/ApiError.js';

export function notFoundHandler(req, _res, next) {
  next(ApiError.notFound(`Route not found: ${req.method} ${req.originalUrl}`));
}

// eslint-disable-next-line no-unused-vars
export function globalErrorHandler(err, req, res, _next) {
  // Known operational errors -> safe client response
  if (err instanceof ApiError) {
    return res.status(err.statusCode).json({
      success: false,
      message: err.message,
      ...(err.details ? { details: err.details } : {}),
    });
  }

  // Refresh-token reuse / security event -> force re-login
  if (err instanceof TokenReuseError) {
    return res.status(401).json({
      success: false,
      message: 'Session compromised. Please log in again.',
    });
  }

  // Mongoose: malformed ObjectId
  if (err instanceof mongoose.Error.CastError) {
    return res.status(400).json({ success: false, message: `Invalid ${err.path}: ${err.value}` });
  }

  // Mongoose: schema validation
  if (err instanceof mongoose.Error.ValidationError) {
    const details = Object.values(err.errors).map((e) => ({ path: e.path, message: e.message }));
    return res.status(400).json({ success: false, message: 'Validation failed', details });
  }

  // Mongo: duplicate key
  if (err.code === 11000) {
    const fields = Object.keys(err.keyValue || {}).join(', ');
    return res.status(409).json({
      success: false,
      message: `Duplicate value for unique field(s): ${fields}`,
    });
  }

  // JWT errors
  if (err.name === 'JsonWebTokenError' || err.name === 'TokenExpiredError') {
    return res.status(401).json({ success: false, message: 'Invalid or expired token' });
  }

  // Unknown / programming error -> log full, return generic
  logger.error('Unhandled error', {
    method: req.method,
    url: req.originalUrl,
    message: err.message,
    stack: err.stack,
  });

  const statusCode = err.statusCode && err.statusCode < 600 ? err.statusCode : 500;
  res.status(statusCode).json({
    success: false,
    message: 'Internal server error',
    ...(env.isProd ? {} : { stack: err.stack }),
  });
}
