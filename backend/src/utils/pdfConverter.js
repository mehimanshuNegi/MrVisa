/**
 * Lightweight PDF to Image Conversion Utility
 * Converts PDF pages to high-resolution in-memory image buffers for OCR processing
 * Uses pdf-to-img (powered by pdfjs-dist and @napi-rs/canvas)
 * Zero temporary files written to disk; memory resources explicitly disposed.
 */

import { pdf } from 'pdf-to-img';
import { logger } from './logger.js';

export const MAX_PDF_SIZE_BYTES = 10 * 1024 * 1024; // 10MB limit
export const DEFAULT_PDF_OCR_SCALE = 2.0; // ~150-200 DPI suitable for OCR

/**
 * Detects whether a payload represents a PDF file based on MIME, extension, or %PDF- magic bytes
 */
export function isPdfPayload(buffer, mimeType = '', filename = '') {
  if (mimeType && mimeType.toLowerCase() === 'application/pdf') return true;
  if (filename && filename.toLowerCase().endsWith('.pdf')) return true;
  if (
    buffer &&
    buffer.length >= 4 &&
    buffer[0] === 0x25 && // %
    buffer[1] === 0x50 && // P
    buffer[2] === 0x44 && // D
    buffer[3] === 0x46    // F
  ) {
    return true;
  }
  return false;
}

/**
 * Safely loads a PDF document, executes the provided worker callback,
 * and guarantees immediate cleanup/destruction of PDF resources.
 *
 * @param {Buffer} pdfBuffer - The raw PDF buffer
 * @param {Function} callback - async (doc) => result
 * @param {Object} options - { scale, format }
 * @returns {Promise<any>}
 */
export async function withPdfDocument(pdfBuffer, callback, options = {}) {
  if (!pdfBuffer || pdfBuffer.length === 0) {
    throw new Error('Empty PDF payload provided');
  }

  if (pdfBuffer.length > MAX_PDF_SIZE_BYTES) {
    throw new Error(`PDF file size (${Math.round(pdfBuffer.length / (1024 * 1024))}MB) exceeds maximum limit of 10MB`);
  }

  // Ensure magic bytes match %PDF-
  if (
    pdfBuffer.length < 4 ||
    pdfBuffer[0] !== 0x25 ||
    pdfBuffer[1] !== 0x50 ||
    pdfBuffer[2] !== 0x44 ||
    pdfBuffer[3] !== 0x46
  ) {
    throw new Error('Invalid PDF format: file signature does not match %PDF header');
  }

  const scale = options.scale || DEFAULT_PDF_OCR_SCALE;
  const format = options.format || 'png';

  let doc = null;
  try {
    doc = await pdf(pdfBuffer, { scale, format });
    return await callback(doc);
  } finally {
    if (doc && typeof doc.destroy === 'function') {
      try {
        await doc.destroy();
      } catch (destroyErr) {
        logger.warn('PDF resource cleanup notice:', destroyErr?.message);
      }
    }
  }
}
