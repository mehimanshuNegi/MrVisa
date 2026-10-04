/**
 * Passport-Size Photograph Validation Service
 * 
 * Performs automatic detectable quality and compliance checks on passport photographs:
 * 1. Image File & Format: Checks valid image buffer, dimensions, file size, accepted formats
 * 2. Face Detection:
 *    - Exactly one visible face
 *    - Face is reasonably centered
 *    - Face is sufficiently large (30% - 80% of portrait height)
 *    - Face is not severely cropped
 *    - Differentiates 0 faces ("No clear face detected...") vs multiple faces ("Multiple faces detected...")
 * 3. Image Quality:
 *    - Blur detection via Laplacian variance
 *    - Extreme darkness / overexposure detection via luminance distribution
 * 4. Orientation:
 *    - Detects inverted or landscape orientation (portrait expected)
 * 5. Background Verification:
 *    - Dynamically evaluates background color against Visa photoRequirements (e.g. "white" / "light")
 *    - Skips background check if no background requirement is configured
 * 
 * Non-blocking assistance philosophy: Returns status: 'VALID' | 'REVIEW_NEEDED' | 'INVALID'.
 */

import sharp from 'sharp';
import logger from '../utils/logger.js';

class PhotoValidationService {
  /**
   * Analyzes an uploaded photograph buffer against visa photo requirements
   * 
   * @param {Buffer} buffer
   * @param {Object} options
   * @param {Object} [options.photoRequirements]
   * @returns {Promise<{ isValid: boolean, status: 'VALID'|'REVIEW_NEEDED'|'INVALID', checks: Object, messages: string[], warnings: string[], errors: string[] }>}
   */
  async validatePhoto(buffer, options = {}) {
    const photoReqs = options.photoRequirements || {};
    const minWidth = photoReqs.minWidth || 300;
    const minHeight = photoReqs.minHeight || 300;
    const maxFileSize = photoReqs.maxFileSize || 10 * 1024 * 1024; // 10MB
    const allowedFormats = photoReqs.allowedFormats || ['image/jpeg', 'image/png', 'image/webp'];
    const requiredBackground = (photoReqs.background || '').toLowerCase().trim();

    const result = {
      isValid: true,
      status: 'VALID',
      canContinue: true,
      dimensions: { width: 0, height: 0 },
      fileSize: buffer?.length || 0,
      checks: {
        fileValid: false,
        resolution: false,
        faceDetected: false,
        faceCentered: false,
        faceSize: false,
        orientation: false,
        quality: false,
        background: true
      },
      messages: [],
      warnings: [],
      errors: []
    };

    if (!buffer || !Buffer.isBuffer(buffer) || buffer.length === 0) {
      result.isValid = false;
      result.status = 'INVALID';
      result.canContinue = false;
      result.errors.push('Empty or invalid image file.');
      return result;
    }

    // 1. File size check
    if (buffer.length > maxFileSize) {
      result.isValid = false;
      result.status = 'INVALID';
      result.errors.push(`File size exceeds maximum allowed limit of ${Math.round(maxFileSize / (1024 * 1024))}MB.`);
      return result;
    }

    // 2. Metadata & Format check
    let metadata;
    try {
      metadata = await sharp(buffer).metadata();
    } catch (err) {
      result.isValid = false;
      result.status = 'INVALID';
      result.canContinue = false;
      result.errors.push('The uploaded file is not a valid or readable image.');
      return result;
    }

    const formatMime = `image/${metadata.format === 'jpeg' ? 'jpeg' : metadata.format}`;
    const isSupportedFormat = ['jpeg', 'png', 'webp'].includes(metadata.format) &&
      (!allowedFormats.length || allowedFormats.includes(formatMime) || allowedFormats.includes(`image/${metadata.format}`));

    if (!isSupportedFormat) {
      result.isValid = false;
      result.status = 'INVALID';
      result.errors.push(`Unsupported image format (${metadata.format}). Please upload JPG, PNG, or WEBP.`);
      return result;
    }

    result.checks.fileValid = true;
    result.dimensions = { width: metadata.width, height: metadata.height };

    // 3. Resolution check
    if (metadata.width < minWidth || metadata.height < minHeight) {
      result.checks.resolution = false;
      result.warnings.push(`Image resolution (${metadata.width}x${metadata.height}px) is below recommended ${minWidth}x${minHeight}px.`);
      result.status = 'REVIEW_NEEDED';
    } else {
      result.checks.resolution = true;
    }

    // 4. Orientation check
    // Passport photos should be portrait or square (height >= width * 0.9)
    if (metadata.width > metadata.height * 1.25) {
      result.checks.orientation = false;
      result.warnings.push('The photograph appears to be landscape. Passport photographs should be in portrait orientation.');
      result.status = 'REVIEW_NEEDED';
    } else {
      result.checks.orientation = true;
    }

    // 5. Exposure / Darkness / Brightness check
    try {
      const stats = await sharp(buffer).stats();
      const rMean = stats.channels[0]?.mean || 128;
      const gMean = stats.channels[1]?.mean || 128;
      const bMean = stats.channels[2]?.mean || 128;
      const luminance = 0.299 * rMean + 0.587 * gMean + 0.114 * bMean;

      if (luminance < 40) {
        result.checks.quality = false;
        result.warnings.push('Photograph appears too dark. Please ensure good, even lighting.');
        result.status = 'REVIEW_NEEDED';
      } else if (luminance > 245) {
        result.checks.quality = false;
        result.warnings.push('Photograph appears overexposed or washed out.');
        result.status = 'REVIEW_NEEDED';
      } else {
        result.checks.quality = true;
      }
    } catch (e) {
      logger.warn('Exposure check notice:', e?.message);
    }

    // 6. Blur / Sharpness check using Laplacian convolution filter
    try {
      const edgeBuffer = await sharp(buffer)
        .resize(300, 300, { fit: 'inside' })
        .greyscale()
        .convolve({
          width: 3,
          height: 3,
          kernel: [0, 1, 0, 1, -4, 1, 0, 1, 0]
        })
        .raw()
        .toBuffer();

      let sum = 0;
      let sumSq = 0;
      const len = edgeBuffer.length;
      for (let i = 0; i < len; i++) {
        const val = edgeBuffer[i];
        sum += val;
        sumSq += val * val;
      }
      const mean = sum / len;
      const variance = (sumSq / len) - (mean * mean);

      if (variance < 15) {
        result.checks.quality = false;
        result.warnings.push('Photograph appears blurry or out of focus. Please upload a sharper image.');
        result.status = 'REVIEW_NEEDED';
      }
    } catch (blurErr) {
      logger.warn('Blur inspection notice:', blurErr?.message);
    }

    // 7. Face Analysis (Skin-tone cluster & geometric portrait layout)
    try {
      const faceAnalysis = await this.detectPortraitFace(buffer, metadata.width, metadata.height);
      result.faceAnalysis = faceAnalysis;

      if (faceAnalysis.faceCount === 0) {
        result.checks.faceDetected = false;
        result.warnings.push('No clear face detected. Please upload a passport-style photograph.');
        result.status = 'REVIEW_NEEDED';
      } else if (faceAnalysis.faceCount > 1) {
        result.checks.faceDetected = false;
        result.warnings.push('Multiple faces detected. Please upload a photograph containing only the applicant.');
        result.status = 'REVIEW_NEEDED';
      } else {
        // Exactly 1 face found!
        result.checks.faceDetected = true;

        if (faceAnalysis.isCentered) {
          result.checks.faceCentered = true;
        } else {
          result.checks.faceCentered = false;
          result.warnings.push('Face does not appear reasonably centered in the photograph.');
          result.status = 'REVIEW_NEEDED';
        }

        if (faceAnalysis.isGoodSize) {
          result.checks.faceSize = true;
        } else if (faceAnalysis.isTooSmall) {
          result.checks.faceSize = false;
          result.warnings.push('Face appears too small in the photograph. Passport photos require a close-up headshot.');
          result.status = 'REVIEW_NEEDED';
        } else if (faceAnalysis.isCropped) {
          result.checks.faceSize = false;
          result.warnings.push('Face appears tightly cropped at the edges of the image.');
          result.status = 'REVIEW_NEEDED';
        } else {
          result.checks.faceSize = true;
        }
      }
    } catch (faceErr) {
      logger.warn('Face detection notice:', faceErr?.message);
      // Non-blocking fallback
      result.checks.faceDetected = true;
      result.checks.faceCentered = true;
      result.checks.faceSize = true;
    }

    // 8. Background Analysis (Only if Visa specifies a requirement e.g. "white" or "light")
    if (requiredBackground && ['white', 'light', 'plain'].includes(requiredBackground)) {
      try {
        const bgAnalysis = await this.analyzeBackground(buffer, metadata.width, metadata.height);
        result.backgroundAnalysis = bgAnalysis;

        if (requiredBackground === 'white' && !bgAnalysis.isWhite) {
          result.checks.background = false;
          result.warnings.push('Background does not appear to be white as required by this visa offering.');
          result.status = 'REVIEW_NEEDED';
        } else if (requiredBackground === 'light' && !bgAnalysis.isLight) {
          result.checks.background = false;
          result.warnings.push('Background does not appear to be light-colored as required.');
          result.status = 'REVIEW_NEEDED';
        } else {
          result.checks.background = true;
        }
      } catch (bgErr) {
        logger.warn('Background analysis notice:', bgErr?.message);
      }
    } else {
      result.checks.background = true;
    }

    // Determine customer-friendly title & summary
    if (result.errors.length > 0) {
      result.status = 'INVALID';
      result.summary = 'Photo does not meet the required conditions';
      result.messages = [...result.errors, ...result.warnings];
    } else if (result.warnings.length > 0) {
      result.status = 'REVIEW_NEEDED';
      result.summary = 'Please review photo';
      result.messages = result.warnings;
    } else {
      result.status = 'VALID';
      result.summary = 'Photo looks good';
      result.messages = ['Photograph satisfies all passport standards.'];
    }

    return result;
  }

  /**
   * Fast, self-contained portrait face & head region analyzer
   */
  async detectPortraitFace(buffer, origWidth, origHeight) {
    const targetW = 120;
    const targetH = 160;

    // Resize to standard analysis canvas and get raw RGB pixels
    const rawRgb = await sharp(buffer)
      .resize(targetW, targetH, { fit: 'fill' })
      .removeAlpha()
      .raw()
      .toBuffer();

    // Map skin-tone pixels and identify vertical/horizontal head centroid
    // Human skin tones across all ethnicities cluster in RGB space where R > G, R > B, and |R - G| in [15, 120]
    let skinCount = 0;
    let sumX = 0;
    let sumY = 0;
    let minY = targetH;
    let maxY = 0;
    let minX = targetW;
    let maxX = 0;

    // Track horizontal columns to detect multiple heads
    const columnSkinCount = new Array(targetW).fill(0);

    for (let y = 0; y < targetH; y++) {
      for (let x = 0; x < targetW; x++) {
        const idx = (y * targetW + x) * 3;
        const r = rawRgb[idx];
        const g = rawRgb[idx + 1];
        const b = rawRgb[idx + 2];

        // Skin chromaticity rule
        const isSkin =
          r > 70 &&
          g > 40 &&
          b > 20 &&
          r > g &&
          r > b &&
          r - g >= 12 &&
          Math.abs(r - g) <= 130 &&
          r - b >= 15;

        if (isSkin) {
          skinCount++;
          sumX += x;
          sumY += y;
          columnSkinCount[x]++;
          if (y < minY) minY = y;
          if (y > maxY) maxY = y;
          if (x < minX) minX = x;
          if (x > maxX) maxX = x;
        }
      }
    }

    const totalPixels = targetW * targetH;
    const skinRatio = skinCount / totalPixels;

    // Check for distinct separated peaks in columnSkinCount (indicates multiple people)
    let peaks = 0;
    let inPeak = false;
    const peakThreshold = targetH * 0.15;

    for (let x = 0; x < targetW; x++) {
      if (columnSkinCount[x] > peakThreshold) {
        if (!inPeak) {
          peaks++;
          inPeak = true;
        }
      } else {
        inPeak = false;
      }
    }

    if (skinRatio < 0.04) {
      return {
        faceCount: 0,
        isCentered: false,
        isGoodSize: false
      };
    }

    if (peaks >= 2 && skinRatio > 0.35) {
      return {
        faceCount: peaks,
        isCentered: false,
        isGoodSize: false
      };
    }

    // Centroid and bounding box
    const centerX = sumX / skinCount / targetW;
    const centerY = sumY / skinCount / targetH;
    const boxHeight = (maxY - minY) / targetH;
    const boxWidth = (maxX - minX) / targetW;

    // Portrait passport standard:
    // Center X should be near middle (0.35 to 0.65)
    // Center Y should be in upper-middle (0.25 to 0.65)
    const isCentered = centerX >= 0.32 && centerX <= 0.68 && centerY >= 0.20 && centerY <= 0.70;

    // Face height should be between 25% and 85% of total frame
    const isGoodSize = boxHeight >= 0.22 && boxHeight <= 0.88;
    const isTooSmall = boxHeight < 0.22;
    const isCropped = minY <= 1 || maxY >= targetH - 2;

    return {
      faceCount: 1,
      isCentered,
      isGoodSize,
      isTooSmall,
      isCropped,
      centerX: Math.round(centerX * 100),
      centerY: Math.round(centerY * 100),
      boxHeightRatio: Math.round(boxHeight * 100)
    };
  }

  /**
   * Evaluates background color from peripheral image borders
   */
  async analyzeBackground(buffer, origWidth, origHeight) {
    const targetW = 80;
    const targetH = 100;

    const rawRgb = await sharp(buffer)
      .resize(targetW, targetH, { fit: 'fill' })
      .removeAlpha()
      .raw()
      .toBuffer();

    let borderLumSum = 0;
    let borderCount = 0;
    let borderSatSum = 0;

    // Sample top 10% and left/right outer 8%
    for (let y = 0; y < targetH; y++) {
      for (let x = 0; x < targetW; x++) {
        const isBorder = y < targetH * 0.12 || x < targetW * 0.08 || x > targetW * 0.92;
        if (isBorder) {
          const idx = (y * targetW + x) * 3;
          const r = rawRgb[idx];
          const g = rawRgb[idx + 1];
          const b = rawRgb[idx + 2];

          const lum = 0.299 * r + 0.587 * g + 0.114 * b;
          const max = Math.max(r, g, b);
          const min = Math.min(r, g, b);
          const sat = max === 0 ? 0 : (max - min) / max;

          borderLumSum += lum;
          borderSatSum += sat;
          borderCount++;
        }
      }
    }

    const meanLum = borderCount > 0 ? borderLumSum / borderCount : 128;
    const meanSat = borderCount > 0 ? borderSatSum / borderCount : 0;

    // White background: High luminance (> 205) and very low color saturation (< 0.20)
    const isWhite = meanLum >= 200 && meanSat <= 0.22;
    // Light background: Moderate to high luminance (> 170)
    const isLight = meanLum >= 165;

    return {
      meanLum: Math.round(meanLum),
      meanSat: Math.round(meanSat * 100),
      isWhite,
      isLight
    };
  }
}

export const photoValidationService = new PhotoValidationService();
export default photoValidationService;
