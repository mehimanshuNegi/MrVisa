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
      default: ''
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

        // Dynamic format and MIME type resolution from storageKey, originalFilename, and mimeType
        const storageKey = String(ret.storageKey || '');
        const origName = String(ret.originalFilename || ret.name || '');
        const keyMatch = storageKey.match(/\.([a-zA-Z0-9]+)(?:\?.*)?$/);
        const nameMatch = origName.match(/\.([a-zA-Z0-9]+)(?:\?.*)?$/);
        const detectedExt = (keyMatch ? keyMatch[1] : (nameMatch ? nameMatch[1] : '')).toUpperCase();

        if (detectedExt === 'JPG' || detectedExt === 'JPEG') {
          ret.format = 'JPG';
          ret.fileFormat = 'JPG';
          ret.mimeType = 'image/jpeg';
        } else if (detectedExt === 'PNG') {
          ret.format = 'PNG';
          ret.fileFormat = 'PNG';
          ret.mimeType = 'image/png';
        } else if (detectedExt === 'WEBP') {
          ret.format = 'WEBP';
          ret.fileFormat = 'WEBP';
          ret.mimeType = 'image/webp';
        } else if (detectedExt === 'PDF') {
          ret.format = 'PDF';
          ret.fileFormat = 'PDF';
          ret.mimeType = 'application/pdf';
        } else if (detectedExt === 'DOC' || detectedExt === 'DOCX') {
          ret.format = detectedExt;
          ret.fileFormat = detectedExt;
          ret.mimeType = detectedExt === 'DOCX'
            ? 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
            : 'application/msword';
        } else if (ret.mimeType) {
          const m = String(ret.mimeType).toLowerCase();
          if (m.includes('png')) { ret.format = 'PNG'; ret.fileFormat = 'PNG'; }
          else if (m.includes('webp')) { ret.format = 'WEBP'; ret.fileFormat = 'WEBP'; }
          else if (m.includes('jpeg') || m.includes('jpg')) { ret.format = 'JPG'; ret.fileFormat = 'JPG'; }
          else if (m.includes('pdf')) { ret.format = 'PDF'; ret.fileFormat = 'PDF'; }
          else { ret.format = detectedExt || ''; ret.fileFormat = ret.format; }
        } else {
          ret.format = detectedExt || '';
          ret.fileFormat = ret.format;
        }

        delete ret.__v;
        return ret;
      }
    }
  }
);

export const Document = mongoose.model('Document', documentSchema);
export default Document;
