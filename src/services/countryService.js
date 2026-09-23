/**
 * Destination Country Data Access Service
 */

import { mockCountries, searchCountriesList } from '../data/mockCountries';
import { isMockMode } from './apiConfig';
import { apiClient } from './apiClient';

/**
 * Robust URL-friendly slug generator with safe fallback
 */
export function generateSlug(text) {
  if (!text) return '';
  return String(text)
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

/**
 * Derives a regional flag emoji from a 2-letter ISO country code
 */
export function getFlagEmojiFromCode(code) {
  if (!code || typeof code !== 'string') return '';
  const clean = code.trim().toUpperCase();
  if (clean.length !== 2) return '';
  const codePoints = clean.split('').map((c) => 127397 + c.charCodeAt(0));
  try {
    return String.fromCodePoint(...codePoints);
  } catch (e) {
    return '';
  }
}

/**
 * Normalizes raw country data from API or Mock
 */
export function normalizeCountry(raw) {
  if (!raw) return null;
  const code = (raw.code || '').trim().toUpperCase();
  const flagEmoji = raw.flagEmoji || raw.flag || getFlagEmojiFromCode(code) || '🌍';
  const flagUrl = raw.flagUrl || (code.length === 2 ? `https://flagcdn.com/w80/${code.toLowerCase()}.png` : '');

  return {
    id: raw.id || raw.countryId || code.toLowerCase(),
    aliasId: raw.aliasId || raw.id || code.toLowerCase(),
    name: raw.name || raw.displayName || raw.country || '',
    displayName: raw.displayName || raw.name || '',
    code,
    flag: flagEmoji,
    flagEmoji,
    flagUrl,
    image: raw.image || raw.imageUrl || 'https://images.unsplash.com/photo-1488646953014-85cb44e25828?auto=format&fit=crop&w=1000&q=85',
    description: raw.description || '',
    visas: Array.isArray(raw.visas) ? raw.visas : [],
    status: raw.status || 'ACTIVE'
  };
}

const STORAGE_KEY = 'mrvisa_countries';

class CountryService {
  /**
   * Helper to load stored countries from localStorage in mock mode
   */
  _getStoredCountries() {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) return null;
      const parsed = JSON.parse(raw);
      return Array.isArray(parsed) && parsed.length > 0 ? parsed : null;
    } catch (e) {
      console.warn('Failed to read stored countries:', e);
      return null;
    }
  }

  /**
   * Helper to persist countries to localStorage in mock mode
   */
  _setStoredCountries(countries) {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(countries));
    } catch (e) {
      console.warn('Failed to persist countries:', e);
    }
  }

  /**
   * Get all destination countries (both active and inactive for admin)
   */
  async getAllCountries() {
    if (isMockMode()) {
      const stored = this._getStoredCountries();
      const list = stored || mockCountries;
      return list.map(normalizeCountry);
    }
    const rawList = await apiClient('/countries');
    const items = Array.isArray(rawList) ? rawList : rawList.data || [];
    return items.map(normalizeCountry);
  }

  /**
   * Get a country by its ID, slug, or code
   */
  async getCountryById(id) {
    if (!id) return null;
    const cleanId = id.trim().toLowerCase();

    if (isMockMode()) {
      const all = await this.getAllCountries();
      const found = all.find(
        (c) =>
          c.id.toLowerCase() === cleanId ||
          c.aliasId?.toLowerCase() === cleanId ||
          c.name.toLowerCase() === cleanId ||
          c.code?.toLowerCase() === cleanId
      );
      return found ? normalizeCountry(found) : null;
    }

    const raw = await apiClient(`/countries/${encodeURIComponent(cleanId)}`);
    return normalizeCountry(raw.data || raw);
  }

  /**
   * Update an existing country (Admin & Customer Shared Data)
   */
  async updateCountry(id, updates) {
    if (isMockMode()) {
      const all = await this.getAllCountries();
      const idx = all.findIndex(
        (c) => c.id.toLowerCase() === id.toLowerCase() || c.code?.toLowerCase() === id.toLowerCase()
      );
      if (idx === -1) throw new Error(`Country ${id} not found`);

      const updated = normalizeCountry({ ...all[idx], ...updates });
      all[idx] = updated;
      this._setStoredCountries(all);
      return updated;
    }

    const raw = await apiClient(`/countries/${encodeURIComponent(id)}`, {
      method: 'PUT',
      body: updates
    });
    return normalizeCountry(raw.data || raw);
  }

  /**
   * Create a new country with automatic slug generation and collision handling
   */
  async createCountry(countryData) {
    const name = String(countryData.name || '').trim();
    const code = String(countryData.code || '').trim().toUpperCase();
    const baseSlug = generateSlug(name) || code.toLowerCase() || `country-${Date.now().toString(36)}`;
    const flagEmoji = countryData.flagEmoji?.trim() || getFlagEmojiFromCode(code) || '🌍';
    const flagUrl = countryData.flagUrl || (code.length === 2 ? `https://flagcdn.com/w80/${code.toLowerCase()}.png` : '');
    const defaultImage = countryData.image || 'https://images.unsplash.com/photo-1488646953014-85cb44e25828?auto=format&fit=crop&w=1000&q=85';

    if (isMockMode()) {
      const all = await this.getAllCountries();
      let uniqueId = countryData.id ? generateSlug(countryData.id) : baseSlug;
      let counter = 1;
      while (all.some((c) => c.id.toLowerCase() === uniqueId.toLowerCase())) {
        uniqueId = `${baseSlug}-${counter++}`;
      }

      const normalized = normalizeCountry({
        ...countryData,
        id: uniqueId,
        aliasId: uniqueId,
        name,
        displayName: name,
        code,
        flagEmoji,
        flagUrl,
        image: defaultImage,
        description: countryData.description?.trim() || `Explore visa offerings for ${name}.`,
        visas: Array.isArray(countryData.visas) ? countryData.visas : [],
        status: countryData.status || 'ACTIVE'
      });

      const updatedList = [normalized, ...all];
      this._setStoredCountries(updatedList);
      return normalized;
    }

    const raw = await apiClient('/countries', {
      method: 'POST',
      body: countryData
    });
    return normalizeCountry(raw.data || raw);
  }

  /**
   * Toggle a country's active status
   */
  async toggleCountryStatus(id) {
    const country = await this.getCountryById(id);
    if (!country) throw new Error(`Country ${id} not found`);
    const newStatus = country.status === 'ACTIVE' ? 'INACTIVE' : 'ACTIVE';
    return this.updateCountry(id, { status: newStatus });
  }

  /**
   * Deactivate a country (mark status as INACTIVE)
   */
  async deactivateCountry(id) {
    return this.updateCountry(id, { status: 'INACTIVE' });
  }

  /**
   * Delete / Soft-delete a country
   */
  async deleteCountry(id) {
    if (isMockMode()) {
      const all = await this.getAllCountries();
      // Soft-delete to preserve historic customer application references
      const updatedList = all.map((c) => (c.id === id ? { ...c, status: 'INACTIVE' } : c));
      this._setStoredCountries(updatedList);
      return true;
    }
    await apiClient(`/countries/${encodeURIComponent(id)}`, { method: 'DELETE' });
    return true;
  }

  /**
   * Get formatted list for search dropdowns
   */
  getSearchCountries() {
    const stored = this._getStoredCountries();
    if (stored && stored.length > 0) {
      return ['Any Country', ...stored.filter((c) => c.status === 'ACTIVE').map((c) => c.name)];
    }
    return [...searchCountriesList];
  }
}

export const countryService = new CountryService();
export default countryService;
