import express from 'express';
import helmet from 'helmet';
import cors from 'cors';
import { env } from './config/env.js';
import { sanitizeRequest } from './middleware/sanitize.js';
import { apiLimiter, authLimiter } from './middleware/rateLimit.js';
import { errorHandler, notFoundHandler } from './middleware/errorHandler.js';
import authRoutes from './routes/authRoutes.js';
import userRoutes from './routes/userRoutes.js';
import projectRoutes from './routes/projectRoutes.js';
import requestRoutes from './routes/requestRoutes.js';
import teamRoutes from './routes/teamRoutes.js';
import adminRoutes from './routes/adminRoutes.js';
import dashboardRoutes from './routes/dashboardRoutes.js';

export function createApp() {
  const app = express();

  app.disable('x-powered-by');
  if (env.isProd) {
    app.set('trust proxy', 1); // correct client IPs behind Render/Heroku-style proxies
  }

  app.use(helmet());

  // CORS allow-list comes from CLIENT_URL (comma-separated origins). Requests
  // with no Origin header (Postman, curl) are allowed so API testing works.
  app.use(
    cors({
      origin(origin, callback) {
        if (!origin || env.clientOrigins.includes(origin)) return callback(null, true);
        return callback(null, false);
      },
      methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE'],
    })
  );

  app.use(express.json({ limit: '100kb' }));
  app.use(sanitizeRequest);

  app.get('/health', (_req, res) => {
    res.json({ status: 'ok', uptime: process.uptime() });
  });

  app.use('/api', apiLimiter);
  app.use('/api/auth', authLimiter);

  app.use('/api/auth', authRoutes);
  app.use('/api/users', userRoutes);
  app.use('/api/projects', projectRoutes);
  app.use('/api/requests', requestRoutes);
  app.use('/api/teams', teamRoutes);
  app.use('/api/dashboard', dashboardRoutes);
  app.use('/api/admin', adminRoutes);

  // Anything else under /api is a 404 in the standard error envelope.
  app.use('/api', notFoundHandler);

  app.use(errorHandler);
  return app;
}
