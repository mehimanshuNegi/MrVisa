import path from 'path';
import { ApiError } from './apiError.js';

const ALLOWED_EXTENSIONS = ['.pdf', '.jpg', '.jpeg', '.png', '.webp', '.doc', '.docx'];

/**
 * Validates file buffer magic bytes and detects spoofed MIME types, HTML/SVG scripts
 */
export function validateFilePayload(buffer, originalFilename, claimedMimeType) {
  if (!buffer || buffer.length < 4) {
    throw ApiError.badRequest('Invalid or empty file payload');
  }

  const ext = (path.extname(originalFilename || '') || '').toLowerCase();
  if (!ALLOWED_EXTENSIONS.includes(ext)) {
    throw ApiError.badRequest(`File extension '${ext}' is not permitted. Only PDF, JPG, PNG, WEBP, and DOC files are accepted.`);
  }

  // Scan file prefix for HTML/XML/SVG/Script injection payloads
  const checkLength = Math.min(buffer.length, 1024);
  const prefix = buffer.slice(0, checkLength).toString('utf-8', 0, checkLength).toLowerCase();

  if (
    prefix.includes('<script') ||
    prefix.includes('<html') ||
    prefix.includes('<!doctype html') ||
    prefix.includes('<svg') ||
    prefix.includes('<?xml') ||
    prefix.includes('onload=') ||
    prefix.includes('onerror=')
  ) {
    throw ApiError.badRequest('File rejected: Malicious HTML, SVG, or executable script payload detected');
  }

  // Magic bytes signatures
  const isPdf = buffer[0] === 0x25 && buffer[1] === 0x50 && buffer[2] === 0x44 && buffer[3] === 0x46; // %PDF
  const isJpeg = buffer[0] === 0xff && buffer[1] === 0xd8 && buffer[2] === 0xff;
  const isPng = buffer[0] === 0x89 && buffer[1] === 0x50 && buffer[2] === 0x4e && buffer[3] === 0x47;
  const isWebp =
    buffer.length >= 12 &&
    buffer.slice(0, 4).toString('ascii') === 'RIFF' &&
    buffer.slice(8, 12).toString('ascii') === 'WEBP';
  const isDoc = buffer[0] === 0xd0 && buffer[1] === 0xcf && buffer[2] === 0x11 && buffer[3] === 0xe0;
  const isDocx = buffer[0] === 0x50 && buffer[1] === 0x4b && buffer[2] === 0x03 && buffer[3] === 0x04;

  if (ext === '.pdf' && !isPdf) {
    throw ApiError.badRequest('File signature mismatch: expected valid PDF document');
  }
  if (['.jpg', '.jpeg'].includes(ext) && !isJpeg) {
    throw ApiError.badRequest('File signature mismatch: expected valid JPEG image');
  }
  if (ext === '.png' && !isPng) {
    throw ApiError.badRequest('File signature mismatch: expected valid PNG image');
  }
  if (ext === '.webp' && !isWebp) {
    throw ApiError.badRequest('File signature mismatch: expected valid WEBP image');
  }
  if (ext === '.doc' && !isDoc) {
    throw ApiError.badRequest('File signature mismatch: expected valid DOC file');
  }
  if (ext === '.docx' && !isDocx) {
    throw ApiError.badRequest('File signature mismatch: expected valid DOCX file');
  }

  if (!isPdf && !isJpeg && !isPng && !isWebp && !isDoc && !isDocx) {
    throw ApiError.badRequest('Unrecognized or spoofed file signature');
  }

  let verifiedMime = 'application/octet-stream';
  if (isPdf) verifiedMime = 'application/pdf';
  else if (isJpeg) verifiedMime = 'image/jpeg';
  else if (isPng) verifiedMime = 'image/png';
  else if (isWebp) verifiedMime = 'image/webp';
  else if (isDoc) verifiedMime = 'application/msword';
  else if (isDocx) verifiedMime = 'application/vnd.openxmlformats-officedocument.wordprocessingml.document';

  return { verifiedMime, ext };
}
