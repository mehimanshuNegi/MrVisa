import mongoose from 'mongoose';
import { DummyTicketRequest } from '../models/DummyTicketRequest.js';
import { ApiError } from '../utils/apiError.js';
import { auditService } from './audit.service.js';
import { AUDIT_ACTIONS, AUDIT_ENTITIES } from '../constants/statuses.js';

function escapeRegex(string) {
  return string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

class DummyTicketRequestService {
  /**
   * Create a new Dummy Ticket customer request
   */
  async createRequest(data, user = null, req = null) {
    if (!data.flight || !data.flight.from || !data.flight.to || !data.flight.departureDate) {
      throw ApiError.badRequest('Flight details (from, to, departure date) are required');
    }

    if (data.tripType === 'Return' && !data.flight.returnDate) {
      throw ApiError.badRequest('Return date is required for round-trip flights');
    }

    if (!data.contact || !data.contact.phone || !data.contact.email) {
      throw ApiError.badRequest('Contact phone and email are required');
    }

    if (!Array.isArray(data.travellers) || data.travellers.length === 0) {
      throw ApiError.badRequest('At least one traveller is required');
    }

    // Auto-generate stable, clean Request ID: DT-YYYY-XXXXX
    const year = new Date().getFullYear();
    const randomSuffix = Math.floor(10000 + Math.random() * 90000);
    let requestId = `DT-${year}-${randomSuffix}`;
    while (await DummyTicketRequest.findOne({ requestId })) {
      requestId = `DT-${year}-${Math.floor(10000 + Math.random() * 90000)}`;
    }

    const price = Number(data.price) > 0 ? Number(data.price) : 499;

    const request = await DummyTicketRequest.create({
      requestId,
      user: user?._id || user?.id || null,
      service: data.serviceId || null,
      serviceTitle: data.serviceTitle || 'Verified Flight Reservation',
      tripType: data.tripType === 'Return' ? 'Return' : 'One Way',
      travellers: data.travellers.map((t) => ({
        title: t.title || 'Mr',
        firstName: String(t.firstName || '').trim(),
        lastName: String(t.lastName || '').trim(),
        dateOfBirth: String(t.dateOfBirth || '').trim(),
        nationality: String(t.nationality || 'Indian').trim()
      })),
      contact: {
        dialCode: String(data.contact.dialCode || '+91').trim(),
        phone: String(data.contact.phone || '').trim(),
        email: String(data.contact.email || '').trim().toLowerCase()
      },
      flight: {
        from: String(data.flight.from || '').trim(),
        to: String(data.flight.to || '').trim(),
        departureDate: String(data.flight.departureDate || '').trim(),
        returnDate: data.tripType === 'Return' ? String(data.flight.returnDate || '').trim() : ''
      },
      purpose: String(data.purpose || 'Visa Application').trim(),
      message: String(data.message || '').trim(),
      requiredDate: String(data.requiredDate || '').trim(),
      deliveryMethod: ['WhatsApp', 'Email', 'Both'].includes(data.deliveryMethod) ? data.deliveryMethod : 'WhatsApp',
      price,
      currency: data.currency || 'INR',
      status: 'New',
      adminNotes: '',
      isDeleted: false
    });

    await auditService.log({
      action: AUDIT_ACTIONS.CREATE,
      entity: AUDIT_ENTITIES.APPLICATION,
      entityId: request._id,
      newValues: { requestId, route: `${request.flight.from} -> ${request.flight.to}` },
      req
    });

    return request;
  }

  /**
   * Fetch all dummy ticket requests for Admin dashboard
   */
  async getAllRequests({
    status = 'ALL',
    query = '',
    page = 1,
    limit = 50,
    includeDeleted = false
  } = {}) {
    const filter = {};
    if (!includeDeleted) filter.isDeleted = false;

    if (status && status !== 'ALL' && status !== 'All') {
      filter.status = status;
    }

    if (query) {
      const q = escapeRegex(query.trim());
      filter.$or = [
        { requestId: { $regex: q, $options: 'i' } },
        { 'contact.email': { $regex: q, $options: 'i' } },
        { 'contact.phone': { $regex: q, $options: 'i' } },
        { 'flight.from': { $regex: q, $options: 'i' } },
        { 'flight.to': { $regex: q, $options: 'i' } },
        { 'travellers.firstName': { $regex: q, $options: 'i' } },
        { 'travellers.lastName': { $regex: q, $options: 'i' } }
      ];
    }

    const skip = (Math.max(1, page) - 1) * limit;
    const [requests, total] = await Promise.all([
      DummyTicketRequest.find(filter)
        .populate('user', 'name email phone')
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit),
      DummyTicketRequest.countDocuments(filter)
    ]);

    return {
      items: requests,
      pagination: {
        page: Number(page),
        limit: Number(limit),
        total,
        totalPages: Math.ceil(total / limit) || 1
      }
    };
  }

  /**
   * Fetch requests for a customer
   */
  async getMyRequests(userId, email = null) {
    const query = { isDeleted: false };
    if (userId && mongoose.Types.ObjectId.isValid(userId)) {
      if (email) {
        query.$or = [{ user: userId }, { 'contact.email': String(email).trim().toLowerCase() }];
      } else {
        query.user = userId;
      }
    } else if (email) {
      query['contact.email'] = String(email).trim().toLowerCase();
    } else {
      return [];
    }

    return DummyTicketRequest.find(query).sort({ createdAt: -1 });
  }

  /**
   * Find by ID or requestId
   */
  async getRequestById(idOrRequestId) {
    if (!idOrRequestId) return null;
    const clean = String(idOrRequestId).trim();

    let query;
    if (mongoose.Types.ObjectId.isValid(clean)) {
      query = { _id: clean, isDeleted: false };
    } else {
      query = { requestId: clean.toUpperCase(), isDeleted: false };
    }

    return DummyTicketRequest.findOne(query).populate('user', 'name email phone');
  }

  /**
   * Update request status & admin notes
   */
  async updateRequestStatus(id, { status, adminNotes }, req = null) {
    const request = await this.getRequestById(id);
    if (!request) throw ApiError.notFound(`Dummy Ticket Request '${id}' not found`);

    const validStatuses = ['New', 'Under Review', 'Processing', 'Ready', 'Completed', 'Cancelled'];
    if (status && !validStatuses.includes(status)) {
      throw ApiError.badRequest(`Invalid status '${status}'. Must be one of: ${validStatuses.join(', ')}`);
    }

    const prev = request.toJSON();
    if (status) request.status = status;
    if (adminNotes !== undefined) request.adminNotes = String(adminNotes).trim();

    await request.save();

    await auditService.log({
      action: AUDIT_ACTIONS.STATUS_CHANGE,
      entity: AUDIT_ENTITIES.APPLICATION,
      entityId: request._id,
      previousValues: { status: prev.status },
      newValues: { status: request.status, adminNotes: request.adminNotes },
      req
    });

    return request;
  }

  /**
   * Soft-delete request
   */
  async deleteRequest(id, req = null) {
    const request = await this.getRequestById(id);
    if (!request) throw ApiError.notFound(`Dummy Ticket Request '${id}' not found`);

    request.isDeleted = true;
    await request.save();

    await auditService.log({
      action: AUDIT_ACTIONS.DELETE,
      entity: AUDIT_ENTITIES.APPLICATION,
      entityId: request._id,
      req
    });

    return true;
  }
}

export const dummyTicketRequestService = new DummyTicketRequestService();
export default dummyTicketRequestService;
