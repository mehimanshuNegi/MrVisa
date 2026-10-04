/**
 * Document Service
 * Handles uploading, fetching presigned URLs, and document normalization.
 */

import { apiClient } from './apiClient';
import { isMockMode } from './apiConfig';

/**
 * Normalizes document record
 */
export function getSensibleFilename(doc, fallbackExt = '') {
  if (!doc) return 'document.pdf';
  const name = String(doc.name || doc.originalFilename || doc.documentType || 'document').toLowerCase();
  const docType = String(doc.documentType || '').toLowerCase();

  let ext = fallbackExt;
  const orig = doc.originalFilename || doc.name || '';
  const extMatch = orig.match(/\.([a-zA-Z0-9]+)$/);
  if (extMatch) {
    ext = `.${extMatch[1].toLowerCase()}`;
  } else if (doc.mimeType) {
    if (doc.mimeType.includes('pdf')) ext = '.pdf';
    else if (doc.mimeType.includes('png')) ext = '.png';
    else if (doc.mimeType.includes('webp')) ext = '.webp';
    else if (doc.mimeType.includes('jpeg') || doc.mimeType.includes('jpg')) ext = '.jpg';
  }
  if (!ext) ext = '.jpg';

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

/**
 * Normalizes document record
 */
export function normalizeDocument(rawDoc, applicationId = '', travellerId = '') {
  if (!rawDoc) return null;
  const orig = rawDoc.originalFilename || rawDoc.name || '';
  const extMatch = orig.match(/\.([a-zA-Z0-9]+)$/);
  const isPdf = rawDoc.mimeType?.includes('pdf') || extMatch?.[1]?.toLowerCase() === 'pdf';
  const format = rawDoc.fileFormat || rawDoc.format || (isPdf ? 'PDF' : (extMatch ? extMatch[1].toUpperCase() : 'JPG'));

  const id = rawDoc.id || rawDoc.documentId || rawDoc._id || `doc_${Math.random().toString(36).substr(2, 9)}`;

  return {
    id,
    documentId: rawDoc.documentId || id,
    applicationId: rawDoc.applicationId || applicationId,
    travellerId: rawDoc.travellerId || travellerId,
    documentType: rawDoc.documentType || rawDoc.type || rawDoc.name || 'DOCUMENT',
    name: rawDoc.name || rawDoc.documentType || 'Uploaded Document',
    originalFilename: orig,
    downloadFilename: rawDoc.downloadFilename || getSensibleFilename(rawDoc),
    mimeType: rawDoc.mimeType || (isPdf ? 'application/pdf' : 'image/jpeg'),
    fileFormat: format,
    format,
    storageKey: rawDoc.storageKey || '',
    status: rawDoc.status || rawDoc.verificationStatus || 'Verified',
    verificationStatus: rawDoc.verificationStatus || rawDoc.status || 'Verified',
    rejectionReason: rawDoc.rejectionReason || rawDoc.note || undefined,
    note: rawDoc.note || rawDoc.rejectionReason || undefined,
    fileUrl: rawDoc.fileUrl || rawDoc.signedUrl || rawDoc.url || '',
    signedUrl: rawDoc.signedUrl || rawDoc.fileUrl || rawDoc.url || '',
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
   * Fetch all documents for an application with fresh signed URLs
   */
  async getDocumentsByApplication(applicationId) {
    if (isMockMode()) {
      return [];
    }
    try {
      const raw = await apiClient(`/applications/${encodeURIComponent(applicationId)}/documents`);
      const list = raw.data || raw;
      return Array.isArray(list) ? list.map((d) => normalizeDocument(d, applicationId)) : [];
    } catch (err) {
      console.warn(`Could not load documents for application ${applicationId}:`, err);
      return [];
    }
  }

  /**
   * Retrieve a secure, presigned preview/view URL for an uploaded document
   */
  async getDocumentPreviewUrl(docOrId, applicationId = '') {
    const docId = typeof docOrId === 'object' ? (docOrId.id || docOrId.documentId || docOrId.storageKey) : docOrId;
    if (isMockMode()) {
      return 'https://placehold.co/600x400?text=Document+Preview';
    }
    let endpoint = `/documents/${encodeURIComponent(docId)}/url?mode=preview`;
    if (applicationId) {
      endpoint = `/applications/${encodeURIComponent(applicationId)}/documents/${encodeURIComponent(docId)}/url?mode=preview`;
    }
    const raw = await apiClient(endpoint);
    const data = raw.data || raw;
    return data.signedUrl || data.fileUrl || data.url || '';
  }

  /**
   * Retrieve a secure, presigned download URL for an uploaded document
   */
  async getDocumentDownloadUrl(docOrId, applicationId = '') {
    const docId = typeof docOrId === 'object' ? (docOrId.id || docOrId.documentId || docOrId.storageKey) : docOrId;
    const docObj = typeof docOrId === 'object' ? docOrId : {};

    if (isMockMode()) {
      return {
        downloadUrl: 'https://placehold.co/600x400?text=Document+Download',
        filename: getSensibleFilename(docObj)
      };
    }

    let endpoint = `/documents/${encodeURIComponent(docId)}/url?mode=download`;
    if (applicationId) {
      endpoint = `/applications/${encodeURIComponent(applicationId)}/documents/${encodeURIComponent(docId)}/url?mode=download`;
    }
    const raw = await apiClient(endpoint);
    const data = raw.data || raw;
    return {
      downloadUrl: data.signedUrl || data.fileUrl || data.url || '',
      filename: data.downloadFilename || data.originalFilename || getSensibleFilename(docObj)
    };
  }

  /**
   * Retrieve signed URL (backward compatibility)
   */
  async getDocumentUrl(documentId) {
    return this.getDocumentPreviewUrl(documentId);
  }

  async getDocumentSignedUrl(documentId) {
    return this.getDocumentPreviewUrl(documentId);
  }

  /**
   * Triggers an immediate browser download of the original document
   */
  async downloadDocument(docOrId, applicationId = '') {
    const docId = typeof docOrId === 'object' ? (docOrId.id || docOrId.documentId || docOrId.storageKey) : docOrId;
    const docObj = typeof docOrId === 'object' ? docOrId : {};

    // 1. Get authenticated signed download URL & filename from backend
    const { downloadUrl, filename } = await this.getDocumentDownloadUrl(docId, applicationId);
    const targetFilename = filename || docObj.downloadFilename || docObj.originalFilename || getSensibleFilename(docObj);

    if (!downloadUrl) throw new Error('Could not obtain document download URL');

    // 2. Fetch as blob so browser triggers a genuine download without opening a new tab
    try {
      const res = await fetch(downloadUrl);
      if (!res.ok) throw new Error(`Download response status: ${res.status}`);
      const blob = await res.blob();
      const blobUrl = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = blobUrl;
      link.download = targetFilename;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      setTimeout(() => window.URL.revokeObjectURL(blobUrl), 2000);
      return downloadUrl;
    } catch (fetchErr) {
      console.warn('Direct blob download failed, falling back to direct anchor download:', fetchErr);
      const link = document.createElement('a');
      link.href = downloadUrl;
      link.setAttribute('download', targetFilename);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      return downloadUrl;
    }
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
