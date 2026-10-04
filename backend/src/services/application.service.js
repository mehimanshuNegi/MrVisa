import mongoose from 'mongoose';
import { Application } from '../models/Application.js';
import { Visa } from '../models/Visa.js';
import { Country } from '../models/Country.js';
import { Document } from '../models/Document.js';
import { Feedback } from '../models/Feedback.js';
import { ApiError } from '../utils/apiError.js';
import { APPLICATION_STATUS, REQUIRED_ACTION, PAYMENT_STATUS, AUDIT_ACTIONS, AUDIT_ENTITIES } from '../constants/statuses.js';
import { auditService } from './audit.service.js';
import { escapeRegex } from '../utils/sanitize.js';
import { ROLES } from '../constants/roles.js';
import { validatePassportDates } from '../utils/dateValidator.js';
import { storageService } from './storage.service.js';
import { inferDocumentMetadataFromKey } from './document.service.js';
import { logger } from '../utils/logger.js';

/**
 * Helper to match a required document rule from the Visa configuration against uploaded documents
 */
function isDocumentFulfilled(reqDoc, uploadedDocs) {
  const reqLower = String(reqDoc || '').toLowerCase().trim();
  if (!reqLower) return true;

  return uploadedDocs.some((doc) => {
    const typeLower = String(doc.documentType || '').toLowerCase().trim();
    const nameLower = String(doc.name || '').toLowerCase().trim();
    const origLower = String(doc.originalFilename || '').toLowerCase().trim();

    // 1. Exact or mutual containment match
    if (typeLower === reqLower || nameLower === reqLower) return true;
    if (typeLower && reqLower.includes(typeLower)) return true;
    if (reqLower && typeLower.includes(reqLower)) return true;

    // 2. Photographs / Photos
    if (
      (reqLower.includes('photo') || reqLower.includes('photograph')) &&
      (typeLower.includes('photo') || typeLower.includes('photograph') || origLower.includes('photo'))
    ) {
      return true;
    }

    // 3. Passports / Scans
    if (
      reqLower.includes('passport') &&
      (typeLower.includes('passport') || origLower.includes('passport'))
    ) {
      return true;
    }

    // 4. Financial proof / Bank statements / Income tax
    if (
      (reqLower.includes('fund') || reqLower.includes('bank') || reqLower.includes('tax') || reqLower.includes('statement') || reqLower.includes('investment')) &&
      (typeLower.includes('fund') || typeLower.includes('bank') || typeLower.includes('tax') || typeLower.includes('statement') || typeLower.includes('investment') || typeLower.includes('financial'))
    ) {
      return true;
    }

    // 5. Cover letter
    if (
      (reqLower.includes('cover') || reqLower.includes('letter')) &&
      (typeLower.includes('cover') || typeLower.includes('letter'))
    ) {
      return true;
    }

    // 6. Travel details / tickets / itinerary
    if (
      (reqLower.includes('travel') || reqLower.includes('ticket') || reqLower.includes('flight') || reqLower.includes('itinerary')) &&
      (typeLower.includes('travel') || typeLower.includes('ticket') || typeLower.includes('flight') || typeLower.includes('itinerary'))
    ) {
      return true;
    }

    return false;
  });
}

class ApplicationService {
  /**
   * Generates a unique human-friendly application reference number (e.g. MV-482910)
   */
  async _generateUniqueReference() {
    let reference = '';
    let exists = true;
    while (exists) {
      const randomSixDigits = Math.floor(100000 + Math.random() * 900000);
      reference = `MV-${randomSixDigits}`;
      const found = await Application.findOne({ referenceNumber: reference });
      if (!found) exists = false;
    }
    return reference;
  }

  /**
   * Submit or draft a new visa application
   * Calculates payable amount and permanently freezes pricing snapshot from database
   */
  async createApplication(data, customerUser = null, req = null) {
    // 1. Resolve Visa from DB
    const visaIdentifier = data.visaId || data.countryId || data.visa;
    if (!visaIdentifier) throw ApiError.badRequest('Visa reference is required');

    let visa = null;
    if (mongoose.Types.ObjectId.isValid(visaIdentifier)) {
      visa = await Visa.findOne({ _id: visaIdentifier, isDeleted: false }).populate('country');
    }
    if (!visa) {
      const safeId = escapeRegex(String(visaIdentifier));
      visa = await Visa.findOne({
        $or: [
          { slug: String(visaIdentifier).toLowerCase() },
          { displayName: { $regex: new RegExp(`^${safeId}$`, 'i') } }
        ],
        isDeleted: false
      }).populate('country');
    }

    if (!visa || !visa.isActive || visa.isDeleted) {
      throw ApiError.badRequest(`Visa product '${visaIdentifier}' is inactive or does not exist`);
    }

    const country = visa.country;
    if (!country || !country.isActive || country.isDeleted) {
      throw ApiError.badRequest('Destination country for this visa is inactive or does not exist');
    }

    // 2. Validate travellers list
    const travellers = Array.isArray(data.travellers) && data.travellers.length > 0
      ? data.travellers.map((t, idx) => ({
          travellerId: t.travellerId || `trav_${idx + 1}`,
          name: t.name || `${t.firstName || ''} ${t.lastName || ''}`.trim() || 'Applicant',
          firstName: t.firstName || (t.name ? t.name.split(' ')[0] : ''),
          lastName: t.lastName || (t.name ? t.name.split(' ').slice(1).join(' ') : ''),
          email: t.email || data.applicantEmail || customerUser?.email || '',
          phone: t.phone || data.applicantPhone || customerUser?.phone || '',
          passportNumber: t.passportNumber || '',
          placeOfIssue: t.placeOfIssue || '',
          issueDate: t.issueDate || '',
          expiryDate: t.expiryDate || '',
          nationality: t.nationality || 'Indian',
          dob: t.dob || '',
          gender: t.gender || 'Male'
        }))
      : [
          {
            travellerId: 'trav_1',
            name: data.applicantName || customerUser?.name || 'Applicant',
            firstName: customerUser?.firstName || '',
            lastName: customerUser?.lastName || '',
            email: data.applicantEmail || customerUser?.email || '',
            phone: data.applicantPhone || customerUser?.phone || '',
            passportNumber: data.passportNumber || '',
            placeOfIssue: data.placeOfIssue || '',
            issueDate: data.issueDate || '',
            expiryDate: data.expiryDate || '',
            nationality: data.nationality || 'Indian',
            dob: data.dob || '',
            gender: data.gender || 'Male'
          }
        ];

    // 2.5 Strict 10-Year Passport Date Validation for Travellers
    for (const [idx, t] of travellers.entries()) {
      if (t.issueDate && t.expiryDate) {
        const dateCheck = validatePassportDates(t.issueDate, t.expiryDate);
        if (!dateCheck.isValid) {
          throw ApiError.badRequest(dateCheck.error);
        }
      }
    }

    const additionalInformation = typeof data.additionalInformation === 'string'
      ? data.additionalInformation.trim()
      : '';

    const previousVisaRefusal = Boolean(data.previousVisaRefusal);
    const previousVisaRefusalCountry = data.previousVisaRefusalCountry
      ? String(data.previousVisaRefusalCountry).trim()
      : (country.name || '');
    const previousVisaRefusalReason = typeof data.previousVisaRefusalReason === 'string'
      ? data.previousVisaRefusalReason.trim()
      : '';

    if (previousVisaRefusal && !previousVisaRefusalReason) {
      throw ApiError.badRequest('Please explain the reason for your previous visa refusal.');
    }

    const travellerCount = travellers.length;

    // 3. SECURE BACKEND PRICING CALCULATION (Permanent Snapshot)
    const governmentFee = visa.governmentFee || 0;
    const serviceFee = visa.serviceFee || 0;
    const totalAmountPerPerson = governmentFee + serviceFee;
    const totalAmount = totalAmountPerPerson * travellerCount;
    const currency = visa.currency || 'INR';

    const pricingSnapshot = {
      governmentFee,
      serviceFee,
      totalAmountPerPerson,
      travellerCount,
      totalAmount,
      currency
    };

    // 4. Generate unique application reference
    const referenceNumber = await this._generateUniqueReference();

    // Determine initial status: allow client to specify DRAFT or default to APPLICATION_RECEIVED
    const initialStatus = data.status === APPLICATION_STATUS.DRAFT
      ? APPLICATION_STATUS.DRAFT
      : APPLICATION_STATUS.APPLICATION_RECEIVED;

    // 5. Create Application record
    const application = await Application.create({
      referenceNumber,
      customer: customerUser ? customerUser._id : null,
      visa: visa._id,
      country: country._id,
      pricingSnapshot,
      travellers,
      additionalInformation,
      previousVisaRefusal,
      previousVisaRefusalCountry,
      previousVisaRefusalReason,
      status: initialStatus,
      requiredAction: REQUIRED_ACTION.NONE,
      paymentStatus: PAYMENT_STATUS.PENDING,
      adminMessage: initialStatus === APPLICATION_STATUS.DRAFT
        ? 'Application draft saved.'
        : 'Application received and securely registered with consulate queue.',
      expectedCompletionDate: visa.guaranteedDate || '',
      timeline: [
        { stage: 'Application Submitted', completed: initialStatus !== APPLICATION_STATUS.DRAFT, current: initialStatus === APPLICATION_STATUS.DRAFT, timestamp: new Date().toISOString() },
        { stage: 'Documents Verified', completed: false, current: initialStatus !== APPLICATION_STATUS.DRAFT, timestamp: '' },
        { stage: 'Application Processing', completed: false, current: false, timestamp: '' },
        { stage: 'Visa Issued', completed: false, current: false, timestamp: '' }
      ],
      passportOcr: data.passportOcr || {},
      passportPhoto: data.passportPhoto || {}
    });

    // 6. Link distinct passport and photo documents from application flow
    const primaryTraveller = travellers[0];
    const travDocs = primaryTraveller?.docs || {};

    const frontKey = data.passportOcr?.frontStorageKey || travDocs?.passport?.frontStorageKey || (travDocs?.passport?.storageKey && !travDocs?.passport?.backStorageKey ? travDocs.passport.storageKey : null);
    if (frontKey) {
      const meta = inferDocumentMetadataFromKey(frontKey, 'passport_front');
      await Document.findOneAndUpdate(
        { application: application._id, storageKey: frontKey },
        {
          application: application._id,
          travellerId: primaryTraveller?.travellerId || 'trav_1',
          documentType: 'PASSPORT_FRONT',
          name: 'Passport Front & Back Scan',
          originalFilename: meta.originalFilename,
          storageKey: frontKey,
          mimeType: meta.mimeType,
          status: 'VERIFIED'
        },
        { upsert: true, new: true, setDefaultsOnInsert: true }
      ).catch(() => {});
    }

    const backKey = data.passportOcr?.backStorageKey || travDocs?.passport?.backStorageKey;
    if (backKey && backKey !== frontKey) {
      const meta = inferDocumentMetadataFromKey(backKey, 'passport_back');
      await Document.findOneAndUpdate(
        { application: application._id, storageKey: backKey },
        {
          application: application._id,
          travellerId: primaryTraveller?.travellerId || 'trav_1',
          documentType: 'PASSPORT_BACK',
          name: 'Passport Back Page',
          originalFilename: meta.originalFilename,
          storageKey: backKey,
          mimeType: meta.mimeType,
          status: 'VERIFIED'
        },
        { upsert: true, new: true, setDefaultsOnInsert: true }
      ).catch(() => {});
    }

    const photoKey = data.passportPhoto?.storageKey || data.passportOcr?.photoStorageKey || travDocs?.passport_photo?.storageKey || travDocs?.photograph?.storageKey || travDocs?.photo?.storageKey;
    if (photoKey && photoKey !== frontKey && photoKey !== backKey) {
      const meta = inferDocumentMetadataFromKey(photoKey, 'passport_photo');
      await Document.findOneAndUpdate(
        { application: application._id, storageKey: photoKey },
        {
          application: application._id,
          travellerId: primaryTraveller?.travellerId || 'trav_1',
          documentType: 'PASSPORT_PHOTO',
          name: 'Passport Size Photo',
          originalFilename: data.passportPhoto?.originalFilename || meta.originalFilename,
          storageKey: photoKey,
          mimeType: data.passportPhoto?.mimeType || meta.mimeType,
          status: 'VERIFIED'
        },
        { upsert: true, new: true, setDefaultsOnInsert: true }
      ).catch(() => {});
    }

    // 6.1 Link any additional customer uploaded documents (e.g. Flight, Accommodation, Financials)
    if (Array.isArray(data.documents) && data.documents.length > 0) {
      for (const [idx, doc] of data.documents.entries()) {
        const docKey = doc.storageKey;
        // Skip if this doc is already linked as front, back, or photo
        if (docKey && (docKey === frontKey || docKey === backKey || docKey === photoKey)) {
          continue;
        }
        if (docKey) {
          const meta = inferDocumentMetadataFromKey(docKey, `document_${idx + 1}`);
          await Document.findOneAndUpdate(
            { application: application._id, storageKey: docKey },
            {
              application: application._id,
              travellerId: doc.travellerId || (travellers[0]?.travellerId || 'trav_1'),
              documentType: doc.documentType || doc.name || `Document ${idx + 1}`,
              name: doc.name || doc.documentType || `Document ${idx + 1}`,
              originalFilename: doc.originalFilename || doc.name || meta.originalFilename,
              storageKey: docKey,
              mimeType: doc.mimeType || meta.mimeType,
              status: doc.status === 'Verified' ? 'VERIFIED' : 'PENDING'
            },
            { upsert: true, new: true, setDefaultsOnInsert: true }
          ).catch(() => {});
        }
      }
    }

    await auditService.log({
      actor: customerUser ? customerUser._id : null,
      actorEmail: customerUser ? customerUser.email : 'guest',
      action: AUDIT_ACTIONS.CREATE,
      entity: AUDIT_ENTITIES.APPLICATION,
      entityId: application._id,
      newValues: { referenceNumber, pricingSnapshot, travellerCount, status: initialStatus },
      req
    });

    return this.getApplicationById(application._id);
  }

  /**
   * Fetch applications with search, status filtering, and pagination
   */
  async getApplications({
    customerId = null,
    query = '',
    status = 'ALL',
    page = 1,
    limit = 20,
    includeDeleted = false
  } = {}) {
    const filter = {};
    if (!includeDeleted) filter.isDeleted = false;
    if (customerId) filter.customer = customerId;

    if (status && status !== 'ALL' && status !== 'All') {
      filter.status = status;
    }

    if (query) {
      const q = escapeRegex(query.trim());
      filter.$or = [
        { referenceNumber: { $regex: q, $options: 'i' } },
        { 'travellers.name': { $regex: q, $options: 'i' } },
        { 'travellers.email': { $regex: q, $options: 'i' } },
        { 'travellers.passportNumber': { $regex: q, $options: 'i' } }
      ];
    }

    const skip = (Math.max(1, page) - 1) * limit;

    const [applications, total] = await Promise.all([
      Application.find(filter)
        .populate('visa', 'title displayName visaType stayPeriod validity entryType processingTime requiredDocuments')
        .populate('country', 'name displayName slug code flagEmoji flagUrl image')
        .populate('customer', 'name email phone')
        .populate({
          path: 'documents',
          match: { isDeleted: false }
        })
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit),
      Application.countDocuments(filter)
    ]);

    return {
      items: applications,
      pagination: {
        page: Number(page),
        limit: Number(limit),
        total,
        totalPages: Math.ceil(total / limit) || 1
      }
    };
  }

  /**
   * Find single application by Reference Number or MongoDB ObjectId
   */
  async getApplicationById(idOrRef, currentUser = null) {
    if (!idOrRef) return null;
    const clean = String(idOrRef).trim();

    let query;
    if (mongoose.Types.ObjectId.isValid(clean)) {
      query = { _id: clean, isDeleted: false };
    } else {
      query = { referenceNumber: clean.toUpperCase(), isDeleted: false };
    }

    const application = await Application.findOne(query)
      .populate('visa', 'title displayName visaType stayPeriod validity entryType processingTime requiredDocuments')
      .populate('country', 'name displayName slug code flagEmoji flagUrl image')
      .populate('customer', 'name email phone')
      .populate({
        path: 'documents',
        match: { isDeleted: false }
      });

    if (!application) return null;

    if (currentUser && currentUser.role === ROLES.CUSTOMER) {
      const ownerId = application.customer?._id
        ? application.customer._id.toString()
        : application.customer?.toString();
      if (!ownerId || ownerId !== currentUser._id.toString()) {
        throw ApiError.forbidden('You do not have access to this application');
      }
    }

    return application;
  }

  /**
   * Update application details (Customer editing draft or Admin managing status/notes)
   */
  async updateApplication(idOrRef, updates, req = null) {
    const application = await this.getApplicationById(idOrRef);
    if (!application) throw ApiError.notFound(`Application '${idOrRef}' not found`);

    const currentUser = req?.user || null;
    const isCustomer = currentUser?.role === ROLES.CUSTOMER;

    if (isCustomer) {
      const ownerId = application.customer?._id
        ? application.customer._id.toString()
        : application.customer?.toString();

      if (!ownerId || ownerId !== currentUser._id.toString()) {
        throw ApiError.forbidden('You do not have permission to update this application');
      }

      // Check if application is already locked in processing or approved
      const lockedStatuses = [
        APPLICATION_STATUS.PROCESSING,
        APPLICATION_STATUS.APPROVED,
        APPLICATION_STATUS.VISA_ISSUED,
        APPLICATION_STATUS.COMPLETED
      ];
      if (lockedStatuses.includes(application.status)) {
        throw ApiError.badRequest('Application has already been submitted and cannot be modified.');
      }
    }

    const previous = application.toJSON();
    let statusChanged = false;

    // 1. Customer editable fields: travellers & applicant details
    if (Array.isArray(updates.travellers) && updates.travellers.length > 0) {
      application.travellers = updates.travellers.map((t, idx) => ({
        travellerId: t.travellerId || `trav_${idx + 1}`,
        name: t.name || `${t.firstName || ''} ${t.lastName || ''}`.trim() || 'Applicant',
        firstName: t.firstName || '',
        lastName: t.lastName || '',
        email: t.email || '',
        phone: t.phone || '',
        passportNumber: t.passportNumber || '',
        placeOfIssue: t.placeOfIssue || '',
        issueDate: t.issueDate || '',
        expiryDate: t.expiryDate || '',
        nationality: t.nationality || 'Indian',
        dob: t.dob || '',
        gender: t.gender || 'Male'
      }));

      for (const t of application.travellers) {
        if (t.issueDate && t.expiryDate) {
          const dateCheck = validatePassportDates(t.issueDate, t.expiryDate);
          if (!dateCheck.isValid) {
            throw ApiError.badRequest(dateCheck.error);
          }
        }
      }

      // Recalculate pricing snapshot if traveller count changed
      const newCount = application.travellers.length;
      if (application.pricingSnapshot && application.pricingSnapshot.travellerCount !== newCount) {
        const perPerson = application.pricingSnapshot.totalAmountPerPerson;
        application.pricingSnapshot.travellerCount = newCount;
        application.pricingSnapshot.totalAmount = perPerson * newCount;
      }
    }

    if (updates.additionalInformation !== undefined) {
      application.additionalInformation = typeof updates.additionalInformation === 'string'
        ? updates.additionalInformation.trim()
        : '';
    }
    if (updates.previousVisaRefusal !== undefined) {
      application.previousVisaRefusal = Boolean(updates.previousVisaRefusal);
    }
    if (updates.previousVisaRefusalCountry !== undefined) {
      application.previousVisaRefusalCountry = String(updates.previousVisaRefusalCountry).trim();
    }
    if (updates.previousVisaRefusalReason !== undefined) {
      application.previousVisaRefusalReason = String(updates.previousVisaRefusalReason).trim();
    }
    if (application.previousVisaRefusal && !application.previousVisaRefusalReason) {
      throw ApiError.badRequest('Please explain the reason for your previous visa refusal.');
    }

    // 2. Admin editable fields (restricted to Admin)
    if (!isCustomer) {
      if (updates.status && updates.status !== application.status) {
        application.status = updates.status;
        statusChanged = true;

        const timeline = application.timeline || [];
        if (updates.status === APPLICATION_STATUS.DOCUMENTS_UNDER_REVIEW) {
          application.timeline = timeline.map((t) =>
            t.stage === 'Documents Verified' ? { ...t, current: true, completed: false } : t
          );
        } else if (updates.status === APPLICATION_STATUS.PROCESSING) {
          application.timeline = timeline.map((t) => {
            if (t.stage === 'Documents Verified') return { ...t, completed: true, current: false };
            if (t.stage === 'Application Processing') return { ...t, completed: false, current: true };
            return t;
          });
        } else if (updates.status === APPLICATION_STATUS.VISA_ISSUED || updates.status === APPLICATION_STATUS.APPROVED) {
          application.timeline = timeline.map((t) => ({ ...t, completed: true, current: false }));
        }
      }

      if (updates.adminMessage !== undefined) {
        application.adminMessage = updates.adminMessage.trim();
      }
      if (updates.adminNotes !== undefined) {
        application.adminNotes = updates.adminNotes.trim();
      }
      if (updates.requiredAction !== undefined) {
        application.requiredAction = updates.requiredAction;
      }
      if (updates.paymentStatus !== undefined) {
        application.paymentStatus = updates.paymentStatus;
      }
      if (updates.visaDetails) {
        application.visaDetails = { ...application.visaDetails, ...updates.visaDetails };
      }

      // Handle batch document verification updates from admin dashboard
      if (Array.isArray(updates.documents)) {
        for (const docUpdate of updates.documents) {
          if (docUpdate.id || docUpdate.documentId) {
            const docId = docUpdate.id || docUpdate.documentId;
            const status = docUpdate.status || docUpdate.verificationStatus;
            if (status) {
              await Document.findByIdAndUpdate(docId, {
                status,
                rejectionReason: docUpdate.rejectionReason || docUpdate.note || '',
                verifiedAt: new Date(),
                verifiedBy: req?.user?._id
              });
            }
          }
        }
      }
    }

    await application.save();

    await auditService.log({
      action: statusChanged ? AUDIT_ACTIONS.STATUS_CHANGE : AUDIT_ACTIONS.UPDATE,
      entity: AUDIT_ENTITIES.APPLICATION,
      entityId: application._id,
      previousValues: previous,
      newValues: application.toJSON(),
      req
    });

    return this.getApplicationById(application._id);
  }

  /**
   * Submit an application for processing
   * Strictly validates applicant info, visa existence, and required documents from database
   */
  async submitApplication(idOrRef, currentUser = null, req = null) {
    const application = await this.getApplicationById(idOrRef);
    if (!application) throw ApiError.notFound(`Application '${idOrRef}' not found`);

    if (currentUser && currentUser.role === ROLES.CUSTOMER) {
      const ownerId = application.customer?._id
        ? application.customer._id.toString()
        : application.customer?.toString();

      if (!ownerId || ownerId !== currentUser._id.toString()) {
        throw ApiError.forbidden('You do not have permission to submit this application');
      }
    }

    // Check if already submitted or locked
    const lockedStatuses = [
      APPLICATION_STATUS.PROCESSING,
      APPLICATION_STATUS.APPROVED,
      APPLICATION_STATUS.VISA_ISSUED,
      APPLICATION_STATUS.COMPLETED
    ];
    if (lockedStatuses.includes(application.status)) {
      throw ApiError.badRequest(`Application has already been submitted and is in status '${application.status}'`);
    }

    // 1. Verify required applicant details
    if (!application.travellers || application.travellers.length === 0) {
      throw ApiError.badRequest('At least one traveller is required before submitting the application.');
    }

    for (const [idx, t] of application.travellers.entries()) {
      if (!t.name || !t.name.trim()) {
        throw ApiError.badRequest(`Traveller #${idx + 1} is missing a full name.`);
      }
      if (!t.passportNumber || !t.passportNumber.trim()) {
        throw ApiError.badRequest(`Traveller #${idx + 1} (${t.name}) is missing a passport number.`);
      }
      if (!t.nationality || !t.nationality.trim()) {
        throw ApiError.badRequest(`Traveller #${idx + 1} (${t.name}) is missing nationality.`);
      }
    }

    // 2. Verify selected visa product
    const visa = await Visa.findById(application.visa);
    if (!visa || !visa.isActive || visa.isDeleted) {
      throw ApiError.badRequest('The visa offering for this application is inactive or not found.');
    }

    // 3. Verify required documents strictly according to Visa configuration
    const reqDocs = Array.isArray(visa.requiredDocuments) ? visa.requiredDocuments : [];
    if (reqDocs.length > 0) {
      const uploadedDocs = await Document.find({
        application: application._id,
        isDeleted: false
      });

      const missingDocs = reqDocs.filter((r) => !isDocumentFulfilled(r, uploadedDocs));
      if (missingDocs.length > 0) {
        throw ApiError.badRequest(
          `Cannot submit application: missing required documents: ${missingDocs.join(', ')}`,
          {
            missingDocuments: missingDocs,
            requiredDocuments: reqDocs
          }
        );
      }
    }

    const previous = application.toJSON();

    // 4. Update status and lifecycle
    application.status = APPLICATION_STATUS.DOCUMENTS_UNDER_REVIEW;
    application.requiredAction = REQUIRED_ACTION.NONE;
    application.adminMessage = 'Application submitted successfully. Consulate document review is in progress.';

    const timeline = application.timeline || [];
    application.timeline = timeline.map((t) => {
      if (t.stage === 'Application Submitted') return { ...t, completed: true, current: false, timestamp: new Date().toISOString() };
      if (t.stage === 'Documents Verified') return { ...t, completed: false, current: true };
      return t;
    });

    await application.save();

    await auditService.log({
      action: AUDIT_ACTIONS.STATUS_CHANGE,
      entity: AUDIT_ENTITIES.APPLICATION,
      entityId: application._id,
      previousValues: previous,
      newValues: application.toJSON(),
      req
    });

    return this.getApplicationById(application._id);
  }

  /**
   * Get application status and timeline summary
   */
  async getApplicationStatus(idOrRef, currentUser = null) {
    const application = await this.getApplicationById(idOrRef, currentUser);
    if (!application) throw ApiError.notFound(`Application '${idOrRef}' not found`);

    return {
      id: application.referenceNumber,
      referenceNumber: application.referenceNumber,
      status: application.status,
      paymentStatus: application.paymentStatus,
      requiredAction: application.requiredAction,
      adminMessage: application.adminMessage,
      timeline: application.timeline,
      expectedCompletionDate: application.expectedCompletionDate,
      travellerCount: application.travellers?.length || 1,
      totalAmount: application.pricingSnapshot?.totalAmount || 0,
      currency: application.pricingSnapshot?.currency || 'INR'
    };
  }

  /**
   * Handle Customer re-upload action when ADDITIONAL_INFORMATION_REQUIRED
   */
  async updateApplicationAction(idOrRef, { actionType, message = '' }, req = null) {
    const application = await this.getApplicationById(idOrRef);
    if (!application) throw ApiError.notFound(`Application '${idOrRef}' not found`);

    const previous = application.toJSON();

    application.status = APPLICATION_STATUS.DOCUMENTS_UNDER_REVIEW;
    application.requiredAction = REQUIRED_ACTION.NONE;
    application.adminMessage = message || 'Updated documents uploaded by customer. Specialist re-verification underway.';

    // Mark documents in need of re-upload as re-uploaded
    await Document.updateMany(
      { application: application._id, status: 'NEEDS_REUPLOAD' },
      { status: 'PENDING', note: 'Customer re-uploaded new document' }
    );

    await application.save();

    await auditService.log({
      action: AUDIT_ACTIONS.UPDATE,
      entity: AUDIT_ENTITIES.APPLICATION,
      entityId: application._id,
      previousValues: previous,
      newValues: application.toJSON(),
      req
    });

    return this.getApplicationById(application._id);
  }

  /**
   * Securely claim an unclaimed guest application to the authenticated customer account
   */
  async claimGuestApplication({ referenceNumber, verificationKey, customerUser, req = null }) {
    if (!customerUser) {
      throw ApiError.unauthorized('Authentication required to link an application');
    }
    const cleanRef = String(referenceNumber).trim().toUpperCase();
    if (!/^MV-\d{6}$/.test(cleanRef)) {
      throw ApiError.badRequest('Invalid application reference number or verification credentials');
    }

    const rawKey = String(verificationKey).trim();
    const passportClean = rawKey.toUpperCase().replace(/[^A-Z0-9]/g, '');
    const phoneClean = rawKey.replace(/[^0-9]/g, '');

    const isCrediblePassport = passportClean.length >= 6;
    const isCrediblePhone = phoneClean.length >= 10;
    if (!isCrediblePassport && !isCrediblePhone) {
      throw ApiError.badRequest('Invalid application reference number or verification credentials');
    }

    const application = await Application.findOne({
      referenceNumber: cleanRef,
      isDeleted: false
    });

    if (!application) {
      throw ApiError.badRequest('Invalid application reference number or verification credentials');
    }

    if (application.customer && application.customer.toString() === customerUser._id.toString()) {
      return this.getApplicationById(application._id);
    }

    if (application.customer) {
      throw ApiError.badRequest('Invalid application reference number or verification credentials');
    }

    const isPassportMatch = isCrediblePassport && application.travellers.some((t) => {
      const p = String(t.passportNumber || '').trim().toUpperCase().replace(/[^A-Z0-9]/g, '');
      return p.length >= 6 && p === passportClean;
    });

    const isPhoneMatch = isCrediblePhone && application.travellers.some((t) => {
      const ph = String(t.phone || '').trim().replace(/[^0-9]/g, '');
      return ph.length >= 10 && (ph === phoneClean || ph.slice(-10) === phoneClean.slice(-10));
    });

    if (!isPassportMatch && !isPhoneMatch) {
      throw ApiError.badRequest('Invalid application reference number or verification credentials');
    }

    const updatedApp = await Application.findOneAndUpdate(
      {
        _id: application._id,
        customer: null,
        isDeleted: false
      },
      {
        $set: { customer: customerUser._id }
      },
      { new: true }
    );

    if (!updatedApp) {
      throw ApiError.badRequest('Invalid application reference number or verification credentials');
    }

    await auditService.log({
      actor: customerUser._id,
      actorEmail: customerUser.email,
      actorRole: customerUser.role,
      action: AUDIT_ACTIONS.UPDATE,
      entity: AUDIT_ENTITIES.APPLICATION,
      entityId: application._id,
      newValues: { customer: customerUser._id, claimedAt: new Date() },
      req
    });

    return this.getApplicationById(application._id);
  }

  /**
   * Submit post-application feedback / rating
   */
  async submitFeedback(idOrRef, { rating, comment = '' }, currentUser = null) {
    const application = await this.getApplicationById(idOrRef);
    if (!application) throw ApiError.notFound('Application not found');

    if (currentUser && currentUser.role === ROLES.CUSTOMER) {
      const ownerId = application.customer?._id
        ? application.customer._id.toString()
        : application.customer?.toString();
      if (ownerId && ownerId !== currentUser._id.toString()) {
        throw ApiError.forbidden('You are not authorized to submit feedback for this application');
      }
    }

    const numRating = Number(rating);
    if (!Number.isInteger(numRating) || numRating < 1 || numRating > 5) {
      throw ApiError.badRequest('Rating must be an integer between 1 and 5');
    }

    const cleanComment = typeof comment === 'string' ? comment.trim().slice(0, 1000) : '';

    const feedback = await Feedback.findOneAndUpdate(
      { application: application._id },
      {
        application: application._id,
        referenceNumber: application.referenceNumber,
        customer: currentUser ? currentUser._id : application.customer,
        rating: numRating,
        comment: cleanComment
      },
      { upsert: true, new: true, setDefaultsOnInsert: true }
    );

    application.feedback = {
      rating: numRating,
      comment: cleanComment,
      submittedAt: new Date()
    };
    await application.save();

    return feedback;
  }

  /**
   * Get feedback for application
   */
  async getApplicationFeedback(idOrRef, currentUser = null) {
    const application = await this.getApplicationById(idOrRef);
    if (!application) throw ApiError.notFound('Application not found');

    if (currentUser && currentUser.role === ROLES.CUSTOMER) {
      const ownerId = application.customer?._id
        ? application.customer._id.toString()
        : application.customer?.toString();
      if (ownerId && ownerId !== currentUser._id.toString()) {
        throw ApiError.forbidden('You do not have permission to view feedback for this application');
      }
    }

    return application.feedback?.rating ? application.feedback : null;
  }

  /**
   * Permanently delete an application and associated uploaded documents (Admin only)
   */
  async deleteApplication(idOrRef, currentUser = null, req = null) {
    const isObjectId = mongoose.isValidObjectId(idOrRef);
    const application = await Application.findOne({
      $or: [
        { referenceNumber: idOrRef },
        ...(isObjectId ? [{ _id: idOrRef }] : [])
      ]
    });

    if (!application) {
      throw ApiError.notFound('Application not found');
    }

    // 1. Clean up attached Document records & R2 files safely
    const attachedDocs = await Document.find({ application: application._id });
    for (const doc of attachedDocs) {
      if (doc.storageKey) {
        // Safe check: verify no other document/application references this storage key
        const shared = await Document.countDocuments({
          storageKey: doc.storageKey,
          application: { $ne: application._id }
        });
        if (shared === 0) {
          try {
            await storageService.deleteFile(doc.storageKey);
          } catch (delErr) {
            logger.warn(`Failed to delete document ${doc.storageKey} from storage:`, delErr?.message);
          }
        }
      }
    }

    // 2. Clean up any storage keys stored in application.travellers.docs
    const travellerKeys = new Set();
    if (Array.isArray(application.travellers)) {
      application.travellers.forEach((t) => {
        if (t.docs) {
          Object.values(t.docs).forEach((d) => {
            if (d?.storageKey) travellerKeys.add(d.storageKey);
            if (d?.frontStorageKey) travellerKeys.add(d.frontStorageKey);
            if (d?.backStorageKey) travellerKeys.add(d.backStorageKey);
          });
        }
      });
    }

    for (const key of travellerKeys) {
      const shared = await Document.countDocuments({ storageKey: key, application: { $ne: application._id } });
      if (shared === 0) {
        try {
          await storageService.deleteFile(key);
        } catch (delErr) {
          logger.warn(`Failed to delete traveller document ${key} from storage:`, delErr?.message);
        }
      }
    }

    // 3. Delete Document records from MongoDB
    await Document.deleteMany({ application: application._id });

    // 4. Delete Feedback if any
    await Feedback.deleteMany({ application: application._id });

    // 5. Delete the Application
    await Application.findByIdAndDelete(application._id);

    // 6. Audit log
    if (currentUser) {
      try {
        await auditService.log({
          action: 'DELETE',
          entity: 'APPLICATION',
          entityId: application._id,
          performedBy: currentUser._id,
          details: { referenceNumber: application.referenceNumber }
        }, req);
      } catch (e) {
        // audit log failure should not break deletion
      }
    }

    logger.info(`[ADMIN] Application ${application.referenceNumber} (${application._id}) permanently deleted`);

    return {
      deletedId: application._id,
      referenceNumber: application.referenceNumber
    };
  }
}

export const applicationService = new ApplicationService();
export default applicationService;
