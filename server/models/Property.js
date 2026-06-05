const mongoose = require('mongoose');

const propertySchema = new mongoose.Schema({
  propertyCode: { type: String, unique: true },
  title: { type: String, required: true, trim: true },
  description: { type: String, required: true },
  type: { type: String, enum: ['apartment', 'villa', 'commercial', 'office', 'plot', 'pg'], required: true },
  category: { type: mongoose.Schema.Types.ObjectId, ref: 'Category' },
  listingType: { type: String, enum: ['rent', 'sale'], required: true },
  price: { type: Number, required: true },
  priceUnit: { type: String, enum: ['month', 'year', 'total'], default: 'month' },
  images: [{ url: String, public_id: String }],
  videos: [String],
  address: {
    line1: String,
    line2: String,
    city: { type: String, required: true },
    state: String,
    country: { type: String, default: 'India' },
    zipCode: String,
    landmark: String,
  },
  location: {
    type: { type: String, enum: ['Point'], default: 'Point' },
    coordinates: { type: [Number], default: [0, 0] },
  },
  features: {
    bedrooms: { type: Number, default: 0 },
    bathrooms: { type: Number, default: 0 },
    washrooms: { type: Number, default: 0 },
    balconies: { type: Number, default: 0 },
    carParkings: { type: Number, default: 0 },
    servantRooms: { type: Number, default: 0 },
    landArea: Number,
    carpetArea: Number,
    builtupArea: Number,
    facing: String,
    furnished: { type: String, enum: ['furnished', 'semi-furnished', 'unfurnished'], default: 'unfurnished' },
    dishwasher: { type: Boolean, default: false },
    washingMachine: { type: Boolean, default: false },
    floorNumber: Number,
    totalFloors: Number,
    yearOfConstruction: Number,
  },
  amenities: [String],
  ownerInfo: {
    ownerCode: String,
    name: String,
    phone: String,
    email: String,
  },
  status: { type: String, enum: ['available', 'rented', 'sold', 'maintenance'], default: 'available' },
  isFeatured: { type: Boolean, default: false },
  isActive: { type: Boolean, default: true },
  views: { type: Number, default: 0 },
  rating: { type: Number, default: 0 },
  reviewCount: { type: Number, default: 0 },
  municipalityNumber: String,
  electricityBillNumber: String,
  waterBillNumber: String,
  propertyValue: Number,
  expectedRent: Number,
  createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'Admin' },
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now },
});

propertySchema.index({ location: '2dsphere' });
propertySchema.index({ 'address.city': 1, type: 1, listingType: 1, price: 1 });

propertySchema.pre('save', function (next) {
  this.updatedAt = Date.now();
  if (!this.propertyCode) {
    this.propertyCode = 'PROP' + Date.now().toString().slice(-8);
  }
  next();
});

module.exports = mongoose.model('Property', propertySchema);
