const mongoose = require('mongoose');

const ownerSchema = new mongoose.Schema({
  ownerCode: { type: String, unique: true },
  salutation: { type: String, enum: ['Mr.', 'Mrs.', 'Miss', 'Msrs.'], default: 'Mr.' },
  firstName: { type: String, required: true, trim: true },
  lastName: { type: String, required: true, trim: true },
  nationality: { type: String, trim: true },
  address1: { type: String, trim: true },
  address2: { type: String, trim: true },
  city: { type: String, trim: true },
  state: { type: String, trim: true },
  country: { type: String, trim: true },
  zipCode: { type: String, trim: true },
  mobile: { type: String, trim: true },
  email: { type: String, trim: true, lowercase: true },
  passportNumber: { type: String, trim: true },
  emiratesId: { type: String, trim: true },
  dateOfBirth: { type: Date },
  visaExpiryDate: { type: Date },
  passportExpiryDate: { type: Date },
  // Document uploads
  eidImage: { url: String, filename: String },
  passportCopy: { url: String, filename: String },
  residenceVisa: { url: String, filename: String },
  isActive: { type: Boolean, default: true },
  createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'Admin' },
  approvedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'Admin' },
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now },
});

ownerSchema.pre('save', function (next) {
  this.updatedAt = Date.now();
  if (!this.ownerCode) {
    this.ownerCode = 'OWN' + Date.now().toString().slice(-8);
  }
  next();
});

ownerSchema.virtual('fullName').get(function () {
  return `${this.salutation} ${this.firstName} ${this.lastName}`;
});

module.exports = mongoose.model('Owner', ownerSchema);
