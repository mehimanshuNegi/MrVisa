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

/**
 * Normalizes document record
 */
export function normalizeDocument(rawDoc, applicationId = '', travellerId = '') {
  if (!rawDoc) return null;
  return {
    id: rawDoc.id || rawDoc.documentId || `doc_${Math.random().toString(36).substr(2, 9)}`,
    documentId: rawDoc.documentId || rawDoc.id || '',
    applicationId: rawDoc.applicationId || applicationId,
    travellerId: rawDoc.travellerId || travellerId,
    documentType: rawDoc.documentType || rawDoc.name || 'DOCUMENT',
    name: rawDoc.name || rawDoc.documentType || 'Uploaded Document',
    status: rawDoc.status || rawDoc.verificationStatus || 'Verified',
    verificationStatus: rawDoc.verificationStatus || rawDoc.status || 'Verified',
    rejectionReason: rawDoc.rejectionReason || rawDoc.note || undefined,
    note: rawDoc.note || rawDoc.rejectionReason || undefined,
    fileUrl: rawDoc.fileUrl || rawDoc.url || '',
    uploadedAt: rawDoc.uploadedAt || new Date().toISOString()
  };
}

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
    passportNumber: rawTrav.passportNumber || '',
    nationality: rawTrav.nationality || 'Indian',
    dob: rawTrav.dob || rawTrav.dateOfBirth || '—',
    dateOfBirth: rawTrav.dateOfBirth || rawTrav.dob || '—',
    gender: rawTrav.gender || 'Male',
    documents: Array.isArray(rawTrav.documents)
      ? rawTrav.documents.map((d) => normalizeDocument(d, '', tId))
      : []
  };
}

/**
 * Normalizes raw application data into a predictable frontend entity
 */
export function normalizeApplication(raw) {
  if (!raw) return null;
  const appId = raw.id || raw.applicationId || `MV-${Math.floor(100000 + Math.random() * 900000)}`;
  const travellers = Array.isArray(raw.travellers)
    ? raw.travellers.map((t, idx) => normalizeTraveller(t, idx))
    : [];

  const rawDocs = Array.isArray(raw.documents) ? raw.documents : [];
  const documents = rawDocs.map((d) => normalizeDocument(d, appId));

  const countryDisplay = raw.countryName || raw.destination || 'Destination';

  return {
    id: appId,
    applicationId: appId,
    userId: raw.userId || 'usr_guest_01',
    visaId: raw.visaId || raw.countryId || '',
    countryId: raw.countryId || raw.visaId || '',
    countryName: countryDisplay,
    destination: countryDisplay,
    flagEmoji: raw.flagEmoji || '🌍',
    visaType: raw.visaType || 'E-Visa',
    travellerCount: raw.travellerCount || travellers.length || 1,
    travellers,
    documents,
    submittedDate: raw.submittedDate || new Date().toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }),
    submittedAt: raw.submittedAt || new Date().toISOString(),
    status: raw.status || APPLICATION_STATUS.APPLICATION_RECEIVED,
    amountPaid: raw.amountPaid || raw.amount || '₹0',
    amount: raw.amount || raw.amountPaid || '₹0',
    expectedDate: raw.expectedDate || raw.expectedCompletion || 'Within processing window',
    expectedCompletion: raw.expectedCompletion || raw.expectedDate || 'Within processing window',
    adminMessage: raw.adminMessage || '',
    requiredAction: raw.requiredAction || REQUIRED_ACTION.NONE,
    visaDocNumber: raw.visaDocNumber || raw.visaDetails?.docNumber || '',
    validUntil: raw.validUntil || raw.visaDetails?.validUntil || '',
    entryType: raw.entryType || raw.visaDetails?.entryType || '',
    visaDetails: raw.visaDetails || {
      docNumber: raw.visaDocNumber || '',
      validUntil: raw.validUntil || '',
      entryType: raw.entryType || ''
    },
    timeline: Array.isArray(raw.timeline) && raw.timeline.length > 0
      ? raw.timeline
      : [
          { stage: 'Application Submitted', completed: true, timestamp: raw.submittedDate || 'Just now' },
          { stage: 'Documents Verified', completed: false, current: false },
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
}

export const applicationService = new ApplicationService();
export default applicationService;
