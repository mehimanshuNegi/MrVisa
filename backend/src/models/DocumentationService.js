import mongoose from 'mongoose';

const requirementItemSchema = new mongoose.Schema(
  {
    title: {
      type: String,
      required: [true, 'Requirement title is required'],
      trim: true
    },
    description: {
      type: String,
      default: '',
      trim: true
    },
    category: {
      type: String,
      default: 'Basic Information',
      trim: true
    },
    required: {
      type: Boolean,
      default: true
    },
    inputType: {
      type: String,
      default: 'file', // file, text, date, number, select
      trim: true
    },
    options: {
      type: [String],
      default: []
    },
    condition: {
      type: String,
      default: '', // condition or applicable note, e.g. "for business travellers", "where applicable", "as applicable", or income-type label
      trim: true
    },
    acceptedFormats: {
      type: [String],
      default: ['PDF', 'JPG', 'JPEG', 'PNG']
    },
    displayOrder: {
      type: Number,
      default: 0
    },
    isActive: {
      type: Boolean,
      default: true
    }
  },
  { _id: true }
);

const documentationServiceSchema = new mongoose.Schema(
  {
    title: {
      type: String,
      required: [true, 'Service title is required'],
      trim: true
    },
    slug: {
      type: String,
      required: [true, 'Service slug is required'],
      unique: true,
      lowercase: true,
      trim: true,
      index: true
    },
    category: {
      type: String,
      default: 'Visa & Immigration Documentation',
      trim: true
    },
    shortDescription: {
      type: String,
      default: '',
      trim: true
    },
    description: {
      type: String,
      default: '',
      trim: true
    },
    icon: {
      type: String,
      default: 'FileText',
      trim: true
    },
    image: {
      type: String,
      default: '',
      trim: true
    },
    features: {
      type: [String],
      default: []
    },
    // Backwards compatibility legacy string list
    requiredDocuments: {
      type: [String],
      default: []
    },
    // Data-driven structured customer checklist requirements
    requirements: {
      type: [requirementItemSchema],
      default: []
    },
    // Dynamic condition/income-type selector prompt (e.g. "What type of income do you have?")
    conditionPrompt: {
      type: String,
      default: '',
      trim: true
    },
    // Available condition choices (e.g. ["Salaried", "Business / Self-Employed", "Professionals / Freelancers", "Capital Gains & Other Income"])
    conditionOptions: {
      type: [String],
      default: []
    },
    // Deliverables header & list (e.g. "What NimuFly can prepare for you")
    deliverablesHeader: {
      type: String,
      default: 'What NimuFly prepares for you',
      trim: true
    },
    deliverables: {
      type: [String],
      default: []
    },
    processingTime: {
      type: String,
      default: '24–48 Hours',
      trim: true
    },
    governmentFee: {
      type: Number,
      default: 0,
      min: [0, 'Government fee cannot be negative']
    },
    serviceFee: {
      type: Number,
      default: 1499,
      min: [0, 'Service fee cannot be negative']
    },
    currency: {
      type: String,
      default: 'INR',
      uppercase: true,
      trim: true
    },
    displayOrder: {
      type: Number,
      default: 0,
      index: true
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
      transform: (_, ret) => {
        ret.id = ret._id.toString();
        ret.status = ret.isActive ? 'ACTIVE' : 'INACTIVE';
        ret.totalFee = (ret.governmentFee || 0) + (ret.serviceFee || 0);
        ret.price = `₹${ret.totalFee.toLocaleString('en-IN')}`;
        ret.fees = ret.price;
        delete ret.__v;
        return ret;
      }
    }
  }
);

documentationServiceSchema.virtual('totalFee').get(function () {
  return (this.governmentFee || 0) + (this.serviceFee || 0);
});

export const DocumentationService = mongoose.model('DocumentationService', documentationServiceSchema);
export default DocumentationService;
