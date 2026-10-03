import mongoose from 'mongoose';
import { Visa } from '../models/Visa.js';
import { Country } from '../models/Country.js';
import { ApiError } from '../utils/apiError.js';
import { auditService } from './audit.service.js';
import { AUDIT_ACTIONS, AUDIT_ENTITIES } from '../constants/statuses.js';
import { generateSlug } from './country.service.js';

function escapeRegex(string) {
  return string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function normalizeDocRequirementItem(d) {
  if (!d) return null;
  if (typeof d === 'string') {
    const trimmed = d.trim();
    return trimmed ? trimmed : null;
  }
  if (typeof d === 'object') {
    const title = (d.title || d.name || '').trim();
    if (!title) return null;
    const acceptedFormats = Array.isArray(d.acceptedFormats) && d.acceptedFormats.length > 0
      ? d.acceptedFormats.map((f) => String(f).trim().toUpperCase()).filter(Boolean)
      : ['PDF', 'JPG', 'PNG'];
    const isReq = d.required !== false && d.isRequired !== false;
    return {
      title,
      name: title,
      acceptedFormats,
      subtitle: d.subtitle ? String(d.subtitle).trim() : '',
      description: d.description ? String(d.description).trim() : '',
      required: isReq,
      isRequired: isReq
    };
  }
  return null;
}

class VisaService {
  /**
   * Fetch all visas with multi-parameter filtering, search, and pagination
   */
  async getAllVisas({
    query = '',
    country = '',
    visaType = '',
    documentCategory = '',
    status = 'ALL',
    page = 1,
    limit = 50,
    includeDeleted = false
  } = {}) {
    const filter = {};
    if (!includeDeleted) filter.isDeleted = false;

    if (status === 'ACTIVE') filter.isActive = true;
    if (status === 'INACTIVE') filter.isActive = false;

    if (visaType && visaType !== 'All Visa Types' && visaType !== 'all') {
      filter.visaType = { $regex: new RegExp(`^${escapeRegex(visaType)}$`, 'i') };
    }

    if (documentCategory && documentCategory !== 'Any Documents' && documentCategory !== 'all') {
      filter.documentCategory = { $regex: new RegExp(`^${escapeRegex(documentCategory)}$`, 'i') };
    }

    if (query) {
      const q = escapeRegex(query.trim());
      filter.$or = [
        { title: { $regex: q, $options: 'i' } },
        { displayName: { $regex: q, $options: 'i' } },
        { slug: { $regex: q, $options: 'i' } },
        { description: { $regex: q, $options: 'i' } }
      ];
    }

    // Country filter: can be country name, slug, or ObjectId
    if (country && country !== 'Any Country' && country !== 'All Countries' && country !== 'all') {
      const safeCountry = escapeRegex(country);
      const countryDoc = await Country.findOne({
        $or: [
          { slug: country.toLowerCase() },
          { name: { $regex: new RegExp(`^${safeCountry}$`, 'i') } },
          ...(mongoose.Types.ObjectId.isValid(country) ? [{ _id: country }] : [])
        ]
      });

      if (countryDoc) {
        filter.country = countryDoc._id;
      } else {
        // If country filter didn't match any country in DB, match empty
        return { items: [], pagination: { page: Number(page), limit: Number(limit), total: 0, totalPages: 0 } };
      }
    }

    const skip = (Math.max(1, page) - 1) * limit;
    const [visas, total] = await Promise.all([
      Visa.find(filter)
        .populate('country', 'name displayName slug code flagEmoji flagUrl image')
        .sort({ 'country.name': 1, createdAt: -1 })
        .skip(skip)
        .limit(limit),
      Visa.countDocuments(filter)
    ]);

    return {
      items: visas,
      pagination: {
        page: Number(page),
        limit: Number(limit),
        total,
        totalPages: Math.ceil(total / limit) || 1
      }
    };
  }

  /**
   * Find visa by ID or slug
   */
  async getVisaById(idOrSlug) {
    if (!idOrSlug) return null;
    let clean = String(idOrSlug).trim();
    try {
      clean = decodeURIComponent(clean);
    } catch {
      // ignore
    }

    let query;
    if (mongoose.Types.ObjectId.isValid(clean)) {
      query = { _id: clean, isDeleted: false };
    } else {
      const safeClean = escapeRegex(clean);
      query = {
        $or: [
          { slug: clean.toLowerCase() },
          { title: { $regex: `^${safeClean}$`, $options: 'i' } },
          { displayName: { $regex: `^${safeClean}$`, $options: 'i' } }
        ],
        isDeleted: false
      };
    }

    let visa = await Visa.findOne(query).populate('country', 'name displayName slug code flagEmoji flagUrl image');
    if (visa) return visa;

    // Fallback: If not found as visa slug, check if idOrSlug matches a country slug/name
    const safeClean = escapeRegex(clean);
    const country = await Country.findOne({
      $or: [
        { slug: clean.toLowerCase() },
        { name: { $regex: new RegExp(`^${safeClean}$`, 'i') } },
        ...(mongoose.Types.ObjectId.isValid(clean) ? [{ _id: clean }] : [])
      ]
    });

    if (country) {
      visa = await Visa.findOne({ country: country._id, isDeleted: false, isActive: true })
        .populate('country', 'name displayName slug code flagEmoji flagUrl image')
        .sort({ createdAt: -1 });
    }

    return visa;
  }

  /**
   * Get all visas for a specific country
   */
  async getVisasByCountry(countryIdOrSlug) {
    const clean = (countryIdOrSlug || '').trim();
    if (!clean) return [];

    const safeClean = escapeRegex(clean);
    let countryQuery = mongoose.Types.ObjectId.isValid(clean)
      ? { _id: clean }
      : {
          $or: [
            { slug: clean.toLowerCase() },
            { name: { $regex: new RegExp(`^${safeClean}$`, 'i') } },
            { code: clean.toUpperCase() }
          ]
        };

    const country = await Country.findOne(countryQuery);
    if (!country) return [];

    return Visa.find({ country: country._id, isDeleted: false, isActive: true })
      .populate('country', 'name displayName slug code flagEmoji flagUrl image')
      .sort({ createdAt: -1 });
  }

  /**
   * Create a new visa offering
   */
  async createVisa(visaData, req = null) {
    // 1. Resolve Country
    let countryDoc = null;
    const targetCountryRef = visaData.countryId || visaData.country;
    if (targetCountryRef) {
      const safeCountryId = escapeRegex(String(targetCountryRef));
      countryDoc = await Country.findOne({
        $or: [
          ...(mongoose.Types.ObjectId.isValid(targetCountryRef) ? [{ _id: targetCountryRef }] : []),
          { slug: String(targetCountryRef).toLowerCase() },
          { name: { $regex: new RegExp(`^${safeCountryId}$`, 'i') } }
        ]
      });
    }

    if (!countryDoc && visaData.countryName) {
      const safeCountryName = escapeRegex(String(visaData.countryName));
      countryDoc = await Country.findOne({
        name: { $regex: new RegExp(`^${safeCountryName}$`, 'i') }
      });
    }

    if (!countryDoc) {
      throw ApiError.badRequest(`Destination country reference '${visaData.countryId || visaData.countryName}' could not be resolved`);
    }

    // 2. Parse and validate pricing (Strictly database driven: missing -> 0)
    let govFee = Number(visaData.governmentFee);
    let svcFee = Number(visaData.serviceFee);

    if (isNaN(govFee) || govFee < 0) govFee = 0;
    if (isNaN(svcFee) || svcFee < 0) svcFee = 0;

    const countryName = countryDoc.name;
    const visaType = visaData.visaType || 'Tourist Visa';
    const stayPeriod = visaData.stayPeriod || visaData.validity || '30 Days';
    const title = visaData.title || `${countryName} ${visaType}`;

    const baseSlug = visaData.slug
      ? generateSlug(visaData.slug)
      : generateSlug(`${countryDoc.slug}-${stayPeriod}-${visaType}`);

    let uniqueSlug = baseSlug;
    let counter = 1;
    while (await Visa.findOne({ slug: uniqueSlug })) {
      uniqueSlug = `${baseSlug}-${counter++}`;
    }

    const rawDocs = Array.isArray(visaData.requiredDocuments) && visaData.requiredDocuments.length > 0
      ? visaData.requiredDocuments
      : Array.isArray(visaData.documents) && visaData.documents.length > 0
      ? visaData.documents
      : Array.isArray(visaData.documentsRequired) && visaData.documentsRequired.length > 0
      ? visaData.documentsRequired
      : ['Passport Front & Back Scan', 'Passport Size Photo'];
    const processedDocs = rawDocs.map(normalizeDocRequirementItem).filter(Boolean);

    const visa = await Visa.create({
      country: countryDoc._id,
      slug: uniqueSlug,
      title,
      displayName: visaData.displayName || countryName,
      visaType,
      description: visaData.description || `Explore ${countryName} with fast online ${visaType} processing.`,
      shortDescription: visaData.shortDescription || visaData.description || '',
      stayPeriod,
      validity: visaData.validity || '90 Days',
      entryType: visaData.entryType || 'Single Entry',
      processingTime: visaData.processingTime || '3–5 Days',
      governmentFee: govFee,
      serviceFee: svcFee,
      currency: visaData.currency || 'INR',
      documentCategory: visaData.documentCategory || 'Only Passport',
      documentsSummary: visaData.documentsSummary || 'Passport, Photograph',
      travelPurpose: visaData.travelPurpose || 'Tourism',
      requiredDocuments: processedDocs.length > 0 ? processedDocs : ['Passport Front & Back Scan', 'Passport Size Photo'],
      faqs: Array.isArray(visaData.faqs) ? visaData.faqs : [],
      image: visaData.image || countryDoc.image,
      guaranteedDate: visaData.guaranteedDate || '',
      isActive: visaData.status === 'INACTIVE' ? false : visaData.isActive !== false
    });

    await auditService.log({
      action: AUDIT_ACTIONS.CREATE,
      entity: AUDIT_ENTITIES.VISA,
      entityId: visa._id,
      newValues: visa.toJSON(),
      req
    });

    return Visa.findById(visa._id).populate('country', 'name displayName slug code flagEmoji flagUrl image');
  }

  /**
   * Update an existing visa
   */
  async updateVisa(id, updates, req = null) {
    const visa = await this.getVisaById(id);
    if (!visa) throw ApiError.notFound(`Visa '${id}' not found`);

    const previous = visa.toJSON();
    let priceChanged = false;

    if (updates.countryId || updates.country) {
      const cId = updates.countryId || updates.country;
      const countryDoc = await Country.findOne({
        $or: [
          ...(mongoose.Types.ObjectId.isValid(cId) ? [{ _id: cId }] : []),
          { slug: String(cId).toLowerCase() },
          { name: { $regex: new RegExp(`^${escapeRegex(String(cId))}$`, 'i') } }
        ]
      });
      if (countryDoc) {
        visa.country = countryDoc._id;
      }
    }

    if (updates.slug) {
      const newSlug = generateSlug(updates.slug);
      if (newSlug && newSlug !== visa.slug) {
        const existing = await Visa.findOne({ slug: newSlug, _id: { $ne: visa._id } });
        if (existing) {
          throw ApiError.conflict(`A visa with slug '${newSlug}' already exists`);
        }
        visa.slug = newSlug;
      }
    }

    if (updates.title) visa.title = updates.title.trim();
    if (updates.displayName) visa.displayName = updates.displayName.trim();
    if (updates.visaType) visa.visaType = updates.visaType;
    if (updates.description !== undefined) visa.description = updates.description.trim();
    if (updates.shortDescription !== undefined) visa.shortDescription = updates.shortDescription.trim();
    if (updates.stayPeriod) visa.stayPeriod = updates.stayPeriod;
    if (updates.validity) visa.validity = updates.validity;
    if (updates.entryType) visa.entryType = updates.entryType;
    if (updates.processingTime) visa.processingTime = updates.processingTime;
    if (updates.image !== undefined) visa.image = updates.image.trim();
    if (updates.guaranteedDate !== undefined) visa.guaranteedDate = updates.guaranteedDate;
    if (updates.documentCategory) visa.documentCategory = updates.documentCategory;
    if (updates.documentsSummary) visa.documentsSummary = updates.documentsSummary;

    if (Array.isArray(updates.requiredDocuments)) {
      visa.requiredDocuments = updates.requiredDocuments.map(normalizeDocRequirementItem).filter(Boolean);
    } else if (Array.isArray(updates.documents)) {
      visa.requiredDocuments = updates.documents.map(normalizeDocRequirementItem).filter(Boolean);
    } else if (Array.isArray(updates.documentsRequired)) {
      visa.requiredDocuments = updates.documentsRequired.map(normalizeDocRequirementItem).filter(Boolean);
    }

    if (Array.isArray(updates.faqs)) {
      visa.faqs = updates.faqs;
    }

    // Pricing update logic (Strictly database driven: missing -> 0)
    if (updates.governmentFee !== undefined) {
      const newGov = Number(updates.governmentFee);
      const cleanGov = !isNaN(newGov) && newGov >= 0 ? newGov : 0;
      if (visa.governmentFee !== cleanGov) priceChanged = true;
      visa.governmentFee = cleanGov;
    }

    if (updates.serviceFee !== undefined) {
      const newSvc = Number(updates.serviceFee);
      const cleanSvc = !isNaN(newSvc) && newSvc >= 0 ? newSvc : 0;
      if (visa.serviceFee !== cleanSvc) priceChanged = true;
      visa.serviceFee = cleanSvc;
    }

    if (updates.status !== undefined) {
      visa.isActive = updates.status === 'ACTIVE';
    } else if (updates.isActive !== undefined) {
      visa.isActive = Boolean(updates.isActive);
    }

    await visa.save();

    await auditService.log({
      action: priceChanged ? AUDIT_ACTIONS.PRICE_UPDATE : AUDIT_ACTIONS.UPDATE,
      entity: AUDIT_ENTITIES.VISA,
      entityId: visa._id,
      previousValues: previous,
      newValues: visa.toJSON(),
      req
    });

    return Visa.findById(visa._id).populate('country', 'name displayName slug code flagEmoji flagUrl image');
  }

  /**
   * Toggle active/inactive status
   */
  async toggleVisaStatus(id, req = null) {
    const visa = await this.getVisaById(id);
    if (!visa) throw ApiError.notFound(`Visa '${id}' not found`);
    return this.updateVisa(id, { isActive: !visa.isActive }, req);
  }

  /**
   * Soft-delete visa
   */
  async deleteVisa(id, req = null) {
    const visa = await this.getVisaById(id);
    if (!visa) throw ApiError.notFound(`Visa '${id}' not found`);

    visa.isDeleted = true;
    visa.isActive = false;
    await visa.save();

    await auditService.log({
      action: AUDIT_ACTIONS.DELETE,
      entity: AUDIT_ENTITIES.VISA,
      entityId: visa._id,
      req
    });

    return true;
  }
}

export const visaService = new VisaService();
export default visaService;
