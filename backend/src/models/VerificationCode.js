import mongoose from 'mongoose';

const verificationCodeSchema = new mongoose.Schema(
  {
    target: {
      type: String,
      required: true,
      trim: true,
      index: true
    },
    type: {
      type: String,
      required: true,
      enum: ['EMAIL', 'PHONE'],
      index: true
    },
    codeHash: {
      type: String,
      required: true
    },
    verificationToken: {
      type: String,
      default: '',
      index: true
    },
    status: {
      type: String,
      enum: ['PENDING', 'VERIFIED', 'EXPIRED', 'MAX_ATTEMPTS'],
      default: 'PENDING'
    },
    attempts: {
      type: Number,
      default: 0
    },
    lastSentAt: {
      type: Date,
      default: Date.now
    },
    expiresAt: {
      type: Date,
      required: true,
      index: { expires: '2h' } // Automatically purge after 2 hours
    },
    verifiedAt: {
      type: Date,
      default: null
    }
  },
  {
    timestamps: true
  }
);

verificationCodeSchema.index({ target: 1, type: 1 });

export const VerificationCode = mongoose.model('VerificationCode', verificationCodeSchema);
export default VerificationCode;
