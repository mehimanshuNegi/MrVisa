/**
 * Documentation Services Client Data Access Service
 * Communicates with backend REST API endpoints via apiClient.
 * No hardcoded business/catalog data in frontend.
 */

import { apiClient } from './apiClient';

class DocumentationServiceApiClient {
  /**
   * Fetch all active documentation services (or all for admin)
   */
  async getAllServices(params = {}) {
    const raw = await apiClient('/documentation-services', { params });
    const items = Array.isArray(raw) ? raw : raw?.data || [];
    return items;
  }

  /**
   * Fetch a single documentation service by its unique slug or ObjectId
   */
  async getServiceBySlug(slugOrId) {
    if (!slugOrId) return null;
    const clean = String(slugOrId).trim().toLowerCase();
    try {
      const raw = await apiClient(`/documentation-services/${encodeURIComponent(clean)}`);
      return raw?.data || raw;
    } catch (err) {
      if (err?.status === 404) return null;
      throw err;
    }
  }

  /**
   * Submit a new documentation service application/request
   */
  async submitRequest(requestData) {
    const raw = await apiClient('/documentation-services/requests', {
      method: 'POST',
      body: requestData
    });
    return raw?.data || raw;
  }

  /**
   * Fetch customer's own documentation requests
   */
  async getMyRequests(email = null) {
    const raw = await apiClient('/documentation-services/requests/my', {
      params: email ? { email } : {}
    });
    return Array.isArray(raw) ? raw : raw?.data || [];
  }

  /**
   * Fetch a single documentation request by its ID or reference
   */
  async getRequestById(id) {
    if (!id) return null;
    const raw = await apiClient(`/documentation-services/requests/${encodeURIComponent(id)}`);
    return raw?.data || raw;
  }

  /**
   * Create a new documentation service (Admin only)
   */
  async createService(serviceData) {
    const raw = await apiClient('/documentation-services', {
      method: 'POST',
      body: serviceData
    });
    return raw?.data || raw;
  }

  /**
   * Update an existing documentation service (Admin only)
   */
  async updateService(id, updates) {
    const raw = await apiClient(`/documentation-services/${encodeURIComponent(id)}`, {
      method: 'PUT',
      body: updates
    });
    return raw?.data || raw;
  }

  /**
   * Toggle active/inactive status (Admin only)
   */
  async toggleServiceStatus(id) {
    const raw = await apiClient(`/documentation-services/${encodeURIComponent(id)}/status`, {
      method: 'PATCH'
    });
    return raw?.data || raw;
  }

  /**
   * Soft-delete documentation service (Admin only)
   */
  async deleteService(id) {
    await apiClient(`/documentation-services/${encodeURIComponent(id)}`, {
      method: 'DELETE'
    });
    return true;
  }
}

export const documentationService = new DocumentationServiceApiClient();
export default documentationService;
