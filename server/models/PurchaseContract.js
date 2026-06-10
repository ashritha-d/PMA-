const mongoose = require('mongoose');

const auditLogSchema = new mongoose.Schema({
  action: String,
  performedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  performedByName: String,
  performedByRole: String,
  timestamp: { type: Date, default: Date.now },
  notes: String,
}, { _id: false });

const paymentScheduleItemSchema = new mongoose.Schema({
  dueDate: Date,
  amount: Number,
  description: String,
  status: { type: String, enum: ['pending', 'paid'], default: 'pending' },
}, { _id: false });

const purchaseContractSchema = new mongoose.Schema({
  contractNumber: { type: String, unique: true },
  propertyId: { type: mongoose.Schema.Types.ObjectId, ref: 'Property', required: true },
  buyerId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  ownerId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  purchasePrice: { type: Number, required: true },
  advanceAmount: { type: Number, required: true },
  balanceAmount: { type: Number, required: true },
  paymentSchedule: [paymentScheduleItemSchema],
  handoverDate: Date,
  status: {
    type: String,
    enum: ['draft', 'pending_signatures', 'active', 'completed', 'cancelled'],
    default: 'draft',
  },
  contractPdfUrl: String,
  buyerTermsAcceptedAt: Date,
  ownerTermsAcceptedAt: Date,
  buyerSignedAt: Date,
  ownerSignedAt: Date,
  auditLog: [auditLogSchema],
  // Denormalized for fast display
  propertyTitle: String,
  propertyAddress: String,
  propertyCode: String,
  buyerName: String,
  buyerEmail: String,
  buyerPhone: String,
  ownerName: String,
  ownerEmail: String,
  ownerPhone: String,
}, { timestamps: true });

purchaseContractSchema.pre('save', function (next) {
  if (!this.contractNumber) {
    const rand = Math.random().toString(36).slice(-4).toUpperCase();
    this.contractNumber = 'PC' + Date.now().toString().slice(-8) + rand;
  }
  next();
});

module.exports = mongoose.model('PurchaseContract', purchaseContractSchema);
