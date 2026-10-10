import mongoose from 'mongoose';
import { DocumentationRequest } from '../models/DocumentationRequest.js';
import { DocumentationService } from '../models/DocumentationService.js';
import { Document } from '../models/Document.js';
import { ApiError } from '../utils/apiError.js';
import { validateName } from '../utils/nameValidator.js';
import { validateEmail } from '../utils/emailValidator.js';
import { auditService } from './audit.service.js';
import { AUDIT_ACTIONS, AUDIT_ENTITIES } from '../constants/statuses.js';
import { logger } from '../utils/logger.js';

class DocumentationRequestService {
  /**
   * Submit a new Documentation service application/request
   */
  async createRequest(data, user = null, req = null) {
    // 1. Validate applicant details
    const applicant = data.applicant || {};
    const nameCheck = validateName(applicant.name);
    if (!nameCheck.isValid) {
      throw ApiError.badRequest(nameCheck.error || 'Please provide a valid applicant name');
    }

    const emailCheck = validateEmail(applicant.email);
    if (!emailCheck.isValid) {
      throw ApiError.badRequest(emailCheck.error || 'Please provide a valid applicant email');
    }

    const rawPhone = String(applicant.phone || '').trim();
    const cleanPhone = rawPhone.replace(/\D/g, '');
    if (cleanPhone.length < 10) {
      throw ApiError.badRequest('Please provide a valid 10-digit mobile number');
    }

    // 2. Resolve documentation service
    const serviceIdentifier = data.serviceId || data.serviceSlug || data.slug;
    let service = null;
    if (serviceIdentifier) {
      if (mongoose.Types.ObjectId.isValid(serviceIdentifier)) {
        service = await DocumentationService.findById(serviceIdentifier);
      }
      if (!service) {
        service = await DocumentationService.findOne({ slug: String(serviceIdentifier).toLowerCase() });
      }
    }

    const serviceTitle = service?.title || data.serviceTitle || 'Documentation Service';
    const serviceSlug = service?.slug || data.serviceSlug || 'documentation';
    const price = service?.serviceFee || service?.totalFee || Number(data.price) || 999;

    // 3. Auto-generate unique Request ID: DOC-YYYY-XXXXX
    const year = new Date().getFullYear();
    let requestId = `DOC-${year}-${Math.floor(10000 + Math.random() * 90000)}`;
    while (await DocumentationRequest.findOne({ requestId })) {
      requestId = `DOC-${year}-${Math.floor(10000 + Math.random() * 90000)}`;
    }

    // 4. Normalize documents
    const documents = Array.isArray(data.documents)
      ? data.documents.map((d) => ({
          documentType: d.documentType || d.title || 'Required Document',
          name: d.name || d.originalFilename || 'Document',
          originalFilename: d.originalFilename || d.name || 'document.pdf',
          storageKey: d.storageKey,
          mimeType: d.mimeType || 'application/pdf',
          fileSize: Number(d.fileSize) || 0,
          status: 'PENDING'
        }))
      : [];

    // 5. Create DocumentationRequest in MongoDB
    const request = await DocumentationRequest.create({
      requestId,
      user: user?._id || user?.id || null,
      service: service?._id || null,
      serviceTitle,
      serviceSlug,
      applicant: {
        name: nameCheck.normalized,
        email: emailCheck.normalized,
        phone: rawPhone
      },
      details: data.details || {},
      documents,
      price,
      currency: 'INR',
      status: 'PENDING'
    });

    // 6. Persist Document records in MongoDB tied to Cloudflare R2 storageKeys
    for (const doc of documents) {
      if (doc.storageKey) {
        try {
          await Document.findOneAndUpdate(
            { storageKey: doc.storageKey },
            {
              serviceType: 'DOCUMENTATION',
              serviceId: service?._id || null,
              customer: user?._id || null,
              documentType: doc.documentType,
              name: doc.name,
              originalFilename: doc.originalFilename,
              storageKey: doc.storageKey,
              mimeType: doc.mimeType,
              fileSize: doc.fileSize,
              status: 'PENDING'
            },
            { upsert: true, new: true, setDefaultsOnInsert: true }
          );
        } catch (linkErr) {
          logger.warn('Documentation Document persistence notice:', linkErr?.message);
        }
      }
    }

    // 7. Audit Log
    try {
      await auditService.log({
        action: AUDIT_ACTIONS.CREATE,
        entity: AUDIT_ENTITIES.DOCUMENTATION_SERVICE || 'DOCUMENTATION_REQUEST',
        entityId: request._id,
        newValues: { requestId, serviceSlug, applicantEmail: emailCheck.normalized, docCount: documents.length },
        req
      });
    } catch {
      // non-blocking
    }

    return request;
  }

  /**
   * Fetch customer's own documentation requests
   */
  async getMyRequests(userId, email = null) {
    const query = {};
    if (userId) {
      query.$or = [{ user: userId }];
      if (email) {
        query.$or.push({ 'applicant.email': String(email).toLowerCase() });
      }
    } else if (email) {
      query['applicant.email'] = String(email).toLowerCase();
    } else {
      return [];
    }

    return DocumentationRequest.find(query).sort({ createdAt: -1 });
  }

  /**
   * Fetch single request by ID or requestId
   */
  async getRequestById(idOrRef) {
    let request = null;
    if (mongoose.Types.ObjectId.isValid(idOrRef)) {
      request = await DocumentationRequest.findById(idOrRef).populate('service');
    }
    if (!request) {
      request = await DocumentationRequest.findOne({ requestId: String(idOrRef).toUpperCase() }).populate('service');
    }
    return request;
  }

  /**
   * Fetch all requests for Admin portal
   */
  async getAllRequests({ status, query, page = 1, limit = 50 } = {}) {
    const filter = {};
    if (status) filter.status = status;
    if (query) {
      filter.$or = [
        { requestId: { $regex: query, $options: 'i' } },
        { serviceTitle: { $regex: query, $options: 'i' } },
        { 'applicant.name': { $regex: query, $options: 'i' } },
        { 'applicant.email': { $regex: query, $options: 'i' } },
        { 'applicant.phone': { $regex: query, $options: 'i' } }
      ];
    }

    const skip = (page - 1) * limit;
    const [items, total] = await Promise.all([
      DocumentationRequest.find(filter).sort({ createdAt: -1 }).skip(skip).limit(limit),
      DocumentationRequest.countDocuments(filter)
    ]);

    return {
      items,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit)
      }
    };
  }

  /**
   * Update request status & admin notes (Admin only)
   */
  async updateRequestStatus(id, { status, adminNotes }) {
    const request = await this.getRequestById(id);
    if (!request) throw ApiError.notFound(`Documentation request '${id}' not found`);

    if (status) request.status = status;
    if (adminNotes !== undefined) request.adminNotes = adminNotes;
    await request.save();

    return request;
  }
}

export const documentationRequestService = new DocumentationRequestService();
export default documentationRequestService;
