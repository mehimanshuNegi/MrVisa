import { isDatabaseConnected } from '../config/database.js';
import { ApiResponse } from '../utils/apiResponse.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import { env } from '../config/environment.js';

export const getHealth = asyncHandler(async (req, res) => {
  const dbConnected = isDatabaseConnected();
  const uptimeSeconds = Math.floor(process.uptime());

  const data = {
    status: dbConnected ? 'UP' : 'DEGRADED',
    timestamp: new Date().toISOString(),
    environment: env.NODE_ENV,
    uptime: `${uptimeSeconds}s`,
    database: {
      connected: dbConnected,
      status: dbConnected ? 'CONNECTED' : 'DISCONNECTED'
    },
    version: '1.0.0'
  };

  const statusCode = dbConnected ? 200 : 503;
  return ApiResponse.success(res, data, 'Health check passed', statusCode);
});

export default { getHealth };
