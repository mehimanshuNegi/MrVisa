/**
 * Passport OCR & MRZ Extraction Service
 * Uses @arcships/light-ocr for native on-device optical character recognition
 * Combined with sharp for image preprocessing and ICAO Doc 9303 MRZ parsing.
 */

import sharp from 'sharp';
import { createEngine } from '@arcships/light-ocr';
import {
  extractMrzLinesFromText,
  parseTd3Mrz,
  extractIssueDateFromText,
  extractVizFieldsFromText,
  detectPassportFront,
  detectPassportBack,
  extractBackPageDetails,
  extractVisiblePassportNumber,
  checkPassportConsistency,
  compareNames,
  mergePassportFrontBack,
  isValidPassportNumberFormat
} from '../utils/mrzParser.js';
import {
  validatePassportDates,
  validatePassportIssueDate,
  validateMinimumPassportValidity,
  validateDateOfBirth,
  validateAgeEligibility
} from '../utils/dateValidator.js';
import { storageService } from './storage.service.js';
import { logger } from '../utils/logger.js';
import { isPdfPayload, withPdfDocument } from '../utils/pdfConverter.js';

// =========================================================================
// PRODUCTION MEMORY OPTIMIZATIONS (Render 512MB RAM instance protection)
// =========================================================================

// 1. Disable Sharp/libvips cache so intermediate images are freed immediately from native RAM
sharp.cache(false);
// 2. Limit Sharp concurrency to 1 thread to prevent thread-pool memory multiplication
sharp.concurrency(1);
// 3. Enable SIMD CPU vectorization for speed and compact processing
sharp.simd(true);

/**
 * Lightweight concurrency serializer ensuring heavy native ONNX/Light-OCR operations
 * do not run concurrently in parallel and multiply native memory beyond the 512MB limit.
 */
class OcrConcurrencyLock {
  constructor(maxConcurrent = 1) {
    this.queue = [];
    this.running = 0;
    this.maxConcurrent = maxConcurrent;
  }

  async acquire() {
    if (this.running < this.maxConcurrent) {
      this.running++;
      return;
    }
    return new Promise((resolve) => {
      this.queue.push(resolve);
    });
  }

  release() {
    this.running--;
    if (this.queue.length > 0) {
      this.running++;
      const next = this.queue.shift();
      next();
    }
  }

  async runExclusive(fn) {
    await this.acquire();
    try {
      return await fn();
    } finally {
      this.release();
    }
  }
}

/**
 * Production-safe memory diagnostics logger.
 * Logs process memory numbers only. NEVER logs any PII, text, or image data.
 */
function logMemoryDiagnostic(stage, details = '') {
  const mem = process.memoryUsage();
  const toMb = (bytes) => (bytes / 1024 / 1024).toFixed(1) + 'MB';
  logger.info(`[PDF OCR MEMORY] [${stage}] rss=${toMb(mem.rss)} heapUsed=${toMb(mem.heapUsed)} heapTotal=${toMb(mem.heapTotal)} external=${toMb(mem.external)} arrayBuffers=${toMb(mem.arrayBuffers)}${details ? ` (${details})` : ''}`);
}

class PassportOcrService {
  constructor() {
    this.engine = null;
    this.engineInitializing = null;
    this.engineInitError = null;
    this.lastOcrError = null;
    this.ocrLock = new OcrConcurrencyLock(1);
  }

  /**
   * Lazily initializes light-ocr engine singleton
   */
  async getEngine() {
    if (this.engine) return this.engine;
    if (this.engineInitializing) return this.engineInitializing;

    this.engineInitializing = (async () => {
      const startTime = Date.now();
      logger.info(`[OCR Runtime] Initializing @arcships/light-ocr engine on platform=${process.platform}, arch=${process.arch}, node=${process.version}`);
      try {
        const engine = await createEngine();
        this.engine = engine;
        this.engineInitError = null;
        logger.info(`[OCR Runtime] @arcships/light-ocr engine initialized successfully in ${Date.now() - startTime}ms`);
        return engine;
      } catch (err) {
        this.engineInitError = err?.message || String(err);
        logger.error(`[OCR Runtime] Failed to initialize @arcships/light-ocr engine: ${this.engineInitError}`, {
          platform: process.platform,
          arch: process.arch,
          node: process.version
        });
        this.engineInitializing = null;
        throw err;
      }
    })();

    return this.engineInitializing;
  }

  /**
   * Stage 1: Inspect image quality, dimensions, format, brightness
   */
  async checkImageQuality(buffer) {
    try {
      const metadata = await sharp(buffer).metadata();
      const stats = await sharp(buffer).stats();

      const issues = [];
      const width = metadata.width || 0;
      const height = metadata.height || 0;

      // Minimum dimension check
      if (width < 350 || height < 250) {
        issues.push('INSUFFICIENT_RESOLUTION');
      }

      // Extreme brightness check (channel means)
      if (stats.channels && stats.channels.length > 0) {
        const avgBrightness =
          stats.channels.reduce((sum, ch) => sum + ch.mean, 0) / stats.channels.length;
        if (avgBrightness < 25) {
          issues.push('VERY_DARK');
        } else if (avgBrightness > 248) {
          issues.push('VERY_BRIGHT');
        }
      }

      const ok = issues.length === 0;

      return {
        ok,
        width,
        height,
        format: metadata.format,
        issues,
        message: ok ? null : 'Image quality is too low to reliably read this passport.'
      };
    } catch (err) {
      logger.warn('Image quality inspection notice:', err?.message);
      return {
        ok: false,
        width: 0,
        height: 0,
        issues: ['UNREADABLE_IMAGE'],
        message: 'Image quality is too low to reliably read this passport.'
      };
    }
  }

  /**
   * Preprocesses image for optimal OCR recognition:
   * - Auto-rotates orientation based on EXIF
   * - Rescales if needed
   * - Normalizes contrast and applies subtle sharpening
   */
  async preprocessImage(buffer) {
    try {
      return await sharp(buffer)
        .rotate()
        .resize({ width: 1800, withoutEnlargement: false, fit: 'inside' })
        .grayscale()
        .normalize()
        .sharpen({ sigma: 1.2, m1: 1.0, m2: 2.0 })
        .png()
        .toBuffer();
    } catch (err) {
      logger.warn('Image preprocessing fallback to original buffer:', err?.message);
      return buffer;
    }
  }

  /**
   * Crops the bottom 35% of the document image where MRZ typically resides
   */
  async cropMrzBand(buffer) {
    try {
      const meta = await sharp(buffer).metadata();
      const width = meta.width || 1200;
      const height = meta.height || 800;

      const bandHeight = Math.round(height * 0.35);
      const top = height - bandHeight;

      return await sharp(buffer)
        .extract({ left: 0, top, width, height: bandHeight })
        .grayscale()
        .linear(1.3, -20)
        .sharpen()
        .png()
        .toBuffer();
    } catch (err) {
      logger.warn('Failed to crop MRZ band:', err?.message);
      return null;
    }
  }

  /**
   * Safely deletes an existing stored file to prevent duplicates or orphaned storage
   */
  async cleanupOldFile(storageKey) {
    if (!storageKey) return;
    try {
      if (typeof storageService.deleteFile === 'function') {
        await storageService.deleteFile(storageKey);
      }
    } catch (err) {
      logger.warn('Duplicate/old file cleanup notice:', err?.message);
    }
  }

  /**
   * Runs light-ocr recognition safely on an image buffer
   */
  async recognizeText(buffer) {
    return await this.ocrLock.runExclusive(async () => {
      const startTime = Date.now();
      let inputBuffer = buffer;
      try {
        const engine = await this.getEngine();
        const meta = await sharp(buffer).metadata();
        if (!['jpeg', 'png', 'webp'].includes(meta.format)) {
          inputBuffer = await sharp(buffer).jpeg({ quality: 90 }).toBuffer();
        }

        logger.info(`[OCR Execution] recognizeEncoded started: size=${inputBuffer.length} bytes, format=${meta.format || 'unknown'}, dimensions=${meta.width}x${meta.height}`);
        const ocrResult = await engine.recognizeEncoded(inputBuffer);
        const lines = ocrResult.lines || [];
        const fullText = lines.map((l) => l.text).join('\n');
        this.lastOcrError = null;
        logger.info(`[OCR Result] recognizeEncoded completed in ${Date.now() - startTime}ms: detectedLines=${lines.length}`);
        return { lines, fullText, error: null };
      } catch (err) {
        this.lastOcrError = err?.message || String(err);
        logger.error(`[OCR Error] recognizeEncoded failed in ${Date.now() - startTime}ms: ${this.lastOcrError}`);
        return { lines: [], fullText: '', error: this.lastOcrError };
      } finally {
        if (inputBuffer && inputBuffer !== buffer) {
          inputBuffer = null;
        }
      }
    });
  }

  /**
   * Internal helper: Extracts front passport fields and MRZ from an image buffer
   */
  async _extractPassportFrontFromImageBuffer({
    imageBuffer,
    userFullName = '',
    originalFilename = '',
    uploadedDocument = null,
    startTime = Date.now()
  }) {
    const stages = [
      { id: 'image_checked', label: 'Image checked', status: 'pending' },
      { id: 'passport_detected', label: 'Passport detected', status: 'pending' },
      { id: 'mrz_detected', label: 'MRZ detected', status: 'pending' },
      { id: 'extracting_details', label: 'Extracting details', status: 'pending' },
      { id: 'verifying_details', label: 'Verifying information', status: 'pending' }
    ];

    // Stage 1: Quality Check
    const quality = await this.checkImageQuality(imageBuffer);
    stages[0].status = quality.ok ? 'completed' : 'warning';

    // If quality is critically low, return early with clear non-blocking options
    if (!quality.ok && quality.issues.includes('INSUFFICIENT_RESOLUTION')) {
      logger.warn(`[OCR FRONT Quality] Insufficient resolution: ${quality.width}x${quality.height}`);
      return {
        success: false,
        pageType: 'front',
        qualityFailed: true,
        message: 'Image quality is too low to reliably read this passport.',
        canContinueManually: true,
        stages,
        extractedData: {
          fullName: userFullName || '',
          firstName: userFullName ? userFullName.split(' ')[0] : '',
          lastName: userFullName ? userFullName.split(' ').slice(1).join(' ') : '',
          passportNumber: '',
          dateOfBirth: '',
          nationality: 'Indian',
          gender: 'Male',
          issueDate: '',
          expiryDate: ''
        },
        fieldStatus: {
          fullName: userFullName ? 'HIGH' : 'MISSING',
          passportNumber: 'MISSING',
          dateOfBirth: 'MISSING',
          nationality: 'HIGH',
          gender: 'HIGH',
          issueDate: 'MISSING',
          expiryDate: 'MISSING'
        },
        uploadedDocument
      };
    }

    // Stage 2 & 3: Run OCR
    let ocrText = '';
    let mrzLines = [];
    let parsedMrz = null;

    // ATTEMPT 1: Raw image OCR
    try {
      const rawOcr = await this.recognizeText(imageBuffer);
      ocrText = rawOcr.fullText;
      mrzLines = extractMrzLinesFromText(ocrText);
      if (mrzLines.length >= 2) {
        parsedMrz = parseTd3Mrz(mrzLines[0], mrzLines[1]);
      }
    } catch (err1) {
      logger.warn(`[OCR FRONT Attempt 1] Raw OCR notice: ${err1?.message}`);
    }

    // ATTEMPT 2: Preprocessing + MRZ Crop if needed
    if (!parsedMrz || !parsedMrz.checks?.docNumber || !parsedMrz.checks?.expiry) {
      let preprocessedBuffer = null;
      try {
        logger.info(`[OCR FRONT Preprocessing] Running image enhancements (EXIF, resize, grayscale, normalize)...`);
        preprocessedBuffer = await this.preprocessImage(imageBuffer);
        const prepOcr = await this.recognizeText(preprocessedBuffer);
        ocrText += '\n' + prepOcr.fullText;
        const newMrzLines = extractMrzLinesFromText(prepOcr.fullText);

        if (newMrzLines.length >= 2) {
          const secondParse = parseTd3Mrz(newMrzLines[0], newMrzLines[1]);
          if (secondParse.passportNumber || secondParse.fullName) {
            parsedMrz = secondParse;
            mrzLines = newMrzLines;
          }
        }
      } catch (err2) {
        logger.warn(`[OCR FRONT Attempt 2] Preprocessed OCR notice: ${err2?.message}`);
      } finally {
        preprocessedBuffer = null;
      }

      if (!parsedMrz) {
        let croppedMrz = null;
        try {
          logger.info(`[OCR FRONT MRZ Crop] Attempting dedicated bottom MRZ crop band...`);
          croppedMrz = await this.cropMrzBand(imageBuffer);
          if (croppedMrz) {
            const cropOcr = await this.recognizeText(croppedMrz);
            const cropLines = extractMrzLinesFromText(cropOcr.fullText);
            if (cropLines.length >= 2) {
              parsedMrz = parseTd3Mrz(cropLines[0], cropLines[1]);
              mrzLines = cropLines;
            }
          }
        } catch (err3) {
          logger.warn(`[OCR FRONT Attempt 2 Crop] MRZ crop notice: ${err3?.message}`);
        } finally {
          croppedMrz = null;
        }
      }
    }

    logger.info(`[OCR FRONT MRZ Parsing] linesExtracted=${mrzLines.length}, mrzParsed=${!!parsedMrz}, validDocCheck=${!!parsedMrz?.checks?.docNumber}`);

    // Wrong page detection
    const frontDetection = detectPassportFront(ocrText);
    if (!frontDetection.isFront && !parsedMrz) {
      const isEngineFailure = !!(this.lastOcrError || this.engineInitError);
      logger.warn(`[OCR FRONT Detection] Front passport not identified. isEngineFailure=${isEngineFailure}`);
      return {
        success: false,
        pageType: 'front',
        wrongPage: !isEngineFailure,
        ocrEngineError: isEngineFailure,
        isFrontDetected: false,
        message: isEngineFailure
          ? "OCR engine was unable to read this image on the server. You can enter details manually."
          : "We couldn't identify a passport page in this image.",
        errors: [
          isEngineFailure
            ? "OCR engine was unable to read this image on the server. You can enter details manually."
            : "We couldn't identify a passport page in this image."
        ],
        canContinueManually: true,
        uploadedDocument,
        stages
      };
    }

    stages[1].status = 'completed';
    const mrzFound = !!parsedMrz && mrzLines.length >= 2;
    stages[2].status = mrzFound ? 'completed' : 'warning';
    stages[3].status = 'completed';

    // Extract Visual Inspection Zone (VIZ) fields
    const vizFields = extractVizFieldsFromText(ocrText, parsedMrz);
    const detectedIssueDate = vizFields.issueDate || extractIssueDateFromText(ocrText, parsedMrz);
    const visibleDocNumber = vizFields.visibleDocNumber || extractVisiblePassportNumber(ocrText);
    const detectedPlaceOfIssue = vizFields.placeOfIssue || '';
    const detectedExpiryDate = vizFields.expiryDate || '';
    const detectedDob = vizFields.dateOfBirth || '';

    // Build structured front data
    const extractedData = {
      fullName: parsedMrz?.fullName || userFullName || '',
      firstName: parsedMrz?.firstName || (userFullName ? userFullName.split(' ')[0] : ''),
      lastName: parsedMrz?.lastName || (userFullName ? userFullName.split(' ').slice(1).join(' ') : ''),
      passportNumber: parsedMrz?.passportNumber || visibleDocNumber || '',
      dateOfBirth: parsedMrz?.dateOfBirth || detectedDob || '',
      nationality: parsedMrz?.nationality || vizFields.nationality || 'Indian',
      gender: parsedMrz?.gender || vizFields.gender || 'Male',
      issueDate: detectedIssueDate || '',
      passportIssuedOn: detectedIssueDate || '',
      expiryDate: parsedMrz?.expiryDate || detectedExpiryDate || '',
      placeOfIssue: detectedPlaceOfIssue || '',
      placeOfBirth: vizFields.placeOfBirth || ''
    };

    // Stage 5: Validation
    stages[4].status = 'completed';

    // Merge front data with source and confidence metadata
    const merged = mergePassportFrontBack({
      frontData: {
        ...extractedData,
        visibleDocNumber
      },
      backData: {},
      mrzData: parsedMrz,
      userFullName
    });

    const fieldStatus = { ...merged.fieldStatus };

    // Corroboration checks
    if (parsedMrz?.checks?.docNumber || (visibleDocNumber && parsedMrz?.passportNumber === visibleDocNumber)) {
      fieldStatus.passportNumber = 'HIGH';
    }
    if (parsedMrz?.checks?.dob || (detectedDob && parsedMrz?.dateOfBirth === detectedDob)) {
      fieldStatus.dateOfBirth = 'HIGH';
    }
    if (parsedMrz?.checks?.expiry || (detectedExpiryDate && parsedMrz?.expiryDate === detectedExpiryDate)) {
      fieldStatus.expiryDate = 'HIGH';
    }

    // Determine issueDate confidence status
    // HIGH: Verified when VIZ + MRZ agree (issueDate <= today, < mrzExpiry, > mrzDob, valid period)
    // MEDIUM: Review when only one reliable source is available (e.g. VIZ issue date available, MRZ unavailable)
    // LOW: Enter manually when extraction is uncertain or violates date rules
    if (detectedIssueDate) {
      if (parsedMrz?.expiryDate) {
        const today = new Date().toISOString().split('T')[0];
        const dateCheck = validatePassportDates(detectedIssueDate, parsedMrz.expiryDate);
        const isPastOrToday = detectedIssueDate <= today;
        const isBeforeExpiry = detectedIssueDate < parsedMrz.expiryDate;
        const isAfterDob = !parsedMrz.dateOfBirth || detectedIssueDate > parsedMrz.dateOfBirth;

        if (isPastOrToday && isBeforeExpiry && isAfterDob && dateCheck.isValid) {
          fieldStatus.issueDate = 'HIGH';
          fieldStatus.passportIssuedOn = 'HIGH';
        } else if (!isPastOrToday || !isBeforeExpiry || !dateCheck.isValid) {
          fieldStatus.issueDate = 'LOW';
          fieldStatus.passportIssuedOn = 'LOW';
        } else {
          fieldStatus.issueDate = 'MEDIUM';
          fieldStatus.passportIssuedOn = 'MEDIUM';
        }
      } else {
        fieldStatus.issueDate = 'MEDIUM';
        fieldStatus.passportIssuedOn = 'MEDIUM';
      }
    } else {
      fieldStatus.issueDate = 'MISSING';
      fieldStatus.passportIssuedOn = 'MISSING';
    }

    if (detectedPlaceOfIssue) {
      fieldStatus.placeOfIssue = 'HIGH';
    }

    // Check visible passport number vs MRZ passport number
    let passportNumberMismatch = false;
    if (
      visibleDocNumber &&
      parsedMrz?.passportNumber &&
      visibleDocNumber !== parsedMrz.passportNumber
    ) {
      passportNumberMismatch = true;
      fieldStatus.passportNumber = 'LOW';
    }

    // Validate dates if present
    let dateValidation = { isValid: true, error: null };
    if (extractedData.issueDate && extractedData.expiryDate) {
      dateValidation = validatePassportDates(extractedData.issueDate, extractedData.expiryDate);
      if (!dateValidation.isValid) {
        fieldStatus.expiryDate = 'LOW';
        fieldStatus.issueDate = 'LOW';
        fieldStatus.passportIssuedOn = 'LOW';
      }
    }

    if (merged.fields?.issueDate) {
      merged.fields.issueDate.confidence = fieldStatus.issueDate;
    }
    if (merged.fields?.passportIssuedOn) {
      merged.fields.passportIssuedOn.confidence = fieldStatus.passportIssuedOn;
    }

    const durationMs = Date.now() - startTime;
    logger.info(`[OCR FRONT Response] Success: docDetected=true, hasMrz=${!!parsedMrz}, fieldsPopulated=${Object.keys(merged.extractedData || {}).length}, duration=${durationMs}ms`);

    return {
      success: true,
      pageType: 'front',
      isFrontDetected: true,
      status: 'FRONT_DETECTED',
      durationMs,
      stages,
      extractedData: merged.extractedData,
      fields: merged.fields,
      fieldStatus,
      dateValidation,
      passportNumberMismatch,
      uploadedDocument,
      canContinueManually: true,
      message: 'Front side detected'
    };
  }

  /**
   * STEP 1 — FRONT / PHOTO PAGE PROCESSING
   * Seamlessly handles both images (JPG, PNG, WEBP) and PDFs (converting relevant page to image)
   */
  async processPassportFront({
    buffer,
    originalFilename,
    mimeType,
    userFullName = '',
    previousStorageKey = null
  }) {
    const startTime = Date.now();
    logger.info(`[OCR FRONT Received] originalFilename=${originalFilename || 'unknown'}, mimeType=${mimeType || 'unknown'}, size=${buffer?.length || 0} bytes`);

    // Clean up previous front file if re-uploading
    if (previousStorageKey) {
      await this.cleanupOldFile(previousStorageKey);
    }

    const isPdf = isPdfPayload(buffer, mimeType, originalFilename);

    // Store original uploaded document safely using storageService
    let uploadedDocument = null;
    try {
      logger.info(`[OCR FRONT Storage] Uploading original document to storage (size: ${buffer?.length} bytes, isPdf: ${isPdf})`);
      const uploadResult = await storageService.uploadFile({
        buffer,
        originalFilename: originalFilename || (isPdf ? 'passport_front.pdf' : 'passport_front.jpg'),
        mimeType: mimeType || (isPdf ? 'application/pdf' : 'image/jpeg'),
        folder: 'documents'
      });
      uploadedDocument = {
        documentId: `doc_${Date.now()}_${Math.random().toString(36).substr(2, 6)}`,
        name: isPdf ? 'Passport Front Page' : 'Passport Front Page',
        originalFilename: uploadResult.originalFilename,
        storageKey: uploadResult.storageKey,
        fileSize: uploadResult.fileSize,
        mimeType: uploadResult.mimeType
      };
      logger.info(`[OCR FRONT Storage] Document staged successfully: storageKey=${uploadResult.storageKey}`);
    } catch (uploadErr) {
      logger.warn(`[OCR FRONT Storage] Document staging notice: ${uploadErr?.message}`);
    }

    // Direct Image OCR flow
    if (!isPdf) {
      return await this._extractPassportFrontFromImageBuffer({
        imageBuffer: buffer,
        userFullName,
        originalFilename,
        uploadedDocument,
        startTime
      });
    }

    // PDF -> Image -> OCR Flow
    logMemoryDiagnostic('memory before PDF processing', `fileSize=${buffer?.length || 0} bytes`);
    try {
      return await withPdfDocument(buffer, async (pdfDoc) => {
        const totalPages = pdfDoc.length || 0;
        logger.info(`[OCR FRONT PDF] Opened PDF successfully. totalPages=${totalPages}`);
        if (totalPages === 0) {
          throw new Error('PDF has 0 pages');
        }

        // Limit checking to relevant pages (up to 2 pages maximum) to avoid unnecessary processing
        const maxPagesToCheck = Math.min(totalPages, 2);
        let firstPageResult = null;

        for (let pageNum = 1; pageNum <= maxPagesToCheck; pageNum++) {
          logMemoryDiagnostic('memory before page rendering', `page ${pageNum}/${totalPages}`);
          logger.info(`[OCR FRONT PDF] Rendering page ${pageNum}/${totalPages} for OCR...`);
          
          let pageImgBuffer = await pdfDoc.getPage(pageNum);
          logMemoryDiagnostic('memory after page rendering', `page ${pageNum}/${totalPages}, size=${pageImgBuffer?.length || 0} bytes`);

          let pageResult = null;
          try {
            pageResult = await this._extractPassportFrontFromImageBuffer({
              imageBuffer: pageImgBuffer,
              userFullName,
              originalFilename,
              uploadedDocument,
              startTime
            });
          } finally {
            // Requirement 1 & 2: Process sequentially and immediately release rendered image buffer
            pageImgBuffer = null;
            logMemoryDiagnostic('memory after page cleanup', `page ${pageNum}/${totalPages}`);
          }
          logMemoryDiagnostic('memory after OCR', `page ${pageNum}/${totalPages}`);

          if (pageResult.isFrontDetected || pageResult.success) {
            logger.info(`[OCR FRONT PDF] Passport front identified on PDF page ${pageNum}.`);

            // If a multi-page PDF is uploaded, sequentially inspect the other page for back details (parents, address)
            // Page 1 buffer was already released above, so page 1 and page 2 buffers are NEVER in memory simultaneously
            if (totalPages >= 2) {
              const otherPageNum = pageNum === 1 ? 2 : 1;
              try {
                logMemoryDiagnostic('memory before page rendering', `page ${otherPageNum}/${totalPages} (back inspection)`);
                logger.info(`[OCR FRONT PDF] Checking page ${otherPageNum} for back page details...`);
                
                let otherImgBuffer = await pdfDoc.getPage(otherPageNum);
                logMemoryDiagnostic('memory after page rendering', `page ${otherPageNum}/${totalPages}, size=${otherImgBuffer?.length || 0} bytes`);

                let backResult = null;
                try {
                  backResult = await this._extractPassportBackFromImageBuffer({
                    imageBuffer: otherImgBuffer,
                    frontExtractedData: pageResult.extractedData,
                    uploadedDocument,
                    startTime
                  });
                } finally {
                  // Requirement 1: Immediately release page 2 buffer
                  otherImgBuffer = null;
                  logMemoryDiagnostic('memory after page cleanup', `page ${otherPageNum}/${totalPages} (back inspection)`);
                }
                logMemoryDiagnostic('memory after OCR', `page ${otherPageNum}/${totalPages} (back inspection)`);

                if (backResult?.isBackDetected || Object.values(backResult?.extractedData || {}).some(v => Boolean(v))) {
                  logger.info(`[OCR FRONT PDF] Successfully merged back page details from page ${otherPageNum}.`);
                  const mergedExtracted = {
                    ...pageResult.extractedData,
                    ...(backResult.extractedData || {}),
                    ...(backResult.mergedData || {})
                  };
                  if (pageResult.extractedData?.issueDate && !mergedExtracted.issueDate) {
                    mergedExtracted.issueDate = pageResult.extractedData.issueDate;
                  }
                  if (pageResult.extractedData?.passportIssuedOn && !mergedExtracted.passportIssuedOn) {
                    mergedExtracted.passportIssuedOn = pageResult.extractedData.passportIssuedOn;
                  }

                  const mergedFields = {
                    ...(pageResult.fields || {}),
                    ...(backResult.fields || {})
                  };
                  if (pageResult.fields?.issueDate && !mergedFields.issueDate?.value) {
                    mergedFields.issueDate = pageResult.fields.issueDate;
                  }
                  if (pageResult.fields?.passportIssuedOn && !mergedFields.passportIssuedOn?.value) {
                    mergedFields.passportIssuedOn = pageResult.fields.passportIssuedOn;
                  }

                  const mergedFieldStatus = {
                    ...(pageResult.fieldStatus || {}),
                    ...(backResult.fieldStatus || {}),
                    // Preserve verified front page confidence statuses
                    ...(pageResult.fieldStatus?.issueDate ? { issueDate: pageResult.fieldStatus.issueDate } : {}),
                    ...(pageResult.fieldStatus?.passportIssuedOn ? { passportIssuedOn: pageResult.fieldStatus.passportIssuedOn } : {}),
                    ...(pageResult.fieldStatus?.passportNumber ? { passportNumber: pageResult.fieldStatus.passportNumber } : {}),
                    ...(pageResult.fieldStatus?.dateOfBirth ? { dateOfBirth: pageResult.fieldStatus.dateOfBirth } : {}),
                    ...(pageResult.fieldStatus?.expiryDate ? { expiryDate: pageResult.fieldStatus.expiryDate } : {})
                  };

                  return {
                    ...pageResult,
                    extractedData: mergedExtracted,
                    fields: mergedFields,
                    fieldStatus: mergedFieldStatus,
                    consistency: backResult.consistency || null,
                    isCompleteDocument: true,
                    isBackDetected: true
                  };
                }
              } catch (backErr) {
                logger.warn(`[OCR FRONT PDF] Back page inspection notice: ${backErr?.message}`);
              }
            }

            return {
              ...pageResult,
              isCompleteDocument: true
            };
          }

          if (pageNum === 1) {
            firstPageResult = pageResult;
          }
        }

        logger.warn(`[OCR FRONT PDF] Passport front not identified across ${maxPagesToCheck} pages.`);
        return {
          ...(firstPageResult || {}),
          success: false,
          pageType: 'front',
          wrongPage: true,
          isFrontDetected: false,
          message: "We couldn't read this PDF. Please upload a clearer passport scan.",
          errors: ["We couldn't read this PDF. Please upload a clearer passport scan."],
          canContinueManually: true,
          uploadedDocument
        };
      });
    } catch (pdfErr) {
      logger.warn(`[OCR FRONT PDF Error] Failed to process PDF: ${pdfErr?.message}`);
      return {
        success: false,
        pageType: 'front',
        qualityFailed: true,
        wrongPage: false,
        isFrontDetected: false,
        message: "We couldn't read this PDF. Please upload a clearer passport scan.",
        errors: ["We couldn't read this PDF. Please upload a clearer passport scan."],
        canContinueManually: true,
        uploadedDocument,
        stages: [
          { id: 'image_checked', label: 'Image checked', status: 'warning' },
          { id: 'passport_detected', label: 'Passport detected', status: 'pending' },
          { id: 'mrz_detected', label: 'MRZ detected', status: 'pending' },
          { id: 'extracting_details', label: 'Extracting details', status: 'pending' },
          { id: 'verifying_details', label: 'Verifying information', status: 'pending' }
        ],
        extractedData: {
          fullName: userFullName || '',
          firstName: userFullName ? userFullName.split(' ')[0] : '',
          lastName: userFullName ? userFullName.split(' ').slice(1).join(' ') : '',
          passportNumber: '',
          dateOfBirth: '',
          nationality: 'Indian',
          gender: 'Male',
          issueDate: '',
          expiryDate: ''
        },
        fieldStatus: {
          fullName: userFullName ? 'HIGH' : 'MISSING',
          passportNumber: 'MISSING',
          dateOfBirth: 'MISSING',
          nationality: 'HIGH',
          gender: 'HIGH',
          issueDate: 'MISSING',
          expiryDate: 'MISSING'
        }
      };
    } finally {
      logMemoryDiagnostic('memory after PDF processing');
      if (typeof global.gc === 'function') {
        try { global.gc(); } catch { /* ignore */ }
      }
    }
  }

  /**
   * Internal helper: Extracts back passport fields from an image buffer
   */
  async _extractPassportBackFromImageBuffer({
    imageBuffer,
    frontExtractedData = {},
    uploadedDocument = null,
    startTime = Date.now()
  }) {
    // Stage 1: Quality Check
    const quality = await this.checkImageQuality(imageBuffer);
    if (!quality.ok && quality.issues.includes('INSUFFICIENT_RESOLUTION')) {
      logger.warn(`[OCR BACK Quality] Insufficient resolution: ${quality.width}x${quality.height}`);
      return {
        success: false,
        pageType: 'back',
        qualityFailed: true,
        message: 'Image quality is too low to reliably read this passport.',
        canContinueManually: true,
        uploadedDocument,
        extractedData: {
          fatherName: '',
          motherName: '',
          spouseName: '',
          address: '',
          fileNumber: ''
        }
      };
    }

    // Run OCR on back page
    let ocrText = '';
    try {
      logger.info(`[OCR BACK OCR] Running text recognition...`);
      const rawOcr = await this.recognizeText(imageBuffer);
      ocrText = rawOcr.fullText;
    } catch (err) {
      logger.warn(`[OCR BACK OCR] Back page OCR notice: ${err?.message}`);
    }

    // Soft back page detection - document is already staged to R2 storage
    const backDetection = detectPassportBack(ocrText);
    if (!backDetection.isBack) {
      logger.info(`[OCR BACK Detection] Keywords not strongly matched on back page. Staging document and allowing manual entry.`);
      return {
        success: true,
        pageType: 'back',
        wrongPage: false,
        isBackDetected: false,
        message: "We couldn't identify the required passport back/second page. You can review and enter details manually.",
        canContinueManually: true,
        uploadedDocument,
        extractedData: {
          fatherName: '',
          motherName: '',
          spouseName: '',
          address: '',
          fileNumber: ''
        },
        mergedData: frontExtractedData,
        fieldStatus: frontExtractedData.fieldStatus || {}
      };
    }

    // Extract back page details
    const backDetails = extractBackPageDetails(ocrText);

    // Consistency check against front data
    const consistency = checkPassportConsistency(frontExtractedData, backDetails);

    // Merge front and back information with source and confidence tracking
    const merged = mergePassportFrontBack({
      frontData: frontExtractedData,
      backData: backDetails,
      mrzData: null,
      userFullName: frontExtractedData.fullName || '',
      frontFieldStatus: frontExtractedData.fieldStatus || {}
    });

    if (frontExtractedData?.issueDate && !merged.extractedData?.issueDate) {
      merged.extractedData.issueDate = frontExtractedData.issueDate;
    }
    if (frontExtractedData?.passportIssuedOn && !merged.extractedData?.passportIssuedOn) {
      merged.extractedData.passportIssuedOn = frontExtractedData.passportIssuedOn;
    }

    const durationMs = Date.now() - startTime;
    logger.info(`[OCR BACK Response] Success: docDetected=true, fieldsPopulated=${Object.keys(backDetails || {}).length}, duration=${durationMs}ms`);

    return {
      success: true,
      pageType: 'back',
      isBackDetected: true,
      status: 'BACK_DETECTED',
      durationMs,
      extractedData: backDetails,
      mergedData: merged.extractedData,
      fields: merged.fields,
      fieldStatus: merged.fieldStatus,
      consistency,
      uploadedDocument,
      canContinueManually: true,
      message: 'Back side processed'
    };
  }

  /**
   * STEP 2 — BACK / SECOND PAGE PROCESSING
   * Seamlessly handles both images and PDFs
   */
  async processPassportBack({
    buffer,
    originalFilename,
    mimeType,
    frontExtractedData = {},
    previousStorageKey = null
  }) {
    const startTime = Date.now();
    logger.info(`[OCR BACK Received] originalFilename=${originalFilename || 'unknown'}, mimeType=${mimeType || 'unknown'}, size=${buffer?.length || 0} bytes`);

    // Clean up previous back file if re-uploading
    if (previousStorageKey) {
      await this.cleanupOldFile(previousStorageKey);
    }

    const isPdf = isPdfPayload(buffer, mimeType, originalFilename);

    // Store original document safely using storageService
    let uploadedDocument = null;
    try {
      logger.info(`[OCR BACK Storage] Uploading original document to storage (size: ${buffer?.length} bytes, isPdf: ${isPdf})`);
      const uploadResult = await storageService.uploadFile({
        buffer,
        originalFilename: originalFilename || (isPdf ? 'passport_back.pdf' : 'passport_back.jpg'),
        mimeType: mimeType || (isPdf ? 'application/pdf' : 'image/jpeg'),
        folder: 'documents'
      });
      uploadedDocument = {
        documentId: `doc_${Date.now()}_${Math.random().toString(36).substr(2, 6)}`,
        name: 'Passport Back Page',
        originalFilename: uploadResult.originalFilename,
        storageKey: uploadResult.storageKey,
        fileSize: uploadResult.fileSize,
        mimeType: uploadResult.mimeType
      };
      logger.info(`[OCR BACK Storage] Document staged successfully: storageKey=${uploadResult.storageKey}`);
    } catch (uploadErr) {
      logger.warn(`[OCR BACK Storage] Document staging notice: ${uploadErr?.message}`);
    }

    // Direct Image OCR flow
    if (!isPdf) {
      return await this._extractPassportBackFromImageBuffer({
        imageBuffer: buffer,
        frontExtractedData,
        uploadedDocument,
        startTime
      });
    }

    // PDF -> Image -> OCR Flow
    logMemoryDiagnostic('memory before PDF processing', `back-page, fileSize=${buffer?.length || 0} bytes`);
    try {
      return await withPdfDocument(buffer, async (pdfDoc) => {
        const totalPages = pdfDoc.length || 0;
        logger.info(`[OCR BACK PDF] Opened PDF successfully. totalPages=${totalPages}`);
        if (totalPages === 0) {
          throw new Error('PDF has 0 pages');
        }

        // Check up to 2 pages
        const maxPagesToCheck = Math.min(totalPages, 2);
        let firstPageResult = null;

        for (let pageNum = 1; pageNum <= maxPagesToCheck; pageNum++) {
          logMemoryDiagnostic('memory before page rendering', `back page ${pageNum}/${totalPages}`);
          logger.info(`[OCR BACK PDF] Rendering page ${pageNum}/${totalPages} for OCR...`);
          
          let pageImgBuffer = await pdfDoc.getPage(pageNum);
          logMemoryDiagnostic('memory after page rendering', `back page ${pageNum}/${totalPages}, size=${pageImgBuffer?.length || 0} bytes`);

          let pageResult = null;
          try {
            pageResult = await this._extractPassportBackFromImageBuffer({
              imageBuffer: pageImgBuffer,
              frontExtractedData,
              uploadedDocument,
              startTime
            });
          } finally {
            pageImgBuffer = null;
            logMemoryDiagnostic('memory after page cleanup', `back page ${pageNum}/${totalPages}`);
          }
          logMemoryDiagnostic('memory after OCR', `back page ${pageNum}/${totalPages}`);

          if (pageResult.isBackDetected) {
            logger.info(`[OCR BACK PDF] Passport back identified on PDF page ${pageNum}.`);
            return pageResult;
          }

          if (pageNum === 1) {
            firstPageResult = pageResult;
          }
        }

        // Return the first page result with soft fallback
        return firstPageResult;
      });
    } catch (pdfErr) {
      logger.warn(`[OCR BACK PDF Error] Failed to process PDF: ${pdfErr?.message}`);
      return {
        success: false,
        pageType: 'back',
        qualityFailed: true,
        message: "We couldn't read this PDF. Please upload a clearer passport scan.",
        errors: ["We couldn't read this PDF. Please upload a clearer passport scan."],
        canContinueManually: true,
        uploadedDocument,
        extractedData: {
          fatherName: '',
          motherName: '',
          spouseName: '',
          address: '',
          fileNumber: ''
        }
      };
    } finally {
      logMemoryDiagnostic('memory after PDF processing', 'back-page');
      if (typeof global.gc === 'function') {
        try { global.gc(); } catch { /* ignore */ }
      }
    }
  }

  /**
   * Unified entrypoint dispatching front or back processing
   */
  async processPassport({
    buffer,
    originalFilename,
    mimeType,
    userFullName = '',
    pageType = 'front',
    frontExtractedData = {},
    previousStorageKey = null
  }) {
    if (pageType === 'back') {
      return await this.processPassportBack({
        buffer,
        originalFilename,
        mimeType,
        frontExtractedData,
        previousStorageKey
      });
    }

    return await this.processPassportFront({
      buffer,
      originalFilename,
      mimeType,
      userFullName,
      previousStorageKey
    });
  }
}

export const passportOcrService = new PassportOcrService();
export default passportOcrService;

