import mongoose from 'mongoose';
import { DummyTicketService } from '../models/DummyTicketService.js';
import { ApiError } from '../utils/apiError.js';
import { auditService } from './audit.service.js';
import { AUDIT_ACTIONS, AUDIT_ENTITIES } from '../constants/statuses.js';
import { generateSlug } from './country.service.js';
import { escapeRegex } from '../utils/sanitize.js';

class DummyTicketServicesService {
  /**
   * Fetch all dummy ticket packages/services
   */
  async getAllServices({
    query = '',
    status = 'ALL',
    page = 1,
    limit = 50,
    includeDeleted = false
  } = {}) {
    const filter = {};
    if (!includeDeleted) filter.isDeleted = false;

    if (status === 'ACTIVE') filter.isActive = true;
    if (status === 'INACTIVE') filter.isActive = false;

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
      DummyTicketService.find(filter)
        .sort({ displayOrder: 1, createdAt: 1 })
        .skip(skip)
        .limit(limit),
      DummyTicketService.countDocuments(filter)
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
   * Find dummy ticket service by ID or slug
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

    return DummyTicketService.findOne(query);
  }

  /**
   * Create a new dummy ticket service offering
   */
  async createService(data, req = null) {
    const title = String(data.title || '').trim();
    if (!title) throw ApiError.badRequest('Service title is required');

    const baseSlug = data.slug ? generateSlug(data.slug) : generateSlug(title);
    let uniqueSlug = baseSlug || `dummy-ticket-${Date.now().toString(36)}`;
    let counter = 1;
    while (await DummyTicketService.findOne({ slug: uniqueSlug })) {
      uniqueSlug = `${baseSlug}-${counter++}`;
    }

    let price = Number(data.price);
    if (isNaN(price)) {
      const raw = String(data.price || '499').replace(/[^0-9]/g, '');
      price = parseInt(raw, 10) || 499;
    }

    const service = await DummyTicketService.create({
      title,
      slug: uniqueSlug,
      shortDescription: data.shortDescription || '',
      description: data.description || '',
      price,
      currency: data.currency || 'INR',
      type: data.type || 'Round Trip / Onward Reservation',
      deliveryTime: data.deliveryTime || '10–30 Minutes',
      validity: data.validity || '2–3 Weeks (Live PNR Verifiable)',
      icon: data.icon || 'Plane',
      features: Array.isArray(data.features) && data.features.length > 0
        ? data.features
        : [
            'Live 6-character airline PNR code',
            'Directly verifiable on airline website',
            'Embassy & consulate visa compliant',
            'Delivered instantly via WhatsApp and Email',
            'Free date modification if visa delayed'
          ],
      displayOrder: Number(data.displayOrder) || 0,
      isActive: data.status === 'INACTIVE' ? false : data.isActive !== false
    });

    await auditService.log({
      action: AUDIT_ACTIONS.CREATE,
      entity: AUDIT_ENTITIES.DUMMY_TICKET_SERVICE,
      entityId: service._id,
      newValues: service.toJSON(),
      req
    });

    return service;
  }

  /**
   * Update an existing dummy ticket service
   */
  async updateService(id, updates, req = null) {
    const service = await this.getServiceById(id);
    if (!service) throw ApiError.notFound(`Dummy ticket service '${id}' not found`);

    const previous = service.toJSON();

    if (updates.slug) {
      const newSlug = generateSlug(updates.slug);
      if (newSlug && newSlug !== service.slug) {
        const existing = await DummyTicketService.findOne({ slug: newSlug, _id: { $ne: service._id } });
        if (existing) {
          throw ApiError.conflict(`A dummy ticket service with slug '${newSlug}' already exists`);
        }
        service.slug = newSlug;
      }
    }

    if (updates.title) service.title = updates.title.trim();
    if (updates.shortDescription !== undefined) service.shortDescription = updates.shortDescription.trim();
    if (updates.description !== undefined) service.description = updates.description.trim();
    if (updates.type !== undefined) service.type = updates.type.trim();
    if (updates.deliveryTime !== undefined) service.deliveryTime = updates.deliveryTime.trim();
    if (updates.validity !== undefined) service.validity = updates.validity.trim();
    if (updates.icon !== undefined) service.icon = updates.icon.trim();
    if (updates.currency) service.currency = updates.currency.trim().toUpperCase();
    if (updates.displayOrder !== undefined) service.displayOrder = Number(updates.displayOrder);

    if (Array.isArray(updates.features)) {
      service.features = updates.features.map(f => String(f).trim()).filter(Boolean);
    }

    if (updates.price !== undefined) {
      const raw = String(updates.price).replace(/[^0-9]/g, '');
      const parsed = parseInt(raw, 10);
      if (!isNaN(parsed) && parsed >= 0) service.price = parsed;
    }

    if (updates.status !== undefined) {
      service.isActive = updates.status === 'ACTIVE';
    } else if (updates.isActive !== undefined) {
      service.isActive = Boolean(updates.isActive);
    }

    await service.save();

    await auditService.log({
      action: AUDIT_ACTIONS.UPDATE,
      entity: AUDIT_ENTITIES.DUMMY_TICKET_SERVICE,
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
    if (!service) throw ApiError.notFound(`Dummy ticket service '${id}' not found`);
    return this.updateService(id, { isActive: !service.isActive }, req);
  }

  /**
   * Soft-delete dummy ticket service
   */
  async deleteService(id, req = null) {
    const service = await this.getServiceById(id);
    if (!service) throw ApiError.notFound(`Dummy ticket service '${id}' not found`);

    service.isDeleted = true;
    service.isActive = false;
    await service.save();

    await auditService.log({
      action: AUDIT_ACTIONS.DELETE,
      entity: AUDIT_ENTITIES.DUMMY_TICKET_SERVICE,
      entityId: service._id,
      req
    });

    return true;
  }
}

export const dummyTicketService = new DummyTicketServicesService();
export default dummyTicketService;
