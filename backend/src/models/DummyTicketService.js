import mongoose from 'mongoose';

const dummyTicketServiceSchema = new mongoose.Schema(
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
    price: {
      type: Number,
      required: [true, 'Price is required'],
      min: [0, 'Price cannot be negative'],
      default: 499
    },
    currency: {
      type: String,
      default: 'INR',
      uppercase: true,
      trim: true
    },
    type: {
      type: String,
      default: 'Round Trip / Onward Reservation',
      trim: true
    },
    deliveryTime: {
      type: String,
      default: '10–30 Minutes',
      trim: true
    },
    validity: {
      type: String,
      default: '2–3 Weeks (Live PNR Verifiable)',
      trim: true
    },
    icon: {
      type: String,
      default: 'Plane',
      trim: true
    },
    features: {
      type: [String],
      default: [
        'Live 6-character airline PNR code',
        'Directly verifiable on airline website',
        'Embassy & consulate visa compliant',
        'Delivered instantly via WhatsApp and Email',
        'Free date modification if visa delayed'
      ]
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
        ret.serviceFee = ret.price;
        ret.totalFee = ret.price;
        ret.formattedPrice = `₹${(ret.price || 0).toLocaleString('en-IN')}`;
        ret.fees = ret.formattedPrice;
        delete ret.__v;
        return ret;
      }
    }
  }
);

export const DummyTicketService = mongoose.model('DummyTicketService', dummyTicketServiceSchema);
export default DummyTicketService;
