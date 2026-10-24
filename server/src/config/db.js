import mongoose from 'mongoose';
import { env } from './env.js';

/**
 * Connects to MongoDB. The URI comes from MONGODB_URI (see .env.example) so the
 * same code runs locally (standalone mongod) and in production (Atlas).
 */
export async function connectDB(uri = env.mongoUri) {
  mongoose.set('strictQuery', true);
  await mongoose.connect(uri, {
    serverSelectionTimeoutMS: 10_000,
  });
  if (!env.isTest) {
    console.log(`MongoDB connected: ${maskUri(uri)}`);
  }
  return mongoose.connection;
}

export async function disconnectDB() {
  await mongoose.disconnect();
}

function maskUri(uri) {
  try {
    const parsed = new URL(uri);
    if (parsed.password) parsed.password = '***';
    return `${parsed.protocol}//${parsed.host}${parsed.pathname}`;
  } catch {
    return '(connection string hidden)';
  }
}
