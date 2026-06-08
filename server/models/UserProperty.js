const mongoose = require('mongoose');

const userPropertySchema = new mongoose.Schema({
  owner: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  propertyName: { type: String, required: true, trim: true },
  propertyType: {
    type: String,
    enum: ['Apartment', 'Villa', 'House', 'Commercial', 'Land', 'Office', 'Shop', 'Other'],
    required: true,
  },
  description: { type: String, default: '' },
  status: {
    type: String,
    enum: ['Available', 'Occupied', 'Under Maintenance'],
    default: 'Available',
  },
  // Location
  country: { type: String, default: 'India' },
  state: { type: String, default: '' },
  city: { type: String, default: '' },
  address: { type: String, default: '' },
  pincode: { type: String, default: '' },
  googleMapsLocation: { type: String, default: '' },
  // Property Info
  totalArea: { type: Number, default: null },
  bedrooms: { type: Number, default: 0 },
  bathrooms: { type: Number, default: 0 },
  floors: { type: Number, default: 1 },
  furnishing: {
    type: String,
    enum: ['Furnished', 'Semi-Furnished', 'Unfurnished'],
    default: 'Unfurnished',
  },
  parking: { type: Boolean, default: false },
  // Financial
  rentAmount: { type: Number, default: null },
  securityDeposit: { type: Number, default: null },
  maintenanceCharges: { type: Number, default: null },
  salePrice: { type: Number, default: null },
  // Media
  images: [{ url: String, filename: String }],
  coverImage: { type: String, default: '' },
  // Documents
  documents: [{ name: String, url: String, filename: String, docType: String }],
}, { timestamps: true });

userPropertySchema.index({ owner: 1, status: 1 });

module.exports = mongoose.model('UserProperty', userPropertySchema);
