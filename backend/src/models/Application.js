import mongoose from 'mongoose';
import { APPLICATION_STATUS, REQUIRED_ACTION, PAYMENT_STATUS } from '../constants/statuses.js';

const travellerSchema = new mongoose.Schema(
  {
    travellerId: {
      type: String,
      required: true,
      default: () => `trav_${Math.random().toString(36).substr(2, 9)}`
    },
    firstName: {
      type: String,
      trim: true,
      default: ''
    },
    lastName: {
      type: String,
      trim: true,
      default: ''
    },
    name: {
      type: String,
      trim: true,
      required: true
    },
    email: {
      type: String,
      trim: true,
      lowercase: true,
      default: ''
    },
    phone: {
      type: String,
      trim: true,
      default: ''
    },
    passportNumber: {
      type: String,
      trim: true,
      default: ''
    },
    placeOfIssue: {
      type: String,
      trim: true,
      default: ''
    },
    issueDate: {
      type: String,
      trim: true,
      default: ''
    },
    expiryDate: {
      type: String,
      trim: true,
      default: ''
    },
    nationality: {
      type: String,
      trim: true,
      default: 'Indian'
    },
    dob: {
      type: String,
      trim: true,
      default: ''
    },
    gender: {
      type: String,
      trim: true,
      default: 'Male'
    }
  },
  { _id: false }
);

const pricingSnapshotSchema = new mongoose.Schema(
  {
    governmentFee: {
      type: Number,
      required: true,
      min: 0
    },
    serviceFee: {
      type: Number,
      required: true,
      min: 0
    },
    totalAmountPerPerson: {
      type: Number,
      required: true,
      min: 0
    },
    travellerCount: {
      type: Number,
      required: true,
      min: 1
    },
    totalAmount: {
      type: Number,
      required: true,
      min: 0
    },
    currency: {
      type: String,
      default: 'INR',
      uppercase: true
    }
  },
  { _id: false }
);

const timelineEventSchema = new mongoose.Schema(
  {
    stage: {
      type: String,
      required: true
    },
    completed: {
      type: Boolean,
      default: false
    },
    current: {
      type: Boolean,
      default: false
    },
    timestamp: {
      type: String,
      default: () => new Date().toISOString()
    },
    note: {
      type: String
    }
  },
  { _id: false }
);

const applicationSchema = new mongoose.Schema(
  {
    referenceNumber: {
      type: String,
      required: true,
      unique: true,
      uppercase: true,
      trim: true,
      index: true
    },
    customer: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      index: true
    },
    visa: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Visa',
      required: [true, 'Visa reference is required'],
      index: true
    },
    country: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Country',
      required: [true, 'Country reference is required'],
      index: true
    },
    // Permanent pricing snapshot created at submission time
    pricingSnapshot: {
      type: pricingSnapshotSchema,
      required: true
    },
    travellers: {
      type: [travellerSchema],
      required: true,
      validate: [(val) => val.length > 0, 'At least one traveller is required']
    },
    status: {
      type: String,
      enum: Object.values(APPLICATION_STATUS),
      default: APPLICATION_STATUS.APPLICATION_RECEIVED,
      index: true
    },
    requiredAction: {
      type: String,
      enum: Object.values(REQUIRED_ACTION),
      default: REQUIRED_ACTION.NONE,
      index: true
    },
    paymentStatus: {
      type: String,
      enum: Object.values(PAYMENT_STATUS),
      default: PAYMENT_STATUS.PENDING,
      index: true
    },
    adminMessage: {
      type: String,
      default: 'Application received and securely registered with consulate queue.',
      trim: true
    },
    adminNotes: {
      type: String,
      default: '',
      trim: true
    },
    expectedCompletionDate: {
      type: String,
      default: ''
    },
    visaDetails: {
      docNumber: { type: String, default: '' },
      validUntil: { type: String, default: '' },
      entryType: { type: String, default: '' },
      issuedAt: { type: Date },
      downloadUrl: { type: String, default: '' }
    },
    timeline: {
      type: [timelineEventSchema],
      default: () => [
        { stage: 'Application Submitted', completed: true, current: false, timestamp: new Date().toISOString() },
        { stage: 'Documents Verified', completed: false, current: true, timestamp: '' },
        { stage: 'Application Processing', completed: false, current: false, timestamp: '' },
        { stage: 'Visa Issued', completed: false, current: false, timestamp: '' }
      ]
    },
    isDeleted: {
      type: Boolean,
      default: false,
      index: true
    }
  },
  {
    timestamps: true,
    toJSON: {
      virtuals: true,
      transform: (doc, ret, options = {}) => {
        ret.id = ret.referenceNumber;
        ret.applicationId = ret.referenceNumber;
        ret.amountPaid = `₹${(ret.pricingSnapshot?.totalAmount || 0).toLocaleString('en-IN')}`;
        ret.amount = ret.amountPaid;
        ret.travellerCount = ret.travellers?.length || ret.pricingSnapshot?.travellerCount || 1;
        ret.submittedDate = doc.createdAt
          ? new Date(doc.createdAt).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })
          : '';
        ret.submittedAt = doc.createdAt ? doc.createdAt.toISOString() : '';
        delete ret.__v;
        if (options?.role !== 'ADMIN' && !options?.isAdmin) {
          delete ret.adminNotes;
        }
        return ret;
      }
    }
  }
);

// Compound indexes for optimal customer dashboard and admin queue query performance
applicationSchema.index({ customer: 1, createdAt: -1 });
applicationSchema.index({ status: 1, createdAt: -1 });

// Virtual for attached documents
applicationSchema.virtual('documents', {
  ref: 'Document',
  localField: '_id',
  foreignField: 'application'
});

export const Application = mongoose.model('Application', applicationSchema);
export default Application;
