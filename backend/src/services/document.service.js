import mongoose from 'mongoose';
import { Document } from '../models/Document.js';
import { Application } from '../models/Application.js';
import { storageService } from './storage.service.js';
import { ApiError } from '../utils/apiError.js';
import { auditService } from './audit.service.js';
import { AUDIT_ACTIONS, AUDIT_ENTITIES, APPLICATION_STATUS } from '../constants/statuses.js';
import { logger } from '../utils/logger.js';

class DocumentService {
  /**
   * Uploads and links a document to an application (stored in Cloudflare R2, metadata in MongoDB)
   */
  async uploadDocument({
    applicationId,
    travellerId = '',
    documentType,
    file,
    verificationKey = '',
    currentUser = null,
    req = null
  }) {
    if (!file) throw ApiError.badRequest('File payload is missing');
    if (!applicationId) throw ApiError.badRequest('Application ID is required');

    let application = null;
    if (mongoose.Types.ObjectId.isValid(applicationId)) {
      application = await Application.findById(applicationId);
    }
    if (!application) {
      application = await Application.findOne({ referenceNumber: String(applicationId).toUpperCase() });
    }
    if (!application) throw ApiError.notFound('Application not found');

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
        // Unauthenticated request cannot upload to a registered customer's application
        throw ApiError.unauthorized('Authentication required to upload documents to this application');
      }

      // Guest application ownership verification: require phone or passport match
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

    // Validate format against configured visa requirement acceptedFormats
    if (application.visa) {
      if (!application.visa.title && mongoose.Types.ObjectId.isValid(application.visa)) {
        await application.populate('visa');
      }
      const visaDocs = application.visa?.requiredDocuments || [];
      const docTypeLower = String(documentType || '').trim().toLowerCase();
      const matchedReq = visaDocs.find((r) => {
        if (!r) return false;
        const name = typeof r === 'string' ? r : (r.title || r.name || '');
        return name.toLowerCase().includes(docTypeLower) || docTypeLower.includes(name.toLowerCase());
      });

      if (matchedReq && typeof matchedReq === 'object' && Array.isArray(matchedReq.acceptedFormats) && matchedReq.acceptedFormats.length > 0) {
        const allowedFormats = matchedReq.acceptedFormats.map((f) => String(f).toUpperCase());
        const extMatch = (file.originalname || '').match(/\.([a-zA-Z0-9]+)$/);
        const fileExt = extMatch ? extMatch[1].toUpperCase() : '';
        const isMatch = allowedFormats.some((fmt) => {
          if (fmt === fileExt) return true;
          if ((fmt === 'JPG' || fmt === 'JPEG') && (fileExt === 'JPG' || fileExt === 'JPEG')) return true;
          return false;
        });

        if (!isMatch) {
          const readable = allowedFormats.length === 1
            ? allowedFormats[0]
            : `${allowedFormats.slice(0, -1).join(', ')} or ${allowedFormats[allowedFormats.length - 1]}`;
          throw ApiError.badRequest(`Invalid file format. Please upload a ${readable} file.`);
        }
      }
    }

    // 1. Upload to Object Storage (Cloudflare R2 / S3)
    const { storageKey, originalFilename, mimeType, fileSize } = await storageService.uploadFile({
      buffer: file.buffer,
      originalFilename: file.originalname,
      mimeType: file.mimetype,
      folder: `applications/${application._id}`
    });

    // 2. Create Document record in MongoDB (Metadata only, NOT the file blob)
    const document = await Document.create({
      application: application._id,
      travellerId: travellerId || (application.travellers?.[0]?.travellerId || 'trav_1'),
      documentType: documentType || 'Passport',
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
    if (currentUser?.role !== 'ADMIN') {
      delete docJson.storageKey;
    }

    return docJson;
  }

  /**
   * List all active documents belonging to an application
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

      if (ownerId && ownerId !== currentUser._id.toString()) {
        throw ApiError.forbidden('You do not have permission to view documents for this application');
      }
    }

    const documents = await Document.find({
      application: application._id,
      isDeleted: false
    }).sort({ createdAt: 1 });

    const result = [];
    for (const doc of documents) {
      const docJson = doc.toJSON();
      try {
        docJson.signedUrl = await storageService.getSignedUrl(doc.storageKey);
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
   * Get single document metadata
   */
  async getDocumentById(documentId, currentUser = null) {
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
        throw ApiError.forbidden('You do not have permission to view this document');
      }
    }

    const docJson = document.toJSON();
    docJson.signedUrl = await storageService.getSignedUrl(document.storageKey);
    docJson.fileUrl = docJson.signedUrl;
    if (currentUser?.role !== 'ADMIN') {
      delete docJson.storageKey;
    }

    return docJson;
  }

  /**
   * Generates a temporary signed download/view URL for an authorized document
   */
  async getDocumentSignedUrl(documentId, currentUser = null) {
    if (!currentUser) {
      throw ApiError.unauthorized('Authentication required to access documents');
    }

    const document = await Document.findOne({ _id: documentId, isDeleted: false });
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

    const signedUrl = await storageService.getSignedUrl(document.storageKey);
    return {
      documentId: document._id,
      name: document.name,
      originalFilename: document.originalFilename,
      mimeType: document.mimeType,
      fileSize: document.fileSize,
      signedUrl
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
