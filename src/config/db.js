import mongoose from 'mongoose';
import { env } from './env.js';
import { logger } from '../utils/logger.js';

export async function connectDB() {
  mongoose.set('strictQuery', true);

  mongoose.connection.on('connected', () => logger.info('MongoDB connected'));
  mongoose.connection.on('error', (err) => logger.error(`MongoDB error: ${err.message}`));

  await mongoose.connect(env.MONGO_URI, {
    autoIndex: !env.isProd, // build indexes explicitly in production
  });
  return mongoose.connection;
}

export async function disconnectDB() {
  await mongoose.disconnect();
}
