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

  // CORS configuration: In production, strictly disallow localhost and 127.0.0.1
  const allowedOrigins = (
    env.NODE_ENV === 'production'
      ? [env.CLIENT_URL].filter((url) => url && !url.includes('localhost') && !url.includes('127.0.0.1'))
      : [env.CLIENT_URL, 'http://localhost:5173', 'http://127.0.0.1:5173', 'http://localhost:5174', 'http://127.0.0.1:5174', 'http://localhost:3000']
  ).filter(Boolean);

  app.use(
    cors({
      origin: (origin, callback) => {
        // Allow requests with no origin (like mobile apps, curl, server-to-server)
        if (!origin || allowedOrigins.includes(origin)) {
          return callback(null, true);
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
