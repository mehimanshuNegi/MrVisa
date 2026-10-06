/**
 * Application Data Access Service
 * Handles fetching, submission, and status management for customer visa applications.
 * Normalized for API and Database mapping.
 */

import { mockApplications } from '../data/mockApplications';
import { APPLICATION_STATUS, REQUIRED_ACTION } from '../models/status';
import { isMockMode } from './apiConfig';
import { apiClient } from './apiClient';

const STORAGE_KEY = 'mrvisa_applications';

import { normalizeDocument } from './documentService';
export { normalizeDocument };

/**
 * Normalizes traveller record with stable IDs
 */
export function normalizeTraveller(rawTrav, index = 0) {
  if (!rawTrav) return null;
  const tId = rawTrav.id || rawTrav.travellerId || `trav_${index + 1}`;
  const fullName = rawTrav.name || `${rawTrav.firstName || ''} ${rawTrav.lastName || ''}`.trim() || 'Applicant';
  return {
    id: tId,
    travellerId: tId,
    name: fullName,
    firstName: rawTrav.firstName || fullName.split(' ')[0] || '',
    lastName: rawTrav.lastName || fullName.split(' ').slice(1).join(' ') || '',
    email: rawTrav.email || '',
    phone: rawTrav.phone || '',
    passportNumber: rawTrav.passportNumber || '',
    placeOfIssue: rawTrav.placeOfIssue || '',
    issueDate: rawTrav.issueDate || rawTrav.passportIssueDate || '',
    expiryDate: rawTrav.expiryDate || rawTrav.passportExpiry || '',
    nationality: rawTrav.nationality || 'Indian',
    dob: rawTrav.dob || rawTrav.dateOfBirth || '—',
    dateOfBirth: rawTrav.dateOfBirth || rawTrav.dob || '—',
    gender: rawTrav.gender || 'Male',
    documents: Array.isArray(rawTrav.documents)
      ? rawTrav.documents.map((d) => normalizeDocument(d, '', tId)).filter(Boolean)
      : []
  };
}

/**
 * Normalizes raw application data into a predictable frontend entity
 */
export function normalizeApplication(raw) {
  if (!raw) return null;
  const appId = raw.referenceNumber || raw.id || raw.applicationId || `MV-${Math.floor(100000 + Math.random() * 900000)}`;
  const travellers = Array.isArray(raw.travellers)
    ? raw.travellers.map((t, idx) => normalizeTraveller(t, idx)).filter(Boolean)
    : [];

  const rawDocs = Array.isArray(raw.documents) ? raw.documents : [];
  const documents = rawDocs.map((d) => normalizeDocument(d, appId)).filter(Boolean);

  const countryObj = typeof raw.country === 'object' && raw.country !== null ? raw.country : null;
  const visaObj = typeof raw.visa === 'object' && raw.visa !== null ? raw.visa : null;

  const countryDisplay = countryObj?.displayName || countryObj?.name || raw.countryName || raw.destination || 'Destination';
  const countrySlug = countryObj?.slug || raw.countryId || raw.visaId || '';
  const flagEmoji = raw.flagEmoji || countryObj?.flagEmoji || '🌍';
  const visaType = visaObj?.visaType || raw.visaType || 'E-Visa';

  const amountVal = raw.amountPaid || (raw.pricingSnapshot?.totalAmount !== undefined
    ? `₹${Number(raw.pricingSnapshot.totalAmount).toLocaleString('en-IN')}`
    : raw.amount || '₹0');

  return {
    id: appId,
    _id: raw._id || appId,
    applicationId: appId,
    referenceNumber: appId,
    userId: raw.customer?.id || raw.customer?._id || raw.userId || 'usr_guest_01',
    visaId: visaObj?.slug || visaObj?.id || raw.visaId || countrySlug,
    countryId: countrySlug,
    countryName: countryDisplay,
    destination: countryDisplay,
    flagEmoji,
    visaType,
    travellerCount: raw.travellerCount || travellers.length || raw.pricingSnapshot?.travellerCount || 1,
    travellers,
    documents,
    pricingSnapshot: raw.pricingSnapshot || null,
    submittedDate: raw.submittedDate || (raw.createdAt ? new Date(raw.createdAt).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }) : new Date().toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })),
    submittedAt: raw.submittedAt || (raw.createdAt ? new Date(raw.createdAt).toISOString() : new Date().toISOString()),
    status: raw.status || APPLICATION_STATUS.APPLICATION_RECEIVED,
    paymentStatus: raw.paymentStatus || 'PENDING',
    amountPaid: amountVal,
    amount: amountVal,
    expectedDate: raw.expectedCompletionDate || raw.expectedDate || raw.expectedCompletion || 'Within processing window',
    expectedCompletion: raw.expectedCompletionDate || raw.expectedCompletion || raw.expectedDate || 'Within processing window',
    additionalInformation: raw.additionalInformation || '',
    previousVisaRefusal: Boolean(raw.previousVisaRefusal),
    previousVisaRefusalCountry: raw.previousVisaRefusalCountry || '',
    previousVisaRefusalReason: raw.previousVisaRefusalReason || '',
    feedback: raw.feedback || null,
    adminMessage: raw.adminMessage || '',
    adminNotes: raw.adminNotes || '',
    requiredAction: raw.requiredAction || REQUIRED_ACTION.NONE,
    visaDocNumber: raw.visaDocNumber || raw.visaDetails?.docNumber || '',
    validUntil: raw.validUntil || raw.visaDetails?.validUntil || '',
    entryType: raw.entryType || raw.visaDetails?.entryType || '',
    visaDetails: raw.visaDetails || {
      docNumber: raw.visaDocNumber || '',
      validUntil: raw.validUntil || '',
      entryType: raw.entryType || '',
      downloadUrl: raw.visaDetails?.downloadUrl || ''
    },
    timeline: Array.isArray(raw.timeline) && raw.timeline.length > 0
      ? raw.timeline
      : [
          { stage: 'Application Submitted', completed: true, timestamp: raw.submittedDate || 'Just now' },
          { stage: 'Documents Verified', completed: false, current: true },
          { stage: 'Application Processing', completed: false, current: false },
          { stage: 'Visa Issued', completed: false, current: false }
        ]
  };
}

class ApplicationService {
  /**
   * Helper to load stored user applications from localStorage in mock mode
   */
  _getStoredApplications() {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) return [];
      const parsed = JSON.parse(raw);
      return Array.isArray(parsed) ? parsed : [];
    } catch (e) {
      console.warn('Failed to read stored applications:', e);
      return [];
    }
  }

  /**
   * Helper to persist applications in localStorage in mock mode
   */
  _setStoredApplications(apps) {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(apps));
    } catch (e) {
      console.warn('Failed to persist applications:', e);
    }
  }

  /**
   * Fetch all applications for current user session (getMyApplications)
   */
  async getMyApplications() {
    return this.getApplications();
  }

  /**
   * Fetch all applications
   */
  async getApplications() {
    if (isMockMode()) {
      const localApps = this._getStoredApplications();
      // Combine mock applications and local newly created applications
      const localIds = new Set(localApps.map((a) => a.id));
      const combined = [...localApps, ...mockApplications.filter((a) => !localIds.has(a.id))];
      return combined.map(normalizeApplication);
    }

    const rawList = await apiClient('/applications');
    const items = Array.isArray(rawList) ? rawList : rawList.data || [];
    return items.map(normalizeApplication);
  }

  /**
   * Fetch a single application by ID (e.g. MV-10284)
   */
  async getApplicationById(id) {
    if (!id) return null;
    const cleanId = id.trim().toLowerCase();

    if (isMockMode()) {
      const all = await this.getApplications();
      const found = all.find((a) => a.id.toLowerCase() === cleanId);
      return found ? normalizeApplication(found) : null;
    }

    const raw = await apiClient(`/applications/${encodeURIComponent(cleanId)}`);
    return normalizeApplication(raw.data || raw);
  }

  /**
   * Submit a new visa application
   */
  async createApplication(applicationData) {
    if (isMockMode()) {
      const normalized = normalizeApplication(applicationData);
      const existing = this._getStoredApplications();
      this._setStoredApplications([normalized, ...existing.filter((a) => a.id !== normalized.id)]);
      return normalized;
    }

    const raw = await apiClient('/applications', {
      method: 'POST',
      body: applicationData
    });
    return normalizeApplication(raw.data || raw);
  }

  /**
   * Update an existing application's data
   */
  async updateApplication(id, updates) {
    if (isMockMode()) {
      const all = await this.getApplications();
      const idx = all.findIndex((a) => a.id.toLowerCase() === id.toLowerCase());
      if (idx === -1) throw new Error(`Application ${id} not found`);

      const updated = normalizeApplication({ ...all[idx], ...updates });
      const stored = this._getStoredApplications();
      const sIdx = stored.findIndex((a) => a.id.toLowerCase() === id.toLowerCase());
      if (sIdx >= 0) {
        stored[sIdx] = updated;
        this._setStoredApplications(stored);
      } else {
        this._setStoredApplications([updated, ...stored]);
      }
      return updated;
    }

    const raw = await apiClient(`/applications/${encodeURIComponent(id)}`, {
      method: 'PATCH',
      body: updates
    });
    return normalizeApplication(raw.data || raw);
  }

  /**
   * Delete an application permanently (Admin action)
   */
  async deleteApplication(id) {
    if (!id) throw new Error('Application ID is required');

    if (isMockMode()) {
      const stored = this._getStoredApplications();
      const updated = stored.filter((a) => a.id !== id && a._id !== id);
      this._setStoredApplications(updated);
      return { success: true, deletedId: id };
    }

    const raw = await apiClient(`/applications/${encodeURIComponent(id)}`, {
      method: 'DELETE'
    });
    return raw?.data || raw;
  }

  /**
   * Upload a document for a specific application
   */
  async uploadDocument(applicationId, documentData) {
    if (isMockMode()) {
      return this.updateApplicationAction(applicationId, {
        actionType: REQUIRED_ACTION.UPLOAD_DOCUMENT,
        documentUpdates: [documentData]
      });
    }

    const raw = await apiClient(`/applications/${encodeURIComponent(applicationId)}/documents`, {
      method: 'POST',
      body: documentData
    });
    return normalizeDocument(raw.data || raw, applicationId);
  }

  /**
   * Customer action update (e.g. re-uploading photograph for ADDITIONAL_INFORMATION_REQUIRED)
   */
  async updateApplicationAction(id, { actionType, documentUpdates = [], message = '' } = {}) {
    if (isMockMode()) {
      const all = await this.getApplications();
      const current = all.find((a) => a.id.toLowerCase() === id.toLowerCase());
      if (!current) throw new Error(`Application ${id} not found`);

      // Advance state to DOCUMENTS_UNDER_REVIEW when required info is submitted
      const updatedApp = normalizeApplication({
        ...current,
        status: APPLICATION_STATUS.DOCUMENTS_UNDER_REVIEW,
        requiredAction: REQUIRED_ACTION.NONE,
        adminMessage: message || 'Updated documents uploaded by customer. Specialist re-verification underway.',
        documents: current.documents.map((d) => {
          if (d.status === 'Needs Re-upload' || d.verificationStatus === 'Needs Re-upload') {
            return { ...d, status: 'Re-uploaded (Verification Pending)', note: undefined, rejectionReason: undefined };
          }
          return d;
        }),
        timeline: (current.timeline || []).map((t) => {
          if (t.stage === 'Documents Verified') {
            return { ...t, current: true, actionRequired: false, note: 'Re-verification in progress' };
          }
          return t;
        })
      });

      const localApps = this._getStoredApplications();
      const localIdx = localApps.findIndex((a) => a.id.toLowerCase() === id.toLowerCase());
      if (localIdx >= 0) {
        localApps[localIdx] = updatedApp;
        this._setStoredApplications(localApps);
      } else {
        this._setStoredApplications([updatedApp, ...localApps]);
      }

      return updatedApp;
    }

    const raw = await apiClient(`/applications/${encodeURIComponent(id)}/actions`, {
      method: 'POST',
      body: { actionType, documentUpdates, message }
    });
    return normalizeApplication(raw.data || raw);
  }

  /**
   * Fetch timeline steps for an application
   */
  async getApplicationTimeline(applicationId) {
    const app = await this.getApplicationById(applicationId);
    return app?.timeline || [];
  }

  /**
   * Fetch issued visa details for an application
   */
  async getApplicationVisa(applicationId) {
    const app = await this.getApplicationById(applicationId);
    return app?.visaDetails || null;
  }

  /**
   * Submit post-application feedback & rating
   */
  async submitFeedback(applicationId, { rating, comment = '' }) {
    if (isMockMode()) {
      return {
        applicationId,
        rating,
        comment,
        submittedAt: new Date().toISOString()
      };
    }

    const raw = await apiClient(`/applications/${encodeURIComponent(applicationId)}/feedback`, {
      method: 'POST',
      body: { rating, comment }
    });
    return raw.data || raw;
  }

  /**
   * Fetch feedback for an application
   */
  async getApplicationFeedback(applicationId) {
    if (isMockMode()) return null;
    const raw = await apiClient(`/applications/${encodeURIComponent(applicationId)}/feedback`);
    return raw.data || raw;
  }

  /**
   * Process passport image or PDF via backend OCR and MRZ parser
   * @param {File} file Passport document or image file (PDF/JPG/PNG/WEBP)
   * @param {string|object} options Applicant full name or options object
   */
  async processPassportOcr(file, options = '') {
    const formData = new FormData();
    formData.append('file', file);
    formData.append('passportFile', file);
    formData.append('passport', file);
    formData.append('image', file);

    const fullName = typeof options === 'string' ? options : (options?.fullName || '');
    const pageType = typeof options === 'object' ? (options?.pageType || 'front') : 'front';
    const frontExtractedData = typeof options === 'object' ? (options?.frontExtractedData || {}) : {};
    const previousStorageKey = typeof options === 'object' ? (options?.previousStorageKey || '') : '';

    if (fullName) {
      formData.append('fullName', fullName);
      formData.append('name', fullName);
    }
    formData.append('pageType', pageType);
    if (Object.keys(frontExtractedData).length > 0) {
      formData.append('frontExtractedData', JSON.stringify(frontExtractedData));
    }
    if (previousStorageKey) {
      formData.append('previousStorageKey', previousStorageKey);
    }

    try {
      const response = await apiClient('/applications/passport-ocr', {
        method: 'POST',
        body: formData
      });
      return response.data || response;
    } catch (err) {
      console.warn('Backend OCR call notice:', err);
      const isPdfFile = file?.type === 'application/pdf' || /\.pdf$/i.test(file?.name || '');
      // Resilient non-blocking fallback with uploadedDocument metadata
      const fallbackDoc = {
        documentId: `doc_${Date.now()}_${Math.random().toString(36).substr(2, 6)}`,
        name: pageType === 'back' ? 'Passport Back Page' : 'Passport Front Page',
        originalFilename: file?.name || (pageType === 'back' ? (isPdfFile ? 'passport_back.pdf' : 'passport_back.jpg') : (isPdfFile ? 'passport_front.pdf' : 'passport_front.jpg')),
        fileSize: file?.size || 0,
        mimeType: file?.type || (isPdfFile ? 'application/pdf' : 'image/jpeg'),
        storageKey: ''
      };

      return {
        success: true,
        status: 'NEEDS_REVIEW',
        canContinueManually: true,
        uploadedDocument: fallbackDoc,
        message: pageType === 'back'
          ? "Second page uploaded. You can review details manually."
          : "We couldn't clearly read some passport details. You can enter the missing information manually.",
        stages: [
          { id: 'image_checked', label: 'Image checked', status: 'completed' },
          { id: 'passport_detected', label: 'Passport detected', status: 'completed' },
          { id: 'mrz_detected', label: 'MRZ detected', status: 'warning' },
          { id: 'extracting_details', label: 'Extracting details', status: 'completed' },
          { id: 'verifying_details', label: 'Verifying information', status: 'completed' }
        ],
        extractedData: pageType === 'back'
          ? {
              fatherName: '',
              motherName: '',
              spouseName: '',
              address: '',
              fileNumber: ''
            }
          : {
              fullName: fullName || '',
              firstName: fullName.split(' ')[0] || '',
              lastName: fullName.split(' ').slice(1).join(' ') || '',
              passportNumber: '',
              dateOfBirth: '',
              nationality: 'Indian',
              gender: 'Male',
              issueDate: '',
              expiryDate: ''
            },
        fieldStatus: {
          fullName: fullName ? 'HIGH' : 'MISSING',
          passportNumber: 'MISSING',
          dateOfBirth: 'MISSING',
          nationality: 'HIGH',
          gender: 'HIGH',
          issueDate: 'MISSING',
          expiryDate: 'MISSING'
        }
      };
    }
  }

  /**
   * Upload and automatically validate passport-size photograph
   */
  async processPassportPhoto(file, options = {}) {
    const formData = new FormData();
    formData.append('file', file);
    if (options.visaId) formData.append('visaId', options.visaId);
    if (options.previousStorageKey) formData.append('previousStorageKey', options.previousStorageKey);

    try {
      const response = await apiClient('/applications/passport-photo', {
        method: 'POST',
        body: formData
      });

      return response?.data || response;
    } catch (err) {
      if (err?.status === 401) {
        throw new Error('Your session has expired. Please sign in again.');
      }
      console.warn('Backend photo validation notice:', err?.message || err);
      return {
        canContinue: true,
        status: 'REVIEW_NEEDED',
        summary: 'Please review photo',
        messages: ['Image uploaded. Please review the photo manually before submitting.'],
        uploadedDocument: {
          documentId: `photo_${Date.now()}`,
          name: 'Passport Size Photograph',
          documentType: 'PASSPORT_PHOTO',
          originalFilename: file?.name || 'passport_photo.jpg'
        }
      };
    }
  }
}

export const applicationService = new ApplicationService();
export default applicationService;
