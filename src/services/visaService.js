/**
 * Visa Data Access Service
 * UI calls this service instead of importing raw data files.
 * In mock mode: resolves from mockVisas.
 * In API mode: calls Backend REST / GraphQL API endpoints via apiClient.
 */

import { mockVisas } from '../data/mockVisas';
import { isMockMode } from './apiConfig';
import { apiClient } from './apiClient';
import { normalizeVisaType, normalizeCountryName } from './destinationFilter';

/**
 * Normalizes raw visa data from API or Mock into a consistent frontend model
 */
export function normalizeVisa(raw) {
  if (!raw) return null;
  const priceVal = raw.price || raw.fees || '₹0';
  return {
    id: raw.id || raw._id || raw.visaId,
    countryId: raw.countryId || raw.country || raw.id,
    country: (raw.countryName || raw.country || raw.displayName || '').toUpperCase(),
    countryName: raw.countryName || raw.displayName || raw.country || '',
    displayName: raw.displayName || raw.countryName || raw.country || '',
    flagUrl: raw.flagUrl || '',
    flagEmoji: raw.flagEmoji || '🌍',
    image: raw.image || raw.imageUrl || '',
    visaType: raw.visaType || 'E-Visa',
    validity: raw.validity || '30 Days',
    stayPeriod: raw.stayPeriod || raw.validity || '30 Days',
    entryType: raw.entryType || 'Single Entry',
    processingTime: raw.processingTime || '24–48 Hours',
    price: priceVal,
    fees: priceVal, // compatibility alias
    guaranteedDate: raw.guaranteedDate || '24 Sep 2026, 4:00 PM',
    availability: raw.availability || 'Available',
    documentCategory: raw.documentCategory || 'Only Passport',
    documentsSummary: raw.documentsSummary || 'Passport, Photograph',
    travelPurpose: raw.travelPurpose || 'Tourism',
    shortDescription: raw.shortDescription || raw.description || '',
    description: raw.description || raw.shortDescription || '',
    documentsRequired: raw.documentsRequired || raw.documents || [],
    documents: raw.documents || raw.documentsRequired || [],
    faqs: raw.faqs || [],
    status: raw.status || 'ACTIVE'
  };
}

const STORAGE_KEY = 'mrvisa_visas';

class VisaService {
  /**
   * Helper to load stored visas from localStorage in mock mode
   */
  _getStoredVisas() {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) return null;
      const parsed = JSON.parse(raw);
      return Array.isArray(parsed) && parsed.length > 0 ? parsed : null;
    } catch (e) {
      console.warn('Failed to read stored visas:', e);
      return null;
    }
  }

  /**
   * Helper to persist visas to localStorage in mock mode
   */
  _setStoredVisas(visas) {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(visas));
    } catch (e) {
      console.warn('Failed to persist visas:', e);
    }
  }

  /**
   * Fetch all visa offerings (both active and inactive for admin, or filtered)
   */
  async getAllVisas() {
    if (isMockMode()) {
      const stored = this._getStoredVisas();
      const list = stored || mockVisas;
      return list.map(normalizeVisa);
    }
    const rawList = await apiClient('/visas');
    const items = Array.isArray(rawList) ? rawList : rawList.data || [];
    return items.map(normalizeVisa);
  }

  /**
   * Fetch a specific visa by its unique ID or country slug
   */
  async getVisaById(id) {
    if (!id) return null;
    const cleanId = id.trim().toLowerCase();

    if (isMockMode()) {
      const all = await this.getAllVisas();
      const found = all.find(
        (v) =>
          v.id.toLowerCase() === cleanId ||
          v.countryId?.toLowerCase() === cleanId ||
          v.displayName?.toLowerCase() === cleanId ||
          v.country?.toLowerCase() === cleanId
      );
      return found ? normalizeVisa(found) : null;
    }

    const raw = await apiClient(`/visas/${encodeURIComponent(cleanId)}`);
    return normalizeVisa(raw.data || raw);
  }

  /**
   * Fetch visas for a specific destination country
   */
  async getVisasByCountry(countryId) {
    if (isMockMode()) {
      const all = await this.getAllVisas();
      const cleanId = (countryId || '').trim().toLowerCase();
      return all.filter(
        (v) =>
          v.countryId?.toLowerCase() === cleanId ||
          v.id.toLowerCase() === cleanId ||
          v.displayName?.toLowerCase() === cleanId
      );
    }

    const rawList = await apiClient(`/countries/${encodeURIComponent(countryId)}/visas`);
    const items = Array.isArray(rawList) ? rawList : rawList.data || [];
    return items.map(normalizeVisa);
  }

  /**
   * Update an existing visa (Admin & Customer Shared Data)
   */
  async updateVisa(id, updates) {
    if (isMockMode()) {
      const all = await this.getAllVisas();
      const idx = all.findIndex((v) => v.id.toLowerCase() === id.toLowerCase());
      if (idx === -1) throw new Error(`Visa ${id} not found`);

      // Merge and normalize
      const updated = normalizeVisa({ ...all[idx], ...updates });
      all[idx] = updated;
      this._setStoredVisas(all);
      return updated;
    }

    const raw = await apiClient(`/visas/${encodeURIComponent(id)}`, {
      method: 'PUT',
      body: updates
    });
    return normalizeVisa(raw.data || raw);
  }

  /**
   * Create a new visa offering
   */
  async createVisa(visaData) {
    const normalized = normalizeVisa({
      ...visaData,
      id: visaData.id || `${visaData.countryId || 'visa'}-${Date.now().toString(36)}`
    });

    if (isMockMode()) {
      const all = await this.getAllVisas();
      const updatedList = [normalized, ...all.filter((v) => v.id !== normalized.id)];
      this._setStoredVisas(updatedList);
      return normalized;
    }

    const raw = await apiClient('/visas', {
      method: 'POST',
      body: visaData
    });
    return normalizeVisa(raw.data || raw);
  }

  /**
   * Toggle a visa's active status
   */
  async toggleVisaStatus(id) {
    const visa = await this.getVisaById(id);
    if (!visa) throw new Error(`Visa ${id} not found`);
    const newStatus = visa.status === 'ACTIVE' ? 'INACTIVE' : 'ACTIVE';
    return this.updateVisa(id, { status: newStatus });
  }

  /**
   * Filter and search visas with query parameters
   */
  async searchVisas({ query = '', country = 'Any Country', visaType = 'All Visa Types', documentCategory = 'Any Documents' } = {}) {
    if (isMockMode()) {
      const all = await this.getAllVisas();
      const cleanQuery = query.trim().toLowerCase();

      return all.filter((v) => {
        // 1. Text search
        const matchesSearch =
          !cleanQuery ||
          v.displayName.toLowerCase().includes(cleanQuery) ||
          v.country.toLowerCase().includes(cleanQuery);

        // 2. Country filter
        const filterCountry = normalizeCountryName(country);
        const matchesCountry =
          filterCountry === 'all' ||
          (v.displayName && v.displayName.toLowerCase() === filterCountry) ||
          (v.countryName && v.countryName.toLowerCase() === filterCountry) ||
          (v.countryId && v.countryId.toLowerCase() === filterCountry) ||
          (v.country && v.country.toLowerCase() === filterCountry);

        // 3. Visa type filter (Exact data-driven comparison)
        const filterType = normalizeVisaType(visaType);
        const itemType = normalizeVisaType(v.visaType);
        const matchesType = filterType === 'all' || itemType === filterType;

        // 4. Document requirement filter
        const matchesDoc =
          documentCategory === 'Any Documents' ||
          (v.documentCategory &&
            v.documentCategory.toLowerCase() === documentCategory.toLowerCase());

        return matchesSearch && matchesCountry && matchesType && matchesDoc;
      });
    }

    const rawList = await apiClient('/visas/search', {
      params: { query, country, visaType, documentCategory }
    });
    const items = Array.isArray(rawList) ? rawList : rawList.data || [];
    return items.map(normalizeVisa);
  }

  /**
   * Get supported visa types for filters
   */
  getVisaTypes() {
    return [
      'All Visa Types',
      'E-Visa',
      'Tourist Visa',
      'Sticker Visa',
      'Business Visa',
      'Transit Visa'
    ];
  }

  /**
   * Get document category filter options
   */
  getDocumentFilters() {
    return [
      'Any Documents',
      'Only Passport',
      'Passport & Bank Statements',
      'Passport, Bank Statements & Income Tax Return',
      'With US/UK/Schengen visa'
    ];
  }

  /**
   * Get detailed visa type options with count badges
   */
  getVisaTypeOptions() {
    return [
      { label: 'All Visa Types', count: 12, value: 'All Visa Types' },
      { label: 'E-Visa', count: 8, value: 'E-Visa' },
      { label: 'Tourist Visa', count: 3, value: 'Tourist Visa' },
      { label: 'Sticker Visa', count: 1, value: 'Sticker Visa' },
      { label: 'Business Visa', count: 1, value: 'Business Visa' },
      { label: 'Transit Visa', count: 1, value: 'Transit Visa' }
    ];
  }

  /**
   * Get detailed document filter options with count badges
   */
  getDocumentOptions() {
    return [
      { label: 'Any Documents', count: 147, value: 'Any Documents' },
      { label: 'Only Passport', count: 44, value: 'Only Passport' },
      { label: 'Passport & Bank Statements', count: 15, value: 'Passport & Bank Statements' },
      { label: 'Passport, Bank Statements & Income Tax Return', count: 43, value: 'Passport, Bank Statements & Income Tax Return' },
      { label: 'With US/UK/Schengen visa', count: 4, value: 'With US/UK/Schengen visa' }
    ];
  }
}

export const visaService = new VisaService();
export default visaService;
