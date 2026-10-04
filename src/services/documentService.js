/**
 * Document Service
 * Handles uploading, fetching presigned URLs, and document normalization.
 */

import { apiClient } from './apiClient.js';
import { isMockMode } from './apiConfig.js';

/**
 * Detects the file format (JPG, PNG, WEBP, PDF, DOC, DOCX, etc.) dynamically
 * from document metadata, storageKey, filename, and MIME type without hardcoding PDF.
 */
export function detectDocumentFormat(doc) {
  if (!doc) return '';

  // 1. Direct format if already available and valid
  const rawFormat = (doc.fileFormat || doc.format || '').toString().trim().toUpperCase();
  if (rawFormat && ['JPG', 'JPEG', 'PNG', 'WEBP', 'PDF', 'DOC', 'DOCX', 'GIF'].includes(rawFormat)) {
    return rawFormat === 'JPEG' ? 'JPG' : rawFormat;
  }

  // 2. Storage key extension (reflects actual stored file in R2/S3/disk)
  const storageKey = String(doc.storageKey || '');
  const keyMatch = storageKey.match(/\.([a-zA-Z0-9]+)(?:\?.*)?$/);
  if (keyMatch) {
    const ext = keyMatch[1].toUpperCase();
    if (ext === 'JPEG') return 'JPG';
    if (['JPG', 'PNG', 'WEBP', 'PDF', 'DOC', 'DOCX', 'GIF'].includes(ext)) return ext;
  }

  // 3. Original uploaded filename
  const orig = String(doc.originalFilename || doc.filename || doc.downloadFilename || '');
  const origMatch = orig.match(/\.([a-zA-Z0-9]+)(?:\?.*)?$/);
  if (origMatch) {
    const ext = origMatch[1].toUpperCase();
    if (ext === 'JPEG') return 'JPG';
    if (['JPG', 'PNG', 'WEBP', 'PDF', 'DOC', 'DOCX', 'GIF'].includes(ext)) return ext;
  }

  // 4. Name if it contains an extension
  const name = String(doc.name || '');
  const nameMatch = name.match(/\.([a-zA-Z0-9]+)$/);
  if (nameMatch) {
    const ext = nameMatch[1].toUpperCase();
    if (ext === 'JPEG') return 'JPG';
    if (['JPG', 'PNG', 'WEBP', 'PDF', 'DOC', 'DOCX', 'GIF'].includes(ext)) return ext;
  }

  // 5. MIME type inspection
  const mime = String(doc.mimeType || doc.contentType || '').toLowerCase();
  if (mime.includes('png')) return 'PNG';
  if (mime.includes('webp')) return 'WEBP';
  if (mime.includes('jpeg') || mime.includes('jpg')) return 'JPG';
  if (mime.includes('pdf')) return 'PDF';
  if (mime.includes('gif')) return 'GIF';
  if (mime.includes('wordprocessingml') || mime.includes('docx')) return 'DOCX';
  if (mime.includes('msword') || mime.includes('doc')) return 'DOC';

  // 6. Check fileUrl / signedUrl
  const url = String(doc.fileUrl || doc.signedUrl || doc.url || '');
  if (url) {
    const cleanUrl = url.split('?')[0];
    const urlMatch = cleanUrl.match(/\.([a-zA-Z0-9]+)$/);
    if (urlMatch) {
      const ext = urlMatch[1].toUpperCase();
      if (ext === 'JPEG') return 'JPG';
      if (['JPG', 'PNG', 'WEBP', 'PDF', 'DOC', 'DOCX', 'GIF'].includes(ext)) return ext;
    }
  }

  // 7. Check if semantic photo document
  const lowerName = name.toLowerCase();
  const lowerType = String(doc.documentType || '').toLowerCase();
  if (lowerName.includes('photo') || lowerType.includes('photo') || lowerName.includes('portrait')) {
    return 'JPG';
  }

  return '';
}

/**
 * Derives a sensible, clean download filename preserving the original uploaded format
 */
export function getSensibleFilename(doc, fallbackExt = '') {
  if (!doc) return 'document';
  const name = String(doc.name || doc.originalFilename || doc.documentType || 'document').toLowerCase();
  const docType = String(doc.documentType || '').toLowerCase();
  const storageKey = String(doc.storageKey || '');
  const orig = String(doc.originalFilename || doc.name || '');

  let ext = fallbackExt;
  const keyMatch = storageKey.match(/\.([a-zA-Z0-9]+)(?:\?.*)?$/);
  const nameMatch = orig.match(/\.([a-zA-Z0-9]+)(?:\?.*)?$/);

  if (keyMatch) {
    const raw = keyMatch[1].toLowerCase();
    ext = raw === 'jpeg' ? '.jpg' : `.${raw}`;
  } else if (nameMatch) {
    const raw = nameMatch[1].toLowerCase();
    ext = raw === 'jpeg' ? '.jpg' : `.${raw}`;
  } else {
    const detected = detectDocumentFormat(doc);
    if (detected === 'JPG' || detected === 'JPEG') ext = '.jpg';
    else if (detected === 'PNG') ext = '.png';
    else if (detected === 'WEBP') ext = '.webp';
    else if (detected === 'PDF') ext = '.pdf';
    else if (detected === 'DOC') ext = '.doc';
    else if (detected === 'DOCX') ext = '.docx';
  }

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

/**
 * Normalizes document record with dynamically detected format and MIME type
 */
export function normalizeDocument(rawDoc, applicationId = '', travellerId = '') {
  if (!rawDoc) return null;
  const docObj = typeof rawDoc === 'string' ? { id: rawDoc, name: rawDoc, storageKey: rawDoc } : rawDoc;

  try {
    const orig = docObj.originalFilename || docObj.filename || docObj.name || '';
    const format = detectDocumentFormat(docObj);

    let mimeType = docObj.mimeType;
    if (!mimeType || mimeType === 'application/octet-stream') {
      if (format === 'JPG') mimeType = 'image/jpeg';
      else if (format === 'PNG') mimeType = 'image/png';
      else if (format === 'WEBP') mimeType = 'image/webp';
      else if (format === 'PDF') mimeType = 'application/pdf';
      else mimeType = 'image/jpeg';
    }

    const id = docObj.id || docObj.documentId || docObj._id || `doc_${Math.random().toString(36).substr(2, 9)}`;

    return {
      id: String(id),
      documentId: String(docObj.documentId || id),
      applicationId: String(docObj.applicationId || applicationId || ''),
      travellerId: String(docObj.travellerId || travellerId || ''),
      documentType: docObj.documentType || docObj.type || docObj.name || 'DOCUMENT',
      name: docObj.name || docObj.documentType || 'Uploaded Document',
      originalFilename: orig,
      downloadFilename: docObj.downloadFilename || getSensibleFilename(docObj),
      mimeType,
      fileFormat: format,
      format,
      storageKey: docObj.storageKey || '',
      status: docObj.status || docObj.verificationStatus || 'Verified',
      verificationStatus: docObj.verificationStatus || docObj.status || 'Verified',
      rejectionReason: docObj.rejectionReason || docObj.note || undefined,
      note: docObj.note || docObj.rejectionReason || undefined,
      fileUrl: docObj.fileUrl || docObj.signedUrl || docObj.url || '',
      signedUrl: docObj.signedUrl || docObj.fileUrl || docObj.url || '',
      uploadedAt: docObj.uploadedAt || new Date().toISOString()
    };
  } catch (err) {
    console.warn('Document normalization notice:', err);
    const fallbackId = String(docObj.id || docObj._id || `doc_${Date.now()}`);
    return {
      id: fallbackId,
      documentId: fallbackId,
      applicationId: String(applicationId || ''),
      travellerId: String(travellerId || ''),
      documentType: 'DOCUMENT',
      name: docObj.name || 'Uploaded Document',
      originalFilename: docObj.name || '',
      downloadFilename: 'document.jpg',
      mimeType: 'image/jpeg',
      fileFormat: '',
      format: '',
      storageKey: docObj.storageKey || '',
      status: 'Verified',
      verificationStatus: 'Verified',
      fileUrl: '',
      signedUrl: '',
      uploadedAt: new Date().toISOString()
    };
  }
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
    const { downloadUrl, filename } = await this.getDocumentDownloadUrl(docOrId, applicationId);
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
