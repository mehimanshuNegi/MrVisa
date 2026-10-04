import { isDatabaseConnected } from '../config/database.js';
import { ApiResponse } from '../utils/apiResponse.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import { env } from '../config/environment.js';
import sharp from 'sharp';
import { passportOcrService } from '../services/passportOcr.service.js';

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

export const getOcrDiagnostics = asyncHandler(async (req, res) => {
  const diag = {
    timestamp: new Date().toISOString(),
    nodeVersion: process.version,
    platform: process.platform,
    arch: process.arch,
    environment: env.NODE_ENV,
    glibcVersion: process.report?.getReport?.()?.header?.glibcVersionRuntime || 'N/A',
    sharp: {
      initialized: false,
      versions: sharp.versions || null,
      error: null
    },
    engine: {
      initialized: false,
      initMs: 0,
      error: null,
      code: null,
      detail: null,
      stack: null
    },
    recognition: {
      tested: false,
      success: false,
      linesCount: 0,
      textLength: 0,
      sampleMatch: false,
      executionMs: 0,
      error: null
    },
    storage: {
      provider: env.STORAGE_PROVIDER,
      configured: Boolean(env.STORAGE_BUCKET && env.STORAGE_ACCESS_KEY_ID && env.STORAGE_SECRET_ACCESS_KEY),
      bucket: env.STORAGE_BUCKET || 'not set'
    },
    cors: {
      clientUrl: env.CLIENT_URL || 'not set',
      nodeEnv: env.NODE_ENV
    }
  };

  // 1. Test Sharp
  try {
    const testBuf = await sharp({
      create: { width: 100, height: 100, channels: 3, background: { r: 255, g: 0, b: 0 } }
    }).png().toBuffer();
    diag.sharp.initialized = Boolean(testBuf && testBuf.length > 0);
  } catch (err) {
    diag.sharp.error = err.message;
  }

  // 2. Test OCR Engine Initialization
  let engine = null;
  const t0 = Date.now();
  try {
    engine = await passportOcrService.getEngine();
    diag.engine.initialized = Boolean(engine);
    diag.engine.initMs = Date.now() - t0;
  } catch (err) {
    diag.engine.initMs = Date.now() - t0;
    diag.engine.error = err?.message || String(err);
    diag.engine.code = err?.code || null;
    diag.engine.detail = err?.detail || null;
    diag.engine.cause = err?.cause ? (err.cause.message || String(err.cause)) : null;
    diag.engine.causeStack = err?.cause?.stack ? err.cause.stack.split('\n').slice(0, 3).join(' | ') : null;
    diag.engine.stack = err?.stack ? err.stack.split('\n').slice(0, 4).join(' | ') : null;
  }

  // 3. Test Text Recognition on synthetic test buffer
  if (engine) {
    diag.recognition.tested = true;
    const tStart = Date.now();
    try {
      const svg = `
        <svg width="600" height="200" xmlns="http://www.w3.org/2000/svg">
          <rect width="100%" height="100%" fill="#FFFFFF"/>
          <text x="50" y="80" font-family="monospace" font-size="32" font-weight="bold" fill="#000000">PASSPORT TEST 12345</text>
          <text x="50" y="140" font-family="monospace" font-size="28" fill="#000000">P&lt;INDTEST&lt;&lt;SAMPLE&lt;&lt;&lt;&lt;&lt;&lt;&lt;&lt;&lt;&lt;</text>
        </svg>
      `;
      const testBuf = await sharp(Buffer.from(svg)).jpeg().toBuffer();
      const ocrRes = await engine.recognizeEncoded(testBuf);
      diag.recognition.executionMs = Date.now() - tStart;
      diag.recognition.linesCount = ocrRes?.lines?.length || 0;
      const fullText = (ocrRes?.lines || []).map((l) => l.text).join('\n');
      diag.recognition.textLength = fullText.length;
      diag.recognition.sampleMatch = fullText.toUpperCase().includes('PASSPORT') || fullText.toUpperCase().includes('TEST');
      diag.recognition.success = diag.recognition.linesCount > 0;
    } catch (recErr) {
      diag.recognition.executionMs = Date.now() - tStart;
      diag.recognition.error = recErr?.message || String(recErr);
    }
  }

  return ApiResponse.success(res, diag, 'OCR Diagnostics completed');
});

export default { getHealth, getOcrDiagnostics };
