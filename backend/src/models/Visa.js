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
    category: {
      type: String,
      default: 'Standard',
      trim: true
    },
    isPopular: {
      type: Boolean,
      default: false,
      index: true
    },
    displayOrder: {
      type: Number,
      default: 0,
      index: true
    },
    countryCode: {
      type: String,
      default: '',
      trim: true,
      uppercase: true
    },
    countryName: {
      type: String,
      default: '',
      trim: true
    },
    countryFlag: {
      type: String,
      default: '',
      trim: true
    },
    countryImage: {
      type: String,
      default: '',
      trim: true
    },
    isActive: {
      type: Boolean,
      default: true,
      index: true
    },
    passportValidityRequiredMonths: {
      type: Number,
      default: 6,
      min: 0
    },
    minimumAge: {
      type: Number,
      default: null
    },
    maximumAge: {
      type: Number,
      default: null
    },
    additionalPassportRules: {
      type: [String],
      default: []
    },
    passportPhotoRequired: {
      type: Boolean,
      default: true
    },
    photoRequirements: {
      required: { type: Boolean, default: true },
      minWidth: { type: Number, default: 300 },
      minHeight: { type: Number, default: 300 },
      background: { type: String, default: null },
      maxFileSize: { type: Number, default: 10 * 1024 * 1024 },
      allowedFormats: { type: [String], default: ['image/jpeg', 'image/png', 'image/webp'] }
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
        ret.countryName = doc.country?.name || doc.countryName || doc.displayName || '';
        ret.countryCode = doc.country?.code || doc.countryCode || '';
        ret.countryFlag = doc.country?.flagEmoji || doc.countryFlag || '';
        ret.isPopular = Boolean(doc.isPopular);
        ret.displayOrder = doc.displayOrder || 0;
        ret.category = doc.category || 'Standard';
        ret.status = ret.isActive ? 'ACTIVE' : 'INACTIVE';
        ret.price = `₹${((ret.governmentFee || 0) + (ret.serviceFee || 0)).toLocaleString('en-IN')}`;
        ret.fees = ret.price;
        ret.totalFee = (ret.governmentFee || 0) + (ret.serviceFee || 0);
        ret.documentsRequired = ret.requiredDocuments;
        ret.documents = ret.requiredDocuments;
        ret.passportValidityRequiredMonths = doc.passportValidityRequiredMonths ?? 6;
        ret.minimumAge = doc.minimumAge ?? null;
        ret.maximumAge = doc.maximumAge ?? null;
        ret.additionalPassportRules = doc.additionalPassportRules || [];
        ret.passportPhotoRequired = doc.passportPhotoRequired ?? true;
        ret.photoRequirements = doc.photoRequirements || {
          required: doc.passportPhotoRequired ?? true,
          minWidth: 300,
          minHeight: 300,
          background: null,
          maxFileSize: 10 * 1024 * 1024,
          allowedFormats: ['image/jpeg', 'image/png', 'image/webp']
        };

        // Dynamic Image Resolution:
        // Priority 1: Visa-specific image, if explicitly configured and not equal to country image
        // Priority 2: Country image (from populated country document or fallback to doc.countryImage)
        // Priority 3: Clean empty fallback (no random Unsplash fallback)
        const countryImg = ((doc.country && typeof doc.country === 'object' && doc.country.image)
          ? String(doc.country.image).trim()
          : (doc.countryImage ? String(doc.countryImage).trim() : ''));
        const explicitVisaImg = (doc.image && typeof doc.image === 'string')
          ? doc.image.trim()
          : '';
        const hasCustomImage = Boolean(explicitVisaImg && explicitVisaImg !== countryImg);

        ret.hasCustomImage = hasCustomImage;
        ret.customImage = hasCustomImage ? explicitVisaImg : '';
        ret.countryImage = countryImg;
        ret.image = hasCustomImage ? explicitVisaImg : (countryImg || explicitVisaImg || '');

        delete ret.__v;
        return ret;
      }
    },
    toObject: {
      virtuals: true,
      transform: (doc, ret) => {
        ret.id = ret._id.toString();
        ret.countryId = doc.country?.slug || (doc.country?._id ? doc.country._id.toString() : doc.country?.toString());
        ret.countryName = doc.country?.name || doc.countryName || doc.displayName || '';
        ret.countryCode = doc.country?.code || doc.countryCode || '';
        ret.countryFlag = doc.country?.flagEmoji || doc.countryFlag || '';
        ret.isPopular = Boolean(doc.isPopular);
        ret.displayOrder = doc.displayOrder || 0;
        ret.category = doc.category || 'Standard';
        ret.status = ret.isActive ? 'ACTIVE' : 'INACTIVE';
        ret.price = `₹${((ret.governmentFee || 0) + (ret.serviceFee || 0)).toLocaleString('en-IN')}`;
        ret.fees = ret.price;
        ret.totalFee = (ret.governmentFee || 0) + (ret.serviceFee || 0);
        ret.documentsRequired = ret.requiredDocuments;
        ret.documents = ret.requiredDocuments;
        ret.passportValidityRequiredMonths = doc.passportValidityRequiredMonths ?? 6;
        ret.minimumAge = doc.minimumAge ?? null;
        ret.maximumAge = doc.maximumAge ?? null;
        ret.additionalPassportRules = doc.additionalPassportRules || [];
        ret.passportPhotoRequired = doc.passportPhotoRequired ?? true;
        ret.photoRequirements = doc.photoRequirements || {
          required: doc.passportPhotoRequired ?? true,
          minWidth: 300,
          minHeight: 300,
          background: null,
          maxFileSize: 10 * 1024 * 1024,
          allowedFormats: ['image/jpeg', 'image/png', 'image/webp']
        };

        const countryImg = ((doc.country && typeof doc.country === 'object' && doc.country.image)
          ? String(doc.country.image).trim()
          : (doc.countryImage ? String(doc.countryImage).trim() : ''));
        const explicitVisaImg = (doc.image && typeof doc.image === 'string')
          ? doc.image.trim()
          : '';
        const hasCustomImage = Boolean(explicitVisaImg && explicitVisaImg !== countryImg);

        ret.hasCustomImage = hasCustomImage;
        ret.customImage = hasCustomImage ? explicitVisaImg : '';
        ret.countryImage = countryImg;
        ret.image = hasCustomImage ? explicitVisaImg : (countryImg || explicitVisaImg || '');

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
