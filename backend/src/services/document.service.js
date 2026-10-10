import mongoose from 'mongoose';
import { Document } from '../models/Document.js';
import { Application } from '../models/Application.js';
import { storageService } from './storage.service.js';
import { ApiError } from '../utils/apiError.js';
import { auditService } from './audit.service.js';
import { AUDIT_ACTIONS, AUDIT_ENTITIES, APPLICATION_STATUS } from '../constants/statuses.js';
import { logger } from '../utils/logger.js';
import { env } from '../config/environment.js';
import { validateBufferMagicBytes } from '../middleware/upload.middleware.js';

export function inferDocumentMetadataFromKey(storageKey, defaultBase = 'document') {
  const match = String(storageKey || '').match(/\.([a-zA-Z0-9]+)(?:\?.*)?$/);
  const rawExt = match ? match[1].toLowerCase() : '';
  const ext = rawExt === 'jpeg' ? 'jpg' : rawExt;

  let mimeType = 'image/jpeg';
  if (ext === 'pdf') mimeType = 'application/pdf';
  else if (ext === 'png') mimeType = 'image/png';
  else if (ext === 'webp') mimeType = 'image/webp';
  else if (ext === 'jpg') mimeType = 'image/jpeg';
  else if (ext === 'docx') mimeType = 'application/vnd.openxmlformats-officedocument.wordprocessingml.document';
  else if (ext === 'doc') mimeType = 'application/msword';
  else mimeType = 'image/jpeg';

  const cleanExt = ext || 'jpg';
  return {
    format: cleanExt.toUpperCase(),
    mimeType,
    originalFilename: `${defaultBase}.${cleanExt}`
  };
}

export function getSensibleFilename(document, application = null) {
  if (!document) return 'document';
  const name = String(document.name || document.originalFilename || document.documentType || 'document').toLowerCase();
  const docType = String(document.documentType || '').toLowerCase();
  const orig = document.originalFilename || document.name || '';
  const storageKey = document.storageKey || '';

  // Detect extension dynamically from storageKey, originalFilename, or mimeType
  let ext = '';
  const keyMatch = storageKey.match(/\.([a-zA-Z0-9]+)(?:\?.*)?$/);
  const nameMatch = orig.match(/\.([a-zA-Z0-9]+)(?:\?.*)?$/);

  if (keyMatch) {
    const raw = keyMatch[1].toLowerCase();
    ext = raw === 'jpeg' ? '.jpg' : `.${raw}`;
  } else if (nameMatch) {
    const raw = nameMatch[1].toLowerCase();
    ext = raw === 'jpeg' ? '.jpg' : `.${raw}`;
  } else if (document.mimeType) {
    const m = String(document.mimeType).toLowerCase();
    if (m.includes('pdf')) ext = '.pdf';
    else if (m.includes('png')) ext = '.png';
    else if (m.includes('webp')) ext = '.webp';
    else if (m.includes('jpeg') || m.includes('jpg')) ext = '.jpg';
    else if (m.includes('docx')) ext = '.docx';
    else if (m.includes('doc')) ext = '.doc';
  } else if (document.fileFormat || document.format) {
    const f = String(document.fileFormat || document.format).toLowerCase();
    ext = f === 'jpeg' ? '.jpg' : `.${f}`;
  }

  // Sensible fallback if unknown
  if (!ext) {
    ext = (name.includes('photo') || docType.includes('photo')) ? '.jpg' : '.jpg';
  }

  let base = 'document';
  if (name.includes('photo') || docType.includes('photo') || name.includes('portrait')) {
    base = 'passport-photo';
  } else if ((name.includes('front') && name.includes('back')) || (docType.includes('front') && docType.includes('back'))) {
    base = 'passport-front-back';
  } else if (name.includes('back') || docType.includes('back')) {
    base = 'passport-back-page';
  } else if (name.includes('front') || docType.includes('front') || name.includes('passport')) {
    base = 'passport-front-back';
  } else {
    base = name.replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '') || 'document';
  }

  return `${base}${ext}`;
}

class DocumentService {
  /**
   * Uploads and links a document to an application (stored in Cloudflare R2, metadata in MongoDB)
   */
  async uploadDocument({
    applicationId,
    travellerId = '',
    documentType,
    file,
    previousStorageKey = '',
    visaId = '',
    verificationKey = '',
    currentUser = null,
    req = null
  }) {
    if (!file || !file.buffer) throw ApiError.badRequest('File payload is missing or empty');

    // 1. Validate magic bytes to reject corrupted or renamed files
    const magicCheck = validateBufferMagicBytes(file.buffer, file.mimetype, file.originalname);
    if (!magicCheck.isValid) {
      throw ApiError.badRequest(magicCheck.error || 'Corrupted or unsupported file format. Please upload a valid PDF, JPG, PNG, or WEBP document.');
    }

    // 2. Clean up old/replaced file in R2 to avoid storage leaks
    if (previousStorageKey) {
      try {
        await storageService.deleteFile(previousStorageKey);
      } catch (cleanupErr) {
        logger.warn('Previous document cleanup notice:', cleanupErr?.message);
      }
    }

    let application = null;
    if (applicationId) {
      if (mongoose.Types.ObjectId.isValid(applicationId)) {
        application = await Application.findById(applicationId);
      }
      if (!application) {
        application = await Application.findOne({ referenceNumber: String(applicationId).toUpperCase() });
      }
    }

    // If an existing saved application is matched, apply application-level authorization and linking
    if (application) {
      if (application.isDeleted) {
        throw ApiError.badRequest('Cannot upload documents to a deleted application');
      }

      // Customer upload authorization
      if (currentUser && currentUser.role !== 'ADMIN') {
        const ownerId = application.customer?._id
          ? application.customer._id.toString()
          : application.customer?.toString();

        if (ownerId && ownerId !== currentUser._id.toString()) {
          throw ApiError.forbidden("You cannot upload documents to another customer's application");
        }

        // Check if application is in locked state
        const lockedStatuses = [
          APPLICATION_STATUS.PROCESSING,
          APPLICATION_STATUS.APPROVED,
          APPLICATION_STATUS.VISA_ISSUED,
          APPLICATION_STATUS.COMPLETED
        ];
        if (lockedStatuses.includes(application.status)) {
          throw ApiError.badRequest('Cannot upload additional documents while application is undergoing consulate processing.');
        }
      } else if (!currentUser) {
        if (application.customer) {
          throw ApiError.unauthorized('Authentication required to upload documents to this application');
        }

        // Guest application ownership verification
        const rawKey = String(verificationKey || '').trim();
        const phoneDigits = rawKey.replace(/\D/g, '');
        const cleanPassport = rawKey.toUpperCase().replace(/[^A-Z0-9]/g, '');

        let verified = false;
        const appPhoneDigits = String(application.contactDetails?.phone || '').replace(/\D/g, '');

        if (phoneDigits.length >= 10 && appPhoneDigits.length >= 10 && (phoneDigits === appPhoneDigits || appPhoneDigits.endsWith(phoneDigits) || phoneDigits.endsWith(appPhoneDigits))) {
          verified = true;
        }

        if (!verified && phoneDigits.length >= 10) {
          for (const t of application.travellers || []) {
            const tPhone = String(t.phone || '').replace(/\D/g, '');
            if (tPhone.length >= 10 && (tPhone === phoneDigits || tPhone.endsWith(phoneDigits) || phoneDigits.endsWith(tPhone))) {
              verified = true;
              break;
            }
          }
        }

        if (!verified && cleanPassport.length >= 6) {
          for (const t of application.travellers || []) {
            const tPassport = String(t.passportNumber || '').toUpperCase().replace(/[^A-Z0-9]/g, '');
            if (tPassport && tPassport === cleanPassport) {
              verified = true;
              break;
            }
          }
        }

        if (!verified) {
          throw ApiError.unauthorized('Valid verification key (phone number or passport) is required to upload documents to a guest application');
        }
      }

      // Upload to Object Storage under applications folder
      const { storageKey, originalFilename, mimeType, fileSize } = await storageService.uploadFile({
        buffer: file.buffer,
        originalFilename: file.originalname,
        mimeType: file.mimetype,
        folder: `applications/${application._id}`
      });

      // Create Document record in MongoDB
      const document = await Document.create({
        application: application._id,
        travellerId: travellerId || (application.travellers?.[0]?.travellerId || 'trav_1'),
        documentType: documentType || 'Supporting Document',
        name: originalFilename || 'Document',
        originalFilename,
        storageKey,
        mimeType,
        fileSize,
        status: 'PENDING'
      });

      await auditService.log({
        action: AUDIT_ACTIONS.CREATE,
        entity: AUDIT_ENTITIES.DOCUMENT,
        entityId: document._id,
        newValues: { applicationId: application._id, documentType, storageKey, fileSize },
        req
      });

      const signedUrl = await storageService.getSignedUrl(storageKey);
      const docJson = document.toJSON();
      docJson.signedUrl = signedUrl;
      docJson.fileUrl = signedUrl;
      docJson.storageKey = storageKey; // Retain storageKey so client can associate it

      return docJson;
    }

    // Pre-submission / draft upload flow (User is in application form before submission)
    const { storageKey, originalFilename, mimeType, fileSize } = await storageService.uploadFile({
      buffer: file.buffer,
      originalFilename: file.originalname,
      mimeType: file.mimetype,
      folder: 'documents'
    });

    const signedUrl = await storageService.getSignedUrl(storageKey);

    return {
      documentId: `doc_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`,
      storageKey,
      name: originalFilename,
      originalFilename,
      mimeType,
      fileSize,
      documentType: documentType || 'Supporting Document',
      travellerId: travellerId || 'trav_1',
      status: 'PENDING',
      signedUrl,
      fileUrl: signedUrl
    };
  }

  /**
   * List all active documents belonging to an application with verified storage mapping
   */
  async getDocumentsByApplication(applicationId, currentUser = null) {
    if (!applicationId) throw ApiError.badRequest('Application ID is required');

    let application = null;
    if (mongoose.Types.ObjectId.isValid(applicationId)) {
      application = await Application.findById(applicationId);
    }
    if (!application) {
      application = await Application.findOne({ referenceNumber: String(applicationId).toUpperCase() });
    }
    if (!application) throw ApiError.notFound('Application not found');

    if (currentUser && currentUser.role !== 'ADMIN') {
      const ownerId = application.customer?._id
        ? application.customer._id.toString()
        : application.customer?.toString();

      if (!ownerId || ownerId !== currentUser._id.toString()) {
        throw ApiError.forbidden('You do not have permission to view documents for this application');
      }
    }

    // Auto-sync / auto-link any documents from passportOcr / passportPhoto if not yet in Document collection
    const primaryTraveller = application.travellers?.[0];
    const travDocs = primaryTraveller?.docs || {};
    const frontKey = application.passportOcr?.frontStorageKey || travDocs?.passport?.frontStorageKey || (travDocs?.passport?.storageKey && !travDocs?.passport?.backStorageKey ? travDocs.passport.storageKey : null);
    const backKey = application.passportOcr?.backStorageKey || travDocs?.passport?.backStorageKey;
    const photoKey = application.passportPhoto?.storageKey || application.passportOcr?.photoStorageKey || travDocs?.passport_photo?.storageKey || travDocs?.photograph?.storageKey || travDocs?.photo?.storageKey;

    if (frontKey) {
      const exists = await Document.findOne({ application: application._id, storageKey: frontKey, isDeleted: false });
      if (!exists) {
        const meta = inferDocumentMetadataFromKey(frontKey, 'passport_front');
        await Document.create({
          application: application._id,
          travellerId: primaryTraveller?.travellerId || 'trav_1',
          documentType: 'PASSPORT_FRONT',
          name: 'Passport Front & Back Scan',
          originalFilename: meta.originalFilename,
          storageKey: frontKey,
          mimeType: meta.mimeType,
          status: 'VERIFIED'
        }).catch(() => {});
      }
    }

    if (backKey && backKey !== frontKey) {
      const exists = await Document.findOne({ application: application._id, storageKey: backKey, isDeleted: false });
      if (!exists) {
        const meta = inferDocumentMetadataFromKey(backKey, 'passport_back');
        await Document.create({
          application: application._id,
          travellerId: primaryTraveller?.travellerId || 'trav_1',
          documentType: 'PASSPORT_BACK',
          name: 'Passport Back Page',
          originalFilename: meta.originalFilename,
          storageKey: backKey,
          mimeType: meta.mimeType,
          status: 'VERIFIED'
        }).catch(() => {});
      }
    }

    if (photoKey && photoKey !== frontKey && photoKey !== backKey) {
      const exists = await Document.findOne({ application: application._id, storageKey: photoKey, isDeleted: false });
      if (!exists) {
        const meta = inferDocumentMetadataFromKey(photoKey, 'passport_photo');
        await Document.create({
          application: application._id,
          travellerId: primaryTraveller?.travellerId || 'trav_1',
          documentType: 'PASSPORT_PHOTO',
          name: 'Passport Size Photo',
          originalFilename: application.passportPhoto?.originalFilename || meta.originalFilename,
          storageKey: photoKey,
          mimeType: application.passportPhoto?.mimeType || meta.mimeType,
          status: 'VERIFIED'
        }).catch(() => {});
      }
    }

    const documents = await Document.find({
      application: application._id,
      isDeleted: false
    }).sort({ createdAt: 1 });

    const result = [];
    for (const doc of documents) {
      const docJson = doc.toJSON ? doc.toJSON() : { ...doc };
      docJson.id = doc._id.toString();
      docJson.documentId = doc._id.toString();
      docJson.applicationId = application.referenceNumber || application._id.toString();
      docJson.downloadFilename = getSensibleFilename(doc, application);

      const storageKey = doc.storageKey || '';
      const orig = doc.originalFilename || doc.name || '';
      const keyMatch = storageKey.match(/\.([a-zA-Z0-9]+)(?:\?.*)?$/);
      const nameMatch = orig.match(/\.([a-zA-Z0-9]+)(?:\?.*)?$/);
      const detectedExt = (keyMatch ? keyMatch[1] : (nameMatch ? nameMatch[1] : '')).toUpperCase();

      let detectedFormat = '';
      if (detectedExt === 'JPG' || detectedExt === 'JPEG') detectedFormat = 'JPG';
      else if (detectedExt === 'PNG') detectedFormat = 'PNG';
      else if (detectedExt === 'WEBP') detectedFormat = 'WEBP';
      else if (detectedExt === 'PDF') detectedFormat = 'PDF';
      else if (detectedExt === 'DOC' || detectedExt === 'DOCX') detectedFormat = detectedExt;
      else if (doc.mimeType?.includes('png')) detectedFormat = 'PNG';
      else if (doc.mimeType?.includes('webp')) detectedFormat = 'WEBP';
      else if (doc.mimeType?.includes('jpeg') || doc.mimeType?.includes('jpg')) detectedFormat = 'JPG';
      else if (doc.mimeType?.includes('pdf')) detectedFormat = 'PDF';
      else detectedFormat = detectedExt || docJson.format || '';

      docJson.format = detectedFormat;
      docJson.fileFormat = detectedFormat;

      let effectiveMime = doc.mimeType;
      if (!effectiveMime || effectiveMime === 'application/octet-stream') {
        if (detectedFormat === 'JPG') effectiveMime = 'image/jpeg';
        else if (detectedFormat === 'PNG') effectiveMime = 'image/png';
        else if (detectedFormat === 'WEBP') effectiveMime = 'image/webp';
        else if (detectedFormat === 'PDF') effectiveMime = 'application/pdf';
      }
      docJson.mimeType = effectiveMime;

      try {
        docJson.signedUrl = await storageService.getSignedUrl(doc.storageKey, env.SIGNED_URL_EXPIRY_SECONDS, {
          responseContentDisposition: 'inline',
          responseContentType: effectiveMime
        });
        docJson.fileUrl = docJson.signedUrl;
      } catch (err) {
        logger.warn(`Could not generate signed URL for document ${doc._id}:`, { error: err.message });
        docJson.signedUrl = '';
        docJson.fileUrl = '';
      }
      if (currentUser?.role !== 'ADMIN') {
        delete docJson.storageKey;
      }
      result.push(docJson);
    }

    return result;
  }

  /**
   * Find a specific document belonging to an application
   */
  async getDocumentForApplication(applicationId, docId, currentUser = null) {
    if (!currentUser) throw ApiError.unauthorized('Authentication required to access document');
    if (!applicationId) throw ApiError.badRequest('Application ID is required');
    if (!docId) throw ApiError.badRequest('Document ID is required');

    let application = null;
    if (mongoose.Types.ObjectId.isValid(applicationId)) {
      application = await Application.findById(applicationId);
    }
    if (!application) {
      application = await Application.findOne({ referenceNumber: String(applicationId).toUpperCase() });
    }
    if (!application) throw ApiError.notFound('Application not found');

    if (currentUser.role !== 'ADMIN') {
      const ownerId = application.customer?._id
        ? application.customer._id.toString()
        : application.customer?.toString();
      if (!ownerId || ownerId !== currentUser._id.toString()) {
        throw ApiError.forbidden('You do not have permission to view documents for this application');
      }
    }

    let document = null;
    if (mongoose.Types.ObjectId.isValid(docId)) {
      document = await Document.findOne({ _id: docId, application: application._id, isDeleted: false });
    }
    if (!document) {
      document = await Document.findOne({ storageKey: docId, application: application._id, isDeleted: false });
    }

    const cleanDocId = String(docId).toLowerCase();
    if (!document) {
      if (cleanDocId.includes('front') || cleanDocId === 'passport_scan' || cleanDocId === 'doc_1') {
        document = await Document.findOne({ application: application._id, documentType: 'PASSPORT_FRONT', isDeleted: false });
      } else if (cleanDocId.includes('back')) {
        document = await Document.findOne({ application: application._id, documentType: 'PASSPORT_BACK', isDeleted: false });
      } else if (cleanDocId.includes('photo')) {
        document = await Document.findOne({ application: application._id, documentType: 'PASSPORT_PHOTO', isDeleted: false });
      }
    }

    // Direct fallback from application data if Document model was missing
    if (!document) {
      const travDocs = application.travellers?.[0]?.docs || {};
      if (cleanDocId.includes('front') || cleanDocId === 'passport_scan' || cleanDocId === 'doc_1' || cleanDocId === 'passport') {
        const key = application.passportOcr?.frontStorageKey || travDocs?.passport?.frontStorageKey || travDocs?.passport?.storageKey;
        if (key) {
          const meta = inferDocumentMetadataFromKey(key, 'passport_front');
          document = {
            _id: 'passport_front',
            name: 'Passport Front & Back Scan',
            documentType: 'PASSPORT_FRONT',
            originalFilename: meta.originalFilename,
            storageKey: key,
            mimeType: meta.mimeType,
            format: meta.format,
            fileFormat: meta.format,
            application: application._id
          };
        }
      } else if (cleanDocId.includes('back')) {
        const key = application.passportOcr?.backStorageKey || travDocs?.passport?.backStorageKey;
        if (key) {
          const meta = inferDocumentMetadataFromKey(key, 'passport_back');
          document = {
            _id: 'passport_back',
            name: 'Passport Back Page',
            documentType: 'PASSPORT_BACK',
            originalFilename: meta.originalFilename,
            storageKey: key,
            mimeType: meta.mimeType,
            format: meta.format,
            fileFormat: meta.format,
            application: application._id
          };
        }
      } else if (cleanDocId.includes('photo')) {
        const key = application.passportPhoto?.storageKey || application.passportOcr?.photoStorageKey || travDocs?.passport_photo?.storageKey || travDocs?.photo?.storageKey;
        if (key) {
          const meta = inferDocumentMetadataFromKey(key, 'passport_photo');
          document = {
            _id: 'passport_photo',
            name: 'Passport Size Photo',
            documentType: 'PASSPORT_PHOTO',
            originalFilename: application.passportPhoto?.originalFilename || meta.originalFilename,
            storageKey: key,
            mimeType: application.passportPhoto?.mimeType || meta.mimeType,
            format: meta.format,
            fileFormat: meta.format,
            application: application._id
          };
        }
      }
    }

    if (!document || !document.storageKey) {
      throw ApiError.notFound('Document not found in this application');
    }

    return { document, application };
  }

  /**
   * Get single document metadata
   */
  async getDocumentById(documentId, currentUser = null) {
    if (!documentId) throw ApiError.badRequest('Document ID is required');

    let document = null;
    if (mongoose.Types.ObjectId.isValid(documentId)) {
      document = await Document.findOne({ _id: documentId, isDeleted: false });
    }
    if (!document) {
      document = await Document.findOne({ storageKey: documentId, isDeleted: false });
    }
    if (!document) throw ApiError.notFound('Document not found');

    const application = await Application.findById(document.application);
    if (!application) throw ApiError.notFound('Application associated with document not found');

    if (currentUser && currentUser.role !== 'ADMIN') {
      const ownerId = application.customer?._id
        ? application.customer._id.toString()
        : application.customer?.toString();

      if (!ownerId || ownerId !== currentUser._id.toString()) {
        throw ApiError.forbidden('You do not have permission to view this document');
      }
    }

    const docJson = document.toJSON();
    docJson.id = document._id.toString();
    docJson.documentId = document._id.toString();
    docJson.downloadFilename = getSensibleFilename(document, application);

    const orig = document.originalFilename || document.name || '';
    const extMatch = orig.match(/\.([a-zA-Z0-9]+)$/);
    const isPdf = document.mimeType?.includes('pdf') || extMatch?.[1]?.toLowerCase() === 'pdf';
    docJson.format = isPdf ? 'PDF' : (extMatch ? extMatch[1].toUpperCase() : 'JPG');
    docJson.fileFormat = docJson.format;

    docJson.signedUrl = await storageService.getSignedUrl(document.storageKey, env.SIGNED_URL_EXPIRY_SECONDS, {
      responseContentDisposition: 'inline',
      responseContentType: document.mimeType || 'image/jpeg'
    });
    docJson.fileUrl = docJson.signedUrl;
    if (currentUser?.role !== 'ADMIN') {
      delete docJson.storageKey;
    }

    return docJson;
  }

  /**
   * Generates a temporary signed download/view URL for an authorized document
   */
  async getDocumentSignedUrl(documentId, currentUser = null, options = {}) {
    if (!currentUser) {
      throw ApiError.unauthorized('Authentication required to access documents');
    }

    let document = null;
    if (mongoose.Types.ObjectId.isValid(documentId)) {
      document = await Document.findOne({ _id: documentId, isDeleted: false });
    }
    if (!document) {
      document = await Document.findOne({ storageKey: documentId, isDeleted: false });
    }
    if (!document) {
      throw ApiError.notFound('Document not found');
    }

    const application = await Application.findById(document.application);
    if (!application) {
      throw ApiError.notFound('Application associated with document not found');
    }

    if (currentUser.role !== 'ADMIN') {
      const ownerId = application.customer?._id
        ? application.customer._id.toString()
        : application.customer?.toString();

      if (!ownerId || ownerId !== currentUser._id.toString()) {
        throw ApiError.forbidden('You do not have permission to view documents for this application');
      }
    }

    const mode = options.mode || (options.download ? 'download' : 'preview');
    const sensibleFilename = getSensibleFilename(document, application);
    const disposition = mode === 'download'
      ? `attachment; filename="${sensibleFilename}"`
      : 'inline';

    const signedUrl = await storageService.getSignedUrl(document.storageKey, env.SIGNED_URL_EXPIRY_SECONDS, {
      responseContentDisposition: disposition,
      responseContentType: document.mimeType || 'image/jpeg'
    });

    return {
      documentId: document._id ? document._id.toString() : documentId,
      id: document._id ? document._id.toString() : documentId,
      name: document.name,
      documentType: document.documentType,
      originalFilename: document.originalFilename,
      downloadFilename: sensibleFilename,
      mimeType: document.mimeType,
      fileSize: document.fileSize,
      signedUrl,
      fileUrl: signedUrl
    };
  }

  /**
   * Delete a document from Cloudflare R2 and MongoDB
   */
  async deleteDocument(documentId, currentUser = null, req = null) {
    if (!documentId) throw ApiError.badRequest('Document ID is required');

    const document = await Document.findOne({ _id: documentId, isDeleted: false });
    if (!document) throw ApiError.notFound('Document not found');

    const application = await Application.findById(document.application);
    if (!application) throw ApiError.notFound('Application associated with document not found');

    if (currentUser && currentUser.role !== 'ADMIN') {
      const ownerId = application.customer?._id
        ? application.customer._id.toString()
        : application.customer?.toString();

      if (!ownerId || ownerId !== currentUser._id.toString()) {
        throw ApiError.forbidden('You do not have permission to delete this document');
      }

      // Restrict deletion if application has progressed into consulate processing
      const lockedStatuses = [
        APPLICATION_STATUS.PROCESSING,
        APPLICATION_STATUS.APPROVED,
        APPLICATION_STATUS.VISA_ISSUED,
        APPLICATION_STATUS.COMPLETED
      ];
      if (lockedStatuses.includes(application.status)) {
        throw ApiError.badRequest('Documents cannot be deleted after application has entered consulate processing.');
      }
    }

    // Delete file from Cloudflare R2 / S3
    try {
      await storageService.deleteFile(document.storageKey);
    } catch (err) {
      logger.warn(`Failed to delete object from storage: ${document.storageKey}`, { error: err.message });
    }

    // Mark soft-deleted in MongoDB
    document.isDeleted = true;
    await document.save();

    await auditService.log({
      action: AUDIT_ACTIONS.DELETE,
      entity: AUDIT_ENTITIES.DOCUMENT,
      entityId: document._id,
      newValues: { applicationId: application._id, storageKey: document.storageKey },
      req
    });

    return { deleted: true, documentId: document._id };
  }

  /**
   * Update document verification status (Admin only)
   */
  async updateDocumentStatus(documentId, { status, rejectionReason = '', note = '' }, req = null) {
    const document = await Document.findById(documentId);
    if (!document || document.isDeleted) throw ApiError.notFound('Document not found');

    const previous = document.toJSON();

    document.status = status;
    document.rejectionReason = rejectionReason;
    document.note = note;
    document.verifiedAt = new Date();
    document.verifiedBy = req?.user?._id;
    await document.save();

    await auditService.log({
      action: status === 'VERIFIED' ? AUDIT_ACTIONS.DOCUMENT_VERIFY : AUDIT_ACTIONS.DOCUMENT_REJECT,
      entity: AUDIT_ENTITIES.DOCUMENT,
      entityId: document._id,
      previousValues: previous,
      newValues: document.toJSON(),
      req
    });

    return document;
  }
}

export const documentService = new DocumentService();
export default documentService;
