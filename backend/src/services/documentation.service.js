import mongoose from 'mongoose';
import { DocumentationService } from '../models/DocumentationService.js';
import { ApiError } from '../utils/apiError.js';
import { auditService } from './audit.service.js';
import { AUDIT_ACTIONS, AUDIT_ENTITIES } from '../constants/statuses.js';
import { generateSlug } from './country.service.js';
import { escapeRegex } from '../utils/sanitize.js';

class DocumentationServicesService {
  /**
   * Fetch all documentation services with filtering, search, and pagination
   */
  async getAllServices({
    query = '',
    category = '',
    status = 'ALL',
    page = 1,
    limit = 50,
    includeDeleted = false
  } = {}) {
    const filter = {};
    if (!includeDeleted) filter.isDeleted = false;

    if (status === 'ACTIVE') filter.isActive = true;
    if (status === 'INACTIVE') filter.isActive = false;

    if (category) {
      filter.category = { $regex: new RegExp(`^${escapeRegex(category)}$`, 'i') };
    }

    if (query) {
      const q = escapeRegex(query.trim());
      filter.$or = [
        { title: { $regex: q, $options: 'i' } },
        { slug: { $regex: q, $options: 'i' } },
        { shortDescription: { $regex: q, $options: 'i' } },
        { description: { $regex: q, $options: 'i' } }
      ];
    }

    const skip = (Math.max(1, page) - 1) * limit;
    const [services, total] = await Promise.all([
      DocumentationService.find(filter)
        .sort({ displayOrder: 1, createdAt: 1 })
        .skip(skip)
        .limit(limit),
      DocumentationService.countDocuments(filter)
    ]);

    return {
      items: services,
      pagination: {
        page: Number(page),
        limit: Number(limit),
        total,
        totalPages: Math.ceil(total / limit) || 1
      }
    };
  }

  /**
   * Find documentation service by ID or slug
   */
  async getServiceById(idOrSlug) {
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
          { title: { $regex: `^${safeClean}$`, $options: 'i' } }
        ],
        isDeleted: false
      };
    }

    return DocumentationService.findOne(query);
  }

  /**
   * Create a new documentation service offering
   */
  async createService(data, req = null) {
    const title = String(data.title || '').trim();
    if (!title) throw ApiError.badRequest('Service title is required');

    const baseSlug = data.slug ? generateSlug(data.slug) : generateSlug(title);
    let uniqueSlug = baseSlug || `service-${Date.now().toString(36)}`;
    let counter = 1;
    while (await DocumentationService.findOne({ slug: uniqueSlug })) {
      uniqueSlug = `${baseSlug}-${counter++}`;
    }

    let govFee = Number(data.governmentFee || 0);
    let svcFee = Number(data.serviceFee || 0);
    if (data.price !== undefined && isNaN(svcFee)) {
      const raw = String(data.price).replace(/[^0-9]/g, '');
      svcFee = parseInt(raw, 10) || 0;
    }

    const service = await DocumentationService.create({
      title,
      slug: uniqueSlug,
      category: data.category || 'Business & Tax Compliance',
      shortDescription: data.shortDescription || '',
      description: data.description || '',
      icon: data.icon || 'FileText',
      image: data.image || '',
      features: Array.isArray(data.features) ? data.features : [],
      requiredDocuments: Array.isArray(data.requirements) && data.requirements.length > 0
        ? data.requirements.map(r => typeof r === 'string' ? r : r.title).filter(Boolean)
        : (Array.isArray(data.requiredDocuments) ? data.requiredDocuments : []),
      requirements: Array.isArray(data.requirements) ? data.requirements : [],
      conditionPrompt: data.conditionPrompt || '',
      conditionOptions: Array.isArray(data.conditionOptions) ? data.conditionOptions : [],
      deliverablesHeader: data.deliverablesHeader || 'What NimuFly prepares for you',
      deliverables: Array.isArray(data.deliverables) ? data.deliverables : [],
      processingTime: data.processingTime || '2–4 Business Days',
      governmentFee: govFee,
      serviceFee: svcFee,
      currency: data.currency || 'INR',
      displayOrder: Number(data.displayOrder) || 0,
      isActive: data.status === 'INACTIVE' ? false : data.isActive !== false
    });

    await auditService.log({
      action: AUDIT_ACTIONS.CREATE,
      entity: AUDIT_ENTITIES.DOCUMENTATION_SERVICE,
      entityId: service._id,
      newValues: service.toJSON(),
      req
    });

    return service;
  }

  /**
   * Update an existing documentation service
   */
  async updateService(id, updates, req = null) {
    const service = await this.getServiceById(id);
    if (!service) throw ApiError.notFound(`Documentation service '${id}' not found`);

    const previous = service.toJSON();

    if (updates.slug) {
      const newSlug = generateSlug(updates.slug);
      if (newSlug && newSlug !== service.slug) {
        const existing = await DocumentationService.findOne({ slug: newSlug, _id: { $ne: service._id } });
        if (existing) {
          throw ApiError.conflict(`A documentation service with slug '${newSlug}' already exists`);
        }
        service.slug = newSlug;
      }
    }

    if (updates.title) service.title = updates.title.trim();
    if (updates.category !== undefined) service.category = updates.category.trim();
    if (updates.shortDescription !== undefined) service.shortDescription = updates.shortDescription.trim();
    if (updates.description !== undefined) service.description = updates.description.trim();
    if (updates.icon !== undefined) service.icon = updates.icon.trim();
    if (updates.image !== undefined) service.image = updates.image.trim();
    if (updates.processingTime !== undefined) service.processingTime = updates.processingTime.trim();
    if (updates.currency) service.currency = updates.currency.trim().toUpperCase();
    if (updates.displayOrder !== undefined) service.displayOrder = Number(updates.displayOrder);

    if (Array.isArray(updates.features)) {
      service.features = updates.features.map(f => String(f).trim()).filter(Boolean);
    }
    if (Array.isArray(updates.requirements)) {
      service.requirements = updates.requirements;
      service.requiredDocuments = updates.requirements.map(r => typeof r === 'string' ? r : r.title).filter(Boolean);
    } else if (Array.isArray(updates.requiredDocuments)) {
      service.requiredDocuments = updates.requiredDocuments.map(d => String(d).trim()).filter(Boolean);
    }
    if (updates.conditionPrompt !== undefined) {
      service.conditionPrompt = String(updates.conditionPrompt || '').trim();
    }
    if (Array.isArray(updates.conditionOptions)) {
      service.conditionOptions = updates.conditionOptions.map(o => String(o).trim()).filter(Boolean);
    }
    if (updates.deliverablesHeader !== undefined) {
      service.deliverablesHeader = String(updates.deliverablesHeader || '').trim();
    }
    if (Array.isArray(updates.deliverables)) {
      service.deliverables = updates.deliverables.map(d => String(d).trim()).filter(Boolean);
    }

    if (updates.governmentFee !== undefined) {
      const gov = Number(updates.governmentFee);
      if (!isNaN(gov) && gov >= 0) service.governmentFee = gov;
    }

    if (updates.serviceFee !== undefined) {
      const svc = Number(updates.serviceFee);
      if (!isNaN(svc) && svc >= 0) service.serviceFee = svc;
    } else if (updates.price !== undefined) {
      const raw = String(updates.price).replace(/[^0-9]/g, '');
      const parsed = parseInt(raw, 10);
      if (!isNaN(parsed) && parsed >= 0) service.serviceFee = parsed;
    }

    if (updates.status !== undefined) {
      service.isActive = updates.status === 'ACTIVE';
    } else if (updates.isActive !== undefined) {
      service.isActive = Boolean(updates.isActive);
    }

    await service.save();

    await auditService.log({
      action: AUDIT_ACTIONS.UPDATE,
      entity: AUDIT_ENTITIES.DOCUMENTATION_SERVICE,
      entityId: service._id,
      previousValues: previous,
      newValues: service.toJSON(),
      req
    });

    return service;
  }

  /**
   * Toggle active/inactive status
   */
  async toggleServiceStatus(id, req = null) {
    const service = await this.getServiceById(id);
    if (!service) throw ApiError.notFound(`Documentation service '${id}' not found`);
    return this.updateService(id, { isActive: !service.isActive }, req);
  }

  /**
   * Soft-delete documentation service
   */
  async deleteService(id, req = null) {
    const service = await this.getServiceById(id);
    if (!service) throw ApiError.notFound(`Documentation service '${id}' not found`);

    service.isDeleted = true;
    service.isActive = false;
    await service.save();

    await auditService.log({
      action: AUDIT_ACTIONS.DELETE,
      entity: AUDIT_ENTITIES.DOCUMENTATION_SERVICE,
      entityId: service._id,
      req
    });

    return true;
  }
}

export const documentationService = new DocumentationServicesService();
export default documentationService;
