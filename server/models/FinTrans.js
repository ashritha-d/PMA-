const mongoose = require('mongoose');

const finTransSchema = new mongoose.Schema({
  finTransRef: { type: String, unique: true },
  // Linked entities
  propertyId: { type: mongoose.Schema.Types.ObjectId, ref: 'Property' },
  propertyCode: { type: String, trim: true },
  ownerId: { type: mongoose.Schema.Types.ObjectId, ref: 'Owner' },
  ownerCode: { type: String, trim: true },
  tenantId: { type: mongoose.Schema.Types.ObjectId, ref: 'Tenant' },
  tenantCode: { type: String, trim: true },
  contractId: { type: mongoose.Schema.Types.ObjectId, ref: 'Contract' },
  contractNumber: { type: String, trim: true },
  // Transaction classification (from PDF)
  transactionType: {
    type: String,
    enum: ['rent_deposit', 'rent', 'refund', 'electricity_bill', 'water_bill', 'municipality', 'maintenance', 'repair', 'miscellaneous'],
    required: true,
  },
  transactionNature: {
    type: String,
    enum: ['receipt', 'payment'],   // receipt = money in, payment = money out
    required: true,
  },
  // Core fields from PDF
  paymentMode: { type: String, enum: ['cash', 'cheque', 'online', 'card'], required: true },
  transactionDate: { type: Date, required: true },
  amount: { type: Number, required: true },
  referenceNumber: { type: String, trim: true },
  description: { type: String, trim: true },
  // Cheque-specific fields (PDF: Cheque Date, Bank Name, Bank City, IFSC Code, Cheque Image, Cheque Status)
  chequeDate: { type: Date },
  bankName: { type: String, trim: true },
  bankCity: { type: String, trim: true },
  ifscCode: { type: String, trim: true },
  chequeImage: { url: String, filename: String },
  chequeStatus: { type: String, enum: ['pending', 'cleared', 'bounced'], default: 'pending' },
  createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'Admin' },
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now },
});

finTransSchema.index({ transactionDate: -1 });
finTransSchema.index({ transactionType: 1, transactionNature: 1 });

finTransSchema.pre('save', function (next) {
  this.updatedAt = Date.now();
  if (!this.finTransRef) {
    this.finTransRef = 'FT' + Date.now().toString().slice(-9);
  }
  next();
});

module.exports = mongoose.model('FinTrans', finTransSchema);
