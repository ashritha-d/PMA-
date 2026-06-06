const mongoose = require('mongoose');

const contractSchema = new mongoose.Schema({
  contractNumber: { type: String, unique: true },
  // Linked entities
  propertyId: { type: mongoose.Schema.Types.ObjectId, ref: 'Property' },
  propertyCode: { type: String, trim: true },
  ownerId: { type: mongoose.Schema.Types.ObjectId, ref: 'Owner' },
  ownerCode: { type: String, trim: true },
  tenantId: { type: mongoose.Schema.Types.ObjectId, ref: 'Tenant' },
  tenantCode: { type: String, trim: true },
  tenantName: { type: String, trim: true },        // denormalized for quick display
  // Dates
  contractStartDate: { type: Date, required: true },
  contractEndDate: { type: Date, required: true },
  contractTerminationDate: { type: Date },
  renewalDate: { type: Date },
  moveInDate: { type: Date },
  moveOutDate: { type: Date },
  firstMoveInDate: { type: Date },                 // historical first move-in (PDF field)
  noticePeriod: { type: Number, default: 30 },     // days
  isNewTenant: { type: Boolean, default: true },
  // Rent
  rentAmount: { type: Number, required: true },
  rentDescription: { type: String, trim: true },
  rentPaymentMode: { type: String, enum: ['cash', 'cheque', 'online', 'card'], default: 'online' },
  rentPaymentType: { type: String, enum: ['monthly', 'quarterly', 'half-yearly', 'yearly'], default: 'monthly' },
  // Deposit
  depositAmount: { type: Number, default: 0 },
  depositPaymentMode: { type: String, enum: ['cash', 'cheque', 'online', 'card'], default: 'online' },
  // Status & notes
  status: { type: String, enum: ['active', 'expired', 'terminated', 'renewed'], default: 'active' },
  notes: { type: String, trim: true },
  // Renewal history (previous contract numbers)
  renewedFrom: { type: mongoose.Schema.Types.ObjectId, ref: 'Contract' },
  createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'Admin' },
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now },
});

contractSchema.pre('save', function (next) {
  this.updatedAt = Date.now();
  if (!this.contractNumber) {
    this.contractNumber = 'CON' + Date.now().toString().slice(-8);
  }
  next();
});

contractSchema.virtual('contractPeriodDays').get(function () {
  if (!this.contractStartDate || !this.contractEndDate) return null;
  return Math.ceil((this.contractEndDate - this.contractStartDate) / (1000 * 60 * 60 * 24));
});

contractSchema.virtual('daysToExpiry').get(function () {
  if (!this.contractEndDate) return null;
  return Math.ceil((this.contractEndDate - new Date()) / (1000 * 60 * 60 * 24));
});

module.exports = mongoose.model('Contract', contractSchema);
