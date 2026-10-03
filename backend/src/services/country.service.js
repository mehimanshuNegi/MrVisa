import mongoose from 'mongoose';
import { Country } from '../models/Country.js';
import { Visa } from '../models/Visa.js';
import { ApiError } from '../utils/apiError.js';
import { auditService } from './audit.service.js';
import { AUDIT_ACTIONS, AUDIT_ENTITIES } from '../constants/statuses.js';
import { escapeRegex } from '../utils/sanitize.js';

export function generateSlug(text) {
  if (!text) return '';
  return String(text)
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

class CountryService {
  /**
   * Fetch all countries with filtering, search, and pagination
   */
  async getAllCountries({ query = '', status = 'ALL', page = 1, limit = 50, includeDeleted = false } = {}) {
    const filter = {};
    if (!includeDeleted) filter.isDeleted = false;

    if (status === 'ACTIVE') filter.isActive = true;
    if (status === 'INACTIVE') filter.isActive = false;

    if (query) {
      const q = escapeRegex(query.trim());
      filter.$or = [
        { name: { $regex: q, $options: 'i' } },
        { displayName: { $regex: q, $options: 'i' } },
        { code: { $regex: q, $options: 'i' } },
        { slug: { $regex: q, $options: 'i' } }
      ];
    }

    const skip = (Math.max(1, page) - 1) * limit;
    const [countries, total] = await Promise.all([
      Country.find(filter)
        .populate('visas')
        .sort({ name: 1 })
        .skip(skip)
        .limit(limit),
      Country.countDocuments(filter)
    ]);

    return {
      items: countries,
      pagination: {
        page: Number(page),
        limit: Number(limit),
        total,
        totalPages: Math.ceil(total / limit) || 1
      }
    };
  }

  /**
   * Find country by its ID, slug, or code
   */
  async getCountryById(idOrSlug) {
    if (!idOrSlug) return null;
    const clean = String(idOrSlug).trim();

    let query;
    if (mongoose.Types.ObjectId.isValid(clean)) {
      query = { _id: clean, isDeleted: false };
    } else {
      const safeClean = escapeRegex(clean);
      query = {
        $or: [
          { slug: clean.toLowerCase() },
          { code: clean.toUpperCase() },
          { name: { $regex: `^${safeClean}$`, $options: 'i' } }
        ],
        isDeleted: false
      };
    }

    const country = await Country.findOne(query).populate({
      path: 'visas',
      match: { isDeleted: false, isActive: true }
    });

    return country;
  }

  /**
   * Create a new destination country
   */
  async createCountry(countryData, req = null) {
    const name = String(countryData.name || '').trim();
    if (!name) throw ApiError.badRequest('Country name is required');

    const code = String(countryData.code || '').trim().toUpperCase();
    if (!code) throw ApiError.badRequest('Country code is required');

    let baseSlug = countryData.slug ? generateSlug(countryData.slug) : generateSlug(name);
    let uniqueSlug = baseSlug;
    let counter = 1;
    while (await Country.findOne({ slug: uniqueSlug })) {
      uniqueSlug = `${baseSlug}-${counter++}`;
    }

    const country = await Country.create({
      name,
      displayName: countryData.displayName?.trim() || name,
      slug: uniqueSlug,
      code,
      flagEmoji: countryData.flagEmoji?.trim() || '🌍',
      flagUrl: countryData.flagUrl?.trim() || (code.length === 2 ? `https://flagcdn.com/w80/${code.toLowerCase()}.png` : ''),
      image: countryData.image?.trim() || 'https://images.unsplash.com/photo-1488646953014-85cb44e25828?auto=format&fit=crop&w=1000&q=85',
      description: countryData.description?.trim() || `Explore visa offerings for ${name}.`,
      isActive: countryData.status === 'INACTIVE' ? false : countryData.isActive !== false
    });

    await auditService.log({
      action: AUDIT_ACTIONS.CREATE,
      entity: AUDIT_ENTITIES.COUNTRY,
      entityId: country._id,
      newValues: country.toJSON(),
      req
    });

    return country;
  }

  /**
   * Update an existing country
   */
  async updateCountry(id, updates, req = null) {
    const country = await this.getCountryById(id);
    if (!country) throw ApiError.notFound(`Country '${id}' not found`);

    const previous = country.toJSON();

    if (updates.name) country.name = updates.name.trim();
    if (updates.displayName) country.displayName = updates.displayName.trim();
    if (updates.code) country.code = updates.code.trim().toUpperCase();
    if (updates.slug) {
      const newSlug = generateSlug(updates.slug);
      if (newSlug && newSlug !== country.slug) {
        const existing = await Country.findOne({ slug: newSlug, _id: { $ne: country._id } });
        if (existing) {
          throw ApiError.conflict(`A country with slug '${newSlug}' already exists`);
        }
        country.slug = newSlug;
      }
    }
    if (updates.flagEmoji) country.flagEmoji = updates.flagEmoji.trim();
    if (updates.flagUrl !== undefined) country.flagUrl = updates.flagUrl.trim();
    if (updates.image !== undefined) country.image = updates.image.trim();
    if (updates.description !== undefined) country.description = updates.description.trim();

    if (updates.status !== undefined) {
      country.isActive = updates.status === 'ACTIVE';
    } else if (updates.isActive !== undefined) {
      country.isActive = Boolean(updates.isActive);
    }

    await country.save();

    await auditService.log({
      action: AUDIT_ACTIONS.UPDATE,
      entity: AUDIT_ENTITIES.COUNTRY,
      entityId: country._id,
      previousValues: previous,
      newValues: country.toJSON(),
      req
    });

    return country;
  }

  /**
   * Toggle active/inactive status
   */
  async toggleCountryStatus(id, req = null) {
    const country = await this.getCountryById(id);
    if (!country) throw ApiError.notFound(`Country '${id}' not found`);
    return this.updateCountry(id, { isActive: !country.isActive }, req);
  }

  /**
   * Soft-delete country
   */
  async deleteCountry(id, req = null) {
    const country = await this.getCountryById(id);
    if (!country) throw ApiError.notFound(`Country '${id}' not found`);

    // Check for active visa offerings linked to this country
    const linkedVisasCount = await Visa.countDocuments({ country: country._id, isDeleted: false });
    if (linkedVisasCount > 0) {
      throw ApiError.badRequest(
        `Cannot delete "${country.name}". There are ${linkedVisasCount} active visa offering(s) attached to this destination. Please delete or reassign those visas first.`
      );
    }

    country.isDeleted = true;
    country.isActive = false;
    await country.save();

    await auditService.log({
      action: AUDIT_ACTIONS.DELETE,
      entity: AUDIT_ENTITIES.COUNTRY,
      entityId: country._id,
      req
    });

    return true;
  }
}

export const countryService = new CountryService();
export default countryService;
