import mongoose from 'mongoose';

const travellerSchema = new mongoose.Schema(
  {
    title: {
      type: String,
      enum: ['Mr', 'Mrs', 'Ms', 'Master'],
      default: 'Mr',
      trim: true
    },
    firstName: {
      type: String,
      required: [true, 'Traveller first name is required'],
      trim: true
    },
    lastName: {
      type: String,
      required: [true, 'Traveller last name is required'],
      trim: true
    },
    dateOfBirth: {
      type: String,
      default: '',
      trim: true
    },
    nationality: {
      type: String,
      default: 'Indian',
      trim: true
    }
  },
  { _id: true }
);

const dummyTicketRequestSchema = new mongoose.Schema(
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
      ref: 'DummyTicketService',
      default: null
    },
    serviceTitle: {
      type: String,
      default: 'Verified Flight Reservation',
      trim: true
    },
    tripType: {
      type: String,
      enum: ['One Way', 'Return'],
      default: 'One Way',
      required: true
    },
    travellers: {
      type: [travellerSchema],
      validate: [
        (val) => Array.isArray(val) && val.length > 0,
        'At least one traveller is required'
      ]
    },
    contact: {
      dialCode: {
        type: String,
        default: '+91',
        trim: true
      },
      phone: {
        type: String,
        required: [true, 'Contact phone number is required'],
        trim: true
      },
      email: {
        type: String,
        required: [true, 'Contact email address is required'],
        trim: true,
        lowercase: true
      }
    },
    flight: {
      from: {
        type: String,
        required: [true, 'Origin departure city/airport is required'],
        trim: true
      },
      to: {
        type: String,
        required: [true, 'Destination arrival city/airport is required'],
        trim: true
      },
      departureDate: {
        type: String,
        required: [true, 'Departure date is required'],
        trim: true
      },
      returnDate: {
        type: String,
        default: '',
        trim: true
      }
    },
    purpose: {
      type: String,
      default: 'Visa Application',
      trim: true
    },
    message: {
      type: String,
      default: '',
      trim: true
    },
    requiredDate: {
      type: String,
      default: '',
      trim: true
    },
    deliveryMethod: {
      type: String,
      enum: ['WhatsApp', 'Email', 'Both'],
      default: 'WhatsApp'
    },
    price: {
      type: Number,
      default: 499
    },
    currency: {
      type: String,
      default: 'INR'
    },
    status: {
      type: String,
      enum: ['New', 'Under Review', 'Processing', 'Ready', 'Completed', 'Cancelled'],
      default: 'New',
      index: true
    },
    adminNotes: {
      type: String,
      default: '',
      trim: true
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
        ret.formattedPrice = `₹${(ret.price || 0).toLocaleString('en-IN')}`;
        ret.route = `${ret.flight?.from || ''} → ${ret.flight?.to || ''}`;
        delete ret.__v;
        return ret;
      }
    }
  }
);

dummyTicketRequestSchema.index({ createdAt: -1 });

export const DummyTicketRequest = mongoose.model('DummyTicketRequest', dummyTicketRequestSchema);
export default DummyTicketRequest;
