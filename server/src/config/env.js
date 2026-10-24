import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { config as loadEnv } from 'dotenv';

const here = path.dirname(fileURLToPath(import.meta.url));
// Prefer server/.env (npm scripts run from server/), but also look next to src/
loadEnv({ path: path.resolve(here, '../../.env') });
loadEnv({ path: path.resolve(here, '../../../.env') });

function required(name) {
  const value = process.env[name];
  if (!value) {
    throw new Error(
      `Missing required environment variable ${name}. Copy .env.example to .env and set real values.`
    );
  }
  return value;
}

function int(value, fallback) {
  const parsed = Number.parseInt(value ?? '', 10);
  return Number.isFinite(parsed) ? parsed : fallback;
}

const nodeEnv = process.env.NODE_ENV || 'development';
const jwtSecret = required('JWT_SECRET');

// Production guard: refuse to boot with the documented placeholder secret.
if (nodeEnv === 'production' && /replace-with/i.test(jwtSecret)) {
  throw new Error('JWT_SECRET still contains the example placeholder — set a real secret in production.');
}

export const env = {
  nodeEnv,
  isProd: nodeEnv === 'production',
  isTest: process.env.NODE_ENV === 'test',
  port: int(process.env.PORT, 5000),
  mongoUri: required('MONGODB_URI'),
  jwtSecret,
  jwtExpiresIn: process.env.JWT_EXPIRES_IN || '7d',
  // Comma-separated allow-list of browser origins for CORS.
  clientOrigins: (process.env.CLIENT_URL || 'http://localhost:5173')
    .split(',')
    .map((origin) => origin.trim())
    .filter(Boolean),
};
