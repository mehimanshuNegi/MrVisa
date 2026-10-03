import { AuditLog } from '../models/AuditLog.js';
import { logger } from '../utils/logger.js';

class AuditService {
  /**
   * Records an audit log event
   */
  async log({
    actor = null,
    actorEmail = 'system',
    actorRole = 'SYSTEM',
    action,
    entity,
    entityId,
    previousValues = null,
    newValues = null,
    req = null
  }) {
    try {
      const ipAddress = req?.ip || req?.headers?.['x-forwarded-for'] || '';
      const userAgent = req?.headers?.['user-agent'] || '';

      const logEntry = await AuditLog.create({
        actor: actor || (req?.user?._id ?? null),
        actorEmail: req?.user?.email || actorEmail || 'system',
        actorRole: req?.user?.role || actorRole || 'SYSTEM',
        action,
        entity,
        entityId: String(entityId),
        previousValues,
        newValues,
        ipAddress,
        userAgent
      });

      return logEntry;
    } catch (err) {
      // Audit log failures should not crash user-facing requests, but should be reported
      logger.error('Failed to create audit log entry:', { error: err.message, action, entity, entityId });
      return null;
    }
  }

  /**
   * Retrieves audit trail for a specific entity
   */
  async getAuditTrail({ entity, entityId, limit = 50 }) {
    return AuditLog.find({ entity, entityId })
      .sort({ createdAt: -1 })
      .limit(limit)
      .populate('actor', 'name email role');
  }
}

export const auditService = new AuditService();
export default auditService;
