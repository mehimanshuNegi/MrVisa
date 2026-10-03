import express from 'express';
import morgan from 'morgan';
import { configureSecurity } from './middleware/security.middleware.js';
import { standardLimiter } from './middleware/rateLimiter.middleware.js';
import { errorHandler, notFoundHandler } from './middleware/error.middleware.js';
import apiV1Router from './routes/index.js';
import { env } from './config/environment.js';

export function createApp() {
  const app = express();

  // Configure reverse proxy trust for accurate client IP resolution behind Cloudflare/Render/Nginx
  if (env.NODE_ENV === 'production' || process.env.TRUST_PROXY === 'true' || process.env.TRUST_PROXY === '1') {
    app.set('trust proxy', 1);
  }

  // 1. Structured HTTP logging
  if (env.NODE_ENV !== 'test') {
    app.use(morgan(env.NODE_ENV === 'production' ? 'combined' : 'dev'));
  }

  // 2. Security Middleware (Helmet + CORS)
  configureSecurity(app);

  // 3. Body Parsers with Raw Body Capture for Payment Webhooks
  app.use(
    express.json({
      limit: '10mb',
      verify: (req, _, buf) => {
        req.rawBody = buf.toString();
      }
    })
  );
  app.use(express.urlencoded({ extended: true, limit: '10mb' }));

  // 4. Rate Limiting
  app.use('/api', standardLimiter);

  // 5. Versioned API Routes
  app.use('/api/v1', apiV1Router);

  // Root redirect/status
  app.get('/', (req, res) => {
    res.json({
      name: 'Nimufly Visa Platform API',
      status: 'ONLINE',
      version: '1.0.0',
      docs: '/api/v1/health'
    });
  });

  // 6. Centralized Error Handling
  app.use(notFoundHandler);
  app.use(errorHandler);

  return app;
}

export default createApp;
