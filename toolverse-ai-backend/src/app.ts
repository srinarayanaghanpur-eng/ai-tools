import express from 'express';
import helmet from 'helmet';
import cors from 'cors';
import morgan from 'morgan';
import cookieParser from 'cookie-parser';
import swaggerUi from 'swagger-ui-express';
import { env } from './config/env.js';
import { errorHandler, notFound } from './middleware/errorHandler.js';
import { apiLimiter } from './middleware/rateLimit.js';
import authRoutes from './routes/auth.js';
import toolRoutes from './routes/tools.js';
import jobRoutes from './routes/jobs.js';
import userRoutes from './routes/user.js';
import adminRoutes from './routes/admin.js';
import blogRoutes from './routes/blog.js';
import { openApiSpec } from './openapi.js';

export function createApp() {
  const app = express();

  app.set('trust proxy', 1);
  app.disable('x-powered-by');

  app.use(
    helmet({
      crossOriginResourcePolicy: { policy: 'cross-origin' },
      contentSecurityPolicy: false, // API only; frontend separate
    })
  );
  app.use(
    cors({
      origin: (origin, cb) => {
        if (!origin) return cb(null, true); // curl / server-to-server
        if (env.CORS_ORIGINS.includes(origin)) return cb(null, true);
        return cb(new Error('CORS blocked'));
      },
      credentials: true,
    })
  );
  app.use(morgan(env.IS_PROD ? 'combined' : 'dev'));
  app.use(cookieParser());
  // JSON for text/AI tools; multipart handled per-route by multer
  app.use(express.json({ limit: '2mb' }));
  app.use(express.urlencoded({ extended: true, limit: '2mb' }));

  app.get('/health', (_req, res) => {
    res.json({ success: true, data: { status: 'ok', time: new Date().toISOString(), version: '1.0.0' } });
  });

  app.use('/api/', apiLimiter);
  app.use('/api/auth', authRoutes);
  app.use('/api/tools', toolRoutes);
  app.use('/api/jobs', jobRoutes);
  app.use('/api/user', userRoutes);
  app.use('/api/admin', adminRoutes);
  app.use('/api/blog', blogRoutes);

  // OpenAPI JSON + Swagger UI
  app.get('/api/openapi.json', (_req, res) => res.json(openApiSpec));
  app.use('/api/docs', swaggerUi.serve, swaggerUi.setup(openApiSpec as any, { explorer: true }));

  app.use(notFound);
  app.use(errorHandler);
  return app;
}
