import mongoose from 'mongoose';
import { AUDIT_ACTIONS, AUDIT_ENTITIES } from '../constants/statuses.js';

const auditLogSchema = new mongoose.Schema(
  {
    actor: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      index: true
    },
    actorEmail: {
      type: String,
      default: 'system'
    },
    actorRole: {
      type: String,
      default: 'SYSTEM'
    },
    action: {
      type: String,
      enum: Object.values(AUDIT_ACTIONS),
      required: true,
      index: true
    },
    entity: {
      type: String,
      enum: Object.values(AUDIT_ENTITIES),
      required: true,
      index: true
    },
    entityId: {
      type: String,
      required: true,
      index: true
    },
    previousValues: {
      type: mongoose.Schema.Types.Mixed,
      default: null
    },
    newValues: {
      type: mongoose.Schema.Types.Mixed,
      default: null
    },
    ipAddress: {
      type: String,
      default: ''
    },
    userAgent: {
      type: String,
      default: ''
    }
  },
  {
    timestamps: true
  }
);

export const AuditLog = mongoose.model('AuditLog', auditLogSchema);
export default AuditLog;
