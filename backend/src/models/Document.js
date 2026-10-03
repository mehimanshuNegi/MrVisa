import mongoose from 'mongoose';
import { DOCUMENT_STATUS } from '../constants/statuses.js';

const documentSchema = new mongoose.Schema(
  {
    application: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Application',
      index: true
    },
    serviceType: {
      type: String,
      enum: ['VISA', 'DOCUMENTATION', 'DUMMY_TICKET'],
      default: 'VISA',
      index: true
    },
    serviceId: {
      type: mongoose.Schema.Types.ObjectId,
      index: true
    },
    customer: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      index: true
    },
    travellerId: {
      type: String,
      default: ''
    },
    documentType: {
      type: String,
      required: [true, 'Document type is required'],
      trim: true,
      index: true
    },
    name: {
      type: String,
      required: [true, 'Document name is required'],
      trim: true
    },
    originalFilename: {
      type: String,
      trim: true
    },
    storageKey: {
      type: String,
      required: [true, 'Storage key reference is required'],
      unique: true
    },
    mimeType: {
      type: String,
      default: 'application/pdf'
    },
    fileSize: {
      type: Number,
      default: 0
    },
    status: {
      type: String,
      enum: Object.values(DOCUMENT_STATUS),
      default: DOCUMENT_STATUS.PENDING,
      index: true
    },
    note: {
      type: String,
      default: '',
      trim: true
    },
    rejectionReason: {
      type: String,
      default: '',
      trim: true
    },
    verifiedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    },
    verifiedAt: {
      type: Date
    },
    isDeleted: {
      type: Boolean,
      default: false
    }
  },
  {
    timestamps: true,
    toJSON: {
      virtuals: true,
      transform: (_, ret) => {
        ret.id = ret._id.toString();
        ret.documentId = ret._id.toString();
        ret.verificationStatus = ret.status;
        delete ret.__v;
        return ret;
      }
    }
  }
);

export const Document = mongoose.model('Document', documentSchema);
export default Document;
