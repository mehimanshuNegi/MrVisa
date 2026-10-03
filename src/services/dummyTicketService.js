/**
 * Dummy Ticket Client Data Access Service
 * Communicates with backend REST API endpoints via apiClient.
 * No hardcoded business/catalog data in frontend.
 */

import { apiClient } from './apiClient';

class DummyTicketServiceApiClient {
  /**
   * Fetch all active dummy ticket packages/services
   */
  async getAllServices(params = {}) {
    const raw = await apiClient('/dummy-tickets', { params });
    const items = Array.isArray(raw) ? raw : raw?.data || [];
    return items;
  }

  /**
   * Fetch a single dummy ticket service by slug or ObjectId
   */
  async getServiceBySlug(slugOrId) {
    if (!slugOrId) return null;
    const clean = String(slugOrId).trim().toLowerCase();
    try {
      const raw = await apiClient(`/dummy-tickets/${encodeURIComponent(clean)}`);
      return raw?.data || raw;
    } catch (err) {
      if (err?.status === 404) return null;
      throw err;
    }
  }

  /**
   * Create a new dummy ticket package (Admin only)
   */
  async createService(data) {
    const raw = await apiClient('/dummy-tickets', {
      method: 'POST',
      body: data
    });
    return raw?.data || raw;
  }

  /**
   * Update an existing dummy ticket package (Admin only)
   */
  async updateService(id, updates) {
    const raw = await apiClient(`/dummy-tickets/${encodeURIComponent(id)}`, {
      method: 'PUT',
      body: updates
    });
    return raw?.data || raw;
  }

  /**
   * Toggle active/inactive status (Admin only)
   */
  async toggleServiceStatus(id) {
    const raw = await apiClient(`/dummy-tickets/${encodeURIComponent(id)}/status`, {
      method: 'PATCH'
    });
    return raw?.data || raw;
  }

  /**
   * Soft-delete dummy ticket package (Admin only)
   */
  async deleteService(id) {
    await apiClient(`/dummy-tickets/${encodeURIComponent(id)}`, {
      method: 'DELETE'
    });
    return true;
  }
}

export const dummyTicketService = new DummyTicketServiceApiClient();
export default dummyTicketService;
