import mongoose from 'mongoose';

const requestedDocumentSchema = new mongoose.Schema(
  {
    documentType: {
      type: String,
      required: true,
      trim: true
    },
    name: {
      type: String,
      required: true,
      trim: true
    },
    originalFilename: {
      type: String,
      trim: true
    },
    storageKey: {
      type: String,
      required: true,
      trim: true
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
      enum: ['PENDING', 'VERIFIED', 'REJECTED'],
      default: 'PENDING'
    }
  },
  { _id: true }
);

const documentationRequestSchema = new mongoose.Schema(
  {
    requestId: {
      type: String,
      required: true,
      unique: true,
      uppercase: true,
      trim: true,
      index: true
    },
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      default: null,
      index: true
    },
    service: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'DocumentationService',
      default: null,
      index: true
    },
    serviceTitle: {
      type: String,
      required: true,
      trim: true
    },
    serviceSlug: {
      type: String,
      required: true,
      trim: true,
      lowercase: true,
      index: true
    },
    applicant: {
      name: {
        type: String,
        required: [true, 'Applicant name is required'],
        trim: true
      },
      email: {
        type: String,
        required: [true, 'Applicant email is required'],
        trim: true,
        lowercase: true
      },
      phone: {
        type: String,
        required: [true, 'Applicant phone is required'],
        trim: true
      }
    },
    details: {
      type: mongoose.Schema.Types.Mixed,
      default: {}
    },
    documents: {
      type: [requestedDocumentSchema],
      default: []
    },
    price: {
      type: Number,
      default: 999,
      min: 0
    },
    currency: {
      type: String,
      default: 'INR',
      uppercase: true
    },
    status: {
      type: String,
      enum: ['PENDING', 'IN_REVIEW', 'PROCESSING', 'COMPLETED', 'REJECTED'],
      default: 'PENDING',
      index: true
    },
    adminNotes: {
      type: String,
      default: '',
      trim: true
    }
  },
  {
    timestamps: true,
    toJSON: {
      virtuals: true,
      transform: (_, ret) => {
        ret.id = ret._id.toString();
        return ret;
      }
    }
  }
);

export const DocumentationRequest = mongoose.model('DocumentationRequest', documentationRequestSchema);
export default DocumentationRequest;
