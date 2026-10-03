/**
 * Admin Service for dashboard, audit logs, and media uploads
 */
import { apiClient } from './apiClient';

class AdminService {
  /**
   * Upload an image (visa, country, or service image) to Object Storage via backend
   * @param {File} file
   * @returns {Promise<{ url: string, storageKey: string }>}
   */
  async uploadImage(file) {
    const formData = new FormData();
    formData.append('image', file);

    const res = await apiClient('/admin/upload-image', {
      method: 'POST',
      body: formData
    });

    const data = res?.data || res;
    // In local dev without full domain, prefix with backend origin if relative
    let url = data?.url || '';
    if (url.startsWith('/api/v1/')) {
      const backendBase = import.meta.env.VITE_API_URL || 'http://localhost:5000/api/v1';
      const origin = backendBase.replace(/\/api\/v1\/?$/, '');
      url = `${origin}${url}`;
    }

    return {
      url,
      storageKey: data?.storageKey || ''
    };
  }
}

export const adminService = new AdminService();
export default adminService;
