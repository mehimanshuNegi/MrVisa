import helmet from 'helmet';
import cors from 'cors';
import { env } from '../config/environment.js';

export function configureSecurity(app) {
  // Helmet HTTP security headers
  app.use(
    helmet({
      crossOriginResourcePolicy: { policy: 'cross-origin' },
      contentSecurityPolicy: env.NODE_ENV === 'production' ? undefined : false
    })
  );

  // CORS configuration: Allow production frontend domains, Vercel deployments, and configured client URLs
  const rawClientUrls = (env.CLIENT_URL || '')
    .split(',')
    .map((u) => u.trim())
    .filter(Boolean);

  const allowedOrigins = [
    'https://mr-visa.vercel.app',
    'https://mrvisa.vercel.app',
    'https://nimufly.com',
    'https://www.nimufly.com',
    ...rawClientUrls
  ];

  if (env.NODE_ENV !== 'production') {
    allowedOrigins.push(
      'http://localhost:5173',
      'http://127.0.0.1:5173',
      'http://localhost:5174',
      'http://127.0.0.1:5174',
      'http://localhost:3000',
      'http://127.0.0.1:3000',
      'http://localhost:5000'
    );
  }

  app.use(
    cors({
      origin: (origin, callback) => {
        // Allow requests with no origin (like mobile apps, curl, server-to-server)
        if (!origin || allowedOrigins.includes(origin)) {
          return callback(null, true);
        }

        // Allow Vercel preview and production deployments (*.vercel.app)
        try {
          const parsed = new URL(origin);
          if (parsed.hostname.endsWith('.vercel.app') || parsed.hostname.endsWith('nimufly.com')) {
            return callback(null, true);
          }
        } catch {
          // Fall through to error
        }

        return callback(new Error(`CORS blocked for origin: ${origin}`));
      },
      credentials: true,
      methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
      allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With', 'Accept', 'x-client-version', 'x-verification-key']
    })
  );
}

export default configureSecurity;
