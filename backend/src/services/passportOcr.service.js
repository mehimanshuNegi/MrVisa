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

class PassportOcrService {
  constructor() {
    this.engine = null;
    this.engineInitializing = null;
    this.engineInitError = null;
    this.lastOcrError = null;
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
    const startTime = Date.now();
    try {
      const engine = await this.getEngine();
      let inputBuffer = buffer;
      const meta = await sharp(buffer).metadata();
      if (!['jpeg', 'png', 'webp'].includes(meta.format)) {
        inputBuffer = await sharp(buffer).png().toBuffer();
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
    }
  }

  /**
   * STEP 1 — FRONT / PHOTO PAGE PROCESSING
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

    const stages = [
      { id: 'image_checked', label: 'Image checked', status: 'pending' },
      { id: 'passport_detected', label: 'Passport detected', status: 'pending' },
      { id: 'mrz_detected', label: 'MRZ detected', status: 'pending' },
      { id: 'extracting_details', label: 'Extracting details', status: 'pending' },
      { id: 'verifying_details', label: 'Verifying information', status: 'pending' }
    ];

    // Stage 1: Quality Check
    const quality = await this.checkImageQuality(buffer);
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
        }
      };
    }

    // Clean up previous front file if re-uploading (Requirement 8)
    if (previousStorageKey) {
      await this.cleanupOldFile(previousStorageKey);
    }

    // Store document safely using storageService
    let uploadedDocument = null;
    try {
      logger.info(`[OCR FRONT R2] Uploading document to staging storage (size: ${buffer?.length} bytes)`);
      const uploadResult = await storageService.uploadFile({
        buffer,
        originalFilename: originalFilename || 'passport_front.jpg',
        mimeType: mimeType || 'image/jpeg',
        folder: 'documents'
      });
      uploadedDocument = {
        documentId: `doc_${Date.now()}_${Math.random().toString(36).substr(2, 6)}`,
        name: 'Passport Front Page',
        originalFilename: uploadResult.originalFilename,
        storageKey: uploadResult.storageKey,
        fileSize: uploadResult.fileSize,
        mimeType: uploadResult.mimeType
      };
      logger.info(`[OCR FRONT R2] Document staged successfully: storageKey=${uploadResult.storageKey}`);
    } catch (uploadErr) {
      logger.warn(`[OCR FRONT R2] Document staging notice: ${uploadErr?.message}`);
    }

    // Stage 2 & 3: Run OCR
    let ocrText = '';
    let mrzLines = [];
    let parsedMrz = null;

    // ATTEMPT 1: Raw image OCR
    try {
      const rawOcr = await this.recognizeText(buffer);
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
      try {
        logger.info(`[OCR FRONT Preprocessing] Running image enhancements (EXIF, resize, grayscale, normalize)...`);
        const preprocessedBuffer = await this.preprocessImage(buffer);
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

        if (!parsedMrz) {
          logger.info(`[OCR FRONT MRZ Crop] Attempting dedicated bottom MRZ crop band...`);
          const croppedMrz = await this.cropMrzBand(buffer);
          if (croppedMrz) {
            const cropOcr = await this.recognizeText(croppedMrz);
            const cropLines = extractMrzLinesFromText(cropOcr.fullText);
            if (cropLines.length >= 2) {
              parsedMrz = parseTd3Mrz(cropLines[0], cropLines[1]);
              mrzLines = cropLines;
            }
          }
        }
      } catch (err2) {
        logger.warn(`[OCR FRONT Attempt 2] Preprocessed OCR notice: ${err2?.message}`);
      }
    }

    logger.info(`[OCR FRONT MRZ Parsing] linesExtracted=${mrzLines.length}, mrzParsed=${!!parsedMrz}, validDocCheck=${!!parsedMrz?.checks?.docNumber}`);

    // Wrong page detection (Requirement 7)
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
    const vizFields = extractVizFieldsFromText(ocrText);
    const detectedIssueDate = vizFields.issueDate || extractIssueDateFromText(ocrText);
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
    if (detectedIssueDate) {
      fieldStatus.issueDate = 'HIGH';
      fieldStatus.passportIssuedOn = 'HIGH';
    }
    if (detectedPlaceOfIssue) {
      fieldStatus.placeOfIssue = 'HIGH';
    }

    // Check visible passport number vs MRZ passport number (Requirement 5.C)
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
      }
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
   * STEP 2 — BACK / SECOND PAGE PROCESSING
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

    // Stage 1: Quality Check
    const quality = await this.checkImageQuality(buffer);
    if (!quality.ok && quality.issues.includes('INSUFFICIENT_RESOLUTION')) {
      logger.warn(`[OCR BACK Quality] Insufficient resolution: ${quality.width}x${quality.height}`);
      return {
        success: false,
        pageType: 'back',
        qualityFailed: true,
        message: 'Image quality is too low to reliably read this passport.',
        canContinueManually: true,
        extractedData: {
          fatherName: '',
          motherName: '',
          spouseName: '',
          address: '',
          fileNumber: ''
        }
      };
    }

    // Clean up previous back file if re-uploading (Requirement 8)
    if (previousStorageKey) {
      await this.cleanupOldFile(previousStorageKey);
    }

    // Store document safely using storageService
    let uploadedDocument = null;
    try {
      logger.info(`[OCR BACK R2] Uploading document to staging storage (size: ${buffer?.length} bytes)`);
      const uploadResult = await storageService.uploadFile({
        buffer,
        originalFilename: originalFilename || 'passport_back.jpg',
        mimeType: mimeType || 'image/jpeg',
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
      logger.info(`[OCR BACK R2] Document staged successfully: storageKey=${uploadResult.storageKey}`);
    } catch (uploadErr) {
      logger.warn(`[OCR BACK R2] Document staging notice: ${uploadErr?.message}`);
    }

    // Run OCR on back page
    let ocrText = '';
    try {
      logger.info(`[OCR BACK OCR] Running text recognition...`);
      const rawOcr = await this.recognizeText(buffer);
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
        message: "Back side processed. You can review and enter details manually.",
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

    // Consistency check against front data (Requirements 1, 2, 5)
    // ONLY compare passportNumber if a verified, valid passport number is present on the back.
    // Never compare arbitrary OCR text or old passport numbers!
    const consistency = checkPassportConsistency(frontExtractedData, backDetails);

    // Merge front and back information with source and confidence tracking
    const merged = mergePassportFrontBack({
      frontData: frontExtractedData,
      backData: backDetails,
      mrzData: null,
      userFullName: frontExtractedData.fullName || '',
      frontFieldStatus: frontExtractedData.fieldStatus || {}
    });

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

