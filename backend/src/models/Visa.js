import mongoose from 'mongoose';

const faqSchema = new mongoose.Schema(
  {
    q: {
      type: String,
      required: true,
      trim: true
    },
    a: {
      type: String,
      required: true,
      trim: true
    }
  },
  { _id: false }
);

const visaSchema = new mongoose.Schema(
  {
    country: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Country',
      required: [true, 'Country reference is required'],
      index: true
    },
    slug: {
      type: String,
      required: [true, 'Visa slug is required'],
      unique: true,
      lowercase: true,
      trim: true,
      index: true
    },
    title: {
      type: String,
      required: [true, 'Visa title is required'],
      trim: true
    },
    displayName: {
      type: String,
      trim: true
    },
    visaType: {
      type: String,
      required: [true, 'Visa type is required'],
      enum: ['E-Visa', 'Tourist Visa', 'Sticker Visa', 'Business Visa', 'Transit Visa', 'Arrival Card'],
      default: 'E-Visa',
      index: true
    },
    description: {
      type: String,
      default: '',
      trim: true
    },
    shortDescription: {
      type: String,
      default: '',
      trim: true
    },
    stayPeriod: {
      type: String,
      default: '30 Days',
      trim: true
    },
    validity: {
      type: String,
      default: '90 Days',
      trim: true
    },
    entryType: {
      type: String,
      enum: ['Single Entry', 'Multiple Entry', 'Double Entry', 'Single', 'Multiple'],
      default: 'Single Entry'
    },
    processingTime: {
      type: String,
      default: '24–48 Hours',
      trim: true
    },
    // Distinct pricing fields
    governmentFee: {
      type: Number,
      required: [true, 'Government fee is required'],
      min: [0, 'Government fee cannot be negative'],
      default: 0
    },
    serviceFee: {
      type: Number,
      required: [true, 'Service fee is required'],
      min: [0, 'Service fee cannot be negative'],
      default: 0
    },
    currency: {
      type: String,
      default: 'INR',
      uppercase: true,
      trim: true
    },
    documentCategory: {
      type: String,
      default: 'Only Passport',
      trim: true,
      index: true
    },
    documentsSummary: {
      type: String,
      default: 'Passport, Photograph',
      trim: true
    },
    travelPurpose: {
      type: String,
      default: 'Tourism',
      trim: true
    },
    requiredDocuments: {
      type: [mongoose.Schema.Types.Mixed],
      default: ['Passport Front & Back Scan', 'Passport Size Photo']
    },
    faqs: {
      type: [faqSchema],
      default: []
    },
    image: {
      type: String,
      default: '',
      trim: true
    },
    guaranteedDate: {
      type: String,
      default: ''
    },
    availability: {
      type: String,
      default: 'Available'
    },
    isActive: {
      type: Boolean,
      default: true,
      index: true
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
      transform: (doc, ret) => {
        ret.id = ret._id.toString();
        ret.countryId = doc.country?.slug || (doc.country?._id ? doc.country._id.toString() : doc.country?.toString());
        ret.countryName = doc.country?.name || doc.displayName || '';
        ret.status = ret.isActive ? 'ACTIVE' : 'INACTIVE';
        ret.price = `₹${((ret.governmentFee || 0) + (ret.serviceFee || 0)).toLocaleString('en-IN')}`;
        ret.fees = ret.price;
        ret.totalFee = (ret.governmentFee || 0) + (ret.serviceFee || 0);
        ret.documentsRequired = ret.requiredDocuments;
        ret.documents = ret.requiredDocuments;
        delete ret.__v;
        return ret;
      }
    }
  }
);

// Virtual for computed total amount
visaSchema.virtual('totalFee').get(function () {
  return (this.governmentFee || 0) + (this.serviceFee || 0);
});

// Compound index for active visa retrieval by country
visaSchema.index({ country: 1, isActive: 1, isDeleted: 1 });

export const Visa = mongoose.model('Visa', visaSchema);
export default Visa;
