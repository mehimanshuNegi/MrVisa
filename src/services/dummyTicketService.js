/**
 * Dummy Ticket Client Data Access Service
 * Communicates with backend REST API endpoints via apiClient.
 * Single source of truth: MongoDB Atlas
 */

import { apiClient } from './apiClient';

class DummyTicketServiceApiClient {
  // ==========================================
  // CUSTOMER BOOKING REQUESTS
  // ==========================================

  /**
   * Submit a new dummy ticket booking request
   */
  async submitRequest(data) {
    const raw = await apiClient('/dummy-tickets/requests', {
      method: 'POST',
      body: data
    });
    return raw?.data || raw;
  }

  /**
   * Fetch customer's own dummy ticket requests
   */
  async getMyRequests(email = null) {
    const raw = await apiClient('/dummy-tickets/requests/my', {
      params: email ? { email } : {}
    });
    return Array.isArray(raw) ? raw : raw?.data || [];
  }

  /**
   * Fetch all dummy ticket requests (Admin only)
   */
  async getAllRequests(params = {}) {
    const raw = await apiClient('/dummy-tickets/requests', { params });
    return raw?.data || raw;
  }

  /**
   * Fetch single request by ID (Admin or Customer owner)
   */
  async getRequestById(id) {
    if (!id) return null;
    const raw = await apiClient(`/dummy-tickets/requests/${encodeURIComponent(id)}`);
    return raw?.data || raw;
  }

  /**
   * Update request status & admin notes (Admin only)
   */
  async updateRequestStatus(id, { status, adminNotes }) {
    const raw = await apiClient(`/dummy-tickets/requests/${encodeURIComponent(id)}/status`, {
      method: 'PATCH',
      body: { status, adminNotes }
    });
    return raw?.data || raw;
  }

  /**
   * Soft-delete request (Admin only)
   */
  async deleteRequest(id) {
    await apiClient(`/dummy-tickets/requests/${encodeURIComponent(id)}`, {
      method: 'DELETE'
    });
    return true;
  }

  // ==========================================
  // DUMMY TICKET SERVICE PACKAGES / CATALOG
  // ==========================================

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
