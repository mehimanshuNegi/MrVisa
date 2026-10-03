import mongoose from 'mongoose';

const countrySchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, 'Country name is required'],
      unique: true,
      trim: true,
      index: true
    },
    displayName: {
      type: String,
      trim: true
    },
    slug: {
      type: String,
      required: [true, 'Country slug is required'],
      unique: true,
      lowercase: true,
      trim: true,
      index: true
    },
    code: {
      type: String,
      required: [true, 'Country ISO code is required'],
      uppercase: true,
      trim: true,
      minlength: 2,
      maxlength: 3,
      index: true
    },
    flagEmoji: {
      type: String,
      default: '🌍',
      trim: true
    },
    flagUrl: {
      type: String,
      default: '',
      trim: true
    },
    image: {
      type: String,
      default: 'https://images.unsplash.com/photo-1488646953014-85cb44e25828?auto=format&fit=crop&w=1000&q=85',
      trim: true
    },
    description: {
      type: String,
      default: '',
      trim: true
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
        delete ret.__v;
        return ret;
      }
    }
  }
);

// Virtual for linking visas belonging to this country
countrySchema.virtual('visas', {
  ref: 'Visa',
  localField: '_id',
  foreignField: 'country'
});

export const Country = mongoose.model('Country', countrySchema);
export default Country;
