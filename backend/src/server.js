import { createApp } from './app.js';
import { connectDatabase, disconnectDatabase } from './config/database.js';
import { env } from './config/environment.js';
import { logger } from './utils/logger.js';

let server = null;

async function startServer() {
  try {
    // 1. Connect to MongoDB
    await connectDatabase();

    // 2. Initialize Express application
    const app = createApp();

    // 3. Start listening
    server = app.listen(env.PORT, () => {
      logger.info(`====================================================`);
      logger.info(`🚀 Nimufly API Server running on port ${env.PORT}`);
      logger.info(`   Environment: ${env.NODE_ENV}`);
      logger.info(`   Health check: http://localhost:${env.PORT}/api/v1/health`);
      logger.info(`   Client URL:   ${env.CLIENT_URL}`);
      logger.info(`====================================================`);
    });
  } catch (error) {
    logger.error('Failed to start Nimufly server:', { error: error.message, stack: error.stack });
    process.exit(1);
  }
}

// Graceful Shutdown Handler
async function gracefulShutdown(signal) {
  logger.info(`Received ${signal}. Shutting down gracefully...`);
  if (server) {
    server.close(async () => {
      logger.info('HTTP server closed.');
      await disconnectDatabase();
      logger.info('Process terminated cleanly.');
      process.exit(0);
    });
  } else {
    await disconnectDatabase();
    process.exit(0);
  }

  // Force shutdown after 10s if hung
  setTimeout(() => {
    logger.error('Could not close connections in time, forcefully shutting down');
    process.exit(1);
  }, 10000);
}

process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
process.on('SIGINT', () => gracefulShutdown('SIGINT'));

process.on('unhandledRejection', (reason) => {
  logger.error('Unhandled Promise Rejection:', { reason: reason instanceof Error ? reason.message : reason });
});

process.on('uncaughtException', (err) => {
  logger.error('Uncaught Exception:', { error: err.message, stack: err.stack });
  gracefulShutdown('uncaughtException');
});

startServer();
