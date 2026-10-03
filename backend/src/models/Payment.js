import mongoose from 'mongoose';
import { PAYMENT_STATUS, PAYMENT_PROVIDER } from '../constants/statuses.js';

const paymentSchema = new mongoose.Schema(
  {
    application: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Application',
      required: [true, 'Application reference is required'],
      index: true
    },
    customer: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      index: true
    },
    amount: {
      type: Number,
      required: [true, 'Payment amount is required'],
      min: [0, 'Amount cannot be negative']
    },
    currency: {
      type: String,
      default: 'INR',
      uppercase: true
    },
    status: {
      type: String,
      enum: Object.values(PAYMENT_STATUS),
      default: PAYMENT_STATUS.PENDING,
      index: true
    },
    paymentProvider: {
      type: String,
      enum: Object.values(PAYMENT_PROVIDER),
      default: PAYMENT_PROVIDER.MOCK,
      index: true
    },
    providerOrderId: {
      type: String
    },
    providerPaymentId: {
      type: String,
      index: true
    },
    providerSignature: {
      type: String
    },
    paymentMethod: {
      type: String,
      enum: ['UPI', 'CARD', 'NETBANKING', 'WALLET', 'OTHER'],
      default: 'UPI'
    },
    failureReason: {
      type: String,
      default: ''
    },
    metadata: {
      type: mongoose.Schema.Types.Mixed,
      default: {}
    }
  },
  {
    timestamps: true,
    toJSON: {
      virtuals: true,
      transform: (_, ret) => {
        ret.id = ret._id.toString();
        delete ret.__v;
        return ret;
      }
    }
  }
);

// Enforce provider order ID uniqueness across payment records
paymentSchema.index({ providerOrderId: 1 }, { unique: true, sparse: true });

export const Payment = mongoose.model('Payment', paymentSchema);
export default Payment;
