import express from 'express';
import helmet from 'helmet';
import cors from 'cors';
import cookieParser from 'cookie-parser';
import { env } from './config/env.js';
import routes from './routes/index.js';
import { apiLimiter } from './middlewares/rateLimiter.js';
import { notFoundHandler, globalErrorHandler } from './middlewares/errorHandler.js';

export function createApp() {
  const app = express();

  app.disable('x-powered-by');
  app.set('trust proxy', 1); // required for express-rate-limit behind reverse proxies

  // Security headers
  app.use(helmet());

  // CORS — credentials enabled because we send cookies
  app.use(
    cors({
      origin: (origin, cb) => {
        // Allow non-browser clients (curl, mobile apps) with no Origin header
        if (!origin || env.CORS_ORIGIN_LIST.includes(origin)) return cb(null, true);
        cb(new Error(`Origin ${origin} not allowed by CORS`));
      },
      credentials: true,
    })
  );

  app.use(express.json({ limit: '100kb' })); // cap payload size
  app.use(express.urlencoded({ extended: true, limit: '100kb' }));
  app.use(cookieParser());

  app.use('/api', apiLimiter, routes);

  // 404 + centralized error handling
  app.use(notFoundHandler);
  app.use(globalErrorHandler);

  return app;
}
