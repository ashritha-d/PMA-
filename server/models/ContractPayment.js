const mongoose = require('mongoose');

const contractPaymentSchema = new mongoose.Schema({
  contractId: { type: mongoose.Schema.Types.ObjectId, ref: 'PurchaseContract', required: true },
  amount: { type: Number, required: true },
  paymentType: { type: String, enum: ['token', 'advance', 'installment', 'final'], required: true },
  paymentStatus: { type: String, enum: ['pending', 'completed', 'failed', 'refunded'], default: 'pending' },
  transactionId: String,
  notes: String,
  paidAt: Date,
}, { timestamps: true });

module.exports = mongoose.model('ContractPayment', contractPaymentSchema);
