/**
 * Document Service
 * Handles uploading, fetching presigned URLs, and document normalization.
 */

import { apiClient } from './apiClient';
import { isMockMode } from './apiConfig';
import { REQUIRED_ACTION } from '../constants/status';

/**
 * Normalizes document record
 */
export function normalizeDocument(rawDoc, applicationId = '', travellerId = '') {
  if (!rawDoc) return null;
  return {
    id: rawDoc.id || rawDoc.documentId || rawDoc._id || `doc_${Math.random().toString(36).substr(2, 9)}`,
    documentId: rawDoc.documentId || rawDoc.id || rawDoc._id || '',
    applicationId: rawDoc.applicationId || applicationId,
    travellerId: rawDoc.travellerId || travellerId,
    documentType: rawDoc.documentType || rawDoc.type || rawDoc.name || 'DOCUMENT',
    name: rawDoc.name || rawDoc.documentType || 'Uploaded Document',
    status: rawDoc.status || rawDoc.verificationStatus || 'Verified',
    verificationStatus: rawDoc.verificationStatus || rawDoc.status || 'Verified',
    rejectionReason: rawDoc.rejectionReason || rawDoc.note || undefined,
    note: rawDoc.note || rawDoc.rejectionReason || undefined,
    fileUrl: rawDoc.fileUrl || rawDoc.url || '',
    uploadedAt: rawDoc.uploadedAt || new Date().toISOString()
  };
}

class DocumentService {
  /**
   * Upload a document for a specific application
   */
  async uploadDocument(applicationId, documentData) {
    if (isMockMode()) {
      return normalizeDocument({
        id: `mock_doc_${Date.now()}`,
        applicationId,
        ...documentData
      });
    }

    // Supports FormData directly or JSON payload
    const isFormData = typeof FormData !== 'undefined' && documentData instanceof FormData;
    const raw = await apiClient(`/applications/${encodeURIComponent(applicationId)}/documents`, {
      method: 'POST',
      body: documentData,
      ...(isFormData ? { headers: {} } : {})
    });
    return normalizeDocument(raw.data || raw, applicationId);
  }

  /**
   * Upload a document via dedicated /documents/upload route with verification key
   */
  async uploadDocumentDirect(formData, verificationKey = '') {
    const headers = {};
    if (verificationKey) {
      headers['x-verification-key'] = verificationKey;
    }
    const raw = await apiClient('/documents/upload', {
      method: 'POST',
      body: formData,
      headers
    });
    return normalizeDocument(raw.data || raw);
  }

  /**
   * Retrieve a secure, presigned download/view URL for an uploaded document
   */
  async getDocumentUrl(documentId) {
    if (isMockMode()) {
      return { url: 'https://placehold.co/600x400?text=Document+Preview', signedUrl: 'https://placehold.co/600x400?text=Document+Preview' };
    }
    const raw = await apiClient(`/documents/${encodeURIComponent(documentId)}/url`);
    return raw.data || raw;
  }

  async getDocumentSignedUrl(documentId) {
    return this.getDocumentUrl(documentId);
  }

  /**
   * Triggers download of the original document from Cloudflare R2
   */
  async downloadDocument(documentId, originalFilename = 'document.pdf') {
    const data = await this.getDocumentUrl(documentId);
    const downloadUrl = data.signedUrl || data.url || data.downloadUrl;
    if (!downloadUrl) throw new Error('Could not obtain document download URL');

    const link = document.createElement('a');
    link.href = downloadUrl;
    link.setAttribute('download', originalFilename);
    link.target = '_blank';
    link.rel = 'noopener noreferrer';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    return downloadUrl;
  }

  /**
   * Soft-delete / remove an uploaded document
   */
  async deleteDocument(documentId) {
    if (isMockMode()) {
      return { success: true };
    }
    const raw = await apiClient(`/documents/${encodeURIComponent(documentId)}`, {
      method: 'DELETE'
    });
    return raw.data || raw;
  }
}

export const documentService = new DocumentService();
export default documentService;
