import rateLimit from 'express-rate-limit';
import { ApiError } from '../utils/ApiError.js';

const handler = (_req, res) =>
  res.status(429).json({ success: false, message: 'Too many requests. Please try again later.' });

/** Global API limiter — basic DDoS protection. */
export const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 300,
  standardHeaders: 'draft-7',
  legacyHeaders: false,
  handler,
});

/** Strict limiter for credential endpoints — brute-force protection. */
export const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 20,
  standardHeaders: 'draft-7',
  legacyHeaders: false,
  skipSuccessfulRequests: true,
  handler,
});
