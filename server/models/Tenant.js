const mongoose = require('mongoose');

const tenantSchema = new mongoose.Schema({
  tenantCode: { type: String, unique: true },
  // Linked property
  propertyId: { type: mongoose.Schema.Types.ObjectId, ref: 'Property' },
  propertyCode: { type: String },
  // Personal info
  salutation: { type: String, enum: ['Mr.', 'Mrs.', 'Miss', 'Msrs.'], default: 'Mr.' },
  firstName: { type: String, required: true, trim: true },
  lastName: { type: String, required: true, trim: true },
  dateOfBirth: { type: Date },
  nationality: { type: String, trim: true },
  passportNumber: { type: String, trim: true },
  emiratesId: { type: String, trim: true },
  passportExpiryDate: { type: Date },
  eidExpiryDate: { type: Date },
  employer: { type: String, trim: true },
  mobile: { type: String, trim: true },
  email: { type: String, trim: true, lowercase: true },
  // Lease details
  leaseStartDate: { type: Date },
  leaseEndDate: { type: Date },
  moveInDate: { type: Date },
  moveOutDate: { type: Date },
  rentAmount: { type: Number, default: 0 },
  depositAmount: { type: Number, default: 0 },
  numberOfPayments: { type: Number, min: 1, max: 12, default: 12 },
  paymentMode: { type: String, enum: ['cash', 'cheque', 'online', 'card'], default: 'online' },
  // Document uploads (7 documents per PDF)
  passportCopy: { url: String, filename: String },
  eidCopy: { url: String, filename: String },
  residenceVisa: { url: String, filename: String },
  bankStatement: { url: String, filename: String },
  depositCheque: { url: String, filename: String },
  securityCheque: { url: String, filename: String },
  ejariRegistration: { url: String, filename: String },
  // Status
  status: { type: String, enum: ['active', 'former', 'pending'], default: 'active' },
  isActive: { type: Boolean, default: true },
  createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'Admin' },
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now },
});

tenantSchema.index({ status: 1 });

tenantSchema.pre('save', function (next) {
  this.updatedAt = Date.now();
  if (!this.tenantCode) {
    this.tenantCode = 'TNT' + Date.now().toString().slice(-8);
  }
  next();
});

tenantSchema.virtual('fullName').get(function () {
  return `${this.salutation} ${this.firstName} ${this.lastName}`;
});

// Remaining days on lease
tenantSchema.virtual('leaseDaysRemaining').get(function () {
  if (!this.leaseEndDate) return null;
  return Math.ceil((new Date(this.leaseEndDate) - new Date()) / (1000 * 60 * 60 * 24));
});

module.exports = mongoose.model('Tenant', tenantSchema);
